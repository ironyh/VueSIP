/**
 * useSipMetrics - Lightweight metrics and event emission for VueSIP.
 *
 * Provides a callback surface for observability into connection health,
 * degradation events, and recovery signals. Designed for integration with
 * external monitoring tools like Sentry, Datadog, or custom backends.
 *
 * @packageDocumentation
 */

import { ref, getCurrentScope, onScopeDispose } from 'vue'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useSipMetrics')

// =============================================================================
// Window Type Augmentation
// =============================================================================

export type MetricsEventCallback = (event: MetricsEvent) => void

declare global {
  interface Window {
    __vuesipMetrics?: MetricsEventCallback | MetricsEventCallback[]
  }
}

// =============================================================================
// Types
// =============================================================================

export type MetricsEventType =
  | 'health.level_change'
  | 'health.recovery'
  | 'degradation.apply'
  | 'degradation.recover'
  | 'connection.reconnecting'
  | 'connection.recovered'
  | 'ice.health_change'
  | 'registration.state_change'

export interface BaseMetricsEvent {
  type: MetricsEventType
  timestamp: number
  source: 'useConnectionHealthBar' | 'useGracefulDegradation'
}

export interface HealthLevelChangeEvent extends BaseMetricsEvent {
  type: 'health.level_change'
  previousLevel: string
  currentLevel: string
  details: {
    transport: { isConnected: boolean; isRecovering: boolean }
    registration: { isRegistered: boolean; isFailed: boolean }
    network: { level: string; isAvailable: boolean }
    ice: { isHealthy: boolean; isRecovering: boolean }
  }
}

export interface HealthRecoveryEvent extends BaseMetricsEvent {
  type: 'health.recovery'
  previousLevel: string
  currentLevel: string
}

export interface DegradationApplyEvent extends BaseMetricsEvent {
  type: 'degradation.apply'
  level: number
  reason: string
  activeAdaptations: string[]
}

export interface DegradationRecoverEvent extends BaseMetricsEvent {
  type: 'degradation.recover'
  level: number
  full: boolean
  reason: string
}

export interface ConnectionReconnectingEvent extends BaseMetricsEvent {
  type: 'connection.reconnecting'
  attempt: number
  reason: string
}

export interface ConnectionRecoveredEvent extends BaseMetricsEvent {
  type: 'connection.recovered'
  previousAttempts: number
  durationMs: number
}

export interface IceHealthChangeEvent extends BaseMetricsEvent {
  type: 'ice.health_change'
  previousState: string
  currentState: string
}

export interface RegistrationStateChangeEvent extends BaseMetricsEvent {
  type: 'registration.state_change'
  previousState: string
  currentState: string
}

export type MetricsEvent =
  | HealthLevelChangeEvent
  | HealthRecoveryEvent
  | DegradationApplyEvent
  | DegradationRecoverEvent
  | ConnectionReconnectingEvent
  | ConnectionRecoveredEvent
  | IceHealthChangeEvent
  | RegistrationStateChangeEvent

export type MetricsCallback = (event: MetricsEvent) => void

export interface UseSipMetricsOptions {
  /** Enable/disable metrics emission. When disabled, no events are emitted. */
  enabled?: boolean
  /** Sample rate (0-1). 1 = emit all events, 0.5 = emit 50%, etc. */
  sampleRate?: number
  /** Maximum events per minute to prevent flooding */
  maxEventsPerMinute?: number
}

export interface UseSipMetricsReturn {
  /** Whether metrics are currently enabled */
  isEnabled: boolean
  /** Current sample rate */
  sampleRate: number
  /** Register a callback for metrics events */
  onMetrics: (callback: MetricsCallback) => () => void
  /** Unregister a callback */
  offMetrics: (callback: MetricsCallback) => void
  /** Emit an event manually */
  emit: (event: Omit<MetricsEvent, 'timestamp' | 'source'>) => void
  /** Enable metrics */
  enable: () => void
  /** Disable metrics */
  disable: () => void
  /** Set sample rate */
  setSampleRate: (rate: number) => void
}

// =============================================================================
// Global State
// =============================================================================

const globalCallbacks = new Set<MetricsCallback>()
let globalEnabled = true
let globalSampleRate = 1.0
let eventsThisMinute = 0
let minuteStartTime = Date.now()
const DEFAULT_MAX_EVENTS_PER_MINUTE = 1000

// =============================================================================
// Helper Functions
// =============================================================================

function shouldEmit(): boolean {
  if (!globalEnabled) return false

  // Reset counter at minute boundary
  const now = Date.now()
  if (now - minuteStartTime >= 60000) {
    minuteStartTime = now
    eventsThisMinute = 0
  }

  // Check rate limiting
  if (eventsThisMinute >= DEFAULT_MAX_EVENTS_PER_MINUTE) {
    return false
  }

  // Apply sampling
  if (Math.random() > globalSampleRate) {
    return false
  }

  eventsThisMinute++
  return true
}

function emitToCallbacks(event: MetricsEvent): void {
  if (!shouldEmit()) return

  for (const callback of globalCallbacks) {
    try {
      callback(event)
    } catch (err) {
      logger.warn('Metrics callback threw error', err)
    }
  }

  // Also emit to global window hook if available
  if (typeof window !== 'undefined') {
    const globalHook = window.__vuesipMetrics
    if (typeof globalHook === 'function') {
      try {
        globalHook(event)
      } catch (err) {
        logger.warn('window.__vuesipMetrics threw error', err)
      }
    } else if (Array.isArray(globalHook)) {
      // Allow array of callbacks
      for (const cb of globalHook) {
        if (typeof cb === 'function') {
          try {
            cb(event)
          } catch (err) {
            logger.warn('window.__vuesipMetrics callback threw error', err)
          }
        }
      }
    }
  }
}

// =============================================================================
// Main Composable
// =============================================================================

export function useSipMetrics(options: UseSipMetricsOptions = {}): UseSipMetricsReturn {
  const { enabled = true, sampleRate = 1.0 } = options

  // Update global state
  if (enabled !== undefined) {
    globalEnabled = enabled
  }
  if (sampleRate !== undefined) {
    globalSampleRate = sampleRate
  }

  const isEnabled = ref(globalEnabled)
  const currentSampleRate = ref(globalSampleRate)

  function onMetrics(callback: MetricsCallback): () => void {
    globalCallbacks.add(callback)
    logger.debug('Metrics callback registered', { total: globalCallbacks.size })

    // Return unsubscribe function
    return () => {
      globalCallbacks.delete(callback)
      logger.debug('Metrics callback unregistered', { total: globalCallbacks.size })
    }
  }

  function offMetrics(callback: MetricsCallback): void {
    globalCallbacks.delete(callback)
  }

  function emit(event: { type: string; [key: string]: unknown }): void {
    const fullEvent = {
      ...event,
      timestamp: Date.now(),
      source: 'useSipMetrics' as const,
    }
    emitToCallbacks(fullEvent as unknown as MetricsEvent)
  }

  function enable(): void {
    globalEnabled = true
    isEnabled.value = true
    logger.debug('Metrics enabled')
  }

  function disable(): void {
    globalEnabled = false
    isEnabled.value = false
    logger.debug('Metrics disabled')
  }

  function setSampleRate(rate: number): void {
    const clampedRate = Math.max(0, Math.min(1, rate))
    globalSampleRate = clampedRate
    currentSampleRate.value = clampedRate
    logger.debug('Sample rate updated', { rate: clampedRate })
  }

  logger.debug('useSipMetrics initialized', { enabled, sampleRate })

  // Cleanup on scope dispose
  if (getCurrentScope()) {
    onScopeDispose(() => {
      // Note: We don't remove global callbacks here as they may be shared
      logger.debug('useSipMetrics disposed')
    })
  }

  return {
    isEnabled: globalEnabled,
    sampleRate: globalSampleRate,
    onMetrics,
    offMetrics,
    emit,
    enable,
    disable,
    setSampleRate,
  }
}

// =============================================================================
// Utility: Create event emitter for internal use
// =============================================================================

/**
 * Creates a metrics emitter function that can be used internally by other composables.
 * This avoids the overhead of creating a full composable instance.
 *
 * @param source - The source composable name
 * @returns Emitter function
 */
export function createMetricsEmitter(source: 'useConnectionHealthBar' | 'useGracefulDegradation') {
  return (event: { type: string; [key: string]: unknown }): void => {
    if (!shouldEmit()) return

    const fullEvent: MetricsEvent = {
      ...event,
      timestamp: Date.now(),
      source,
    } as MetricsEvent
    emitToCallbacks(fullEvent)
  }
}
