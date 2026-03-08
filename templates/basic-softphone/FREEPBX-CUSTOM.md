# FreePBX Custom Softphone ✅

## Byggd och redo för deployment!

### Filer skapade:
- `src/FreePBXApp.vue` - Custom softphone UI
- `src/freepbx-main.ts` - Entry point
- `freepbx-index.html` - HTML template
- `vite.freepbx.config.ts` - Build config
- `deploy-freepbx.sh` - Deployment script
- `dist-freepbx/` - **Färdig build**

### Förkonfigurerade inställningar:
```
WebSocket: wss://pbx.telenurse.se/ws
Domain:    pbx.telenurse.se
Extensions: 1001-1005 (testkonton)
```

## Testa lokalt:

```bash
cd /home/irony/code/VueSIP/templates/basic-softphone
npx vite preview --config vite.freepbx.config.ts
# Öppna http://localhost:4173
```

## Deploya:

### Alternativ A: Lokalt test
```bash
python3 -m http.server 8080 --directory dist-freepbx
# Öppna http://localhost:8080
```

### Alternativ B: Rsync (om du har SSH-access)
```bash
./deploy-freepbx.sh softphone.vuesip.com
```

### Alternativ C: Manuell upload
Ladda upp `dist-freepbx/` mappen till din webbserver.

## Funktioner:

✅ Dropdown för att välja extension (1001-1005)  
✅ Connect/Disconnect knappar  
✅ Numpad för att slå nummer  
✅ Call/Hangup funktionalitet  
✅ Status-indikator (Offline/Connected/Registered/In Call)  
✅ Förkonfigurerad för pbx.telenurse.se  

## Testa samtal:

1. **Öppna två fönster** med softphonen
2. **Fönster 1:** Välj 1001, klicka Connect
3. **Fönster 2:** Välj 1002, klicka Connect
4. **Fönster 1:** Slå "1002", klicka Call
5. **Fönster 2:** Svara på inkommande samtal

## Felsökning:

Om det inte fungerar, kolla:
```bash
# WebSocket-status
curl -I https://pbx.telenurse.se/ws

# Asterisk logs
ssh root@192.168.67.10 "pct exec 113 -- tail -f /var/log/asterisk/full"
```