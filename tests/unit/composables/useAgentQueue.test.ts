// tests/unit/composables/useAgentQueue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAgentQueue } from '@/composables/useAgentQueue'
import type { CallCenterProvider, AgentState, QueueInfo } from '@/providers/call-center/types'
import { withSetup } from '../../utils/test-helpers'

const mockQueues: QueueInfo[] = [
  {
    name: 'support',
    displayName: 'Support',
    isMember: true,
    isPaused: false,
    penalty: 0,
    callsHandled: 5,
    lastCallTime: null,
  },
  {
    name: 'sales',
    displayName: 'Sales',
    isMember: true,
    isPaused: true,
    penalty: 5,
    callsHandled: 3,
    lastCallTime: new Date(),
  },
]

const mockState: AgentState = {
  agentId: 'agent-001',
  displayName: 'Test Agent',
  status: 'available',
  extension: 'PJSIP/1001',
  queues: mockQueues,
  currentCall: null,
  loginTime: new Date(),
  isPaused: false,
  pauseReason: undefined,
  breakType: undefined,
}

function createMockProvider(): CallCenterProvider {
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
    logout: vi.fn(),
    setStatus: vi.fn(),
    joinQueue: vi.fn().mockResolvedValue(undefined),
    leaveQueue: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    unpause: vi.fn().mockResolvedValue(undefined),
    getMetrics: vi.fn(),
    onStateChange: vi.fn((cb) => {
      // Immediately call with mock state
      setTimeout(() => cb(mockState, mockState), 0)
      return () => {}
    }),
    onQueueEvent: vi.fn(() => () => {}),
  }
}

describe('useAgentQueue', () => {
  let mockProvider: CallCenterProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
  })

  describe('queue list', () => {
    it('should list all queues', async () => {
      const providerRef = ref(mockProvider)
      const { queues, totalQueues } = useAgentQueue(providerRef)

      // Wait for state subscription
      await new Promise((r) => setTimeout(r, 10))

      expect(totalQueues.value).toBe(2)
      expect(queues.value).toHaveLength(2)
    })

    it('should filter active queues', async () => {
      const providerRef = ref(mockProvider)
      const { activeQueues } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      // Active = member and not paused
      expect(activeQueues.value).toHaveLength(1)
      expect(activeQueues.value[0].name).toBe('support')
    })

    it('should filter paused queues', async () => {
      const providerRef = ref(mockProvider)
      const { pausedQueues } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      expect(pausedQueues.value).toHaveLength(1)
      expect(pausedQueues.value[0].name).toBe('sales')
    })
  })

  describe('queue operations', () => {
    it('should join queue', async () => {
      const providerRef = ref(mockProvider)
      const { joinQueue } = useAgentQueue(providerRef)

      await joinQueue('billing')

      expect(mockProvider.joinQueue).toHaveBeenCalledWith('billing', undefined)
    })

    it('should leave queue', async () => {
      const providerRef = ref(mockProvider)
      const { leaveQueue } = useAgentQueue(providerRef)

      await leaveQueue('support')

      expect(mockProvider.leaveQueue).toHaveBeenCalledWith('support')
    })

    it('should pause in specific queue', async () => {
      const providerRef = ref(mockProvider)
      const { pauseInQueue } = useAgentQueue(providerRef)

      await pauseInQueue('support', 'Break')

      expect(mockProvider.pause).toHaveBeenCalledWith({ queues: ['support'], reason: 'Break' })
    })

    it('should unpause in specific queue', async () => {
      const providerRef = ref(mockProvider)
      const { unpauseInQueue } = useAgentQueue(providerRef)

      await unpauseInQueue('sales')

      expect(mockProvider.unpause).toHaveBeenCalledWith(['sales'])
    })
  })

  describe('queue helpers', () => {
    it('should check if member of queue', async () => {
      const providerRef = ref(mockProvider)
      const { isMemberOf } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      expect(isMemberOf('support')).toBe(true)
      expect(isMemberOf('billing')).toBe(false)
    })

    it('should check if paused in queue', async () => {
      const providerRef = ref(mockProvider)
      const { isPausedIn } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      expect(isPausedIn('sales')).toBe(true)
      expect(isPausedIn('support')).toBe(false)
    })

    it('should get queue by name', async () => {
      const providerRef = ref(mockProvider)
      const { getQueue } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      const queue = getQueue('sales')
      expect(queue?.isPaused).toBe(true)
      expect(queue?.penalty).toBe(5)
    })

    it('should calculate total calls handled', async () => {
      const providerRef = ref(mockProvider)
      const { totalCallsHandled } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      // 5 from support + 3 from sales = 8
      expect(totalCallsHandled.value).toBe(8)
    })
  })

  describe('queue events', () => {
    it('should subscribe to queue events', async () => {
      const providerRef = ref(mockProvider)
      const { onQueueEvent } = useAgentQueue(providerRef)

      const callback = vi.fn()
      const unsubscribe = onQueueEvent(callback)

      expect(mockProvider.onQueueEvent).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return noop when provider is null', () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { onQueueEvent } = useAgentQueue(providerRef)

      const callback = vi.fn()
      const unsubscribe = onQueueEvent(callback)

      expect(typeof unsubscribe).toBe('function')
      // Should not throw when called
      unsubscribe()
    })
  })

  describe('error handling', () => {
    it('should handle join queue error', async () => {
      mockProvider.joinQueue = vi.fn().mockRejectedValue(new Error('Join failed'))
      const providerRef = ref(mockProvider)
      const { joinQueue, error } = useAgentQueue(providerRef)

      await expect(joinQueue('billing')).rejects.toThrow('Join failed')
      expect(error.value).toBe('Join failed')
    })

    it('should handle leave queue error', async () => {
      mockProvider.leaveQueue = vi.fn().mockRejectedValue(new Error('Leave failed'))
      const providerRef = ref(mockProvider)
      const { leaveQueue, error } = useAgentQueue(providerRef)

      await expect(leaveQueue('support')).rejects.toThrow('Leave failed')
      expect(error.value).toBe('Leave failed')
    })

    it('should handle pause in queue error', async () => {
      mockProvider.pause = vi.fn().mockRejectedValue(new Error('Pause failed'))
      const providerRef = ref(mockProvider)
      const { pauseInQueue, error } = useAgentQueue(providerRef)

      await expect(pauseInQueue('support', 'Break')).rejects.toThrow('Pause failed')
      expect(error.value).toBe('Pause failed')
    })

    it('should handle unpause in queue error', async () => {
      mockProvider.unpause = vi.fn().mockRejectedValue(new Error('Unpause failed'))
      const providerRef = ref(mockProvider)
      const { unpauseInQueue, error } = useAgentQueue(providerRef)

      await expect(unpauseInQueue('sales')).rejects.toThrow('Unpause failed')
      expect(error.value).toBe('Unpause failed')
    })

    it('should handle non-Error exception in join queue', async () => {
      mockProvider.joinQueue = vi.fn().mockRejectedValue('Unknown error')
      const providerRef = ref(mockProvider)
      const { joinQueue, error } = useAgentQueue(providerRef)

      await expect(joinQueue('billing')).rejects.toBe('Unknown error')
      expect(error.value).toBe('Join queue failed')
    })
  })

  describe('null provider handling', () => {
    it('should handle operations when provider is null', async () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { joinQueue, leaveQueue, pauseInQueue, unpauseInQueue } = useAgentQueue(providerRef)

      await expect(joinQueue('billing')).resolves.not.toThrow()
      await expect(leaveQueue('support')).resolves.not.toThrow()
      await expect(pauseInQueue('support', 'Break')).resolves.not.toThrow()
      await expect(unpauseInQueue('sales')).resolves.not.toThrow()
    })

    it('should have empty queues when provider is null', () => {
      const providerRef = ref<CallCenterProvider | null>(null)
      const { queues, totalQueues, activeQueues, pausedQueues } = useAgentQueue(providerRef)

      expect(queues.value).toEqual([])
      expect(totalQueues.value).toBe(0)
      expect(activeQueues.value).toEqual([])
      expect(pausedQueues.value).toEqual([])
    })
  })

  describe('provider change handling', () => {
    it('should reset state when provider changes to different provider', async () => {
      const provider1 = createMockProvider()
      const provider2 = createMockProvider()
      const providerRef = ref<CallCenterProvider | null>(provider1)

      const { queues } = useAgentQueue(providerRef)

      // Wait for initial state subscription
      await new Promise((r) => setTimeout(r, 10))
      expect(queues.value).toHaveLength(2)

      // Change to a different provider
      providerRef.value = provider2

      // Wait for watcher to trigger and resubscribe
      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      // Should still have queues from new provider
      expect(queues.value).toHaveLength(2)
    })

    it('should clear state when provider changes to null', async () => {
      const provider = createMockProvider()
      const providerRef = ref<CallCenterProvider | null>(provider)

      const { queues } = useAgentQueue(providerRef)

      // Wait for initial state subscription
      await new Promise((r) => setTimeout(r, 10))
      expect(queues.value).toHaveLength(2)

      // Change to null
      providerRef.value = null

      // Wait for watcher to trigger
      await nextTick()

      // Should have empty queues
      expect(queues.value).toEqual([])
    })
  })

  describe('Cleanup on Unmount', () => {
    it('should unsubscribe from state on unmount', async () => {
      const localMockProvider = createMockProvider()
      const providerRef = ref<CallCenterProvider | null>(localMockProvider)

      const { result, unmount } = withSetup(() => useAgentQueue(providerRef))

      // Wait for initial state subscription
      await new Promise((r) => setTimeout(r, 10))
      expect(result.queues.value).toHaveLength(2)

      // Unmount should trigger cleanup
      unmount()

      // The composable should have cleaned up without errors
      expect(localMockProvider.onStateChange).toHaveBeenCalled()
    })
  })
})
