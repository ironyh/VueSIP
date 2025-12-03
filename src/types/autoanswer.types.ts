/**
 * Auto-Answer Types
 *
 * Type definitions for automatic call answering functionality.
 * Supports intercom mode, configurable delays, and per-extension settings.
 *
 * @packageDocumentation
 */

/**
 * Auto-answer mode
 */
export type AutoAnswerMode = 'disabled' | 'all' | 'whitelist' | 'intercom'

/**
 * Intercom mode type
 */
export type IntercomMode = 'simplex' | 'duplex'

/**
 * Auto-answer trigger source
 */
export type AutoAnswerTrigger = 'header' | 'whitelist' | 'intercom' | 'all_calls' | 'manual'

/**
 * SIP headers that can trigger auto-answer
 */
export interface AutoAnswerHeaders {
  /** Call-Info header with answer-after parameter */
  'Call-Info'?: string
  /** Alert-Info header with auto-answer indicator */
  'Alert-Info'?: string
  /** Custom auto-answer header */
  'X-Auto-Answer'?: string
  /** Cisco intercom header */
  'X-Cisco-Intercom'?: string
  /** Polycom intercom header */
  'X-Polycom-Intercom'?: string
}

/**
 * Whitelist entry for auto-answer
 */
export interface AutoAnswerWhitelistEntry {
  /** Phone number or SIP URI pattern */
  pattern: string
  /** Display name for identification */
  name?: string
  /** Whether this entry is enabled */
  enabled: boolean
  /** Optional delay override for this entry (ms) */
  delay?: number
  /** Optional intercom mode override */
  intercomMode?: IntercomMode
  /** Date added */
  addedAt: Date
}

/**
 * Auto-answer settings
 */
export interface AutoAnswerSettings {
  /** Whether auto-answer is enabled */
  enabled: boolean
  /** Auto-answer mode */
  mode: AutoAnswerMode
  /** Delay before answering (milliseconds) */
  delay: number
  /** Maximum delay allowed (milliseconds) */
  maxDelay: number
  /** Play announcement before answering */
  playAnnouncement: boolean
  /** Announcement audio URL or file path */
  announcementUrl?: string
  /** Intercom mode (simplex = one-way, duplex = two-way) */
  intercomMode: IntercomMode
  /** Mute microphone initially in intercom mode */
  intercomMuteOnAnswer: boolean
  /** Automatically detect auto-answer headers */
  detectHeaders: boolean
  /** Headers that trigger auto-answer */
  triggerHeaders: (keyof AutoAnswerHeaders)[]
  /** Whitelist for selective auto-answer */
  whitelist: AutoAnswerWhitelistEntry[]
  /** Beep sound before auto-answer */
  playBeep: boolean
  /** Beep audio URL */
  beepUrl?: string
  /** Show visual notification before auto-answer */
  showNotification: boolean
  /** Notification duration before auto-answer (ms) */
  notificationDuration: number
}

/**
 * Auto-answer event data
 */
export interface AutoAnswerEvent {
  /** Call ID */
  callId: string
  /** Caller number/URI */
  caller: string
  /** Display name */
  displayName?: string
  /** What triggered auto-answer */
  trigger: AutoAnswerTrigger
  /** Delay that was applied (ms) */
  delay: number
  /** Whether intercom mode was used */
  isIntercom: boolean
  /** Intercom mode type */
  intercomMode?: IntercomMode
  /** Matched whitelist entry if applicable */
  matchedWhitelistEntry?: AutoAnswerWhitelistEntry
  /** Headers that triggered auto-answer */
  matchedHeaders?: Partial<AutoAnswerHeaders>
  /** Timestamp */
  timestamp: Date
}

/**
 * Auto-answer statistics
 */
export interface AutoAnswerStats {
  /** Total calls auto-answered */
  totalAutoAnswered: number
  /** Calls auto-answered via headers */
  headerTriggered: number
  /** Calls auto-answered via whitelist */
  whitelistTriggered: number
  /** Calls auto-answered via intercom */
  intercomTriggered: number
  /** Calls auto-answered via all_calls mode */
  allCallsTriggered: number
  /** Calls skipped (not auto-answered) */
  skipped: number
  /** Average answer delay (ms) */
  averageDelay: number
  /** Last auto-answer event */
  lastEvent?: AutoAnswerEvent
}

/**
 * Pending auto-answer call
 */
export interface PendingAutoAnswer {
  /** Call ID */
  callId: string
  /** Caller number/URI */
  caller: string
  /** Display name */
  displayName?: string
  /** Trigger reason */
  trigger: AutoAnswerTrigger
  /** Time remaining before auto-answer (ms) */
  remainingTime: number
  /** Total delay configured (ms) */
  totalDelay: number
  /** Whether this can be cancelled */
  cancellable: boolean
  /** Timer ID for cancellation */
  timerId?: ReturnType<typeof setTimeout>
}

/**
 * Configuration options for useSipAutoAnswer
 */
export interface UseSipAutoAnswerOptions {
  /** Initial auto-answer settings */
  initialSettings?: Partial<AutoAnswerSettings>
  /** Storage key for persisting settings */
  storageKey?: string
  /** Enable persistence to localStorage */
  persist?: boolean
  /** Callback when call is auto-answered */
  onAutoAnswer?: (event: AutoAnswerEvent) => void
  /** Callback when auto-answer is pending */
  onPending?: (pending: PendingAutoAnswer) => void
  /** Callback when pending auto-answer is cancelled */
  onCancelled?: (callId: string, reason: string) => void
  /** Callback when auto-answer is skipped */
  onSkipped?: (callId: string, reason: string) => void
  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Return type for useSipAutoAnswer composable
 */
export interface UseSipAutoAnswerReturn {
  // Reactive State
  /** Current settings */
  settings: import('vue').Ref<AutoAnswerSettings>
  /** Whether auto-answer is globally enabled */
  isEnabled: import('vue').ComputedRef<boolean>
  /** Current mode */
  mode: import('vue').ComputedRef<AutoAnswerMode>
  /** Pending auto-answer calls */
  pendingCalls: import('vue').Ref<PendingAutoAnswer[]>
  /** Statistics */
  stats: import('vue').Ref<AutoAnswerStats>
  /** Loading state */
  isLoading: import('vue').Ref<boolean>
  /** Error state */
  error: import('vue').Ref<string | null>

  // Enable/Disable
  /** Enable auto-answer */
  enable: () => void
  /** Disable auto-answer */
  disable: () => void
  /** Toggle auto-answer */
  toggle: () => void

  // Mode Management
  /** Set auto-answer mode */
  setMode: (mode: AutoAnswerMode) => void

  // Settings Management
  /** Update settings */
  updateSettings: (settings: Partial<AutoAnswerSettings>) => void
  /** Reset settings to defaults */
  resetSettings: () => void
  /** Set answer delay */
  setDelay: (delay: number) => void
  /** Set intercom mode */
  setIntercomMode: (mode: IntercomMode) => void

  // Whitelist Management
  /** Add to whitelist */
  addToWhitelist: (entry: Omit<AutoAnswerWhitelistEntry, 'addedAt'>) => void
  /** Remove from whitelist */
  removeFromWhitelist: (pattern: string) => void
  /** Update whitelist entry */
  updateWhitelistEntry: (pattern: string, updates: Partial<AutoAnswerWhitelistEntry>) => void
  /** Clear whitelist */
  clearWhitelist: () => void
  /** Check if number is whitelisted */
  isWhitelisted: (number: string) => boolean

  // Call Handling
  /** Check if call should be auto-answered */
  shouldAutoAnswer: (callId: string, caller: string, headers?: Partial<AutoAnswerHeaders>) => {
    shouldAnswer: boolean
    trigger?: AutoAnswerTrigger
    delay: number
    isIntercom: boolean
  }
  /** Cancel pending auto-answer */
  cancelPending: (callId: string) => void
  /** Cancel all pending auto-answers */
  cancelAllPending: () => void
  /** Manually trigger auto-answer for a call */
  triggerAutoAnswer: (callId: string) => void

  // Announcement
  /** Set announcement URL */
  setAnnouncementUrl: (url: string) => void
  /** Enable/disable announcement */
  setPlayAnnouncement: (play: boolean) => void

  // Statistics
  /** Reset statistics */
  resetStats: () => void
  /** Get recent auto-answer events */
  getRecentEvents: (limit?: number) => AutoAnswerEvent[]

  // Persistence
  /** Save settings to storage */
  saveSettings: () => void
  /** Load settings from storage */
  loadSettings: () => void
}
