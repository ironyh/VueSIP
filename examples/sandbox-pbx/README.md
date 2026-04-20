# VueSIP sandbox PBX

Containerized Asterisk 22 for running the playground and call-center demos
without touching a real PBX. Zero outbound — `_X.` and `_[a-z].` catch-alls
return 603 Decline, so a creative dial pattern can't escape to a trunk.

## What's in the box

- 6 shared WebRTC accounts `demo1` .. `demo6` (password
  `sandbox-demoN` — public on purpose; shared sandbox, not private)
- WS on host `:18088` → container `:8088`
- WSS on host `:18089` → container `:8089` (self-signed cert generated on first boot)
- AMI on host `:15038` → container `:5038` (user `sandbox`, password `sandbox-ami-demo`) for the
  call-center demo
- Dialplan targets:
  - `600` — Echo test
  - `601` — Playback (demo-congrats)
  - `602` — Milliwatt tone
  - `700` — Voicemail main (PIN 1234 for every account)
  - `8000` — ConfBridge "sandbox"
  - `101` / `102` — auto-answering bot agents (for transfer / waiting demos)
  - `demo1`..`demo6` — direct peer-to-peer dial by name
  - anything else → 603 Decline

## Run it

```
cd examples/sandbox-pbx
docker compose up --build
```

First run takes ~1–2 min (builds the Debian image, installs Asterisk).
Subsequent `docker compose up` is seconds.

## Point the playground at it

In the VueSIP playground `ConnectionPanel`, use:

| Field  | Value                       |
| ------ | --------------------------- |
| Server | `localhost:18089`           |
| User   | `demo1` (or demo2..demo6)   |
| Pass   | `sandbox-demo1` (matches N) |

Self-signed TLS: Chrome will refuse the WSS until you visit
`https://localhost:18089/httpstatus` once and accept the cert.

## Verify

```
docker compose exec asterisk asterisk -rx "pjsip show endpoints"
docker compose exec asterisk asterisk -rx "pjsip show contacts"
docker compose exec asterisk asterisk -rx "dialplan show sandbox"
```

## Deploying publicly

This compose file is the local-dev recipe. For `pbx-demo.vuesip.com` we:

1. Copy config/ to the deploy host (dokploy VM `192.168.65.137`).
2. Mount real TLS at `./keys/sandbox.pem` (the acme.sh deploy hook
   pipeline from `homelab-infra/pbx-cert-sync` can target it the same
   way `telenurse.se` is handled).
3. Front it through HAProxy:
   - `pbx-demo.vuesip.com:443/ws` → `192.168.65.137:8089`
   - `pbx-demo.vuesip.com:443/ami` → `192.168.65.137:5038` (ws-upgrade)
4. TURN (`turn.vuesip.com`) on coturn co-located on same VM.

See `deploy/` (TBD) for the HAProxy snippet and Cloudflare DNS changes.
