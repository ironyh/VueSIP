import type { ExampleDefinition } from './types'
import RecordingManagementDemo from '../demos/RecordingManagementDemo.vue'

export const recordingManagementExample: ExampleDefinition = {
  id: 'recording-management',
  icon: '🎙️',
  title: 'Recording Management',
  description: 'Advanced call recording controls and management',
  category: 'ami',
  tags: ['Advanced', 'Recording', 'Compliance'],
  component: RecordingManagementDemo,
  setupGuide: `<p>Manage call recordings with start, stop, pause, and resume controls. Access recording metadata and download recordings via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the recording composable for recording management</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Recording Service',
      description: 'Connect to AMI and access recording features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the recording composable via unified service
const recording = amiService.useRecording({
  onRecordingStarted: (session) => {
    console.log('Recording started:', session.id)
  },
  onRecordingStopped: (session) => {
    console.log('Recording stopped:', session.filePath)
  },
  onRecordingError: (error) => {
    console.error('Recording error:', error)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Start Recording',
      description: 'Begin recording a call with options',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const recording = amiService.useRecording()

// Start recording with options
const session = await recording.startRecording({
  channel: 'PJSIP/1001-00000001',
  format: 'wav',
  mixMode: 'both',  // 'both' | 'rx' | 'tx'
  filename: 'call-recording-' + Date.now(),
})

console.log('Recording started:', session.filePath)
console.log('Recording ID:', session.id)

// Start recording with compliance options
const complianceSession = await recording.startRecording({
  channel: 'PJSIP/1002-00000002',
  format: 'wav',
  mixMode: 'both',
  metadata: {
    callerId: '+1234567890',
    agentId: 'agent-001',
    campaign: 'sales-q4',
    complianceRequired: true,
  },
})`,
    },
    {
      title: 'Control Recording',
      description: 'Pause, resume, and stop recordings',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const recording = amiService.useRecording()

// Get active recording session
const session = recording.activeRecordings.value[0]

// Pause recording (for sensitive information)
await recording.pauseRecording(session.id)
console.log('Recording paused - customer sharing credit card info')

// Resume recording
await recording.resumeRecording(session.id)
console.log('Recording resumed')

// Stop recording
await recording.stopRecording(session.id)
console.log('Recording stopped:', session.filePath)

// List all recordings
const recordings = recording.recordings.value
recordings.forEach(rec => {
  console.log('Recording:', rec.filename)
  console.log('  Duration:', rec.duration, 'seconds')
  console.log('  Format:', rec.format)
  console.log('  Size:', rec.fileSize, 'bytes')
})`,
    },
    {
      title: 'Recording Data Model',
      description: 'Data structures for call recordings',
      code: `interface RecordingSession {
  id: string
  channel: string
  filePath: string
  filename: string
  format: 'wav' | 'mp3' | 'gsm' | 'ogg'
  mixMode: 'both' | 'rx' | 'tx'
  status: 'recording' | 'paused' | 'stopped' | 'error'
  startTime: Date
  endTime?: Date
  duration: number  // seconds
  fileSize?: number  // bytes
  metadata?: Record<string, unknown>
}

interface RecordingMetadata {
  callerId: string
  callerName?: string
  calledNumber: string
  agentId?: string
  agentName?: string
  queueName?: string
  campaign?: string
  disposition?: string
  tags?: string[]
  complianceRequired: boolean
  retentionDays?: number
}

interface RecordingSearchParams {
  startDate?: Date
  endDate?: Date
  channel?: string
  agentId?: string
  callerId?: string
  minDuration?: number
  maxDuration?: number
  tags?: string[]
  limit?: number
  offset?: number
}

const activeRecordings = ref<Map<string, RecordingSession>>(new Map())
const recordingHistory = ref<RecordingSession[]>([])`,
    },
    {
      title: 'Automatic Recording Rules',
      description: 'Configure automatic call recording',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const recording = amiService.useRecording()

interface RecordingRule {
  id: string
  name: string
  enabled: boolean
  conditions: RecordingCondition[]
  action: 'record' | 'do-not-record'
  format: 'wav' | 'mp3'
  mixMode: 'both' | 'rx' | 'tx'
  retention: number  // days
}

interface RecordingCondition {
  field: 'queue' | 'agent' | 'caller' | 'direction' | 'time'
  operator: 'equals' | 'contains' | 'starts_with' | 'in_list'
  value: string | string[]
}

// Create recording rules
const rules: RecordingRule[] = [
  {
    id: 'rule-1',
    name: 'Record All Queue Calls',
    enabled: true,
    conditions: [
      { field: 'queue', operator: 'in_list', value: ['sales', 'support'] }
    ],
    action: 'record',
    format: 'wav',
    mixMode: 'both',
    retention: 365,
  },
  {
    id: 'rule-2',
    name: 'Record Training Agents',
    enabled: true,
    conditions: [
      { field: 'agent', operator: 'in_list', value: ['1001', '1002', '1003'] }
    ],
    action: 'record',
    format: 'mp3',
    mixMode: 'both',
    retention: 90,
  },
]

// Apply rules to call
const shouldRecordCall = (callInfo: any): RecordingRule | null => {
  for (const rule of rules.filter(r => r.enabled)) {
    if (matchesConditions(callInfo, rule.conditions)) {
      return rule.action === 'record' ? rule : null
    }
  }
  return null
}`,
    },
    {
      title: 'Recording Search & Playback',
      description: 'Search and play back recorded calls',
      code: `import { getAmiService } from '@/services/AmiService'
import { ref, computed } from 'vue'

const amiService = getAmiService()
const recording = amiService.useRecording()

// Search recordings
const searchRecordings = async (params: RecordingSearchParams) => {
  const results = await recording.search(params)
  return results
}

// Search by date range
const todaysRecordings = await searchRecordings({
  startDate: new Date(new Date().setHours(0, 0, 0, 0)),
  endDate: new Date(),
})

// Search by agent
const agentRecordings = await searchRecordings({
  agentId: 'agent-001',
  startDate: new Date('2024-01-01'),
  limit: 100,
})

// Get recording URL for playback
const getPlaybackUrl = (recordingId: string): string => {
  return recording.getDownloadUrl(recordingId)
}

// Play recording in browser
const playRecording = (recordingId: string) => {
  const url = getPlaybackUrl(recordingId)
  const audio = new Audio(url)
  audio.play()
}

// Download recording
const downloadRecording = async (recordingId: string) => {
  const url = getPlaybackUrl(recordingId)
  const response = await fetch(url)
  const blob = await response.blob()

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = \`recording-\${recordingId}.wav\`
  link.click()
}`,
    },
    {
      title: 'Recording Compliance Features',
      description: 'Compliance and retention management',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const recording = amiService.useRecording()

interface ComplianceSettings {
  defaultRetentionDays: number
  requireAgentConsent: boolean
  requireCallerAnnouncement: boolean
  announcementFile: string
  encryptAtRest: boolean
  encryptionKey?: string
  auditLogEnabled: boolean
  pciCompliant: boolean
  hipaaCompliant: boolean
}

const complianceSettings: ComplianceSettings = {
  defaultRetentionDays: 365,
  requireAgentConsent: false,
  requireCallerAnnouncement: true,
  announcementFile: '/sounds/recording-announcement.wav',
  encryptAtRest: true,
  auditLogEnabled: true,
  pciCompliant: true,
  hipaaCompliant: false,
}

// Check recording consent
const checkConsent = async (channel: string): Promise<boolean> => {
  if (!complianceSettings.requireCallerAnnouncement) {
    return true
  }

  // Play announcement
  await amiService.playAudio(channel, complianceSettings.announcementFile)

  // For full consent, you'd wait for DTMF confirmation
  return true
}

// Apply retention policy
const applyRetentionPolicy = async () => {
  const expiredRecordings = await recording.search({
    endDate: new Date(Date.now() - complianceSettings.defaultRetentionDays * 86400000),
  })

  for (const rec of expiredRecordings) {
    if (!rec.metadata?.retentionOverride) {
      await recording.delete(rec.id)
      console.log('Deleted expired recording:', rec.id)
    }
  }
}

// Audit log entry
const logRecordingAccess = async (
  recordingId: string,
  userId: string,
  action: 'view' | 'download' | 'delete'
) => {
  if (complianceSettings.auditLogEnabled) {
    await recording.logAccess({
      recordingId,
      userId,
      action,
      timestamp: new Date(),
      ipAddress: await getClientIp(),
    })
  }
}`,
    },
    {
      title: 'Recording UI Component',
      description: 'Visual recording management interface',
      code: `<template>
  <div class="recording-panel">
    <!-- Active Recordings -->
    <div class="active-recordings" v-if="activeRecordings.length > 0">
      <h4>🔴 Active Recordings</h4>
      <div
        v-for="rec in activeRecordings"
        :key="rec.id"
        class="recording-item active"
      >
        <div class="recording-info">
          <span class="channel">{{ rec.channel }}</span>
          <span class="duration">{{ formatDuration(rec.duration) }}</span>
          <span class="status" :class="rec.status">{{ rec.status }}</span>
        </div>
        <div class="recording-controls">
          <button
            @click="togglePause(rec.id)"
            :class="{ paused: rec.status === 'paused' }"
          >
            {{ rec.status === 'paused' ? '▶️ Resume' : '⏸️ Pause' }}
          </button>
          <button @click="stopRecording(rec.id)" class="stop">
            ⏹️ Stop
          </button>
        </div>
      </div>
    </div>

    <!-- Recording History -->
    <div class="recording-history">
      <h4>📼 Recording History</h4>
      <div class="search-filters">
        <input type="date" v-model="searchDate" />
        <input type="text" v-model="searchAgent" placeholder="Agent ID" />
        <button @click="searchRecordings">Search</button>
      </div>

      <div class="recordings-list">
        <div
          v-for="rec in recordings"
          :key="rec.id"
          class="recording-item"
        >
          <div class="recording-info">
            <span class="filename">{{ rec.filename }}</span>
            <span class="date">{{ formatDate(rec.startTime) }}</span>
            <span class="duration">{{ formatDuration(rec.duration) }}</span>
          </div>
          <div class="recording-actions">
            <button @click="playRecording(rec.id)">▶️ Play</button>
            <button @click="downloadRecording(rec.id)">⬇️ Download</button>
            <button @click="deleteRecording(rec.id)" class="danger">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const recording = amiService.useRecording()

const activeRecordings = computed(() =>
  Array.from(recording.activeRecordings.value.values())
)
const recordings = computed(() => recording.recordings.value)
</script>`,
    },
  ],
}
