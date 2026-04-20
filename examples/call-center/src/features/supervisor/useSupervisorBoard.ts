import { computed, ref, type Ref } from 'vue'
import type { AgentWorkspaceState, CallbackTaskView, QueuedCallView } from '../shared/mvp-types'

type AgentPresence = 'available' | 'busy' | 'away'

export interface SupervisorQueueRow {
  queue: string
  waitingCalls: number
  longestWaitSeconds: number
}

export interface SupervisorAgentRow {
  agentId: string
  status: AgentPresence
  workspaceState: AgentWorkspaceState
  activeCallId: string | null
}

export interface SupervisorAlertRow {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export function useSupervisorBoard(input: {
  queueCalls: Ref<QueuedCallView[]>
  callbacks: Ref<CallbackTaskView[]>
  agentStatus: Ref<AgentPresence>
  workspaceState: Ref<AgentWorkspaceState>
  activeCallId: Ref<string | null>
}) {
  const reassignmentTarget = ref('queue-shared')

  const queueRows = computed<SupervisorQueueRow[]>(() => {
    const grouped = new Map<string, SupervisorQueueRow>()

    for (const call of input.queueCalls.value) {
      const existing = grouped.get(call.queue) ?? {
        queue: call.queue,
        waitingCalls: 0,
        longestWaitSeconds: 0,
      }

      existing.waitingCalls += 1
      existing.longestWaitSeconds = Math.max(existing.longestWaitSeconds, call.waitTime)
      grouped.set(call.queue, existing)
    }

    return [...grouped.values()].sort((left, right) => right.waitingCalls - left.waitingCalls)
  })

  const agentRows = computed<SupervisorAgentRow[]>(() => [
    {
      agentId: 'current-agent',
      status: input.agentStatus.value,
      workspaceState: input.workspaceState.value,
      activeCallId: input.activeCallId.value,
    },
  ])

  const alertRows = computed<SupervisorAlertRow[]>(() => {
    const alerts: SupervisorAlertRow[] = []

    for (const queue of queueRows.value) {
      if (queue.longestWaitSeconds >= 60) {
        alerts.push({
          id: `queue-wait-${queue.queue}`,
          severity: 'warning',
          message: `${queue.queue} queue has callers waiting over ${queue.longestWaitSeconds}s`,
        })
      }
    }

    const overdueCallbacks = input.callbacks.value.filter(
      (callback) => callback.status !== 'completed' && callback.dueAt.getTime() < Date.now()
    )
    if (overdueCallbacks.length > 0) {
      alerts.push({
        id: 'callbacks-overdue',
        severity: 'warning',
        message: `${overdueCallbacks.length} callback task(s) are overdue`,
      })
    }

    if (input.workspaceState.value === 'attention') {
      alerts.push({
        id: 'agent-attention',
        severity: 'critical',
        message: 'Agent workspace needs attention after a missed or failed queue action',
      })
    }

    return alerts
  })

  const callbackRows = computed(() =>
    input.callbacks.value.filter((callback) => callback.status !== 'completed')
  )

  const actions = computed(() => ['acknowledge-alert', 'reassign-callback'])

  function reassignCallback(callbackId: string, assignee: string) {
    const callback = input.callbacks.value.find((entry) => entry.id === callbackId)
    if (!callback) {
      return
    }

    callback.assignee = assignee
  }

  return {
    queueRows,
    agentRows,
    alertRows,
    callbackRows,
    actions,
    reassignmentTarget,
    reassignCallback,
  }
}
