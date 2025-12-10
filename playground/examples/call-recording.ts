import type { ExampleDefinition } from './types'
import CallRecordingDemo from '../demos/CallRecordingDemo.vue'

export const callRecordingExample: ExampleDefinition = {
  id: 'call-recording',
  icon: '📹',
  title: 'Call Recording',
  description: 'Record and playback call audio',
  category: 'sip',
  tags: ['Advanced', 'Recording', 'Media'],
  component: CallRecordingDemo,
  setupGuide: '<p>Record call audio using the MediaRecorder API. Save recordings to disk or play them back later. Recordings are stored temporarily in memory.</p>',
  codeSnippets: [
    {
      title: 'Recording Setup',
      description: 'Start recording call audio',
      code: `import { ref } from 'vue'
import { useCallSession } from 'vuesip'

const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedChunks = ref<Blob[]>([])

const { session } = useCallSession(sipClient)

const startRecording = async () => {
  if (!session.value?.remoteStream) return

  const stream = session.value.remoteStream
  mediaRecorder.value = new MediaRecorder(stream, {
    mimeType: 'audio/webm'
  })

  recordedChunks.value = []

  mediaRecorder.value.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.value.push(event.data)
    }
  }

  mediaRecorder.value.start()
}

const stopRecording = () => {
  if (mediaRecorder.value) {
    mediaRecorder.value.stop()

    // Create blob from chunks
    const blob = new Blob(recordedChunks.value, {
      type: 'audio/webm'
    })

    // Download or save
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recording.webm'
    a.click()
  }
}`,
    },
    {
      title: 'Record Both Sides',
      description: 'Capture local and remote audio together',
      code: `// Mix local and remote streams for full recording
const createMixedStream = async (): Promise<MediaStream> => {
  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()

  // Add remote audio
  if (session.value?.remoteStream) {
    const remoteSource = audioContext.createMediaStreamSource(session.value.remoteStream)
    remoteSource.connect(destination)
  }

  // Add local audio
  if (session.value?.localStream) {
    const localSource = audioContext.createMediaStreamSource(session.value.localStream)
    localSource.connect(destination)
  }

  return destination.stream
}

// Start mixed recording
const startMixedRecording = async () => {
  const mixedStream = await createMixedStream()

  mediaRecorder.value = new MediaRecorder(mixedStream, {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 128000,
  })

  recordedChunks.value = []

  mediaRecorder.value.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.value.push(event.data)
    }
  }

  // Record in chunks for safety
  mediaRecorder.value.start(1000) // Collect data every second

  recordingState.value = 'recording'
  recordingStartTime.value = new Date()
}`,
    },
    {
      title: 'Recording State Management',
      description: 'Track recording progress and status',
      code: `type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'

const recordingState = ref<RecordingState>('idle')
const recordingStartTime = ref<Date | null>(null)
const recordingDuration = ref(0)
let durationInterval: ReturnType<typeof setInterval> | null = null

// Update duration every second
const startDurationTimer = () => {
  durationInterval = setInterval(() => {
    if (recordingStartTime.value && recordingState.value === 'recording') {
      recordingDuration.value = Math.floor(
        (Date.now() - recordingStartTime.value.getTime()) / 1000
      )
    }
  }, 1000)
}

// Pause recording
const pauseRecording = () => {
  if (mediaRecorder.value && recordingState.value === 'recording') {
    mediaRecorder.value.pause()
    recordingState.value = 'paused'
  }
}

// Resume recording
const resumeRecording = () => {
  if (mediaRecorder.value && recordingState.value === 'paused') {
    mediaRecorder.value.resume()
    recordingState.value = 'recording'
  }
}

// Stop and finalize
const stopRecording = (): Promise<Blob> => {
  return new Promise((resolve) => {
    if (!mediaRecorder.value) {
      resolve(new Blob())
      return
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(recordedChunks.value, { type: 'audio/webm' })
      recordingState.value = 'stopped'

      if (durationInterval) {
        clearInterval(durationInterval)
        durationInterval = null
      }

      resolve(blob)
    }

    mediaRecorder.value.stop()
  })
}`,
    },
    {
      title: 'Recording Metadata',
      description: 'Store information about recordings',
      code: `interface RecordingMetadata {
  id: string
  filename: string
  callId: string
  remoteParty: string
  remoteName?: string
  startTime: Date
  endTime: Date
  duration: number          // seconds
  fileSize: number          // bytes
  format: 'webm' | 'mp3' | 'wav'
  channels: number
  sampleRate: number
  notes?: string
  tags?: string[]
}

const recordings = ref<RecordingMetadata[]>([])

// Create recording metadata
const createRecordingMetadata = (
  blob: Blob,
  callInfo: { callId: string; remoteUri: string; remoteName?: string }
): RecordingMetadata => {
  const now = new Date()
  const startTime = recordingStartTime.value || now

  return {
    id: \`rec-\${Date.now()}\`,
    filename: \`recording-\${callInfo.callId}-\${now.getTime()}.webm\`,
    callId: callInfo.callId,
    remoteParty: callInfo.remoteUri,
    remoteName: callInfo.remoteName,
    startTime,
    endTime: now,
    duration: recordingDuration.value,
    fileSize: blob.size,
    format: 'webm',
    channels: 2,
    sampleRate: 48000,
  }
}

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}`,
    },
    {
      title: 'Storage and Playback',
      description: 'Save recordings and play them back',
      code: `// IndexedDB storage for recordings
const DB_NAME = 'vuesip-recordings'
const STORE_NAME = 'recordings'

const saveRecording = async (blob: Blob, metadata: RecordingMetadata): Promise<void> => {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const record = {
      ...metadata,
      data: blob,
    }

    const request = store.put(record)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Load recording for playback
const loadRecording = async (id: string): Promise<{ blob: Blob; metadata: RecordingMetadata } | null> => {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      if (request.result) {
        const { data, ...metadata } = request.result
        resolve({ blob: data, metadata })
      } else {
        resolve(null)
      }
    }
  })
}

// Playback
const playbackAudio = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const playbackProgress = ref(0)

const playRecording = async (id: string) => {
  const recording = await loadRecording(id)
  if (!recording) return

  const url = URL.createObjectURL(recording.blob)

  if (playbackAudio.value) {
    playbackAudio.value.pause()
  }

  playbackAudio.value = new Audio(url)
  playbackAudio.value.ontimeupdate = () => {
    playbackProgress.value = (playbackAudio.value!.currentTime / playbackAudio.value!.duration) * 100
  }
  playbackAudio.value.onended = () => {
    isPlaying.value = false
    playbackProgress.value = 0
    URL.revokeObjectURL(url)
  }

  await playbackAudio.value.play()
  isPlaying.value = true
}`,
    },
    {
      title: 'Recording List UI',
      description: 'Display and manage recordings',
      code: `<template>
  <div class="recordings-panel">
    <div class="recording-controls" v-if="callState === 'answered'">
      <button
        v-if="recordingState === 'idle'"
        @click="startMixedRecording"
        class="record-btn"
      >
        ⏺️ Start Recording
      </button>

      <template v-else>
        <span class="recording-indicator" :class="recordingState">
          <span class="dot"></span>
          {{ recordingState === 'recording' ? 'Recording' : 'Paused' }}
          {{ formatDuration(recordingDuration) }}
        </span>

        <button v-if="recordingState === 'recording'" @click="pauseRecording">
          ⏸️ Pause
        </button>
        <button v-if="recordingState === 'paused'" @click="resumeRecording">
          ▶️ Resume
        </button>
        <button @click="stopAndSaveRecording">
          ⏹️ Stop
        </button>
      </template>
    </div>

    <div class="recordings-list">
      <h4>Saved Recordings</h4>

      <div
        v-for="recording in recordings"
        :key="recording.id"
        class="recording-item"
      >
        <div class="info">
          <span class="name">{{ recording.remoteName || recording.remoteParty }}</span>
          <span class="date">{{ formatDate(recording.startTime) }}</span>
          <span class="duration">{{ formatDuration(recording.duration) }}</span>
          <span class="size">{{ formatFileSize(recording.fileSize) }}</span>
        </div>

        <div class="actions">
          <button @click="playRecording(recording.id)">
            {{ isPlaying && currentPlaybackId === recording.id ? '⏸️' : '▶️' }}
          </button>
          <button @click="downloadRecording(recording.id)">💾</button>
          <button @click="deleteRecording(recording.id)">🗑️</button>
        </div>

        <div v-if="currentPlaybackId === recording.id" class="playback-bar">
          <div class="progress" :style="{ width: playbackProgress + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Auto-Recording',
      description: 'Automatically record all calls',
      code: `const autoRecordEnabled = ref(false)
const autoRecordInbound = ref(true)
const autoRecordOutbound = ref(true)

// Watch for call state changes
watch(callState, async (newState, oldState) => {
  if (!autoRecordEnabled.value) return

  // Start recording when call is answered
  if (newState === 'answered' && oldState !== 'answered') {
    const direction = callDirection.value

    if (
      (direction === 'inbound' && autoRecordInbound.value) ||
      (direction === 'outbound' && autoRecordOutbound.value)
    ) {
      await startMixedRecording()
      showNotification('Recording started automatically')
    }
  }

  // Stop recording when call ends
  if (newState === 'ended' && recordingState.value === 'recording') {
    await stopAndSaveRecording()
  }
})

// Settings persistence
const saveAutoRecordSettings = () => {
  localStorage.setItem('auto-record', JSON.stringify({
    enabled: autoRecordEnabled.value,
    inbound: autoRecordInbound.value,
    outbound: autoRecordOutbound.value,
  }))
}

const loadAutoRecordSettings = () => {
  const saved = localStorage.getItem('auto-record')
  if (saved) {
    const settings = JSON.parse(saved)
    autoRecordEnabled.value = settings.enabled
    autoRecordInbound.value = settings.inbound
    autoRecordOutbound.value = settings.outbound
  }
}`,
    },
    {
      title: 'Legal Compliance',
      description: 'Recording consent and notifications',
      code: `// Recording notification types
type ConsentMode = 'none' | 'beep' | 'announcement' | 'ask'

const consentMode = ref<ConsentMode>('beep')
const recordingAnnouncement = ref('This call may be recorded for quality assurance.')

// Play recording notification
const playRecordingNotification = async () => {
  switch (consentMode.value) {
    case 'beep':
      // Play periodic beep
      await playBeep()
      // Continue beeping every 15 seconds
      beepInterval = setInterval(playBeep, 15000)
      break

    case 'announcement':
      // Play voice announcement
      const audio = new Audio('/audio/recording-notice.mp3')
      await audio.play()
      break

    case 'ask':
      // Show consent dialog before recording
      const consent = await showConsentDialog()
      if (!consent) {
        return false
      }
      break
  }

  return true
}

// Beep generator
const playBeep = async () => {
  const audioContext = new AudioContext()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = 1400
  gainNode.gain.value = 0.1

  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.2)
}

// Start recording with consent check
const startRecordingWithConsent = async () => {
  const canRecord = await playRecordingNotification()
  if (!canRecord) {
    showNotification('Recording cancelled - no consent')
    return
  }

  await startMixedRecording()
}`,
    },
  ],
}
