# FreePBX SIP Requirements & Edge Cases Research

**Subtask**: Research FreePBX SIP requirements and edge cases
**Date**: 2026-04-03
**Scope**: FreePBX 16/17 SIP requirements, module dependencies, configuration patterns, edge cases

---

## 1. Architecture Overview

FreePBX is a web-based management layer on top of Asterisk. It provides:

- GUI for Asterisk configuration
- Module-based feature management
- Automatic `extensions.conf` and `pjsip.conf` generation
- Built-in firewall and security frameworks

**VueSIP integration points**:

1. **PJSIP WebSocket** — SIP signaling (registration, calls)
2. **AMI via amiws** — Call control (originate, queue, park, transfer)
3. **FreePBX REST API** (optional) — User management, reporting

---

## 2. Minimum SIP Requirements

### FreePBX SIP Settings (SIPSETTINGS Module)

Configure via **Admin → Asterisk SIP Settings**:

| Setting   | Required Value    | Purpose                       |
| --------- | ----------------- | ----------------------------- |
| WebSocket | Enabled           | WSS transport for browser SIP |
| Bind Port | 8089 (WSS)        | WebSocket listener            |
| Transport | WSS               | Encrypted WebSocket           |
| NAT       | Yes (auto-detect) | External address mapping      |
| Codecs    | opus, ulaw, alaw  | Minimum for WebRTC            |
| TLS       | Enabled with cert | Required for WSS              |

### Extension Configuration

FreePBX extension setup for VueSIP clients:

| Setting        | Value                | Notes                           |
| -------------- | -------------------- | ------------------------------- |
| Extension Type | PJSIP (not chan_sip) | Required for WebSocket          |
| Secret         | Strong password      | Used for SIP auth               |
| Context        | from-internal        | Standard internal dialing       |
| Transport      | transport-wss        | WebSocket transport             |
| DTLS           | Enabled              | Required for WebRTC             |
| ICE            | Enabled              | NAT traversal                   |
| AVPF           | Enabled              | RTCP feedback for WebRTC        |
| Max Contacts   | 2                    | Allow multi-device registration |

### Channel Driver: PJSIP Required

FreePBX 16+ defaults to PJSIP. **chan_sip must not be used** for VueSIP:

```ini
; FreePBX generates in pjsip.registration.conf
[3001]
type=registration
transport=transport-wss
outbound_auth=3001-auth
server_uri=sip:wss@pbx.example.com:8089
client_uri=sip:3001@pbx.example.com:8089
retry_interval=60
```

---

## 3. Working Configurations

### FreePBX 16 (16.0.40)

#### Step 1: Enable WebSocket Transport

**Connectivity → Asterisk SIP Settings → Advanced → WebSocket**

Or manually in `/etc/asterisk/pjsip.transports_custom.conf`:

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
cert_file=/etc/asterisk/keys/integration/websocket.crt
priv_key_file=/etc/asterisk/keys/integration/websocket.key
method=sslv23
```

#### Step 2: Create PJSIP Extension

**Applications → Extensions → Add Extension → Add New PJSIP Extension**

- Extension Number: `3001`
- Display Name: `VueSIP Client`
- Secret: (strong password)
- **Advanced → Transport**: Select `transport-wss`
- **Advanced → Media Encryption**: `dtls`
- **Advanced → ICE Support**: `yes`
- **Advanced → use_avpf**: `yes`
- **Advanced → webrtc**: `yes`

#### Step 3: AMI Configuration

`/etc/asterisk/manager.conf`:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0
webenabled = yes

[vuesip]
secret = amp111
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
read = system,call,log,verbose,command,agent,user,config
write = system,call,log,verbose,command,agent,user,config
```

#### Step 4: amiws Proxy

```bash
npm install -g amiws
amiws -c /etc/amiws/config.json
```

### FreePBX 17 (17.x)

Same as FreePBX 16 with enhancements:

- **Improved PJSIP GUI**: Better WebSocket configuration
- **Built-in Let's Encrypt**: Auto TLS certificate management
- **Asterisk 21+ backend**: Newer PJSIP features
- **Framework 17**: REST API improvements

---

## 4. Module Dependencies

### Required Modules

| Module           | Purpose                    | Status   |
| ---------------- | -------------------------- | -------- |
| Core             | Extensions, trunks, routes | Required |
| Framework        | Base system, API           | Required |
| SIPSETTINGS      | SIP configuration          | Required |
| Endpoint (PJSIP) | Extension management       | Required |

### Feature Modules

| Module         | Feature                     | VueSIP Usage                          |
| -------------- | --------------------------- | ------------------------------------- |
| Voicemail      | Voicemail deposit/retrieval | MWI notifications, deposit            |
| Conferencing   | MeetMe/ConfBridge           | Conference bridges                    |
| Parking        | Call parking                | Park/retrieve calls                   |
| Ring Groups    | Multi-target ringing        | Simultaneous/sequential ring          |
| Queues         | ACD queues                  | Agent login/logout, queue stats       |
| IVR            | Digital receptionist        | DTMF menu navigation                  |
| Follow-Me      | Call forwarding             | Multi-destination forwarding          |
| Call Forward   | CF/CFB/CFU                  | Forward on busy/no-answer/unavailable |
| Call Recording | Record calls                | Start/stop via AMI                    |
| User Manager   | User management             | REST API user provisioning            |

---

## 5. Edge Cases

### FreePBX-Specific Edge Cases

| Scenario                         | Issue                                               | Handling                                                   |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| **GUI overwrites custom config** | FreePBX regenerates `.conf` files on "Apply Config" | Use `_custom.conf` files or include overrides              |
| **Feature codes conflict**       | `*72`, `*73` etc. may intercept DTMF                | Configure feature code ranges to avoid overlap             |
| **Extension conflict**           | chan_sip and PJSIP with same number                 | Use PJSIP only, disable chan_sip                           |
| **Trunk registration**           | Outbound trunk re-registration failures             | Monitor trunk status via AMI                               |
| **Dialplan injection**           | Custom contexts get overwritten                     | Use `extensions_custom.conf` with `[from-internal-custom]` |
| **Firewall module**              | Responsive firewall blocks WebSocket                | Whitelist WSS port (8089)                                  |
| **Certificate renewal**          | Let's Encrypt cert rotation may break WSS           | Restart Asterisk after cert renewal                        |
| **High call volume**             | AMI event flooding                                  | Use event filter in manager.conf                           |

### SIP-Specific Edge Cases (FreePBX Layer)

| Scenario                   | Issue                                         | Handling                                                       |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| **Ring Group timeout**     | No-answer rolls to voicemail or next target   | Configure `ringing` strategy and timeouts                      |
| **Queue wrap-up time**     | Agent unavailable after call ends             | Set `wrapuptime` in queue configuration                        |
| **IVR timeout**            | No DTMF input → route to default destination  | Configure `ivret` timeout and invalid handling                 |
| **Follow-Me confirmation** | External numbers require press-1 to accept    | Disable confirmation for trusted internal numbers              |
| **Blind transfer via AMI** | FreePBX uses custom dialplan hooks            | Use `PJSIPBlindTransfer` AMI action                            |
| **MWI subscriptions**      | Voicemail notification requires SIP SUBSCRIBE | Ensure endpoint has `mailboxes=` configured                    |
| **Presence/BLF**           | Requires SUBSCRIBE/NOTIFY with hint           | Configure hints in `extensions.conf` or use FreePBX BLF module |

### Transport Edge Cases

| Scenario                     | Issue                                      | Handling                                   |
| ---------------------------- | ------------------------------------------ | ------------------------------------------ |
| **WSS behind reverse proxy** | WebSocket upgrade headers lost             | Configure nginx/Apache for WebSocket proxy |
| **Multiple transports**      | UDP + WSS on same endpoint                 | Separate endpoints per transport           |
| **IPv4/IPv6 dual-stack**     | Registration from different address family | Use `bind=::` for dual-stack               |
| **TLS SNI**                  | Virtual hosting with multiple certs        | Asterisk 20+ supports SNI per transport    |

---

## 6. Integration Guidelines

### Pre-Integration Checklist

- [ ] FreePBX 16+ installed with all updates applied
- [ ] PJSIP enabled as primary channel driver (chan_sip disabled)
- [ ] WebSocket transport configured (WSS on port 8089)
- [ ] TLS certificate installed and valid
- [ ] Extensions created with PJSIP + WebRTC settings
- [ ] AMI enabled with appropriate permissions
- [ ] amiws WebSocket proxy installed and configured
- [ ] Responsive Firewall configured to allow WSS
- [ ] Codecs: opus, ulaw, alaw enabled on endpoints
- [ ] Voicemail configured for MWI support
- [ ] Test call via WebSocket client successful

### Common Integration Issues

1. **403 Forbidden on REGISTER**: Check SIPSETTINGS, ensure WSS transport matches
2. **One-way audio**: Enable ICE, configure external IP in SIPSETTINGS
3. **DTLS handshake failure**: Verify certificate, check `dtls_auto_generate_cert`
4. **AMI connection refused**: Check `manager.conf`, verify firewall rules
5. **WebSocket disconnect after idle**: Configure keepalive in amiws

### Testing with Docker

```bash
docker run -d \
  -p 8089:8089 \
  -p 5060:5060 \
  -p 5038:5038 \
  -p 10000-10100:10000-10100/udp \
  -e FREEPBX_EXTENSIONS="3001,3002,3003" \
  tiredofit/freepbx
```

---

## References

- `pbx-platform-compatibility-matrix.md` — Multi-platform comparison (FreePBX at 70%)
- `docs/asterisk-sip-requirements.md` — Underlying Asterisk SIP requirements
- `tests/integration/pbx-validation/freepbx-validation.test.ts` — Integration tests
- `tests/integration/pbx-validation/test-data/` — Test data and configs
