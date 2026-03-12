/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useConnectionHealthBar } from '../useConnectionHealthBar'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import type { UseNetworkQualityIndicatorReturn } from '@/types/call-quality.types'
import type { UseConnectionRecoveryReturn } from '@/types/connection-recovery.types'
import type { UseTransportRecoveryReturn } from './useTransportRecovery'
import type { UseSipRegistrationReturn } from './useSipRegistration'
import type { UseNotificationsReturn } from './useNotifications'

// Mock useSipMetrics
vi.mock('../useSipMetrics', () => ({
  createMetricsEmitter: vi.fn(() => vi.fn()),
  useSipMetrics: vi.fn(() => ({
    onMetrics: vi.fn(() => vi.fn()),
  })),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useConnectionHealthBar', () => {
  let mockNetworkQuality: UseNetworkQualityIndicatorReturn | undefined
  let mockConnectionRecovery: UseConnectionRecoveryReturn | undefined
  let mockTransportRecovery: UseTransportRecoveryReturn | undefined
  let mockRegistration: UseSipRegistrationReturn | undefined
  let _mockNotifications: UseNotificationsReturn | undefined

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks - all healthy
    mockNetworkQuality = {
      indicator: ref({ level: 'excellent' as const, score: 100, rtt: 50 }),
      isAvailable: ref(true),
      isSupported: ref(true),
    }

    mockConnectionRecovery = {
      isHealthy: ref(true),
      isRecovering: ref(false),
      iceHealth: ref({ iceState: 'connected' as const }),
      retryCount: ref(0),
    }

    mockTransportRecovery = {
      connectionState: ref(ConnectionState.Connected),
      isRecovering: ref(false),
    }

    mockRegistration = {
      state: ref(RegistrationState.Registered),
      isRegistered: ref(true),
      hasRegistrationFailed: ref(false),
    }

    _mockNotifications = {
      warning: vi.fn(),
      error: vi.fn(),
      recovery: vi.fn(),
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with excellent health when all components are healthy', () => {
      const { healthLevel, isHealthy, statusText, color, icon } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('excellent')
      expect(isHealthy.value).toBe(true)
      expect(statusText.value).toContain('Excellent')
      expect(color.value).toBe('#22c55e')
      expect(icon.value).toBe('health-excellent')
    })

    it('should initialize with default values when no options provided', () => {
      const { healthLevel, isHealthy, details } = useConnectionHealthBar()

      // Should default to good (assuming transport not connected)
      expect(healthLevel.value).toBeDefined()
      expect(isHealthy.value).toBeDefined()
      expect(details.value).toBeDefined()
    })

    it('should return all required properties', () => {
      const result = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(result.healthLevel).toBeDefined()
      expect(result.statusText).toBeDefined()
      expect(result.color).toBeDefined()
      expect(result.icon).toBeDefined()
      expect(result.isHealthy).toBeDefined()
      expect(result.details).toBeDefined()
    })
  })

  describe('health level calculation', () => {
    it('should return offline when transport is disconnected', () => {
      mockTransportRecovery!.connectionState.value = ConnectionState.Disconnected

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('offline')
    })

    it('should return critical when registration has failed', () => {
      mockRegistration!.hasRegistrationFailed.value = true

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('critical')
    })

    it('should return critical when ICE has failed', () => {
      mockConnectionRecovery!.iceHealth.value = { iceState: 'failed' }
      mockConnectionRecovery!.isHealthy.value = false

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('critical')
    })

    it('should return poor when transport is recovering', () => {
      mockTransportRecovery!.isRecovering.value = true

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('poor')
    })

    it('should return poor when ICE is recovering', () => {
      mockConnectionRecovery!.isRecovering.value = true

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('poor')
    })

    it('should return poor when network quality is poor', () => {
      mockNetworkQuality!.indicator.value = { level: 'poor', score: 20, rtt: 500 }

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('poor')
    })

    it('should return poor when network quality is critical', () => {
      mockNetworkQuality!.indicator.value = { level: 'critical' as const, score: 5, rtt: 1000 }

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('poor')
    })

    it('should return fair when registration is in progress', () => {
      mockRegistration!.state.value = RegistrationState.Registering

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('fair')
    })

    it('should return fair when registration is unregistering', () => {
      mockRegistration!.state.value = RegistrationState.Unregistering

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('fair')
    })

    it('should return fair when network quality is fair', () => {
      mockNetworkQuality!.indicator.value = { level: 'fair', score: 60, rtt: 150 }

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('fair')
    })

    it('should return good when network quality is good', () => {
      mockNetworkQuality!.indicator.value = { level: 'good', score: 80, rtt: 80 }

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('good')
    })

    it('should return good when network is unavailable but everything else is connected', () => {
      mockNetworkQuality!.isAvailable.value = false
      mockNetworkQuality!.indicator.value = { level: 'unknown', score: 0, rtt: 0 }

      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBe('good')
    })
  })

  describe('isHealthy computed', () => {
    it('should return true for excellent level', () => {
      mockNetworkQuality!.indicator.value = { level: 'excellent', score: 100, rtt: 50 }

      const { isHealthy } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(isHealthy.value).toBe(true)
    })

    it('should return true for good level', () => {
      mockNetworkQuality!.indicator.value = { level: 'good', score: 80, rtt: 80 }

      const { isHealthy } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(isHealthy.value).toBe(true)
    })

    it('should return true for fair level', () => {
      mockNetworkQuality!.indicator.value = { level: 'fair', score: 60, rtt: 150 }

      const { isHealthy } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(isHealthy.value).toBe(true)
    })

    it('should return false for poor level', () => {
      mockNetworkQuality!.indicator.value = { level: 'poor', score: 20, rtt: 500 }

      const { isHealthy } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(isHealthy.value).toBe(false)
    })

    it('should return false for critical level', () => {
      mockRegistration!.hasRegistrationFailed.value = true

      const { isHealthy } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(isHealthy.value).toBe(false)
    })

    it('should return false for offline level', () => {
      mockTransportRecovery!.connectionState.value = ConnectionState.Disconnected

      const { isHealthy } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(isHealthy.value).toBe(false)
    })
  })

  describe('details computed', () => {
    it('should reflect transport state in details', () => {
      mockTransportRecovery!.connectionState.value = ConnectionState.Connecting

      const { details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(details.value.transport.state).toBe(ConnectionState.Connecting)
      expect(details.value.transport.isConnected).toBe(true) // Connecting counts as connected
    })

    it('should reflect registration state in details', () => {
      mockRegistration!.state.value = RegistrationState.Registering
      mockRegistration!.isRegistered.value = false

      const { details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(details.value.registration.state).toBe(RegistrationState.Registering)
      expect(details.value.registration.isRegistered).toBe(false)
    })

    it('should reflect network state in details', () => {
      mockNetworkQuality!.indicator.value = { level: 'poor', score: 20, rtt: 500 }
      mockNetworkQuality!.isAvailable.value = true

      const { details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(details.value.network.level).toBe('poor')
      expect(details.value.network.isAvailable).toBe(true)
    })

    it('should reflect ICE state in details', () => {
      mockConnectionRecovery!.isHealthy.value = false
      mockConnectionRecovery!.iceHealth.value = { iceState: 'checking' }
      mockConnectionRecovery!.isRecovering.value = true

      const { details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(details.value.ice.isHealthy).toBe(false)
      expect(details.value.ice.state).toBe('checking')
      expect(details.value.ice.isRecovering).toBe(true)
    })
  })

  describe('statusText computed', () => {
    it('should show "Reconnecting..." when offline and recovering', () => {
      mockTransportRecovery!.connectionState.value = ConnectionState.Disconnected
      mockTransportRecovery!.isRecovering.value = true

      const { statusText } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(statusText.value).toBe('Reconnecting...')
    })

    it('should show "Disconnected" when offline and not recovering', () => {
      mockTransportRecovery!.connectionState.value = ConnectionState.Disconnected

      const { statusText } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(statusText.value).toBe('Disconnected')
    })

    it('should show "Registration failed" when registration has failed', () => {
      mockRegistration!.hasRegistrationFailed.value = true

      const { statusText } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(statusText.value).toBe('Registration failed')
    })

    it('should show "ICE connection failed" when ICE has failed', () => {
      mockConnectionRecovery!.iceHealth.value = { iceState: 'failed' }
      mockConnectionRecovery!.isHealthy.value = false

      const { statusText } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(statusText.value).toBe('ICE connection failed')
    })

    it('should show "Recovering connection..." when recovering', () => {
      mockTransportRecovery!.isRecovering.value = true

      const { statusText } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(statusText.value).toBe('Recovering connection...')
    })

    it('should show "Re-registering..." when registering', () => {
      mockRegistration!.state.value = RegistrationState.Registering

      const { statusText } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(statusText.value).toBe('Re-registering...')
    })
  })

  describe('color computed', () => {
    it('should return correct color for excellent', () => {
      mockNetworkQuality!.indicator.value = { level: 'excellent', score: 100, rtt: 50 }

      const { color } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(color.value).toBe('#22c55e')
    })

    it('should return correct color for good', () => {
      mockNetworkQuality!.indicator.value = { level: 'good', score: 80, rtt: 80 }

      const { color } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(color.value).toBe('#84cc16')
    })

    it('should return correct color for fair', () => {
      mockNetworkQuality!.indicator.value = { level: 'fair', score: 60, rtt: 150 }

      const { color } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(color.value).toBe('#eab308')
    })

    it('should return correct color for poor', () => {
      mockNetworkQuality!.indicator.value = { level: 'poor', score: 20, rtt: 500 }

      const { color } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(color.value).toBe('#f97316')
    })

    it('should return correct color for critical', () => {
      mockRegistration!.hasRegistrationFailed.value = true

      const { color } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(color.value).toBe('#ef4444')
    })

    it('should return correct color for offline', () => {
      mockTransportRecovery!.connectionState.value = ConnectionState.Disconnected

      const { color } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(color.value).toBe('#6b7280')
    })
  })

  describe('icon computed', () => {
    it('should return correct icon for each health level', () => {
      const testCases: Array<{ level: string; expectedIcon: string; setup: () => void }> = [
        {
          level: 'excellent',
          expectedIcon: 'health-excellent',
          setup: () => {
            mockNetworkQuality!.indicator.value = { level: 'excellent', score: 100, rtt: 50 }
          },
        },
        {
          level: 'good',
          expectedIcon: 'health-good',
          setup: () => {
            mockNetworkQuality!.indicator.value = { level: 'good', score: 80, rtt: 80 }
          },
        },
        {
          level: 'fair',
          expectedIcon: 'health-fair',
          setup: () => {
            mockNetworkQuality!.indicator.value = { level: 'fair', score: 60, rtt: 150 }
          },
        },
        {
          level: 'poor',
          expectedIcon: 'health-poor',
          setup: () => {
            mockNetworkQuality!.indicator.value = { level: 'poor', score: 20, rtt: 500 }
          },
        },
        {
          level: 'critical',
          expectedIcon: 'health-critical',
          setup: () => {
            mockRegistration!.hasRegistrationFailed.value = true
          },
        },
        {
          level: 'offline',
          expectedIcon: 'health-offline',
          setup: () => {
            mockTransportRecovery!.connectionState.value = ConnectionState.Disconnected
          },
        },
      ]

      for (const tc of testCases) {
        tc.setup()
        const { icon } = useConnectionHealthBar({
          networkQuality: mockNetworkQuality,
          connectionRecovery: mockConnectionRecovery,
          transportRecovery: mockTransportRecovery,
          registration: mockRegistration,
        })
        expect(icon.value).toBe(tc.expectedIcon)
      }
    })
  })

  describe('debounce behavior', () => {
    it('should accept custom debounceMs option', () => {
      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
        debounceMs: 500,
      })

      expect(healthLevel.value).toBeDefined()
    })

    it('should use default debounce when not specified', () => {
      const { healthLevel } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      // Should initialize properly with default debounce
      expect(healthLevel.value).toBeDefined()
    })
  })

  describe('options handling', () => {
    it('should handle missing networkQuality', () => {
      const { healthLevel, details } = useConnectionHealthBar({
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBeDefined()
      expect(details.value.network.level).toBe('unknown')
      expect(details.value.network.isAvailable).toBe(false)
    })

    it('should handle missing connectionRecovery', () => {
      const { healthLevel, details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        transportRecovery: mockTransportRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBeDefined()
      expect(details.value.ice.isHealthy).toBe(true) // Default to healthy
    })

    it('should handle missing transportRecovery', () => {
      const { healthLevel, details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        registration: mockRegistration,
      })

      expect(healthLevel.value).toBeDefined()
      expect(details.value.transport.state).toBe(ConnectionState.Connected) // Default
    })

    it('should handle missing registration', () => {
      const { healthLevel, details } = useConnectionHealthBar({
        networkQuality: mockNetworkQuality,
        connectionRecovery: mockConnectionRecovery,
        transportRecovery: mockTransportRecovery,
      })

      expect(healthLevel.value).toBeDefined()
      expect(details.value.registration.isRegistered).toBe(true) // Default to registered
      expect(details.value.registration.isFailed).toBe(false)
    })
  })
})
