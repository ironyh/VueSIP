/**
 * Call Setup Diagnostics Utility
 *
 * Provides structured diagnostic information for troubleshooting
 * real-time call failures and connection issues.
 *
 * Usage:
 *   import { collectDiagnostics } from './diagnostics'
 *   const diagnostics = await collectDiagnostics(sipClient, store)
 */

import type { SipClient } from '../core/SipClient'
import type { CallSession } from '../core/CallSession'
import type { MediaManager } from '../core/MediaManager'
import { VERSION } from './constants'

export interface DiagnosticResult {
  timestamp: string
  version: string
  connection: ConnectionDiagnostic
  registration: RegistrationDiagnostic
  media: MediaDiagnostic
  calls: CallDiagnostic
  summary: DiagnosticSummary
}

export interface ConnectionDiagnostic {
  state: string
  wsUrl?: string
  reconnectAttempts?: number
  lastConnected?: string
  lastError?: string
}

export interface RegistrationDiagnostic {
  state: string
  registeredUri?: string
  expires?: number
  registerExpiresAt?: string
}

export interface MediaDiagnostic {
  microphone: DeviceDiagnostic
  speaker: DeviceDiagnostic
  permissionGranted: boolean
  devicesAvailable: MediaDeviceInfo[]
}

export interface DeviceDiagnostic {
  deviceId: string
  label: string
  isActive: boolean
}

export interface CallDiagnostic {
  activeCalls: number
  calls: {
    id: string
    direction: string
    state: string
    peerNumber: string
    startTime?: string
    duration?: number
  }[]
}

export interface DiagnosticSummary {
  isHealthy: boolean
  issues: string[]
  recommendations: string[]
}

/**
 * Collect comprehensive diagnostics from the SIP client and related services
 */
export async function collectDiagnostics(
  sipClient?: SipClient,
  mediaManager?: MediaManager,
  calls?: CallSession[]
): Promise<DiagnosticResult> {
  const diagnostics: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    version: getVersion(),
    connection: collectConnectionDiagnostics(sipClient),
    registration: collectRegistrationDiagnostics(sipClient),
    media: await collectMediaDiagnostics(mediaManager),
    calls: collectCallDiagnostics(calls),
    summary: { isHealthy: true, issues: [], recommendations: [] },
  }

  // Generate summary
  diagnostics.summary = generateSummary(diagnostics)

  return diagnostics
}

function getVersion(): string {
  return VERSION
}

function collectConnectionDiagnostics(sipClient?: SipClient): ConnectionDiagnostic {
  if (!sipClient) {
    return {
      state: 'unavailable',
      reconnectAttempts: undefined,
    }
  }

  const state = sipClient.getState()
  const config = sipClient.getConfig()
  const connectionState = state?.connectionState || 'unknown'

  return {
    state: connectionState,
    wsUrl: config?.uri,
    reconnectAttempts: undefined,
    lastConnected: state?.lastRegistrationTime?.toISOString(),
  }
}

function collectRegistrationDiagnostics(sipClient?: SipClient): RegistrationDiagnostic {
  if (!sipClient) {
    return { state: 'unavailable' }
  }

  const state = sipClient.getState()
  const registrationState = state?.registrationState || 'unknown'

  return {
    state: registrationState,
    registeredUri: state?.registeredUri,
    expires: state?.registrationExpiry,
    registerExpiresAt: state?.lastRegistrationTime?.toISOString(),
  }
}

async function collectMediaDiagnostics(_mediaManager?: MediaManager): Promise<MediaDiagnostic> {
  const result: MediaDiagnostic = {
    microphone: { deviceId: '', label: 'none', isActive: false },
    speaker: { deviceId: '', label: 'none', isActive: false },
    permissionGranted: false,
    devicesAvailable: [],
  }

  try {
    // Get available devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices()
      result.devicesAvailable = devices

      // Find active mic
      const mic = devices.find((d) => d.kind === 'audioinput' && d.deviceId !== 'default')
      if (mic) {
        result.microphone = {
          deviceId: mic.deviceId,
          label: mic.label || 'unlabeled',
          isActive: true,
        }
      }

      // Find active speaker
      const speaker = devices.find((d) => d.kind === 'audiooutput' && d.deviceId !== 'default')
      if (speaker) {
        result.speaker = {
          deviceId: speaker.deviceId,
          label: speaker.label || 'unlabeled',
          isActive: true,
        }
      }
    }

    // Check permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        result.permissionGranted = true
        stream.getTracks().forEach((t) => t.stop())
      } catch {
        result.permissionGranted = false
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    result.microphone.label = `error: ${message}`
  }

  return result
}

function collectCallDiagnostics(calls?: CallSession[]): CallDiagnostic {
  const callList = (calls || []).map((call) => ({
    id: call.id,
    direction: call.direction,
    state: call.state,
    peerNumber: call.remoteUri,
    startTime: call.timing.startTime?.toISOString(),
    duration: call.timing.duration,
  }))

  return {
    activeCalls: callList.length,
    calls: callList,
  }
}

function generateSummary(diagnostics: DiagnosticResult): DiagnosticSummary {
  const issues: string[] = []
  const recommendations: string[] = []

  // Connection issues
  if (diagnostics.connection.state !== 'connected') {
    issues.push(`SIP connection: ${diagnostics.connection.state}`)
    recommendations.push('Check network connectivity and SIP server status')
  }

  // Registration issues
  if (diagnostics.registration.state !== 'registered') {
    issues.push(`SIP registration: ${diagnostics.registration.state}`)
    if (diagnostics.connection.state === 'connected') {
      recommendations.push('Re-register with SIP server')
    }
  }

  // Media issues
  if (!diagnostics.media.permissionGranted) {
    issues.push('Microphone permission not granted')
    recommendations.push('Grant microphone permission in browser settings')
  }

  if (
    diagnostics.media.microphone.label === 'none' ||
    diagnostics.media.microphone.label === 'error: NotAllowedError'
  ) {
    issues.push('No microphone available')
    recommendations.push('Connect a microphone and grant permission')
  }

  // Active calls
  if (diagnostics.calls.activeCalls > 5) {
    issues.push(`High number of active calls: ${diagnostics.calls.activeCalls}`)
    recommendations.push('Consider cleaning up stale call sessions')
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations,
  }
}

/**
 * Format diagnostics as human-readable string for logging/display
 */
export function formatDiagnostics(diag: DiagnosticResult): string {
  const lines = [
    '=== VueSIP Diagnostics ===',
    `Time: ${diag.timestamp}`,
    `Version: ${diag.version}`,
    '',
    '📡 Connection:',
    `  State: ${diag.connection.state}`,
    diag.connection.reconnectAttempts !== undefined
      ? `  Reconnects: ${diag.connection.reconnectAttempts}`
      : '',
    diag.connection.lastError ? `  Last Error: ${diag.connection.lastError}` : '',
    '',
    '📝 Registration:',
    `  State: ${diag.registration.state}`,
    diag.registration.registeredUri ? `  URI: ${diag.registration.registeredUri}` : '',
    '',
    '🎤 Media:',
    `  Mic: ${diag.media.microphone.label}`,
    `  Speaker: ${diag.media.speaker.label}`,
    `  Permission: ${diag.media.permissionGranted ? '✅' : '❌'}`,
    '',
    '📞 Calls:',
    `  Active: ${diag.calls.activeCalls}`,
    ...diag.calls.calls.map((c) => `    - ${c.direction} ${c.peerNumber} (${c.state})`),
    '',
    '📊 Summary:',
    `  Healthy: ${diag.summary.isHealthy ? '✅' : '❌'}`,
  ]

  if (diag.summary.issues.length > 0) {
    lines.push('  Issues:')
    diag.summary.issues.forEach((i) => lines.push(`    - ${i}`))
  }

  if (diag.summary.recommendations.length > 0) {
    lines.push('  Recommendations:')
    diag.summary.recommendations.forEach((r) => lines.push(`    - ${r}`))
  }

  return lines.filter((l) => l).join('\n')
}
