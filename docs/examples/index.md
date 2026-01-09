# Examples

Learn VueSip by exploring the **50+ interactive demos** in the playground. Each demo showcases specific features with live code you can experiment with.

## Getting Started

Run the playground locally to explore all demos:

```bash
# Clone the repository
git clone https://github.com/ironyh/VueSip.git
cd VueSip

# Install dependencies
pnpm install

# Start the playground
pnpm dev
```

Visit `http://localhost:5173` to access the interactive playground.

::: tip Live Playground
Try the demos online at [vuesip-play.pages.dev](https://vuesip-play.pages.dev/)
:::

---

## Core Calling Demos

### BasicCallDemo

A complete example of one-to-one audio calling with connection management.

**Features:**

- SIP client connection and registration
- Make and receive audio calls
- Call state tracking and duration display
- Error handling and user feedback

**Key Composables:** `useSipClient`, `useCallSession`

```vue
<script setup lang="ts">
import { useSipClient, useCallSession } from 'vuesip'

const { connect, isConnected, isRegistered } = useSipClient()
const { currentCall, makeCall, answer, hangup } = useCallSession()

await connect({
  uri: 'sip:1000@example.com',
  password: 'secret',
  server: 'wss://sip.example.com:8089/ws',
})
</script>
```

---

### VideoCallDemo

Video calling with camera selection, preview, and picture-in-picture support.

**Features:**

- Bidirectional video and audio calls
- Local video preview
- Camera enumeration and selection
- Switch cameras during active calls
- Enable/disable video during calls

**Key Composables:** `useSipClient`, `useCallSession`, `useMediaDevices`

---

### MultiLineDemo

Multi-line phone system supporting multiple concurrent calls.

**Features:**

- Up to 5 concurrent calls
- Visual call line management
- Call switching between lines
- Individual line controls (hold, mute)
- Call duration tracking per line

**Key Composables:** `useMultiLine`

---

### ConferenceCallDemo

Multi-party conference calling with participant management.

**Features:**

- Multi-party audio/video conferences
- Participant list and management
- Mute individual participants
- Join/leave notifications
- Conference moderation controls

**Key Composables:** `useConference`

---

### CallTransferDemo

Blind and attended call transfers.

**Features:**

- Blind transfer to another extension
- Attended transfer with consultation
- Transfer status feedback

**Key Composables:** `useCallTransfer`

---

## Call Controls Demos

### DtmfDemo

Send DTMF tones during calls.

**Features:**

- Interactive dialpad
- Single digit and sequence sending
- Configurable tone duration
- Visual feedback

**Key Composables:** `useDTMF`

```typescript
import { useDTMF } from 'vuesip'

const { sendDTMF, sendDTMFSequence } = useDTMF(callSession)

// Send single digit
sendDTMF('5')

// Send sequence with 200ms interval
await sendDTMFSequence('1234#', 200)
```

---

### CallTimerDemo

Real-time call duration tracking.

**Features:**

- Live call timer display
- Format options (HH:MM:SS)
- Start/stop on call state changes

**Key Composables:** `useCallSession`

---

### AutoAnswerDemo

Automatic call answering based on configurable rules.

**Features:**

- Enable/disable auto-answer
- Configurable delay before answering
- Caller ID filtering
- Queue call handling

**Key Composables:** `useSipAutoAnswer`

---

## Call Quality Demos

### CallQualityDemo

Real-time call quality monitoring with scoring.

**Features:**

- Quality scores (A-F grades, 0-100 scale)
- Jitter, latency, packet loss metrics
- Trend analysis with confidence scoring
- Actionable recommendations

**Key Composables:** `useCallQualityScore`

```typescript
import { useCallQualityScore } from 'vuesip'

const {
  score, // Ref<number> - 0-100 quality score
  grade, // Ref<'A'|'B'|'C'|'D'|'F'>
  factors, // Contributing quality factors
  trend, // Quality trend (improving/declining)
  recommendations, // Improvement suggestions
} = useCallQualityScore()
```

---

### WebRTCStatsDemo

Raw WebRTC statistics for debugging and analysis.

**Features:**

- Inbound/outbound RTP stats
- ICE connection state
- Codec information
- Bandwidth usage

**Key Composables:** `useSipWebRTCStats`

---

### NetworkSimulatorDemo

Simulate network conditions for testing.

**Features:**

- Adjustable latency
- Packet loss simulation
- Bandwidth throttling
- Quality indicator visualization

**Key Composables:** `useNetworkQualityIndicator`

---

### ConnectionRecoveryDemo

Automatic reconnection and session recovery.

**Features:**

- Connection monitoring
- Automatic reconnection attempts
- Exponential backoff
- Session state preservation

**Key Composables:** `useConnectionRecovery`

---

## Call Center Demos

### AgentLoginDemo

Call center agent authentication and status management.

**Features:**

- Agent login/logout
- Queue membership management
- Break/pause status
- Extension assignment

**Key Composables:** `useAmiAgentLogin`

---

### AgentStatsDemo

Real-time agent performance statistics.

**Features:**

- Calls handled today
- Average handle time
- Talk time and wrap-up time
- Availability metrics

**Key Composables:** `useAmiAgentStats`

---

### QueueMonitorDemo

Live queue statistics and monitoring.

**Features:**

- Queue wait times
- Calls waiting count
- Service level metrics
- Agent availability

**Key Composables:** `useAmiQueues`

---

### SupervisorDemo

Supervisor controls for call center management.

**Features:**

- Silent monitoring (spy)
- Whisper mode (talk to agent only)
- Barge-in (join call)
- Agent performance overview

**Key Composables:** `useAmiSupervisor`

---

### CDRDashboardDemo

Call detail records and reporting.

**Features:**

- Call history search
- Duration and disposition tracking
- Export capabilities
- Date range filtering

**Key Composables:** `useAmiCDR`

---

## Video & Recording Demos

### PictureInPictureDemo

Browser Picture-in-Picture API integration.

**Features:**

- Enable/disable PiP mode
- Automatic PiP on tab switch
- Custom PiP controls
- Video element management

**Key Composables:** `usePictureInPicture`

---

### ScreenSharingDemo

Screen sharing during calls.

**Features:**

- Screen/window/tab selection
- Start/stop sharing
- Replace video track
- Sharing indicator

**Key Composables:** `useMediaDevices`

---

### CallRecordingDemo

Server-side call recording management.

**Features:**

- Start/stop recording
- Recording status indicator
- Recording file management
- Permission handling

**Key Composables:** `useAmiRecording`

---

### RecordingIndicatorDemo

Visual recording status indicator.

**Features:**

- Recording state display
- Duration tracking
- Privacy indicators

**Key Composables:** `useRecordingIndicator`

---

### ConferenceGalleryDemo

Conference video gallery layout.

**Features:**

- Grid layout for participants
- Active speaker highlighting
- Responsive grid sizing
- Participant controls

**Key Composables:** `useGalleryLayout`, `useActiveSpeaker`

---

## Communication Demos

### PresenceDemo

User presence and status management.

**Features:**

- Online/offline/away status
- Custom status messages
- Presence subscriptions
- BLF (Busy Lamp Field)

**Key Composables:** `usePresence`

---

### SipMessagingDemo

SIP MESSAGE support for instant messaging.

**Features:**

- Send/receive SIP messages
- Message history
- Delivery confirmation
- Typing indicators

**Key Composables:** `useMessaging`

---

### VoicemailDemo

Voicemail box management.

**Features:**

- Message list
- Playback controls
- Delete/archive messages
- New message notifications

**Key Composables:** `useAmiVoicemail`

---

### PagingDemo

Paging and intercom functionality.

**Features:**

- Page groups
- Zone announcements
- Two-way intercom
- Page history

**Key Composables:** `useAmiPaging`

---

### BLFDemo

Busy Lamp Field presence indicators.

**Features:**

- Extension status monitoring
- Quick dial from BLF
- Visual status indicators
- Pickup group integration

**Key Composables:** `useFreePBXPresence`

---

## Settings & Utilities Demos

### AudioDevicesDemo

Complete audio device management.

**Features:**

- Microphone selection
- Speaker selection
- Volume controls
- Device change detection

**Key Composables:** `useMediaDevices`, `useAudioDevices`

```typescript
import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInput,
  selectAudioInput,
  selectAudioOutput,
  requestPermissions,
} = useMediaDevices()

// Request microphone access
await requestPermissions(true, false)
```

---

### SettingsDemo

Application settings with persistence.

**Features:**

- Audio preferences
- Ringtone selection
- Notification settings
- Theme preferences

**Key Composables:** `useSettings`, `useSettingsPersistence`

---

### SessionPersistenceDemo

Session state preservation across page reloads.

**Features:**

- Reconnect after page refresh
- Call state recovery
- Registration persistence
- Credential management

**Key Composables:** `useSessionPersistence`

---

### CallHistoryDemo

Call log management and search.

**Features:**

- Incoming/outgoing/missed calls
- Date range filtering
- Search by number/name
- Call back functionality

**Key Composables:** `useCallHistory`

---

### SpeedDialDemo

Speed dial and contacts management.

**Features:**

- Add/edit speed dial entries
- Drag and drop ordering
- One-click calling
- Favorites management

**Key Composables:** `useSettings`

---

## Additional Demos

The playground includes many more demos:

| Demo                    | Description                              |
| ----------------------- | ---------------------------------------- |
| CallWaitingDemo         | Handle incoming calls during active call |
| CallMutePatternsDemo    | Advanced mute patterns                   |
| ClickToCallDemo         | Click-to-call integration                |
| ContactsDemo            | Contact list management                  |
| CustomRingtonesDemo     | Custom ringtone selection                |
| DoNotDisturbDemo        | DND mode management                      |
| E911Demo                | E911 emergency location                  |
| FeatureCodesDemo        | Feature code dialing                     |
| IVRMonitorDemo          | IVR flow monitoring                      |
| ParkingDemo             | Call parking operations                  |
| RecordingManagementDemo | Recording file management                |
| RingGroupsDemo          | Ring group configuration                 |
| TimeConditionsDemo      | Time-based routing                       |
| ToolbarLayoutsDemo      | Customizable call toolbar                |
| UserManagementDemo      | User administration                      |

---

## Quick Comparison

| Demo Category     | Demos | Difficulty   | Key Features                   |
| ----------------- | ----- | ------------ | ------------------------------ |
| Core Calling      | 5     | Beginner     | Basic SIP operations           |
| Call Controls     | 5     | Beginner     | DTMF, timer, auto-answer       |
| Call Quality      | 4     | Intermediate | WebRTC stats, monitoring       |
| Call Center       | 5     | Advanced     | AMI integration, queues        |
| Video & Recording | 5     | Intermediate | PiP, screen share, recording   |
| Communication     | 5     | Intermediate | Presence, messaging, voicemail |
| Settings          | 5     | Beginner     | Devices, persistence           |

---

## Learning Paths

### Beginner Path

1. **BasicCallDemo** - Understand SIP connection and calling
2. **AudioDevicesDemo** - Learn device management
3. **DtmfDemo** - Add DTMF support
4. **CallHistoryDemo** - Track call logs

### Intermediate Path

1. **VideoCallDemo** - Add video calling
2. **CallQualityDemo** - Monitor call quality
3. **MultiLineDemo** - Handle multiple calls
4. **ConnectionRecoveryDemo** - Handle disconnections

### Advanced Path

1. **ConferenceCallDemo** - Multi-party calling
2. **AgentLoginDemo** - Call center integration
3. **SupervisorDemo** - Supervisor controls
4. **CDRDashboardDemo** - Reporting and analytics

---

## Running Individual Demos

Each demo is a standalone Vue component. To run a specific demo:

1. Start the playground: `pnpm dev`
2. Navigate to the demo in the sidebar
3. Click "View Source" to see the implementation
4. Copy and adapt the code for your application

---

## Contributing Examples

Have an example to share? Contributions are welcome!

1. Create a new demo in `playground/demos/`
2. Register it in the demo configuration
3. Add documentation
4. Submit a pull request

[Contribution Guidelines](https://github.com/ironyh/VueSip/blob/main/CONTRIBUTING.md)

---

## Next Steps

- [Getting Started Guide](/guide/getting-started) - Set up your first VueSip project
- [API Reference](/api/) - Complete API documentation
- [FAQ](/faq) - Common questions and answers
