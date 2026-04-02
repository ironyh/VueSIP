/**
 * Asterisk PBX Validation Integration Tests
 *
 * Validates VueSIP compatibility with Asterisk 20.x and 22.x PBX instances.
 * Tests cover registration, call flow, features, and edge cases.
 *
 * Run with real PBX: VUESIP_TEST_PBX_URI=wss://... VUESIP_TEST_PBX_TYPE=asterisk pnpm test:integration
 * Without real PBX: uses mock scenarios (default)
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MockPBXServer,
  ASTERISK_20_CONFIG,
  ASTERISK_22_CONFIG,
  createMockPBX,
  validatePBXConfig,
  type PBXConfig,
} from './pbx-mock-factory'

// ============================================================================
// Test Matrix: which Asterisk versions to validate
// ============================================================================

const asteriskVersions: PBXConfig[] = [ASTERISK_20_CONFIG, ASTERISK_22_CONFIG]

// ============================================================================
// Registration Validation
// ============================================================================

describe('Asterisk Registration Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('asterisk')
  })

  afterEach(() => {
    server.reset()
  })

  it('should validate Asterisk config structure', () => {
    const result = validatePBXConfig(ASTERISK_20_CONFIG)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it.each(asteriskVersions.map((c) => [c.version]))(
    'should register extension with Asterisk %s',
    (version) => {
      const config = asteriskVersions.find((c) => c.version === version)!
      const localServer = new MockPBXServer(config)
      const ext = config.extensions[0]

      const session = localServer.registerExtension(ext)
      expect(session.state).toBe('registered')
      expect(session.extension.number).toBe(ext.number)
    },
  )

  it('should handle registration failure gracefully', () => {
    const invalidConfig = { ...ASTERISK_20_CONFIG, wsUri: '' }
    const result = validatePBXConfig(invalidConfig)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing WebSocket URI')
  })

  it('should track registration events', () => {
    const ext = ASTERISK_20_CONFIG.extensions[0]
    server.registerExtension(ext)

    const events = server.getEventLog()
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('register')
    expect(events[0].data.extension).toBe(ext.number)
  })
})

// ============================================================================
// Call Flow Validation
// ============================================================================

describe('Asterisk Call Flow Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('asterisk')
    for (const ext of ASTERISK_20_CONFIG.extensions) {
      server.registerExtension(ext)
    }
  })

  afterEach(() => {
    server.reset()
  })

  it('should complete basic call flow: dial → ring → answer → hangup', () => {
    const call = server.simulateCall('1001', '1002')

    expect(call.state).toBe('ringing')
    expect(call.from).toBe('1001')
    expect(call.to).toBe('1002')

    server.answerCall(call.id)
    expect(call.state).toBe('active')
    expect(call.answeredAt).toBeTruthy()

    server.hangupCall(call.id)
    expect(call.state).toBe('ended')
    expect(call.duration).toBeGreaterThanOrEqual(0)
  })

  it('should handle unanswered call (no answer)', () => {
    const call = server.simulateCall('1001', '1002')
    server.hangupCall(call.id)

    expect(call.state).toBe('ended')
    expect(call.duration).toBe(0) // Never answered
    expect(call.answeredAt).toBeNull()
  })

  it('should handle multiple concurrent calls', () => {
    const call1 = server.simulateCall('1001', '1002')
    const call2 = server.simulateCall('1002', '1003')

    expect(server.getActiveCalls()).toHaveLength(2)

    server.answerCall(call1.id)
    server.answerCall(call2.id)
    expect(server.getActiveCalls()).toHaveLength(2)

    server.hangupCall(call1.id)
    expect(server.getActiveCalls()).toHaveLength(1)

    server.hangupCall(call2.id)
    expect(server.getActiveCalls()).toHaveLength(0)
  })

  it('should notify target extension of incoming call', () => {
    const ext2Session = server.registerExtension(ASTERISK_20_CONFIG.extensions[1])

    server.simulateCall('1001', '1002')

    expect(ext2Session.onIncomingCall).toHaveBeenCalledWith(
      expect.objectContaining({ from: '1001', to: '1002', state: 'ringing' }),
    )
  })

  it('should log call lifecycle events', () => {
    const call = server.simulateCall('1001', '1002')
    server.answerCall(call.id)
    server.hangupCall(call.id)

    const events = server.getEventLog()
    expect(events.filter((e) => e.type === 'call-start')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'call-answer')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'call-end')).toHaveLength(1)
  })
})

// ============================================================================
// Feature Validation (Stubs)
// ============================================================================

describe('Asterisk Feature Validation', () => {
  it('should report available features for Asterisk 20', () => {
    expect(ASTERISK_20_CONFIG.features?.transfer).toBe(true)
    expect(ASTERISK_20_CONFIG.features?.hold).toBe(true)
    expect(ASTERISK_20_CONFIG.features?.recording).toBe(true)
    expect(ASTERISK_20_CONFIG.features?.voicemail).toBe(true)
  })

  it('should report available features for Asterisk 22', () => {
    expect(ASTERISK_22_CONFIG.features?.transfer).toBe(true)
    expect(ASTERISK_22_CONFIG.features?.conference).toBe(true)
  })

  // TODO: Add real feature validation when connected to PBX
  it.todo('should validate blind transfer works')
  it.todo('should validate attended transfer works')
  it.todo('should validate hold/resume works')
  it.todo('should validate DTMF in-band and RFC 2833')
  it.todo('should validate voicemail deposit and retrieval')
  it.todo('should validate call parking')
  it.todo('should validate conference bridge')
})

// ============================================================================
// Edge Case Validation (Stubs)
// ============================================================================

describe('Asterisk Edge Case Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('asterisk')
  })

  afterEach(() => {
    server.reset()
  })

  it('should handle call to unregistered extension', () => {
    for (const ext of ASTERISK_20_CONFIG.extensions) {
      server.registerExtension(ext)
    }

    // Call to extension that doesn't exist
    expect(() => server.simulateCall('1001', '9999')).not.toThrow()
  })

  it('should handle rapid registration/deregistration', () => {
    const ext = ASTERISK_20_CONFIG.extensions[0]
    for (let i = 0; i < 10; i++) {
      const session = server.registerExtension(ext)
      expect(session.state).toBe('registered')
    }
  })

  // TODO: Add real edge case validation when connected to PBX
  it.todo('should handle SIP re-INVITE for media change')
  it.todo('should handle SIP UPDATE for session refresh')
  it.todo('should handle network interruption during call')
  it.todo('should handle WebSocket reconnection')
  it.todo('should handle SIP 408 Request Timeout')
  it.todo('should handle SIP 486 Busy Here')
  it.todo('should handle SIP 503 Service Unavailable')
  it.todo('should handle codec negotiation fallback')
})
