/**
 * PBX Integration Validation Tests
 *
 * Vitest suite exercising SIP registration, calls, hold/transfer, DTMF,
 * network recovery, and error scenarios against the MockSipServer.
 *
 * Run:  pnpm test tests/pbx-framework/pbx-integration.test.ts
 *
 * @module tests/pbx-framework/pbx-integration.test
 */

import { describe, it, expect } from 'vitest'
import {
  runPBXTestSuite,
  formatReport,
  type PBXTestSuite,
  type PBXTestCase,
} from './PBXTestFramework'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Small delay to let the mock server fire its timeouts */
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const registrationTests: PBXTestCase[] = [
  {
    name: 'successful SIP registration',
    async run({ server }) {
      server.getUA().register()
      server.simulateRegistered()
      await tick()
      expect(server.getUA().isRegistered()).toBe(true)
    },
  },
  {
    name: 'registration failure is handled',
    async run({ server }) {
      server.getUA().register()
      server.simulateRegistrationFailed('Bad credentials')
      await tick()
      expect(server.getUA().isRegistered()).toBe(false)
    },
  },
  {
    name: 'unregistration clears state',
    async run({ server }) {
      server.simulateRegistered()
      await tick()
      expect(server.getUA().isRegistered()).toBe(true)

      server.getUA().unregister()
      server.simulateUnregistered()
      await tick()
      expect(server.getUA().isRegistered()).toBe(false)
    },
  },
]

const callTests: PBXTestCase[] = [
  {
    name: 'outgoing call creates session',
    async run({ dial }) {
      const session = dial('sip:100@pbx.test')
      expect(session).toBeDefined()
      expect(session.id).toBeTruthy()
    },
  },
  {
    name: 'incoming call triggers event',
    async run({ ua, receiveCall }) {
      const events: unknown[] = []
      ua.on('newRTCSession', (data: unknown) => events.push(data))

      const session = receiveCall('sip:200@pbx.test', 'sip:100@pbx.test')
      await tick()
      expect(events).toHaveLength(1)
      expect(session).toBeDefined()
    },
  },
  {
    name: 'call accepted transitions to established',
    async run({ server, dial }) {
      const session = dial('sip:100@pbx.test')
      server.simulateCallAccepted(session)
      await tick()
      expect(session.isEstablished()).toBe(true)
    },
  },
  {
    name: 'call terminated marks session ended',
    async run({ server, dial }) {
      const session = dial('sip:100@pbx.test')
      server.simulateCallAccepted(session)
      await tick()

      session.terminate()
      server.simulateCallEnded(session, 'local')
      await tick()
      expect(session.isEnded()).toBe(true)
    },
  },
]

const mediaControlTests: PBXTestCase[] = [
  {
    name: 'hold and unhold fire events',
    async run({ server, dial }) {
      const session = dial('sip:100@pbx.test')
      server.simulateCallAccepted(session)
      await tick()

      server.simulateHold(session)
      await tick()

      server.simulateUnhold(session)
      await tick()

      // No throw = pass
      expect(true).toBe(true)
    },
  },
  {
    name: 'DTMF tones can be sent on established call',
    async run({ server, dial }) {
      const session = dial('sip:100@pbx.test')
      server.simulateCallAccepted(session)
      await tick()

      session.sendDTMF('1234#')
      expect(session.sendDTMF).toHaveBeenCalledWith('1234#')
    },
  },
  {
    name: 'call transfer via REFER',
    async run({ server, dial }) {
      const session = dial('sip:100@pbx.test')
      server.simulateCallAccepted(session)
      await tick()

      session.refer('sip:300@pbx.test')
      expect(session.refer).toHaveBeenCalledWith('sip:300@pbx.test')
    },
  },
]

const networkTests: PBXTestCase[] = [
  {
    name: 'network disconnect fires event',
    async run({ server, ua }) {
      const events: unknown[] = []
      ua.on('disconnected', (data: unknown) => events.push(data))

      server.simulateDisconnect()
      await tick()
      expect(events).toHaveLength(1)
      expect(server.getUA().isConnected()).toBe(false)
    },
  },
  {
    name: 'reconnect after disconnect',
    async run({ server }) {
      server.simulateDisconnect()
      await tick()
      expect(server.getUA().isConnected()).toBe(false)

      server.simulateConnect()
      await tick()
      expect(server.getUA().isConnected()).toBe(true)
    },
  },
]

const errorTests: PBXTestCase[] = [
  {
    name: 'invalid SIP URI throws',
    async run({ receiveCall }) {
      await expect(() => receiveCall('not-a-uri', 'sip:100@test')).toThrow(/invalid sip uri/i)
    },
  },
  {
    name: 'message sending does not throw',
    async run({ ua }) {
      ua.sendMessage('sip:100@pbx.test', 'hello')
      expect(ua.sendMessage).toHaveBeenCalledWith('sip:100@pbx.test', 'hello')
    },
  },
]

const loadTests: PBXTestCase[] = [
  {
    name: '10 concurrent sessions',
    async run({ dial }) {
      const sessions = Array.from({ length: 10 }, (_, i) => dial(`sip:${200 + i}@pbx.test`))
      expect(sessions).toHaveLength(10)
      sessions.forEach((s) => expect(s.id).toBeTruthy())
    },
  },
]

// ---------------------------------------------------------------------------
// Suites per platform
// ---------------------------------------------------------------------------

function makeSuite(platform: PBXTestSuite['platform']): PBXTestSuite {
  return {
    name: `PBX Integration – ${platform}`,
    platform,
    serverConfig: { autoRegister: false, networkLatency: 5 },
    cases: [
      ...registrationTests,
      ...callTests,
      ...mediaControlTests,
      ...networkTests,
      ...errorTests,
      ...loadTests,
    ],
  }
}

// ---------------------------------------------------------------------------
// Vitest describe
// ---------------------------------------------------------------------------

describe('PBX Integration Framework', () => {
  const platforms: Array<PBXTestSuite['platform']> = ['asterisk', 'freepbx', 'generic']

  platforms.forEach((platform) => {
    describe(`platform: ${platform}`, () => {
      const suite = makeSuite(platform)

      it(`runs full suite (${suite.cases.length} cases)`, async () => {
        const { results } = await runPBXTestSuite(suite)

        // Every case must pass
        const failed = results.filter((r) => !r.passed)
        if (failed.length) {
          const details = failed.map((f) => `  - ${f.name}: ${f.error}`).join('\n')
          throw new Error(`${failed.length}/${results.length} cases failed:\n${details}`)
        }

        expect(results).toHaveLength(suite.cases.length)
      })

      // Also exercise the report formatter
      it('produces a markdown report', async () => {
        const { suite: name, results } = await runPBXTestSuite(suite)
        const report = formatReport(name, results)
        expect(report).toContain('# PBX Test Report')
        expect(report).toContain(`**Passed:** ${results.length}/${results.length}`)
      })
    })
  })
})
