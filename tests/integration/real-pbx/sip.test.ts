// @vitest-environment node
/**
 * Real-PBX SIP-over-WebSocket integration tests.
 *
 * Gated on VUESIP_TEST_WS_URL + VUESIP_TEST_SIP_*. Verifies that:
 *   - the PBX accepts the `sip` subprotocol on /ws,
 *   - it parses our REGISTER and emits a valid SIP/2.0 response,
 *
 * Strict auth round-trip (401 → 200) is opt-in via VUESIP_TEST_SIP_EXPECT_AUTH=1
 * because some FreePBX installs use an `identify match=0.0.0.0/0` rule on an
 * inbound-trunk endpoint, which pins every external IP to the trunk and
 * pre-empts username-based endpoint matching. In that deployment REGISTER
 * legitimately returns 404 for any user AoR — a real signal about the PBX
 * config, not a test bug. Set the flag only on a PBX where extension
 * identification is reachable from the test client.
 */

import { describe, it, expect } from 'vitest'
import { registerOnce } from './sip-ws-client'
import { sipWsEnv } from './env'

const env = sipWsEnv()
const suite = env ? describe : describe.skip
const expectAuth = process.env.VUESIP_TEST_SIP_EXPECT_AUTH === '1'

suite('SIP over WebSocket — real PBX', () => {
  it('REGISTER returns a valid SIP/2.0 response', async () => {
    const outcome = await registerOnce({
      wsUrl: env!.wsUrl,
      domain: env!.domain,
      user: env!.user,
      password: env!.password,
      displayName: env!.displayName,
      expires: 60,
    })
    expect(outcome.challenge.statusLine).toMatch(/^SIP\/2\.0\s+\d{3}\s+/)
    // Any 4xx/2xx proves the server parsed our request and routed it.
    expect(outcome.challenge.status).toBeGreaterThanOrEqual(200)
    expect(outcome.challenge.status).toBeLessThan(700)
    // Echoed correlation headers must be present.
    expect(outcome.challenge.headers['call-id']).toBeDefined()
    expect(outcome.challenge.headers['cseq']).toBeDefined()
  }, 15000)

  it.runIf(expectAuth)('issues 401 with digest challenge and accepts valid auth', async () => {
    const outcome = await registerOnce({
      wsUrl: env!.wsUrl,
      domain: env!.domain,
      user: env!.user,
      password: env!.password,
      displayName: env!.displayName,
      expires: 60,
    })
    expect(outcome.challenge.status).toBe(401)
    const wwwAuth = outcome.challenge.headers['www-authenticate']
    const wwwAuthStr = Array.isArray(wwwAuth) ? wwwAuth[0] : wwwAuth
    expect(wwwAuthStr).toMatch(/^Digest /i)
    expect(wwwAuthStr).toMatch(/realm=/i)
    expect(wwwAuthStr).toMatch(/nonce=/i)
    expect(outcome.final.status).toBe(200)
  }, 15000)

  it.runIf(expectAuth)('rejects a bad password with 401 (no 200)', async () => {
    const outcome = await registerOnce({
      wsUrl: env!.wsUrl,
      domain: env!.domain,
      user: env!.user,
      password: `${env!.password}-wrong`,
      displayName: env!.displayName,
      expires: 60,
    })
    expect(outcome.challenge.status).toBe(401)
    expect(outcome.final.status).toBe(401)
  }, 15000)

  it.runIf(expectAuth)('un-registers with expires=0 and gets 200 OK', async () => {
    const outcome = await registerOnce({
      wsUrl: env!.wsUrl,
      domain: env!.domain,
      user: env!.user,
      password: env!.password,
      displayName: env!.displayName,
      expires: 0,
    })
    expect(outcome.final.status).toBe(200)
  }, 15000)
})
