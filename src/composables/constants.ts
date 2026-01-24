/**
 * Composable Constants
 *
 * Centralized configuration values and magic numbers used across composables.
 * This ensures consistency and makes values easy to adjust.
 *
 * @module composables/constants
 */

/**
 * Registration configuration
 */
export const REGISTRATION_CONSTANTS = {
  /** Default registration expiry time in seconds */
  DEFAULT_EXPIRES: 600,

  /** Default maximum retry attempts */
  DEFAULT_MAX_RETRIES: 3,

  /** Registration refresh percentage (refresh at 90% of expiry time) */
  REFRESH_PERCENTAGE: 0.9,

  /** Seconds threshold for "expiring soon" warning */
  EXPIRING_SOON_THRESHOLD: 30,

  /** Base retry delay in milliseconds */
  BASE_RETRY_DELAY: 1000,

  /** Maximum retry delay in milliseconds (30 seconds) */
  MAX_RETRY_DELAY: 30000,
} as const

/**
 * Presence configuration
 */
export const PRESENCE_CONSTANTS = {
  /** Default presence publish expiry in seconds */
  DEFAULT_EXPIRES: 3600,

  /** Subscription refresh percentage (refresh at 90% of expiry time) */
  SUBSCRIPTION_REFRESH_PERCENTAGE: 0.9,

  /** Default subscription expiry in seconds */
  DEFAULT_SUBSCRIPTION_EXPIRES: 3600,
} as const

/**
 * Messaging configuration
 */
export const MESSAGING_CONSTANTS = {
  /** Composing indicator idle timeout in milliseconds */
  COMPOSING_IDLE_TIMEOUT: 10000,

  /** Composing indicator timeout in seconds */
  COMPOSING_TIMEOUT_SECONDS: 10,
} as const

/**
 * Conference configuration
 */
export const CONFERENCE_CONSTANTS = {
  /** Default maximum participants in a conference */
  DEFAULT_MAX_PARTICIPANTS: 10,

  /** Audio level monitoring interval in milliseconds */
  AUDIO_LEVEL_INTERVAL: 100,

  /** Conference state transition delay in milliseconds */
  STATE_TRANSITION_DELAY: 2000,
} as const

/**
 * Transfer configuration
 */
export const TRANSFER_CONSTANTS = {
  /** Transfer completion delay in milliseconds */
  COMPLETION_DELAY: 2000,

  /** Transfer cancellation delay in milliseconds */
  CANCELLATION_DELAY: 1000,
} as const

/**
 * Call history configuration
 */
export const HISTORY_CONSTANTS = {
  /** Default call history limit */
  DEFAULT_LIMIT: 10,

  /** Default offset for pagination */
  DEFAULT_OFFSET: 0,

  /** Default sort order */
  DEFAULT_SORT_ORDER: 'desc' as const,

  /** Default sort field */
  DEFAULT_SORT_BY: 'startTime' as const,

  /** Top N frequent contacts to return */
  TOP_FREQUENT_CONTACTS: 10,
} as const

/**
 * Common timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  /** Short delay for UI updates */
  SHORT_DELAY: 1000,

  /** Medium delay for operations */
  MEDIUM_DELAY: 2000,

  /** Long delay for cleanup */
  LONG_DELAY: 5000,
} as const

/**
 * Call configuration
 */
export const CALL_CONSTANTS = {
  /** Maximum concurrent calls */
  MAX_CONCURRENT_CALLS: 5,

  /** Call timeout in milliseconds */
  CALL_TIMEOUT: 30000,

  /** Ring timeout in milliseconds */
  RING_TIMEOUT: 60000,
} as const

/**
 * Media configuration
 */
export const MEDIA_CONSTANTS = {
  /** Device enumeration retry delay in milliseconds */
  ENUMERATION_RETRY_DELAY: 1000,

  /** Device test duration in milliseconds */
  DEFAULT_TEST_DURATION: 2000,

  /** Audio level threshold for device test (0-1) */
  AUDIO_LEVEL_THRESHOLD: 0.01,
} as const

/**
 * DTMF configuration
 */
export const DTMF_CONSTANTS = {
  /** Default DTMF tone duration in milliseconds */
  DEFAULT_DURATION: 100,

  /** Default inter-tone gap in milliseconds */
  DEFAULT_INTER_TONE_GAP: 70,

  /** Minimum allowed duration in milliseconds */
  MIN_DURATION: 40,

  /** Maximum allowed duration in milliseconds */
  MAX_DURATION: 6000,

  /** Maximum DTMF queue size (prevents unbounded memory growth) */
  MAX_QUEUE_SIZE: 100,
} as const

/**
 * Transport recovery configuration
 */
export const TRANSPORT_RECOVERY_CONSTANTS = {
  /** Delay after transport connects before triggering re-registration (ms) */
  STABILIZATION_DELAY: 1000,

  /** Maximum number of recovery attempts before giving up */
  MAX_RECOVERY_ATTEMPTS: 5,

  /** Base delay between recovery attempts (ms) */
  BASE_RETRY_DELAY: 2000,

  /** Maximum delay between recovery attempts (ms) */
  MAX_RETRY_DELAY: 30000,
} as const

/**
 * Device switch configuration
 */
export const DEVICE_SWITCH_CONSTANTS = {
  /** Timeout for device switch operations in milliseconds */
  SWITCH_TIMEOUT: 5000,

  /** Delay before retrying fallback device selection in milliseconds */
  FALLBACK_RETRY_DELAY: 500,
} as const

/**
 * Call waiting configuration
 */
export const CALL_WAITING_CONSTANTS = {
  /** Default maximum number of waiting calls */
  DEFAULT_MAX_WAITING_CALLS: 5,

  /** Default auto-reject timeout in milliseconds (0 = never) */
  DEFAULT_AUTO_REJECT_AFTER: 0,

  /** Default play waiting tone setting */
  DEFAULT_PLAY_WAITING_TONE: true,
} as const

/**
 * Notification configuration
 */
export const NOTIFICATION_CONSTANTS = {
  /** Maximum notifications in queue */
  MAX_NOTIFICATIONS: 10,

  /** Default auto-dismiss duration in ms */
  DEFAULT_DURATION: 5000,

  /** Success notification duration in ms */
  SUCCESS_DURATION: 3000,

  /** Warning notification duration in ms */
  WARNING_DURATION: 8000,

  /** Error notification duration in ms (0 = persistent) */
  ERROR_DURATION: 0,

  /** Recovery notification duration in ms (0 = persistent) */
  RECOVERY_DURATION: 0,
} as const

/**
 * Connection health bar configuration
 */
export const CONNECTION_HEALTH_CONSTANTS = {
  /** Default debounce delay for health level changes (ms) */
  DEFAULT_DEBOUNCE_MS: 1000,

  /** Health level colors */
  COLORS: {
    excellent: '#22c55e',
    good: '#84cc16',
    fair: '#eab308',
    poor: '#f97316',
    critical: '#ef4444',
    offline: '#6b7280',
  },

  /** Health level icons */
  ICONS: {
    excellent: 'health-excellent',
    good: 'health-good',
    fair: 'health-fair',
    poor: 'health-poor',
    critical: 'health-critical',
    offline: 'health-offline',
  },

  /** Status text templates */
  STATUS_TEXT: {
    excellent: 'Connected - Excellent quality',
    good: 'Connected - Good quality',
    fair: 'Connected - Fair quality',
    poor: 'Poor connection quality',
    critical: 'Critical - Connection issues',
    offline: 'Disconnected',
  },
} as const

/**
 * Credential expiry configuration
 */
export const CREDENTIAL_EXPIRY_CONSTANTS = {
  /** SIP error codes that indicate credential/auth issues */
  DEFAULT_AUTH_ERROR_CODES: [401, 403] as readonly number[],

  /** Time before expiry to warn user in seconds */
  DEFAULT_WARNING_THRESHOLD: 60,

  /** Maximum auth failures before requiring manual intervention */
  MAX_AUTH_FAILURES: 3,

  /** Debounce delay for error detection in milliseconds */
  ERROR_DEBOUNCE_DELAY: 500,

  /** Auth error patterns to match in error messages */
  AUTH_ERROR_PATTERNS: ['401', '403', 'Unauthorized', 'Forbidden'] as readonly string[],
} as const

/**
 * Graceful degradation configuration
 */
export const DEGRADATION_CONSTANTS = {
  /** Default stabilization delay before acting on quality changes (ms) */
  DEFAULT_STABILIZATION_DELAY: 3000,

  /** Maximum adaptation history entries to retain */
  MAX_HISTORY_ENTRIES: 20,

  /** Recovery hysteresis: quality must be stable for this long before recovering (ms) */
  RECOVERY_STABILIZATION_DELAY: 5000,

  /** Minimum time between degradation level changes (ms) */
  MIN_LEVEL_CHANGE_INTERVAL: 2000,

  /** Default audio bitrate targets per degradation level (kbps) */
  AUDIO_BITRATE: {
    /** Full quality audio bitrate */
    FULL: 64000,
    /** Reduced audio bitrate for severe degradation */
    REDUCED: 24000,
  },

  /** Default video constraints per degradation level */
  VIDEO: {
    /** Mild degradation: reduced resolution/framerate */
    MILD_MAX_WIDTH: 640,
    MILD_MAX_HEIGHT: 480,
    MILD_MAX_FRAMERATE: 15,
  },

  /** Notification messages */
  MESSAGES: {
    MILD_DEGRADE: 'Video quality reduced due to network conditions',
    MODERATE_DEGRADE: 'Video disabled - switching to audio-only mode',
    SEVERE_DEGRADE: 'Audio quality reduced - consider reconnecting if issues persist',
    RECOVERY: 'Network quality improved - restoring call quality',
    FULL_RECOVERY: 'Full call quality restored',
  },
} as const

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  /** Calculate exponential backoff delay */
  calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    return delay
  },

  /** Default exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
} as const
