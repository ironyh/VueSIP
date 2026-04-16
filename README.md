# VueSip

> A headless Vue.js component library for SIP/VoIP applications

[![npm version](https://img.shields.io/npm/v/vuesip.svg)](https://www.npmjs.com/package/vuesip)
[![npm downloads](https://img.shields.io/npm/dm/vuesip.svg)](https://www.npmjs.com/package/vuesip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (setup, checks, PR expectations) and [RELEASING.md](RELEASING.md) for maintainers.

VueSip provides **185+ composables** for building professional SIP interfaces with Asterisk, FreePBX, and other VoIP systems. Built with TypeScript and Vue 3, VueSip gives you the business logic while you control the UI.

## Features

- **Headless Architecture** - Complete separation of logic and UI
- **Full SIP Support** - WebRTC calling via adapter (JsSIP implemented; SIP.js planned)
- **Video Calling** - One-on-one and conference video support
- **Call Quality Monitoring** - Real-time WebRTC stats and quality scoring
- **Call Center Features** - Queues, agents, supervisors, and statistics
- **Multi-Line Support** - Handle multiple concurrent calls
- **UI Agnostic** - Works with PrimeVue, Vuetify, Tailwind, or any UI
- **TypeScript** - Full type safety and IntelliSense
- **50+ Interactive Demos** - Working examples for every feature
- **Modern Stack** - Vue 3, Vite, TypeScript
- **Codec Policy (preview)** - Inspect capabilities, set preferences (e.g., Opus/VP8) and apply during negotiation with transceiver API or SDP fallback

## Live Demos

- Landing: https://demos.vuesip.com (or see docs: `docs/guide/demos.md`)
- Softphone (PWA): https://softphone.vuesip.com
- IVR Tester: https://ivr.vuesip.com
- Video Room: https://video.vuesip.com
- Call Center: https://callcenter.vuesip.com

## CI

See `docs/guide/ci-workers.md` for guidance on Cloudflare Workers checks. Our recommendation is to scope the Cloudflare GitHub App builds to the `main` branch only and rely on GitHub Actions for deploys.

## Installation

```bash
npm install vuesip
# or
yarn add vuesip
# or
pnpm add vuesip
```

## Quick Start

```vue
<script setup lang="ts">
import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'

// Initialize SIP client
const { connect, disconnect, isConnected, isRegistered } = useSipClient()

// Call session management
const { currentCall, makeCall, answer, hangup } = useCallSession()

// Audio device management
const { audioInputDevices, audioOutputDevices, selectAudioInput } = useMediaDevices()

// Connect to SIP server
await connect({
  uri: 'sip:1000@sip.example.com',
  password: 'secret',
  server: 'wss://sip.example.com:8089/ws',
})

// Make a call
await makeCall('sip:2000@sip.example.com')
</script>
```

## Core Composables

### useSipClient

Manages SIP client connection, registration, and call operations.

```typescript
import { useSipClient } from 'vuesip'

const {
  // State
  isConnected, // Ref<boolean> - Connection state
  isRegistered, // Ref<boolean> - Registration state
  isConnecting, // Ref<boolean> - Connecting state
  error, // Ref<Error | null> - Last error

  // Connection
  connect, // (config: SipClientConfig) => Promise<void>
  disconnect, // () => Promise<void>

  // Registration
  register, // () => Promise<void>
  unregister, // () => Promise<void>
} = useSipClient()
```

### useCallSession

Manages call state and operations for active/incoming calls.

```typescript
import { useCallSession } from 'vuesip'

const {
  // State
  currentCall, // Ref<CallSession | null> - Active call
  callState, // Ref<CallState> - Current call state
  callDuration, // Ref<number> - Duration in seconds

  // Call actions
  makeCall, // (target: string, options?) => Promise<void>
  answer, // (options?) => Promise<void>
  hangup, // () => Promise<void>
  reject, // () => Promise<void>

  // Call controls
  hold, // () => Promise<void>
  unhold, // () => Promise<void>
  mute, // () => Promise<void>
  unmute, // () => Promise<void>
} = useCallSession()
```

### useMediaDevices

Manage audio/video devices with permission handling.

```typescript
import { useMediaDevices } from 'vuesip'

const {
  // Device lists
  audioInputDevices, // Ref<MediaDeviceInfo[]> - Microphones
  audioOutputDevices, // Ref<MediaDeviceInfo[]> - Speakers
  videoInputDevices, // Ref<MediaDeviceInfo[]> - Cameras

  // Selected devices
  selectedAudioInput, // Ref<string | null>
  selectedAudioOutput, // Ref<string | null>
  selectedVideoInput, // Ref<string | null>

  // Actions
  selectAudioInput, // (deviceId: string) => void
  selectAudioOutput, // (deviceId: string) => void
  selectVideoInput, // (deviceId: string) => void
  requestPermissions, // (audio?, video?) => Promise<boolean>
  refreshDevices, // () => Promise<void>
} = useMediaDevices()
```

### useDTMF

Send DTMF (dialpad) tones during calls.

```typescript
import { useDTMF } from 'vuesip'

const {
  sendDTMF, // (tone: string) => void
  sendDTMFSequence, // (sequence: string, interval?) => Promise<void>
} = useDTMF(callSession)

// Send single digit
sendDTMF('5')

// Send sequence with interval
await sendDTMFSequence('1234#', 200)
```

## Common Patterns

### Handling Incoming Calls

Use `useSipClient` to listen for incoming calls and `useCallSession` to answer or reject them.

```typescript
import { useSipClient, useCallSession } from 'vuesip'

// Listen for incoming calls
const { incomingCall, callState } = useSipClient()

// Watch for incoming calls
watch(incomingCall, async (call) => {
  if (!call) return

  console.log('Incoming call from:', call.remoteUri)

  // Auto-answer for specific callers (e.g., VIP list)
  const vipList = ['sip:manager@company.com', 'sip:reception@company.com']
  const isVIP = vipList.some((vip) => call.remoteUri.includes(vip))

  if (isVIP) {
    await answer()
  }
  // Otherwise, let the user decide — show UI accept/reject buttons
})

// Answer or reject from call controls
const { answer, reject } = useCallSession()

// In your template:
// <button @click="answer">Accept</button>
// <button @click="reject(486)">Decline</button>
```

### Call Transfer Workflow

Use `useCallControls` for blind transfers (immediate) and attended transfers (consultation first).

```typescript
import { useCallSession, useCallControls } from 'vuesip'

const { currentCall } = useCallSession()
const {
  blindTransfer,
  initiateAttendedTransfer,
  completeAttendedTransfer,
  cancelTransfer,
  transferState,
} = useCallControls()

// Blind transfer — immediate, no consultation
async function transferToReception(callId: string) {
  const result = await blindTransfer(callId, 'sip:reception@company.com')
  if (result.success) {
    console.log('Transfer completed')
  } else {
    console.error('Transfer failed:', result.error)
  }
}

// Attended transfer — consult before connecting
async function warmTransfer(callId: string) {
  // Step 1: Put current call on hold and dial the transfer target
  const consultation = await initiateAttendedTransfer(callId, 'sip:colleague@company.com')
  console.log('Consultation call started:', consultation.callId)

  // Step 2: Talk to the colleague (they see the original caller on hold)
  // ...

  // Step 3: Complete the transfer after consultation
  const result = await completeAttendedTransfer(callId, consultation.callId)
  if (result.success) {
    console.log('Attended transfer completed — caller now connected to colleague')
  }
}

// Cancel transfer if consultation doesn't work out
async function cancelWarmTransfer() {
  await cancelTransfer()
  console.log('Transfer cancelled — original call still active')
}
```

### Conference Call Setup

Use `useAmiConfBridge` to create and manage Asterisk ConfBridge conferences.

```typescript
import { useAmiConfBridge } from 'vuesip'

const {
  rooms, // Ref<Map<string, ConfBridgeRoom>>
  createRoom, // (roomName: string, options?: CreateRoomOptions) => Promise<ConfBridgeRoom>
  joinRoom, // (roomName: string, user: ConfBridgeUser) => Promise<void>
  leaveRoom, // (roomName: string, userId: string) => Promise<void>
  listRooms, // () => Promise<void>
  muteParticipant, // (roomName: string, userId: string) => Promise<void>
  kickParticipant, // (roomName: string, userId: string) => Promise<void>
} = useAmiConfBridge()

// Create a conference room
async function startConference() {
  const room = await createRoom('support-conf', {
    record: true, // Enable recording
    recordFile: '/var/spool/asterisk/conf-recs/${YEAR}${MONTH}${DAY}-${TIMESTAMP}.wav',
    maxUsers: 10, // Optional participant cap
    announceUserCount: true,
    quietMode: false,
  })
  console.log('Conference created:', room.name)
  return room
}

// Join a conference
async function joinConference(roomName: string, userId: string, displayName: string) {
  await joinRoom(roomName, {
    userId,
    displayName,
    muted: false,
    marked: userId === 'moderator-1', // Moderator controls the room
  })
  console.log(`${displayName} joined ${roomName}`)
}

// Mute a disruptive participant
async function muteParticipant(roomName: string, userId: string) {
  await muteParticipant(roomName, userId)
  console.log('Participant muted')
}

// List active rooms and their participants
async function showRooms() {
  await listRooms()
  for (const [name, room] of rooms.value) {
    console.log(`Room ${name}: ${room.memberCount} participants`)
  }
}
```

## Interactive Playground (50+ Demos)

VueSip includes an **interactive playground** with 50+ working demos covering every feature:

```bash
# Install dependencies
pnpm install

# Run development server with playground
pnpm dev
```

Visit `http://localhost:5173` to explore demos organized by category:

### Core Calling

| Demo               | Description                         | Key Composables                     |
| ------------------ | ----------------------------------- | ----------------------------------- |
| BasicCallDemo      | One-to-one audio calling            | `useSipClient`, `useCallSession`    |
| VideoCallDemo      | Video calling with camera selection | `useMediaDevices`, `useCallSession` |
| MultiLineDemo      | Handle multiple concurrent calls    | `useMultiLine`                      |
| ConferenceCallDemo | Multi-party conferences             | `useConference`                     |
| CallTransferDemo   | Blind and attended transfers        | `useCallTransfer`                   |

### Call Controls

| Demo                 | Description              | Key Composables    |
| -------------------- | ------------------------ | ------------------ |
| DtmfDemo             | Send DTMF tones          | `useDTMF`          |
| CallTimerDemo        | Call duration tracking   | `useCallSession`   |
| CallWaitingDemo      | Handle call waiting      | `useCallSession`   |
| AutoAnswerDemo       | Automatic call answering | `useSipAutoAnswer` |
| CallMutePatternsDemo | Advanced mute controls   | `useCallControls`  |

### Call Quality & Monitoring

| Demo                   | Description               | Key Composables              |
| ---------------------- | ------------------------- | ---------------------------- |
| CallQualityDemo        | Real-time quality metrics | `useCallQualityScore`        |
| WebRTCStatsDemo        | WebRTC statistics         | `useSipWebRTCStats`          |
| NetworkSimulatorDemo   | Test network conditions   | `useNetworkQualityIndicator` |
| ConnectionRecoveryDemo | Auto-reconnection         | `useConnectionRecovery`      |

### Call Center Features

| Demo             | Description          | Key Composables    |
| ---------------- | -------------------- | ------------------ |
| AgentLoginDemo   | Agent authentication | `useAmiAgentLogin` |
| AgentStatsDemo   | Agent performance    | `useAmiAgentStats` |
| QueueMonitorDemo | Queue statistics     | `useAmiQueues`     |
| SupervisorDemo   | Spy/whisper/barge    | `useAmiSupervisor` |
| CDRDashboardDemo | Call detail records  | `useAmiCDR`        |

### Video & Recording

| Demo                   | Description           | Key Composables         |
| ---------------------- | --------------------- | ----------------------- |
| PictureInPictureDemo   | PiP video display     | `usePictureInPicture`   |
| ScreenSharingDemo      | Screen sharing        | `useMediaDevices`       |
| CallRecordingDemo      | Server-side recording | `useAmiRecording`       |
| RecordingIndicatorDemo | Recording status      | `useRecordingIndicator` |
| ConferenceGalleryDemo  | Gallery video layout  | `useGalleryLayout`      |

### Communication Features

| Demo             | Description          | Key Composables      |
| ---------------- | -------------------- | -------------------- |
| PresenceDemo     | User presence status | `usePresence`        |
| SipMessagingDemo | SIP MESSAGE support  | `useMessaging`       |
| VoicemailDemo    | Voicemail management | `useAmiVoicemail`    |
| PagingDemo       | Paging/intercom      | `useAmiPaging`       |
| BLFDemo          | Busy lamp field      | `useFreePBXPresence` |

### Settings & Utilities

| Demo                   | Description         | Key Composables          |
| ---------------------- | ------------------- | ------------------------ |
| AudioDevicesDemo       | Device management   | `useMediaDevices`        |
| SettingsDemo           | Persistent settings | `useSettingsPersistence` |
| SessionPersistenceDemo | Session recovery    | `useSessionPersistence`  |
| CallHistoryDemo        | Call logs           | `useCallHistory`         |
| SpeedDialDemo          | Speed dial contacts | `useSettings`            |

[View all 50+ demos in the playground →](playground/)

## All Composables by Category

**Preview / experimental:** The following are marked as preview and may change: **Codecs** (`useCodecs`). See the [Codecs ADR](docs/adr/0001-codecs-architecture.md) for details.

### SIP Core

- `useSipClient` - SIP connection and registration
- `useCallSession` - Call state and operations
- `useCallControls` - Hold, mute, transfer controls
- `useSipRegistration` - Registration management

### Call Features

- `useDTMF` - DTMF tone sending
- `useCallTransfer` - Blind/attended transfers
- `useCallHold` - Hold/unhold operations
- `useMultiLine` - Multi-line phone support
- `useConference` - Conference calling
- `useSipAutoAnswer` - Auto-answer rules
- `useSipSecondLine` - Second line support

### Media & Devices

- `useMediaDevices` - Audio/video device management
- `useAudioDevices` - Audio-specific device control
- `usePictureInPicture` - Picture-in-picture video
- `useVideoInset` - Video inset positioning
- `useGalleryLayout` - Conference gallery layout
- `useActiveSpeaker` - Active speaker detection
- `useLocalRecording` - Client-side recording
- `useBandwidthAdaptation` - Adaptive bitrate

### Call Quality

- `useCallQualityScore` - Quality scoring (A-F grades)
- `useNetworkQualityIndicator` - Network quality indicators
- `useSipWebRTCStats` - Raw WebRTC statistics
- `useConnectionRecovery` - Auto-reconnection

### Call Center (AMI)

- `useAmi` - Base AMI connection
- `useAmiAgentLogin` - Agent authentication
- `useAmiAgentStats` - Agent performance stats
- `useAmiQueues` - Queue management
- `useAmiSupervisor` - Supervisor controls
- `useAmiCDR` - Call detail records
- `useAmiCalls` - Call monitoring
- `useAmiRecording` - Recording control
- `useAmiVoicemail` - Voicemail access
- `useAmiParking` - Call parking
- `useAmiPaging` - Paging/intercom

### Communication

- `usePresence` - User presence status
- `useMessaging` - SIP MESSAGE support
- `useFreePBXPresence` - FreePBX BLF/presence

### Persistence & Settings

- `useSessionPersistence` - Session recovery
- `useSettingsPersistence` - Persistent settings
- `useCallHistory` - Call log management
- `useSettings` - Application settings

### Advanced

- `useOAuth2` - OAuth2 authentication
- `useSipE911` - E911 emergency services
- `useRecordingIndicator` - Recording status display
- `useDialog` - SIP dialog management
- `useParticipantControls` - Conference participant management

## Development

```bash
# Install dependencies
pnpm install

# Run playground with all demos
pnpm dev

# Build library
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Lint
pnpm lint
```

## Use Cases

- **Enterprise Softphones** - Full-featured desktop phone applications
- **Call Centers** - Agent dashboards with queue management
- **Click-to-Call** - Embed calling in web applications
- **Video Conferencing** - Multi-party video meetings
- **CRM Integration** - Add calling to customer management systems
- **Telemedicine** - Healthcare video consultations
- **Help Desk** - Support ticket calling integration

## Browser Support

| Browser     | Version | Notes        |
| ----------- | ------- | ------------ |
| Chrome/Edge | 90+     | Full support |
| Firefox     | 88+     | Full support |
| Safari      | 14+     | Full support |

Requires WebRTC and modern JavaScript support.

## Environment Detection

VueSip provides browser and OS detection utilities for responsive UI implementations:

```typescript
import { isIOS, isAndroid, isMobileDevice, getBrowserName, getOS } from 'vuesip'

// Device type detection
isIOS() // Returns true on iOS Safari/WebView
isAndroid() // Returns true on Android Chrome/WebView
isMobileDevice() // Returns true on any mobile device

// Browser detection
getBrowserName() // Returns: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown'

// OS detection
getOS() // Returns: 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown'
```

## Architecture

SIP is accessed via an adapter (JsSIP implemented; SIP.js planned). VueSip follows the **headless component pattern**:

```
┌─────────────────────────────────────────────┐
│           Your Application                  │
├─────────────────────────────────────────────┤
│  Your UI Components (PrimeVue, Vuetify...)  │
├─────────────────────────────────────────────┤
│     VueSip Composables (Business Logic)     │
├─────────────────────────────────────────────┤
│  Adapters (JsSIP in progress, SIP.js planned) │
├─────────────────────────────────────────────┤
│           SIP Server (Asterisk, etc.)       │
└─────────────────────────────────────────────┘
```

## TypeScript Support

Full TypeScript support with comprehensive type exports:

```typescript
import type {
  SipClientConfig,
  CallSession,
  CallState,
  CallDirection,
  MediaDeviceInfo,
  ConferenceParticipant,
  QualityScore,
  // ... 100+ types
} from 'vuesip'
```

## Documentation

- **[Guide](https://vuesip.com/guide/)** - Getting started and tutorials
- **[API Reference](https://vuesip.com/api/)** - Complete API documentation
- **[Examples](https://vuesip.com/examples/)** - Usage examples and patterns
- **[Playground](https://play.vuesip.com/)** - Live interactive demos

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Built with:

- [Vue 3](https://vuejs.org/) - The Progressive JavaScript Framework
- [JsSIP](https://jssip.net/) / [SIP.js](https://sipjs.com/) - SIP adapters (JsSIP in progress, SIP.js planned)
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [Vitest](https://vitest.dev/) - Testing framework

### Codecs (preview)

The library will expose a `useCodecs` composable that lets you:

- Query local codec capabilities (audio/video)
- Set a codec policy (e.g., prefer Opus/VP8, allow legacy fallbacks)
- Apply preferences to transceivers or transform SDP as a fallback

See `docs/adr/0001-codecs-architecture.md` for the design overview.

<!-- Pre-commit hooks active: lint-staged + type-check -->
