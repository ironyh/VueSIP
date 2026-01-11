// tests/unit/composables/useAgentQueue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAgentQueue } from '@/composables/useAgentQueue'
import type { CallCenterProvider, AgentState, QueueInfo } from '@/providers/call-center/types'

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

    it('should get queue by name', async () => {
      const providerRef = ref(mockProvider)
      const { getQueue } = useAgentQueue(providerRef)

      await new Promise((r) => setTimeout(r, 10))

      const queue = getQueue('sales')
      expect(queue?.isPaused).toBe(true)
      expect(queue?.penalty).toBe(5)
    })
  })
})
