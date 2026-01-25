/**
 * useGracefulDegradation - Automatically adjusts call quality settings
 * when network quality degrades, providing progressive degradation and
 * recovery with user notifications.
 *
 * @packageDocumentation
 */

import { ref, computed, watch, getCurrentScope, onScopeDispose, type ComputedRef } from 'vue'
import { createLogger } from '@/utils/logger'
import { DEGRADATION_CONSTANTS } from './constants'
import type { UseConnectionHealthBarReturn, HealthLevel } from './useConnectionHealthBar'
import type { UseCallSessionReturn } from './useCallSession'
import type { UseNotificationsReturn } from './useNotifications'

const logger = createLogger('useGracefulDegradation')

// =============================================================================
// Types
// =============================================================================

export type DegradationLevel = 0 | 1 | 2 | 3

export interface DegradationThresholds {
  mild: HealthLevel[]
  moderate: HealthLevel[]
  severe: HealthLevel[]
}

export interface AdaptationHistoryEntry {
  timestamp: number
  level: DegradationLevel
  reason: string
}

export interface GracefulDegradationOptions {
  healthBar?: UseConnectionHealthBarReturn
  callSession?: UseCallSessionReturn
  notifications?: UseNotificationsReturn
  autoDegrade?: boolean
  autoRecover?: boolean
  stabilizationDelay?: number
  thresholds?: Partial<DegradationThresholds>
}

export interface UseGracefulDegradationReturn {
  degradationLevel: ComputedRef<DegradationLevel>
  isDegraded: ComputedRef<boolean>
  activeAdaptations: ComputedRef<string[]>
  canRecover: ComputedRef<boolean>
  isAutoMode: ComputedRef<boolean>
  applyDegradation: (level: DegradationLevel) => void
  recover: () => void
  recoverFull: () => void
  setAutoMode: (enabled: boolean) => void
  getAdaptationHistory: () => AdaptationHistoryEntry[]
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_THRESHOLDS: DegradationThresholds = {
  mild: ['fair'],
  moderate: ['poor'],
  severe: ['critical', 'offline'],
}

const HEALTH_LEVEL_PRIORITY: Record<HealthLevel, number> = {
  excellent: 5,
  good: 4,
  fair: 3,
  poor: 2,
  critical: 1,
  offline: 0,
}

// =============================================================================
// Main Composable
// =============================================================================

export function useGracefulDegradation(
  options: GracefulDegradationOptions = {}
): UseGracefulDegradationReturn {
  const {
    healthBar,
    callSession,
    notifications,
    autoDegrade = true,
    autoRecover = true,
    stabilizationDelay = DEGRADATION_CONSTANTS.DEFAULT_STABILIZATION_DELAY,
    thresholds: userThresholds,
  } = options

  const thresholds: DegradationThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...userThresholds,
  }

  // =========================================================================
  // State
  // =========================================================================

  const currentLevel = ref<DegradationLevel>(0)
  const autoMode = ref(autoDegrade)
  const adaptations = ref<string[]>([])
  const history = ref<AdaptationHistoryEntry[]>([])
  const lastLevelChangeTime = ref(0)
  const lastHealthLevel = ref<HealthLevel>('good')

  let stabilizationTimer: ReturnType<typeof setTimeout> | null = null
  let recoveryTimer: ReturnType<typeof setTimeout> | null = null

  // =========================================================================
  // Computed
  // =========================================================================

  const degradationLevel = computed<DegradationLevel>(() => currentLevel.value)

  const isDegraded = computed<boolean>(() => currentLevel.value > 0)

  const activeAdaptations = computed<string[]>(() => [...adaptations.value])

  const canRecover = computed<boolean>(() => {
    if (currentLevel.value === 0) return false
    if (!healthBar) return true

    const health = healthBar.healthLevel.value
    const targetLevel = currentLevel.value - 1

    if (targetLevel === 0) {
      return health === 'excellent' || health === 'good'
    }
    if (targetLevel === 1) {
      return health === 'excellent' || health === 'good' || health === 'fair'
    }
    return health !== 'critical' && health !== 'offline'
  })

  const isAutoMode = computed<boolean>(() => autoMode.value)

  // =========================================================================
  // History Management
  // =========================================================================

  function addHistoryEntry(level: DegradationLevel, reason: string): void {
    history.value = [
      ...history.value.slice(-(DEGRADATION_CONSTANTS.MAX_HISTORY_ENTRIES - 1)),
      { timestamp: Date.now(), level, reason },
    ]
  }

  // =========================================================================
  // Degradation Actions
  // =========================================================================

  function applyLevel1(): void {
    if (!callSession) {
      adaptations.value = [...adaptations.value, 'video-resolution-reduced']
      return
    }

    const session = callSession.session.value
    if (session && callSession.hasLocalVideo.value) {
      try {
        const pc = session.connection
        if (pc) {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (videoSender) {
            const params = videoSender.getParameters()
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}]
            }
            const encoding = params.encodings[0]!
            encoding.maxBitrate = 250000
            encoding.maxFramerate = DEGRADATION_CONSTANTS.VIDEO.MILD_MAX_FRAMERATE
            videoSender.setParameters(params).catch((err) => {
              logger.warn('Failed to set video parameters for mild degradation', err)
            })
          }
        }
      } catch (err) {
        logger.warn('Could not access peer connection for video degradation', err)
      }
      adaptations.value = [...adaptations.value, 'video-resolution-reduced']
    }
  }

  function applyLevel2(): void {
    if (callSession && callSession.hasLocalVideo.value) {
      callSession.disableVideo()
    }
    adaptations.value = adaptations.value
      .filter((a) => a !== 'video-resolution-reduced')
      .concat('video-disabled')
  }

  function applyLevel3(): void {
    if (!callSession) {
      adaptations.value = [...adaptations.value, 'audio-bitrate-reduced']
      return
    }

    const session = callSession.session.value
    if (session) {
      try {
        const pc = session.connection
        if (pc) {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio')
          if (audioSender) {
            const params = audioSender.getParameters()
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}]
            }
            const encoding = params.encodings[0]!
            encoding.maxBitrate = DEGRADATION_CONSTANTS.AUDIO_BITRATE.REDUCED
            audioSender.setParameters(params).catch((err) => {
              logger.warn('Failed to set audio parameters for severe degradation', err)
            })
          }
        }
      } catch (err) {
        logger.warn('Could not access peer connection for audio degradation', err)
      }
    }
    adaptations.value = [...adaptations.value, 'audio-bitrate-reduced']
  }

  function revertLevel1(): void {
    if (!callSession) {
      adaptations.value = adaptations.value.filter((a) => a !== 'video-resolution-reduced')
      return
    }

    const session = callSession.session.value
    if (session && callSession.hasLocalVideo.value) {
      try {
        const pc = session.connection
        if (pc) {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (videoSender) {
            const params = videoSender.getParameters()
            if (params.encodings && params.encodings.length > 0) {
              const encoding = params.encodings[0]!
              delete encoding.maxBitrate
              delete encoding.maxFramerate
              videoSender.setParameters(params).catch((err) => {
                logger.warn('Failed to revert video parameters', err)
              })
            }
          }
        }
      } catch (err) {
        logger.warn('Could not revert video parameters', err)
      }
    }
    adaptations.value = adaptations.value.filter((a) => a !== 'video-resolution-reduced')
  }

  function revertLevel2(): void {
    if (callSession && !callSession.hasLocalVideo.value) {
      callSession.enableVideo()
    }
    adaptations.value = adaptations.value.filter((a) => a !== 'video-disabled')
  }

  function revertLevel3(): void {
    if (!callSession) {
      adaptations.value = adaptations.value.filter((a) => a !== 'audio-bitrate-reduced')
      return
    }

    const session = callSession.session.value
    if (session) {
      try {
        const pc = session.connection
        if (pc) {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio')
          if (audioSender) {
            const params = audioSender.getParameters()
            if (params.encodings && params.encodings.length > 0) {
              const encoding = params.encodings[0]!
              delete encoding.maxBitrate
              audioSender.setParameters(params).catch((err) => {
                logger.warn('Failed to revert audio parameters', err)
              })
            }
          }
        }
      } catch (err) {
        logger.warn('Could not revert audio parameters', err)
      }
    }
    adaptations.value = adaptations.value.filter((a) => a !== 'audio-bitrate-reduced')
  }

  // =========================================================================
  // Notification Helpers
  // =========================================================================

  function notifyDegradation(level: DegradationLevel): void {
    if (!notifications) return

    if (level === 1) {
      notifications.warning('Quality Adjusted', DEGRADATION_CONSTANTS.MESSAGES.MILD_DEGRADE)
    } else if (level === 2) {
      notifications.warning('Audio-Only Mode', DEGRADATION_CONSTANTS.MESSAGES.MODERATE_DEGRADE)
    } else if (level === 3) {
      notifications.warning('Severe Degradation', DEGRADATION_CONSTANTS.MESSAGES.SEVERE_DEGRADE)
    }
  }

  function notifyRecovery(full: boolean): void {
    if (!notifications) return

    if (full) {
      notifications.success('Quality Restored', DEGRADATION_CONSTANTS.MESSAGES.FULL_RECOVERY)
    } else {
      notifications.success('Quality Improving', DEGRADATION_CONSTANTS.MESSAGES.RECOVERY)
    }
  }

  // =========================================================================
  // Level Transition Logic
  // =========================================================================

  function transitionToLevel(targetLevel: DegradationLevel, reason: string): void {
    const now = Date.now()
    if (now - lastLevelChangeTime.value < DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL) {
      logger.debug('Skipping level change - too soon since last change')
      return
    }

    const previousLevel = currentLevel.value

    if (targetLevel === previousLevel) return

    logger.info(`Degradation level: ${previousLevel} → ${targetLevel} (${reason})`)

    if (targetLevel > previousLevel) {
      for (let l = previousLevel + 1; l <= targetLevel; l++) {
        if (l === 1) applyLevel1()
        if (l === 2) applyLevel2()
        if (l === 3) applyLevel3()
      }
      notifyDegradation(targetLevel)
    } else {
      for (let l = previousLevel; l > targetLevel; l--) {
        if (l === 3) revertLevel3()
        if (l === 2) revertLevel2()
        if (l === 1) revertLevel1()
      }
      notifyRecovery(targetLevel === 0)
    }

    currentLevel.value = targetLevel
    lastLevelChangeTime.value = now
    addHistoryEntry(targetLevel, reason)
  }

  // =========================================================================
  // Health Level → Degradation Level Mapping
  // =========================================================================

  function healthToTargetLevel(health: HealthLevel): DegradationLevel {
    if (thresholds.severe.includes(health)) return 3
    if (thresholds.moderate.includes(health)) return 2
    if (thresholds.mild.includes(health)) return 1
    return 0
  }

  function handleHealthChange(health: HealthLevel): void {
    if (!autoMode.value) return

    const targetLevel = healthToTargetLevel(health)
    const currentHealthPriority = HEALTH_LEVEL_PRIORITY[health]
    const isCritical = currentHealthPriority <= 1

    if (stabilizationTimer !== null) {
      clearTimeout(stabilizationTimer)
      stabilizationTimer = null
    }
    if (recoveryTimer !== null) {
      clearTimeout(recoveryTimer)
      recoveryTimer = null
    }

    if (targetLevel > currentLevel.value) {
      if (isCritical) {
        transitionToLevel(targetLevel, `health: ${health} (immediate)`)
      } else {
        stabilizationTimer = setTimeout(() => {
          stabilizationTimer = null
          if (healthBar && healthToTargetLevel(healthBar.healthLevel.value) >= targetLevel) {
            transitionToLevel(targetLevel, `health: ${health} (stabilized)`)
          }
        }, stabilizationDelay)
      }
    } else if (targetLevel < currentLevel.value && autoRecover) {
      recoveryTimer = setTimeout(() => {
        recoveryTimer = null
        if (healthBar && healthToTargetLevel(healthBar.healthLevel.value) <= targetLevel) {
          transitionToLevel(targetLevel, `health improved: ${health}`)
        }
      }, DEGRADATION_CONSTANTS.RECOVERY_STABILIZATION_DELAY)
    }

    lastHealthLevel.value = health
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  function applyDegradation(level: DegradationLevel): void {
    transitionToLevel(level, 'manual')
  }

  function recover(): void {
    if (currentLevel.value === 0) return
    if (!canRecover.value) {
      logger.debug('Cannot recover - network quality insufficient')
      return
    }
    const targetLevel = (currentLevel.value - 1) as DegradationLevel
    transitionToLevel(targetLevel, 'manual recovery')
  }

  function recoverFull(): void {
    if (currentLevel.value === 0) return
    transitionToLevel(0, 'manual full recovery')
  }

  function setAutoMode(enabled: boolean): void {
    autoMode.value = enabled
    logger.debug(`Auto mode ${enabled ? 'enabled' : 'disabled'}`)

    if (enabled && healthBar) {
      handleHealthChange(healthBar.healthLevel.value)
    }
  }

  function getAdaptationHistory(): AdaptationHistoryEntry[] {
    return [...history.value]
  }

  // =========================================================================
  // Watch Health Level
  // =========================================================================

  let stopWatch: (() => void) | null = null

  if (healthBar) {
    stopWatch = watch(
      () => healthBar.healthLevel.value,
      (newHealth) => {
        handleHealthChange(newHealth)
      },
      { immediate: false }
    )
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  logger.debug('Graceful degradation initialized', {
    autoDegrade,
    autoRecover,
    stabilizationDelay,
    hasHealthBar: !!healthBar,
    hasCallSession: !!callSession,
    hasNotifications: !!notifications,
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (stabilizationTimer !== null) {
        clearTimeout(stabilizationTimer)
        stabilizationTimer = null
      }
      if (recoveryTimer !== null) {
        clearTimeout(recoveryTimer)
        recoveryTimer = null
      }
      if (stopWatch) {
        stopWatch()
        stopWatch = null
      }
      logger.debug('Graceful degradation disposed')
    })
  }

  return {
    degradationLevel,
    isDegraded,
    activeAdaptations,
    canRecover,
    isAutoMode,
    applyDegradation,
    recover,
    recoverFull,
    setAutoMode,
    getAdaptationHistory,
  }
}
