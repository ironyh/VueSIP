// tests/unit/composables/useAgentState.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAgentState } from '@/composables/useAgentState'
import type { CallCenterProvider, AgentState } from '@/providers/call-center/types'

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
  })
})
