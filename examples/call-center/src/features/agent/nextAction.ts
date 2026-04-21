import type { AgentWorkspaceState, CallbackTaskView, QueuedCallView } from '../shared/mvp-types'

export interface AgentNextActionView {
  title: string
  detail: string
  tone: 'neutral' | 'attention' | 'warning' | 'success'
}

interface AgentNextActionInput {
  agentStatus: 'available' | 'busy' | 'away'
  workspaceState: AgentWorkspaceState
  queue: QueuedCallView[]
  callbacks: CallbackTaskView[]
  selectedCallback: CallbackTaskView | null
  isActive: boolean
}

export function buildAgentNextAction(input: AgentNextActionInput): AgentNextActionView {
  if (input.workspaceState === 'wrap-up') {
    return {
      title: 'Complete wrap-up',
      detail: 'Choose a disposition and decide whether the interaction needs a callback.',
      tone: 'warning',
    }
  }

  if (input.isActive) {
    return {
      title: 'Finish the live conversation',
      detail: 'Capture notes live, then hang up into wrap-up when the caller is done.',
      tone: 'attention',
    }
  }

  const queuedCall = input.queue[0]
  if (queuedCall) {
    return {
      title: `Answer ${queuedCall.queue} queue`,
      detail: `${queuedCall.displayName || queuedCall.from} is waiting now${
        queuedCall.waitTime > 0 ? ` for ${queuedCall.waitTime}s` : ''
      }.`,
      tone: 'attention',
    }
  }

  const overdueCallback = input.callbacks.find(
    (callback) =>
      callback.status !== 'completed' &&
      callback.status !== 'failed' &&
      callback.dueAt.getTime() <= Date.now()
  )
  if (overdueCallback) {
    return {
      title: 'Return overdue callback',
      detail: `${overdueCallback.contactName || overdueCallback.targetUri} is overdue in ${
        overdueCallback.queue
      }.`,
      tone: 'warning',
    }
  }

  if (input.selectedCallback) {
    return {
      title: 'Start selected callback',
      detail: `Continue with ${input.selectedCallback.contactName || input.selectedCallback.targetUri}.`,
      tone: 'attention',
    }
  }

  if (input.callbacks.some((callback) => callback.status === 'open')) {
    return {
      title: 'Review callback worklist',
      detail: 'Open the next callback task and bring the queue follow-up backlog down.',
      tone: 'neutral',
    }
  }

  if (input.agentStatus === 'away') {
    return {
      title: 'Return to queue work',
      detail: 'Set the agent back to available when you want the next inbound call.',
      tone: 'neutral',
    }
  }

  return {
    title: 'Queue is clear',
    detail: 'Stay available. Presenter controls can inject the next storyline when needed.',
    tone: 'success',
  }
}
