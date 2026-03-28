/**
 * useConnectionHealthBar - Aggregates transport, registration, network quality,
 * and ICE health into a single reactive connection health indicator.
 *
 * @packageDocumentation
 */

import { ref, computed, watch, getCurrentScope, onScopeDispose, type ComputedRef } from 'vue'
import { createLogger } from '@/utils/logger'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import { CONNECTION_HEALTH_CONSTANTS } from './constants'
import type { UseNetworkQualityIndicatorReturn } from '@/types/call-quality.types'
import type { UseConnectionRecoveryReturn } from '@/types/connection-recovery.types'
import type { UseTransportRecoveryReturn } from './useTransportRecovery'
import type { UseSipRegistrationReturn } from './useSipRegistration'
import type { UseNotificationsReturn } from './useNotifications'

const logger = createLogger('useConnectionHealthBar')

// =============================================================================
// Types
// =============================================================================

export type HealthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'offline'

export interface HealthDetails {
  transport: {
    state: ConnectionState
    isConnected: boolean
    isRecovering: boolean
  }
  registration: {
    state: RegistrationState
    isRegistered: boolean
    isFailed: boolean
  }
  network: {
    level: string
    isAvailable: boolean
  }
  ice: {
    isHealthy: boolean
    state: string
    isRecovering: boolean
  }
}

export interface ConnectionHealthBarOptions {
  networkQuality?: UseNetworkQualityIndicatorReturn
  connectionRecovery?: UseConnectionRecoveryReturn
  transportRecovery?: UseTransportRecoveryReturn
  registration?: UseSipRegistrationReturn
  notifications?: UseNotificationsReturn
  debounceMs?: number
}

export interface UseConnectionHealthBarReturn {
  healthLevel: ComputedRef<HealthLevel>
  statusText: ComputedRef<string>
  color: ComputedRef<string>
  icon: ComputedRef<string>
  isHealthy: ComputedRef<boolean>
  details: ComputedRef<HealthDetails>
}

// =============================================================================
// Health Calculation
// =============================================================================

function calculateHealthLevel(details: HealthDetails): HealthLevel {
  // offline: transport disconnected/failed
  if (!details.transport.isConnected) {
    return 'offline'
  }

  // critical: registration failed OR ICE failed
  if (details.registration.isFailed || (!details.ice.isHealthy && details.ice.state === 'failed')) {
    return 'critical'
  }

  // poor: network quality poor/critical OR recovering
  if (details.transport.isRecovering || details.ice.isRecovering) {
    return 'poor'
  }
  if (details.network.isAvailable) {
    const netLevel = details.network.level
    if (netLevel === 'poor' || netLevel === 'critical') {
      return 'poor'
    }
  }

  // fair: network quality fair OR re-registering
  if (
    details.registration.state === RegistrationState.Registering ||
    details.registration.state === RegistrationState.Unregistering
  ) {
    return 'fair'
  }
  if (details.network.isAvailable && details.network.level === 'fair') {
    return 'fair'
  }

  // good: all connected, network quality good (or unknown/unavailable)
  if (details.network.isAvailable && details.network.level === 'excellent') {
    return 'excellent'
  }

  return 'good'
}

function getStatusText(level: HealthLevel, details: HealthDetails): string {
  if (level === 'offline') {
    if (details.transport.isRecovering) {
      return 'Reconnecting...'
    }
    return CONNECTION_HEALTH_CONSTANTS.STATUS_TEXT.offline
  }

  if (level === 'critical') {
    if (details.registration.isFailed) {
      return 'Registration failed'
    }
    return 'ICE connection failed'
  }

  if (level === 'poor') {
    if (details.transport.isRecovering || details.ice.isRecovering) {
      return 'Recovering connection...'
    }
    return CONNECTION_HEALTH_CONSTANTS.STATUS_TEXT.poor
  }

  if (level === 'fair') {
    if (
      details.registration.state === RegistrationState.Registering ||
      details.registration.state === RegistrationState.Unregistering
    ) {
      return 'Re-registering...'
    }
    return CONNECTION_HEALTH_CONSTANTS.STATUS_TEXT.fair
  }

  return CONNECTION_HEALTH_CONSTANTS.STATUS_TEXT[level]
}

// =============================================================================
// Main Composable
// =============================================================================

export function useConnectionHealthBar(
  options: ConnectionHealthBarOptions = {}
): UseConnectionHealthBarReturn {
  const {
    networkQuality,
    connectionRecovery,
    transportRecovery,
    registration,
    notifications,
    debounceMs = CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS,
  } = options

  const debouncedLevel = ref<HealthLevel>('good')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastNotifiedLevel: HealthLevel | null = null

  const details = computed<HealthDetails>(() => {
    const transportState = transportRecovery?.connectionState.value ?? ConnectionState.Connected
    const transportConnected =
      transportState === ConnectionState.Connected || transportState === ConnectionState.Connecting
    const transportRecovering = transportRecovery?.isRecovering.value ?? false

    const regState = registration?.state.value ?? RegistrationState.Registered
    const regRegistered = registration?.isRegistered.value ?? true
    const regFailed = registration?.hasRegistrationFailed.value ?? false

    const netLevel = networkQuality?.indicator.value.level ?? 'unknown'
    const netAvailable = networkQuality?.isAvailable.value ?? false

    const iceHealthy = connectionRecovery?.isHealthy.value ?? true
    const iceState = connectionRecovery?.iceHealth.value.iceState ?? 'connected'
    const iceRecovering = connectionRecovery?.isRecovering.value ?? false

    return {
      transport: {
        state: transportState,
        isConnected: transportConnected,
        isRecovering: transportRecovering,
      },
      registration: {
        state: regState,
        isRegistered: regRegistered,
        isFailed: regFailed,
      },
      network: {
        level: netLevel,
        isAvailable: netAvailable,
      },
      ice: {
        isHealthy: iceHealthy,
        state: iceState,
        isRecovering: iceRecovering,
      },
    }
  })

  const rawLevel = computed<HealthLevel>(() => calculateHealthLevel(details.value))

  const healthLevel = computed<HealthLevel>(() => debouncedLevel.value)

  const statusText = computed<string>(() => getStatusText(debouncedLevel.value, details.value))

  const color = computed<string>(() => CONNECTION_HEALTH_CONSTANTS.COLORS[debouncedLevel.value])

  const icon = computed<string>(() => CONNECTION_HEALTH_CONSTANTS.ICONS[debouncedLevel.value])

  const isHealthy = computed<boolean>(() => {
    const level = debouncedLevel.value
    return level === 'excellent' || level === 'good' || level === 'fair'
  })

  function notifyHealthDrop(level: HealthLevel): void {
    if (!notifications) return
    if (level === 'poor') {
      notifications.warning('Connection Quality', 'Connection quality has degraded')
    } else if (level === 'critical') {
      notifications.error('Connection Critical', 'Connection is experiencing critical issues')
    } else if (level === 'offline') {
      notifications.error('Disconnected', 'Connection to server lost')
    }
  }

  function notifyRecovery(level: HealthLevel): void {
    if (!notifications) return
    if (level === 'good' || level === 'excellent') {
      notifications.recovery('Connection Restored', 'Connection quality has recovered')
    }
  }

  // Watch raw level and debounce updates
  const stopWatch = watch(
    rawLevel,
    (newLevel) => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
      }

      // Immediate update for critical drops (offline/critical)
      if (newLevel === 'offline' || newLevel === 'critical') {
        debouncedLevel.value = newLevel
        if (lastNotifiedLevel !== newLevel) {
          notifyHealthDrop(newLevel)
          lastNotifiedLevel = newLevel
        }
        return
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null
        const previousLevel = debouncedLevel.value
        debouncedLevel.value = newLevel

        // Notify on drops
        if (
          newLevel === 'poor' &&
          previousLevel !== 'poor' &&
          previousLevel !== 'critical' &&
          previousLevel !== 'offline'
        ) {
          if (lastNotifiedLevel !== newLevel) {
            notifyHealthDrop(newLevel)
            lastNotifiedLevel = newLevel
          }
        }

        // Notify on recovery
        if (
          (previousLevel === 'poor' ||
            previousLevel === 'critical' ||
            previousLevel === 'offline') &&
          (newLevel === 'good' || newLevel === 'excellent')
        ) {
          notifyRecovery(newLevel)
          lastNotifiedLevel = newLevel
        }
      }, debounceMs)
    },
    { immediate: true }
  )

  // Initialize debounced level synchronously
  debouncedLevel.value = rawLevel.value

  logger.debug('Connection health bar initialized', {
    hasNetworkQuality: !!networkQuality,
    hasConnectionRecovery: !!connectionRecovery,
    hasTransportRecovery: !!transportRecovery,
    hasRegistration: !!registration,
    hasNotifications: !!notifications,
    debounceMs,
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      stopWatch()
      logger.debug('Connection health bar disposed')
    })
  }

  return {
    healthLevel,
    statusText,
    color,
    icon,
    isHealthy,
    details,
  }
}
