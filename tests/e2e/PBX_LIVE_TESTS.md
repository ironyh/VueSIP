# Real-PBX Live Tests (Nivå 3/4/5)

Specs that run against the **live FreePBX/Asterisk homelab** instead of the
mock SIP server. They self-skip unless the `VUESIP_TEST_*` environment
variables are set, so a plain `playwright test` run is unaffected.

| Spec                                    | Level    | What it proves                                                                                                                                                                                                                                    |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `call-center-inbound-pbx.spec.ts`       | Nivå 3/4 | Signalling correlation: AMI Originate injects a queue caller, the agent rings, accepts (with mocked WebRTC), and the call is processed to wrap-up. Media cannot be sustained with mocks — Asterisk tears the call down after the answer.          |
| `call-center-inbound-pbx-audio.spec.ts` | Nivå 5   | **Real WebRTC media**: no RTC mocks. Queue caller rings, agent answers with the real ICE/DTLS/RTP stack, AMI reports `BridgeEnter`, the call **holds 12s** without a remote CANCEL, agent hangs up, AMI reports `BridgeLeave`, wrap-up completes. |

## Homelab dependencies

These are homelab-side prerequisites (maintained in the
`homelab-infra` repo, see `FREEPBX-CALLCENTER-QUEUES.md` there):

- **FreePBX/Asterisk** on LXC 113 (`192.168.65.129`), queues 8001/8002/8003
  with `PJSIP/1001` as static member, AMI user with the `originate` class.
- **WSS proxy** `wss.telenurse.se`: `/ws` → Asterisk :8088, `/ami` → AMI
  WebSocket bridge :3000 (HAProxy with health checks).
- **WebRTC endpoint** `nurse_1001` (password `TestPassword1001!`) — the only
  extension configured for WebRTC (`dtls`/`avpf`/`ice`). Plain-PJSIP 1001
  cannot negotiate browser media (its SDP is `RTP/AVP` without ICE
  candidates). The audio spec registers on it; the app's AMI login then adds
  it to the queues as a **dynamic** member, so no persistent queue config
  change is needed.
- **LAN TURN server** (coturn) on the telenurse host `192.168.65.127:3478`
  (user `vuesip`, password `turnpass2026`, relay ports 49160–49200 UDP). The
  test browser runs in WSL: its host candidates are mDNS-masked
  (`*.local`) and NAT-hidden from the PBX, so without TURN no ICE pair can
  form and Asterisk never reports `BridgeEnter`. The spec injects the TURN
  server through the `window.__VUESIP_RTC_CONFIGURATION` test hook, which the
  call-center app reads in `useEnvironmentSetup.toSipConfig()`.

## Environment variables

```bash
export VUESIP_TEST_WS_URL=wss://wss.telenurse.se/ws
export VUESIP_TEST_SIP_DOMAIN=sip.telenurse.se
export VUESIP_TEST_SIP_USER=1001          # signalling spec (plain PJSIP)
export VUESIP_TEST_SIP_PASSWORD=<see pjsip.auth.conf [1001-auth]>
export VUESIP_TEST_AMI_WS_URL=wss://wss.telenurse.se/ami
export VUESIP_TEST_AMI_HOST=192.168.65.129
export VUESIP_TEST_AMI_PORT=5038
export VUESIP_TEST_AMI_USER=DM1RjhF3tlrA
export VUESIP_TEST_AMI_SECRET=<ASTERISK_AMI_PASSWORD in telenurse .env>

# Audio spec overrides (optional — defaults are the homelab values):
# export VUESIP_TEST_AUDIO_SIP_USER=nurse_1001
# export VUESIP_TEST_AUDIO_SIP_PASSWORD=TestPassword1001!

export CALL_CENTER_PORT=5175              # dev-server port (5173/5174 are often taken)
export CALL_CENTER_URL=http://localhost:5175/
```

Secrets live in the telenurse `.env` (`ASTERISK_AMI_PASSWORD`) and in
`/etc/asterisk/pjsip.auth.conf` on the PBX (`[1001-auth]`).

## Running

```bash
# 1) Start the call-center dev server on a free port
cd examples/call-center
node ../../node_modules/vite/bin/vite.js --port 5175 --strictPort

# 2) Run the live specs (direct node invocation — the pnpm shim breaks on
#    Windows/UNC working directories)
cd ../..
node node_modules/@playwright/test/cli.js test \
  --config=tests/e2e/pbx.local.config.ts \
  tests/e2e/call-center-inbound-pbx.spec.ts \
  tests/e2e/call-center-inbound-pbx-audio.spec.ts
```

`tests/e2e/pbx.local.config.ts` is a single-worker config that points at the
running dev server (port via `CALL_CENTER_PORT`) instead of letting the
default config spawn its own webServer on the occupied 5173/5174 ports.

## Troubleshooting (lessons from the field)

- **"queue member should become Available + unpaused"** — the queue member is
  Paused or not yet joined. The specs force agent status `away` before
  connecting so the _Available_ click takes the app's `login()` path
  (QueueAdd + unpause). A stale `busy` status from a previous run otherwise
  takes the unpause-only path and the queue never gains the member. Manual
  unpause if needed:

  ```bash
  asterisk -x "queue pause member PJSIP/1001 queue 8001 unpause"
  ```

- **"Originate should succeed: Permission denied"** — the AMI user is missing
  the `originate` class (FreePBX default class lists omit it). See the
  homelab-infra doc for the `manager.conf` fix.

- **Originate succeeds but nobody rings** — the Local channel must dial the
  **queue extension** (`Local/8001@from-internal`), not the caller number;
  `Local/<callerNum>@from-internal` tries to dial a non-existent extension
  and fails silently.

- **Audio spec: "AMI should report BridgeEnter"** — media never established.
  Check in order: `nurse_1001` registered (`pjsip show contacts`), the
  Asterisk SDP offers `RTP/SAVPF` **with** `a=candidate` lines (i.e. the
  WebRTC endpoint was used), the TURN server answers
  (`turnutils_uclient` or a UDP probe to :3478), and the browser actually
  gathered candidates (wrap `RTCPeerConnection` in the page and log
  `icecandidate` events).

- **WSS proxy 502/503** — HAProxy health-check/backend issue, not an app bug.
  See the homelab-infra "WSS proxy stability fix" section; retry after the
  backend recovers.
