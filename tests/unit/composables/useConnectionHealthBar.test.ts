/**
 * useConnectionHealthBar composable unit tests
 * Tests for connection health aggregation and reactive health indicators
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { useConnectionHealthBar } from '@/composables/useConnectionHealthBar'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import { CONNECTION_HEALTH_CONSTANTS } from '@/composables/constants'
import { withSetup } from '../../utils/test-helpers'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useConnectionHealthBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // =============================================================================
  // Helper Functions
  // =============================================================================

  function createMockNetworkQuality(overrides?: { level?: string; isAvailable?: boolean }) {
    return {
      indicator: computed(() => ({
        level: overrides?.level ?? 'good',
      })),
      isAvailable: computed(() => overrides?.isAvailable ?? true),
    }
  }

  function createMockConnectionRecovery(overrides?: {
    isHealthy?: boolean
    iceState?: string
    isRecovering?: boolean
  }) {
    return {
      isHealthy: computed(() => overrides?.isHealthy ?? true),
      iceHealth: computed(() => ({
        iceState: overrides?.iceState ?? 'connected',
      })),
      isRecovering: computed(() => overrides?.isRecovering ?? false),
    }
  }

  function createMockTransportRecovery(overrides?: {
    connectionState?: ConnectionState
    isRecovering?: boolean
  }) {
    return {
      connectionState: computed(() => overrides?.connectionState ?? ConnectionState.Connected),
      isRecovering: computed(() => overrides?.isRecovering ?? false),
    }
  }

  function createMockRegistration(overrides?: {
    state?: RegistrationState
    isRegistered?: boolean
    hasRegistrationFailed?: boolean
  }) {
    return {
      state: computed(() => overrides?.state ?? RegistrationState.Registered),
      isRegistered: computed(() => overrides?.isRegistered ?? true),
      hasRegistrationFailed: computed(() => overrides?.hasRegistrationFailed ?? false),
    }
  }

  function createMockNotifications() {
    return {
      warning: vi.fn(),
      error: vi.fn(),
      recovery: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    }
  }

  // =============================================================================
  // Initial State Tests
  // =============================================================================

  describe('Initial State', () => {
    it('should return good health level with no options', () => {
      const { result, unmount } = withSetup(() => useConnectionHealthBar())

      expect(result.healthLevel.value).toBe('good')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return correct status text for good health', () => {
      const { result, unmount } = withSetup(() => useConnectionHealthBar())

      expect(result.statusText.value).toBe(CONNECTION_HEALTH_CONSTANTS.STATUS_TEXT.good)
      unmount()
    })

    it('should return correct color for good health', () => {
      const { result, unmount } = withSetup(() => useConnectionHealthBar())

      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.good)
      unmount()
    })

    it('should return correct icon for good health', () => {
      const { result, unmount } = withSetup(() => useConnectionHealthBar())

      expect(result.icon.value).toBe(CONNECTION_HEALTH_CONSTANTS.ICONS.good)
      unmount()
    })

    it('should expose details with default values when no options provided', () => {
      const { result, unmount } = withSetup(() => useConnectionHealthBar())

      const details = result.details.value
      expect(details.transport.state).toBe(ConnectionState.Connected)
      expect(details.transport.isConnected).toBe(true)
      expect(details.transport.isRecovering).toBe(false)
      expect(details.registration.state).toBe(RegistrationState.Registered)
      expect(details.registration.isRegistered).toBe(true)
      expect(details.registration.isFailed).toBe(false)
      expect(details.network.level).toBe('unknown')
      expect(details.network.isAvailable).toBe(false)
      expect(details.ice.isHealthy).toBe(true)
      expect(details.ice.state).toBe('connected')
      expect(details.ice.isRecovering).toBe(false)
      unmount()
    })
  })

  // =============================================================================
  // Health Level Calculation Tests
  // =============================================================================

  describe('Health Level Calculation', () => {
    it('should return offline when transport is disconnected', () => {
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.healthLevel.value).toBe('offline')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return offline when transport connection failed', () => {
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.ConnectionFailed,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.healthLevel.value).toBe('offline')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return critical when registration failed', () => {
      const registration = createMockRegistration({
        hasRegistrationFailed: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      expect(result.healthLevel.value).toBe('critical')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return critical when ICE connection failed', () => {
      const connectionRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceState: 'failed',
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ connectionRecovery: connectionRecovery as any })
      )

      expect(result.healthLevel.value).toBe('critical')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return poor when transport is recovering', () => {
      const transportRecovery = createMockTransportRecovery({
        isRecovering: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('poor')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return poor when ICE is recovering', () => {
      const connectionRecovery = createMockConnectionRecovery({
        isRecovering: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ connectionRecovery: connectionRecovery as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('poor')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return poor when network quality is poor', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'poor',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('poor')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return poor when network quality is critical', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'critical',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('poor')
      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return fair when registering', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Registering,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('fair')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return fair when unregistering', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Unregistering,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('fair')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return fair when network quality is fair', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'fair',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('fair')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return excellent when network quality is excellent', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'excellent',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('excellent')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return good when all conditions are normal', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'good',
        isAvailable: true,
      })
      const transportRecovery = createMockTransportRecovery()
      const registration = createMockRegistration()
      const connectionRecovery = createMockConnectionRecovery()

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          transportRecovery: transportRecovery as any,
          registration: registration as any,
          connectionRecovery: connectionRecovery as any,
        })
      )

      expect(result.healthLevel.value).toBe('good')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })
  })

  // =============================================================================
  // Status Text Tests
  // =============================================================================

  describe('Status Text', () => {
    it('should return "Reconnecting..." when offline and recovering', () => {
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
        isRecovering: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.statusText.value).toBe('Reconnecting...')
      unmount()
    })

    it('should return "Disconnected" when offline and not recovering', () => {
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
        isRecovering: false,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.statusText.value).toBe(CONNECTION_HEALTH_CONSTANTS.STATUS_TEXT.offline)
      unmount()
    })

    it('should return "Registration failed" when critical due to registration', () => {
      const registration = createMockRegistration({
        hasRegistrationFailed: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      expect(result.statusText.value).toBe('Registration failed')
      unmount()
    })

    it('should return "ICE connection failed" when critical due to ICE', () => {
      const connectionRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceState: 'failed',
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ connectionRecovery: connectionRecovery as any })
      )

      expect(result.statusText.value).toBe('ICE connection failed')
      unmount()
    })

    it('should return "Recovering connection..." when poor and recovering', () => {
      const transportRecovery = createMockTransportRecovery({
        isRecovering: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.statusText.value).toBe('Recovering connection...')
      unmount()
    })

    it('should return "Re-registering..." when fair due to registering', () => {
      const registration = createMockRegistration({
        state: RegistrationState.Registering,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.statusText.value).toBe('Re-registering...')
      unmount()
    })
  })

  // =============================================================================
  // Aggregates Multiple Health Signals Tests
  // =============================================================================

  describe('Aggregates Multiple Health Signals', () => {
    it('should aggregate transport, registration, network, and ICE health', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'good',
        isAvailable: true,
      })
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Connected,
      })
      const registration = createMockRegistration({
        state: RegistrationState.Registered,
      })
      const connectionRecovery = createMockConnectionRecovery({
        isHealthy: true,
        iceState: 'connected',
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          transportRecovery: transportRecovery as any,
          registration: registration as any,
          connectionRecovery: connectionRecovery as any,
        })
      )

      const details = result.details.value
      expect(details.transport.isConnected).toBe(true)
      expect(details.registration.isRegistered).toBe(true)
      expect(details.network.level).toBe('good')
      expect(details.ice.isHealthy).toBe(true)
      expect(result.healthLevel.value).toBe('good')
      unmount()
    })

    it('should prioritize offline over other states', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'excellent',
        isAvailable: true,
      })
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })
      const registration = createMockRegistration({
        state: RegistrationState.Registered,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          transportRecovery: transportRecovery as any,
          registration: registration as any,
        })
      )

      expect(result.healthLevel.value).toBe('offline')
      unmount()
    })

    it('should prioritize critical over poor/fair/good', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'excellent',
        isAvailable: true,
      })
      const registration = createMockRegistration({
        hasRegistrationFailed: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          registration: registration as any,
        })
      )

      expect(result.healthLevel.value).toBe('critical')
      unmount()
    })
  })

  // =============================================================================
  // Reactive Updates Tests
  // =============================================================================

  describe('Reactive Updates', () => {
    it('should update health level when transport state changes', async () => {
      const connectionState = ref(ConnectionState.Connected)
      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to disconnected
      connectionState.value = ConnectionState.Disconnected
      await nextTick()

      // Offline is immediate (no debounce)
      expect(result.healthLevel.value).toBe('offline')
      unmount()
    })

    it('should update health level when registration state changes', async () => {
      const regFailed = ref(false)
      const registration = {
        state: computed(() => RegistrationState.Registered),
        isRegistered: computed(() => true),
        hasRegistrationFailed: computed(() => regFailed.value),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to failed
      regFailed.value = true
      await nextTick()

      // Critical is immediate (no debounce)
      expect(result.healthLevel.value).toBe('critical')
      unmount()
    })

    it('should update health level when network quality changes', async () => {
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to poor
      netLevel.value = 'poor'
      await nextTick()

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.healthLevel.value).toBe('poor')
      unmount()
    })

    it('should update health level when ICE health changes', async () => {
      const iceHealthy = ref(true)
      const iceState = ref('connected')
      const connectionRecovery = {
        isHealthy: computed(() => iceHealthy.value),
        iceHealth: computed(() => ({ iceState: iceState.value })),
        isRecovering: computed(() => false),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ connectionRecovery: connectionRecovery as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to failed
      iceHealthy.value = false
      iceState.value = 'failed'
      await nextTick()

      // Critical is immediate (no debounce)
      expect(result.healthLevel.value).toBe('critical')
      unmount()
    })
  })

  // =============================================================================
  // Debounce Behavior Tests
  // =============================================================================

  describe('Debounce Behavior', () => {
    it('should debounce non-critical health level changes', async () => {
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to fair
      netLevel.value = 'fair'
      await nextTick()

      // Should still be good (debounce not elapsed)
      expect(result.healthLevel.value).toBe('good')

      // Advance half the debounce time
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS / 2)
      expect(result.healthLevel.value).toBe('good')

      // Advance past debounce time
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS / 2 + 100)
      expect(result.healthLevel.value).toBe('fair')
      unmount()
    })

    it('should immediately update for critical drops (offline)', async () => {
      const connectionState = ref(ConnectionState.Connected)
      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to disconnected
      connectionState.value = ConnectionState.Disconnected
      await nextTick()

      // Should be offline immediately (no debounce for critical)
      expect(result.healthLevel.value).toBe('offline')
      unmount()
    })

    it('should immediately update for critical drops (critical)', async () => {
      const regFailed = ref(false)
      const registration = {
        state: computed(() => RegistrationState.Registered),
        isRegistered: computed(() => true),
        hasRegistrationFailed: computed(() => regFailed.value),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to failed
      regFailed.value = true
      await nextTick()

      // Should be critical immediately (no debounce for critical)
      expect(result.healthLevel.value).toBe('critical')
      unmount()
    })

    it('should use custom debounce time', async () => {
      const customDebounceMs = 500
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          debounceMs: customDebounceMs,
        })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to fair
      netLevel.value = 'fair'
      await nextTick()

      // Should still be good
      expect(result.healthLevel.value).toBe('good')

      // Advance past custom debounce time
      vi.advanceTimersByTime(customDebounceMs + 100)
      expect(result.healthLevel.value).toBe('fair')
      unmount()
    })

    it('should cancel pending debounce when new change occurs', async () => {
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to fair
      netLevel.value = 'fair'
      await nextTick()

      // Advance half the debounce time
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS / 2)

      // Change to excellent before debounce completes
      netLevel.value = 'excellent'
      await nextTick()

      // Advance past original debounce time
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS / 2 + 100)

      // Should still be good (first change was cancelled)
      expect(result.healthLevel.value).toBe('good')

      // Advance past new debounce time
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS)
      expect(result.healthLevel.value).toBe('excellent')
      unmount()
    })
  })

  // =============================================================================
  // Notification Tests
  // =============================================================================

  describe('Notifications', () => {
    it('should notify on health drop to poor', async () => {
      const notifications = createMockNotifications()
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          notifications: notifications as any,
        })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to poor
      netLevel.value = 'poor'
      await nextTick()

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(notifications.warning).toHaveBeenCalledWith(
        'Connection Quality',
        'Connection quality has degraded'
      )
      unmount()
    })

    it('should notify on health drop to critical', async () => {
      const notifications = createMockNotifications()
      const regFailed = ref(false)
      const registration = {
        state: computed(() => RegistrationState.Registered),
        isRegistered: computed(() => true),
        hasRegistrationFailed: computed(() => regFailed.value),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          registration: registration as any,
          notifications: notifications as any,
        })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to failed
      regFailed.value = true
      await nextTick()

      expect(notifications.error).toHaveBeenCalledWith(
        'Connection Critical',
        'Connection is experiencing critical issues'
      )
      unmount()
    })

    it('should notify on health drop to offline', async () => {
      const notifications = createMockNotifications()
      const connectionState = ref(ConnectionState.Connected)
      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          transportRecovery: transportRecovery as any,
          notifications: notifications as any,
        })
      )

      expect(result.healthLevel.value).toBe('good')

      // Change to disconnected
      connectionState.value = ConnectionState.Disconnected
      await nextTick()

      expect(notifications.error).toHaveBeenCalledWith('Disconnected', 'Connection to server lost')
      unmount()
    })

    it('should notify on recovery from poor/critical/offline to good', async () => {
      const notifications = createMockNotifications()
      const connectionState = ref(ConnectionState.Disconnected)
      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          transportRecovery: transportRecovery as any,
          notifications: notifications as any,
        })
      )

      expect(result.healthLevel.value).toBe('offline')

      // Recover
      connectionState.value = ConnectionState.Connected
      await nextTick()

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(notifications.recovery).toHaveBeenCalledWith(
        'Connection Restored',
        'Connection quality has recovered'
      )
      unmount()
    })

    it('should not notify when notifications option is not provided', async () => {
      const connectionState = ref(ConnectionState.Connected)
      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          transportRecovery: transportRecovery as any,
          // No notifications provided
        })
      )

      // Change to disconnected - should not throw
      connectionState.value = ConnectionState.Disconnected
      await nextTick()

      expect(result.healthLevel.value).toBe('offline')
      unmount()
    })

    it('should not duplicate notifications for same level', async () => {
      const notifications = createMockNotifications()
      const connectionState = ref(ConnectionState.Disconnected)
      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }

      const { unmount } = withSetup(() =>
        useConnectionHealthBar({
          transportRecovery: transportRecovery as any,
          notifications: notifications as any,
        })
      )

      // First offline notification
      expect(notifications.error).toHaveBeenCalledTimes(1)

      // Trigger another change that results in same level
      connectionState.value = ConnectionState.ConnectionFailed
      await nextTick()

      // Should not notify again
      expect(notifications.error).toHaveBeenCalledTimes(1)
      unmount()
    })
  })

  // =============================================================================
  // isHealthy Computed Tests
  // =============================================================================

  describe('isHealthy Computed', () => {
    it('should return true for excellent health', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'excellent',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return true for good health', () => {
      const { result, unmount } = withSetup(() => useConnectionHealthBar())

      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return true for fair health', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'fair',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.isHealthy.value).toBe(true)
      unmount()
    })

    it('should return false for poor health', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'poor',
        isAvailable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return false for critical health', () => {
      const registration = createMockRegistration({
        hasRegistrationFailed: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ registration: registration as any })
      )

      expect(result.isHealthy.value).toBe(false)
      unmount()
    })

    it('should return false for offline health', () => {
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Disconnected,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.isHealthy.value).toBe(false)
      unmount()
    })
  })

  // =============================================================================
  // Color and Icon Tests
  // =============================================================================

  describe('Color and Icon', () => {
    it('should return correct color for each health level', async () => {
      const connectionState = ref(ConnectionState.Connected)
      const regFailed = ref(false)
      const netLevel = ref('good')
      const isRecovering = ref(false)

      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => isRecovering.value),
      }
      const registration = {
        state: computed(() => RegistrationState.Registered),
        isRegistered: computed(() => true),
        hasRegistrationFailed: computed(() => regFailed.value),
      }
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          transportRecovery: transportRecovery as any,
          registration: registration as any,
          networkQuality: networkQuality as any,
        })
      )

      // Good
      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.good)

      // Excellent
      netLevel.value = 'excellent'
      await nextTick()
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)
      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.excellent)

      // Fair
      netLevel.value = 'fair'
      await nextTick()
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)
      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.fair)

      // Poor
      netLevel.value = 'poor'
      await nextTick()
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)
      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.poor)

      // Critical
      netLevel.value = 'good'
      regFailed.value = true
      await nextTick()
      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.critical)

      // Offline
      regFailed.value = false
      connectionState.value = ConnectionState.Disconnected
      await nextTick()
      expect(result.color.value).toBe(CONNECTION_HEALTH_CONSTANTS.COLORS.offline)

      unmount()
    })

    it('should return correct icon for each health level', async () => {
      const connectionState = ref(ConnectionState.Connected)
      const regFailed = ref(false)
      const netLevel = ref('good')

      const transportRecovery = {
        connectionState: computed(() => connectionState.value),
        isRecovering: computed(() => false),
      }
      const registration = {
        state: computed(() => RegistrationState.Registered),
        isRegistered: computed(() => true),
        hasRegistrationFailed: computed(() => regFailed.value),
      }
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          transportRecovery: transportRecovery as any,
          registration: registration as any,
          networkQuality: networkQuality as any,
        })
      )

      // Good
      expect(result.icon.value).toBe(CONNECTION_HEALTH_CONSTANTS.ICONS.good)

      // Excellent
      netLevel.value = 'excellent'
      await nextTick()
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)
      expect(result.icon.value).toBe(CONNECTION_HEALTH_CONSTANTS.ICONS.excellent)

      // Offline
      connectionState.value = ConnectionState.Disconnected
      await nextTick()
      expect(result.icon.value).toBe(CONNECTION_HEALTH_CONSTANTS.ICONS.offline)

      unmount()
    })
  })

  // =============================================================================
  // Cleanup on Dispose Tests
  // =============================================================================

  describe('Cleanup on Dispose', () => {
    it('should cleanup debounce timer on unmount', async () => {
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Trigger a debounced change
      netLevel.value = 'fair'
      await nextTick()

      // Unmount before debounce completes
      unmount()

      // Advance timers - should not throw or cause issues
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      // No assertion needed - just verifying no errors occur
    })

    it('should stop watcher on unmount', async () => {
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      unmount()

      // Change value after unmount - should not cause issues
      netLevel.value = 'poor'
      await nextTick()
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      // No assertion needed - just verifying no errors occur
    })
  })

  // =============================================================================
  // Edge Cases Tests
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle transport in connecting state as connected', () => {
      const transportRecovery = createMockTransportRecovery({
        connectionState: ConnectionState.Connecting,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ transportRecovery: transportRecovery as any })
      )

      expect(result.details.value.transport.isConnected).toBe(true)
      expect(result.healthLevel.value).toBe('good')
      unmount()
    })

    it('should handle network quality unavailable', () => {
      const networkQuality = createMockNetworkQuality({
        level: 'poor',
        isAvailable: false,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Network quality should not affect health when unavailable
      expect(result.healthLevel.value).toBe('good')
      unmount()
    })

    it('should handle ICE unhealthy but not failed state', () => {
      const connectionRecovery = createMockConnectionRecovery({
        isHealthy: false,
        iceState: 'disconnected', // Not 'failed'
      })

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ connectionRecovery: connectionRecovery as any })
      )

      // Should not be critical since ICE state is not 'failed'
      expect(result.healthLevel.value).toBe('good')
      unmount()
    })

    it('should handle rapid state changes', async () => {
      const netLevel = ref('good')
      const networkQuality = {
        indicator: computed(() => ({ level: netLevel.value })),
        isAvailable: computed(() => true),
      }

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({ networkQuality: networkQuality as any })
      )

      // Rapid changes
      netLevel.value = 'fair'
      await nextTick()
      netLevel.value = 'poor'
      await nextTick()
      netLevel.value = 'excellent'
      await nextTick()
      netLevel.value = 'good'
      await nextTick()

      // Wait for debounce
      vi.advanceTimersByTime(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS + 100)

      // Should settle on final value
      expect(result.healthLevel.value).toBe('good')
      unmount()
    })

    it('should handle all options provided', () => {
      const networkQuality = createMockNetworkQuality()
      const connectionRecovery = createMockConnectionRecovery()
      const transportRecovery = createMockTransportRecovery()
      const registration = createMockRegistration()
      const notifications = createMockNotifications()

      const { result, unmount } = withSetup(() =>
        useConnectionHealthBar({
          networkQuality: networkQuality as any,
          connectionRecovery: connectionRecovery as any,
          transportRecovery: transportRecovery as any,
          registration: registration as any,
          notifications: notifications as any,
          debounceMs: 500,
        })
      )

      expect(result.healthLevel.value).toBe('good')
      expect(result.isHealthy.value).toBe(true)
      unmount()
    })
  })
})
