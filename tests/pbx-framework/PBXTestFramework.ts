/**
 * PBX Test Automation Framework
 *
 * Provides a structured test runner for PBX integration validation.
 * Leverages the existing MockSipServer to simulate PBX behaviour and
 * exposes helpers for writing concise, declarative SIP test cases.
 *
 * @module tests/pbx-framework/PBXTestFramework
 */

import {
  MockSipServer,
  type MockSipServerConfig,
  type MockRTCSession,
  type MockUA,
} from '../helpers/MockSipServer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** PBX platform under test */
export type PBXPlatform = 'asterisk' | 'freepbx' | 'generic'

/** PBX endpoint configuration used by every test case */
export interface PBXEndpointConfig {
  uri: string
  username: string
  password: string
  displayName: string
  platform: PBXPlatform
}

/** Outcome of a single PBX test case */
export interface PBXTestResult {
  name: string
  passed: boolean
  error?: string
  durationMs: number
  timestamp: string
}

/** A single test case executed against a MockSipServer */
export interface PBXTestCase {
  name: string
  run: (ctx: PBXTestContext) => Promise<void>
}

/** Context handed to every test case */
export interface PBXTestContext {
  server: MockSipServer
  ua: MockUA
  config: PBXEndpointConfig
  /** Helper – create an outgoing call and return the session */
  dial(target: string): MockRTCSession
  /** Helper – simulate an incoming call */
  receiveCall(from: string, to: string): MockRTCSession
}

/** Full test suite definition */
export interface PBXTestSuite {
  name: string
  platform: PBXPlatform
  serverConfig?: MockSipServerConfig
  cases: PBXTestCase[]
}

// ---------------------------------------------------------------------------
// Framework
// ---------------------------------------------------------------------------

/**
 * Run a PBXTestSuite and return per-case results.
 *
 * Designed for programmatic use (CI) – no console side-effects beyond debug
 * logging that can be silenced.
 */
export async function runPBXTestSuite(
  suite: PBXTestSuite,
  endpointConfig?: Partial<PBXEndpointConfig>
): Promise<{ suite: string; results: PBXTestResult[] }> {
  const config: PBXEndpointConfig = {
    uri: 'wss://sip.test.local/ws',
    username: 'testuser',
    password: 'testpass',
    displayName: 'Test User',
    platform: suite.platform,
    ...endpointConfig,
  }

  const server = new MockSipServer(suite.serverConfig)
  const ua = server.getUA()

  const ctx: PBXTestContext = {
    server,
    ua,
    config,
    dial(target: string) {
      return ua.call(target)
    },
    receiveCall(from: string, to: string) {
      return server.simulateIncomingCall(from, to)
    },
  }

  const results: PBXTestResult[] = []

  for (const tc of suite.cases) {
    const start = Date.now()
    try {
      server.reset()
      await tc.run(ctx)
      results.push({
        name: tc.name,
        passed: true,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      results.push({
        name: tc.name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
  }

  server.destroy()
  return { suite: suite.name, results }
}

/**
 * Convenience: build a markdown report from suite results.
 */
export function formatReport(suiteName: string, results: PBXTestResult[]): string {
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const lines: string[] = [
    `# PBX Test Report – ${suiteName}`,
    '',
    `**Passed:** ${passed}/${total}  `,
    `**Pass rate:** ${total ? ((passed / total) * 100).toFixed(1) : 0}%`,
    '',
    '| # | Test | Status | Duration |',
    '|---|------|--------|----------|',
  ]

  results.forEach((r, i) => {
    const icon = r.passed ? '✅' : '❌'
    lines.push(`| ${i + 1} | ${r.name} | ${icon} | ${r.durationMs}ms |`)
  })

  const failed = results.filter((r) => !r.passed)
  if (failed.length) {
    lines.push('', '## Failures', '')
    failed.forEach((r) => {
      lines.push(`### ${r.name}`, `- **Error:** ${r.error}`, '')
    })
  }

  return lines.join('\n')
}
