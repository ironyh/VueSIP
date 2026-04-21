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

export type DemoScenario = 'support' | 'billing' | 'sales'

export type DemoStoryScene =
  | 'peak-hour'
  | 'vip-escalation'
  | 'billing-backlog'
  | 'callback-recovery'

export interface DemoContactProfile {
  accountTier?: 'Standard' | 'Priority' | 'VIP'
  accountHealth?: 'healthy' | 'watch' | 'at-risk'
  serviceLevel?: string
  openCaseTitle?: string
  callbackReason?: string
  lastInteractionAt?: string
}

export interface QueuedCallView {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
  queue: string
  profile?: DemoContactProfile
}

export interface CustomerContextView {
  displayName: string
  address: string
  queue: string | null
  latestDisposition: string | null
  noteSummary: string | null
  hasOpenCallback: boolean
  accountTier: DemoContactProfile['accountTier'] | null
  accountHealth: DemoContactProfile['accountHealth'] | null
  serviceLevel: string | null
  openCaseTitle: string | null
  callbackReason: string | null
  lastInteractionAt: string | null
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
  profile?: DemoContactProfile
}
