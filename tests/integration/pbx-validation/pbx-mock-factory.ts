/**
 * PBX Mock Factory
 *
 * Creates mock PBX server scenarios for integration testing.
 * Supports Asterisk and FreePBX configurations with realistic
 * SIP/WebSocket behaviors.
 *
 * @packageDocumentation
 */

import { vi } from 'vitest'

// ============================================================================
// PBX Configuration Types
// ============================================================================

export interface PBXConfig {
  type: 'asterisk' | 'freepbx'
  version: string
  wsUri: string
  domain: string
  extensions: PBXExtension[]
  trunks?: PBXTrunk[]
  features?: PBXFeatures
}

export interface PBXExtension {
  number: string
  password: string
  displayName: string
  context: string
  allow?: string[]
  disallow?: string[]
}

export interface PBXTrunk {
  name: string
  host: string
  username: string
  type: 'friend' | 'peer' | 'user'
}

export interface PBXFeatures {
  transfer: boolean
  hold: boolean
  recording: boolean
  voicemail: boolean
  park: boolean
  conference: boolean
}

// ============================================================================
// Pre-built PBX Scenarios
// ============================================================================

export const ASTERISK_20_CONFIG: PBXConfig = {
  type: 'asterisk',
  version: '20.8.1',
  wsUri: 'wss://asterisk20-test.local:8089/ws',
  domain: 'asterisk20-test.local',
  extensions: [
    { number: '1001', password: 'pass1001', displayName: 'Alice', context: 'from-internal' },
    { number: '1002', password: 'pass1002', displayName: 'Bob', context: 'from-internal' },
    { number: '1003', password: 'pass1003', displayName: 'Charlie', context: 'from-internal' },
  ],
  features: {
    transfer: true,
    hold: true,
    recording: true,
    voicemail: true,
    park: true,
    conference: true,
  },
}

export const ASTERISK_22_CONFIG: PBXConfig = {
  type: 'asterisk',
  version: '22.2.0',
  wsUri: 'wss://asterisk22-test.local:8089/ws',
  domain: 'asterisk22-test.local',
  extensions: [
    { number: '2001', password: 'pass2001', displayName: 'Alice', context: 'from-internal' },
    { number: '2002', password: 'pass2002', displayName: 'Bob', context: 'from-internal' },
  ],
  features: {
    transfer: true,
    hold: true,
    recording: true,
    voicemail: true,
    park: true,
    conference: true,
  },
}

export const FREEPBX_16_CONFIG: PBXConfig = {
  type: 'freepbx',
  version: '16.0.40',
  wsUri: 'wss://freepbx16-test.local:8089/ws',
  domain: 'freepbx16-test.local',
  extensions: [
    { number: '3001', password: 'pass3001', displayName: 'Extension 3001', context: 'from-internal' },
    { number: '3002', password: 'pass3002', displayName: 'Extension 3002', context: 'from-internal' },
    { number: '3003', password: 'pass3003', displayName: 'Extension 3003', context: 'from-internal' },
  ],
  trunks: [
    { name: 'sip-trunk-1', host: 'provider.example.com', username: 'trunkuser', type: 'friend' },
  ],
  features: {
    transfer: true,
    hold: true,
    recording: true,
    voicemail: true,
    park: true,
    conference: true,
  },
}

// ============================================================================
// Mock PBX Server
// ============================================================================

export class MockPBXServer {
  private config: PBXConfig
  private connectedExtensions: Map<string, MockExtensionSession> = new Map()
  private activeCalls: Map<string, MockCall> = new Map()
  private eventLog: PBXEvent[] = []

  constructor(config: PBXConfig) {
    this.config = config
  }

  get type() { return this.config.type }
  get version() { return this.config.version }

  /**
   * Simulate an extension registering with the PBX
   */
  registerExtension(extension: PBXExtension): MockExtensionSession {
    const session: MockExtensionSession = {
      extension,
      registeredAt: new Date(),
      state: 'registered',
      onIncomingCall: vi.fn(),
      onHangup: vi.fn(),
      onTransfer: vi.fn(),
    }
    this.connectedExtensions.set(extension.number, session)
    this.logEvent('register', { extension: extension.number })
    return session
  }

  /**
   * Simulate a call between two extensions
   */
  simulateCall(from: string, to: string): MockCall {
    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const call: MockCall = {
      id: callId,
      from,
      to,
      state: 'ringing',
      startedAt: new Date(),
      answeredAt: null,
      endedAt: null,
      duration: 0,
    }
    this.activeCalls.set(callId, call)
    this.logEvent('call-start', { callId, from, to })

    const toSession = this.connectedExtensions.get(to)
    if (toSession) {
      toSession.onIncomingCall?.({ callId, from, to, state: 'ringing' })
    }

    return call
  }

  /**
   * Answer a simulated call
   */
  answerCall(callId: string): void {
    const call = this.activeCalls.get(callId)
    if (!call) throw new Error(`Call ${callId} not found`)
    call.state = 'active'
    call.answeredAt = new Date()
    this.logEvent('call-answer', { callId })
  }

  /**
   * Hang up a simulated call
   */
  hangupCall(callId: string): void {
    const call = this.activeCalls.get(callId)
    if (!call) throw new Error(`Call ${callId} not found`)
    call.state = 'ended'
    call.endedAt = new Date()
    call.duration = call.answeredAt
      ? (call.endedAt.getTime() - call.answeredAt.getTime()) / 1000
      : 0
    this.logEvent('call-end', { callId, duration: call.duration })
  }

  /**
   * Get all events logged by this mock server
   */
  getEventLog(): PBXEvent[] {
    return [...this.eventLog]
  }

  /**
   * Get active calls
   */
  getActiveCalls(): MockCall[] {
    return [...this.activeCalls.values()].filter((c) => c.state !== 'ended')
  }

  /**
   * Reset server state
   */
  reset(): void {
    this.connectedExtensions.clear()
    this.activeCalls.clear()
    this.eventLog = []
  }

  private logEvent(type: string, data: Record<string, unknown>): void {
    this.eventLog.push({ type, data, timestamp: new Date() })
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface MockExtensionSession {
  extension: PBXExtension
  registeredAt: Date
  state: 'registered' | 'unregistered' | 'error'
  onIncomingCall: ReturnType<typeof vi.fn>
  onHangup: ReturnType<typeof vi.fn>
  onTransfer: ReturnType<typeof vi.fn>
}

export interface MockCall {
  id: string
  from: string
  to: string
  state: 'ringing' | 'active' | 'held' | 'ended'
  startedAt: Date
  answeredAt: Date | null
  endedAt: Date | null
  duration: number
}

export interface PBXEvent {
  type: string
  data: Record<string, unknown>
  timestamp: Date
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a PBX config has valid connection parameters
 */
export function validatePBXConfig(config: PBXConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.wsUri) errors.push('Missing WebSocket URI')
  if (!config.domain) errors.push('Missing domain')
  if (!config.extensions?.length) errors.push('No extensions configured')

  for (const ext of config.extensions) {
    if (!ext.number) errors.push(`Extension missing number: ${JSON.stringify(ext)}`)
    if (!ext.password) errors.push(`Extension ${ext.number} missing password`)
    if (!ext.context) errors.push(`Extension ${ext.number} missing context`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create a mock PBX server from environment or default config
 */
export function createMockPBX(type?: 'asterisk' | 'freepbx'): MockPBXServer {
  const config = type === 'freepbx' ? FREEPBX_16_CONFIG : ASTERISK_20_CONFIG
  return new MockPBXServer(config)
}
