# Telenurse Softphone - FreePBX Edition

Förkonfigurerad VueSIP softphone för pbx.telenurse.se

## Snabbstart

### 1. Bygg softphonen
```bash
cd /home/irony/code/VueSIP/templates/pwa-softphone
pnpm install
pnpm run build
```

### 2. Testa lokalt
```bash
pnpm run preview
# Öppna http://localhost:4173
```

### 3. Deploya (om du har tillgång till softphone.vuesip.com)
```bash
# Bygg för produktion
pnpm run build

# Kopiera till server (exempel)
rsync -avz dist/ user@softphone.vuesip.com:/var/www/html/
```

## Förkonfigurerade inställningar

Softphonen är redan konfigurerad med:

- **WebSocket:** `wss://pbx.telenurse.se/ws`
- **SIP Domain:** `pbx.telenurse.se`
- **Extensions:** 1001-1005 (testkonton)

## Användning

1. **Välj extension** från dropdown (1001-1005)
2. **Klicka "Connect"** för att registrera
3. **Ring** genom att slå nummer och klicka "Call"

## Testa mellan extensions

Öppna två softphones i olika fönster/flikar:
- **Fönster 1:** Logga in som 1001
- **Fönster 2:** Logga in som 1002
- **Ring:** 1001 ringer 1002

## Felsökning

### WebSocket inte ansluten
Kolla att HAProxy kör:
```bash
ssh root@192.168.65.127 "systemctl status haproxy"
```

### Registrering misslyckas
Kolla Asterisk logs:
```bash
ssh root@192.168.67.10 "pct exec 113 -- tail -f /var/log/asterisk/full"
```

### Certifikatvarning
Certifikatet går ut 1 maj 2026. Se `/home/irony/code/VueSIP/playground/FREEPBX-WEBSOCKET-READY.md` för förnyelseinstruktioner.

## Konfiguration

Ändra inställningar i `softphone.config.ts`:

```typescript
export const softphoneConfig = {
  sip: {
    websocketUrl: 'wss://pbx.telenurse.se/ws',
    domain: 'pbx.telenurse.se',
  },
  presets: [
    { number: '1001', username: 'nurse_1001', password: '...', name: '...' },
    // ...
  ],
};
```

## Tekniska detaljer

- **Byggt med:** VueSIP v1.1.0
- **WebSocket:** WSS via HAProxy
- **Codecs:** Opus, ulaw, alaw
- **WebRTC:** Aktiverat med ICE/STUN