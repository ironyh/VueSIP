# VueSip

> A headless Vue.js component library for SIP/VoIP applications

[![npm version](https://img.shields.io/npm/v/vuesip.svg)](https://www.npmjs.com/package/vuesip)
[![npm downloads](https://img.shields.io/npm/dm/vuesip.svg)](https://www.npmjs.com/package/vuesip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

VueSip provides **60+ composables** for building professional SIP interfaces with Asterisk, FreePBX, and other VoIP systems. Built with TypeScript and Vue 3, VueSip gives you the business logic while you control the UI.

## Features

- **Headless Architecture** - Complete separation of logic and UI
- **Full SIP Support** - WebRTC calling with JsSIP or SIP.js adapters
- **Video Calling** - One-on-one and conference video support
- **Call Quality Monitoring** - Real-time WebRTC stats and quality scoring
- **Call Center Features** - Queues, agents, supervisors, and statistics
- **Multi-Line Support** - Handle multiple concurrent calls
- **UI Agnostic** - Works with PrimeVue, Vuetify, Tailwind, or any UI
- **TypeScript** - Full type safety and IntelliSense
- **50+ Interactive Demos** - Working examples for every feature
- **Modern Stack** - Vue 3, Vite, TypeScript

## Live Demos

- Landing: https://demos.vuesip.com (or see docs: `docs/guide/demos.md`)
- Softphone (PWA): https://softphone.vuesip.com
- IVR Tester: https://ivr.vuesip.com
- Video Room: https://video.vuesip.com
- Call Center: https://callcenter.vuesip.com

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

## Architecture

VueSip follows the **headless component pattern**:

```
┌─────────────────────────────────────────────┐
│           Your Application                  │
├─────────────────────────────────────────────┤
│  Your UI Components (PrimeVue, Vuetify...)  │
├─────────────────────────────────────────────┤
│     VueSip Composables (Business Logic)     │
├─────────────────────────────────────────────┤
│  Adapters (JsSIP, SIP.js, or Custom)        │
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
- [JsSIP](https://jssip.net/) / [SIP.js](https://sipjs.com/) - SIP library adapters
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [Vitest](https://vitest.dev/) - Testing framework
