# Real PBX Integration Tests

Tests in this directory exercise VueSIP against a real Asterisk/FreePBX instance
instead of the `MockSipServer` fixture. They are **opt-in** and are skipped
entirely unless the required environment variables are present.

## Why

Mock-based tests confirm our composables behave correctly against the contracts
we control. These tests confirm the contracts match what a real Asterisk emits
on the wire — registration challenges, AMI event shapes, response Action IDs,
etc. The mocks have drifted from reality before; this catches it.

## Requirements

Set these env vars (e.g. in `.env.test.local`, which is git-ignored):

```
# AMI (Asterisk Manager Interface, raw TCP 5038)
VUESIP_TEST_AMI_HOST=192.168.65.129
VUESIP_TEST_AMI_PORT=5038
VUESIP_TEST_AMI_USER=...
VUESIP_TEST_AMI_SECRET=...

# SIP over WebSocket
VUESIP_TEST_WS_URL=ws://192.168.65.129:8088/ws
VUESIP_TEST_SIP_DOMAIN=pbx.telenurse.se
VUESIP_TEST_SIP_USER=102
VUESIP_TEST_SIP_PASSWORD=...
```

All tests self-skip if the matching block is not configured.

## Running

```
pnpm test:integration:real-pbx
```

## What is covered

- **AMI** — Login banner, Ping round-trip, CoreStatus, PJSIPShowEndpoints
  event list, Error response on unknown action, Logoff.
- **SIP WS** — WebSocket upgrade with `Sec-WebSocket-Protocol: sip`, REGISTER
  parsed by the PBX, a valid `SIP/2.0` response returned, correlation headers
  echoed back.
- **SIP WS (opt-in, `VUESIP_TEST_SIP_EXPECT_AUTH=1`)** — 401 digest challenge,
  authenticated 200 OK, bad-password rejection, unregister with `Expires: 0`.

### Why strict auth is opt-in

FreePBX ships a catch-all identify (`pjsip.identify_custom.conf`):

```
[inbound-trunk-identify]
type=identify
endpoint=inbound-trunk
match=0.0.0.0/0
```

With `endpoint_identifier_order=ip,username,...` that rule pins every external
IP to `inbound-trunk` before username matching runs, so REGISTER for a user AoR
returns 404 Not Found. That's a real finding about the PBX (it can't accept
WebRTC clients from outside pre-provisioned trunks until the match range is
narrowed), so the default test suite asserts only protocol-level correctness.
Set `VUESIP_TEST_SIP_EXPECT_AUTH=1` once the PBX is configured to allow the
test client's IP to reach user-endpoint identification.

## Safety

- No tests call endpoints, originate channels, or otherwise produce audio.
- Credentials live only in env — never commit them.
- The `.env.test.local` file is already in `.gitignore`.
