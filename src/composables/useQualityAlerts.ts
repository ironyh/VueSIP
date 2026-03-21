/**
 * useQualityAlerts - Call Quality Alert Notifications
 *
 * Monitors call quality metrics and displays toast notifications
 * when quality degrades below configurable thresholds.
 *
 * @module composables/useQualityAlerts
 */
import { computed, ref, watch, type Ref, type DeepReadonly } from 'vue'
import type { CallQualityStats, QualityLevel } from './useCallQualityStats'

/**
 * Alert configuration thresholds
 */
export interface QualityAlertThresholds {
  /** Packet loss percentage that triggers warning (default: 5%) */
  packetLossPercent: number
  /** RTT in ms that triggers warning (default: 300ms) */
  rttMs: number
  /** Jitter in ms that triggers warning (default: 50ms) */
  jitterMs: number
}

/**
 * Active alert state
 */
export interface QualityAlert {
  /** Type of metric that triggered alert */
  type: 'packetLoss' | 'rtt' | 'jitter'
  /** Human-readable message */
  message: string
  /** Severity level */
  severity: 'warning' | 'critical'
  /** Timestamp when alert was triggered */
  timestamp: Date
  /** Current metric value */
  value: number
}

/**
 * Options for useQualityAlerts
 */
export interface UseQualityAlertsOptions {
  /** Alert thresholds */
  thresholds?: Partial<QualityAlertThresholds>
  /** Minimum time between alerts of same type (ms) - default: 10000 (10s) */
  cooldownMs?: number
  /** Whether alerts are enabled */
  enabled?: boolean
}

/**
 * Composable return type
 */
export interface UseQualityAlertsReturn {
  /** Currently active alerts */
  activeAlerts: Readonly<Ref<Readonly<QualityAlert>[]>>
  /** Whether any alert is currently active */
  hasAlerts: Readonly<Ref<boolean>>
  /** Clear all active alerts */
  clearAlerts: () => void
  /** Manually trigger alert check */
  checkNow: () => void
  /** Enable/disable alerts */
  setEnabled: (enabled: boolean) => void
}

/**
 * Default alert thresholds
 * Based on WebRTC best practices for VoIP quality
 */
const DEFAULT_THRESHOLDS: QualityAlertThresholds = {
  packetLossPercent: 5, // >5% causes noticeable audio degradation
  rttMs: 300, // >300ms causes conversational delay
  jitterMs: 50, // >50ms causes audio jitter/buffer issues
}

/**
 * Alert messages in Swedish (primary) and English
 */
const ALERT_MESSAGES = {
  packetLoss: {
    warning: (value: number) => `Paketförlust ${value.toFixed(1)}% - ljud kan hacka`,
    critical: (value: number) => `Hög paketförlust ${value.toFixed(1)}% - försämrad kvalitet`,
  },
  rtt: {
    warning: (value: number) => `Fördröjning ${Math.round(value)}ms - konversation kan påverkas`,
    critical: (value: number) => `Hög fördröjning ${Math.round(value)}ms - märkbar fördröjning`,
  },
  jitter: {
    warning: (value: number) => `Jitter ${Math.round(value)}ms - ljudvariering`,
    critical: (value: number) => `Hög jitter ${Math.round(value)}ms - instabil anslutning`,
  },
}

/**
 * Vue composable for monitoring call quality and emitting alerts
 *
 * @param statsRef - Reactive reference to call quality statistics
 * @param qualityLevelRef - Reactive reference to quality level
 * @param options - Configuration options
 * @returns Composable interface for alert management
 *
 * @example
 * ```ts
 * const { stats, qualityLevel } = useCallQualityStats(sessionRef)
 * const { activeAlerts, hasAlerts } = useQualityAlerts(stats, qualityLevel)
 *
 * // In template: show toast when hasAlerts.value
 * ```
 */
export function useQualityAlerts(
  statsRef: DeepReadonly<Ref<CallQualityStats>>,
  qualityLevelRef: DeepReadonly<Ref<QualityLevel>>,
  options: UseQualityAlertsOptions = {}
): UseQualityAlertsReturn {
  const {
    thresholds: customThresholds,
    cooldownMs = 10000,
    enabled: initialEnabled = true,
  } = options

  const thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds }
  const enabled = ref(initialEnabled)
  const activeAlerts = ref<QualityAlert[]>([])

  // Track last alert times for cooldown
  const lastAlertTimes = ref<Record<string, number>>({
    packetLoss: 0,
    rtt: 0,
    jitter: 0,
  })

  /**
   * Determine severity based on how much threshold is exceeded
   */
  function getSeverity(type: keyof QualityAlertThresholds, value: number): 'warning' | 'critical' {
    const threshold = thresholds[type]
    const ratio = value / threshold

    if (ratio >= 2) return 'critical' // Double threshold = critical
    return 'warning'
  }

  /**
   * Check if enough time has passed since last alert of this type
   */
  function isCooldownExpired(type: string): boolean {
    const now = Date.now()
    const lastTime = lastAlertTimes.value[type] || 0
    return now - lastTime >= cooldownMs
  }

  /**
   * Create an alert if threshold is breached
   */
  function createAlert(type: 'packetLoss' | 'rtt' | 'jitter', value: number): QualityAlert | null {
    if (!isCooldownExpired(type)) return null

    const severity = getSeverity(
      type === 'packetLoss' ? 'packetLossPercent' : type === 'rtt' ? 'rttMs' : 'jitterMs',
      value
    )

    const messageFn = ALERT_MESSAGES[type][severity]
    const message = messageFn(value)

    // Update last alert time
    lastAlertTimes.value[type] = Date.now()

    return {
      type,
      message,
      severity,
      timestamp: new Date(),
      value,
    }
  }

  /**
   * Check current stats against thresholds
   */
  function checkThresholds(): void {
    if (!enabled.value) return

    const stats = statsRef.value
    const newAlerts: QualityAlert[] = []

    // Check packet loss
    if (
      stats.packetLossPercent !== null &&
      stats.packetLossPercent > thresholds.packetLossPercent
    ) {
      const alert = createAlert('packetLoss', stats.packetLossPercent)
      if (alert) newAlerts.push(alert)
    }

    // Check RTT
    if (stats.rtt !== null && stats.rtt > thresholds.rttMs) {
      const alert = createAlert('rtt', stats.rtt)
      if (alert) newAlerts.push(alert)
    }

    // Check jitter
    if (stats.jitter !== null && stats.jitter > thresholds.jitterMs) {
      const alert = createAlert('jitter', stats.jitter)
      if (alert) newAlerts.push(alert)
    }

    // Add new alerts to active list
    if (newAlerts.length > 0) {
      activeAlerts.value = [...activeAlerts.value, ...newAlerts]

      // Limit to most recent 5 alerts
      if (activeAlerts.value.length > 5) {
        activeAlerts.value = activeAlerts.value.slice(-5)
      }
    }
  }

  /**
   * Clear all active alerts
   */
  function clearAlerts(): void {
    activeAlerts.value = []
  }

  /**
   * Enable/disable alerts
   */
  function setEnabled(value: boolean): void {
    enabled.value = value
    if (!value) {
      clearAlerts()
    }
  }

  /**
   * Watch for quality level changes to trigger immediate check
   */
  watch(
    () => qualityLevelRef.value,
    (newLevel, oldLevel) => {
      // Check thresholds when quality degrades to fair or poor
      if ((newLevel === 'fair' || newLevel === 'poor') && newLevel !== oldLevel) {
        checkThresholds()
      }
    }
  )

  /**
   * Also check when stats update
   */
  watch(
    () => statsRef.value.lastUpdated,
    () => {
      checkThresholds()
    }
  )

  /**
   * Clear alerts when quality improves to excellent/good
   */
  watch(
    () => qualityLevelRef.value,
    (newLevel) => {
      if (newLevel === 'excellent' || newLevel === 'good') {
        // Auto-clear after a delay when quality improves
        setTimeout(() => {
          if (qualityLevelRef.value === newLevel) {
            clearAlerts()
          }
        }, 5000)
      }
    }
  )

  const hasAlerts = computed(() => activeAlerts.value.length > 0)

  return {
    activeAlerts: computed(() => activeAlerts.value) as unknown as Readonly<
      Ref<Readonly<QualityAlert>[]>
    >,
    hasAlerts: computed(() => hasAlerts.value) as unknown as Readonly<Ref<boolean>>,
    clearAlerts,
    checkNow: checkThresholds,
    setEnabled,
  }
}

export default useQualityAlerts
