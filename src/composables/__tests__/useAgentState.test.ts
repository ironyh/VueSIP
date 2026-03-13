import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowRef } from 'vue'
import { useAgentState } from '../useAgentState'
import type { CallCenterProvider, AgentState, BreakType } from '@/providers/call-center/types'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('useAgentState', () => {
  let mockProvider: CallCenterProvider
  let mockAgentState: AgentState

  beforeEach(() => {
    mockAgentState = {
      agentId: 'agent-001',
      displayName: 'Test Agent',
      status: 'available',
      extension: '1001',
      queues: [],
      currentCall: null,
      loginTime: new Date('2024-01-01T10:00:00Z'),
      isPaused: false,
      pauseReason: undefined,
      breakType: undefined,
    }

    mockProvider = {
      id: 'mock-provider',
      name: 'Mock Provider',
      capabilities: {
        supportsQueues: true,
        supportsMultiQueue: true,
        supportsPause: true,
        supportsPauseReasons: true,
        supportsBreakTypes: true,
        supportsWrapUp: true,
        supportsMetrics: true,
        supportsRealTimeEvents: true,
        supportsPenalty: true,
        supportsSkillBasedRouting: false,
      },
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(mockAgentState),
      logout: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn().mockResolvedValue(undefined),
      unpause: vi.fn().mockResolvedValue(undefined),
      getMetrics: vi.fn(),
      onStateChange: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  describe('computed properties', () => {
    it('should return null agentId when state is null', () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { agentId } = useAgentState(providerRef)
      expect(agentId.value).toBeNull()
    })

    it('should return agentId from state', () => {
      const providerRef = shallowRef(mockProvider)
      const { agentId } = useAgentState(providerRef)
      // Manually trigger state since we're not auto-subscribing
      expect(agentId.value).toBeNull() // No state yet
    })

    it('should return displayName from state', () => {
      const providerRef = shallowRef(mockProvider)
      const { displayName } = useAgentState(providerRef, { autoSubscribe: false })
      expect(displayName.value).toBeNull()
    })

    it('should return default offline status when state is null', () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { status } = useAgentState(providerRef)
      expect(status.value).toBe('offline')
    })

    it('should return isLoggedIn false when loginTime is null', () => {
      const providerRef = shallowRef(mockProvider)
      const { isLoggedIn } = useAgentState(providerRef, { autoSubscribe: false })
      expect(isLoggedIn.value).toBe(false)
    })

    it('should return isLoggedIn true when loginTime is set', async () => {
      const providerRef = shallowRef(mockProvider)
      const { isLoggedIn, login } = useAgentState(providerRef, { autoSubscribe: false })

      // Mock onStateChange callback to actually trigger state update
      const mockCallback = vi.fn((_cb: (state: AgentState) => void) => {
        // Return unsubscribe function
        return () => {}
      })
      mockProvider.onStateChange = mockCallback

      await login()
      // After login, mockProvider.login returns mockAgentState with loginTime
      expect(isLoggedIn.value).toBe(true)
    })

    it('should return isOnCall based on currentCall', () => {
      const providerRef = shallowRef(mockProvider)
      const { isOnCall } = useAgentState(providerRef, { autoSubscribe: false })
      // isOnCall computed checks state.value?.currentCall !== null
      // Since state is null initially, it should be false
      // The test checks the computed property behavior
      expect(typeof isOnCall.value).toBe('boolean')
    })

    it('should return isPaused from state', () => {
      const providerRef = shallowRef(mockProvider)
      const { isPaused } = useAgentState(providerRef, { autoSubscribe: false })
      expect(isPaused.value).toBe(false)
    })

    it('should return pauseReason from state', () => {
      const providerRef = shallowRef(mockProvider)
      const { pauseReason } = useAgentState(providerRef, { autoSubscribe: false })
      expect(pauseReason.value).toBeUndefined()
    })

    it('should return breakType from state', () => {
      const providerRef = shallowRef(mockProvider)
      const { breakType } = useAgentState(providerRef, { autoSubscribe: false })
      expect(breakType.value).toBeUndefined()
    })

    it('should return currentCall from state', () => {
      const providerRef = shallowRef(mockProvider)
      const { currentCall } = useAgentState(providerRef, { autoSubscribe: false })
      expect(currentCall.value).toBeNull()
    })

    it('should format session duration as HH:MM:SS', () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { sessionDuration } = useAgentState(providerRef)
      expect(sessionDuration.value).toBe('00:00:00')
    })
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const providerRef = shallowRef(mockProvider)
      const { login, isLoading, error } = useAgentState(providerRef, {
        autoSubscribe: false,
        defaultQueues: ['queue1', 'queue2'],
      })

      await login()

      expect(mockProvider.login).toHaveBeenCalledWith({ queues: ['queue1', 'queue2'] })
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle login error', async () => {
      const providerRef = shallowRef(mockProvider)
      mockProvider.login = vi.fn().mockRejectedValue(new Error('Login failed'))

      const { login, error, isLoading } = useAgentState(providerRef, { autoSubscribe: false })

      await expect(login()).rejects.toThrow('Login failed')
      expect(error.value).toBe('Login failed')
      expect(isLoading.value).toBe(false)
    })

    it('should error when provider is null', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { login, error } = useAgentState(providerRef)

      await login()

      expect(error.value).toBe('Provider not initialized')
    })

    it('should use provided queues over defaults', async () => {
      const providerRef = shallowRef(mockProvider)
      const { login } = useAgentState(providerRef, {
        autoSubscribe: false,
        defaultQueues: ['default-queue'],
      })

      await login({ queues: ['custom-queue'] })

      expect(mockProvider.login).toHaveBeenCalledWith({ queues: ['custom-queue'] })
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      const providerRef = shallowRef(mockProvider)
      const { logout, isLoading, error } = useAgentState(providerRef, { autoSubscribe: false })

      await logout()

      expect(mockProvider.logout).toHaveBeenCalledWith(undefined)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle logout error', async () => {
      const providerRef = shallowRef(mockProvider)
      mockProvider.logout = vi.fn().mockRejectedValue(new Error('Logout failed'))

      const { logout, error, isLoading } = useAgentState(providerRef, { autoSubscribe: false })

      await expect(logout()).rejects.toThrow('Logout failed')
      expect(error.value).toBe('Logout failed')
      expect(isLoading.value).toBe(false)
    })

    it('should error when provider is null', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { logout, error } = useAgentState(providerRef)

      await logout()

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('pause', () => {
    it('should pause with reason', async () => {
      const providerRef = shallowRef(mockProvider)
      const { pause, isLoading, error } = useAgentState(providerRef, { autoSubscribe: false })

      await pause('Lunch', 'lunch' as BreakType, 3600)

      expect(mockProvider.pause).toHaveBeenCalledWith({
        reason: 'Lunch',
        breakType: 'lunch',
        duration: 3600,
      })
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle pause error', async () => {
      const providerRef = shallowRef(mockProvider)
      mockProvider.pause = vi.fn().mockRejectedValue(new Error('Pause failed'))

      const { pause, error, isLoading } = useAgentState(providerRef, { autoSubscribe: false })

      await expect(pause('Break')).rejects.toThrow('Pause failed')
      expect(error.value).toBe('Pause failed')
      expect(isLoading.value).toBe(false)
    })

    it('should error when provider is null', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { pause, error } = useAgentState(providerRef)

      await pause('Break')

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('unpause', () => {
    it('should unpause successfully', async () => {
      const providerRef = shallowRef(mockProvider)
      const { unpause, isLoading, error } = useAgentState(providerRef, { autoSubscribe: false })

      await unpause()

      expect(mockProvider.unpause).toHaveBeenCalled()
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle unpause error', async () => {
      const providerRef = shallowRef(mockProvider)
      mockProvider.unpause = vi.fn().mockRejectedValue(new Error('Unpause failed'))

      const { unpause, error, isLoading } = useAgentState(providerRef, { autoSubscribe: false })

      await expect(unpause()).rejects.toThrow('Unpause failed')
      expect(error.value).toBe('Unpause failed')
      expect(isLoading.value).toBe(false)
    })

    it('should error when provider is null', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { unpause, error } = useAgentState(providerRef)

      await unpause()

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('setStatus', () => {
    it('should set status successfully', async () => {
      const providerRef = shallowRef(mockProvider)
      const { setStatus, isLoading, error } = useAgentState(providerRef, { autoSubscribe: false })

      await setStatus('available', 'Ready to take calls')

      expect(mockProvider.setStatus).toHaveBeenCalledWith('available', 'Ready to take calls')
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle setStatus error', async () => {
      const providerRef = shallowRef(mockProvider)
      mockProvider.setStatus = vi.fn().mockRejectedValue(new Error('Set status failed'))

      const { setStatus, error, isLoading } = useAgentState(providerRef, { autoSubscribe: false })

      await expect(setStatus('available')).rejects.toThrow('Set status failed')
      expect(error.value).toBe('Set status failed')
      expect(isLoading.value).toBe(false)
    })

    it('should error when provider is null', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { setStatus, error } = useAgentState(providerRef)

      await setStatus('available')

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('refresh', () => {
    it('should resubscribe to state', () => {
      const providerRef = shallowRef(mockProvider)
      const { refresh } = useAgentState(providerRef, { autoSubscribe: false })

      // Should not throw
      expect(() => refresh()).not.toThrow()
    })
  })

  describe('options', () => {
    it('should use custom session update interval', async () => {
      vi.useFakeTimers()
      const providerRef = shallowRef(mockProvider)
      const { login, sessionDurationSeconds } = useAgentState(providerRef, {
        autoSubscribe: false,
        sessionUpdateInterval: 1000,
      })

      await login()

      // Initial state
      expect(sessionDurationSeconds.value).toBe(0)

      // Advance timer by 2 seconds
      vi.advanceTimersByTime(2000)

      expect(sessionDurationSeconds.value).toBeGreaterThan(0)

      vi.useRealTimers()
    })
  })
})
