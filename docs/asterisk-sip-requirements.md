# Asterisk SIP Requirements & Edge Cases Research

**Subtask**: Research Asterisk SIP requirements and edge cases
**Date**: 2026-04-03
**Scope**: Minimum SIP requirements, working configs, edge cases, version-specific notes

---

## 1. Minimum SIP Feature Requirements

### Authentication

| Method          | Asterisk Support     | VueSIP Usage | Notes                                    |
| --------------- | -------------------- | ------------ | ---------------------------------------- |
| Digest MD5      | ✅ `res_pjsip`       | Primary      | Default, widely supported                |
| Digest SHA-256  | ✅ 20+               | Fallback     | Stronger hash, configure in auth section |
| Plain text      | ✅ (not recommended) | Dev only     | `auth_type=plaintext` in pjsip.conf      |
| IP-based        | ✅                   | N/A          | `identify_by=ip` for trunk auth          |
| TLS client cert | ✅ 18+               | Future       | `res_pjsip` TLS transport                |

### Required SIP Methods

| Method           | RFC  | Required For                                 |
| ---------------- | ---- | -------------------------------------------- |
| REGISTER         | 3261 | Extension registration                       |
| INVITE           | 3261 | Call setup                                   |
| ACK              | 3261 | Call confirmation                            |
| BYE              | 3261 | Call termination                             |
| CANCEL           | 3261 | Cancel pending INVITE                        |
| OPTIONS          | 3261 | Health check / keepalive                     |
| REFER            | 3515 | Call transfer                                |
| UPDATE           | 3311 | Session modification (no SDP re-negotiation) |
| PRACK            | 3262 | Reliable provisional responses               |
| INFO             | 6086 | DTMF relay, application info                 |
| SUBSCRIBE/NOTIFY | 3265 | Presence, BLF, voicemail MWI                 |

### Required SIP Headers

```
Contact:         Registration binding
Allow:           Advertised methods
Supported:       Extension support (replaces, 100rel)
Session-Expires: Session timer
Min-SE:          Minimum session timer
User-Agent:      Identification
```

---

## 2. Working Configurations

### Asterisk 20 (certified-20.7-cert10) — PJSIP

```ini
; pjsip.conf — Tested working configuration
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
; TLS certificate required for WSS:
; cert_file=/etc/asterisk/keys/asterisk.pem
; priv_key_file=/etc/asterisk/keys/asterisk.key

[1001]
type=endpoint
context=from-internal
disallow=all
allow=opus,ulaw,alaw
auth=1001-auth
aors=1001-aor
webrtc=yes
; Required for WebRTC:
dtls_auto_generate_cert=yes
media_encryption=dtls
ice_support=yes
use_avpf=yes
max_audio_streams=1

[1001-auth]
type=auth
auth_type=userpass
username=1001
password=pass1001

[1001-aor]
type=aor
max_contacts=2
remove_existing=yes
remove_unavailable=yes
```

### Asterisk 22 (certified-22.8-cert2) — PJSIP

Same configuration as Asterisk 20 with these additions:

```ini
[1001]
; Asterisk 22 supports additional features:
; direct_media_method=invite    ; Re-INVITE for direct media
; connected_line_method=update  ; Use UPDATE for connected line
; bundle=yes                    ; BUNDLE support for WebRTC
```

### AMI WebSocket Proxy (amiws)

VueSIP connects via amiws proxy, not directly to Asterisk AMI:

```json
{
  "amiws": {
    "host": "127.0.0.1",
    "port": 5039,
    "username": "admin",
    "secret": "amp111"
  },
  "ws": {
    "port": 8088,
    "ssl": true
  }
}
```

---

## 3. Edge Cases

### Registration Edge Cases

| Scenario             | Behavior                                             | Handling                                                |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Duplicate REGISTER   | Asterisk replaces binding (if `remove_existing=yes`) | VueSIP re-registers on reconnect                        |
| Expired registration | 403 Forbidden on INVITE                              | Monitor registration expiry, re-register before timeout |
| NAT detection        | `qualify_frequency=60` sends OPTIONS                 | `comedia=yes` for asymmetric RTP                        |
| Multiple contacts    | `max_contacts=2` allows dual registration            | Last registered wins unless configured otherwise        |
| Auth failure         | 401 → retry with credentials                         | Exponential backoff on repeated failures                |

### Call Flow Edge Cases

| Scenario                 | Behavior                                      | Handling                                        |
| ------------------------ | --------------------------------------------- | ----------------------------------------------- |
| Re-INVITE (media change) | Session refresh, codec change                 | Handle 200 OK with new SDP, or 491 if conflict  |
| UPDATE (no re-INVITE)    | Modify session without SDP renegotiation      | Supported in Asterisk 20+ via PJSIP             |
| CANCEL race condition    | INVITE/CANCEL race                            | Handle 200 OK to INVITE after CANCEL sent       |
| 1XX provisional          | 100 Trying, 180 Ringing, 183 Session Progress | Process 183 with early media for ringback tones |
| Forked INVITE            | Multiple 200 OK responses                     | First answer wins, BYE others                   |
| Overlap dialing          | INVITE with partial digits                    | Configure `overlap=yes` in endpoint             |

### SIP Error Response Handling

| Code | Meaning             | VueSIP Action                                |
| ---- | ------------------- | -------------------------------------------- |
| 408  | Request Timeout     | Re-register, retry with backoff              |
| 486  | Busy Here           | Show busy indication, offer voicemail        |
| 487  | Request Terminated  | Call was cancelled, clean up                 |
| 491  | Request Pending     | Re-INVITE conflict, retry after random delay |
| 503  | Service Unavailable | Failover to alternate server, or queue retry |
| 603  | Decline             | Target rejected, show notification           |

### Media Edge Cases

| Scenario       | Behavior                     | Handling                                       |
| -------------- | ---------------------------- | ---------------------------------------------- |
| ICE failure    | No media path established    | Retry with TURN relay                          |
| DTLS failure   | Media encryption setup fails | Fallback or reject call                        |
| Codec mismatch | 488 Not Acceptable Here      | Negotiate from allowed codec list              |
| Packet loss    | Degraded audio quality       | Use adaptive jitter buffer (Opus handles well) |
| One-way audio  | NAT/firewall issue           | `rtp_symmetric=yes`, `rewrite_contact=yes`     |

---

## 4. Version-Specific Considerations

### Asterisk 20 (LTS, certified)

- **chan_sip deprecated**: Use `res_pjsip` exclusively
- **PJSIP stable**: Full RFC compliance, WebSocket transport mature
- **WebRTC**: `webrtc=yes` shorthand enables DTLS, ICE, AVPF
- **AMI**: All VueSIP-used actions fully compatible (see audit-asterisk-20-22-compat.md)
- **Limitations**: No native XCCS; use AMI for call control instead
- **Session timers**: Default 1800s, minimum 90s

### Asterisk 22 (current)

- **All Asterisk 20 features** plus:
- **Improved BUNDLE**: Better WebRTC multiplexing
- **Enhanced DTLS**: Auto-generate cert for development
- **Opus improvements**: Better codec negotiation
- **AMI additions**: No breaking changes from 20
- **Deprecation warnings**: `chan_sip` fully removed in some builds

### Migration from chan_sip to PJSIP

If existing deployments use `chan_sip`:

```bash
# Convert sip.conf to pjsip.conf
asterisk -x "pjsip export_wizard_core"
```

Key differences:

- `host=dynamic` → `aors` with `max_contacts`
- `secret=` → `auth` section with `password=`
- `transport=ws` → explicit `transport-wss` section
- `nat=yes` → `rtp_symmetric=yes`, `rewrite_contact=yes`

---

## 5. Integration Guidelines

### Minimum Requirements for VueSIP Integration

1. **Asterisk version**: 20+ (certified recommended)
2. **Module**: `res_pjsip` with WebSocket transport (`res_pjsip_transport_websocket`)
3. **AMI**: Enabled with WebSocket proxy (amiws)
4. **TLS**: Valid certificate for WSS (or self-signed for development with `dtls_auto_generate_cert=yes`)
5. **Codecs**: At minimum `opus` and `ulaw` enabled

### Recommended Configuration Checklist

- [ ] PJSIP transport configured for WSS on port 8089
- [ ] Each extension has endpoint, auth, and aor sections
- [ ] `webrtc=yes` on endpoints
- [ ] `dtls_auto_generate_cert=yes` (dev) or proper TLS cert (production)
- [ ] `media_encryption=dtls` for secure media
- [ ] `ice_support=yes` for NAT traversal
- [ ] `rtp_symmetric=yes` and `rewrite_contact=yes` for NAT
- [ ] AMI enabled with appropriate read/write permits
- [ ] WebSocket proxy (amiws) configured and running
- [ ] Firewall allows SIP (5060/5061), WSS (8089), and RTP (10000-20000)

### Testing with Docker

```bash
cd tests/e2e/docker
docker build -f Dockerfile.asterisk -t vuesip-asterisk-test .
docker run -p 5060:5060 -p 8089:8089 -p 10000-10100:10000-10100/udp vuesip-asterisk-test
```

---

## References

- `audit-asterisk-20-22-compat.md` — Detailed AMI action compatibility
- `audit-certified-asterisk-compat.md` — Certified build compatibility
- `pbx-platform-compatibility-matrix.md` — Multi-platform comparison
- `tests/integration/pbx-validation/asterisk-validation.test.ts` — Integration tests
- `tests/integration/pbx-validation/test-data/asterisk-pjsip-template.json` — PJSIP template
