// tests/unit/providers/call-center/asterisk-adapter.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  CallCenterProvider,
  CallCenterProviderConfig,
  AgentState,
} from '@/providers/call-center/types'

// Capture the event handler registered by the adapter
let capturedEventHandler: ((evt: any) => void) | null = null

class MockAmiClient {
  static instances: MockAmiClient[] = []
  public on = vi.fn((event: string, cb: (evt: any) => void) => {
    if (event === 'event') capturedEventHandler = cb
  })
  public off = vi.fn(() => {})
  public connect = vi.fn(async () => {})
  public disconnect = vi.fn(async () => {})
  public sendAction = vi.fn(async (_action: any) => ({ status: 'OK' }))
  constructor(public cfg: { url: string }) {
    MockAmiClient.instances.push(this)
  }
}

vi.mock('@/core/AmiClient', () => ({
  AmiClient: MockAmiClient,
}))

// After mocking, import the adapter under test
import { createAsteriskAdapter } from '@/providers/call-center/adapters/asterisk'

const baseConfig: CallCenterProviderConfig = {
  type: 'asterisk',
  connection: { host: 'pbx.local', port: 8080, secure: false },
  agent: { id: 'agent-42', extension: 'PJSIP/1042', name: 'Agent 42' },
}

describe('Asterisk Adapter', () => {
  let adapter: CallCenterProvider

  beforeEach(() => {
    vi.useFakeTimers()
    MockAmiClient.instances = []
    capturedEventHandler = null
    adapter = createAsteriskAdapter()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('connects using derived URL and prevents double connect', async () => {
    await adapter.connect(baseConfig)
    expect(MockAmiClient.instances.length).toBe(1)
    expect(MockAmiClient.instances[0].cfg.url).toBe('ws://pbx.local:8080/ami')
    await expect(adapter.connect(baseConfig)).rejects.toThrow('Already connected')
  })

  it('connects using explicit URL override', async () => {
    await adapter.connect({
      ...baseConfig,
      connection: { ...baseConfig.connection, url: 'wss://example.com/ami-proxy' },
    })
    expect(MockAmiClient.instances[0].cfg.url).toBe('wss://example.com/ami-proxy')
  })

  it('throws Not connected for operations before connect/login', async () => {
    await expect(adapter.login()).rejects.toThrow('Not connected')
    await expect(adapter.logout()).rejects.toThrow('Not connected')
    await expect(adapter.pause({ reason: 'Break' })).rejects.toThrow('Not connected')
    await expect(adapter.unpause()).rejects.toThrow('Not connected')
    await expect(adapter.joinQueue('support')).rejects.toThrow('Not connected')
    await expect(adapter.leaveQueue('support')).rejects.toThrow('Not connected')
    await expect(adapter.setStatus('wrap-up')).rejects.toThrow('Not connected')
  })

  it('login adds queues with penalties and updates state', async () => {
    await adapter.connect(baseConfig)

    const stateChanges: AgentState[] = []
    adapter.onStateChange((next) => stateChanges.push(next))

    const state = await adapter.login({ queues: ['support', 'sales'], penalties: { support: 5 } })

    // Verify QueueAdd actions
    const calls = MockAmiClient.instances[0].sendAction.mock.calls
    const queueAdds = calls.filter(([a]) => a.Action === 'QueueAdd')
    expect(queueAdds).toHaveLength(2)
    expect(queueAdds[0][0]).toMatchObject({ Queue: 'support', Penalty: '5', Paused: 'false' })
    expect(queueAdds[1][0]).toMatchObject({ Queue: 'sales', Penalty: '0' })

    // Verify state reflects queues and available status
    expect(state.status).toBe('available')
    expect(state.queues.map((q) => q.name)).toEqual(['support', 'sales'])

    // And that a state change was emitted
    expect(stateChanges.length).toBeGreaterThan(0)
  })

  it('partial and full logout send correct actions and update state', async () => {
    await adapter.connect(baseConfig)
    await adapter.login({ queues: ['support', 'sales'] })

    const states: AgentState[] = []
    adapter.onStateChange((next) => states.push(next))

    // Partial logout from one queue
    await adapter.logout({ queues: ['support'] })
    const calls = MockAmiClient.instances[0].sendAction.mock.calls
    const queueRemoves = calls.filter(([a]) => a.Action === 'QueueRemove')
    // Two removes: one for partial, one later for full
    expect(queueRemoves[0][0]).toMatchObject({ Queue: 'support' })

    // Full logout (remaining queue)
    await adapter.logout()
    const allRemoves = MockAmiClient.instances[0].sendAction.mock.calls.filter(
      ([a]) => a.Action === 'QueueRemove'
    )
    expect(allRemoves.some(([a]) => a.Queue === 'sales')).toBe(true)

    // Last state should be offline with no queues
    expect(states.at(-1)?.status).toBe('offline')
    expect(states.at(-1)?.queues.length).toBe(0)
  })

  it('pause with duration schedules auto-unpause and sends QueuePause actions', async () => {
    await adapter.connect(baseConfig)
    await adapter.login({ queues: ['support'] })

    await adapter.pause({ reason: 'Break', duration: 10 })
    const calls = MockAmiClient.instances[0].sendAction.mock.calls
    const pauses = calls.filter(([a]) => a.Action === 'QueuePause' && a.Paused === 'true')
    expect(pauses).toHaveLength(1)

    // Advance timers to trigger auto-unpause
    vi.advanceTimersByTime(10_000)

    const unpauses = MockAmiClient.instances[0].sendAction.mock.calls.filter(
      ([a]) => a.Action === 'QueuePause' && a.Paused === 'false'
    )
    expect(unpauses.length).toBeGreaterThanOrEqual(1)
  })

  it('join/leave queue send expected actions', async () => {
    await adapter.connect(baseConfig)
    await adapter.login({ queues: [] })

    await adapter.joinQueue('billing', 3)
    await adapter.leaveQueue('billing')

    const calls = MockAmiClient.instances[0].sendAction.mock.calls
    expect(
      calls.some(([a]) => a.Action === 'QueueAdd' && a.Queue === 'billing' && a.Penalty === '3')
    ).toBe(true)
    expect(calls.some(([a]) => a.Action === 'QueueRemove' && a.Queue === 'billing')).toBe(true)
  })

  it('setStatus delegates to pause/unpause and handles wrap-up', async () => {
    await adapter.connect(baseConfig)
    await adapter.login({ queues: ['support'] })

    const states: AgentState[] = []
    adapter.onStateChange((next) => states.push(next))

    await adapter.setStatus('break', 'Lunch')
    await adapter.setStatus('wrap-up')
    // Simulate currently paused then available
    ;(adapter as any).unpause = vi.fn(async () => {})
    ;(adapter as any).pause = vi.fn(async () => {})
    await adapter.setStatus('available')

    expect(states.some((s) => s.status === 'wrap-up')).toBe(true)
  })

  it('handles AMI queue events and emits queue callbacks', async () => {
    await adapter.connect(baseConfig)
    await adapter.login({ queues: [] })

    const queueEvents: any[] = []
    adapter.onQueueEvent((evt) => queueEvents.push(evt))

    // Simulate queue member added for our agent
    capturedEventHandler?.({
      data: {
        Event: 'QueueMemberAdded',
        Interface: 'PJSIP/1042',
        Queue: 'support',
        Paused: '0',
        Penalty: '0',
        CallsTaken: '0',
      },
    })

    // Simulate agent called and completed
    capturedEventHandler?.({
      data: {
        Event: 'AgentCalled',
        Interface: 'PJSIP/1042',
        Queue: 'support',
        CallerIDNum: '1000',
        CallerIDName: 'Alice',
      },
    })

    capturedEventHandler?.({
      data: {
        Event: 'AgentComplete',
        Interface: 'PJSIP/1042',
        Queue: 'support',
        Uniqueid: 'abc123',
        TalkTime: '7',
        HoldTime: '2',
      },
    })

    expect(queueEvents.some((e) => e.type === 'joined' && e.queue === 'support')).toBe(true)
    expect(queueEvents.some((e) => e.type === 'call-received')).toBe(true)
    expect(queueEvents.some((e) => e.type === 'call-completed')).toBe(true)
  })
})
