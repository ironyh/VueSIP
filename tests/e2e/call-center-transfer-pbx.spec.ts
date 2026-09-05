/**
 * Nivå 6 — redirect a WAITING queue caller to another queue via the app UI.
 *
 * Deterministic by design: no SIP call is answered, so no real WebRTC media is
 * involved. The caller is injected into queue 8001 via AMI Originate, the
 * call-center app sees it in the live AMI-driven queue feed, and the agent
 * redirects it to queue 8002 through the queue-row redirect control. The PBX
 * proves the handoff with `QueueCallerJoin` on 8002 (caller number intact).
 *
 * Self-skips unless VUESIP_TEST_* env vars are set.
 */

import { test, expect } from './fixtures'
import {
  amiOriginate,
  AmiEventMonitor,
  loadPbxEnv,
  prepareQueues,
  type PbxEnv,
} from './helpers/pbx-ami'

const CALL_CENTER_URL = process.env.CALL_CENTER_URL || 'http://localhost:5175/'

const env = loadPbxEnv()
test.skip(!env, 'requires VUESIP_TEST_* env vars + live PBX')

test.describe('Call-center queue redirect (Nivå 6)', () => {
  test('waiting caller is redirected to queue 8002 via the queue-row UI', async ({ page }) => {
    test.setTimeout(120000)
    const pbx = env as PbxEnv
    const callerNum = '5550012'

    const monitor = new AmiEventMonitor()
    await monitor.connect({
      host: pbx.amiHost,
      port: pbx.amiPort,
      user: pbx.amiUser,
      secret: pbx.amiSecret,
    })

    try {
      // 1) Clean queues (stale callers from earlier runs) + unpause member.
      await prepareQueues({
        host: pbx.amiHost,
        port: pbx.amiPort,
        user: pbx.amiUser,
        secret: pbx.amiSecret,
        queues: ['8001', '8002', '8003'],
        interface: `PJSIP/1001`,
      })

      // 2) Connect the app (AMI client required for the Redirect action).
      await page.goto(CALL_CENTER_URL)
      await page.waitForLoadState('domcontentloaded')
      await page.fill('#server', pbx.wsUrl)
      await page.fill('#username', pbx.sipUser)
      await page.fill('#password', pbx.sipPassword)
      await page.fill('#displayName', 'Nivå6 Redirect Test')
      await page.fill('#amiUrl', pbx.amiWsUrl)

      await page
        .getByRole('button', { name: /connect/i })
        .first()
        .click()
      await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
        timeout: 20000,
      })

      // 3) Inject a caller into queue 8001 (the app's queue feed is AMI-driven,
      //    so the caller appears in the CallQueue panel without being answered).
      const result = await amiOriginate({
        host: pbx.amiHost,
        port: pbx.amiPort,
        user: pbx.amiUser,
        secret: pbx.amiSecret,
        channel: `Local/8001@from-internal`,
        context: 'from-internal',
        exten: '8001',
        callerId: `"Nivå6 Redirect Caller" <${callerNum}>`,
        actionId: `e2e-redirect-${Date.now()}`,
      })
      expect(result.success, `Originate should succeed: ${result.message}`).toBe(true)

      // The caller's row appears in the CallQueue panel (AMI-driven feed).
      const callerRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: callerNum })
      await expect(callerRow).toBeVisible({ timeout: 20000 })

      // 4) Redirect via the row's redirect control: target 8002.
      const rowInput = page.locator('[data-testid^="queue-redirect-input-"]').first()
      await rowInput.fill('8002')
      await page
        .locator('[data-testid^="queue-redirect-"]:not([data-testid*="input"])')
        .first()
        .click()

      // 5) PBX-side proof: the caller joined queue 8002 with its number intact
      //    (and left 8001).
      const deadline = Date.now() + 20000
      let redirected = false
      while (Date.now() < deadline && !redirected) {
        redirected = monitor
          .of('QueueCallerJoin')
          .some((e) => e.data.Queue === '8002' && e.data.CallerIDNum === callerNum)
        if (!redirected) await page.waitForTimeout(250)
      }
      expect(redirected, 'AMI should show the caller joining queue 8002').toBe(true)
      const left = monitor
        .of('QueueCallerLeave')
        .some((e) => e.data.Queue === '8001' && e.data.CallerIDNum === callerNum)
      expect(left, 'AMI should show the caller leaving queue 8001').toBe(true)

      // 6) Cleanup: hang up the redirected caller via AMI.
      const join = monitor
        .of('QueueCallerJoin')
        .find((e) => e.data.Queue === '8002' && e.data.CallerIDNum === callerNum)
      if (join?.data.Channel) {
        monitor.hangup(join.data.Channel)
      }

      // The queue row disappears from the app feed once the caller is gone.
      await expect(callerRow).toBeHidden({ timeout: 15000 })
    } finally {
      monitor.close()
    }
  })
})
