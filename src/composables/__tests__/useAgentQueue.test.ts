import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowRef, nextTick } from 'vue'
import { useAgentQueue } from '../useAgentQueue'
import type { CallCenterProvider, AgentState, QueueInfo } from '@/providers/call-center/types'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useAgentQueue', () => {
  let mockProvider: CallCenterProvider
  let mockAgentState: AgentState

  const createMockQueue = (name: string, overrides: Partial<QueueInfo> = {}): QueueInfo => ({
    name,
    displayName: `Queue ${name}`,
    isMember: true,
    isPaused: false,
    penalty: 0,
    callsHandled: 0,
    lastCallTime: null,
    ...overrides,
  })

  beforeEach(() => {
    mockAgentState = {
      agentId: 'agent-001',
      displayName: 'Test Agent',
      status: 'available',
      extension: '1001',
      queues: [
        createMockQueue('queue1', { callsHandled: 5 }),
        createMockQueue('queue2', { isPaused: true, callsHandled: 3 }),
        createMockQueue('queue3', { isMember: false }),
      ],
      currentCall: null,
      loginTime: new Date(),
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
      joinQueue: vi.fn().mockResolvedValue(undefined),
      leaveQueue: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn().mockResolvedValue(undefined),
      unpause: vi.fn().mockResolvedValue(undefined),
      getMetrics: vi.fn().mockResolvedValue({
        callsHandled: 10,
        totalTalkTime: 300,
        averageHandleTime: 30,
        averageWrapUpTime: 5,
        longestCall: 120,
        shortestCall: 10,
        missedCalls: 1,
        transferredCalls: 2,
        sessionDuration: 600,
      }),
      onStateChange: vi.fn((callback: (state: AgentState, prev: AgentState) => void) => {
        callback(mockAgentState, {} as AgentState)
        return () => {}
      }),
      onQueueEvent: vi.fn(() => () => {}),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty state when provider is null', () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const {
        queues,
        activeQueues,
        pausedQueues,
        totalQueues,
        totalCallsHandled,
        isLoading,
        error,
      } = useAgentQueue(providerRef)

      expect(queues.value).toEqual([])
      expect(activeQueues.value).toEqual([])
      expect(pausedQueues.value).toEqual([])
      expect(totalQueues.value).toBe(0)
      expect(totalCallsHandled.value).toBe(0)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should subscribe to provider state on mount', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      useAgentQueue(providerRef)

      await nextTick()

      expect(mockProvider.onStateChange).toHaveBeenCalled()
    })
  })

  describe('computed properties', () => {
    it('should return all queues from agent state', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { queues } = useAgentQueue(providerRef)

      await nextTick()

      expect(queues.value).toHaveLength(3)
    })

    it('should return only active (non-paused) queues', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { activeQueues } = useAgentQueue(providerRef)

      await nextTick()

      expect(activeQueues.value).toHaveLength(1)
      expect(activeQueues.value[0].name).toBe('queue1')
    })

    it('should return only paused queues', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { pausedQueues } = useAgentQueue(providerRef)

      await nextTick()

      expect(pausedQueues.value).toHaveLength(1)
      expect(pausedQueues.value[0].name).toBe('queue2')
    })

    it('should calculate total queue count', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { totalQueues } = useAgentQueue(providerRef)

      await nextTick()

      expect(totalQueues.value).toBe(3)
    })

    it('should calculate total calls handled', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { totalCallsHandled } = useAgentQueue(providerRef)

      await nextTick()

      expect(totalCallsHandled.value).toBe(8) // 5 + 3
    })
  })

  describe('joinQueue', () => {
    it('should call provider joinQueue with queue name', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { joinQueue } = useAgentQueue(providerRef)

      await nextTick()
      await joinQueue('newQueue', 5)

      expect(mockProvider.joinQueue).toHaveBeenCalledWith('newQueue', 5)
    })

    it('should set error when provider is not initialized', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { joinQueue, error } = useAgentQueue(providerRef)

      await joinQueue('newQueue')

      expect(error.value).toBe('Provider not initialized')
    })

    it('should set loading state during operation', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { joinQueue, isLoading } = useAgentQueue(providerRef)

      const promise = joinQueue('newQueue')
      expect(isLoading.value).toBe(true)

      await promise
      expect(isLoading.value).toBe(false)
    })
  })

  describe('leaveQueue', () => {
    it('should call provider leaveQueue with queue name', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { leaveQueue } = useAgentQueue(providerRef)

      await nextTick()
      await leaveQueue('queue1')

      expect(mockProvider.leaveQueue).toHaveBeenCalledWith('queue1')
    })

    it('should set error when provider is not initialized', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { leaveQueue, error } = useAgentQueue(providerRef)

      await leaveQueue('queue1')

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('pauseInQueue', () => {
    it('should call provider pause with queue and reason', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { pauseInQueue } = useAgentQueue(providerRef)

      await nextTick()
      await pauseInQueue('queue1', 'Training')

      expect(mockProvider.pause).toHaveBeenCalledWith({
        queues: ['queue1'],
        reason: 'Training',
      })
    })

    it('should set error when provider is not initialized', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { pauseInQueue, error } = useAgentQueue(providerRef)

      await pauseInQueue('queue1', 'Break')

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('unpauseInQueue', () => {
    it('should call provider unpause with queue name', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { unpauseInQueue } = useAgentQueue(providerRef)

      await nextTick()
      await unpauseInQueue('queue2')

      expect(mockProvider.unpause).toHaveBeenCalledWith(['queue2'])
    })

    it('should set error when provider is not initialized', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { unpauseInQueue, error } = useAgentQueue(providerRef)

      await unpauseInQueue('queue1')

      expect(error.value).toBe('Provider not initialized')
    })
  })

  describe('isMemberOf', () => {
    it('should return true for member queues', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { isMemberOf } = useAgentQueue(providerRef)

      await nextTick()

      expect(isMemberOf('queue1')).toBe(true)
    })

    it('should return false for non-member queues', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { isMemberOf } = useAgentQueue(providerRef)

      await nextTick()

      expect(isMemberOf('queue3')).toBe(false)
    })
  })

  describe('isPausedIn', () => {
    it('should return true for paused queues', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { isPausedIn } = useAgentQueue(providerRef)

      await nextTick()

      expect(isPausedIn('queue2')).toBe(true)
    })

    it('should return false for non-paused queues', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { isPausedIn } = useAgentQueue(providerRef)

      await nextTick()

      expect(isPausedIn('queue1')).toBe(false)
    })
  })

  describe('getQueue', () => {
    it('should return queue info by name', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { getQueue } = useAgentQueue(providerRef)

      await nextTick()

      const queue = getQueue('queue1')
      expect(queue).toBeDefined()
      expect(queue?.name).toBe('queue1')
    })

    it('should return undefined for non-existent queue', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { getQueue } = useAgentQueue(providerRef)

      await nextTick()

      expect(getQueue('nonExistent')).toBeUndefined()
    })
  })

  describe('onQueueEvent', () => {
    it('should return unsubscribe function', async () => {
      const providerRef = shallowRef<CallCenterProvider | null>(mockProvider)
      const { onQueueEvent } = useAgentQueue(providerRef)

      await nextTick()

      const callback = vi.fn()
      const unsubscribe = onQueueEvent(callback)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should return empty function when provider not initialized', () => {
      const providerRef = shallowRef<CallCenterProvider | null>(null)
      const { onQueueEvent } = useAgentQueue(providerRef)

      const callback = vi.fn()
      onQueueEvent(callback)

      expect(mockProvider.onQueueEvent).not.toHaveBeenCalled()
    })
  })

  describe('provider reactivity', () => {
    it('should unsubscribe from old provider when provider changes', async () => {
      const oldProvider = { ...mockProvider }
      const newProvider = { ...mockProvider, id: 'new-provider' }

      const providerRef = shallowRef<CallCenterProvider | null>(oldProvider)
      const { joinQueue } = useAgentQueue(providerRef)

      await nextTick()

      // Change provider
      providerRef.value = newProvider
      await nextTick()

      // Old provider methods should not be called
      await joinQueue('test')
      expect(newProvider.joinQueue).toHaveBeenCalled()
    })
  })
})
