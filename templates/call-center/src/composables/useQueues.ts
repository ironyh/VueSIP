/**
 * Queues Composable - Queue monitoring for call center
 *
 * This composable provides a simplified interface for queue statistics.
 * In production, connect to useAmiQueues for real-time AMI data.
 */
import { ref, shallowRef, computed, watch, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import type { AmiClient } from 'vuesip'

export interface QueueStats {
  name: string
  calls: number
  completed: number
  abandoned: number
  holdtime: number
  talktime: number
  servicelevel: number
  agents: QueueAgent[]
}

export interface QueueAgent {
  name: string
  interface: string
  status: 'available' | 'busy' | 'paused' | 'unavailable'
  callsTaken: number
  lastCall: number
}

export interface QueueCaller {
  position: number
  callerIdNum: string
  callerIdName: string
  wait: number
  queue: string
}

export interface UseQueuesReturn {
  // Initialization
  initialize: (client: ShallowRef<AmiClient | null>, queueNames: string[]) => void
  isInitialized: Ref<boolean>

  // Queue stats
  queues: Ref<Map<string, QueueStats>>
  getQueue: (name: string) => QueueStats | undefined

  // Aggregate stats
  totalCalls: ComputedRef<number>
  totalAgents: ComputedRef<number>
  availableAgents: ComputedRef<number>
  longestWait: ComputedRef<number>
  averageServiceLevel: ComputedRef<number>

  // Queue callers
  callers: Ref<QueueCaller[]>

  // Refresh
  refresh: () => Promise<void>
}

export function useQueues(): UseQueuesReturn {
  const isInitialized = ref(false)
  const queues = ref<Map<string, QueueStats>>(new Map())
  const callers = ref<QueueCaller[]>([])
  const subscribedQueues = ref<string[]>([])
  const amiClientRef = shallowRef<AmiClient | null>(null)

  function initialize(client: ShallowRef<AmiClient | null>, queueNames: string[]) {
    subscribedQueues.value = queueNames

    // Initialize queue stats for each queue with demo data
    queueNames.forEach((name) => {
      queues.value.set(name, {
        name,
        calls: 0,
        completed: 0,
        abandoned: 0,
        holdtime: 0,
        talktime: 0,
        servicelevel: 85,
        agents: [],
      })
    })

    // Watch for AMI client connection
    watch(
      client,
      (ami) => {
        if (ami) {
          amiClientRef.value = ami
          setupEventListeners()
          refresh()
        }
      },
      { immediate: true }
    )

    isInitialized.value = true
  }

  function setupEventListeners() {
    // In production: subscribe to AMI queue events
    // Example with useAmiQueues:
    // const amiQueues = useAmiQueues(amiClientRef)
    // Watch amiQueues.queues for real-time updates
  }

  async function refresh() {
    if (!amiClientRef.value) return

    // In production: use useAmiQueues.refresh() for real data
    // This is demo implementation showing the expected data structure

    try {
      for (const queueName of subscribedQueues.value) {
        const queue = queues.value.get(queueName)
        if (queue) {
          // In production, these would come from AMI
          // queue.calls = await getQueueCalls(queueName)
          // queue.agents = await getQueueMembers(queueName)
        }
      }
    } catch (err) {
      console.error('Failed to refresh queue stats:', err)
    }
  }

  function getQueue(name: string): QueueStats | undefined {
    return queues.value.get(name)
  }

  // Computed aggregate stats
  const totalCalls = computed(() => {
    let total = 0
    queues.value.forEach((q) => {
      total += q.calls
    })
    return total
  })

  const totalAgents = computed(() => {
    let total = 0
    queues.value.forEach((q) => {
      total += q.agents.length
    })
    return total
  })

  const availableAgents = computed(() => {
    let total = 0
    queues.value.forEach((q) => {
      total += q.agents.filter((a) => a.status === 'available').length
    })
    return total
  })

  const longestWait = computed(() => {
    if (callers.value.length === 0) return 0
    return Math.max(...callers.value.map((c) => c.wait))
  })

  const averageServiceLevel = computed(() => {
    if (queues.value.size === 0) return 0
    let total = 0
    queues.value.forEach((q) => {
      total += q.servicelevel
    })
    return Math.round(total / queues.value.size)
  })

  return {
    // Initialization
    initialize,
    isInitialized,

    // Queue stats
    queues,
    getQueue,

    // Aggregate stats
    totalCalls,
    totalAgents,
    availableAgents,
    longestWait,
    averageServiceLevel,

    // Queue callers
    callers,

    // Refresh
    refresh,
  }
}
