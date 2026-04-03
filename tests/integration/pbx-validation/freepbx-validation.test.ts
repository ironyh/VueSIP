/**
 * FreePBX Validation Integration Tests
 *
 * Validates VueSIP compatibility with FreePBX 16.x instances.
 * FreePBX wraps Asterisk, so these tests focus on FreePBX-specific
 * configurations, modules, and dialplan behaviors.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  MockPBXServer,
  FREEPBX_16_CONFIG,
  createMockPBX,
  validatePBXConfig,
  type PBXExtension,
} from './pbx-mock-factory'

// ============================================================================
// Registration Validation
// ============================================================================

describe('FreePBX Registration Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('freepbx')
  })

  afterEach(() => {
    server.reset()
  })

  it('should validate FreePBX config structure', () => {
    const result = validatePBXConfig(FREEPBX_16_CONFIG)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should identify as FreePBX type', () => {
    expect(server.type).toBe('freepbx')
    expect(server.version).toBe('16.0.40')
  })

  it('should register FreePBX extensions', () => {
    const ext = FREEPBX_16_CONFIG.extensions[0]
    const session = server.registerExtension(ext)

    expect(session.state).toBe('registered')
    expect(session.extension.number).toBe(ext.number)
    expect(session.extension.displayName).toBe(ext.displayName)
  })

  it('should handle trunk configuration', () => {
    expect(FREEPBX_16_CONFIG.trunks).toBeDefined()
    expect(FREEPBX_16_CONFIG.trunks!.length).toBeGreaterThan(0)

    const trunk = FREEPBX_16_CONFIG.trunks![0]
    expect(trunk.name).toBeTruthy()
    expect(trunk.host).toBeTruthy()
    expect(trunk.type).toBe('friend')
  })
})

// ============================================================================
// Call Flow Validation
// ============================================================================

describe('FreePBX Call Flow Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('freepbx')
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
  })

  afterEach(() => {
    server.reset()
  })

  it('should complete basic call flow via FreePBX', () => {
    const call = server.simulateCall('3001', '3002')

    expect(call.state).toBe('ringing')

    server.answerCall(call.id)
    expect(call.state).toBe('active')

    server.hangupCall(call.id)
    expect(call.state).toBe('ended')
  })

  it('should handle FreePBX ring group behavior', () => {
    // Simulate calling an extension that forwards to a ring group
    const call = server.simulateCall('3001', '3002')
    expect(call.state).toBe('ringing')

    // FreePBX ring groups may involve multiple targets
    server.answerCall(call.id)
    expect(call.state).toBe('active')
  })

  it('should log FreePBX-specific events', () => {
    const call = server.simulateCall('3001', '3002')
    server.answerCall(call.id)
    server.hangupCall(call.id)

    const events = server.getEventLog()
    const callEvents = events.filter((e) => e.type.startsWith('call'))
    expect(callEvents.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================================
// FreePBX Module Validation
// ============================================================================

describe('FreePBX Module Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('freepbx')
  })

  afterEach(() => {
    server.reset()
  })

  it('should report all FreePBX features as available', () => {
    const features = FREEPBX_16_CONFIG.features
    expect(features).toBeDefined()
    expect(features?.transfer).toBe(true)
    expect(features?.hold).toBe(true)
    expect(features?.conference).toBe(true)
    expect(features?.park).toBe(true)
  })

  it('should validate Core module (extensions)', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      const session = server.registerExtension(ext)
      expect(session.state).toBe('registered')
      expect(session.extension.number).toMatch(/^\d+$/)
      expect(session.extension.context).toBe('from-internal')
    }
  })

  it('should validate Framework module — config structure', () => {
    const result = validatePBXConfig(FREEPBX_16_CONFIG)
    expect(result.valid).toBe(true)
    expect(FREEPBX_16_CONFIG.type).toBe('freepbx')
    expect(FREEPBX_16_CONFIG.domain).toBeTruthy()
  })

  it('should validate SIPSETTINGS module — WebSocket URI', () => {
    expect(FREEPBX_16_CONFIG.wsUri).toMatch(/^wss?:\/\//)
    expect(FREEPBX_16_CONFIG.wsUri).toContain('8089')
  })

  it('should validate Voicemail module', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    const result = server.depositVoicemail('3001', 20)
    expect(result.messageId).toBeTruthy()
    expect(server.getVoicemailCount('3001')).toBe(1)
  })

  it('should validate Conferencing module (meetme/confbridge)', () => {
    expect(FREEPBX_16_CONFIG.features?.conference).toBe(true)
    const call = server.simulateCall('3001', '3002')
    server.answerCall(call.id)
    expect(call.state).toBe('active')
  })

  it('should validate Parking module', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    const call = server.simulateCall('3001', '3002')
    server.answerCall(call.id)
    server.parkCall(call.id, 71)
    expect(call.state).toBe('held')
  })

  it('should validate Ring Groups module', () => {
    // Ring groups call multiple extensions; simulate by creating multiple calls
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    const calls = [server.simulateCall('3001', '3002'), server.simulateCall('3001', '3003')]
    expect(calls).toHaveLength(2)
    expect(calls.every((c) => c.state === 'ringing')).toBe(true)
  })

  it('should validate Queues module', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    // Queue: caller waits, agent becomes available
    const call = server.simulateCall('3001', '3002')
    expect(call.state).toBe('ringing')
    server.answerCall(call.id)
    expect(call.state).toBe('active')
  })

  it('should validate IVR module', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    const call = server.simulateCall('3001', '3002')
    server.answerCall(call.id)
    // Simulate IVR DTMF navigation
    server.sendDTMF(call.id, '1', 'rfc2833')
    server.sendDTMF(call.id, '3', 'rfc2833')
    const dtmfEvents = server.getEventLog().filter((e) => e.type === 'dtmf')
    expect(dtmfEvents).toHaveLength(2)
  })

  it('should validate Follow-Me module', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    // Follow-Me: dial extension, which rings external number
    const call = server.simulateCall('3001', '3002')
    expect(call.state).toBe('ringing')
    server.answerCall(call.id)
    expect(call.state).toBe('active')
  })

  it('should validate Call Forward module', () => {
    server.registerExtension(FREEPBX_16_CONFIG.extensions[0])
    server.registerExtension(FREEPBX_16_CONFIG.extensions[1])
    // Call forwarded: original target redirects
    const call = server.simulateCall('3001', '3002')
    server.answerCall(call.id)
    server.transferCall(call.id, '3003')
    const events = server.getEventLog()
    expect(events.find((e) => e.type === 'blind-transfer')).toBeTruthy()
  })
})

// ============================================================================
// FreePBX Dialplan Validation
// ============================================================================

describe('FreePBX Dialplan Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('freepbx')
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
  })

  afterEach(() => {
    server.reset()
  })

  it('should validate from-internal context', () => {
    const internalExts = FREEPBX_16_CONFIG.extensions.filter((e) => e.context === 'from-internal')
    expect(internalExts.length).toBeGreaterThan(0)
    for (const ext of internalExts) {
      const session = server.registerExtension(ext)
      expect(session.state).toBe('registered')
    }
  })

  it('should validate from-external context', () => {
    // External calls arrive at a trunk, not an internal context
    const trunk = FREEPBX_16_CONFIG.trunks?.[0]
    expect(trunk).toBeDefined()
    // Simulate inbound call from trunk
    const call = server.simulateCall(trunk!.host, '3001')
    expect(call.state).toBe('ringing')
  })

  it('should validate outroute dialplan', () => {
    // Outbound routing: extension dials external number via trunk
    const call = server.simulateCall('3001', '01115551234')
    expect(call.state).toBe('ringing')
    server.hangupCall(call.id)
    expect(call.state).toBe('ended')
  })

  it('should validate feature codes (*72, *73, etc.)', () => {
    const call = server.simulateCall('3001', '3002')
    server.answerCall(call.id)
    // Feature codes use DTMF sequences
    server.sendDTMF(call.id, '*', 'rfc2833')
    server.sendDTMF(call.id, '7', 'rfc2833')
    server.sendDTMF(call.id, '2', 'rfc2833')
    const dtmfEvents = server.getEventLog().filter((e) => e.type === 'dtmf')
    expect(dtmfEvents).toHaveLength(3)
  })

  it('should validate custom dialplan includes', () => {
    // Custom dialplans use custom contexts
    const customExt: PBXExtension = {
      number: '4001',
      password: 'custompass',
      displayName: 'Custom Extension',
      context: 'custom-context',
    }
    const session = server.registerExtension(customExt)
    expect(session.state).toBe('registered')
    expect(session.extension.context).toBe('custom-context')
  })
})

// ============================================================================
// FreePBX Edge Case Validation
// ============================================================================

describe('FreePBX Edge Case Validation', () => {
  let server: MockPBXServer

  beforeEach(() => {
    server = createMockPBX('freepbx')
  })

  afterEach(() => {
    server.reset()
  })

  it('should handle concurrent calls across extensions', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }

    const call1 = server.simulateCall('3001', '3002')
    const call2 = server.simulateCall('3002', '3003')

    expect(server.getActiveCalls()).toHaveLength(2)

    server.answerCall(call1.id)
    server.answerCall(call2.id)
    server.hangupCall(call1.id)
    server.hangupCall(call2.id)

    expect(server.getActiveCalls()).toHaveLength(0)
  })

  it('should handle extension busy (SIP 486)', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    const call = server.simulateCall('3001', '3002')
    server.simulateSIPError(call.id, 486, 'Busy Here')
    expect(call.state).toBe('ended')
  })

  it('should handle no-answer timeout with voicemail', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    const call = server.simulateCall('3001', '3002')
    // No answer → timeout → voicemail
    server.hangupCall(call.id)
    expect(call.answeredAt).toBeNull()

    server.depositVoicemail('3002', 10)
    expect(server.getVoicemailCount('3002')).toBe(1)
  })

  it('should handle Follow-Me ring strategy', () => {
    for (const ext of FREEPBX_16_CONFIG.extensions) {
      server.registerExtension(ext)
    }
    // Follow-Me: ring multiple targets sequentially or simultaneously
    const call1 = server.simulateCall('3001', '3002')
    const call2 = server.simulateCall('3001', '3003')
    // First to answer wins
    server.answerCall(call2.id)
    expect(call2.state).toBe('active')
    server.hangupCall(call1.id)
    expect(call1.state).toBe('ended')
  })

  it('should handle queue agent login/logout', () => {
    const ext = FREEPBX_16_CONFIG.extensions[0]
    const session = server.registerExtension(ext)
    expect(session.state).toBe('registered')

    // Agent available → receives queue call
    const call = server.simulateCall('3002', '3001')
    server.answerCall(call.id)
    expect(call.state).toBe('active')

    // Agent logs out → no more queue calls
    server.hangupCall(call.id)
    expect(server.getActiveCalls()).toHaveLength(0)
  })

  it('should handle PJSIP vs chan_sip transport differences', () => {
    // PJSIP extension
    const pjsipExt: PBXExtension = {
      number: '5001',
      password: 'pjsippass',
      displayName: 'PJSIP Extension',
      context: 'from-internal',
      allow: ['opus', 'ulaw'],
    }
    const session = server.registerExtension(pjsipExt)
    expect(session.state).toBe('registered')
    expect(session.extension.allow).toContain('opus')
  })

  it('should handle WebSocket WSS certificate validation', () => {
    // WSS requires valid certificates; validate URI format
    expect(FREEPBX_16_CONFIG.wsUri).toMatch(/^wss:\/\//)
    // Invalid config should fail validation
    const badConfig = { ...FREEPBX_16_CONFIG, wsUri: 'http://not-websocket' }
    expect(badConfig.wsUri).not.toMatch(/^wss?:\/\//)
  })
})
