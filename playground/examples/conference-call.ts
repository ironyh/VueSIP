import type { ExampleDefinition } from './types'
import ConferenceCallDemo from '../demos/ConferenceCallDemo.vue'

export const conferenceCallExample: ExampleDefinition = {
  id: 'conference-call',
  icon: '👥',
  title: 'Conference Call',
  description: 'Manage multiple simultaneous calls',
  category: 'sip',
  tags: ['Advanced', 'Multi-party', 'Complex'],
  component: ConferenceCallDemo,
  setupGuide: '<p>Manage conference calls with multiple participants. Hold, mute, and control individual participants. Merge calls together.</p>',
  codeSnippets: [
    {
      title: 'Managing Multiple Calls',
      description: 'Handle multiple simultaneous calls',
      code: `import { ref } from 'vue'
import { useSipClient } from 'vuesip'

const activeCalls = ref<Call[]>([])

const { makeCall, sessions } = useSipClient()

// Add participant to conference
const addParticipant = async (uri: string) => {
  const callId = await makeCall(uri)

  activeCalls.value.push({
    id: callId,
    uri,
    state: 'connecting'
  })
}

// Hold/Resume specific call
const toggleCallHold = async (callId: string) => {
  const call = sessions.value.get(callId)
  if (!call) return

  if (call.isOnHold) {
    await call.unhold()
  } else {
    await call.hold()
  }
}

// Mute specific call
const muteCall = async (callId: string) => {
  const call = sessions.value.get(callId)
  await call?.mute()
}

// End specific call
const endCall = async (callId: string) => {
  const call = sessions.value.get(callId)
  await call?.hangup()

  const index = activeCalls.value.findIndex(c => c.id === callId)
  if (index !== -1) {
    activeCalls.value.splice(index, 1)
  }
}`,
    },
    {
      title: 'Conference Participant Model',
      description: 'Structure for tracking conference participants',
      code: `interface ConferenceParticipant {
  id: string               // Call ID
  uri: string              // SIP URI
  displayName: string      // Display name
  state: ParticipantState  // Connection state
  isHost: boolean          // Is conference host
  isMuted: boolean         // Audio muted
  isOnHold: boolean        // On hold
  isSpeaking: boolean      // Currently speaking (VAD)
  joinedAt: Date           // When they joined
  audioLevel?: number      // Current audio level 0-100
}

type ParticipantState =
  | 'connecting'    // Dialing participant
  | 'ringing'       // Participant's phone ringing
  | 'connected'     // In the conference
  | 'on-hold'       // On hold
  | 'disconnected'  // Left/dropped

// Conference state
interface Conference {
  id: string
  participants: ConferenceParticipant[]
  startedAt: Date
  isRecording: boolean
  maxParticipants: number
}`,
    },
    {
      title: 'Create and Manage Conference',
      description: 'Full conference lifecycle management',
      code: `import { ref, computed } from 'vue'

const conference = ref<Conference | null>(null)
const participants = computed(() => conference.value?.participants || [])

// Start a new conference
const createConference = async () => {
  conference.value = {
    id: generateId(),
    participants: [],
    startedAt: new Date(),
    isRecording: false,
    maxParticipants: 10,
  }
}

// Add participant to conference
const addParticipant = async (uri: string, displayName?: string) => {
  if (!conference.value) return
  if (participants.value.length >= conference.value.maxParticipants) {
    throw new Error('Conference is full')
  }

  const callId = await makeCall(uri)

  conference.value.participants.push({
    id: callId,
    uri,
    displayName: displayName || uri,
    state: 'connecting',
    isHost: participants.value.length === 0,
    isMuted: false,
    isOnHold: false,
    isSpeaking: false,
    joinedAt: new Date(),
  })

  return callId
}

// Remove participant
const removeParticipant = async (participantId: string) => {
  const participant = participants.value.find(p => p.id === participantId)
  if (!participant) return

  await endCall(participantId)

  const index = conference.value!.participants.findIndex(p => p.id === participantId)
  if (index !== -1) {
    conference.value!.participants.splice(index, 1)
  }
}

// End entire conference
const endConference = async () => {
  for (const participant of participants.value) {
    await endCall(participant.id)
  }
  conference.value = null
}`,
    },
    {
      title: 'Conference Controls',
      description: 'Mute, hold, and manage participants',
      code: `// Mute/unmute participant
const toggleParticipantMute = async (participantId: string) => {
  const participant = participants.value.find(p => p.id === participantId)
  if (!participant) return

  const call = sessions.value.get(participantId)
  if (!call) return

  if (participant.isMuted) {
    await call.unmute()
    participant.isMuted = false
  } else {
    await call.mute()
    participant.isMuted = true
  }
}

// Mute all except host
const muteAllParticipants = async () => {
  for (const participant of participants.value) {
    if (!participant.isHost && !participant.isMuted) {
      await toggleParticipantMute(participant.id)
    }
  }
}

// Hold/resume participant
const toggleParticipantHold = async (participantId: string) => {
  const participant = participants.value.find(p => p.id === participantId)
  if (!participant) return

  const call = sessions.value.get(participantId)
  if (!call) return

  if (participant.isOnHold) {
    await call.unhold()
    participant.isOnHold = false
  } else {
    await call.hold()
    participant.isOnHold = true
  }
}

// Transfer host role
const transferHost = (newHostId: string) => {
  participants.value.forEach(p => {
    p.isHost = p.id === newHostId
  })
}`,
    },
    {
      title: 'Conference UI Component',
      description: 'Visual participant management interface',
      code: `<template>
  <div class="conference-panel">
    <div class="conference-header">
      <h3>Conference Call</h3>
      <span class="participant-count">
        {{ participants.length }} participants
      </span>
      <span class="duration">{{ formatDuration(duration) }}</span>
    </div>

    <div class="participants-grid">
      <div
        v-for="participant in participants"
        :key="participant.id"
        class="participant-card"
        :class="{
          speaking: participant.isSpeaking,
          muted: participant.isMuted,
          'on-hold': participant.isOnHold
        }"
      >
        <div class="avatar">
          {{ getInitials(participant.displayName) }}
          <span v-if="participant.isHost" class="host-badge">Host</span>
        </div>

        <div class="name">{{ participant.displayName }}</div>

        <div class="audio-level" v-if="participant.isSpeaking">
          <div
            class="level-bar"
            :style="{ width: participant.audioLevel + '%' }"
          ></div>
        </div>

        <div class="controls">
          <button @click="toggleParticipantMute(participant.id)">
            {{ participant.isMuted ? '🔇' : '🔊' }}
          </button>
          <button @click="toggleParticipantHold(participant.id)">
            {{ participant.isOnHold ? '▶️' : '⏸️' }}
          </button>
          <button @click="removeParticipant(participant.id)">
            ❌
          </button>
        </div>
      </div>
    </div>

    <div class="conference-controls">
      <button @click="muteAllParticipants">Mute All</button>
      <button @click="showAddParticipant = true">Add Participant</button>
      <button @click="endConference" class="danger">End Conference</button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Merge Calls into Conference',
      description: 'Convert multiple calls to a conference',
      code: `// Merge two existing calls into conference
const mergeCallsToConference = async (callId1: string, callId2: string) => {
  // Create new conference
  await createConference()

  // Get call info
  const call1 = sessions.value.get(callId1)
  const call2 = sessions.value.get(callId2)

  if (!call1 || !call2) {
    throw new Error('Both calls must be active')
  }

  // Add both as participants
  conference.value!.participants = [
    {
      id: callId1,
      uri: call1.remoteUri,
      displayName: call1.remoteName || call1.remoteUri,
      state: 'connected',
      isHost: true,
      isMuted: false,
      isOnHold: false,
      isSpeaking: false,
      joinedAt: new Date(),
    },
    {
      id: callId2,
      uri: call2.remoteUri,
      displayName: call2.remoteName || call2.remoteUri,
      state: 'connected',
      isHost: false,
      isMuted: false,
      isOnHold: false,
      isSpeaking: false,
      joinedAt: new Date(),
    },
  ]

  // Resume both calls (they may be on hold)
  await call1.unhold()
  await call2.unhold()

  // Mix audio streams (implementation depends on your media server)
  await mixAudioStreams([callId1, callId2])
}`,
    },
    {
      title: 'Voice Activity Detection',
      description: 'Detect who is speaking in conference',
      code: `import { ref, onMounted, onUnmounted } from 'vue'

// Audio analysis for VAD
const setupVoiceDetection = (participantId: string, audioTrack: MediaStreamTrack) => {
  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  const source = audioContext.createMediaStreamSource(
    new MediaStream([audioTrack])
  )

  source.connect(analyser)
  analyser.fftSize = 256

  const dataArray = new Uint8Array(analyser.frequencyBinCount)

  const checkAudioLevel = () => {
    analyser.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    const level = Math.round((average / 255) * 100)

    // Update participant
    const participant = participants.value.find(p => p.id === participantId)
    if (participant) {
      participant.audioLevel = level
      participant.isSpeaking = level > 15 // Threshold
    }
  }

  const intervalId = setInterval(checkAudioLevel, 100)

  return () => {
    clearInterval(intervalId)
    audioContext.close()
  }
}

// Track active speakers
const activeSpeakers = computed(() =>
  participants.value
    .filter(p => p.isSpeaking)
    .sort((a, b) => (b.audioLevel || 0) - (a.audioLevel || 0))
)`,
    },
    {
      title: 'Conference Recording',
      description: 'Record conference audio',
      code: `import { ref } from 'vue'

const isRecording = ref(false)
const recordedChunks = ref<Blob[]>([])
let mediaRecorder: MediaRecorder | null = null

// Start recording conference audio
const startRecording = async () => {
  // Get mixed audio stream from all participants
  const mixedStream = await getMixedAudioStream()

  mediaRecorder = new MediaRecorder(mixedStream, {
    mimeType: 'audio/webm;codecs=opus'
  })

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.value.push(event.data)
    }
  }

  mediaRecorder.start(1000) // Collect data every second
  isRecording.value = true
  conference.value!.isRecording = true
}

// Stop and save recording
const stopRecording = async () => {
  if (!mediaRecorder) return

  return new Promise<Blob>((resolve) => {
    mediaRecorder!.onstop = () => {
      const blob = new Blob(recordedChunks.value, { type: 'audio/webm' })
      recordedChunks.value = []
      resolve(blob)
    }

    mediaRecorder!.stop()
    isRecording.value = false
    conference.value!.isRecording = false
  })
}

// Download recording
const downloadRecording = async () => {
  const blob = await stopRecording()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = \`conference-\${Date.now()}.webm\`
  a.click()
  URL.revokeObjectURL(url)
}`,
    },
  ],
}
