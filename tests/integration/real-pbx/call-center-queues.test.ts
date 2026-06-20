// @vitest-environment node
/**
 * Real-PBX integration tests for the call-center queue surface.
 *
 * Verifies that the queues the call-center app depends on (8001/8002/8003) are
 * actually live on the PBX, and that the connected-gateway mappers handle real
 * Asterisk QueueEntry payloads. Gated on VUESIP_TEST_AMI_* — self-skips if the
 * env vars aren't set. Read-only.
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { AmiTestClient, type AmiFrame } from './ami-client'
import { amiEnv } from './env'
import { mapQueueEntryToQueuedCall } from '../../../examples/call-center/src/features/shared/connected-gateway'
import type { QueueEntry } from '../../../src/types/ami.types'

const env = amiEnv()
const suite = env ? describe : describe.skip

/** The call-center test queues we expect to find on the PBX. */
const EXPECTED_QUEUES = [
  { number: '8001', role: 'sjukskoterska' },
  { number: '8002', role: 'sjukgymnast' },
  { number: '8003', role: 'lakare' },
]

suite('Call-center queues — real PBX (read-only)', () => {
  let client: AmiTestClient

  beforeAll(async () => {
    client = new AmiTestClient({
      host: env!.host,
      port: env!.port,
      connectTimeoutMs: 4000,
      responseTimeoutMs: 6000,
    })
    await client.connect()
    const [login] = await client.action({
      Action: 'Login',
      Username: env!.user,
      Secret: env!.secret,
      Events: 'off',
    })
    expect(login.Response).toBe('Success')
  }, 15000)

  afterAll(async () => {
    if (!client) return
    try {
      await client.action({ Action: 'Logoff' })
    } catch {
      /* already closed */
    }
    await client.close()
  })

  it('exposes all three call-center test queues via QueueStatus', async () => {
    const frames = await client.action({ Action: 'QueueStatus' }, { expectEventList: true })
    const queueParams = frames.filter((f: AmiFrame) => f.Event === 'QueueParams')
    const queueNumbers = new Set(queueParams.map((f: AmiFrame) => f.Queue))

    for (const { number } of EXPECTED_QUEUES) {
      expect(queueNumbers.has(number), `queue ${number} should exist on PBX`).toBe(true)
    }
  })

  it('each expected queue has at least one member (agent logged in)', async () => {
    const frames = await client.action({ Action: 'QueueStatus' }, { expectEventList: true })
    const members = frames.filter((f: AmiFrame) => f.Event === 'QueueMember')
    const membersByQueue = new Map<string, number>()
    for (const m of members) {
      const q = m.Queue
      membersByQueue.set(q, (membersByQueue.get(q) ?? 0) + 1)
    }
    for (const { number } of EXPECTED_QUEUES) {
      const count = membersByQueue.get(number) ?? 0
      expect(count, `queue ${number} should have >=1 member`).toBeGreaterThan(0)
    }
  })

  it('the connected-gateway mapper converts a real-shape QueueEntry correctly', () => {
    // A QueueEntry payload in the shape Asterisk actually emits.
    const realEntry: QueueEntry = {
      queue: '8001',
      position: 1,
      channel: 'PJSIP/2002-abc',
      uniqueId: '1718000000.42',
      callerIdNum: '46701234567',
      callerIdName: 'Erik Eriksson',
      connectedLineNum: '',
      connectedLineName: '',
      wait: 18,
      priority: 1,
    }

    const view = mapQueueEntryToQueuedCall(realEntry)

    expect(view.id).toBe('1718000000.42')
    expect(view.from).toBe('46701234567')
    expect(view.displayName).toBe('Erik Eriksson')
    expect(view.waitTime).toBe(18)
    expect(view.queue).toBe('8001')
    expect(view.priority).toBe(1)
  })
})
