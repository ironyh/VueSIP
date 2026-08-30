/**
 * Nivå 5 — real-PBX inbound call with REAL WebRTC media.
 *
 * Differs from call-center-inbound-pbx.spec.ts (Nivå 3/4, Fas 2): that spec
 * mocks RTCPeerConnection + getUserMedia, which proves the AMI↔SIP signalling
 * correlation but cannot sustain the call — Asterisk tears it down shortly
 * after the answer because no real ICE/DTLS/RTP ever flows.
 *
 * This spec runs the REAL WebRTC stack in Chromium (fake media device produces
 * a real audio track; no RTC mocks) and proves the full Nivå 5 chain:
 *   queue caller → ring → accept → ICE/DTLS/RTP established →
 *   BridgeEnter seen on AMI → call holds (no remote CANCEL) → agent hangup
 *   → wrap-up.
 *
 * Self-skips unless VUESIP_TEST_* env vars are set. Requires the dev server
 * (CALL_CENTER_URL) and the live PBX to be reachable.
 */

import { test, expect } from './fixtures'
import {
  amiOriginate,
  amiWaitForAgentReady,
  AmiEventMonitor,
  loadPbxEnv,
  type PbxEnv,
} from './helpers/pbx-ami'

const CALL_CENTER_URL = process.env.CALL_CENTER_URL || 'http://localhost:5174/'

const env = loadPbxEnv()
test.skip(!env, 'requires VUESIP_TEST_* env vars + live PBX')

// Real getUserMedia backed by Chromium's generated-tone fake device — the
// WebRTC stack is real, only the microphone is synthetic. Top-level test.use
// (launchOptions cannot be set inside a describe group).
test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
})

test.describe('Call-center inbound with real WebRTC media (Nivå 5)', () => {
  test('queue caller rings, agent answers, media bridges and holds, hangup', async ({ page }) => {
    test.setTimeout(180000)
    // Bridge browser console/page errors to stdout so the CI log carries the
    // app's own connection diagnostics when a nightly run fails.
    page.on('console', (m) => {
      const t = m.text()
      if (/error|fail|denied|timeout|refused|SIP|ICE|unregistered/i.test(t)) {
        process.stdout.write(`[browser.${m.type()}] ${t.slice(0, 300)}\n`)
      }
    })
    page.on('pageerror', (e) => process.stdout.write(`[pageerror] ${e.message}\n`))
    // Register on the WebRTC-enabled endpoint (nurse_1001: dtls/avpf/ice) —
    // the plain-PJSIP endpoint used by the signalling spec cannot negotiate
    // real WebRTC media. The app's AMI login adds it to the queues as a
    // dynamic member, so no persistent PBX config change is required.
    const pbx: PbxEnv = {
      ...(env as PbxEnv),
      sipUser: process.env.VUESIP_TEST_AUDIO_SIP_USER || 'nurse_1001',
      sipPassword: process.env.VUESIP_TEST_AUDIO_SIP_PASSWORD || 'TestPassword1001!',
    }
    const callerNum = '5550010'

    const monitor = new AmiEventMonitor()
    await monitor.connect({
      host: pbx.amiHost,
      port: pbx.amiPort,
      user: pbx.amiUser,
      secret: pbx.amiSecret,
    })

    try {
      // 1) Connect the app to the PBX — no media mocks, real WebRTC stack.
      //    Browser candidates are mDNS-masked/NAT-hidden from the PBX (WSL
      //    test browser), so route media through the LAN TURN on the
      //    telenurse host (coturn, see homelab-infra docs).
      await page.addInitScript(() => {
        ;(window as { __VUESIP_RTC_CONFIGURATION?: unknown }).__VUESIP_RTC_CONFIGURATION = {
          iceServers: [
            {
              urls: 'turn:192.168.65.127:3478',
              username: 'vuesip',
              credential: 'turnpass2026',
            },
          ],
        }
      })
      // Start from a deterministic agent status: 'away' makes the later
      // Available click take the login() path (QueueAdd + unpause) instead of
      // a stale saved status taking the unpause-only path (no queue join).
      await page.addInitScript(() => {
        localStorage.setItem('callcenter:agentStatus', 'away')
      })
      await page.goto(CALL_CENTER_URL)
      await page.waitForLoadState('domcontentloaded')
      await page.fill('#server', pbx.wsUrl)
      await page.fill('#username', pbx.sipUser)
      await page.fill('#password', pbx.sipPassword)
      await page.fill('#displayName', 'Nivå5 Audio Test')
      await page.fill('#amiUrl', pbx.amiWsUrl)

      // Sanity-check the AMI field bound correctly before connecting.
      const amiFieldVal = await page.inputValue('#amiUrl')
      if (!amiFieldVal) {
        throw new Error('amiUrl field is empty after fill — Vue v-model not syncing')
      }

      await page
        .getByRole('button', { name: /connect/i })
        .first()
        .click()
      await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
        timeout: 20000,
      })

      // 2) Set agent available and wait until the queue member can take calls.
      await page
        .locator('button:has-text("Available")')
        .first()
        .click()
        .catch(() => {})
      const agentReady = await amiWaitForAgentReady({
        host: pbx.amiHost,
        port: pbx.amiPort,
        user: pbx.amiUser,
        secret: pbx.amiSecret,
        queue: '8001',
        interface: `PJSIP/${pbx.sipUser}`,
        timeoutMs: 25000,
      })
      expect(agentReady, 'queue member should become Available + unpaused').toBe(true)

      // 3) Inject a caller into queue 8001 (Local channel dials the queue).
      const result = await amiOriginate({
        host: pbx.amiHost,
        port: pbx.amiPort,
        user: pbx.amiUser,
        secret: pbx.amiSecret,
        channel: `Local/8001@from-internal`,
        context: 'from-internal',
        exten: '8001',
        callerId: `"Nivå5 Audio Caller" <${callerNum}>`,
        actionId: `e2e-audio-${Date.now()}`,
      })
      expect(result.success, `Originate should succeed: ${result.message}`).toBe(true)

      // 4) The app rings; AMI side saw the agent being dialed (correlation).
      await expect(page.getByTestId('call-center-incoming-banner')).toBeVisible({
        timeout: 20000,
      })
      expect(await monitor.waitFor('AgentCalled', 5000)).toBe(true)

      // 5) Answer. With the real WebRTC stack the answer triggers ICE/DTLS/RTP
      //    against Asterisk; if media cannot be established Asterisk CANCELs.
      await page.getByTestId('call-center-incoming-accept').click()

      // Active-call view appears on answer...
      const hangup = page.getByTestId('call-center-hangup')
      await expect(hangup.or(page.getByTestId('call-center-active-call')).first()).toBeVisible({
        timeout: 20000,
      })

      // ...and Asterisk actually bridged the channels (PBX-side proof).
      const bridged = await monitor.waitFor('BridgeEnter', 20000)
      expect(bridged, 'AMI should report BridgeEnter — Asterisk bridged the call').toBe(true)

      // 6) THE Nivå 5 assertion: the call HOLDS. With mocked media Asterisk
      //    tears the call down within seconds; with real ICE/DTLS/RTP it stays
      //    up. Active-call control must still be visible after a 12s hold.
      await page.waitForTimeout(12000)
      const stillUp =
        (await page
          .getByTestId('call-center-active-call')
          .isVisible()
          .catch(() => false)) || (await hangup.isVisible().catch(() => false))
      expect(stillUp, 'call should still be established after 12s hold (no remote CANCEL)').toBe(
        true
      )

      // 7) Agent hangs up → wrap-up flow.
      await hangup.click()
      await expect(page.getByTestId('call-center-wrap-up')).toBeVisible({ timeout: 15000 })
      await page.getByTestId('wrap-up-disposition').selectOption('resolved')
      await page.getByTestId('wrap-up-notes').fill('Nivå 5 real-media test')
      await page.getByTestId('wrap-up-complete').click()

      // Back to dashboard — still connected to the PBX.
      await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
        timeout: 10000,
      })

      // PBX-side epilogue: the bridge was torn down cleanly.
      const bridgeLeft = await monitor.waitFor('BridgeLeave', 15000)
      expect(bridgeLeft, 'AMI should report BridgeLeave after hangup').toBe(true)
    } finally {
      monitor.close()
    }
  })
})
