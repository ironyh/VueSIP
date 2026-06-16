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

/**
 * Capabilities a workspace can rely on. Honest gating:
 * - demo gateways report simulated capabilities
 * - connected (AMI) gateways report real provider capabilities
 */
export interface MvpGatewayCapabilities {
  /** True when outbound dialing is allowed beyond callbacks. MVP is callback-only. */
  manualOutbound: boolean
  /** Supervisor audio interventions (monitor/whisper/barge) — explicitly hidden in MVP. */
  supervisorAudioIntervention: boolean
  /** Whether the queue/call feed is live (connected) or simulated (demo). */
  liveQueue: boolean
}

/**
 * Runtime callbacks a gateway invokes while running.
 * Both demo and connected gateways use the same shape so the workspace
 * never needs to know which feed it is consuming.
 */
export interface MvpGatewayRuntime {
  /** Whether the agent is currently accepting inbound queue offers. */
  isQueueOpen: () => boolean
  /** Called when a new inbound call enters the queue. */
  onInboundCall: (call: QueuedCallView) => void
  /** Called on each feed update (demo: wall-clock tick; connected: AMI event flush). */
  onTick: () => void
}

/**
 * Gateway contract. The demo gateway implements this plus demo-only
 * presenter fixtures; a connected (AMI) gateway implements only this.
 * `CallCenterRuntime` consumes only this surface.
 */
export interface MvpGateway {
  capabilities: MvpGatewayCapabilities
  start(runtime: MvpGatewayRuntime, intervalMs?: number): void
  stop(): void
}
