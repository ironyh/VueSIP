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
import { mockRTCPeerConnection } from './fixtures'
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

/**
 * Poll the queue member's status until it is "Available" (Asterisk status 1).
 * The queue member's PJSIP device state lags the SIP registration: FreePBX
 * aggregates PJSIP/<ext> + Custom:DND<ext> + CustomPresence:<ext> into one hint,
 * and Asterisk only flips it to "Not in use" (Available) once the device-state
 * aggregator runs. Injecting a caller before the member is Available bounces
 * the call out of the queue without ringing the agent. This wait makes the
 * inbound flow deterministic.
 */
async function amiWaitForAgentReady(opts: {
  host: string
  port: number
  user: string
  secret: string
  queue: string
  /** Member interface, e.g. "PJSIP/1001". */
  interface: string
  timeoutMs?: number
}): Promise<boolean> {
  const deadline = Date.now() + (opts.timeoutMs ?? 20000)
  while (Date.now() < deadline) {
    const ready = await new Promise<boolean>((resolve) => {
      const sock = new Socket()
      let buf = ''
      let done = false
      const finish = (r: boolean) => {
        if (done) return
        done = true
        clearTimeout(timer)
        try {
          sock.end()
        } catch {
          /* ignore */
        }
        resolve(r)
      }
      const timer = setTimeout(() => finish(false), 5000)
      sock.connect(opts.port, opts.host, () => {
        const send = (s: string) => sock.write(s + '\r\n')
        send(`Action: Login`)
        send(`Username: ${opts.user}`)
        send(`Secret: ${opts.secret}`)
        send(`Events: off`)
        send(``)
        send(`Action: QueueStatus`)
        send(`Queue: ${opts.queue}`)
        send(`Member: ${opts.interface}`)
        send(`ActionID: qs-${Date.now()}`)
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
          // QueueMember event (Asterisk 22/FreePBX fields): Location=PJSIP/1001,
          // Status (1=Not in use, 2=In use, 3=Unavailable, 4=Ringing, 5=On hold),
          // Paused (0=ready, 1=paused). A member receives queue calls when it is
          // not Paused and not Unavailable. We match on the Location field.
          if (pkt.Event === 'QueueMember' && pkt.Location === opts.interface) {
            const ready = pkt.Paused === '0' && pkt.Status !== '3'
            finish(ready)
          } else if (pkt.Event === 'QueueStatusComplete') {
            finish(false)
          }
        }
      })
      sock.on('error', () => finish(false))
    })
    if (ready) return true
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

test.describe('Call-center inbound (real PBX, Nivå 3)', () => {
  test.skip(!enabled, 'requires VUESIP_TEST_* env vars + healthy PBX WSS')

  test('AMI Originate injects a queue caller; app rings, accepts, wraps up', async ({
    page,
    mockMediaDevices,
  }) => {
    test.setTimeout(90000)
    // Install media mocks BEFORE page.goto(): both use addInitScript which runs
    // before the page loads, so JSSIP captures the patched RTCPeerConnection /
    // getUserMedia when it constructs its media stack during the incoming call.
    // Without mockRTCPeerConnection, answer() fails instantly (no WebRTC impl).
    await mockMediaDevices()
    await mockRTCPeerConnection(page)

    // 1) Connect the app to the PBX.
    await page.goto(CALL_CENTER_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.fill('#server', wsUrl!)
    await page.fill('#username', sipUser!)
    await page.fill('#password', sipPassword!)
    await page.fill('#displayName', 'PBX Inbound Test')
    await page.fill('#amiUrl', amiWsUrl!)

    // Sanity-check the AMI field bound correctly before connecting.
    const amiFieldVal = await page.inputValue('#amiUrl')
    if (!amiFieldVal) {
      throw new Error('amiUrl field is empty after fill — Vue v-model not syncing')
    }

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

    // Wait until Asterisk considers the queue member "Available" (Status=1).
    // The PJSIP device state lags the SIP registration (see amiWaitForAgentReady),
    // so injecting the caller before this settles causes the call to bounce out
    // of the queue without ringing the agent. This wait makes the flow deterministic.
    const agentReady = await amiWaitForAgentReady({
      host: amiHost!,
      port: amiPort!,
      user: amiUser!,
      secret: amiSecret!,
      queue: '8001',
      interface: `PJSIP/${sipUser}`,
      timeoutMs: 25000,
    })
    expect(agentReady, 'Queue member should become Available (Status=1) after registration').toBe(
      true
    )

    // 2) Inject a caller into queue 8001 via AMI Originate. The Local channel
    // dials the queue extension directly (Local/8001@from-internal); the CallerID
    // sets the inbound caller's number. Using Local/<callerNum> would try to dial
    // a non-existent extension and fail silently — the queue exten must be the
    // channel target.
    const callerNum = '5550003'
    const actionId = `e2e-inbound-${Date.now()}`
    const result = await amiOriginate({
      host: amiHost!,
      port: amiPort!,
      user: amiUser!,
      secret: amiSecret!,
      channel: `Local/8001@from-internal`,
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

    // 4) Accept the call. The app answers (200 OK with SDP), proving the agent
    //    can pick up a correlated queue call. Against a real PBX with a mocked
    //    media stack there is no real ICE/RTP path, so Asterisk tears the call
    //    down shortly after the answer. The app still drives the full lifecycle:
    //    answer → (remote CANCEL) → wrap-up. Asserting the wrap-up panel appears
    //    proves the inbound call was accepted and processed end-to-end — the
    //    deterministic Nivå 4 correlation. Sustained active-call + audio is
    //    covered by the mock-SIP-server e2e suite, which can simulate media.
    await page.getByTestId('call-center-incoming-accept').click()

    // If the call briefly connects (active-call up), hang up; otherwise the
    // remote already tore it down. Either way the app lands in wrap-up.
    const hangup = page.getByTestId('call-center-hangup')
    await expect(hangup.or(page.getByTestId('call-center-wrap-up'))).toBeVisible({
      timeout: 15000,
    })
    if (await hangup.isVisible().catch(() => false)) {
      await hangup.click()
    }

    // 5) Wrap-up — the call was processed.
    await expect(page.getByTestId('call-center-wrap-up')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('wrap-up-disposition').selectOption('resolved')
    await page.getByTestId('wrap-up-notes').fill('Nivå 4 live test')
    await page.getByTestId('wrap-up-complete').click()

    // Back to dashboard — the agent is still connected to the PBX.
    await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
      timeout: 10000,
    })
  })
})
