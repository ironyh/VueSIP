import type { AgentStatus } from '../../../../../src/providers/call-center/types'
import type { CallbackRequest } from '../../../../../src/types/callback.types'
import type {
  AgentWorkspaceState,
  CallbackTaskView,
  CustomerContextView,
  DemoContactProfile,
} from './mvp-types'

export function mapAgentStatusToWorkspaceState(
  status: AgentStatus | 'connecting' | 'reconnecting',
  inWrapUp: boolean,
  needsAttention: boolean
): AgentWorkspaceState {
  if (needsAttention) {
    return 'attention'
  }

  if (inWrapUp) {
    return 'wrap-up'
  }

  switch (status) {
    case 'connecting':
      return 'connecting'
    case 'reconnecting':
      return 'reconnecting'
    case 'available':
      return 'available'
    case 'busy':
      return 'busy'
    case 'offline':
      return 'offline'
    case 'wrap-up':
      return 'wrap-up'
    default:
      return 'paused'
  }
}

export function mapCallbackToTaskView(callback: CallbackRequest): CallbackTaskView {
  return {
    id: callback.id,
    assignee: callback.targetAgent ?? 'unassigned',
    queue: callback.targetQueue ?? 'support',
    targetUri: callback.callerNumber,
    contactName: callback.callerName,
    status:
      callback.status === 'pending'
        ? 'open'
        : callback.status === 'scheduled'
          ? 'rescheduled'
          : callback.status === 'in_progress'
            ? 'in-progress'
            : callback.status === 'completed'
              ? 'completed'
              : 'failed',
    reason: callback.reason ?? 'Callback follow-up',
    dueAt: callback.scheduledAt ?? callback.requestedAt,
  }
}

export function buildCustomerContextView(input: {
  remoteUri: string
  remoteDisplayName?: string | null
  queue: string | null
  latestDisposition: string | null
  noteSummary: string | null
  hasOpenCallback: boolean
  profile?: DemoContactProfile | null
}): CustomerContextView {
  return {
    displayName: input.remoteDisplayName || input.remoteUri,
    address: input.remoteUri,
    queue: input.queue,
    latestDisposition: input.latestDisposition,
    noteSummary: input.noteSummary,
    hasOpenCallback: input.hasOpenCallback,
    accountTier: input.profile?.accountTier ?? null,
    accountHealth: input.profile?.accountHealth ?? null,
    serviceLevel: input.profile?.serviceLevel ?? null,
    openCaseTitle: input.profile?.openCaseTitle ?? null,
    callbackReason: input.profile?.callbackReason ?? null,
    lastInteractionAt: input.profile?.lastInteractionAt ?? null,
  }
}
