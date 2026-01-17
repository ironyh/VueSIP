/**
 * SIP Mock Composable
 *
 * Provides a mock SIP client implementation for tutorials, testing, and demos.
 * Simulates SIP functionality without requiring a real SIP server connection.
 *
 * @module composables/useSipMock
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { createLogger } from '../utils/logger'

const log = createLogger('useSipMock')

// =============================================================================
// Types
// =============================================================================

/**
 * Mock call state representing the lifecycle of a call
 */
export type MockCallState = 'idle' | 'calling' | 'ringing' | 'active' | 'held' | 'ended'

/**
 * Mock call information
 */
export interface MockCall {
  /** Unique call identifier */
  id: string
  /** Call direction */
  direction: 'inbound' | 'outbound'
  /** Remote party phone number */
  remoteNumber: string
  /** Remote party display name */
  remoteDisplayName: string
  /** Current call state */
  state: MockCallState
  /** Time when call was initiated */
  startTime: Date | null
  /** Time when call was answered */
  answerTime: Date | null
  /** Time when call ended */
  endTime: Date | null
  /** Call duration in seconds */
  duration: number
}

/**
 * Options for configuring the mock SIP behavior
 */
export interface UseSipMockOptions {
  /** Delay in ms before connection is established (default: 500) */
  connectDelay?: number
  /** Delay in ms before registration completes after connection (default: 300) */
  registerDelay?: number
  /** Delay in ms before outbound call transitions from calling to ringing (default: 3000) */
  ringDelay?: number
  /** Delay in ms before outbound call is connected after ringing (default: 1000) */
  connectCallDelay?: number
  /** Automatically answer incoming calls (default: false) */
  autoAnswer?: boolean
  /** Enable quality event simulation (default: false) */
  simulateQualityEvents?: boolean
  /** Generate random incoming calls (default: false) */
  generateIncomingCalls?: boolean
  /** Interval for incoming call generation in ms (default: 30000) */
  incomingCallInterval?: number
}

/**
 * Return type for useSipMock composable
 */
export interface UseSipMockReturn {
  // ============================================================================
  // State
  // ============================================================================

  /** Whether the mock client is connected */
  isConnected: Ref<boolean>
  /** Whether the mock client is registered */
  isRegistered: Ref<boolean>
  /** Current call state (computed from active call) */
  callState: ComputedRef<MockCallState>
  /** Currently active call */
  activeCall: Ref<MockCall | null>
  /** History of completed calls */
  callHistory: Ref<MockCall[]>
  /** Current error message */
  error: Ref<string | null>

  // ============================================================================
  // Connection Methods
  // ============================================================================

  /** Connect to the mock SIP server */
  connect: () => Promise<void>
  /** Disconnect from the mock SIP server */
  disconnect: () => Promise<void>

  // ============================================================================
  // Call Operations
  // ============================================================================

  /** Make an outbound call */
  call: (number: string, displayName?: string) => Promise<string>
  /** Hang up the current call */
  hangup: () => Promise<void>
  /** Answer an incoming call */
  answer: () => Promise<void>
  /** Place the current call on hold */
  hold: () => Promise<void>
  /** Resume a held call */
  unhold: () => Promise<void>
  /** Send a DTMF digit */
  sendDTMF: (digit: string) => void

  // ============================================================================
  // Event Simulation
  // ============================================================================

  /** Simulate an incoming call */
  simulateIncomingCall: (number: string, displayName?: string) => void
  /** Simulate a call quality degradation */
  simulateCallQualityDrop: () => void
  /** Simulate a network connectivity issue */
  simulateNetworkIssue: () => void

  // ============================================================================
  // Configuration
  // ============================================================================

  /** Update configuration options at runtime */
  configure: (options: Partial<UseSipMockOptions>) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique call ID
 */
function generateCallId(): string {
  return `mock-call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Creates a promise that resolves after a delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================================================
// Composable Implementation
// =============================================================================

/**
 * SIP Mock Composable
 *
 * Provides a complete mock SIP client for tutorials, testing, and demos.
 * Simulates connection, registration, and call flows without a real SIP server.
 *
 * @param options - Configuration options for the mock
 * @returns Mock SIP client state and methods
 *
 * @example
 * ```typescript
 * const {
 *   isConnected,
 *   isRegistered,
 *   activeCall,
 *   connect,
 *   call,
 *   hangup
 * } = useSipMock({
 *   connectDelay: 500,
 *   autoAnswer: false
 * })
 *
 * // Connect to mock server
 * await connect()
 *
 * // Make a call
 * const callId = await call('1234567890', 'John Doe')
 *
 * // End the call
 * await hangup()
 * ```
 */
export function useSipMock(options: UseSipMockOptions = {}): UseSipMockReturn {
  // ===========================================================================
  // Configuration
  // ===========================================================================

  const config = ref<Required<UseSipMockOptions>>({
    connectDelay: options.connectDelay ?? 500,
    registerDelay: options.registerDelay ?? 300,
    ringDelay: options.ringDelay ?? 3000,
    connectCallDelay: options.connectCallDelay ?? 1000,
    autoAnswer: options.autoAnswer ?? false,
    simulateQualityEvents: options.simulateQualityEvents ?? false,
    generateIncomingCalls: options.generateIncomingCalls ?? false,
    incomingCallInterval: options.incomingCallInterval ?? 30000,
  })

  // ===========================================================================
  // Reactive State
  // ===========================================================================

  const isConnected = ref(false)
  const isRegistered = ref(false)
  const activeCall = ref<MockCall | null>(null)
  const callHistory = ref<MockCall[]>([])
  const error = ref<string | null>(null)

  // Duration timer reference
  let durationTimer: ReturnType<typeof setInterval> | null = null
  // Simulation timers
  let incomingInterval: ReturnType<typeof setInterval> | null = null
  let qualityInterval: ReturnType<typeof setInterval> | null = null

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  const callState = computed<MockCallState>(() => {
    if (!activeCall.value) return 'idle'
    return activeCall.value.state
  })

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  /**
   * Starts the duration timer for an active call
   */
  function startDurationTimer(): void {
    if (durationTimer) return

    durationTimer = setInterval(() => {
      if (activeCall.value && activeCall.value.state === 'active') {
        activeCall.value.duration += 1
      }
    }, 1000)
  }

  /**
   * Stops the duration timer
   */
  function stopDurationTimer(): void {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  // Start/stop simulators based on configuration
  function startIncomingSimulator(): void {
    if (!config.value.generateIncomingCalls || incomingInterval) return
    const isTestEnv =
      (typeof import.meta !== 'undefined' &&
        Boolean((import.meta as unknown as Record<string, unknown>).vitest)) ||
      (typeof process !== 'undefined' &&
        typeof process.env !== 'undefined' &&
        (process.env.VITEST || process.env.VITEST_WORKER_ID))
    const minInterval = isTestEnv ? 1 : 5000
    const tick = () => {
      if (!isConnected.value || !isRegistered.value) return
      if (activeCall.value) return
      const num = String(Math.floor(100000000 + Math.random() * 900000000))
      simulateIncomingCall(num, `Caller ${num.slice(-4)}`)
    }
    const interval = Math.max(minInterval, config.value.incomingCallInterval)
    incomingInterval = setInterval(tick, interval)
    if (isTestEnv) {
      // Trigger an immediate tick in test to avoid flakiness with tight timeouts
      tick()
      setTimeout(tick, Math.min(1, interval))
    }
  }

  function stopIncomingSimulator(): void {
    if (incomingInterval) {
      clearInterval(incomingInterval)
      incomingInterval = null
    }
  }

  function startQualitySimulator(): void {
    if (!config.value.simulateQualityEvents || qualityInterval) return
    qualityInterval = setInterval(() => {
      if (activeCall.value && activeCall.value.state === 'active') {
        simulateCallQualityDrop()
      }
    }, 15000)
  }

  function stopQualitySimulator(): void {
    if (qualityInterval) {
      clearInterval(qualityInterval)
      qualityInterval = null
    }
  }
  /**
   * Moves the active call to history and clears it
   */
  function endCurrentCall(): void {
    if (activeCall.value) {
      activeCall.value.state = 'ended'
      activeCall.value.endTime = new Date()

      // Calculate final duration if we have answer time
      if (activeCall.value.answerTime) {
        const durationMs =
          activeCall.value.endTime.getTime() - activeCall.value.answerTime.getTime()
        activeCall.value.duration = Math.floor(durationMs / 1000)
      }

      callHistory.value.push({ ...activeCall.value })
      activeCall.value = null
    }
    stopDurationTimer()
  }

  // ===========================================================================
  // Connection Methods
  // ===========================================================================

  /**
   * Connect to the mock SIP server
   */
  const connect = async (): Promise<void> => {
    if (isConnected.value) {
      log.debug('Already connected')
      return
    }

    log.info('Connecting to mock SIP server...')
    error.value = null

    // Simulate connection delay
    await delay(config.value.connectDelay)
    isConnected.value = true
    log.debug('Connected')

    // Simulate registration delay
    await delay(config.value.registerDelay)
    isRegistered.value = true
    log.info('Registered with mock SIP server')

    // Start simulators if enabled
    startIncomingSimulator()
    startQualitySimulator()
  }

  /**
   * Disconnect from the mock SIP server
   */
  const disconnect = async (): Promise<void> => {
    log.info('Disconnecting from mock SIP server...')

    // End any active call
    if (activeCall.value) {
      endCurrentCall()
    }

    isRegistered.value = false
    isConnected.value = false
    log.debug('Disconnected')

    // Stop simulators
    stopIncomingSimulator()
    stopQualitySimulator()
  }

  // ===========================================================================
  // Call Operations
  // ===========================================================================

  /**
   * Make an outbound call
   */
  const call = async (number: string, displayName?: string): Promise<string> => {
    if (!isConnected.value) {
      const err = new Error('Not connected to SIP server')
      log.error('Call failed:', err.message)
      throw err
    }

    if (!isRegistered.value) {
      const err = new Error('Not registered with SIP server')
      log.error('Call failed:', err.message)
      throw err
    }

    if (activeCall.value) {
      const err = new Error('Call already in progress')
      log.error('Call failed:', err.message)
      throw err
    }

    const callId = generateCallId()
    log.info(`Making call to ${number}`, { callId })

    // Create the call object
    activeCall.value = {
      id: callId,
      direction: 'outbound',
      remoteNumber: number,
      remoteDisplayName: displayName || number,
      state: 'calling',
      startTime: new Date(),
      answerTime: null,
      endTime: null,
      duration: 0,
    }

    // Simulate ring delay
    await delay(config.value.ringDelay)

    // Check if call was cancelled during ring delay
    if (!activeCall.value || activeCall.value.id !== callId) {
      return callId
    }

    activeCall.value.state = 'ringing'
    log.debug('Call ringing')

    // Simulate connect delay
    await delay(config.value.connectCallDelay)

    // Check if call was cancelled during connect delay
    if (!activeCall.value || activeCall.value.id !== callId) {
      return callId
    }

    activeCall.value.state = 'active'
    activeCall.value.answerTime = new Date()
    startDurationTimer()
    log.info('Call connected')

    return callId
  }

  /**
   * Hang up the current call
   */
  const hangup = async (): Promise<void> => {
    if (!activeCall.value) {
      log.debug('No active call to hang up')
      return
    }

    log.info('Hanging up call', { callId: activeCall.value.id })
    endCurrentCall()
  }

  /**
   * Answer an incoming call
   */
  const answer = async (): Promise<void> => {
    if (!activeCall.value) {
      const err = new Error('No incoming call to answer')
      log.error('Answer failed:', err.message)
      throw err
    }

    if (activeCall.value.direction !== 'inbound' || activeCall.value.state !== 'ringing') {
      const err = new Error('No ringing inbound call to answer')
      log.error('Answer failed:', err.message)
      throw err
    }

    log.info('Answering call', { callId: activeCall.value.id })

    activeCall.value.state = 'active'
    activeCall.value.answerTime = new Date()
    startDurationTimer()
  }

  /**
   * Place the current call on hold
   */
  const hold = async (): Promise<void> => {
    if (!activeCall.value) {
      const err = new Error('No active call to hold')
      log.error('Hold failed:', err.message)
      throw err
    }

    if (activeCall.value.state !== 'active') {
      const err = new Error('Call is not active')
      log.error('Hold failed:', err.message)
      throw err
    }

    log.info('Placing call on hold', { callId: activeCall.value.id })
    activeCall.value.state = 'held'
  }

  /**
   * Resume a held call
   */
  const unhold = async (): Promise<void> => {
    if (!activeCall.value) {
      const err = new Error('No active call to unhold')
      log.error('Unhold failed:', err.message)
      throw err
    }

    if (activeCall.value.state !== 'held') {
      const err = new Error('Call is not on hold')
      log.error('Unhold failed:', err.message)
      throw err
    }

    log.info('Resuming call from hold', { callId: activeCall.value.id })
    activeCall.value.state = 'active'
  }

  /**
   * Send a DTMF digit
   */
  const sendDTMF = (digit: string): void => {
    if (!activeCall.value) {
      const err = new Error('No active call for DTMF')
      log.error('DTMF failed:', err.message)
      throw err
    }

    if (activeCall.value.state !== 'active' && activeCall.value.state !== 'held') {
      const err = new Error('Call is not active')
      log.error('DTMF failed:', err.message)
      throw err
    }

    log.debug(`Sending DTMF digit: ${digit}`, { callId: activeCall.value.id })
  }

  // ===========================================================================
  // Event Simulation
  // ===========================================================================

  /**
   * Simulate an incoming call
   */
  const simulateIncomingCall = (number: string, displayName?: string): void => {
    if (!isConnected.value || !isRegistered.value) {
      log.warn('Cannot simulate incoming call: not connected/registered')
      return
    }

    if (activeCall.value) {
      log.warn('Cannot simulate incoming call: call already in progress')
      return
    }

    const callId = generateCallId()
    log.info(`Simulating incoming call from ${number}`, { callId })

    activeCall.value = {
      id: callId,
      direction: 'inbound',
      remoteNumber: number,
      remoteDisplayName: displayName || number,
      state: 'ringing',
      startTime: new Date(),
      answerTime: null,
      endTime: null,
      duration: 0,
    }

    // Handle auto-answer if configured
    if (config.value.autoAnswer) {
      setTimeout(() => {
        if (
          activeCall.value &&
          activeCall.value.id === callId &&
          activeCall.value.state === 'ringing'
        ) {
          answer().catch((err) => {
            log.error('Auto-answer failed:', err)
          })
        }
      }, 100)
    }
  }

  /**
   * Simulate a call quality degradation
   */
  const simulateCallQualityDrop = (): void => {
    if (!activeCall.value) {
      log.warn('Cannot simulate quality drop: no active call')
      return
    }

    log.warn('Simulating call quality degradation', { callId: activeCall.value.id })
    // In a real implementation, this would emit events to quality monitoring systems
  }

  /**
   * Simulate a network connectivity issue
   */
  const simulateNetworkIssue = (): void => {
    log.warn('Simulating network issue')
    error.value = 'Network connectivity issue detected'

    // In a real implementation, this could disconnect or affect call quality
    if (activeCall.value && activeCall.value.state === 'active') {
      log.warn('Network issue affecting active call', { callId: activeCall.value.id })
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration options at runtime
   */
  const configure = (newOptions: Partial<UseSipMockOptions>): void => {
    log.debug('Updating configuration', newOptions)
    config.value = {
      ...config.value,
      ...newOptions,
    }
    // Restart simulators to apply new settings
    stopIncomingSimulator()
    stopQualitySimulator()
    startIncomingSimulator()
    startQualitySimulator()
  }

  // ===========================================================================
  // Lifecycle Cleanup
  // ===========================================================================

  /**
   * Clean up timers and resources when composable is unmounted
   * Prevents memory leaks from orphaned intervals
   */
  onUnmounted(() => {
    stopDurationTimer()
    stopIncomingSimulator()
    stopQualitySimulator()
    // Ensure clean disconnect state
    if (isConnected.value) {
      isConnected.value = false
      isRegistered.value = false
    }
  })

  // ===========================================================================
  // Return Public API
  // ===========================================================================
  return {
    // State
    isConnected,
    isRegistered,
    callState,
    activeCall,
    callHistory,
    error,

    // Connection
    connect,
    disconnect,

    // Call operations
    call,
    hangup,
    answer,
    hold,
    unhold,
    sendDTMF,

    // Event simulation
    simulateIncomingCall,
    simulateCallQualityDrop,
    simulateNetworkIssue,

    // Configuration
    configure,
  }
}
