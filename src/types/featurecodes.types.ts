/**
 * Feature Codes Type Definitions
 *
 * Type definitions for PBX feature codes like DND, Call Forward, etc.
 * Integrates with Asterisk dialplan feature codes via AMI.
 *
 * @module types/featurecodes
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Feature code categories
 */
export type FeatureCodeCategory =
  | 'dnd'
  | 'callforward'
  | 'voicemail'
  | 'recording'
  | 'transfer'
  | 'parking'
  | 'pickup'
  | 'intercom'
  | 'custom'

/**
 * DND (Do Not Disturb) status
 */
export type DndStatus = 'enabled' | 'disabled' | 'unknown'

/**
 * Call forward types
 */
export type CallForwardType =
  | 'unconditional'  // Always forward (CF)
  | 'busy'           // Forward on busy (CFB)
  | 'noanswer'       // Forward on no answer (CFNA)
  | 'unavailable'    // Forward when unavailable

/**
 * Call forward status
 */
export interface CallForwardStatus {
  /** Type of call forward */
  type: CallForwardType

  /** Whether this forward type is enabled */
  enabled: boolean

  /** Destination number/extension */
  destination?: string

  /** Ring timeout before forward (for noanswer type) */
  ringTimeout?: number
}

/**
 * Feature code definition
 */
export interface FeatureCode {
  /** Feature code identifier */
  id: string

  /** Display name */
  name: string

  /** Category */
  category: FeatureCodeCategory

  /** Dial code to activate (e.g., *78) */
  activateCode: string

  /** Dial code to deactivate (e.g., *79) */
  deactivateCode?: string

  /** Dial code to toggle (e.g., *76) */
  toggleCode?: string

  /** Dial code to check status */
  statusCode?: string

  /** Whether it requires a destination number */
  requiresDestination: boolean

  /** Description of the feature */
  description?: string

  /** Whether the feature is currently available */
  available: boolean
}

/**
 * Feature execution result
 */
export interface FeatureExecutionResult {
  /** Whether execution was successful */
  success: boolean

  /** Feature code that was executed */
  featureCode: string

  /** Result message */
  message?: string

  /** New status after execution (if applicable) */
  newStatus?: string

  /** Timestamp of execution */
  executedAt: Date
}

/**
 * Feature status for an extension
 */
export interface ExtensionFeatureStatus {
  /** Extension number */
  extension: string

  /** DND status */
  dnd: DndStatus

  /** Call forward statuses */
  callForward: CallForwardStatus[]

  /** Custom feature states */
  customFeatures: Record<string, boolean>

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Common FreePBX/Asterisk feature codes
 */
export interface StandardFeatureCodes {
  /** DND toggle */
  dndToggle: string

  /** DND activate */
  dndActivate: string

  /** DND deactivate */
  dndDeactivate: string

  /** Call forward unconditional activate */
  cfActivate: string

  /** Call forward unconditional deactivate */
  cfDeactivate: string

  /** Call forward busy activate */
  cfbActivate: string

  /** Call forward busy deactivate */
  cfbDeactivate: string

  /** Call forward no answer activate */
  cfnaActivate: string

  /** Call forward no answer deactivate */
  cfnaDeactivate: string

  /** Call pickup */
  callPickup: string

  /** Directed call pickup */
  directedPickup: string

  /** Voicemail access */
  voicemail: string

  /** Direct voicemail */
  directVoicemail: string

  /** Intercom prefix */
  intercom: string

  /** Call park */
  callPark: string

  /** Attended transfer */
  attendedTransfer: string

  /** Blind transfer */
  blindTransfer: string

  /** In-call recording toggle */
  recordingToggle: string
}

/**
 * Options for useAmiFeatureCodes composable
 */
export interface UseAmiFeatureCodesOptions {
  /** Extension to manage features for */
  extension?: string

  /** Custom feature codes (override defaults) */
  featureCodes?: Partial<StandardFeatureCodes>

  /** Auto-refresh status interval in ms (0 to disable) */
  refreshInterval?: number

  /** AstDB family for feature state storage */
  dbFamily?: string

  /** Callback when DND status changes */
  onDndChanged?: (enabled: boolean) => void

  /** Callback when call forward changes */
  onCallForwardChanged?: (status: CallForwardStatus) => void

  /** Callback when feature execution completes */
  onFeatureExecuted?: (result: FeatureExecutionResult) => void

  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Return type for useAmiFeatureCodes composable
 */
export interface UseAmiFeatureCodesReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Current extension */
  extension: Ref<string>

  /** DND status */
  dndStatus: Ref<DndStatus>

  /** Call forward statuses */
  callForwardStatus: Ref<CallForwardStatus[]>

  /** Available feature codes */
  featureCodes: Ref<FeatureCode[]>

  /** Custom feature states */
  customFeatures: Ref<Record<string, boolean>>

  /** Execution history */
  executionHistory: Ref<FeatureExecutionResult[]>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message */
  error: Ref<string | null>

  // ============================================================================
  // Computed
  // ============================================================================

  /** Whether DND is currently enabled */
  isDndEnabled: ComputedRef<boolean>

  /** Whether any call forward is active */
  hasActiveCallForward: ComputedRef<boolean>

  /** Active call forward destination (if any) */
  callForwardDestination: ComputedRef<string | null>

  /** Get call forward status by type */
  getCallForwardByType: (type: CallForwardType) => CallForwardStatus | undefined

  // ============================================================================
  // DND Methods
  // ============================================================================

  /** Toggle DND status */
  toggleDnd: () => Promise<FeatureExecutionResult>

  /** Enable DND */
  enableDnd: () => Promise<FeatureExecutionResult>

  /** Disable DND */
  disableDnd: () => Promise<FeatureExecutionResult>

  // ============================================================================
  // Call Forward Methods
  // ============================================================================

  /** Enable call forward unconditional */
  enableCallForward: (destination: string) => Promise<FeatureExecutionResult>

  /** Disable call forward unconditional */
  disableCallForward: () => Promise<FeatureExecutionResult>

  /** Enable call forward on busy */
  enableCallForwardBusy: (destination: string) => Promise<FeatureExecutionResult>

  /** Disable call forward on busy */
  disableCallForwardBusy: () => Promise<FeatureExecutionResult>

  /** Enable call forward on no answer */
  enableCallForwardNoAnswer: (destination: string, ringTimeout?: number) => Promise<FeatureExecutionResult>

  /** Disable call forward on no answer */
  disableCallForwardNoAnswer: () => Promise<FeatureExecutionResult>

  // ============================================================================
  // General Feature Methods
  // ============================================================================

  /** Execute a feature code */
  executeFeatureCode: (code: string, destination?: string) => Promise<FeatureExecutionResult>

  /** Execute a custom feature by name */
  executeFeature: (featureName: string, destination?: string) => Promise<FeatureExecutionResult>

  /** Refresh all feature statuses */
  refreshStatus: () => Promise<void>

  /** Set extension to manage */
  setExtension: (extension: string) => void

  // ============================================================================
  // Custom Features
  // ============================================================================

  /** Register a custom feature code */
  registerFeature: (feature: FeatureCode) => void

  /** Unregister a custom feature */
  unregisterFeature: (featureId: string) => void

  /** Get feature by ID */
  getFeature: (featureId: string) => FeatureCode | undefined

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /** Clear execution history */
  clearHistory: () => void

  /** Get status summary for extension */
  getStatusSummary: () => ExtensionFeatureStatus
}
