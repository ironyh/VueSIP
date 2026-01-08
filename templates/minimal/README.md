# VueSip Minimal Template

A minimal starter template demonstrating core VueSip functionality with a simple, clean interface.

## Features

- SIP connection and registration
- Make and receive calls
- DTMF keypad during active calls
- Call duration display
- No external UI dependencies

## Quick Start

1. **Copy the template:**
   ```bash
   cp -r templates/minimal my-sip-app
   cd my-sip-app
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure SIP credentials:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your SIP server details:
   ```env
   VITE_SIP_URI=wss://your-sip-server.com:8089/ws
   VITE_SIP_USER=sip:1000@your-domain.com
   VITE_SIP_PASSWORD=your-password
   VITE_SIP_DISPLAY_NAME=Your Name
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

5. Open http://localhost:3000 in your browser

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SIP_URI` | WebSocket URI for SIP server | `wss://sip.example.com:8089/ws` |
| `VITE_SIP_USER` | Your SIP account URI | `sip:1000@example.com` |
| `VITE_SIP_PASSWORD` | SIP account password | `secret123` |
| `VITE_SIP_DISPLAY_NAME` | Display name for caller ID | `John Doe` |

### SIP Server Requirements

Your SIP server must support:
- WebSocket transport (WSS recommended for production)
- WebRTC media handling (if using browser audio/video)

#### Compatible Servers

- **Asterisk** (with chan_pjsip and http.conf WebSocket enabled)
- **FreePBX** (WebRTC module)
- **Kamailio** (with WebSocket module)
- **OpenSIPS** (with WebSocket support)

## SIP Provider Configuration

### Asterisk

Enable WebSocket in `/etc/asterisk/http.conf`:
```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
bindport = 8088
tlsenable = yes
tlsbindaddr = 0.0.0.0:8089
tlscertfile = /etc/asterisk/keys/asterisk.pem
```

Enable WebSocket transport in `/etc/asterisk/pjsip.conf`:
```ini
[transport-wss]
type = transport
protocol = wss
bind = 0.0.0.0:8089

[webrtc_extension]
type = endpoint
transport = transport-wss
context = from-internal
disallow = all
allow = opus
allow = ulaw
webrtc = yes
dtls_auto_generate_cert = yes
```

### FreePBX

1. Install the WebRTC module: **Admin > Module Admin > WebRTC**
2. Create an extension with **WebRTC** enabled
3. Set your `.env`:
   ```env
   VITE_SIP_URI=wss://your-pbx.com:8089/ws
   VITE_SIP_USER=sip:1001@your-pbx.com
   ```

### Cloud SIP Providers

Works with WebRTC-enabled providers:
- **Twilio** - Use Programmable Voice with SIP
- **Vonage** - SIP Connect with WebSocket
- **SignalWire** - Native WebRTC support

## Project Structure

```
minimal/
├── src/
│   ├── App.vue          # Main application component
│   ├── main.ts          # Vue app entry point
│   └── vite-env.d.ts    # TypeScript declarations
├── .env.example         # Environment template
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── tsconfig.node.json   # Node TypeScript config
└── vite.config.ts       # Vite configuration
```

## VueSip APIs Used

This template demonstrates:

- `useSipClient()` - SIP connection management
- `useCallSession()` - Call control (make, answer, hangup)
- `useDTMF()` - DTMF tone sending

## Customization

### Styling

The template uses scoped CSS with no external dependencies. Modify the `<style>` section in `App.vue` to match your design system.

### Adding Features

To add more VueSip features, import additional composables:

```vue
<script setup lang="ts">
import {
  useSipClient,
  useCallSession,
  useDTMF,
  useCallHistory,      // Call history tracking
  useMediaDevices,     // Audio/video device selection
  useCallControls,     // Hold, mute, transfer
} from 'vuesip'
</script>
```

## Troubleshooting

### Connection Issues

1. **WebSocket fails to connect:**
   - Verify your SIP server supports WebSocket transport
   - Check if the WSS URL is correct and accessible
   - Ensure SSL certificates are valid

2. **Registration fails:**
   - Verify SIP URI format: `sip:extension@domain`
   - Check password is correct
   - Ensure your SIP account is enabled for WebRTC

3. **No audio:**
   - Allow microphone access in browser
   - Check browser console for media errors
   - Verify SIP server RTP/SRTP configuration

### Browser Compatibility

VueSip works best in modern browsers:
- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## License

MIT
