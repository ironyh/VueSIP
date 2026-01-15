/**
 * useSipMock composable unit tests
 * Comprehensive tests for mock SIP functionality simulation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { useSipMock, type MockCallState as _MockCallState } from '@/composables/useSipMock'

/**
 * Helper function to properly connect with fake timers.
 * Even with delay: 0, fake timers need to be advanced to resolve setTimeout(0).
 */
async function connectWithTimers(
  connect: () => Promise<void>,
  connectDelay: number,
  registerDelay: number
) {
  const connectPromise = connect()
  // Advance past both delays (add small buffer for any microtask timing)
  await vi.advanceTimersByTimeAsync(connectDelay + registerDelay + 10)
  await connectPromise
}

/**
 * Helper function to make a call with fake timers.
 * Handles the ring and connect delays properly.
 */
async function callWithTimers(
  callFn: (number: string, displayName?: string) => Promise<string>,
  number: string,
  ringDelay: number,
  connectCallDelay: number,
  displayName?: string
) {
  const callPromise = callFn(number, displayName)
  // Advance past both ring and connect delays
  await vi.advanceTimersByTimeAsync(ringDelay + connectCallDelay + 10)
  return callPromise
}

describe('useSipMock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should start in disconnected state', () => {
      const { isConnected, isRegistered, activeCall, callState, error } = useSipMock()

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(activeCall.value).toBeNull()
      expect(callState.value).toBe('idle')
      expect(error.value).toBeNull()
    })

    it('should have empty call history initially', () => {
      const { callHistory } = useSipMock()

      expect(callHistory.value).toEqual([])
    })

    it('should accept custom options', () => {
      const { configure } = useSipMock({
        connectDelay: 1000,
        registerDelay: 500,
        ringDelay: 5000,
        connectCallDelay: 2000,
        autoAnswer: true,
        simulateQualityEvents: true,
        generateIncomingCalls: false,
      })

      // Configuration should be accepted without error
      expect(configure).toBeDefined()
    })
  })

  // ==========================================================================
  // Connection Flow Tests
  // ==========================================================================

  describe('Connection flow', () => {
    it('should connect with default delay', async () => {
      const { connect, isConnected, isRegistered } = useSipMock()

      const connectPromise = connect()

      // Should not be connected immediately
      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)

      // Advance past connect delay (default 500ms)
      await vi.advanceTimersByTimeAsync(500)

      // Should be connected but not registered yet
      expect(isConnected.value).toBe(true)
      expect(isRegistered.value).toBe(false)

      // Advance past register delay (default 300ms)
      await vi.advanceTimersByTimeAsync(300)

      await connectPromise

      // Should be connected and registered
      expect(isConnected.value).toBe(true)
      expect(isRegistered.value).toBe(true)
    })

    it('should connect with custom delays', async () => {
      const { connect, isConnected, isRegistered } = useSipMock({
        connectDelay: 100,
        registerDelay: 50,
      })

      const connectPromise = connect()

      // Advance past custom connect delay
      await vi.advanceTimersByTimeAsync(100)
      expect(isConnected.value).toBe(true)

      // Advance past custom register delay
      await vi.advanceTimersByTimeAsync(50)

      await connectPromise

      expect(isRegistered.value).toBe(true)
    })

    it('should disconnect properly', async () => {
      const { connect, disconnect, isConnected, isRegistered } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      expect(isConnected.value).toBe(true)
      expect(isRegistered.value).toBe(true)

      await disconnect()

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
    })

    it('should handle disconnect during active call', async () => {
      const { connect, call, disconnect, activeCall, callState } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      expect(activeCall.value).not.toBeNull()

      await disconnect()

      expect(activeCall.value).toBeNull()
      expect(callState.value).toBe('idle')
    })

    it('should not allow connect when already connected', async () => {
      const { connect, isConnected } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      expect(isConnected.value).toBe(true)

      // Second connect should resolve immediately without error
      await connect()
      expect(isConnected.value).toBe(true)
    })
  })

  // ==========================================================================
  // Outbound Call Tests
  // ==========================================================================

  describe('Outbound calls', () => {
    it('should make outbound call and transition through states', async () => {
      const { connect, call, callState, activeCall } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 1000,
        connectCallDelay: 500,
      })

      await connectWithTimers(connect, 100, 100)

      const callPromise = call('1234567890', 'Test Contact')

      // Should be in calling state
      expect(callState.value).toBe('calling')
      expect(activeCall.value).not.toBeNull()
      expect(activeCall.value?.direction).toBe('outbound')
      expect(activeCall.value?.remoteNumber).toBe('1234567890')
      expect(activeCall.value?.remoteDisplayName).toBe('Test Contact')

      // Advance to ringing state
      await vi.advanceTimersByTimeAsync(1000)
      expect(callState.value).toBe('ringing')

      // Advance to active state
      await vi.advanceTimersByTimeAsync(500)
      const callId = await callPromise

      expect(callState.value).toBe('active')
      expect(callId).toBeDefined()
      expect(activeCall.value?.answerTime).not.toBeNull()
    })

    it('should track call duration when active', async () => {
      const { connect, call, activeCall } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      expect(activeCall.value?.duration).toBe(0)

      // Advance time by 5 seconds
      await vi.advanceTimersByTimeAsync(5000)

      expect(activeCall.value?.duration).toBeGreaterThanOrEqual(5)
    })

    it('should end call with hangup', async () => {
      const { connect, call, hangup, callState, activeCall, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      expect(callState.value).toBe('active')

      await hangup()

      expect(callState.value).toBe('idle')
      expect(activeCall.value).toBeNull()
      expect(callHistory.value.length).toBe(1)
      expect(callHistory.value[0].endTime).not.toBeNull()
    })

    it('should not allow call when not connected', async () => {
      const { call, error: _error } = useSipMock()

      await expect(call('1234567890')).rejects.toThrow()
    })

    it('should not allow call when not registered', async () => {
      const { connect, call, isConnected, isRegistered } = useSipMock({
        connectDelay: 100,
        registerDelay: 1000000, // Very long register delay
      })

      const _connectPromise = connect()
      await vi.advanceTimersByTimeAsync(100) // Just connect, not register

      expect(isConnected.value).toBe(true)
      expect(isRegistered.value).toBe(false)

      await expect(call('1234567890')).rejects.toThrow()
    })

    it('should not allow multiple simultaneous calls', async () => {
      const { connect, call } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 1000,
        connectCallDelay: 1000,
      })

      await connectWithTimers(connect, 100, 100)

      // Start first call
      call('1111111111')

      // Try to start second call
      await expect(call('2222222222')).rejects.toThrow()
    })
  })

  // ==========================================================================
  // Inbound Call Tests
  // ==========================================================================

  describe('Inbound calls', () => {
    it('should simulate incoming call', async () => {
      const { connect, simulateIncomingCall, callState, activeCall } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)

      simulateIncomingCall('9876543210', 'Caller Name')

      expect(callState.value).toBe('ringing')
      expect(activeCall.value).not.toBeNull()
      expect(activeCall.value?.direction).toBe('inbound')
      expect(activeCall.value?.remoteNumber).toBe('9876543210')
      expect(activeCall.value?.remoteDisplayName).toBe('Caller Name')
    })

    it('should answer incoming call', async () => {
      const { connect, simulateIncomingCall, answer, callState, activeCall } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      simulateIncomingCall('9876543210')

      expect(callState.value).toBe('ringing')

      await answer()

      expect(callState.value).toBe('active')
      expect(activeCall.value?.answerTime).not.toBeNull()
    })

    it('should auto-answer incoming calls when configured', async () => {
      const { connect, simulateIncomingCall, callState } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        autoAnswer: true,
      })

      await connectWithTimers(connect, 100, 100)
      simulateIncomingCall('9876543210')

      // With auto-answer, should transition to active
      await vi.advanceTimersByTimeAsync(100) // Small delay for auto-answer

      expect(callState.value).toBe('active')
    })

    it('should reject incoming call with hangup', async () => {
      const { connect, simulateIncomingCall, hangup, callState, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      simulateIncomingCall('9876543210')

      await hangup()

      expect(callState.value).toBe('idle')
      expect(callHistory.value.length).toBe(1)
    })

    it('should not answer when no incoming call', async () => {
      const { connect, answer } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)

      await expect(answer()).rejects.toThrow()
    })
  })

  // ==========================================================================
  // Call Controls Tests
  // ==========================================================================

  describe('Call controls', () => {
    it('should hold and unhold active call', async () => {
      const { connect, call, hold, unhold, callState, activeCall } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      expect(callState.value).toBe('active')

      await hold()
      expect(callState.value).toBe('held')
      expect(activeCall.value?.state).toBe('held')

      await unhold()
      expect(callState.value).toBe('active')
      expect(activeCall.value?.state).toBe('active')
    })

    it('should not hold when no active call', async () => {
      const { connect, hold } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)

      await expect(hold()).rejects.toThrow()
    })

    it('should not unhold when not on hold', async () => {
      const { connect, call, unhold } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      await expect(unhold()).rejects.toThrow()
    })

    it('should send DTMF digits', async () => {
      const { connect, call, sendDTMF } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      // Should not throw for valid DTMF digits
      expect(() => sendDTMF('1')).not.toThrow()
      expect(() => sendDTMF('*')).not.toThrow()
      expect(() => sendDTMF('#')).not.toThrow()
      expect(() => sendDTMF('0')).not.toThrow()
    })

    it('should not send DTMF when no active call', async () => {
      const { connect, sendDTMF } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)

      expect(() => sendDTMF('1')).toThrow()
    })
  })

  // ==========================================================================
  // Event Simulation Tests
  // ==========================================================================

  describe('Event simulation', () => {
    it('should simulate call quality drop', async () => {
      const {
        connect,
        call,
        simulateCallQualityDrop,
        activeCall: _activeCall,
      } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
        simulateQualityEvents: true,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      // Should not throw
      expect(() => simulateCallQualityDrop()).not.toThrow()
    })

    it('should simulate network issue', async () => {
      const { connect, call, simulateNetworkIssue, error } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      simulateNetworkIssue()

      // Should set an error or affect connection state
      expect(error.value).not.toBeNull()
    })
  })

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('Configuration', () => {
    it('should allow runtime configuration changes', async () => {
      const { configure, connect, call, callState } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 1000,
        connectCallDelay: 1000,
      })

      await connectWithTimers(connect, 100, 100)

      // Change configuration to use small delays
      configure({
        ringDelay: 50,
        connectCallDelay: 50,
      })

      await callWithTimers(call, '1234567890', 50, 50)

      // With configured delays, should be active after advancing time
      expect(callState.value).toBe('active')
    })

    it('should merge partial configuration', async () => {
      const { configure } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
      })

      // Should not throw when providing partial config
      expect(() => configure({ ringDelay: 200 })).not.toThrow()
    })
  })

  // ==========================================================================
  // Call History Tests
  // ==========================================================================

  describe('Call history', () => {
    it('should record completed calls in history', async () => {
      const { connect, call, hangup, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)

      await callWithTimers(call, '1111111111', 100, 100, 'Contact 1')
      await hangup()

      await callWithTimers(call, '2222222222', 100, 100, 'Contact 2')
      await hangup()

      expect(callHistory.value.length).toBe(2)
      expect(callHistory.value[0].remoteNumber).toBe('1111111111')
      expect(callHistory.value[1].remoteNumber).toBe('2222222222')
    })

    it('should record call direction correctly', async () => {
      const { connect, call, simulateIncomingCall, hangup, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)

      // Outbound call
      await callWithTimers(call, '1111111111', 100, 100)
      await hangup()

      // Inbound call
      simulateIncomingCall('2222222222')
      await hangup()

      expect(callHistory.value[0].direction).toBe('outbound')
      expect(callHistory.value[1].direction).toBe('inbound')
    })

    it('should preserve call timestamps', async () => {
      const { connect, call, hangup, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      await callWithTimers(call, '1234567890', 100, 100)

      // Advance time
      await vi.advanceTimersByTimeAsync(10000)

      await hangup()

      const historyEntry = callHistory.value[0]
      expect(historyEntry.startTime).toBeInstanceOf(Date)
      expect(historyEntry.answerTime).toBeInstanceOf(Date)
      expect(historyEntry.endTime).toBeInstanceOf(Date)
      expect(historyEntry.duration).toBeGreaterThanOrEqual(10)
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error handling', () => {
    it('should set error on network simulation', async () => {
      const { connect, simulateNetworkIssue, error } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      simulateNetworkIssue()

      expect(error.value).not.toBeNull()
    })

    it('should clear error on successful reconnect', async () => {
      const { connect, disconnect, simulateNetworkIssue, error } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      await connectWithTimers(connect, 100, 100)
      simulateNetworkIssue()
      expect(error.value).not.toBeNull()

      await disconnect()
      await connectWithTimers(connect, 100, 100)

      expect(error.value).toBeNull()
    })
  })

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const { connect, disconnect, isConnected } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
      })

      for (let i = 0; i < 5; i++) {
        await connectWithTimers(connect, 100, 100)
        expect(isConnected.value).toBe(true)
        await disconnect()
        expect(isConnected.value).toBe(false)
      }
    })

    it('should handle hangup during ringing state', async () => {
      const { connect, call, hangup, callState, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 10000,
        connectCallDelay: 10000,
      })

      // Start connection (don't await)
      const connectPromise = connect()

      // Advance past connect and register delays
      await vi.advanceTimersByTimeAsync(250)
      await connectPromise

      // Start call (don't await - it will be waiting on ringDelay)
      call('1234567890')

      // Advance time but not enough to complete ring delay
      await vi.advanceTimersByTimeAsync(100)

      // Call should still be in 'calling' state (hasn't reached ringDelay yet)
      expect(callState.value).toBe('calling')

      // Hangup while still calling
      await hangup()

      expect(callState.value).toBe('idle')
      expect(callHistory.value.length).toBe(1)
    })

    it('should use default display name when not provided', async () => {
      const { connect, call, activeCall } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      // Start connection (don't await)
      const connectPromise = connect()

      // Advance past connect and register delays
      await vi.advanceTimersByTimeAsync(250)
      await connectPromise

      // Start call (don't await - check display name immediately after call starts)
      call('1234567890')

      // Display name should be set immediately when call is initiated
      expect(activeCall.value?.remoteDisplayName).toBe('1234567890')
    })

    it('should generate unique call IDs', async () => {
      const { connect, call, hangup, callHistory } = useSipMock({
        connectDelay: 100,
        registerDelay: 100,
        ringDelay: 100,
        connectCallDelay: 100,
      })

      // Start connection (don't await)
      const connectPromise = connect()

      // Advance past connect and register delays
      await vi.advanceTimersByTimeAsync(250)
      await connectPromise

      // First call
      call('1111111111')
      await vi.advanceTimersByTimeAsync(250) // Past ring and connect delays
      await hangup()

      // Second call
      call('2222222222')
      await vi.advanceTimersByTimeAsync(250) // Past ring and connect delays
      await hangup()

      const ids = callHistory.value.map((c) => c.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })
  })
})
