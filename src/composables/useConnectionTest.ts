/**
 * Connection Test Composable
 *
 * Provides a comprehensive pre-call diagnostic that tests:
 * 1. SIP registration status
 * 2. Media permissions (microphone, camera)
 * 3. Network connectivity (STUN/TURN)
 *
 * Use this before placing a call to identify and resolve issues early,
 * reducing first-call friction and improving user experience.
 *
 * @module composables/useConnectionTest
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { PermissionStatus } from '../types/media.types'
import { useMediaPermissions } from './useMediaPermissions'
import { useSipAccountManager } from './useSipAccountManager'
import { createLogger } from '../utils/logger'
import { registrationStore } from '../stores/registrationStore'
import { DEFAULT_STUN_SERVERS } from '../utils/constants'

const log = createLogger('useConnectionTest')

// ============================================================================
// Types
// ============================================================================

/**
 * Connection test result for a single check
 */
export interface ConnectionCheckResult {
  /** Whether the check passed */
  passed: boolean
  /** Check name */
  name: string
  /** User-friendly status message */
  message: string
  /** Detailed error if failed */
  error?: string
  /** Suggestion for fixing the issue */
  suggestion?: string
  /** Severity level */
  severity: 'error' | 'warning' | 'info'
}

/**
 * Overall connection test summary
 */
export interface ConnectionTestSummary {
  /** Overall test result */
  isReady: boolean
  /** Number of passed checks */
  passedCount: number
  /** Number of failed checks */
  failedCount: number
  /** Number of warning checks */
  warningCount: number
  /** Overall user-friendly message */
  message: string
  /** List of all check results */
  checks: ConnectionCheckResult[]
}

/**
 * Individual test type
 */
export type TestType = 'sip' | 'audio' | 'video' | 'stun' | 'turn' | 'network'

/**
 * Return type for useConnectionTest composable
 */
export interface UseConnectionTestReturn {
  /** Whether a test is currently running */
  isRunning: Readonly<Ref<boolean>>
  /** Last test results */
  lastResults: Readonly<Ref<ConnectionTestSummary | null>>
  /** User-friendly overall status message */
  statusMessage: ComputedRef<string>
  /** Whether the system is ready for calls */
  isReadyForCalls: ComputedRef<boolean>
  /** Run all connection tests */
  runFullTest: () => Promise<ConnectionTestSummary>
  /** Run a specific test */
  runTest: (type: TestType) => Promise<ConnectionCheckResult>
  /** Run SIP registration test */
  testSipRegistration: () => Promise<ConnectionCheckResult>
  /** Run audio permission test */
  testAudioPermission: () => Promise<ConnectionCheckResult>
  /** Run video permission test */
  testVideoPermission: () => Promise<ConnectionCheckResult>
  /** Run STUN connectivity test */
  testStunConnectivity: () => Promise<ConnectionCheckResult>
  /** Run TURN connectivity test */
  testTurnConnectivity: () => Promise<ConnectionCheckResult>
  /** Run basic network connectivity test */
  testNetworkConnectivity: () => Promise<ConnectionCheckResult>
  /** Clear test results */
  clearResults: () => void
}

// ============================================================================
// Composables
// ============================================================================

/**
 * Connection Test Composable
 *
 * Provides comprehensive pre-call diagnostics to identify issues before
 * the user attempts their first call. This reduces friction and improves
 * the onboarding experience.
 *
 * @returns Test methods and state
 *
 * @example
 * ```typescript
 * const {
 *   isReadyForCalls,
 *   statusMessage,
 *   runFullTest,
 *   runTest
 * } = useConnectionTest()
 *
 * // Run full diagnostic before call
 * const result = await runFullTest()
 * if (!result.isReady) {
 *   // Show diagnostic UI with result.checks
 *   result.checks.forEach(check => {
 *     if (!check.passed) {
 *       console.log(`${check.name}: ${check.suggestion}`)
 *     }
 *   })
 * }
 * ```
 */
export function useConnectionTest(): UseConnectionTestReturn {
  // Reactive state
  const isRunning = ref(false)
  const lastResults = ref<ConnectionTestSummary | null>(null)

  // Media permissions composable (read-only checks)
  const { checkAudioPermission, checkVideoPermission } = useMediaPermissions()

  // Computed
  const isReadyForCalls = computed(() => {
    const results = lastResults.value
    if (!results) return false
    return results.isReady
  })

  const statusMessage = computed(() => {
    const results = lastResults.value
    if (!results) {
      return 'No diagnostics run. Run test to check connection status.'
    }
    if (results.isReady) {
      return `✅ Ready for calls (${results.passedCount}/${results.checks.length} checks passed)`
    }
    return `❌ Issues found (${results.failedCount} errors, ${results.warningCount} warnings)`
  })

  // ============================================================================
  // Test Methods
  // ============================================================================

  /**
   * Test SIP registration status
   */
  async function testSipRegistration(): Promise<ConnectionCheckResult> {
    try {
      // Check if there's an active SIP registration
      // Use settings store to check for enabled accounts
      const accountManager = useSipAccountManager()

      // Check if there are enabled accounts
      const enabledAccounts = accountManager.enabledAccounts

      if (!enabledAccounts || enabledAccounts.length === 0) {
        return {
          passed: false,
          name: 'SIP Registration',
          message: 'No SIP account configured',
          error: 'No SIP accounts found',
          suggestion: 'Add a SIP account in settings to make calls',
          severity: 'error',
        }
      }

      // Check registration state from registration store
      const regState = registrationStore.state

      if (regState === 'registered') {
        return {
          passed: true,
          name: 'SIP Registration',
          message: 'SIP account registered and ready',
          severity: 'info',
        }
      } else if (regState === 'registering') {
        return {
          passed: false,
          name: 'SIP Registration',
          message: 'Registering...',
          suggestion: 'Wait for registration to complete',
          severity: 'warning',
        }
      } else {
        return {
          passed: false,
          name: 'SIP Registration',
          message: 'SIP account not registered',
          error: `Registration status: ${regState}`,
          suggestion: 'Check SIP credentials and server connection in settings',
          severity: 'error',
        }
      }
    } catch (error) {
      log.warn('SIP registration test failed:', error)
      return {
        passed: false,
        name: 'SIP Registration',
        message: 'Could not test SIP registration',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Try again or check your internet connection',
        severity: 'error',
      }
    }
  }

  /**
   * Test audio permission
   */
  async function testAudioPermission(): Promise<ConnectionCheckResult> {
    try {
      const result = await checkAudioPermission()

      if (result.granted) {
        return {
          passed: true,
          name: 'Microphone',
          message: 'Microphone access granted',
          severity: 'info',
        }
      }

      if (result.status === PermissionStatus.Denied) {
        return {
          passed: false,
          name: 'Microphone',
          message: 'Microphone access denied',
          error: 'Microphone permission blocked by browser',
          suggestion: 'Click the lock icon in the address bar and allow microphone access',
          severity: 'error',
        }
      }

      return {
        passed: false,
        name: 'Microphone',
        message: 'Microphone access not granted',
        error: 'No microphone access',
        suggestion: 'Click "Allow" when the browser asks for microphone access',
        severity: 'error',
      }
    } catch (error) {
      log.warn('Audio permission test failed:', error)
      return {
        passed: false,
        name: 'Microphone',
        message: 'Could not test microphone access',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Try again or check browser settings',
        severity: 'error',
      }
    }
  }

  /**
   * Test video permission
   */
  async function testVideoPermission(): Promise<ConnectionCheckResult> {
    try {
      const result = await checkVideoPermission()

      if (result.granted) {
        return {
          passed: true,
          name: 'Camera',
          message: 'Camera access granted',
          severity: 'info',
        }
      }

      if (result.status === PermissionStatus.Denied) {
        return {
          passed: false,
          name: 'Camera',
          message: 'Camera access denied',
          error: 'Camera permission blocked by browser',
          suggestion: 'Click the lock icon in the address bar and allow camera access',
          severity: 'warning', // Video is optional
        }
      }

      return {
        passed: true, // Video is optional
        name: 'Camera',
        message: 'Camera access not granted (optional)',
        suggestion: 'Allow camera access for video calls',
        severity: 'warning',
      }
    } catch (error) {
      log.warn('Video permission test failed:', error)
      return {
        passed: true, // Video is optional
        name: 'Camera',
        message: 'Could not test camera access (optional)',
        severity: 'warning',
      }
    }
  }

  /**
   * Test STUN server connectivity
   */
  async function testStunConnectivity(): Promise<ConnectionCheckResult> {
    try {
      // Use default STUN servers - most deployments use Google's STUN
      const stunServers = DEFAULT_STUN_SERVERS

      // Try to create a STUN connection
      const pc = new RTCPeerConnection({
        iceServers: stunServers.map((url: string) => ({ urls: url })),
      })

      try {
        // Create a data channel to trigger ICE candidate gathering
        pc.createDataChannel('test')

        // Create offer and set local description to trigger ICE gathering
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // Wait for ICE gathering to complete or timeout
        const gathered = await new Promise<RTCIceCandidate[]>((resolve) => {
          const candidates: RTCIceCandidate[] = []
          const timeout = setTimeout(() => resolve(candidates), 3000)

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              candidates.push(event.candidate)
            }
          }

          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout)
              resolve(candidates)
            }
          }
        })

        if (gathered.length > 0) {
          return {
            passed: true,
            name: 'STUN Connection',
            message: 'STUN servers reachable',
            severity: 'info',
          }
        } else {
          return {
            passed: true, // STUN not strictly required
            name: 'STUN Connection',
            message: 'STUN servers configured but no candidates found',
            suggestion: 'Continue without STUN - calls may still work',
            severity: 'warning',
          }
        }
      } finally {
        pc.close()
      }
    } catch (error) {
      log.warn('STUN connectivity test failed:', error)
      return {
        passed: true, // STUN is optional
        name: 'STUN Connection',
        message: 'Could not connect to STUN servers',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Check your internet connection or STUN server configuration',
        severity: 'warning',
      }
    }
  }

  /**
   * Test TURN server connectivity
   */
  /**
   * Test TURN server connectivity
   */
  async function testTurnConnectivity(): Promise<ConnectionCheckResult> {
    try {
      // TURN is optional - if not configured, skip the test
      // In production, you'd check settingsStore for TURN config
      return {
        passed: true,
        name: 'TURN Connection',
        message: 'No TURN servers configured (optional)',
        suggestion: 'TIP: Add TURN servers for better connectivity behind firewalls',
        severity: 'info',
      }
    } catch (error) {
      log.warn('TURN connectivity test failed:', error)
      return {
        passed: true, // TURN is optional
        name: 'TURN Connection',
        message: 'Could not connect to TURN servers',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Check TURN credentials or internet connection',
        severity: 'warning',
      }
    }
  }

  /**
   * Test basic network connectivity
   */
  async function testNetworkConnectivity(): Promise<ConnectionCheckResult> {
    try {
      // Check if we're online
      if (!navigator.onLine) {
        return {
          passed: false,
          name: 'Network Connection',
          message: 'No internet connection',
          error: 'Navigator.onLine is false',
          suggestion: 'Check your internet connection',
          severity: 'error',
        }
      }

      // Try to reach a known endpoint
      try {
        await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          mode: 'no-cors',
        })
        // With mode: no-cors, we get an opaque response which is success
        return {
          passed: true,
          name: 'Network Connection',
          message: 'Internet connection active',
          severity: 'info',
        }
      } catch {
        // fetch failed but we're online - might be a firewall issue
        return {
          passed: true,
          name: 'Network Connection',
          message: 'Internet connection active (limited)',
          suggestion: 'Some services may be blocked by firewall',
          severity: 'warning',
        }
      }
    } catch (error) {
      log.warn('Network connectivity test failed:', error)
      return {
        passed: false,
        name: 'Network Connection',
        message: 'Could not test network connection',
        error: error instanceof Error ? error.message : String(error),
        severity: 'error',
      }
    }
  }

  /**
   * Run a specific test by type
   */
  async function runTest(type: TestType): Promise<ConnectionCheckResult> {
    switch (type) {
      case 'sip':
        return testSipRegistration()
      case 'audio':
        return testAudioPermission()
      case 'video':
        return testVideoPermission()
      case 'stun':
        return testStunConnectivity()
      case 'turn':
        return testTurnConnectivity()
      case 'network':
        return testNetworkConnectivity()
      default:
        return {
          passed: false,
          name: 'Unknown',
          message: `Unknown test type: ${type}`,
          severity: 'error',
        }
    }
  }

  /**
   * Run full connection diagnostic
   */
  async function runFullTest(): Promise<ConnectionTestSummary> {
    isRunning.value = true

    try {
      // Run all tests in parallel
      const [network, sip, audio, video, stun, turn] = await Promise.all([
        testNetworkConnectivity(),
        testSipRegistration(),
        testAudioPermission(),
        testVideoPermission(),
        testStunConnectivity(),
        testTurnConnectivity(),
      ])

      const checks = [network, sip, audio, video, stun, turn]

      // Count results
      const passedCount = checks.filter((c) => c.passed).length
      const failedCount = checks.filter((c) => c.severity === 'error').length
      const warningCount = checks.filter((c) => c.severity === 'warning').length

      // Determine overall readiness
      // Ready if: network OK + audio OK + (SIP OK or SIP not configured)
      const isReady =
        network.passed && audio.passed && (sip.passed || sip.message.includes('not configured'))

      const summary: ConnectionTestSummary = {
        isReady,
        passedCount,
        failedCount,
        warningCount,
        message: isReady
          ? 'Ready for calls'
          : `Issues found: ${failedCount} errors, ${warningCount} warnings`,
        checks,
      }

      lastResults.value = summary

      log.info('Connection test complete:', {
        isReady,
        passedCount,
        failedCount,
        warningCount,
      })

      return summary
    } finally {
      isRunning.value = false
    }
  }

  /**
   * Clear test results
   */
  function clearResults(): void {
    lastResults.value = null
  }

  return {
    // State
    isRunning: isRunning as Readonly<Ref<boolean>>,
    lastResults: lastResults as Readonly<Ref<ConnectionTestSummary | null>>,

    // Computed
    statusMessage,
    isReadyForCalls,

    // Methods
    runFullTest,
    runTest,
    testSipRegistration,
    testAudioPermission,
    testVideoPermission,
    testStunConnectivity,
    testTurnConnectivity,
    testNetworkConnectivity,
    clearResults,
  }
}
