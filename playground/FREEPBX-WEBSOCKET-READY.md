# FreePBX WebSocket - FÄRDIG KONFIGURERAD! ✅

## Status: WEBSOCKET EXPOSED EXTERNALLY

### Publik WebSocket URL
```
wss://pbx.telenurse.se/ws
```

### Konfiguration som gjorts

1. **HAProxy** (192.168.65.127) uppdaterad:
   ```
   use_backend BE-asterisk-ws if host_pbx path_ws is_websocket
   use_backend BE-pbx if host_pbx
   ```

2. **BE-asterisk-ws** backend förbättrad:
   - `timeout tunnel 1h` - För långlivade WebSocket-anslutningar
   - `option forwardfor` - För korrekt IP-forwarding
   - Health check på `/httpstatus`

3. **VueSIP** uppdaterad:
   - `websocketUrl: 'wss://pbx.telenurse.se/ws'`

## Testa det!

### 1. Starta VueSIP playground
```bash
cd /home/irony/code/VueSIP
pnpm run dev
```

### 2. Öppna i browser
```
http://localhost:5173
```

### 3. Välj "☎️ FreePBX Test" fliken

### 4. Klicka "Connect"

## Förväntat beteende
- ✅ WebSocket-anslutning etableras till `wss://pbx.telenurse.se/ws`
- ✅ SIP-registrering skickas till Asterisk
- ✅ Extension registreras (t.ex. nurse_1001)
- ✅ Kan ringa mellan extensions (1001 ↔ 1002)

## Felsökning

### Om anslutningen misslyckas:
1. **Kolla WebSocket-status:**
   ```bash
   curl -i -N \
     -H "Upgrade: websocket" \
     -H "Connection: upgrade" \
     -H "Host: pbx.telenurse.se" \
     https://pbx.telenurse.se/ws
   ```
   Förväntat: 426 Upgrade Required (behöver WebSocket handshake)

2. **Kolla HAProxy status:**
   ```bash
   ssh root@192.168.65.127 "echo 'show stat' | socat stdio /run/haproxy/admin.sock | grep asterisk"
   ```

3. **Kolla Asterisk logs:**
   ```bash
   ssh root@192.168.67.10 "pct exec 113 -- tail -f /var/log/asterisk/full"
   ```

## Extension-lista

| Nr | Username | Lösenord | Testa ring till |
|----|----------|----------|-----------------|
| 1001 | nurse_1001 | TestPassword1001! | 1002, 1003, 1004, 1005 |
| 1002 | nurse_1002 | TestPassword1002! | 1001, 1003, 1004, 1005 |
| 1003 | nurse_1003 | TestPassword1003! | 1001, 1002, 1004, 1005 |
| 1004 | nurse_1004 | TestPassword1004! | 1001, 1002, 1003, 1005 |
| 1005 | nurse_1005 | TestPassword1005! | 1001, 1002, 1003, 1004 |

## Tekniska detaljer

### Nätverksflöde
```
Browser (VueSIP)
  ↓ WSS (WebSocket Secure)
pbx.telenurse.se (Cloudflare → HAProxy 192.168.65.127:443)
  ↓ WS (WebSocket)
Asterisk (192.168.65.129:8088)
  ↓ SIP
PJSIP endpoints (1001-1005)
```

### Asterisk konfiguration
- **Fil:** `/etc/asterisk/pjsip_websocket.conf`
- **Transport:** `transport-ws` på port 8088
- **WebRTC:** Aktiverat på alla nurse-endpoints
- **Codecs:** Opus, ulaw, alaw

### HAProxy konfiguration
- **Fil:** `/etc/haproxy/haproxy.cfg`
- **Backend:** `BE-asterisk-ws`
- **Server:** `192.168.65.129:8088`
- **Timeout:** Tunnel 1h (för WebSocket)

---

**Senast uppdaterad:** 2026-02-27  
**Konfigurerad av:** Kai