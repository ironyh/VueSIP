// @vitest-environment node
/**
 * Real-PBX AMI integration tests.
 *
 * Gated on VUESIP_TEST_AMI_* — self-skips if the env vars aren't set. Does
 * not originate channels or make changes; every action here is read-only.
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { AmiTestClient, type AmiFrame } from './ami-client'
import { amiEnv } from './env'

const env = amiEnv()
const suite = env ? describe : describe.skip

suite('AMI — real PBX (read-only)', () => {
  let client: AmiTestClient
  let banner: string

  beforeAll(async () => {
    client = new AmiTestClient({
      host: env!.host,
      port: env!.port,
      connectTimeoutMs: 4000,
      responseTimeoutMs: 6000,
    })
    banner = await client.connect()
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

  it('announces itself as Asterisk Call Manager', () => {
    expect(banner).toMatch(/Asterisk Call Manager/i)
  })

  it('Ping round-trips with Pong response', async () => {
    const [frame] = await client.action({ Action: 'Ping' })
    expect(frame.Response).toBe('Success')
    expect(frame.Ping).toBe('Pong')
    expect(frame.Timestamp).toBeDefined()
  })

  it('CoreStatus returns Success with the current-calls counter', async () => {
    const [frame] = await client.action({ Action: 'CoreStatus' })
    expect(frame.Response).toBe('Success')
    // Asterisk's CoreStatus field names vary between minor versions; only
    // CoreCurrentCalls is consistently present — assert on that and make sure
    // at least one timestamp-ish field came back so we know the frame is real.
    expect(Number(frame.CoreCurrentCalls)).not.toBeNaN()
    const timestampFields = [
      'CoreStartupTime',
      'CoreStartupDate',
      'CoreReloadTime',
      'CoreReloadDate',
    ]
    const hasTimestamp = timestampFields.some((k) => typeof frame[k] === 'string' && frame[k]!.length > 0)
    expect(hasTimestamp).toBe(true)
  })

  it('PJSIPShowEndpoints returns an event list with at least one endpoint', async () => {
    const frames = await client.action(
      { Action: 'PJSIPShowEndpoints' },
      { expectEventList: true },
    )
    const endpointEvents = frames.filter((f: AmiFrame) => f.Event === 'EndpointList')
    expect(endpointEvents.length).toBeGreaterThan(0)
    for (const ep of endpointEvents) {
      expect(ep.ObjectName).toBeDefined()
    }
    const terminator = frames.find(
      (f: AmiFrame) => (f.EventList ?? '').toLowerCase() === 'complete',
    )
    expect(terminator).toBeDefined()
    if (terminator?.ListItems !== undefined) {
      expect(Number(terminator.ListItems)).toBe(endpointEvents.length)
    }
  })

  it('rejects unknown actions with an Error response', async () => {
    const [frame] = await client.action({ Action: 'ThisActionDoesNotExist' })
    expect(frame.Response).toBe('Error')
    expect(frame.Message).toBeDefined()
  })
})
