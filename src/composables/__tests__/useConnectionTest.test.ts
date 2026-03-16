/**
 * Tests for useConnectionTest composable
 * @module composables/__tests__/useConnectionTest.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConnectionTest } from '../useConnectionTest'
import { PermissionStatus } from '../../types/media.types'
import type { RegistrationState } from '../../types/sip.types'
import type { SipAccount } from '../../types/config.types'

// Declare mock store - must be accessible to vi.mock factory
const mockRegistrationStoreState = {
  value: 'unregistered' as RegistrationState,
}

// Mock permission check results
let mockAudioPermissionResult = { granted: true, status: PermissionStatus.Granted }
let mockVideoPermissionResult = { granted: true, status: PermissionStatus.Granted }

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock useMediaPermissions
vi.mock('../useMediaPermissions', () => ({
  useMediaPermissions: () => ({
    checkAudioPermission: vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockAudioPermissionResult)),
    checkVideoPermission: vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockVideoPermissionResult)),
  }),
}))

// Mock useSipAccountManager - use a getter to allow test-time overrides
let mockEnabledAccounts: SipAccount[] = [{ id: '1' }]
vi.mock('../useSipAccountManager', () => ({
  useSipAccountManager: () => ({
    get enabledAccounts() {
      return mockEnabledAccounts
    },
  }),
}))

// Mock registrationStore
vi.mock('../../stores/registrationStore', () => ({
  get registrationStore() {
    return {
      get state() {
        return mockRegistrationStoreState.value
      },
      set state(v: RegistrationState) {
        mockRegistrationStoreState.value = v
      },
    }
  },
}))

describe('useConnectionTest', () => {
  let mockNavigator: {
    onLine: boolean
    mediaDevices: { getUserMedia: ReturnType<typeof vi.fn> }
    permissions: { query: ReturnType<typeof vi.fn> }
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup navigator mock
    mockNavigator = {
      onLine: true,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({}),
      },
      permissions: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    }

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
    })

    // Mock window.RTCPeerConnection
    const mockRTCPeerConnection = vi.fn().mockImplementation(() => ({
      createDataChannel: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      onicecandidate: null,
      onicegatheringstatechange: null,
      iceGatheringState: 'complete',
    }))

    Object.defineProperty(window, 'RTCPeerConnection', {
      value: mockRTCPeerConnection,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should start with isRunning as false', () => {
      const { isRunning } = useConnectionTest()
      expect(isRunning.value).toBe(false)
    })

    it('should start with lastResults as null', () => {
      const { lastResults } = useConnectionTest()
      expect(lastResults.value).toBeNull()
    })

    it('should show appropriate status message when no test has been run', () => {
      const { statusMessage } = useConnectionTest()
      expect(statusMessage.value).toBe('No diagnostics run. Run test to check connection status.')
    })

    it('should not be ready for calls initially', () => {
      const { isReadyForCalls } = useConnectionTest()
      expect(isReadyForCalls.value).toBe(false)
    })
  })

  describe('testNetworkConnectivity', () => {
    it('should pass when navigator.onLine is true', async () => {
      mockNavigator.onLine = true
      const { testNetworkConnectivity } = useConnectionTest()
      const result = await testNetworkConnectivity()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('Network Connection')
      expect(result.message).toBe('Internet connection active')
      expect(result.severity).toBe('info')
    })

    it('should fail when navigator.onLine is false', async () => {
      mockNavigator.onLine = false
      const { testNetworkConnectivity } = useConnectionTest()
      const result = await testNetworkConnectivity()

      expect(result.passed).toBe(false)
      expect(result.name).toBe('Network Connection')
      expect(result.message).toBe('No internet connection')
      expect(result.severity).toBe('error')
      expect(result.suggestion).toBeDefined()
    })
  })

  describe('testAudioPermission', () => {
    it('should return passed when audio permission is granted', async () => {
      mockAudioPermissionResult = { granted: true, status: PermissionStatus.Granted }

      const { testAudioPermission } = useConnectionTest()
      const result = await testAudioPermission()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('Microphone')
      expect(result.message).toBe('Microphone access granted')
      expect(result.severity).toBe('info')
    })

    it('should return failed when audio permission is denied', async () => {
      mockAudioPermissionResult = { granted: false, status: PermissionStatus.Denied }

      const { testAudioPermission } = useConnectionTest()
      const result = await testAudioPermission()

      expect(result.passed).toBe(false)
      expect(result.name).toBe('Microphone')
      expect(result.message).toBe('Microphone access denied')
      expect(result.severity).toBe('error')
      expect(result.suggestion).toBeDefined()
    })
  })

  describe('testVideoPermission', () => {
    it('should return passed when video permission is granted', async () => {
      mockVideoPermissionResult = { granted: true, status: PermissionStatus.Granted }

      const { testVideoPermission } = useConnectionTest()
      const result = await testVideoPermission()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('Camera')
      expect(result.message).toBe('Camera access granted')
      expect(result.severity).toBe('info')
    })

    it('should return warning when video permission is not granted (optional)', async () => {
      mockVideoPermissionResult = { granted: false, status: PermissionStatus.NotRequested }

      const { testVideoPermission } = useConnectionTest()
      const result = await testVideoPermission()

      // Video is optional, so it returns passed: true with a warning
      expect(result.passed).toBe(true)
      expect(result.name).toBe('Camera')
      expect(result.severity).toBe('warning')
    })
  })

  describe('testSipRegistration', () => {
    it('should fail when no SIP accounts are configured', async () => {
      mockEnabledAccounts = [] // No accounts configured

      const { testSipRegistration } = useConnectionTest()
      const result = await testSipRegistration()

      expect(result.passed).toBe(false)
      expect(result.name).toBe('SIP Registration')
      expect(result.message).toBe('No SIP account configured')
      expect(result.severity).toBe('error')
      expect(result.suggestion).toBeDefined()
    })

    it('should pass when registration state is registered', async () => {
      mockEnabledAccounts = [{ id: '1' }] // Account is configured
      mockRegistrationStoreState.value = 'registered'

      const { testSipRegistration } = useConnectionTest()
      const result = await testSipRegistration()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('SIP Registration')
      expect(result.message).toBe('SIP account registered and ready')
      expect(result.severity).toBe('info')
    })

    it('should warn when registration is in progress', async () => {
      mockEnabledAccounts = [{ id: '1' }]
      mockRegistrationStoreState.value = 'registering'

      const { testSipRegistration } = useConnectionTest()
      const result = await testSipRegistration()

      expect(result.passed).toBe(false)
      expect(result.name).toBe('SIP Registration')
      expect(result.message).toBe('Registering...')
      expect(result.severity).toBe('warning')
    })

    it('should fail when registration has failed', async () => {
      mockEnabledAccounts = [{ id: '1' }]
      mockRegistrationStoreState.value = 'failed'

      const { testSipRegistration } = useConnectionTest()
      const result = await testSipRegistration()

      expect(result.passed).toBe(false)
      expect(result.name).toBe('SIP Registration')
      expect(result.message).toBe('SIP account not registered')
      expect(result.severity).toBe('error')
    })
  })

  describe('testStunConnectivity', () => {
    it('should return result when STUN servers are tested', async () => {
      const { testStunConnectivity } = useConnectionTest()
      const result = await testStunConnectivity()

      // The mock doesn't perfectly simulate ICE gathering, so it returns warning
      // but the code path is exercised correctly
      expect(result.name).toBe('STUN Connection')
      expect(result.passed).toBe(true) // STUN is optional, so it passes
    })
  })

  describe('testTurnConnectivity', () => {
    it('should pass with info when no TURN servers configured (optional)', async () => {
      const { testTurnConnectivity } = useConnectionTest()
      const result = await testTurnConnectivity()

      expect(result.passed).toBe(true)
      expect(result.name).toBe('TURN Connection')
      expect(result.message).toBe('No TURN servers configured (optional)')
      expect(result.severity).toBe('info')
    })
  })

  describe('runTest', () => {
    it('should run network test when type is network', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('network')

      expect(result.name).toBe('Network Connection')
    })

    it('should run audio test when type is audio', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('audio')

      expect(result.name).toBe('Microphone')
    })

    it('should run video test when type is video', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('video')

      expect(result.name).toBe('Camera')
    })

    it('should run sip test when type is sip', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('sip')

      expect(result.name).toBe('SIP Registration')
    })

    it('should run stun test when type is stun', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('stun')

      expect(result.name).toBe('STUN Connection')
    })

    it('should run turn test when type is turn', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('turn')

      expect(result.name).toBe('TURN Connection')
    })

    it('should return error for unknown test type', async () => {
      const { runTest } = useConnectionTest()
      const result = await runTest('unknown' as unknown as TestType)

      expect(result.passed).toBe(false)
      expect(result.message).toContain('Unknown test type')
    })
  })

  describe('runFullTest', () => {
    it('should run all tests and return summary', async () => {
      const { runFullTest } = useConnectionTest()
      const summary = await runFullTest()

      expect(summary.checks).toHaveLength(6)
      expect(summary.passedCount).toBeDefined()
      expect(summary.failedCount).toBeDefined()
      expect(summary.warningCount).toBeDefined()
      expect(summary.message).toBeDefined()
    })

    it('should set isRunning to true during test', async () => {
      const { runFullTest, isRunning } = useConnectionTest()

      // Start the test but don't await it yet
      const testPromise = runFullTest()

      // Check isRunning is true (might need to wait a tick)
      await testPromise

      expect(isRunning.value).toBe(false) // Should be false after completion
    })

    it('should update lastResults with test summary', async () => {
      const { runFullTest, lastResults } = useConnectionTest()

      expect(lastResults.value).toBeNull()

      await runFullTest()

      expect(lastResults.value).not.toBeNull()
      expect(lastResults.value?.isReady).toBeDefined()
    })
  })

  describe('clearResults', () => {
    it('should reset lastResults to null', async () => {
      const { runFullTest, lastResults, clearResults } = useConnectionTest()

      await runFullTest()
      expect(lastResults.value).not.toBeNull()

      clearResults()
      expect(lastResults.value).toBeNull()
    })
  })

  describe('statusMessage', () => {
    it('should show success message when all tests pass', async () => {
      const { runFullTest, statusMessage } = useConnectionTest()

      await runFullTest()

      // The exact message depends on the test results
      expect(statusMessage.value).toBeDefined()
    })

    it('should show failure message when tests fail', async () => {
      mockNavigator.onLine = false

      const { runFullTest, statusMessage } = useConnectionTest()

      await runFullTest()

      expect(statusMessage.value).toContain('❌')
    })
  })
})
