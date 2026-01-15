# VueSip Call Center Template

A production-ready call center agent interface with PrimeVue UI, featuring agent dashboard, queue statistics, call controls, and supervisor capabilities.

## Features

- Agent login/logout/pause with queue management
- Real-time queue statistics via AMI WebSocket
- Call controls with hold, mute, transfer, DTMF
- Call disposition and wrap-up workflow
- Supervisor spy/whisper/barge controls
- Incoming call handling
- Responsive grid layout

## Quick Start

1. **Copy the template:**
   ```bash
   cp -r templates/call-center my-call-center
   cd my-call-center
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure credentials:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your SIP server and AMI WebSocket details.

4. **Start development server:**
   ```bash
   pnpm dev
   ```

5. Open http://localhost:3002 in your browser

## Project Structure

```
call-center/
├── src/
│   ├── components/
│   │   ├── AgentDashboard.vue   # Agent status and controls
│   │   ├── QueueStats.vue       # Real-time queue metrics
│   │   ├── CallPanel.vue        # Call controls and disposition
│   │   └── SupervisorPanel.vue  # Spy/whisper/barge controls
│   ├── composables/
│   │   ├── useAgent.ts          # Agent state management
│   │   └── useQueues.ts         # Queue subscriptions
│   ├── App.vue                  # Main application
│   ├── main.ts                  # Entry point with PrimeVue setup
│   └── vite-env.d.ts            # TypeScript declarations
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Components

### AgentDashboard
- Agent login/logout buttons
- Pause/break selector with reasons
- Agent statistics (calls handled, avg talk time)
- Connection status indicator

### QueueStats
- Summary cards: calls waiting, available agents, longest wait, service level
- Queue table with real-time metrics
- Waiting callers list with wait times

### CallPanel
- Dial pad for outbound calls
- Incoming call answer/reject
- Active call controls: mute, hold, transfer
- DTMF keypad during calls
- Call disposition form after hangup

### SupervisorPanel
- Agent list with status
- Monitor mode selection (spy/whisper/barge)
- Active monitoring indicator

## VueSip APIs Used

### Core Composables
- `useSipClient()` - SIP connection management
- `useCallSession()` - Call control and state

### AMI Composables
- `useAmiAgentLogin()` - Agent queue login/logout
- `useAmiQueues()` - Queue status and metrics
- `useAmiSupervisor()` - Spy/whisper/barge controls

### Core Classes
- `createAmiClient()` - AMI WebSocket connection

## Prerequisites

### AMI WebSocket Proxy

This template requires an AMI WebSocket proxy (amiws) to connect to Asterisk:

```bash
# Install amiws (example)
git clone https://github.com/staskobzar/amiws.git
cd amiws
make && sudo make install

# Configure /etc/amiws.conf
[general]
host = 0.0.0.0
port = 8080

[manager]
host = 127.0.0.1
port = 5038
username = admin
secret = your-ami-secret

# Start the proxy
amiws -c /etc/amiws.conf
```

### Asterisk Configuration

Enable queues and agents in Asterisk:

```ini
; /etc/asterisk/queues.conf
[sales]
strategy = ringall
timeout = 30
wrapuptime = 10
announce-frequency = 30

[support]
strategy = leastrecent
timeout = 60
wrapuptime = 15
```

```ini
; /etc/asterisk/manager.conf
[admin]
secret = your-ami-secret
read = all
write = all
```

## Customization

### Theming

Change the PrimeVue theme in `main.ts`:

```typescript
// Available themes: lara-light-blue, lara-dark-blue, md-light-indigo, etc.
import 'primevue/resources/themes/lara-dark-blue/theme.css'
```

### Adding Disposition Codes

Edit the disposition codes in `CallPanel.vue`:

```typescript
const dispositionCodes = [
  { label: 'Resolved', value: 'resolved' },
  { label: 'Follow-up Required', value: 'followup' },
  // Add your custom codes...
]
```

### Adding Break Reasons

Edit the pause reasons in `AgentDashboard.vue`:

```typescript
const pauseReasons = [
  { label: 'Break', value: 'Break' },
  { label: 'Lunch', value: 'Lunch' },
  // Add your custom reasons...
]
```

### Extending useAgent

Add custom agent functionality:

```typescript
// In composables/useAgent.ts
import { useAmiRecording } from 'vuesip'

// Add recording controls
const recording = useAmiRecording(amiClient)
```

## Environment Variables

```bash
# SIP Configuration
VITE_SIP_URI=wss://sip.example.com:8089/ws
VITE_SIP_USER=sip:1001@example.com
VITE_SIP_PASSWORD=your-password
VITE_SIP_DISPLAY_NAME=Agent Name

# AMI WebSocket Configuration
VITE_AMI_WS_URL=ws://pbx.example.com:8080
```

## Cloudflare Pages (Deploy)

This template is ready to deploy on Cloudflare Pages.

- Project name: `vuesip-callcenter`

Commands:

```bash
# From repo root
pnpm build

cd templates/call-center
pnpm build

# Create project once (safe if it already exists)
wrangler pages project create vuesip-callcenter --production-branch=main

# Deploy the dist/ folder
wrangler pages deploy dist --project-name=vuesip-callcenter
```

After deploying, map your subdomain (e.g., `callcenter.vuesip.com`) to the Pages project in Cloudflare Pages → Custom Domains.

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
2. Install the Queue module: **Admin > Module Admin > Queues**
3. Create an extension with **WebRTC** enabled
4. Add the extension to your queues

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

### AMI Issues

1. **AMI WebSocket fails to connect:**
   - Verify amiws is running and accessible
   - Check firewall rules for AMI port (8080 by default)
   - Verify AMI credentials in amiws.conf

2. **Queue stats not updating:**
   - Ensure AMI user has read/write permissions
   - Check that queues exist in Asterisk configuration
   - Verify agent is logged into the correct queues

3. **Supervisor features not working:**
   - ChanSpy requires appropriate permissions in extensions.conf
   - Check that the target channel exists before spying

### Browser Compatibility

VueSip works best in modern browsers:
- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## License

MIT
