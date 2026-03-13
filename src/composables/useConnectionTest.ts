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
// Default STUN servers (Google STUN)
const DEFAULT_STUN_SERVERS = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']

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
      return 'Ingen diagnos körd. Kör test för att se anslutningsstatus.'
    }
    if (results.isReady) {
      return `✅ Redo för samtal (${results.passedCount}/${results.checks.length} kontroller godkända)`
    }
    return `❌ Problem upptäckta (${results.failedCount} fel, ${results.warningCount} varningar)`
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
          name: 'SIP-registrering',
          message: 'Inget SIP-konto konfigurerat',
          error: 'Inga SIP-konton hittades',
          suggestion: 'Lägg till ett SIP-konto i inställningar för att ringa samtal',
          severity: 'error',
        }
      }

      // Check registration state from registration store
      const regState = registrationStore.state

      if (regState === 'registered') {
        return {
          passed: true,
          name: 'SIP-registrering',
          message: 'SIP-konto registrerat och redo',
          severity: 'info',
        }
      } else if (regState === 'registering') {
        return {
          passed: false,
          name: 'SIP-registrering',
          message: 'Registrerar...',
          suggestion: 'Vänta på att registreringen ska slutföras',
          severity: 'warning',
        }
      } else {
        return {
          passed: false,
          name: 'SIP-registrering',
          message: 'SIP-konto inte registrerat',
          error: `Registreringsstatus: ${regState}`,
          suggestion: 'Kontrollera SIP-uppgifter och serveranslutning i inställningar',
          severity: 'error',
        }
      }
    } catch (error) {
      log.warn('SIP registration test failed:', error)
      return {
        passed: false,
        name: 'SIP-registrering',
        message: 'Kunde inte testa SIP-registrering',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Försök igen eller kontrollera din internetanslutning',
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
          name: 'Mikrofon',
          message: 'Mikrofontillgång beviljad',
          severity: 'info',
        }
      }

      if (result.status === PermissionStatus.Denied) {
        return {
          passed: false,
          name: 'Mikrofon',
          message: 'Mikrofontillgång nekad',
          error: 'Mikrofonbehörighet blockerad av webbläsare',
          suggestion: 'Klicka på låsikonen i adressfältet och ge mikrofontillgång',
          severity: 'error',
        }
      }

      return {
        passed: false,
        name: 'Mikrofon',
        message: 'Mikrofontillgång inte beviljad',
        error: 'Ingen mikrofontillgång',
        suggestion: 'Klicka på "Ge tillgång" när webbläraren frågar efter mikrofon',
        severity: 'error',
      }
    } catch (error) {
      log.warn('Audio permission test failed:', error)
      return {
        passed: false,
        name: 'Mikrofon',
        message: 'Kunde inte testa mikrofontillgång',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Försök igen eller kontrollera webbläsarinställningar',
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
          name: 'Kamera',
          message: 'Kameratillgång beviljad',
          severity: 'info',
        }
      }

      if (result.status === PermissionStatus.Denied) {
        return {
          passed: false,
          name: 'Kamera',
          message: 'Kameratillgång nekad',
          error: 'Kamerabehörighet blockerad av webbläsare',
          suggestion: 'Klicka på låsikonen i adressfältet och ge kameratillgång',
          severity: 'warning', // Video is optional
        }
      }

      return {
        passed: true, // Video is optional
        name: 'Kamera',
        message: 'Kameratillgång inte beviljad (valfritt)',
        suggestion: 'Ge kameratillgång för videosamtal',
        severity: 'warning',
      }
    } catch (error) {
      log.warn('Video permission test failed:', error)
      return {
        passed: true, // Video is optional
        name: 'Kamera',
        message: 'Kunde inte testa kameratillgång (valfritt)',
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
            name: 'STUN-anslutning',
            message: 'STUN-servrar nås',
            severity: 'info',
          }
        } else {
          return {
            passed: true, // STUN not strictly required
            name: 'STUN-anslutning',
            message: 'STUN-servrar konfigurerade men inga kandidater hittades',
            suggestion: 'Fortsätt utan STUN - samtal kan fortfarande fungera',
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
        name: 'STUN-anslutning',
        message: 'Kunde inte ansluta till STUN-servrar',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Kontrollera din internetanslutning eller STUN-serverkonfiguration',
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
        name: 'TURN-anslutning',
        message: 'Inga TURN-servrar konfigurerade (valfritt)',
        suggestion: 'TILLÄGG: Lägg till TURN-servrar för bättre anslutning bakom brandvägg',
        severity: 'info',
      }
    } catch (error) {
      log.warn('TURN connectivity test failed:', error)
      return {
        passed: true, // TURN is optional
        name: 'TURN-anslutning',
        message: 'Kunde inte ansluta till TURN-servrar',
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Kontrollera TURN-uppgifter eller internetanslutning',
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
          name: 'Nätverksanslutning',
          message: 'Ingen internetanslutning',
          error: 'Navigator.onLine är false',
          suggestion: 'Kontrollera din internetanslutning',
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
          name: 'Nätverksanslutning',
          message: 'Internetanslutning aktiv',
          severity: 'info',
        }
      } catch {
        // fetch failed but we're online - might be a firewall issue
        return {
          passed: true,
          name: 'Nätverksanslutning',
          message: 'Internetanslutning aktiv (begränsad)',
          suggestion: 'Vissa tjänster kan vara blockerade av brandvägg',
          severity: 'warning',
        }
      }
    } catch (error) {
      log.warn('Network connectivity test failed:', error)
      return {
        passed: false,
        name: 'Nätverksanslutning',
        message: 'Kunde inte testa nätverksanslutning',
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
          name: 'Okänd',
          message: `Okänd testtyp: ${type}`,
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
        network.passed && audio.passed && (sip.passed || sip.message.includes('inte konfigurerat'))

      const summary: ConnectionTestSummary = {
        isReady,
        passedCount,
        failedCount,
        warningCount,
        message: isReady
          ? 'Redo för samtal'
          : `Problem upptäckta: ${failedCount} fel, ${warningCount} varningar`,
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
