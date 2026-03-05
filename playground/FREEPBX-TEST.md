# FreePBX + VueSIP Test Setup

## Server Info
- **FreePBX/Asterisk**: 192.168.65.129 (Proxmox LXC container #113)
- **WebSocket**: ws://192.168.65.129:8088/ws
- **Status**: ✅ WebSocket endpoint svarar (HTTP 200)

## Förkonfigurerade Extensions

| Extension | Username | Password | Namn |
|-----------|----------|----------|------|
| 1001 | nurse_1001 | TestPassword1001! | Test Nurse 1001 |
| 1002 | nurse_1002 | TestPassword1002! | Test Nurse 1002 |
| 1003 | nurse_1003 | TestPassword1003! | Test Nurse 1003 |
| 1004 | nurse_1004 | TestPassword1004! | Test Nurse 1004 |
| 1005 | nurse_1005 | TestPassword1005! | Test Nurse 1005 |

## Testa VueSIP

### 1. Starta Playground
```bash
cd /home/irony/code/VueSIP
pnpm install  # om du inte redan har dependencies
pnpm run dev
```

### 2. Öppna FreePBX Test-tab
Gå till `http://localhost:5173` (eller den port som visas)

Klicka på fliken **"☎️ FreePBX Test"**

### 3. Testa Connection
1. Välj en extension (t.ex. 1001)
2. Klicka **"Connect"**
3. Kolla loggarna för att se om anslutningen lyckas

## Felsökning

### WebSocket inte tillgänglig
Om ws://192.168.65.129:8088 inte fungerar:

```bash
# SSH till Asterisk-servern via Proxmox
ssh -i ~/.ssh/kai_servers root@192.168.67.10 "pct exec 113 -- bash"

# Kolla Asterisk status
asterisk -rvvv

# Kolla SIP/Websocket inställningar
sip show settings
pjsip show transports

# Ladda om konfiguration
fwconsole reload
```

### Registrering failar
- Kolla att extensionen finns: `pjsip show endpoints`
- Kolla att WebRTC är aktiverat på endpointen
- Verifiera lösenordet i `/etc/asterisk/pjsip_websocket.conf`

## Konfigurationsfiler

### Asterisk WebSocket (redan konfigurerad)
Fil: `/etc/asterisk/pjsip_websocket.conf`

Innehåller:
- `transport-ws` på port 8088
- WebRTC endpoints för extensions 1001-1005
- Opus/ulaw/alaw codecs
- ICE/STUN-stöd

### STUN Server (behövs läggas till)
I FreePBX GUI:
1. Gå till *Settings → Asterisk SIP Settings*
2. Under *General SIP Settings* → *STUN Server Address*
3. Lägg till: `stun.l.google.com:19302`

## Nästa steg

1. ✅ Grundläggande anslutning (WebSocket)
2. ⏳ SIP Registration
3. ⏳ Utgående samtal
4. ⏳ Inkommande samtal
5. ⏳ Ljud/media (WebRTC)

## Användbara kommandon

```bash
# Kopiera config till FreePBX (om du ändrar)
scp /home/irony/code/VueSIP/playground/freepbx-config.ts root@192.168.67.10:/tmp/

# Kolla Asterisk logs
ssh -i ~/.ssh/kai_servers root@192.168.67.10 "pct exec 113 -- tail -f /var/log/asterisk/full"

# Testa WebSocket med curl
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Host: 192.168.65.129:8088" \
  -H "Origin: http://localhost:5173" \
  http://192.168.65.129:8088/ws
```