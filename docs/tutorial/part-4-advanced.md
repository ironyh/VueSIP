---
title: 'Part 4: Advanced Features'
description: 'Add professional features like call transfers, conferencing, transcription, and quality monitoring'
---

# Part 4: Advanced Features

**Time: 20 minutes** | **Difficulty: Advanced**

Your softphone can make and receive calls. Now let's add the professional features that make a truly production-ready application.

## What You'll Learn

- Call transfers (blind and attended)
- Conference calling with participant management
- Real-time transcription
- Call quality monitoring
- Recording basics

## Feature 1: Call Transfers

Call transfers let you redirect an active call to another party.

### Transfer Types

| Type                  | Description                         | Use Case                   |
| --------------------- | ----------------------------------- | -------------------------- |
| **Blind Transfer**    | Immediately transfer, you drop off  | Quick handoff to colleague |
| **Attended Transfer** | Talk to target first, then transfer | Warm handoff with context  |

### Using useCallTransfer

```vue
<script setup lang="ts">
import { useCallTransfer } from 'vuesip'
import type { TransferType } from 'vuesip'

const { transferState, transferType, isTransferring, transferError, transferCall, clearTransfer } =
  useCallTransfer(sessionRef)

// Blind transfer - immediate handoff
async function blindTransfer(targetNumber: string) {
  try {
    const result = await transferCall(`sip:${targetNumber}@provider.com`, {
      type: 'blind' as TransferType,
      target: `sip:${targetNumber}@provider.com`,
    })

    if (result.success) {
      console.log('Transfer successful!')
    } else {
      console.error('Transfer failed:', result.error)
    }
  } catch (err) {
    console.error('Transfer error:', err)
  }
}
</script>
```

### Building a Transfer UI

```vue
<template>
  <div class="transfer-panel" v-if="isActive">
    <h3>Transfer Call</h3>

    <!-- Transfer Target Input -->
    <div class="transfer-input">
      <input
        v-model="transferTarget"
        placeholder="Enter transfer target"
        :disabled="isTransferring"
      />
    </div>

    <!-- Transfer Buttons -->
    <div class="transfer-actions">
      <button
        @click="handleBlindTransfer"
        :disabled="!transferTarget || isTransferring"
        class="transfer-btn blind"
      >
        <span class="icon">Blind Transfer</span>
        <span class="desc">Transfer immediately</span>
      </button>

      <button
        @click="handleAttendedTransfer"
        :disabled="!transferTarget || isTransferring"
        class="transfer-btn attended"
      >
        <span class="icon">Attended Transfer</span>
        <span class="desc">Consult first, then transfer</span>
      </button>
    </div>

    <!-- Transfer Status -->
    <div v-if="isTransferring" class="transfer-status">
      <span class="spinner"></span>
      Transfer in progress: {{ transferState }}
    </div>

    <div v-if="transferError" class="transfer-error">
      {{ transferError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCallTransfer } from 'vuesip'

const props = defineProps<{
  session: any
  isActive: boolean
}>()

const { transferState, isTransferring, transferError, transferCall, clearTransfer } =
  useCallTransfer(() => props.session)

const transferTarget = ref('')

async function handleBlindTransfer() {
  await transferCall(`sip:${transferTarget.value}@provider.com`, {
    type: 'blind',
    target: `sip:${transferTarget.value}@provider.com`,
  })
}

async function handleAttendedTransfer() {
  // Attended transfer creates a consultation call first
  await transferCall(`sip:${transferTarget.value}@provider.com`, {
    type: 'attended',
    target: `sip:${transferTarget.value}@provider.com`,
  })
}
</script>
```

## Feature 2: Conference Calling

Conference calling connects multiple parties in a single call.

### Using useConference

```vue
<script setup lang="ts">
import { useConference } from 'vuesip'

const {
  conference,
  state,
  participants,
  participantCount,
  isActive,
  isLocked,
  isRecording,
  localParticipant,

  // Methods
  createConference,
  joinConference,
  leaveConference,
  addParticipant,
  removeParticipant,
  muteParticipant,
  lockConference,
  unlockConference,
  startRecording,
  stopRecording,
} = useConference(sipClient)

// Create a new conference
async function startConference() {
  try {
    const conferenceId = await createConference({
      maxParticipants: 10,
      startMuted: false,
      recordOnJoin: false,
    })
    console.log('Conference created:', conferenceId)
  } catch (err) {
    console.error('Failed to create conference:', err)
  }
}

// Add a participant
async function inviteParticipant(number: string) {
  try {
    await addParticipant(`sip:${number}@provider.com`)
    console.log('Participant invited')
  } catch (err) {
    console.error('Failed to add participant:', err)
  }
}
</script>
```

### Building a Conference UI

```vue
<template>
  <div class="conference-panel">
    <div class="conference-header">
      <h3>Conference Call</h3>
      <span class="participant-count"> {{ participantCount }} participants </span>
    </div>

    <!-- Conference Controls -->
    <div v-if="!isActive" class="start-conference">
      <button @click="handleCreateConference" class="create-btn">Start Conference</button>
    </div>

    <!-- Active Conference -->
    <div v-else class="active-conference">
      <!-- Participant Grid -->
      <div class="participant-grid">
        <div
          v-for="participant in participants"
          :key="participant.id"
          :class="[
            'participant-card',
            {
              speaking: participant.isSpeaking,
              muted: participant.isMuted,
              self: participant.isSelf,
            },
          ]"
        >
          <div class="avatar">
            {{ participant.displayName?.charAt(0) || '?' }}
          </div>
          <div class="name">
            {{ participant.displayName || participant.uri }}
            <span v-if="participant.isSelf" class="you-badge">(You)</span>
          </div>
          <div class="status">
            <span v-if="participant.isMuted" class="muted-icon">Muted</span>
            <span v-if="participant.isSpeaking" class="speaking-icon"> Speaking </span>
          </div>
          <div v-if="!participant.isSelf" class="actions">
            <button @click="handleMuteParticipant(participant.id)" class="action-btn">
              {{ participant.isMuted ? 'Unmute' : 'Mute' }}
            </button>
            <button @click="handleRemoveParticipant(participant.id)" class="action-btn remove">
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Add Participant -->
      <div class="add-participant">
        <input v-model="newParticipant" placeholder="Number to add" />
        <button @click="handleAddParticipant" :disabled="!newParticipant">Add</button>
      </div>

      <!-- Conference Actions -->
      <div class="conference-actions">
        <button @click="handleToggleLock" :class="{ active: isLocked }">
          {{ isLocked ? 'Unlock' : 'Lock' }}
        </button>
        <button @click="handleToggleRecording" :class="{ active: isRecording }">
          {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
        </button>
        <button @click="handleLeaveConference" class="leave-btn">Leave Conference</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConference } from 'vuesip'

const props = defineProps<{ sipClient: any }>()

const {
  state,
  participants,
  participantCount,
  isActive,
  isLocked,
  isRecording,
  createConference,
  leaveConference,
  addParticipant,
  removeParticipant,
  muteParticipant,
  lockConference,
  unlockConference,
  startRecording,
  stopRecording,
} = useConference(props.sipClient)

const newParticipant = ref('')

async function handleCreateConference() {
  await createConference({ maxParticipants: 10 })
}

async function handleAddParticipant() {
  if (!newParticipant.value) return
  await addParticipant(`sip:${newParticipant.value}@provider.com`)
  newParticipant.value = ''
}

async function handleRemoveParticipant(participantId: string) {
  await removeParticipant(participantId)
}

async function handleMuteParticipant(participantId: string) {
  const participant = participants.value.find((p) => p.id === participantId)
  if (participant) {
    await muteParticipant(participantId, !participant.isMuted)
  }
}

async function handleToggleLock() {
  if (isLocked.value) {
    await unlockConference()
  } else {
    await lockConference()
  }
}

async function handleToggleRecording() {
  if (isRecording.value) {
    await stopRecording()
  } else {
    await startRecording()
  }
}

async function handleLeaveConference() {
  await leaveConference()
}
</script>

<style scoped>
.participant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.participant-card {
  padding: 1rem;
  background: #1e293b;
  border-radius: 8px;
  text-align: center;
}

.participant-card.speaking {
  border: 2px solid #22c55e;
}

.participant-card.muted {
  opacity: 0.7;
}

.avatar {
  width: 48px;
  height: 48px;
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin: 0 auto 0.5rem;
}
</style>
```

## Feature 3: Real-Time Transcription

Add live transcription to your calls using the Web Speech API or external providers.

### Using useTranscription

```vue
<script setup lang="ts">
import { useTranscription } from 'vuesip'

const {
  // State
  isTranscribing,
  transcript,
  currentUtterance,
  error,
  detectedLanguage,

  // Controls
  start,
  stop,
  pause,
  resume,
  clear,

  // Features
  addKeywordRule,
  removeKeywordRule,
  exportTranscript,

  // Participants
  setLocalEnabled,
  setRemoteEnabled,
} = useTranscription({
  // Provider configuration
  provider: 'web-speech', // or 'whisper', 'deepgram', etc.
  language: 'en-US',

  // Enable for both parties
  localEnabled: true,
  remoteEnabled: true,

  // Participant names for transcript
  localName: 'Agent',
  remoteName: 'Customer',

  // Keyword detection
  keywords: [
    { phrase: 'cancel', action: 'escalate', priority: 'high' },
    { phrase: 'refund', action: 'flag', priority: 'medium' },
  ],

  // Callbacks
  onKeywordDetected: (match) => {
    console.log('Keyword detected:', match.rule.phrase)
    // Show alert, flag for supervisor, etc.
  },
})

// Start transcription when call connects
watch(callState, async (state) => {
  if (state === 'active') {
    await start()
  } else if (state === 'ended') {
    await stop()
  }
})
</script>
```

### Building a Transcription Panel

```vue
<template>
  <div class="transcription-panel">
    <div class="transcription-header">
      <h3>Live Transcription</h3>
      <div class="controls">
        <button v-if="!isTranscribing" @click="start" class="start-btn">Start</button>
        <button v-else @click="stop" class="stop-btn">Stop</button>
        <button @click="handleExport" :disabled="!transcript.length">Export</button>
      </div>
    </div>

    <!-- Live Transcript -->
    <div class="transcript-container" ref="transcriptContainer">
      <div v-for="entry in transcript" :key="entry.id" :class="['transcript-entry', entry.speaker]">
        <div class="speaker-label">
          {{ entry.speakerLabel }}
          <span class="timestamp">{{ formatTime(entry.timestamp) }}</span>
        </div>
        <div class="text">{{ entry.text }}</div>
        <div v-if="entry.confidence < 0.8" class="low-confidence">(Low confidence)</div>
      </div>

      <!-- Current utterance (in progress) -->
      <div v-if="currentUtterance" class="current-utterance">
        <span class="typing-indicator"></span>
        {{ currentUtterance }}
      </div>
    </div>

    <!-- Keyword Alerts -->
    <div v-if="keywordMatches.length" class="keyword-alerts">
      <div
        v-for="match in keywordMatches"
        :key="match.timestamp"
        :class="['keyword-alert', match.rule.priority]"
      >
        Keyword detected: "{{ match.matchedText }}"
        <span class="action">Action: {{ match.rule.action }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useTranscription } from 'vuesip'

const {
  isTranscribing,
  transcript,
  currentUtterance,
  start,
  stop,
  exportTranscript,
  addKeywordRule,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
  localName: 'Me',
  remoteName: 'Caller',
})

const transcriptContainer = ref<HTMLElement | null>(null)
const keywordMatches = ref<any[]>([])

// Auto-scroll to bottom on new entries
watch(transcript, async () => {
  await nextTick()
  if (transcriptContainer.value) {
    transcriptContainer.value.scrollTop = transcriptContainer.value.scrollHeight
  }
})

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

async function handleExport() {
  // Export as SRT subtitle format
  const srt = exportTranscript('srt')
  downloadFile(srt, 'transcript.srt', 'text/plain')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.transcript-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
  background: #0f172a;
  border-radius: 8px;
}

.transcript-entry {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.transcript-entry.local {
  background: rgba(59, 130, 246, 0.2);
  margin-left: 2rem;
}

.transcript-entry.remote {
  background: rgba(34, 197, 94, 0.2);
  margin-right: 2rem;
}

.speaker-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.timestamp {
  margin-left: 0.5rem;
}

.current-utterance {
  color: #94a3b8;
  font-style: italic;
}

.typing-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
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

.keyword-alert {
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.keyword-alert.high {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
}

.keyword-alert.medium {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
}
</style>
```

## Feature 4: Call Quality Monitoring

Monitor call quality in real-time to detect and handle issues.

### Using Call Quality Metrics

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCallSession } from 'vuesip'

const { session, getStats } = useCallSession()

const qualityMetrics = ref({
  bitrate: 0,
  packetLoss: 0,
  jitter: 0,
  roundTripTime: 0,
  audioLevel: 0,
})

const qualityScore = computed(() => {
  // Calculate overall quality score (0-100)
  const { packetLoss, jitter, roundTripTime } = qualityMetrics.value

  let score = 100

  // Packet loss penalty
  if (packetLoss > 0) score -= packetLoss * 20
  if (packetLoss > 5) score -= 30

  // Jitter penalty (>30ms is noticeable)
  if (jitter > 30) score -= 10
  if (jitter > 50) score -= 20

  // RTT penalty (>200ms is noticeable)
  if (roundTripTime > 200) score -= 10
  if (roundTripTime > 400) score -= 20

  return Math.max(0, Math.min(100, score))
})

const qualityLabel = computed(() => {
  const score = qualityScore.value
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Poor'
  return 'Bad'
})

// Poll for stats every second
let statsInterval: NodeJS.Timer | null = null

onMounted(() => {
  statsInterval = setInterval(async () => {
    if (session.value) {
      try {
        const stats = await getStats()
        if (stats) {
          qualityMetrics.value = {
            bitrate: stats.audio?.bitrate || 0,
            packetLoss: stats.audio?.packetsLost || 0,
            jitter: stats.audio?.jitter || 0,
            roundTripTime: stats.audio?.roundTripTime || 0,
            audioLevel: stats.audio?.audioLevel || 0,
          }
        }
      } catch (err) {
        console.error('Failed to get stats:', err)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})
</script>

<template>
  <div class="quality-panel">
    <div class="quality-header">
      <h4>Call Quality</h4>
      <div :class="['quality-badge', qualityLabel.toLowerCase()]">
        {{ qualityLabel }}
      </div>
    </div>

    <div class="quality-meter">
      <div
        class="quality-bar"
        :style="{ width: `${qualityScore}%` }"
        :class="qualityLabel.toLowerCase()"
      ></div>
    </div>

    <div class="metrics-grid">
      <div class="metric">
        <span class="label">Bitrate</span>
        <span class="value">{{ qualityMetrics.bitrate }} kbps</span>
      </div>
      <div class="metric">
        <span class="label">Packet Loss</span>
        <span class="value" :class="{ warning: qualityMetrics.packetLoss > 2 }">
          {{ qualityMetrics.packetLoss.toFixed(1) }}%
        </span>
      </div>
      <div class="metric">
        <span class="label">Jitter</span>
        <span class="value" :class="{ warning: qualityMetrics.jitter > 30 }">
          {{ qualityMetrics.jitter.toFixed(0) }} ms
        </span>
      </div>
      <div class="metric">
        <span class="label">Round Trip</span>
        <span class="value" :class="{ warning: qualityMetrics.roundTripTime > 200 }">
          {{ qualityMetrics.roundTripTime.toFixed(0) }} ms
        </span>
      </div>
    </div>

    <!-- Quality Alert -->
    <div v-if="qualityScore < 40" class="quality-alert">
      Poor call quality detected. Consider:
      <ul>
        <li v-if="qualityMetrics.packetLoss > 2">High packet loss - check network</li>
        <li v-if="qualityMetrics.jitter > 50">High jitter - unstable connection</li>
        <li v-if="qualityMetrics.roundTripTime > 300">High latency - network congestion</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.quality-panel {
  padding: 1rem;
  background: #1e293b;
  border-radius: 8px;
}

.quality-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.quality-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quality-badge.excellent {
  background: #22c55e;
}
.quality-badge.good {
  background: #3b82f6;
}
.quality-badge.fair {
  background: #f59e0b;
}
.quality-badge.poor {
  background: #ef4444;
}
.quality-badge.bad {
  background: #7f1d1d;
}

.quality-meter {
  height: 8px;
  background: #0f172a;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.quality-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.quality-bar.excellent {
  background: #22c55e;
}
.quality-bar.good {
  background: #3b82f6;
}
.quality-bar.fair {
  background: #f59e0b;
}
.quality-bar.poor {
  background: #ef4444;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.metric {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.metric .label {
  color: #94a3b8;
  font-size: 0.875rem;
}

.metric .value {
  font-weight: 500;
}

.metric .value.warning {
  color: #f59e0b;
}

.quality-alert {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 4px;
  font-size: 0.875rem;
}

.quality-alert ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}
</style>
```

## Feature 5: Call Recording

Basic call recording using the MediaRecorder API.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const isRecording = ref(false)
const recordedChunks = ref<Blob[]>([])
const mediaRecorder = ref<MediaRecorder | null>(null)

const canRecord = computed(() => {
  return 'MediaRecorder' in window
})

async function startRecording(stream: MediaStream) {
  if (!canRecord.value) {
    console.error('MediaRecorder not supported')
    return
  }

  recordedChunks.value = []

  const options = { mimeType: 'audio/webm;codecs=opus' }
  mediaRecorder.value = new MediaRecorder(stream, options)

  mediaRecorder.value.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.value.push(event.data)
    }
  }

  mediaRecorder.value.onstop = () => {
    const blob = new Blob(recordedChunks.value, { type: 'audio/webm' })
    downloadRecording(blob)
  }

  mediaRecorder.value.start(1000) // Collect data every second
  isRecording.value = true
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
  }
}

function downloadRecording(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `call-recording-${Date.now()}.webm`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="recording-controls">
    <button v-if="!isRecording" @click="startRecording(localStream)" :disabled="!canRecord">
      Start Recording
    </button>
    <button v-else @click="stopRecording" class="recording">
      <span class="recording-dot"></span>
      Stop Recording
    </button>
  </div>
</template>
```

::: warning Legal Notice
Recording calls may be subject to legal requirements:

- **Two-party consent**: Some jurisdictions require all parties to consent
- **One-party consent**: Only one party needs to consent
- **Business use**: Different rules may apply

Always check local laws and inform callers when recording.
:::

## Putting It All Together

Here's how to integrate these features into your softphone:

```vue
<template>
  <div class="advanced-softphone">
    <!-- Main Softphone UI (from Part 2) -->
    <Softphone @call-connected="handleCallConnected" @call-ended="handleCallEnded" />

    <!-- Advanced Features Panel (shown during calls) -->
    <div v-if="isCallActive" class="features-panel">
      <!-- Tab Navigation -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <TransferPanel v-if="activeTab === 'transfer'" :session="session" />
        <ConferencePanel v-if="activeTab === 'conference'" :client="sipClient" />
        <TranscriptionPanel v-if="activeTab === 'transcription'" />
        <QualityPanel v-if="activeTab === 'quality'" :session="session" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Softphone from './Softphone.vue'
import TransferPanel from './TransferPanel.vue'
import ConferencePanel from './ConferencePanel.vue'
import TranscriptionPanel from './TranscriptionPanel.vue'
import QualityPanel from './QualityPanel.vue'

const isCallActive = ref(false)
const activeTab = ref('quality')

const tabs = [
  { id: 'quality', label: 'Quality' },
  { id: 'transcription', label: 'Transcript' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'conference', label: 'Conference' },
]

function handleCallConnected(session: any) {
  isCallActive.value = true
}

function handleCallEnded() {
  isCallActive.value = false
}
</script>
```

## What You Learned

- **Call Transfers**: Blind and attended transfer implementation
- **Conferencing**: Multi-party call management with participant controls
- **Transcription**: Real-time speech-to-text with keyword detection
- **Quality Monitoring**: WebRTC stats for call quality assessment
- **Recording**: Basic call recording with MediaRecorder

## Next Steps

Congratulations! You've completed the VueSIP tutorial. You now have the knowledge to build production-ready VoIP applications.

### Continue Learning

- [API Reference](/api/) - Complete composable documentation
- [Examples](/examples/) - More code examples
- [Guide](/guide/) - In-depth feature guides

### Real-World Considerations

As you move to production:

1. **Security**: Implement proper authentication, use HTTPS, secure credentials
2. **Error Handling**: Add comprehensive error handling and user feedback
3. **Accessibility**: Ensure your UI is accessible (ARIA labels, keyboard navigation)
4. **Performance**: Optimize for mobile devices and slow networks
5. **Testing**: Write unit tests and E2E tests for critical flows

### Community

- **GitHub**: [VueSIP Repository](https://github.com/ironyh/VueSIP)
- **Issues**: Report bugs or request features
- **Discussions**: Ask questions and share tips

<div style="text-align: center; margin-top: 2rem;">

[Back to Tutorial Overview](/tutorial/)

</div>
