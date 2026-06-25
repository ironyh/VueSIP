/**
 * Nivå 3 — real-PBX inbound call flow (Fas 2).
 *
 * Injects a caller into queue 8001 via AMI Originate, then drives the call-center
 * app (registered on PJSIP/1001) through the full flow: ringing banner → accept
 * → active call → hangup → wrap-up. Verifies the AMI↔SIP correlation and the
 * end-to-end path that the app changes in feat/call-center-inbound-answer enable.
 *
 * Self-skips unless VUESIP_TEST_* env vars are set (same gating as
 * call-center-pbx.spec.ts). Note: depends on the PBX WSS proxy being healthy
 * (registration flakiness on wss.telenurse.se will fail this test — that is an
 * infrastructure issue, not an app bug).
 *
 * Run with creds from telenurse .env:
 *   VUESIP_TEST_WS_URL=wss://... VUESIP_TEST_SIP_USER=1001 ... pnpm test:e2e -- call-center-inbound-pbx
 */

import { test, expect } from './fixtures'
import { Socket } from 'node:net'

const amiHost = process.env.VUESIP_TEST_AMI_HOST
const amiPort = process.env.VUESIP_TEST_AMI_PORT
  ? parseInt(process.env.VUESIP_TEST_AMI_PORT)
  : undefined
const amiUser = process.env.VUESIP_TEST_AMI_USER
const amiSecret = process.env.VUESIP_TEST_AMI_SECRET
const wsUrl = process.env.VUESIP_TEST_WS_URL
const sipDomain = process.env.VUESIP_TEST_SIP_DOMAIN
const sipUser = process.env.VUESIP_TEST_SIP_USER
const sipPassword = process.env.VUESIP_TEST_SIP_PASSWORD
const amiWsUrl = process.env.VUESIP_TEST_AMI_WS_URL

const enabled =
  amiHost &&
  amiPort &&
  amiUser &&
  amiSecret &&
  wsUrl &&
  sipDomain &&
  sipUser &&
  sipPassword &&
  amiWsUrl
    ? true
    : false

const CALL_CENTER_URL = process.env.CALL_CENTER_URL || 'http://localhost:5174/'

/** Minimal raw-AMI helper for Originate (mirrors AmiTestClient's wire format). */
async function amiOriginate(opts: {
  host: string
  port: number
  user: string
  secret: string
  channel: string
  context: string
  exten: string
  callerId: string
  actionId: string
}): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const sock = new Socket()
    let buf = ''
    let resolved = false
    const finish = (r: { success: boolean; message: string }) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      try {
        sock.end()
      } catch {
        /* ignore */
      }
      resolve(r)
    }
    const timer = setTimeout(() => {
      finish({ success: false, message: 'Originate timeout' })
    }, 10000)

    sock.connect(opts.port, opts.host, () => {
      const send = (s: string) => sock.write(s + '\r\n')
      // Login
      send(`Action: Login`)
      send(`Username: ${opts.user}`)
      send(`Secret: ${opts.secret}`)
      send(`Events: off`)
      send(``)
      // Originate (the login frame + originate frame are pipelined; AMI handles them in order)
      send(`Action: Originate`)
      send(`Channel: ${opts.channel}`)
      send(`Context: ${opts.context}`)
      send(`Exten: ${opts.exten}`)
      send(`Priority: 1`)
      send(`CallerID: ${opts.callerId}`)
      send(`Async: true`)
      send(`ActionID: ${opts.actionId}`)
      send(`Timeout: 20000`)
      send(``)
    })
    sock.on('data', (chunk) => {
      buf += chunk.toString()
      let idx: number
      while ((idx = buf.indexOf('\r\n\r\n')) !== -1) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 4)
        const lines = frame.split('\r\n')
        const pkt: Record<string, string> = {}
        for (const l of lines) {
          const ci = l.indexOf(':')
          if (ci !== -1) pkt[l.slice(0, ci).trim()] = l.slice(ci + 1).trim()
        }
        if (pkt.Response === 'Success' && pkt.Message?.includes('Originate')) {
          finish({ success: true, message: pkt.Message })
        } else if (pkt.Response === 'Error' && pkt.ActionID === opts.actionId) {
          finish({ success: false, message: pkt.Message })
        } else if (pkt.Response === 'Success' && pkt.Message === 'Authentication accepted') {
          // login ok, waiting for originate response
        }
      }
    })
    sock.on('error', (err) => {
      if (!resolved) reject(err)
    })
  })
}

test.describe('Call-center inbound (real PBX, Nivå 3)', () => {
  test.skip(!enabled, 'requires VUESIP_TEST_* env vars + healthy PBX WSS')

  test('AMI Originate injects a queue caller; app rings, accepts, wraps up', async ({
    page,
    mockMediaDevices,
  }) => {
    test.setTimeout(90000)
    await mockMediaDevices()

    // 1) Connect the app to the PBX.
    await page.goto(CALL_CENTER_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.fill('#server', wsUrl!)
    await page.fill('#username', sipUser!)
    await page.fill('#password', sipPassword!)
    await page.fill('#displayName', 'PBX Inbound Test')
    await page.fill('#amiUrl', amiWsUrl!)
    await page
      .getByRole('button', { name: /connect/i })
      .first()
      .click()

    // Wait for registration + AMI connect.
    await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
      timeout: 20000,
    })
    // Set agent available (logs into queues).
    const availableBtn = page.locator('button:has-text("Available")').first()
    await availableBtn.click().catch(() => {})
    // Give AMI login time.
    await page.waitForTimeout(5000)

    // 2) Inject a caller into queue 8001 via AMI Originate.
    const actionId = `e2e-inbound-${Date.now()}`
    const callerNum = '5550001'
    const result = await amiOriginate({
      host: amiHost!,
      port: amiPort!,
      user: amiUser!,
      secret: amiSecret!,
      channel: `Local/${callerNum}@from-internal`,
      context: 'from-internal',
      exten: '8001',
      callerId: `"Nivå3 Test Caller" <${callerNum}>`,
      actionId,
    })
    expect(result.success, `Originate should succeed: ${result.message}`).toBe(true)

    // 3) The app should ring (IncomingCallBanner appears).
    await expect(page.getByTestId('call-center-incoming-banner')).toBeVisible({
      timeout: 20000,
    })

    // 4) Accept the call.
    await page.getByTestId('call-center-incoming-accept').click()
    await expect(page.getByTestId('call-center-active-call')).toBeVisible({ timeout: 15000 })

    // 5) Hang up → wrap-up.
    await page.getByTestId('call-center-hangup').click()
    await expect(page.getByTestId('call-center-wrap-up')).toBeVisible({ timeout: 15000 })

    await page.getByTestId('wrap-up-disposition').selectOption('resolved')
    await page.getByTestId('wrap-up-notes').fill('Nivå 3 live test')
    await page.getByTestId('wrap-up-complete').click()

    // Back to dashboard — the call completed and wrapped up.
    await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
      timeout: 10000,
    })
  })
})
