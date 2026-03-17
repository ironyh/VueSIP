/**
 * Tests for usePushNotifications composable
 * @module composables/__tests__/usePushNotifications.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePushNotifications, type PushPermissionStatus } from '../usePushNotifications'

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock env utilities
vi.mock('../../utils/env', () => ({
  isPWA: vi.fn(),
  isServiceWorkerSupported: vi.fn(),
}))

import { isPWA, isServiceWorkerSupported } from '../../utils/env'

describe('usePushNotifications', () => {
  let mockServiceWorkerRegister: ReturnType<typeof vi.fn>
  let mockServiceWorkerGetRegistration: ReturnType<typeof vi.fn>
  let mockPushManagerGetSubscription: ReturnType<typeof vi.fn>
  let mockPushManagerSubscribe: ReturnType<typeof vi.fn>
  let mockAddEventListener: ReturnType<typeof vi.fn>
  let mockShowNotification: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset env mocks to default
    vi.mocked(isPWA).mockReturnValue(true)
    vi.mocked(isServiceWorkerSupported).mockReturnValue(true)

    // Create mock functions
    mockAddEventListener = vi.fn()
    mockPushManagerGetSubscription = vi.fn()
    mockPushManagerSubscribe = vi.fn()
    mockShowNotification = vi.fn()

    const mockRegistration = {
      scope: '/',
      active: { scriptURL: '/sw.js', state: 'activated' },
      installing: null,
      pushManager: {
        getSubscription: mockPushManagerGetSubscription,
        subscribe: mockPushManagerSubscribe,
      },
      addEventListener: mockAddEventListener,
      showNotification: mockShowNotification,
    }

    mockServiceWorkerRegister = vi.fn().mockResolvedValue(mockRegistration)
    mockServiceWorkerGetRegistration = vi.fn().mockResolvedValue(mockRegistration)

    // Mock navigator.serviceWorker
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: mockServiceWorkerRegister,
          getRegistration: mockServiceWorkerGetRegistration,
        },
        permissions: {
          query: vi.fn(),
        },
      },
      writable: true,
    })

    // Mock Notification
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default' as PushPermissionStatus,
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should report isSupported based on service worker support', () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(true)
      const { isSupported } = usePushNotifications()
      expect(isSupported.value).toBe(true)
    })

    it('should report isSupported as false when service workers not supported', () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false)
      const { isSupported } = usePushNotifications()
      expect(isSupported.value).toBe(false)
    })

    it('should report isInPWA based on PWA detection', () => {
      vi.mocked(isPWA).mockReturnValue(true)
      const { isInPWA } = usePushNotifications()
      expect(isInPWA.value).toBe(true)
    })

    it('should report isInPWA as false when not in PWA mode', () => {
      vi.mocked(isPWA).mockReturnValue(false)
      const { isInPWA } = usePushNotifications()
      expect(isInPWA.value).toBe(false)
    })

    it('should start with default permission status', () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(true)
      const { permissionStatus } = usePushNotifications()
      expect(permissionStatus.value).toBe('default')
    })

    it('should start with isAvailable as false (permission not granted)', () => {
      const { isAvailable } = usePushNotifications()
      expect(isAvailable.value).toBe(false)
    })

    it('should start with null registration and subscription', () => {
      const { registration, subscription } = usePushNotifications()
      expect(registration.value).toBeNull()
      expect(subscription.value).toBeNull()
    })

    it('should start with no error', () => {
      const { error } = usePushNotifications()
      expect(error.value).toBeNull()
    })

    it('should start not initializing', () => {
      const { isInitializing } = usePushNotifications()
      expect(isInitializing.value).toBe(false)
    })
  })

  describe('requestPermission', () => {
    it('should request notification permission', async () => {
      const { requestPermission } = usePushNotifications()

      const result = await requestPermission()

      expect(result).toBe('granted')
      expect(global.Notification.requestPermission).toHaveBeenCalled()
    })

    it('should return denied when service workers not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false)
      const { requestPermission, error } = usePushNotifications()

      const result = await requestPermission()

      expect(result).toBe('denied')
      expect(error.value).toContain('not supported')
    })
  })

  describe('initialize', () => {
    it('should register service worker successfully', async () => {
      const { initialize, registration, isInitializing } = usePushNotifications()

      const result = await initialize()

      expect(result).toBe(true)
      expect(mockServiceWorkerRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' })
      expect(registration.value).not.toBeNull()
      expect(registration.value?.scope).toBe('/')
      expect(isInitializing.value).toBe(false)
    })

    it('should add push and notification click listeners', async () => {
      const onPush = vi.fn()
      const onNotificationClick = vi.fn()
      const { initialize } = usePushNotifications({
        onPush,
        onNotificationClick,
      })

      await initialize()

      expect(mockAddEventListener).toHaveBeenCalledWith('push', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('notificationclick', expect.any(Function))
    })

    it('should handle existing subscription', async () => {
      const existingSub = {
        endpoint: 'https://example.com/push',
        expirationTime: null,
        toJSON: () => ({
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        }),
        unsubscribe: vi.fn().mockResolvedValue(true),
      }
      mockPushManagerGetSubscription.mockResolvedValue(existingSub)

      const { initialize, subscription } = usePushNotifications()

      await initialize()

      expect(subscription.value).not.toBeNull()
      expect(subscription.value?.endpoint).toBe('https://example.com/push')
    })

    it('should set error when service workers not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false)
      const { initialize, error } = usePushNotifications()

      const result = await initialize()

      expect(result).toBe(false)
      expect(error.value).toContain('not supported')
    })

    it('should handle registration failure', async () => {
      mockServiceWorkerRegister.mockRejectedValue(new Error('Registration failed'))

      const { initialize, error } = usePushNotifications()

      const result = await initialize()

      expect(result).toBe(false)
      expect(error.value).toContain('Registration failed')
    })
  })

  describe('subscribe', () => {
    it('should return null when not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false)
      const { subscribe, error } = usePushNotifications()

      const result = await subscribe()

      expect(result).toBeNull()
      expect(error.value).toContain('not supported')
    })

    it('should initialize first if not already initialized', async () => {
      global.Notification.permission = 'granted'
      mockPushManagerSubscribe.mockResolvedValue({
        endpoint: 'https://example.com/push',
        expirationTime: null,
        toJSON: () => ({
          keys: { p256dh: 'key', auth: 'auth' },
        }),
      })

      const { subscribe, subscription } = usePushNotifications()

      const result = await subscribe()

      expect(result).not.toBeNull()
      expect(subscription.value?.endpoint).toBe('https://example.com/push')
    })

    it('should request permission if not granted', async () => {
      global.Notification.permission = 'default'
      mockPushManagerSubscribe.mockResolvedValue({
        endpoint: 'https://example.com/push',
        expirationTime: null,
        toJSON: () => ({
          keys: { p256dh: 'key', auth: 'auth' },
        }),
      })

      const { subscribe } = usePushNotifications()

      await subscribe()

      expect(global.Notification.requestPermission).toHaveBeenCalled()
    })
  })

  describe('unsubscribe', () => {
    it('should return true when no registration exists', async () => {
      mockServiceWorkerGetRegistration.mockResolvedValue(null)

      const { unsubscribe } = usePushNotifications()

      const result = await unsubscribe()

      expect(result).toBe(true)
    })

    it('should return true when no subscription exists', async () => {
      mockPushManagerGetSubscription.mockResolvedValue(null)

      const { unsubscribe, subscription } = usePushNotifications()

      const result = await unsubscribe()

      expect(result).toBe(true)
      expect(subscription.value).toBeNull()
    })

    it('should unsubscribe successfully when subscription exists', async () => {
      const mockSub = {
        unsubscribe: vi.fn().mockResolvedValue(true),
      }
      mockPushManagerGetSubscription.mockResolvedValue(mockSub)

      const { unsubscribe, subscription } = usePushNotifications()

      const result = await unsubscribe()

      expect(result).toBe(true)
      expect(mockSub.unsubscribe).toHaveBeenCalled()
      expect(subscription.value).toBeNull()
    })
  })

  describe('isAvailable computed', () => {
    it('should be true when PWA, supported, and permission granted', () => {
      vi.mocked(isPWA).mockReturnValue(true)
      vi.mocked(isServiceWorkerSupported).mockReturnValue(true)
      global.Notification.permission = 'granted'

      const { isAvailable } = usePushNotifications()

      expect(isAvailable.value).toBe(true)
    })

    it('should be false when not in PWA', () => {
      vi.mocked(isPWA).mockReturnValue(false)
      global.Notification.permission = 'granted'

      const { isAvailable } = usePushNotifications()

      expect(isAvailable.value).toBe(false)
    })

    it('should be false when permission denied', () => {
      global.Notification.permission = 'denied'

      const { isAvailable } = usePushNotifications()

      expect(isAvailable.value).toBe(false)
    })
  })
})
