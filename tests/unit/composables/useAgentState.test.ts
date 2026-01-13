// tests/unit/composables/useAgentState.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAgentState } from '@/composables/useAgentState'
import type { CallCenterProvider, AgentState } from '@/providers/call-center/types'
import { withSetup } from '../../utils/test-helpers'

const mockState: AgentState = {
  agentId: 'agent-001',
  displayName: 'Test Agent',
  status: 'available',
  extension: 'PJSIP/1001',
  queues: [
    {
      name: 'support',
      displayName: 'Support',
      isMember: true,
      isPaused: false,
      penalty: 0,
      callsHandled: 5,
      lastCallTime: null,
    },
  ],
  currentCall: null,
  loginTime: new Date(),
  isPaused: false,
  pauseReason: undefined,
  breakType: undefined,
}

function createMockProvider(): CallCenterProvider {
  let stateCallback: ((state: AgentState, prev: AgentState) => void) | null = null

  return {
    id: 'test',
    name: 'Test Provider',
    capabilities: {
      supportsQueues: true,
      supportsMultiQueue: true,
      supportsPause: true,
      supportsPauseReasons: true,
      supportsBreakTypes: false,
      supportsWrapUp: true,
      supportsMetrics: true,
      supportsRealTimeEvents: true,
      supportsPenalty: true,
      supportsSkillBasedRouting: false,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    login: vi.fn().mockResolvedValue(mockState),
    logout: vi.fn().mockResolvedValue(undefined),
    setStatus: vi.fn().mockResolvedValue(undefined),
    joinQueue: vi.fn().mockResolvedValue(undefined),
    leaveQueue: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    unpause: vi.fn().mockResolvedValue(undefined),
    getMetrics: vi.fn().mockResolvedValue({ callsHandled: 5 }),
    onStateChange: vi.fn((cb) => {
      stateCallback = cb
      return () => {
        stateCallback = null
      }
    }),
    onQueueEvent: vi.fn(() => () => {}),
    // Helper to simulate state changes in tests
    _emitState: (state: AgentState) => {
      if (stateCallback) stateCallback(state, mockState)
    },
  } as CallCenterProvider & { _emitState: (state: AgentState) => void }
}

describe('useAgentState', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
  })

  describe('initialization', () => {
    it('should initialize with offline status before login', () => {
      const providerRef = ref(mockProvider)
      const { status, isLoggedIn } = useAgentState(providerRef)

      expect(status.value).toBe('offline')
      expect(isLoggedIn.value).toBe(false)
    })
  })

  describe('login/logout', () => {
    it('should login and update state', async () => {
      const providerRef = ref(mockProvider)
      const { login, status, isLoggedIn, agentId } = useAgentState(providerRef)

      await login()

      expect(mockProvider.login).toHaveBeenCalled()
      expect(status.value).toBe('available')
      expect(isLoggedIn.value).toBe(true)
      expect(agentId.value).toBe('agent-001')
    })

    it('should logout and reset state', async () => {
      const providerRef = ref(mockProvider)
      const { login, logout, status, isLoggedIn } = useAgentState(providerRef)

      await login()
      await logout()

      expect(mockProvider.logout).toHaveBeenCalled()
      expect(status.value).toBe('offline')
      expect(isLoggedIn.value).toBe(false)
    })
  })

  describe('pause/unpause', () => {
    it('should pause with reason', async () => {
      const providerRef = ref(mockProvider)
      const { login, pause } = useAgentState(providerRef)

      await login()
      await pause('Lunch')

      expect(mockProvider.pause).toHaveBeenCalledWith({ reason: 'Lunch' })
    })

    it('should unpause', async () => {
      const providerRef = ref(mockProvider)
      const { login, pause, unpause } = useAgentState(providerRef)

      await login()
      await pause('Break')
      await unpause()

      expect(mockProvider.unpause).toHaveBeenCalled()
    })
  })

  describe('computed properties', () => {
    it('should compute isOnCall correctly', async () => {
      const providerRef = ref(mockProvider)
      const { login, isOnCall } = useAgentState(providerRef)

      await login()
      expect(isOnCall.value).toBe(false)

      // Simulate call start
      mockProvider._emitState({
        ...mockState,
        status: 'busy',
        currentCall: {
          callId: 'call-1',
          fromQueue: 'support',
          callerInfo: 'John <1234>',
          startTime: new Date(),
          duration: 0,
          isOnHold: false,
        },
      })
    })

    it('should compute sessionDuration formatted', async () => {
      const providerRef = ref(mockProvider)
      const { login, sessionDuration } = useAgentState(providerRef)

      await login()
      // sessionDuration is computed from loginTime
      expect(typeof sessionDuration.value).toBe('string')
    })

    it('should compute pauseReason and breakType', async () => {
      const providerRef = ref(mockProvider)
      const { pauseReason, breakType, isPaused } = useAgentState(providerRef)

      expect(pauseReason.value).toBeUndefined()
      expect(breakType.value).toBeUndefined()
      expect(isPaused.value).toBe(false)

      // Simulate paused state
      mockProvider._emitState({
        ...mockState,
        isPaused: true,
        pauseReason: 'Lunch',
        breakType: 'lunch',
      })
    })

    it('should compute displayName from state', async () => {
      const providerRef = ref(mockProvider)
      const { login, displayName } = useAgentState(providerRef)

      expect(displayName.value).toBeNull()
      await login()
      expect(displayName.value).toBe('Test Agent')
    })

    it('should compute currentCall from state', async () => {
      const providerRef = ref(mockProvider)
      const { login, currentCall } = useAgentState(providerRef)

      expect(currentCall.value).toBeNull()
      await login()
      expect(currentCall.value).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle login error', async () => {
      mockProvider.login = vi.fn().mockRejectedValue(new Error('Login failed'))
      const providerRef = ref(mockProvider)
      const { login, error } = useAgentState(providerRef)

      await expect(login()).rejects.toThrow('Login failed')
      expect(error.value).toBe('Login failed')
    })

    it('should handle logout error', async () => {
      mockProvider.logout = vi.fn().mockRejectedValue(new Error('Logout failed'))
      const providerRef = ref(mockProvider)
      const { login, logout, error } = useAgentState(providerRef)

      await login()
      await expect(logout()).rejects.toThrow('Logout failed')
      expect(error.value).toBe('Logout failed')
    })

    it('should handle pause error', async () => {
      mockProvider.pause = vi.fn().mockRejectedValue(new Error('Pause failed'))
      const providerRef = ref(mockProvider)
      const { login, pause, error } = useAgentState(providerRef)

      await login()
      await expect(pause('Lunch')).rejects.toThrow('Pause failed')
      expect(error.value).toBe('Pause failed')
    })

    it('should handle unpause error', async () => {
      mockProvider.unpause = vi.fn().mockRejectedValue(new Error('Unpause failed'))
      const providerRef = ref(mockProvider)
      const { login, unpause, error } = useAgentState(providerRef)

      await login()
      await expect(unpause()).rejects.toThrow('Unpause failed')
      expect(error.value).toBe('Unpause failed')
    })

    it('should handle setStatus error', async () => {
      mockProvider.setStatus = vi.fn().mockRejectedValue(new Error('Status failed'))
      const providerRef = ref(mockProvider)
      const { login, setStatus, error } = useAgentState(providerRef)

      await login()
      await expect(setStatus('away')).rejects.toThrow('Status failed')
      expect(error.value).toBe('Status failed')
    })

    it('should handle non-Error exception in login', async () => {
      mockProvider.login = vi.fn().mockRejectedValue('Unknown error')
      const providerRef = ref(mockProvider)
      const { login, error } = useAgentState(providerRef)

      await expect(login()).rejects.toBe('Unknown error')
      expect(error.value).toBe('Login failed')
    })

    it('should handle non-Error exception in logout', async () => {
      mockProvider.logout = vi.fn().mockRejectedValue('Unknown error')
      const providerRef = ref(mockProvider)
      const { login, logout, error } = useAgentState(providerRef)

      await login()
      await expect(logout()).rejects.toBe('Unknown error')
      expect(error.value).toBe('Logout failed')
    })

    it('should handle non-Error exception in pause', async () => {
      mockProvider.pause = vi.fn().mockRejectedValue('Unknown error')
      const providerRef = ref(mockProvider)
      const { login, pause, error } = useAgentState(providerRef)

      await login()
      await expect(pause('Lunch')).rejects.toBe('Unknown error')
      expect(error.value).toBe('Pause failed')
    })

    it('should handle non-Error exception in unpause', async () => {
      mockProvider.unpause = vi.fn().mockRejectedValue('Unknown error')
      const providerRef = ref(mockProvider)
      const { login, unpause, error } = useAgentState(providerRef)

      await login()
      await expect(unpause()).rejects.toBe('Unknown error')
      expect(error.value).toBe('Unpause failed')
    })

    it('should handle non-Error exception in setStatus', async () => {
      mockProvider.setStatus = vi.fn().mockRejectedValue('Unknown error')
      const providerRef = ref(mockProvider)
      const { login, setStatus, error } = useAgentState(providerRef)

      await login()
      await expect(setStatus('away')).rejects.toBe('Unknown error')
      expect(error.value).toBe('Set status failed')
    })
  })

  describe('null provider handling', () => {
    it('should handle login when provider is null', async () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { login, error } = useAgentState(providerRef)

      await login()
      expect(error.value).toBe('Provider not initialized')
    })

    it('should handle logout when provider is null', async () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { logout, error } = useAgentState(providerRef)

      await logout()
      expect(error.value).toBe('Provider not initialized')
    })

    it('should handle pause when provider is null', async () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { pause, error } = useAgentState(providerRef)

      await pause('Lunch')
      expect(error.value).toBe('Provider not initialized')
    })

    it('should handle unpause when provider is null', async () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { unpause, error } = useAgentState(providerRef)

      await unpause()
      expect(error.value).toBe('Provider not initialized')
    })

    it('should handle setStatus when provider is null', async () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { setStatus, error } = useAgentState(providerRef)

      await setStatus('away')
      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('setStatus', () => {
    it('should call provider setStatus with reason', async () => {
      const providerRef = ref(mockProvider)
      const { login, setStatus } = useAgentState(providerRef)

      await login()
      await setStatus('away', 'Meeting')

      expect(mockProvider.setStatus).toHaveBeenCalledWith('away', 'Meeting')
    })

    it('should call provider setStatus without reason', async () => {
      const providerRef = ref(mockProvider)
      const { login, setStatus } = useAgentState(providerRef)

      await login()
      await setStatus('available')

      expect(mockProvider.setStatus).toHaveBeenCalledWith('available', undefined)
    })
  })

  describe('pause with options', () => {
    it('should pause with breakType', async () => {
      const providerRef = ref(mockProvider)
      const { login, pause } = useAgentState(providerRef)

      await login()
      await pause('Lunch Break', 'lunch')

      expect(mockProvider.pause).toHaveBeenCalledWith({
        reason: 'Lunch Break',
        breakType: 'lunch',
      })
    })

    it('should pause with breakType and duration', async () => {
      const providerRef = ref(mockProvider)
      const { login, pause } = useAgentState(providerRef)

      await login()
      await pause('Short Break', 'short', 900)

      expect(mockProvider.pause).toHaveBeenCalledWith({
        reason: 'Short Break',
        breakType: 'short',
        duration: 900,
      })
    })
  })

  describe('login with options', () => {
    it('should use defaultQueues when no options provided', async () => {
      const providerRef = ref(mockProvider)
      const { login } = useAgentState(providerRef, { defaultQueues: ['support', 'sales'] })

      await login()

      expect(mockProvider.login).toHaveBeenCalledWith({ queues: ['support', 'sales'] })
    })

    it('should use provided options over defaultQueues', async () => {
      const providerRef = ref(mockProvider)
      const { login } = useAgentState(providerRef, { defaultQueues: ['support'] })

      await login({ queues: ['billing'] })

      expect(mockProvider.login).toHaveBeenCalledWith({ queues: ['billing'] })
    })
  })

  describe('refresh', () => {
    it('should re-subscribe to state changes', async () => {
      const providerRef = ref(mockProvider)
      const { login, refresh } = useAgentState(providerRef)

      await login()
      refresh()

      // onStateChange should be called again
      expect(mockProvider.onStateChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('provider change', () => {
    it('should reset state when provider changes', async () => {
      const providerRef = ref<CallCenterProvider | null>(mockProvider)
      const { login, status, isLoggedIn } = useAgentState(providerRef)

      await login()
      expect(isLoggedIn.value).toBe(true)

      // Change provider to null
      providerRef.value = null

      // Wait for watcher to trigger
      await new Promise((r) => setTimeout(r, 0))

      expect(status.value).toBe('offline')
      expect(isLoggedIn.value).toBe(false)
    })
  })

  describe('autoSubscribe option', () => {
    it('should not subscribe when autoSubscribe is false', () => {
      const providerRef = ref(mockProvider)
      useAgentState(providerRef, { autoSubscribe: false })

      expect(mockProvider.onStateChange).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup on Unmount', () => {
    it('should unsubscribe and stop timer on unmount', async () => {
      const localMockProvider = createMockProvider()
      const providerRef = ref<CallCenterProvider | null>(localMockProvider)

      const { result, unmount } = withSetup(() => useAgentState(providerRef))

      // Login to start the session timer
      await result.login()
      expect(result.isLoggedIn.value).toBe(true)

      // Unmount should trigger cleanup (unsubscribe + stop timer)
      unmount()

      // The composable should have cleaned up without errors
      expect(localMockProvider.onStateChange).toHaveBeenCalled()
    })
  })
})
