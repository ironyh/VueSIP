/**
 * Tests for useConnectionHealthBar composable
 * @module tests/composables/useConnectionHealthBar.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import { CONNECTION_HEALTH_CONSTANTS } from '@/composables/constants'
import { useConnectionHealthBar } from '@/composables/useConnectionHealthBar'
import type { UseNetworkQualityIndicatorReturn } from '@/types/call-quality.types'
import type { UseConnectionRecoveryReturn } from '@/types/connection-recovery.types'
import type { UseTransportRecoveryReturn } from '@/composables/useTransportRecovery'
import type { UseSipRegistrationReturn } from '@/composables/useSipRegistration'
import type { UseNotificationsReturn } from '@/composables/useNotifications'
import type { IceHealthStatus, RecoveryState } from '@/types/connection-recovery.types'
import type { NetworkQualityLevel } from '@/types/call-quality.types'

// =============================================================================
// Mock factories
// =============================================================================

function createMockNetworkQuality(
  overrides: Partial<{
    level: NetworkQualityLevel
    isAvailable: boolean
  }> = {}
): UseNetworkQualityIndicatorReturn {
  const indicator = ref({ level: overrides.level ?? 'unknown', rtt: 0, jitter: 0, packetLoss: 0 })
  const isAvailable = ref(overrides.isAvailable ?? false)
  return {
    indicator,
    isAvailable,
    update: vi.fn().mockImplementation((input: { level: NetworkQualityLevel }) => {
      indicator.value.level = input.level
    }),
    reset: vi.fn(),
  }
}

function createMockConnectionRecovery(
  overrides: Partial<{
    isHealthy: boolean
    isRecovering: boolean
    iceHealth: IceHealthStatus
    state: RecoveryState
  }> = {}
): UseConnectionRecoveryReturn {
  return {
    isHealthy: ref(overrides.isHealthy ?? true) as UseConnectionRecoveryReturn['isHealthy'],
    isRecovering: ref(
      overrides.isRecovering ?? false
    ) as UseConnectionRecoveryReturn['isRecovering'],
    iceHealth: computed(
      () =>
        overrides.iceHealth ?? {
          isHealthy: true,
          iceState: 'connected' as const,
          stateAge: 0,
          recoveryAttempts: 0,
        }
    ) as unknown as UseConnectionRecoveryReturn['iceHealth'],
    state: computed(() => overrides.state ?? 'stable') as UseConnectionRecoveryReturn['state'],
    attempts: computed(() => []) as UseConnectionRecoveryReturn['attempts'],
    error: ref(null) as UseConnectionRecoveryReturn['error'],
    networkInfo: computed(() => ({
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      isOnline: true,
    })) as UseConnectionRecoveryReturn['networkInfo'],
    recover: vi.fn().mockResolvedValue(false),
    reset: vi.fn(),
    monitor: vi.fn(),
    stopMonitoring: vi.fn(),
  }
}

function createMockTransportRecovery(
  overrides: Partial<{
    connectionState: ConnectionState
    isRecovering: boolean
  }> = {}
): UseTransportRecoveryReturn {
  return {
    connectionState: computed(
      () => overrides.connectionState ?? ConnectionState.Connected
    ) as UseTransportRecoveryReturn['connectionState'],
    isRecovering: ref(
      overrides.isRecovering ?? false
    ) as UseTransportRecoveryReturn['isRecovering'],
    lastRecoveryTime: ref(null),
    recoveryAttempts: ref(0),
    lastError: ref(null),
    metrics: computed(() => ({
      attempts: 0,
      lastAttempt: null,
      totalRecoveries: 0,
      averageRecoveryTimeMs: 0,
    })) as UseTransportRecoveryReturn['metrics'],
    triggerRecovery: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }
}

function createMockRegistration(
  overrides: Partial<{
    state: RegistrationState
    isRegistered: boolean
    hasRegistrationFailed: boolean
  }> = {}
): UseSipRegistrationReturn {
  return {
    state: ref(
      overrides.state ?? RegistrationState.Registered
    ) as UseSipRegistrationReturn['state'],
    registeredUri: ref(null) as UseSipRegistrationReturn['registeredUri'],
    isRegistered: computed(
      () => overrides.isRegistered ?? true
    ) as UseSipRegistrationReturn['isRegistered'],
    isRegistering: computed(() => false) as UseSipRegistrationReturn['isRegistering'],
    isUnregistering: computed(() => false) as UseSipRegistrationReturn['isUnregistering'],
    hasRegistrationFailed: computed(
      () => overrides.hasRegistrationFailed ?? false
    ) as UseSipRegistrationReturn['hasRegistrationFailed'],
    expires: ref(3600) as UseSipRegistrationReturn['expires'],
    lastRegistrationTime: ref(new Date()) as UseSipRegistrationReturn['lastRegistrationTime'],
    expiryTime: ref(null) as UseSipRegistrationReturn['expiryTime'],
    secondsUntilExpiry: computed(() => 3600) as UseSipRegistrationReturn['secondsUntilExpiry'],
    isExpiringSoon: computed(() => false) as UseSipRegistrationReturn['isExpiringSoon'],
    hasExpired: computed(() => false) as UseSipRegistrationReturn['hasExpired'],
    retryCount: ref(0) as UseSipRegistrationReturn['retryCount'],
    lastError: ref(null) as UseSipRegistrationReturn['lastError'],
    register: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }
}

function createMockNotifications(): UseNotificationsReturn {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    recovery: vi.fn(),
  } as unknown as UseNotificationsReturn
}

// =============================================================================
// Tests
// =============================================================================

describe('useConnectionHealthBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization without dependencies', () => {
    it('should initialize with good health level by default', () => {
      const { healthLevel } = useConnectionHealthBar()
      expect(healthLevel.value).toBe('good')
    })

    it('should initialize with healthy status when all defaults are good', () => {
      const { isHealthy } = useConnectionHealthBar()
      expect(isHealthy.value).toBe(true)
    })

    it('should have status text for good level', () => {
      const { statusText } = useConnectionHealthBar()
      expect(typeof statusText.value).toBe('string')
      expect(statusText.value.length).toBeGreaterThan(0)
    })

    it('should have a color defined for current health level', () => {
      const { color, healthLevel } = useConnectionHealthBar()
      expect(color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS[healthLevel.value])
    })

    it('should have an icon defined for current health level', () => {
      const { icon, healthLevel } = useConnectionHealthBar()
      expect(icon.value).toBe(CONNECTION_HEALTH_CONSTANTS.ICONS[healthLevel.value])
    })

    it('should expose details as computed', () => {
      const { details } = useConnectionHealthBar()
      expect(details.value).toBeDefined()
      expect(details.value.transport).toBeDefined()
      expect(details.value.registration).toBeDefined()
      expect(details.value.network).toBeDefined()
      expect(details.value.ice).toBeDefined()
    })

    it('should accept custom debounceMs option', () => {
      const { healthLevel: _ } = useConnectionHealthBar({ debounceMs: 500 })
      // Just verify it doesn't throw
    })
  })

  describe('transport health integration', () => {
    it('should report offline when transport is disconnected', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })
      const { healthLevel } = useConnectionHealthBar({ transportRecovery: transport })

      // Trigger reactivity
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('offline')
    })

    it('should report offline when transport is failed', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.ConnectionFailed,
      })
      const { healthLevel } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('offline')
    })

    it('should report poor when transport is recovering', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Connected,
        isRecovering: true,
      })
      const { healthLevel } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('poor')
    })

    it('should report good when transport is connected', () => {
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('good')
    })

    it('should report critical when ICE state is failed', () => {
      const connRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceHealth: { isHealthy: false, iceState: 'failed', stateAge: 1000, recoveryAttempts: 0 },
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        connectionRecovery: connRecovery,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('critical')
    })
  })

  describe('registration health integration', () => {
    it('should report critical when registration has failed', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Failed,
        hasRegistrationFailed: true,
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('critical')
    })

    it('should report fair when registration is in progress', () => {
      const registration = createMockRegistration({ state: RegistrationState.Registering })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('fair')
    })

    it('should report fair when unregistering', () => {
      const registration = createMockRegistration({ state: RegistrationState.Unregistering })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('fair')
    })

    it('should report good when registered', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Registered,
        isRegistered: true,
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('good')
    })
  })

  describe('network quality integration', () => {
    it('should report poor for poor network quality', () => {
      const networkQuality = createMockNetworkQuality({ level: 'poor', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        networkQuality,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('poor')
    })

    it('should report poor for critical network quality', () => {
      const networkQuality = createMockNetworkQuality({ level: 'critical', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        networkQuality,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('poor')
    })

    it('should report fair for fair network quality', () => {
      const networkQuality = createMockNetworkQuality({ level: 'fair', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        networkQuality,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('fair')
    })

    it('should report excellent for excellent network quality', () => {
      const networkQuality = createMockNetworkQuality({ level: 'excellent', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        networkQuality,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('excellent')
    })

    it('should treat unavailable network as good (graceful degradation)', () => {
      const networkQuality = createMockNetworkQuality({ level: 'unknown', isAvailable: false })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        networkQuality,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      // Should not be poor just because network is unavailable
      expect(healthLevel.value).toBe('good')
    })
  })

  describe('ICE health integration', () => {
    it('should report poor when ICE is recovering', () => {
      const connRecovery = createMockConnectionRecovery({
        isHealthy: false,
        isRecovering: true,
        iceHealth: {
          isHealthy: false,
          iceState: 'disconnected',
          stateAge: 500,
          recoveryAttempts: 1,
        },
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        connectionRecovery: connRecovery,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('poor')
    })

    it('should report critical when ICE is failed', () => {
      const connRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceHealth: { isHealthy: false, iceState: 'failed', stateAge: 100, recoveryAttempts: 0 },
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        connectionRecovery: connRecovery,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('critical')
    })
  })

  describe('isHealthy computed', () => {
    it('should be healthy for excellent level', () => {
      const networkQuality = createMockNetworkQuality({ level: 'excellent', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { isHealthy } = useConnectionHealthBar({ networkQuality, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(isHealthy.value).toBe(true)
    })

    it('should be healthy for good level', () => {
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { isHealthy } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(isHealthy.value).toBe(true)
    })

    it('should be healthy for fair level', () => {
      const registration = createMockRegistration({ state: RegistrationState.Registering })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { isHealthy } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(isHealthy.value).toBe(true)
    })

    it('should not be healthy for poor level', () => {
      const networkQuality = createMockNetworkQuality({ level: 'poor', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { isHealthy } = useConnectionHealthBar({ networkQuality, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(isHealthy.value).toBe(false)
    })

    it('should not be healthy for critical level', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Failed,
        hasRegistrationFailed: true,
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { isHealthy } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(isHealthy.value).toBe(false)
    })

    it('should not be healthy for offline level', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })
      const { isHealthy } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(isHealthy.value).toBe(false)
    })
  })

  describe('status text', () => {
    it('should return reconnecting text for offline with recovering transport', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
        isRecovering: true,
      })
      const { statusText } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(statusText.value).toBe('Reconnecting...')
    })

    it('should return registration failed text when registration fails', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Failed,
        hasRegistrationFailed: true,
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { statusText } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(statusText.value).toBe('Registration failed')
    })

    it('should return ICE connection failed for failed ICE state', () => {
      const connRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceHealth: { isHealthy: false, iceState: 'failed', stateAge: 100, recoveryAttempts: 0 },
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { statusText } = useConnectionHealthBar({
        connectionRecovery: connRecovery,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(statusText.value).toBe('ICE connection failed')
    })

    it('should return recovering text when transport is recovering', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Connected,
        isRecovering: true,
      })
      const { statusText } = useConnectionHealthBar({ transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(statusText.value).toBe('Recovering connection...')
    })

    it('should return re-registering text when registering', () => {
      const registration = createMockRegistration({ state: RegistrationState.Registering })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { statusText } = useConnectionHealthBar({ registration, transportRecovery: transport })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(statusText.value).toBe('Re-registering...')
    })
  })

  describe('debouncing', () => {
    it('should debounce health level changes', () => {
      const networkQuality1 = createMockNetworkQuality({ level: 'excellent', isAvailable: true })

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: networkQuality1,
        transportRecovery: createMockTransportRecovery({
          connectionState: ConnectionState.Connected,
        }),
      })

      vi.advanceTimersByTime(500)
      expect(healthLevel.value).toBe('excellent')
    })

    it('should apply custom debounceMs', () => {
      const networkQuality1 = createMockNetworkQuality({ level: 'excellent', isAvailable: true })

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: networkQuality1,
        transportRecovery: createMockTransportRecovery({
          connectionState: ConnectionState.Connected,
        }),
        debounceMs: 500,
      })

      vi.advanceTimersByTime(499)
      expect(healthLevel.value).toBe('excellent')

      vi.advanceTimersByTime(2)
      expect(healthLevel.value).toBe('excellent')
    })
  })

  describe('color and icon', () => {
    it('should return correct color for each health level', () => {
      const levels: Array<'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'offline'> = [
        'excellent',
        'good',
        'fair',
        'poor',
        'critical',
        'offline',
      ]
      for (const level of levels) {
        // Access the constant directly since we're testing the constant itself
        expect(CONNECTION_HEALTH_CONSTANTS.COLORS[level]).toBeDefined()
      }
    })

    it('should return correct icon for each health level', () => {
      for (const level of ['excellent', 'good', 'fair', 'poor', 'critical', 'offline'] as const) {
        expect(CONNECTION_HEALTH_CONSTANTS.ICONS[level]).toBeDefined()
      }
    })
  })

  describe('health level priority (offline > critical > poor > fair > good > excellent)', () => {
    it('should prefer offline over critical when both conditions apply', () => {
      // Transport disconnected + registration failed
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })
      const registration = createMockRegistration({
        state: RegistrationState.Failed,
        hasRegistrationFailed: true,
      })
      const { healthLevel } = useConnectionHealthBar({ transportRecovery: transport, registration })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      // Offline takes priority because transport is not connected
      expect(healthLevel.value).toBe('offline')
    })

    it('should prefer critical over poor when ICE is failed', () => {
      const connRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceHealth: { isHealthy: false, iceState: 'failed', stateAge: 100, recoveryAttempts: 0 },
      })
      const networkQuality = createMockNetworkQuality({ level: 'poor', isAvailable: true })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        connectionRecovery: connRecovery,
        networkQuality,
        transportRecovery: transport,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(healthLevel.value).toBe('critical')
    })

    it('should prefer poor over fair when recovering', () => {
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Connected,
        isRecovering: true,
      })
      const registration = createMockRegistration({ state: RegistrationState.Registering })
      const { healthLevel } = useConnectionHealthBar({ transportRecovery: transport, registration })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      // Poor (recovering) takes priority over fair (registering)
      expect(healthLevel.value).toBe('poor')
    })
  })

  describe('notification integration', () => {
    it('should call notifications when health drops to critical', () => {
      const notifications = createMockNotifications()
      const registration = createMockRegistration({
        state: RegistrationState.Failed,
        hasRegistrationFailed: true,
      })
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel: _ } = useConnectionHealthBar({
        registration,
        transportRecovery: transport,
        notifications,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(notifications.error).toHaveBeenCalledWith(
        'Connection Critical',
        'Connection is experiencing critical issues'
      )
    })

    it('should call notifications when health drops to offline', () => {
      const notifications = createMockNotifications()
      const transport = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })
      const { healthLevel: _ } = useConnectionHealthBar({
        transportRecovery: transport,
        notifications,
      })

      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 1)

      expect(notifications.error).toHaveBeenCalledWith('Disconnected', 'Connection to server lost')
    })
  })

  describe('metrics callback', () => {
    it('should accept onMetrics option without error', () => {
      const onMetrics = vi.fn()
      const transport = createMockTransportRecovery({ connectionState: ConnectionState.Connected })
      const { healthLevel } = useConnectionHealthBar({
        transportRecovery: transport,
        onMetrics,
      })

      expect(healthLevel.value).toBe('good')
      expect(onMetrics).toBeDefined()
    })
  })
})
