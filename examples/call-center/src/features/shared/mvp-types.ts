export type AgentWorkspaceState =
  | 'offline'
  | 'connecting'
  | 'available'
  | 'ringing'
  | 'busy'
  | 'wrap-up'
  | 'paused'
  | 'reconnecting'
  | 'attention'

export interface QueuedCallView {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
  queue: string
}

export interface CustomerContextView {
  displayName: string
  address: string
  queue: string | null
  latestDisposition: string | null
  noteSummary: string | null
  hasOpenCallback: boolean
}

export interface WrapUpDraftValue {
  disposition: string | null
  notes: string
  callbackRequested: boolean
}

export interface CallbackTaskView {
  id: string
  assignee: string
  queue: string
  targetUri: string
  contactName?: string
  status: 'open' | 'in-progress' | 'completed' | 'rescheduled' | 'failed'
  reason: string
  dueAt: Date
}
