/**
 * usePushNotifications unit tests
 *
 * @module tests/unit/composables/usePushNotifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock global objects
const _mockServiceWorkerRegistration = {
  scope: '/',
  scriptURL: '/sw.js',
  active: {
    scriptURL: '/sw.js',
    state: 'activated',
  },
  installing: null,
}

const _mockPushSubscription = {
  endpoint: 'https://example.com/push',
  expirationTime: null,
  toJSON: () => ({
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  }),
}

describe('usePushNotifications', () => {
  beforeEach(() => {
    // Reset modules to clear any cached state
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should export correct types', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    expect(typeof usePushNotifications).toBe('function')
  })

  it('should have correct function signature', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const result = usePushNotifications()
    expect(result).toHaveProperty('isInPWA')
    expect(result).toHaveProperty('isSupported')
    expect(result).toHaveProperty('permissionStatus')
    expect(result).toHaveProperty('isAvailable')
    expect(result).toHaveProperty('initialize')
    expect(result).toHaveProperty('requestPermission')
    expect(result).toHaveProperty('subscribe')
    expect(result).toHaveProperty('unsubscribe')
    expect(result).toHaveProperty('showNotification')
  })

  it('should return correct initial state', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const {
      isInPWA,
      isSupported,
      permissionStatus,
      isAvailable,
      isInitializing,
      error,
      registration,
      subscription,
    } = usePushNotifications()

    expect(isInPWA.value).toBeDefined()
    expect(isSupported.value).toBeDefined()
    expect(permissionStatus.value).toBeDefined()
    expect(isAvailable.value).toBeDefined()
    expect(isInitializing.value).toBe(false)
    expect(error.value).toBeNull()
    expect(registration.value).toBeNull()
    expect(subscription.value).toBeNull()
  })

  it('should accept custom service worker path', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const customPath = '/custom-sw.js'
    const { initialize } = usePushNotifications({
      serviceWorkerPath: customPath,
    })

    expect(initialize).toBeDefined()
    expect(typeof initialize).toBe('function')
  })

  it('should accept onPush callback', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const pushHandler = vi.fn()
    const { initialize } = usePushNotifications({
      onPush: pushHandler,
    })

    expect(initialize).toBeDefined()
  })

  it('should accept onNotificationClick callback', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const clickHandler = vi.fn()
    const { initialize } = usePushNotifications({
      onNotificationClick: clickHandler,
    })

    expect(initialize).toBeDefined()
  })
})

describe('PushPermissionStatus type', () => {
  it('should allow valid permission values', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const { permissionStatus } = usePushNotifications()

    // Valid values are: 'default', 'granted', 'denied'
    const validValues = ['default', 'granted', 'denied']
    expect(validValues).toContain(permissionStatus.value)
  })
})

describe('UsePushNotificationsReturn interface', () => {
  it('should have all required methods', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const result = usePushNotifications()

    // Check all methods exist and are functions
    expect(result.initialize).toBeInstanceOf(Function)
    expect(result.requestPermission).toBeInstanceOf(Function)
    expect(result.subscribe).toBeInstanceOf(Function)
    expect(result.unsubscribe).toBeInstanceOf(Function)
    expect(result.showNotification).toBeInstanceOf(Function)
  })

  it('should have all required computed refs', async () => {
    const { usePushNotifications } = await import('@/composables/usePushNotifications')

    const result = usePushNotifications()

    // Check computed refs
    expect(result.isInPWA).toBeDefined()
    expect(result.isSupported).toBeDefined()
    expect(result.permissionStatus).toBeDefined()
    expect(result.isAvailable).toBeDefined()
    expect(result.registration).toBeDefined()
    expect(result.subscription).toBeDefined()
    expect(result.isInitializing).toBeDefined()
    expect(result.error).toBeDefined()
  })
})
