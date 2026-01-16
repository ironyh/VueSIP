# Part 4: Advanced Features

**Time: 20 minutes** | [&larr; Previous](/tutorial/part-3-real-server) | [Next &rarr;](/tutorial/part-5-ai-insights) | [Back to Tutorial Index](/tutorial/)

Time to add professional features: call transfer, conference calling, and recording.

## What You'll Build

- **Call Transfer** - Blind and attended transfers
- **Conference Calls** - Multi-party conversations
- **Call Recording** - Save calls locally
- **Audio Device Management** - Switch microphones/speakers

## Call Transfer

Transfer active calls to other extensions or phone numbers.

### Blind Transfer

Immediately transfers the call without consultation:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useCallSession, useCallTransfer } from 'vuesip'
import { TransferType } from 'vuesip/types'

const { activeCall } = useCallSession()

const { transferState, transferError, isTransferring, transferCall } = useCallTransfer(activeCall)

const transferTarget = ref('')

async function blindTransfer() {
  if (!transferTarget.value) return

  const result = await transferCall(transferTarget.value, {
    type: TransferType.Blind,
    target: `sip:${transferTarget.value}@sip.provider.com`,
  })

  if (result.success) {
    console.log('Transfer initiated')
    transferTarget.value = ''
  } else {
    console.error('Transfer failed:', result.error)
  }
}
</script>

<template>
  <div class="transfer-panel">
    <input v-model="transferTarget" placeholder="Transfer to..." :disabled="isTransferring" />
    <button @click="blindTransfer" :disabled="!activeCall || isTransferring">
      {{ isTransferring ? 'Transferring...' : 'Transfer' }}
    </button>
    <p v-if="transferError" class="error">
      {{ transferError }}
    </p>
  </div>
</template>
```

### Attended Transfer

Consult with the transfer target before completing:

```typescript
import { TransferType } from 'vuesip/types'

// Step 1: Call the transfer target (puts original call on hold)
const consultationCall = await call(transferTarget.value)

// Step 2: Talk to them, then complete transfer
async function completeAttendedTransfer() {
  await transferCall(transferTarget.value, {
    type: TransferType.Attended,
    target: `sip:${transferTarget.value}@sip.provider.com`,
    consultationCallId: consultationCall.id,
  })
}

// Or cancel and return to original call
async function cancelTransfer() {
  await hangup() // End consultation call
  await unhold() // Resume original call
}
```

## Conference Calling

Create multi-party calls with participant management.

### Basic Conference

```vue
<script setup lang="ts">
import { useSipClient, useConference } from 'vuesip'

const { getClient } = useSipClient(config)

const {
  conference,
  state,
  participants,
  participantCount,
  isActive,
  createConference,
  addParticipant,
  removeParticipant,
  leaveConference,
  muteParticipant,
  unmuteParticipant,
} = useConference(getClient)

// Create a new conference
async function startConference() {
  await createConference({
    name: 'Team Meeting',
    maxParticipants: 10,
  })
}

// Invite someone
async function inviteParticipant(number: string) {
  await addParticipant(`sip:${number}@sip.provider.com`)
}
</script>

<template>
  <div class="conference">
    <div v-if="!isActive">
      <button @click="startConference">Start Conference</button>
    </div>

    <div v-else>
      <h3>{{ conference?.name }} ({{ participantCount }} participants)</h3>

      <!-- Participant List -->
      <ul class="participants">
        <li
          v-for="p in participants"
          :key="p.id"
          :class="{ speaking: p.isSpeaking, muted: p.isMuted }"
        >
          <span class="name">
            {{ p.displayName || p.uri }}
            <span v-if="p.isSelf">(You)</span>
          </span>

          <div class="controls" v-if="!p.isSelf">
            <button @click="p.isMuted ? unmuteParticipant(p.id) : muteParticipant(p.id)">
              {{ p.isMuted ? 'Unmute' : 'Mute' }}
            </button>
            <button @click="removeParticipant(p.id)">Remove</button>
          </div>
        </li>
      </ul>

      <!-- Add Participant -->
      <div class="add-participant">
        <input v-model="newParticipant" placeholder="Phone number..." />
        <button @click="inviteParticipant(newParticipant)">Add</button>
      </div>

      <button @click="leaveConference" class="leave-btn">Leave Conference</button>
    </div>
  </div>
</template>

<style scoped>
.participants li.speaking {
  background: #dcfce7;
}

.participants li.muted {
  opacity: 0.6;
}
</style>
```

### Audio Level Indicators

Show who's speaking in real-time:

```typescript
import { useConference } from 'vuesip'

const { participants, onAudioLevel } = useConference(getClient)

// Listen for audio level changes
onAudioLevel((event) => {
  const { participantId, level } = event
  // level is 0-100, update UI accordingly
  console.log(`${participantId} audio level: ${level}`)
})
```

## Call Recording

Record calls locally in the browser.

### Basic Recording

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useCallSession, useLocalRecording } from 'vuesip'

const { activeCall } = useCallSession()

const { state, isRecording, duration, recordingData, start, stop, pause, resume, download } =
  useLocalRecording({
    mimeType: 'audio/webm',
    autoDownload: false,
    filenamePrefix: 'call-recording',
  })

// Start recording when call connects
async function startRecording() {
  if (!activeCall.value) return

  // Get the call's audio stream
  const stream = activeCall.value.getRemoteStream()
  if (stream) {
    await start(stream)
  }
}

// Stop and optionally download
async function stopRecording() {
  await stop()
  // Recording is now in recordingData.value
}

// Format duration as MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="recording-controls">
    <div v-if="!isRecording">
      <button @click="startRecording" :disabled="!activeCall">Start Recording</button>
    </div>

    <div v-else class="recording-active">
      <span class="recording-indicator">REC</span>
      <span class="duration">{{ formatDuration(duration) }}</span>

      <button @click="pause" v-if="state === 'recording'">Pause</button>
      <button @click="resume" v-if="state === 'paused'">Resume</button>
      <button @click="stopRecording">Stop</button>
    </div>

    <!-- Download completed recording -->
    <div v-if="recordingData" class="recording-complete">
      <p>Recording saved ({{ (recordingData.size / 1024).toFixed(1) }} KB)</p>
      <button @click="download">Download</button>
    </div>
  </div>
</template>

<style scoped>
.recording-indicator {
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
```

### Recording with Persistence

Save recordings to IndexedDB for later access:

```typescript
const recording = useLocalRecording({
  persist: true, // Save to IndexedDB
  dbName: 'my-app-recordings',
  storeName: 'calls',
  autoDownload: false,
})

// List saved recordings
const { listRecordings, getRecording, deleteRecording } = recording

const savedRecordings = await listRecordings()
// Returns: [{ id, timestamp, duration, size, metadata }, ...]

// Get a specific recording
const blob = await getRecording('recording-id')

// Clean up old recordings
await deleteRecording('recording-id')
```

## Audio Device Management

Let users choose their microphone and speaker.

```vue
<script setup lang="ts">
import { useDeviceManager } from 'vuesip'

const {
  audioInputDevices, // Available microphones
  audioOutputDevices, // Available speakers
  selectedAudioInput,
  selectedAudioOutput,
  refreshDevices,
  selectAudioInput,
  selectAudioOutput,
  testAudioOutput,
} = useDeviceManager()

// Switch microphone
async function changeMicrophone(deviceId: string) {
  await selectAudioInput(deviceId)
}

// Switch speaker (with test tone)
async function changeSpeaker(deviceId: string) {
  await selectAudioOutput(deviceId)
  await testAudioOutput() // Plays a brief test tone
}
</script>

<template>
  <div class="device-settings">
    <div class="setting">
      <label>Microphone</label>
      <select
        :value="selectedAudioInput"
        @change="changeMicrophone(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="device in audioInputDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label || 'Microphone ' + device.deviceId.slice(0, 8) }}
        </option>
      </select>
    </div>

    <div class="setting">
      <label>Speaker</label>
      <select
        :value="selectedAudioOutput"
        @change="changeSpeaker(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="device in audioOutputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label || 'Speaker ' + device.deviceId.slice(0, 8) }}
        </option>
      </select>
      <button @click="testAudioOutput">Test</button>
    </div>

    <button @click="refreshDevices">Refresh Devices</button>
  </div>
</template>
```

## Bonus: Audio Processing

Improve call quality with noise suppression:

```typescript
import { useAudioProcessing } from 'vuesip'

const {
  isProcessing,
  audioQualityScore,
  enableNoiseSuppression,
  disableNoiseSuppression,
  enableEchoCancellation,
  setNoiseSuppressionLevel,
} = useAudioProcessing(mediaStream, {
  noiseSuppressionLevel: 'moderate', // 'low' | 'moderate' | 'aggressive'
  echoCancellation: true,
  autoGainControl: true,
})

// Enable when call starts
await enableNoiseSuppression()

// Adjust based on environment
if (noisyEnvironment) {
  setNoiseSuppressionLevel('aggressive')
}
```

## Complete Advanced Softphone

Here's a component combining all advanced features:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useSipClient,
  useCallSession,
  useCallTransfer,
  useConference,
  useLocalRecording,
  useDeviceManager,
} from 'vuesip'
import { TransferType } from 'vuesip/types'

// ... initialize all composables ...

const activeTab = ref<'transfer' | 'conference' | 'recording' | 'devices'>('transfer')
</script>

<template>
  <div class="advanced-softphone">
    <!-- Tab Navigation -->
    <nav class="tabs">
      <button
        v-for="tab in ['transfer', 'conference', 'recording', 'devices']"
        :key="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </nav>

    <!-- Tab Panels -->
    <div class="panel" v-show="activeTab === 'transfer'">
      <!-- Transfer UI from above -->
    </div>

    <div class="panel" v-show="activeTab === 'conference'">
      <!-- Conference UI from above -->
    </div>

    <div class="panel" v-show="activeTab === 'recording'">
      <!-- Recording UI from above -->
    </div>

    <div class="panel" v-show="activeTab === 'devices'">
      <!-- Device Manager UI from above -->
    </div>
  </div>
</template>
```

## What You Learned

- **Call Transfer**: Blind and attended transfer patterns
- **Conference Calls**: Creating, managing participants, audio levels
- **Recording**: Local recording with MediaRecorder API, persistence
- **Device Management**: Microphone/speaker selection and testing
- **Audio Processing**: Noise suppression and echo cancellation

## Congratulations!

You've completed the VueSIP tutorial! You now have the knowledge to build production-ready SIP applications with Vue.js.

## What's Next?

### Explore More Composables

VueSIP has 70+ composables for every telephony need:

- `usePresence` - Online/busy/away status
- `useMessaging` - SIP MESSAGE support
- `useAgentQueue` - Call center queue management
- `useTranscription` - Real-time speech-to-text
- `useSentiment` - Call sentiment analysis

### Check the Templates

Production-ready starting points:

- **PWA Softphone** - Progressive web app with push notifications
- **Video Room** - Multi-party video conferencing
- **IVR Tester** - Interactive voice response testing tool

### Enterprise Features

For compliance and analytics needs:

- `@vuesip/enterprise` - CRM integration, compliance recording, analytics dashboards

## Resources

- [API Reference](/api/) - Complete API documentation
- [Examples](/examples/) - Working code examples
- [GitHub](https://github.com/ironyh/VueSIP) - Source code and issues

Happy building!
