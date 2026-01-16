import { describe, it, expect } from 'vitest'
import { useSipMock } from '@/composables/useSipMock'

describe('useSipMock', () => {
  it('connects, registers and makes a call', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0, ringDelay: 1, connectCallDelay: 1 })
    await mock.connect()
    expect(mock.isConnected.value).toBe(true)
    expect(mock.isRegistered.value).toBe(true)

    const callId = await mock.call('12345', 'Test')
    expect(mock.activeCall.value?.id).toBe(callId)

    // After small delays call becomes active
    await new Promise((r) => setTimeout(r, 5))
    expect(['ringing', 'active']).toContain(mock.callState.value)

    await mock.hangup()
    expect(mock.activeCall.value).toBeNull()
    expect(mock.callHistory.value.length).toBe(1)
  })

  it('simulates incoming calls when enabled', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0, generateIncomingCalls: true, incomingCallInterval: 5, autoAnswer: false })
    await mock.connect()
    await new Promise((r) => setTimeout(r, 8))
    // An incoming call should be ringing
    expect(mock.activeCall.value?.direction === 'inbound').toBe(true)
  })
})

