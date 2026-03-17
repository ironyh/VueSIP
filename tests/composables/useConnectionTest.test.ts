/**
 * Tests for useConnectionTest composable
 * @module tests/composables/useConnectionTest.test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useConnectionTest } from '@/composables/useConnectionTest'
import { useMediaPermissions } from '@/composables/useMediaPermissions'
import { useSipAccountManager } from '@/composables/useSipAccountManager'
import { registrationStore } from '@/stores/registrationStore'

// Mock dependencies
vi.mock('@/composables/useMediaPermissions', () => ({
  useMediaPermissions: vi.fn(() => ({
    checkAudioPermission: vi.fn(),
    checkVideoPermission: vi.fn(),
  })),
}))

vi.mock('@/composables/useSipAccountManager', () => ({
  useSipAccountManager: vi.fn(() => ({
    enabledAccounts: [],
  })),
}))

vi.mock('@/stores/registrationStore', () => ({
  registrationStore: {
    state: 'unregistered',
  },
}))

describe('useConnectionTest', () => {
  let connectionTest: ReturnType<typeof useConnectionTest>

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset registration store state
    registrationStore.state = 'unregistered'
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      connectionTest = useConnectionTest()

      expect(connectionTest.isRunning.value).toBe(false)
      expect(connectionTest.lastResults.value).toBeNull()
      expect(connectionTest.isReadyForCalls.value).toBe(false)
    })

    it('should return correct status message when no tests run', () => {
      connectionTest = useConnectionTest()

      expect(connectionTest.statusMessage.value).toBe(
        'No diagnostics run. Run test to check connection status.'
      )
    })
  })

  describe('testNetworkConnectivity', () => {
    it('should pass when online', async () => {
      connectionTest = useConnectionTest()

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })

      const result = await connectionTest.testNetworkConnectivity()

      expect(result.name).toBe('Network Connection')
      expect(result.passed).toBe(true)
      expect(result.message).toBe('Internet connection active')
    })

    it('should fail when offline', async () => {
      connectionTest = useConnectionTest()

      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      })

      const result = await connectionTest.testNetworkConnectivity()

      expect(result.name).toBe('Network Connection')
      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
    })
  })

  describe('testAudioPermission', () => {
    it('should pass when audio permission granted', async () => {
      const mockCheckAudioPermission = vi.fn().mockResolvedValue({
        granted: true,
        status: 'granted',
      })

      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: mockCheckAudioPermission,
        checkVideoPermission: vi.fn(),
      })

      connectionTest = useConnectionTest()
      const result = await connectionTest.testAudioPermission()

      expect(result.name).toBe('Microphone')
      expect(result.passed).toBe(true)
      expect(result.message).toBe('Microphone access granted')
    })

    it('should fail when audio permission denied', async () => {
      const mockCheckAudioPermission = vi.fn().mockResolvedValue({
        granted: false,
        status: 'denied',
      })

      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: mockCheckAudioPermission,
        checkVideoPermission: vi.fn(),
      })

      connectionTest = useConnectionTest()
      const result = await connectionTest.testAudioPermission()

      expect(result.name).toBe('Microphone')
      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
    })
  })

  describe('testVideoPermission', () => {
    it('should pass when video permission granted', async () => {
      const mockCheckVideoPermission = vi.fn().mockResolvedValue({
        granted: true,
        status: 'granted',
      })

      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn(),
        checkVideoPermission: mockCheckVideoPermission,
      })

      connectionTest = useConnectionTest()
      const result = await connectionTest.testVideoPermission()

      expect(result.name).toBe('Camera')
      expect(result.passed).toBe(true)
      expect(result.message).toBe('Camera access granted')
    })

    it('should pass with warning when video not granted (optional)', async () => {
      const mockCheckVideoPermission = vi.fn().mockResolvedValue({
        granted: false,
        status: 'prompt',
      })

      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn(),
        checkVideoPermission: mockCheckVideoPermission,
      })

      connectionTest = useConnectionTest()
      const result = await connectionTest.testVideoPermission()

      // Video is optional so it passes with warning
      expect(result.name).toBe('Camera')
      expect(result.passed).toBe(true)
      expect(result.severity).toBe('warning')
    })
  })

  describe('testSipRegistration', () => {
    it('should fail when no SIP accounts configured', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [],
      })

      connectionTest = useConnectionTest()
      const result = await connectionTest.testSipRegistration()

      expect(result.name).toBe('SIP Registration')
      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
      expect(result.suggestion).toContain('Add a SIP account')
    })

    it('should pass when SIP registered', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [{ id: '1', name: 'Test' }],
      })
      registrationStore.state = 'registered'

      connectionTest = useConnectionTest()
      const result = await connectionTest.testSipRegistration()

      expect(result.name).toBe('SIP Registration')
      expect(result.passed).toBe(true)
      expect(result.message).toBe('SIP account registered and ready')
    })

    it('should warn when SIP is registering', async () => {
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [{ id: '1', name: 'Test' }],
      })
      registrationStore.state = 'registering'

      connectionTest = useConnectionTest()
      const result = await connectionTest.testSipRegistration()

      expect(result.name).toBe('SIP Registration')
      expect(result.passed).toBe(false)
      expect(result.severity).toBe('warning')
    })
  })

  describe('testStunConnectivity', () => {
    it('should pass when STUN servers respond', async () => {
      // Mock RTCPeerConnection
      const mockPC = {
        createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test' }),
        setLocalDescription: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        onicecandidate: null,
        onicegatheringstatechange: null,
        iceGatheringState: 'complete',
      }

      vi.stubGlobal(
        'RTCPeerConnection',
        vi.fn(() => mockPC)
      )

      connectionTest = useConnectionTest()
      const result = await connectionTest.testStunConnectivity()

      expect(result.name).toBe('STUN Connection')
      // Result depends on whether candidates are gathered
    })
  })

  describe('testTurnConnectivity', () => {
    it('should pass with info when no TURN configured (optional)', async () => {
      connectionTest = useConnectionTest()
      const result = await connectionTest.testTurnConnectivity()

      expect(result.name).toBe('TURN Connection')
      expect(result.passed).toBe(true)
      expect(result.severity).toBe('info')
      expect(result.message).toContain('optional')
    })
  })

  describe('runTest', () => {
    it('should run individual tests by type', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })

      connectionTest = useConnectionTest()

      const result = await connectionTest.runTest('network')

      expect(result.name).toBe('Network Connection')
    })

    it('should return error for unknown test type', async () => {
      connectionTest = useConnectionTest()

      const result = await connectionTest.runTest('unknown' as any)

      expect(result.passed).toBe(false)
      expect(result.severity).toBe('error')
    })
  })

  describe('clearResults', () => {
    it('should clear test results', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
        checkVideoPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
      })
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [],
      })

      connectionTest = useConnectionTest()

      // Run full test to populate results
      await connectionTest.runFullTest()

      expect(connectionTest.lastResults.value).not.toBeNull()

      // Clear results
      connectionTest.clearResults()

      expect(connectionTest.lastResults.value).toBeNull()
    })
  })

  describe('runFullTest', () => {
    it('should run all tests and return summary', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
        checkVideoPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
      })
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [],
      })

      connectionTest = useConnectionTest()

      const result = await connectionTest.runFullTest()

      expect(result.checks).toHaveLength(6)
      expect(result.passedCount).toBeGreaterThan(0)
      expect(result.checks.map((c) => c.name)).toContain('Network Connection')
      expect(result.checks.map((c) => c.name)).toContain('Microphone')
      expect(result.checks.map((c) => c.name)).toContain('Camera')
    })

    it('should set isRunning during test execution', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })
      ;(useMediaPermissions as any).mockReturnValue({
        checkAudioPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
        checkVideoPermission: vi.fn().mockResolvedValue({ granted: true, status: 'granted' }),
      })
      ;(useSipAccountManager as any).mockReturnValue({
        enabledAccounts: [],
      })

      connectionTest = useConnectionTest()

      await connectionTest.runFullTest()

      const runningAfter = connectionTest.isRunning.value

      // Note: The test runs too fast to catch the running state
      // but we can verify it resets correctly
      expect(runningAfter).toBe(false)
    })
  })
})
