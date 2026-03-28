# VueSip Basic Softphone Template

A production-ready softphone template with PrimeVue UI components, featuring a complete dialpad, call controls, call history, and audio device settings.

## Features

- Professional UI with PrimeVue components
- Full dialpad with DTMF support
- Call controls (hold, mute, transfer)
- Call history with localStorage persistence
- Audio device selection (microphone/speaker)
- Incoming call handling
- Responsive design

## Quick Start

1. **Copy the template:**

   ```bash
   cp -r templates/basic-softphone my-softphone
   cd my-softphone
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure SIP credentials:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your SIP server details.

4. **Start development server:**

   ```bash
   pnpm dev
   ```

5. Open http://localhost:3001 in your browser

## Project Structure

```
basic-softphone/
├── src/
│   ├── components/
│   │   ├── Dialpad.vue        # Phone dialpad with number display
│   │   ├── CallControls.vue   # Hold, mute, transfer controls
│   │   ├── CallHistory.vue    # Call log with callback
│   │   └── DeviceSettings.vue # Audio device selection
│   ├── composables/
│   │   └── usePhone.ts        # Phone state management
│   ├── App.vue                # Main application
│   ├── main.ts                # Entry point with PrimeVue setup
│   └── vite-env.d.ts          # TypeScript declarations
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Components

### Dialpad

- Number pad with letters (like a phone keypad)
- Number display with backspace/clear
- Call button to initiate calls
- Emits digits for DTMF during active calls

### CallControls

- Incoming call answer/reject buttons
- Active call controls: mute, hold, transfer
- Call duration display
- Caller ID display

### CallHistory

- Chronological list of recent calls
- Shows call direction, duration, and status
- One-tap callback functionality
- Persisted to localStorage

### DeviceSettings

- Microphone selection dropdown
- Speaker selection dropdown
- Automatic device enumeration

## VueSip APIs Used

- `useSipClient()` - SIP connection management
- `useCallSession()` - Call control and state
- `useMediaDevices()` - Audio device enumeration
- `useCallHistory()` - Call log persistence

## Customization

### Theming

This template uses PrimeVue's theming system. Change the theme in `main.ts`:

```typescript
// Available themes: lara-light-blue, lara-dark-blue, md-light-indigo, etc.
import 'primevue/resources/themes/lara-dark-blue/theme.css'
```

### Adding Components

PrimeVue offers 90+ components. Import as needed:

```typescript
import Slider from 'primevue/slider'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
```

### Extending usePhone

Add custom functionality in `composables/usePhone.ts`:

```typescript
// Add conferencing support
import { useConference } from 'vuesip'

const conference = useConference()
// ...
```

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

## Troubleshooting

### 46elks Incoming Calls (voice_start)

46elks requires each inbound number to have `voice_start` configured.

This template ships with a Cloudflare Pages Function at `functions/elks/calls.ts`, so you can set
`voice_start` to a URL like:

```text
https://your-softphone.example.com/elks/calls?connect=+46001234567
```

Or paste a JSON call action directly:

```json
{ "connect": "+46001234567" }
```

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

### PrimeVue Issues

1. **Icons not showing:**
   - Ensure `primeicons` is imported in `main.ts`

2. **Theme not applied:**
   - Check theme CSS import order in `main.ts`

### Browser Compatibility

VueSip works best in modern browsers:

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## License

MIT
