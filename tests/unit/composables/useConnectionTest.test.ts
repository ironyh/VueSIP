import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useConnectionTest } from '@/composables/useConnectionTest'
import { PermissionStatus } from '@/types/media.types'
import { RegistrationState } from '@/types/sip.types'
import { registrationStore } from '@/stores/registrationStore'
import { useSipAccountManager } from '@/composables/useSipAccountManager'

// Mock the dependencies
vi.mock('@/composables/useMediaPermissions', () => ({
  useMediaPermissions: vi.fn(() => ({
    checkAudioPermission: vi.fn(),
    checkVideoPermission: vi.fn(),
  })),
}))

vi.mock('@/composables/useSipAccountManager')

vi.mock('@/stores/registrationStore', () => ({
  registrationStore: {
    state: 'unregistered',
    reset: vi.fn(),
  },
}))

describe('useConnectionTest', () => {
  let composable: ReturnType<typeof useConnectionTest>

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset registration store state
    const mockRegistrationStore = registrationStore as any
    mockRegistrationStore.state = RegistrationState.Unregistered

    // Reset mock
    ;(useSipAccountManager as any).mockReturnValue({
      enabledAccounts: [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should not be running initially', () => {
      composable = useConnectionTest()
      expect(composable.isRunning.value).toBe(false)
    })

    it('should have null lastResults initially', () => {
      composable = useConnectionTest()
      expect(composable.lastResults.value).toBeNull()
    })

    it('should not be ready for calls initially', () => {
      composable = useConnectionTest()
      expect(composable.isReadyForCalls.value).toBe(false)
    })

    it('should have default status message when no test run', () => {
      composable = useConnectionTest()
      expect(composable.statusMessage.value).toBe(
        'No diagnostics run. Run test to check connection status.'
      )
    })
  })

  describe('testNetworkConnectivity', () => {
    it('should pass when online', async () => {
      composable = useConnectionTest()

      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      })

      const result = await composable.testNetworkConnectivity()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('Network Connection')
      expect(result.message).toBe('Internet connection active')
    })

    it('should fail when offline', async () => {
      composable = useConnectionTest()

      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true,
      })

      const result = await composable.testNetworkConnectivity()

      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
      expect(result.message).toBe('No internet connection')
    })
  })

  describe('testAudioPermission', () => {
    it('should pass when audio permission granted', async () => {
      const { useMediaPermissions } = await import('@/composables/useMediaPermissions')
      const mockCheckAudioPermission = vi.fn().mockResolvedValue({
        granted: true,
        status: 'granted',
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: mockCheckAudioPermission,
        checkVideoPermission: vi.fn(),
      })

      composable = useConnectionTest()
      const result = await composable.testAudioPermission()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('Microphone')
    })

    it('should fail when audio permission denied', async () => {
      const { useMediaPermissions } = await import('@/composables/useMediaPermissions')
      const mockCheckAudioPermission = vi.fn().mockResolvedValue({
        granted: false,
        status: PermissionStatus.Denied,
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: mockCheckAudioPermission,
        checkVideoPermission: vi.fn(),
      })

      composable = useConnectionTest()
      const result = await composable.testAudioPermission()

      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
    })
  })

  describe('testVideoPermission', () => {
    it('should pass when video permission granted', async () => {
      const { useMediaPermissions } = await import('@/composables/useMediaPermissions')
      const mockCheckVideoPermission = vi.fn().mockResolvedValue({
        granted: true,
        status: 'granted',
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn(),
        checkVideoPermission: mockCheckVideoPermission,
      })

      composable = useConnectionTest()
      const result = await composable.testVideoPermission()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('Camera')
    })

    it('should pass with warning when video permission not granted (optional)', async () => {
      const { useMediaPermissions } = await import('@/composables/useMediaPermissions')
      const mockCheckVideoPermission = vi.fn().mockResolvedValue({
        granted: false,
        status: PermissionStatus.Prompt,
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn(),
        checkVideoPermission: mockCheckVideoPermission,
      })

      composable = useConnectionTest()
      const result = await composable.testVideoPermission()

      // Video is optional, so it passes even without permission
      expect(result.passed).toBe(true)
      expect(result.severity).toBe('warning')
    })
  })

  describe('testSipRegistration', () => {
    it('should fail when no SIP accounts configured', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [],
      })

      composable = useConnectionTest()
      const result = await composable.testSipRegistration()

      expect(result.passed).toBe(false)
      expect(result.name).toBe('SIP Registration')
      expect(result.message).toBe('No SIP account configured')
      expect(result.severity).toBe('error')
    })

    it('should pass when SIP is registered', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [{ id: '1', enabled: true }],
      })

      const mockRegistrationStore = registrationStore as any
      mockRegistrationStore.state = RegistrationState.Registered

      composable = useConnectionTest()
      const result = await composable.testSipRegistration()

      expect(result.passed).toBe(true)
      expect(result.message).toBe('SIP account registered and ready')
    })

    it('should warn when SIP is registering', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [{ id: '1', enabled: true }],
      })

      const mockRegistrationStore = registrationStore as any
      mockRegistrationStore.state = RegistrationState.Registering

      composable = useConnectionTest()
      const result = await composable.testSipRegistration()

      expect(result.passed).toBe(false)
      expect(result.severity).toBe('warning')
      expect(result.message).toBe('Registering...')
    })

    it('should fail when SIP is not registered', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [{ id: '1', enabled: true }],
      })

      const mockRegistrationStore = registrationStore as any
      mockRegistrationStore.state = RegistrationState.Failed

      composable = useConnectionTest()
      const result = await composable.testSipRegistration()

      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
      expect(result.message).toBe('SIP account not registered')
    })
  })

  describe('testTurnConnectivity', () => {
    it('should pass when no TURN configured (optional)', async () => {
      composable = useConnectionTest()
      const result = await composable.testTurnConnectivity()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('TURN Connection')
      expect(result.severity).toBe('info')
    })
  })

  describe('runFullTest', () => {
    it('should run all tests and return summary', async () => {
      const { useMediaPermissions } = await import('@/composables/useMediaPermissions')

      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
        checkVideoPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
      })
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [],
      })

      const mockRegistrationStore = registrationStore as any
      mockRegistrationStore.state = RegistrationState.Unregistered

      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      })

      composable = useConnectionTest()
      const result = await composable.runFullTest()

      expect(result).toBeDefined()
      expect(result.checks).toHaveLength(6)
      expect(result.passedCount).toBeGreaterThan(0)
    })
  })

  describe('clearResults', () => {
    it('should clear lastResults', async () => {
      const { useMediaPermissions } = await import('@/composables/useMediaPermissions')

      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
        checkVideoPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
      })

      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      })

      composable = useConnectionTest()

      await composable.runFullTest()
      expect(composable.lastResults.value).not.toBeNull()

      composable.clearResults()
      expect(composable.lastResults.value).toBeNull()
    })
  })

  describe('runTest', () => {
    it('should run specific test by type', async () => {
      composable = useConnectionTest()

      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      })

      const result = await composable.runTest('network')

      expect(result.name).toBe('Network Connection')
    })

    it('should return error for unknown test type', async () => {
      composable = useConnectionTest()

      const result = await composable.runTest('unknown' as any)

      expect(result.passed).toBe(false)
      expect(result.message).toContain('Unknown test type')
    })
  })
})
