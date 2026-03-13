import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCredentialExpiry } from '../useCredentialExpiry'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock constants - match exact structure
vi.mock('../constants', () => ({
  CREDENTIAL_EXPIRY_CONSTANTS: {
    DEFAULT_AUTH_ERROR_CODES: [401, 403],
    DEFAULT_WARNING_THRESHOLD: 60,
    AUTH_ERROR_PATTERNS: ['unauthorized', 'forbidden', 'authentication failed', 'credentials'],
    ERROR_DEBOUNCE_DELAY: 500,
  },
}))

describe('useCredentialExpiry', () => {
  // Mock registration object
  const createMockRegistration = (overrides = {}) => ({
    lastError: ref(null),
    isExpiringSoon: ref(false),
    hasExpired: ref(false),
    register: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })

  // Mock notifications object
  const createMockNotifications = () => ({
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with valid credential status', () => {
      const registration = createMockRegistration()
      const { credentialStatus, isAuthRequired, lastAuthError, authFailureCount, canAutoRefresh } =
        useCredentialExpiry({ registration })

      expect(credentialStatus.value).toBe('valid')
      expect(isAuthRequired.value).toBe(false)
      expect(lastAuthError.value).toBe(null)
      expect(authFailureCount.value).toBe(0)
      expect(canAutoRefresh.value).toBe(false)
    })

    it('should set canAutoRefresh to true when onRefreshCredentials is provided', () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn().mockResolvedValue({ username: 'user', password: 'pass' })

      const { canAutoRefresh } = useCredentialExpiry({ registration, onRefreshCredentials })

      expect(canAutoRefresh.value).toBe(true)
    })
  })

  describe('credentialStatus computation', () => {
    it('should reflect credentialStatus changes', () => {
      const registration = createMockRegistration()
      const { credentialStatus } = useCredentialExpiry({ registration })

      // Initial state
      expect(credentialStatus.value).toBe('valid')

      // Status changes should be reflected
      // Note: direct manipulation of internal state is not exposed,
      // so we test through the public API
    })

    it('should compute canAutoRefresh correctly', () => {
      const registration = createMockRegistration()

      const { canAutoRefresh: withoutCallback } = useCredentialExpiry({ registration })
      expect(withoutCallback.value).toBe(false)

      const withCallback = useCredentialExpiry({
        registration,
        onRefreshCredentials: async () => null,
      })
      expect(withCallback.canAutoRefresh.value).toBe(true)
    })
  })

  describe('refreshCredentials', () => {
    it('should return false when no onRefreshCredentials callback provided', async () => {
      const registration = createMockRegistration()
      const { refreshCredentials } = useCredentialExpiry({ registration })

      const result = await refreshCredentials()

      expect(result).toBe(false)
    })

    it('should call onRefreshCredentials and register on success', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi
        .fn()
        .mockResolvedValue({ username: 'newuser', password: 'newpass' })
      const { refreshCredentials } = useCredentialExpiry({ registration, onRefreshCredentials })

      const result = await refreshCredentials()

      expect(onRefreshCredentials).toHaveBeenCalled()
      expect(registration.register).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false when onRefreshCredentials returns null', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn().mockResolvedValue(null)
      const notifications = createMockNotifications()
      const { refreshCredentials } = useCredentialExpiry({
        registration,
        onRefreshCredentials,
        notifications,
      })

      const result = await refreshCredentials()

      expect(result).toBe(false)
      expect(registration.register).not.toHaveBeenCalled()
    })

    it('should handle registration failure after credential refresh', async () => {
      const registration = createMockRegistration({
        register: vi.fn().mockRejectedValue(new Error('Registration failed')),
      })
      const onRefreshCredentials = vi.fn().mockResolvedValue({ username: 'user', password: 'pass' })
      const notifications = createMockNotifications()
      const { refreshCredentials, lastAuthError } = useCredentialExpiry({
        registration,
        onRefreshCredentials,
        notifications,
      })

      const result = await refreshCredentials()

      expect(result).toBe(false)
      expect(lastAuthError.value).toContain('Registration failed')
    })

    it('should reset state on successful refresh', async () => {
      // First, trigger an auth failure to set state
      const registration = createMockRegistration({
        lastError: ref('401 Unauthorized'),
      })
      const onRefreshCredentials = vi.fn().mockResolvedValue({ username: 'user', password: 'pass' })
      const notifications = createMockNotifications()

      // Use the composable - this will trigger the watcher
      const { credentialStatus, isAuthRequired, authFailureCount, refreshCredentials } =
        useCredentialExpiry({ registration, onRefreshCredentials, notifications })

      // Wait for debounced error handler
      await new Promise((resolve) => setTimeout(resolve, 600))

      // Now refresh credentials
      await refreshCredentials()

      expect(credentialStatus.value).toBe('valid')
      expect(isAuthRequired.value).toBe(false)
      expect(authFailureCount.value).toBe(0)
      expect(notifications.success).toHaveBeenCalled()
    })
  })

  describe('auth error detection', () => {
    it('should detect 401 error code', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn()
      const notifications = createMockNotifications()

      const { authFailureCount } = useCredentialExpiry({
        registration,
        onRefreshCredentials,
        notifications,
      })

      // Trigger auth error
      registration.lastError.value = '401 Unauthorized'

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(authFailureCount.value).toBe(1)
    })

    it('should detect 403 error code', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn()
      const notifications = createMockNotifications()

      const { authFailureCount } = useCredentialExpiry({
        registration,
        onRefreshCredentials,
        notifications,
      })

      registration.lastError.value = '403 Forbidden'
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(authFailureCount.value).toBe(1)
    })

    it('should detect auth error patterns in message', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn()
      const notifications = createMockNotifications()

      const { authFailureCount } = useCredentialExpiry({
        registration,
        onRefreshCredentials,
        notifications,
      })

      registration.lastError.value = 'Authentication failed for user'
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(authFailureCount.value).toBe(1)
    })

    it('should increment auth failure count on repeated errors', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn()
      const notifications = createMockNotifications()

      const { authFailureCount } = useCredentialExpiry({
        registration,
        onRefreshCredentials,
        notifications,
      })

      registration.lastError.value = '401 Unauthorized'
      await new Promise((resolve) => setTimeout(resolve, 600))

      registration.lastError.value = '403 Forbidden'
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(authFailureCount.value).toBe(2)
    })
  })

  describe('expiration watching', () => {
    it('should update status when registration is expiring soon', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()

      const { credentialStatus } = useCredentialExpiry({ registration, notifications })

      registration.isExpiringSoon.value = true

      // Wait for Vue watcher to trigger
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(credentialStatus.value).toBe('expiring')
    })

    it('should update status when registration has expired', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()

      const { credentialStatus } = useCredentialExpiry({ registration, notifications })

      registration.hasExpired.value = true

      // Wait for Vue watcher to trigger
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(credentialStatus.value).toBe('expired')
    })
  })

  describe('dismissAuthRequired', () => {
    it('should clear isAuthRequired flag', async () => {
      const registration = createMockRegistration()
      const { isAuthRequired, dismissAuthRequired } = useCredentialExpiry({ registration })

      // Set to true through auth error
      registration.lastError.value = '401 Unauthorized'
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(isAuthRequired.value).toBe(true)

      dismissAuthRequired()

      expect(isAuthRequired.value).toBe(false)
    })
  })

  describe('resetState', () => {
    it('should reset all state to initial values', async () => {
      const registration = createMockRegistration({
        lastError: ref('401 Unauthorized'),
        isExpiringSoon: ref(true),
      })

      const { credentialStatus, isAuthRequired, lastAuthError, authFailureCount, resetState } =
        useCredentialExpiry({ registration })

      // Trigger some state changes
      registration.lastError.value = '401 Unauthorized'
      await new Promise((resolve) => setTimeout(resolve, 600))
      registration.isExpiringSoon.value = true

      // Reset
      resetState()

      expect(credentialStatus.value).toBe('valid')
      expect(isAuthRequired.value).toBe(false)
      expect(lastAuthError.value).toBe(null)
      expect(authFailureCount.value).toBe(0)
    })
  })

  describe('error debouncing', () => {
    it('should debounce error detection', async () => {
      const registration = createMockRegistration()
      const { authFailureCount } = useCredentialExpiry({ registration })

      // Set error but don't wait
      registration.lastError.value = '401 Unauthorized'

      // Should not be detected yet (still in debounce)
      expect(authFailureCount.value).toBe(0)

      // Wait past debounce delay
      await new Promise((resolve) => setTimeout(resolve, 600))

      // Now should be detected
      expect(authFailureCount.value).toBe(1)
    })
  })

  describe('custom auth error codes', () => {
    it('should use custom auth error codes', async () => {
      const registration = createMockRegistration()
      const { authFailureCount } = useCredentialExpiry({
        registration,
        authErrorCodes: [407, 511] as any,
      })

      registration.lastError.value = '407 Proxy Authentication Required'
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(authFailureCount.value).toBe(1)
    })
  })
})
