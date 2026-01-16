# Starter Templates

VueSip includes production-ready starter templates to jumpstart your project. Each template demonstrates different use cases and includes all the code you need to get started quickly.

## Available Templates

| Template            | Description                         | Features                               |
| ------------------- | ----------------------------------- | -------------------------------------- |
| **Minimal**         | Bare-bones SIP functionality        | Connection, calls, DTMF                |
| **Basic Softphone** | Complete softphone with PrimeVue UI | Dialpad, call history, device settings |
| **Call Center**     | Full agent interface                | Queue management, supervisor controls  |

## Quick Start

Choose a template and copy it to start your project:

::: code-group

```bash [Minimal]
cp -r templates/minimal my-sip-app
cd my-sip-app
pnpm install
pnpm dev
```

```bash [Basic Softphone]
cp -r templates/basic-softphone my-softphone
cd my-softphone
pnpm install
pnpm dev
```

```bash [Call Center]
cp -r templates/call-center my-callcenter
cd my-callcenter
pnpm install
pnpm dev
```

:::

## Live Demos

See also: [Live Demos](./demos.md) for hosted subdomains and local ports.

## Default Ports

Run dev servers without collisions by using these defaults:

| Template        | Port | URL            |
| --------------- | ---- | -------------- |
| Minimal         | 3000 | localhost:3000 |
| Basic Softphone | 3001 | localhost:3001 |
| PWA Softphone   | 3002 | localhost:3002 |
| Video Room      | 3003 | localhost:3003 |
| Call Center     | 3004 | localhost:3004 |
| IVR Tester      | 3005 | localhost:3005 |

## Minimal Template

A bare-bones template demonstrating core VueSip functionality with no external UI dependencies.

**Best for:**

- Learning VueSip fundamentals
- Custom UI implementations
- Lightweight applications

**Features:**

- SIP connection and registration
- Make and receive calls
- DTMF keypad during active calls
- Call duration display

**VueSip APIs Used:**

- `useSipClient()` - SIP connection management
- `useCallSession()` - Call control and state
- `sendDTMF()` - DTMF tone sending

### Project Structure

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
└── vite.config.ts       # Vite configuration
```

## Basic Softphone Template

A production-ready softphone with PrimeVue UI components, featuring a complete dialpad, call controls, call history, and audio device settings.

**Best for:**

- Softphone applications
- Click-to-call integrations
- Customer-facing calling interfaces

**Features:**

- Professional UI with PrimeVue components
- Full dialpad with DTMF support
- Call controls (hold, mute, transfer)
- Call history with localStorage persistence
- Audio device selection (microphone/speaker)
- Incoming call handling
- Responsive design

**VueSip APIs Used:**

- `useSipClient()` - SIP connection management
- `useCallSession()` - Call control and state
- `useMediaDevices()` - Audio device enumeration
- `useCallHistory()` - Call log persistence

### Project Structure

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
└── vite.config.ts
```

### Component Details

#### Dialpad

- Number pad with letters (like a phone keypad)
- Number display with backspace/clear
- Call button to initiate calls
- Emits digits for DTMF during active calls

#### CallControls

- Incoming call answer/reject buttons
- Active call controls: mute, hold, transfer
- Call duration display
- Caller ID display

#### CallHistory

- Chronological list of recent calls
- Shows call direction, duration, and status
- One-tap callback functionality
- Persisted to localStorage

#### DeviceSettings

- Microphone selection dropdown
- Speaker selection dropdown
- Automatic device enumeration

## Call Center Template

A full call center agent interface with PrimeVue UI, featuring agent dashboard, queue statistics, call controls, and supervisor capabilities.

**Best for:**

- Call center applications
- Agent workspaces
- Queue-based calling systems

**Features:**

- Agent login/logout/pause with queue management
- Real-time queue statistics via AMI WebSocket
- Call controls with hold, mute, transfer, DTMF
- Call disposition and wrap-up workflow
- Supervisor spy/whisper/barge controls
- Incoming call handling
- Responsive grid layout

**VueSip APIs Used:**

- `useSipClient()` - SIP connection management
- `useCallSession()` - Call control and state
- `createAmiClient()` - AMI WebSocket connection
- `useAmiAgentLogin()` - Agent queue login/logout
- `useAmiQueues()` - Queue status and metrics
- `useAmiSupervisor()` - Spy/whisper/barge controls

### Project Structure

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
└── vite.config.ts
```

### Component Details

#### AgentDashboard

- Agent login/logout buttons
- Pause/break selector with reasons
- Agent statistics (calls handled, avg talk time)
- Connection status indicator

#### QueueStats

- Summary cards: calls waiting, available agents, longest wait, service level
- Queue table with real-time metrics
- Waiting callers list with wait times

#### CallPanel

- Dial pad for outbound calls
- Incoming call answer/reject
- Active call controls: mute, hold, transfer
- DTMF keypad during calls
- Call disposition form after hangup

#### SupervisorPanel

- Agent list with status
- Monitor mode selection (spy/whisper/barge)
- Active monitoring indicator

### Prerequisites

The call center template requires an AMI WebSocket proxy to connect to Asterisk:

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

## Configuration

All templates use environment variables for configuration. Copy `.env.example` to `.env` and update:

```bash
# SIP Configuration
VITE_SIP_URI=wss://sip.example.com:8089/ws
VITE_SIP_USER=sip:1001@example.com
VITE_SIP_PASSWORD=your-password
VITE_SIP_DISPLAY_NAME=Your Name

# AMI Configuration (call-center only)
VITE_AMI_WS_URL=ws://pbx.example.com:8080
```

## SIP Server Configuration

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

## Customization

### Theming (PrimeVue Templates)

Change the PrimeVue theme in `main.ts`:

```typescript
// Available themes: lara-light-blue, lara-dark-blue, md-light-indigo, etc.
import 'primevue/resources/themes/lara-dark-blue/theme.css'
```

### Adding VueSip Features

Import additional composables as needed:

```typescript
import {
  useSipClient,
  useCallSession,
  useDTMF,
  useCallHistory, // Call history tracking
  useMediaDevices, // Audio/video device selection
  useCallControls, // Hold, mute, transfer
} from 'vuesip'
```

### Extending Templates

Each template is designed to be a starting point. Common extensions include:

- **Minimal**: Add UI framework of your choice
- **Basic Softphone**: Add call transfer, conferencing
- **Call Center**: Add CRM integration, recording playback

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

### AMI Issues (Call Center)

1. **AMI WebSocket fails to connect:**
   - Verify amiws is running and accessible
   - Check firewall rules for AMI port (8080 by default)
   - Verify AMI credentials in amiws.conf

2. **Queue stats not updating:**
   - Ensure AMI user has read/write permissions
   - Check that queues exist in Asterisk configuration
   - Verify agent is logged into the correct queues

### Browser Compatibility

VueSip works best in modern browsers:

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## Next Steps

After setting up your template:

1. **Configure your SIP server** - Set up WebSocket transport and WebRTC support
2. **Update credentials** - Edit `.env` with your SIP account details
3. **Customize the UI** - Modify components to match your design
4. **Add features** - Extend with additional VueSip composables
5. **Deploy** - Build for production with `pnpm build`

For more details on VueSip APIs, see the [API Reference](/api/) and [Getting Started](/guide/getting-started) guide.
