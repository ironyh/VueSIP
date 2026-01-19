<template>
  <div class="conference-gallery-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <h2>Conference Gallery View</h2>
    <p class="description">
      Gallery view with active speaker detection, multiple layout modes, and participant controls.
    </p>

    <!-- Layout Controls -->
    <div class="layout-controls">
      <h3>Layout Mode</h3>
      <div class="layout-buttons">
        <Button
          v-for="mode in layoutModes"
          :key="mode.id"
          :class="['layout-btn', { active: currentLayout === mode.id }]"
          @click="setLayoutMode(mode.id)"
          :severity="currentLayout === mode.id ? 'primary' : 'secondary'"
          outlined
        >
          <span class="layout-icon">{{ mode.icon }}</span>
          <span class="layout-name">{{ mode.name }}</span>
        </Button>
      </div>
    </div>

    <!-- Conference Info Panel -->
    <div class="conference-info">
      <div class="info-row">
        <span class="info-label">Participants:</span>
        <span class="info-value">{{ participants.length }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Active Speaker:</span>
        <span class="info-value">
          {{ activeSpeaker?.displayName || 'None' }}
          <span v-if="isSomeoneSpeaking" class="speaking-indicator"></span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Grid:</span>
        <span class="info-value">{{ gridCols }} x {{ gridRows }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Moderator:</span>
        <span class="info-value">
          <Button
            @click="toggleModerator"
            :label="isModerator ? 'Yes' : 'No'"
            :severity="isModerator ? 'success' : 'secondary'"
            size="small"
            outlined
          />
        </span>
      </div>
    </div>

    <!-- Gallery Container -->
    <div
      ref="galleryContainer"
      class="gallery-container"
      :class="[`layout-${currentLayout}`]"
      :style="currentLayout === 'grid' ? gridStyle : undefined"
    >
      <!-- Speaker Layout: Featured Speaker -->
      <div v-if="currentLayout === 'speaker' && focusedParticipant" class="featured-speaker">
        <ParticipantTile
          :participant="focusedParticipant"
          :is-active-speaker="focusedParticipant.id === activeSpeaker?.id"
          :is-pinned="pinnedParticipantId === focusedParticipant.id"
          :is-moderator="isModerator"
          featured
          @toggle-mute="handleToggleMute"
          @toggle-pin="handleTogglePin"
          @kick="handleKick"
          @volume-change="handleVolumeChange"
        />
      </div>

      <!-- Speaker Layout: Thumbnails -->
      <div v-if="currentLayout === 'speaker'" class="speaker-thumbnails">
        <ParticipantTile
          v-for="p in otherParticipants"
          :key="p.id"
          :participant="p"
          :is-active-speaker="p.id === activeSpeaker?.id"
          :is-pinned="pinnedParticipantId === p.id"
          :is-moderator="isModerator"
          thumbnail
          @toggle-mute="handleToggleMute"
          @toggle-pin="handleTogglePin"
          @kick="handleKick"
          @volume-change="handleVolumeChange"
        />
      </div>

      <!-- Sidebar Layout -->
      <template v-else-if="currentLayout === 'sidebar'">
        <div class="sidebar-main">
          <ParticipantTile
            v-if="focusedParticipant"
            :participant="focusedParticipant"
            :is-active-speaker="focusedParticipant.id === activeSpeaker?.id"
            :is-pinned="pinnedParticipantId === focusedParticipant.id"
            :is-moderator="isModerator"
            featured
            @toggle-mute="handleToggleMute"
            @toggle-pin="handleTogglePin"
            @kick="handleKick"
            @volume-change="handleVolumeChange"
          />
        </div>
        <div class="sidebar-list">
          <ParticipantTile
            v-for="p in otherParticipants"
            :key="p.id"
            :participant="p"
            :is-active-speaker="p.id === activeSpeaker?.id"
            :is-pinned="pinnedParticipantId === p.id"
            :is-moderator="isModerator"
            sidebar
            @toggle-mute="handleToggleMute"
            @toggle-pin="handleTogglePin"
            @kick="handleKick"
            @volume-change="handleVolumeChange"
          />
        </div>
      </template>

      <!-- Grid Layout (default) -->
      <template v-else>
        <ParticipantTile
          v-for="p in participants"
          :key="p.id"
          :participant="p"
          :is-active-speaker="p.id === activeSpeaker?.id"
          :is-pinned="pinnedParticipantId === p.id"
          :is-moderator="isModerator"
          @toggle-mute="handleToggleMute"
          @toggle-pin="handleTogglePin"
          @kick="handleKick"
          @volume-change="handleVolumeChange"
        />
      </template>
    </div>

    <!-- Speaker History -->
    <div v-if="speakerHistory.length > 0" class="speaker-history">
      <h4>Recent Speakers</h4>
      <div class="history-list">
        <div
          v-for="(entry, index) in speakerHistory.slice(-5).reverse()"
          :key="index"
          class="history-entry"
        >
          <span class="history-name">{{ entry.displayName }}</span>
          <span class="history-peak">Peak: {{ Math.round(entry.peakLevel * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- Simulation Actions -->
    <div v-if="isSimulationMode" class="simulation-actions">
      <h3>Simulation Actions</h3>
      <div class="action-buttons">
        <button @click="addParticipant" :disabled="participants.length >= 12">
          Add Participant
        </button>
        <button @click="removeRandomParticipant" :disabled="participants.length <= 1">
          Remove Participant
        </button>
        <button @click="simulateSpeaking">Simulate Speaking</button>
        <button @click="clearAllParticipants" :disabled="participants.length === 0">
          Clear All
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Conference Gallery Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for layout mode buttons and toggle buttons with appropriate severity
 * - Layout buttons remain custom styled to maintain the visual design pattern
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { useActiveSpeaker, useGalleryLayout } from '../../src'
import { ParticipantState, type Participant } from '../../src/types/conference.types'
import type { GalleryLayoutMode } from '../../src/types/gallery-layout.types'
import ParticipantTile from '../components/ParticipantTile.vue'
import { Button } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Conference state
const participants = ref<Participant[]>([])
const isModerator = ref(true)

// Layout modes
const layoutModes = [
  { id: 'grid', name: 'Grid', icon: '⊞' },
  { id: 'speaker', name: 'Speaker', icon: '🎤' },
  { id: 'sidebar', name: 'Sidebar', icon: '◧' },
] as const

const currentLayout = ref<GalleryLayoutMode>('grid')

// Active speaker detection
const { activeSpeaker, isSomeoneSpeaking, speakerHistory } = useActiveSpeaker(participants, {
  threshold: 0.15,
  debounceMs: 300,
  historySize: 10,
  excludeMuted: true,
  onSpeakerChange: (newSpeaker, _previousSpeaker) => {
    if (newSpeaker) {
      console.log('Speaker changed to:', newSpeaker.displayName)
    }
  },
})

// Gallery layout
const participantCount = computed(() => participants.value.length)
const {
  gridCols,
  gridRows,
  gridStyle,
  focusedParticipantId,
  pinnedParticipantId,
  setLayout,
  pinParticipant,
  unpinParticipant,
} = useGalleryLayout(participantCount, {
  gap: 8,
  maxCols: 4,
  maxRows: 4,
  activeSpeakerId: computed(() => activeSpeaker.value?.id ?? null),
})

// Computed: focused participant for speaker/sidebar layouts
const focusedParticipant = computed(() => {
  const id = focusedParticipantId.value
  if (!id) {
    return participants.value[0] ?? null
  }
  return participants.value.find((p) => p.id === id) ?? participants.value[0] ?? null
})

// Computed: other participants (not focused)
const otherParticipants = computed(() => {
  const focusedId = focusedParticipant.value?.id
  return participants.value.filter((p) => p.id !== focusedId)
})

// Layout mode change
const setLayoutMode = (mode: GalleryLayoutMode) => {
  currentLayout.value = mode
  setLayout(mode)
}

// Toggle moderator status
const toggleModerator = () => {
  isModerator.value = !isModerator.value
}

// Participant control handlers
const handleToggleMute = (participant: Participant) => {
  const p = participants.value.find((x) => x.id === participant.id)
  if (p) {
    p.isMuted = !p.isMuted
    console.log(`${p.displayName} is now ${p.isMuted ? 'muted' : 'unmuted'}`)
  }
}

const handleTogglePin = (participant: Participant) => {
  if (pinnedParticipantId.value === participant.id) {
    unpinParticipant()
    console.log(`Unpinned ${participant.displayName}`)
  } else {
    pinParticipant(participant.id)
    console.log(`Pinned ${participant.displayName}`)
  }
}

const handleKick = (participant: Participant) => {
  const index = participants.value.findIndex((p) => p.id === participant.id)
  if (index !== -1) {
    const removed = participants.value.splice(index, 1)[0]
    console.log(`Kicked ${removed?.displayName}`)
  }
}

const handleVolumeChange = (participant: Participant, volume: number) => {
  console.log(`Volume for ${participant.displayName} set to ${Math.round(volume * 100)}%`)
}

// Simulation helpers
const participantNames = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Kate',
  'Leo',
]

let participantIdCounter = 0

const createMockParticipant = (name?: string): Participant => {
  const id = `participant-${++participantIdCounter}`
  const displayName = name || participantNames[participants.value.length % participantNames.length]
  return {
    id,
    uri: `sip:${displayName?.toLowerCase()}@example.com`,
    displayName,
    state: ParticipantState.Connected,
    isMuted: false,
    isOnHold: false,
    isModerator: false,
    isSelf: participants.value.length === 0,
    audioLevel: 0,
    joinedAt: new Date(),
  }
}

const addParticipant = () => {
  if (participants.value.length >= 12) return
  const newParticipant = createMockParticipant()
  participants.value.push(newParticipant)
  console.log(`Added participant: ${newParticipant.displayName}`)
}

const removeRandomParticipant = () => {
  if (participants.value.length <= 1) return
  // Don't remove self (first participant)
  const nonSelfParticipants = participants.value.filter((p) => !p.isSelf)
  if (nonSelfParticipants.length === 0) return
  const randomIndex = Math.floor(Math.random() * nonSelfParticipants.length)
  const toRemove = nonSelfParticipants[randomIndex]
  if (!toRemove) return
  const index = participants.value.findIndex((p) => p.id === toRemove.id)
  if (index !== -1) {
    participants.value.splice(index, 1)
    console.log(`Removed participant: ${toRemove.displayName}`)
  }
}

const clearAllParticipants = () => {
  participants.value = []
  console.log('Cleared all participants')
}

// Simulate speaking activity
let speakingInterval: ReturnType<typeof setInterval> | null = null

const simulateSpeaking = () => {
  // Randomly make someone speak for a few seconds
  const availableParticipants = participants.value.filter((p) => !p.isMuted)
  if (availableParticipants.length === 0) return

  const speaker = availableParticipants[Math.floor(Math.random() * availableParticipants.length)]
  if (!speaker) return

  console.log(`${speaker.displayName} is speaking...`)

  // Simulate audio levels for 3 seconds
  let ticks = 0
  const interval = setInterval(() => {
    ticks++
    if (ticks > 15) {
      clearInterval(interval)
      speaker.audioLevel = 0
      return
    }
    // Random audio level between 0.2 and 0.8
    speaker.audioLevel = Math.random() * 0.6 + 0.2
  }, 200)
}

// Start background audio simulation
const startAudioSimulation = () => {
  speakingInterval = setInterval(() => {
    if (!isSimulationMode.value) return
    if (participants.value.length === 0) return

    // Randomly update audio levels
    participants.value.forEach((p) => {
      if (p.isMuted) {
        p.audioLevel = 0
      } else {
        // Most of the time, low audio level
        // Occasionally, higher level to simulate speaking
        const isSpeaking = Math.random() < 0.1
        p.audioLevel = isSpeaking ? Math.random() * 0.5 + 0.3 : Math.random() * 0.1
      }
    })
  }, 200)
}

const stopAudioSimulation = () => {
  if (speakingInterval) {
    clearInterval(speakingInterval)
    speakingInterval = null
  }
}

// Initialize with some participants when simulation mode is enabled
onMounted(() => {
  // Start with 4 participants in simulation mode
  for (let i = 0; i < 4; i++) {
    addParticipant()
  }
  startAudioSimulation()
})

onUnmounted(() => {
  stopAudioSimulation()
})
</script>

<style scoped>
.conference-gallery-demo {
  max-width: 1200px;
  margin: 0 auto;
}

.description {
  color: var(--text-secondary, #666);
  margin-bottom: 1.5rem;
}

.layout-controls {
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.layout-controls h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.layout-buttons {
  display: flex;
  gap: 0.5rem;
}

.layout-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-primary, white);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.layout-btn:hover {
  border-color: var(--primary, #667eea);
}

.layout-btn.active {
  background: var(--primary, #667eea);
  border-color: var(--primary, #667eea);
  color: white;
}

.layout-icon {
  font-size: 1.125rem;
}

.layout-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.conference-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.speaking-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success, #10b981);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.toggle-moderator {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-moderator:hover {
  background: var(--bg-secondary, #f9fafb);
}

.gallery-container {
  background: var(--bg-tertiary, #1a1a1a);
  border-radius: 12px;
  padding: 1rem;
  min-height: 400px;
  margin-bottom: 1rem;
}

/* Grid Layout */
.gallery-container.layout-grid {
  display: grid;
  gap: 8px;
}

/* Speaker Layout */
.gallery-container.layout-speaker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.featured-speaker {
  flex: 1;
  min-height: 300px;
}

.speaker-thumbnails {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.speaker-thumbnails > :deep(.participant-tile) {
  flex: 0 0 150px;
  height: 100px;
}

/* Sidebar Layout */
.gallery-container.layout-sidebar {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 0.5rem;
}

.sidebar-main {
  min-height: 300px;
}

.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  max-height: 400px;
}

.speaker-history {
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.speaker-history h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 20px;
  font-size: 0.75rem;
}

.history-name {
  font-weight: 500;
}

.history-peak {
  color: var(--text-secondary, #666);
}

.simulation-actions {
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
}

.simulation-actions h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.action-buttons button {
  padding: 0.5rem 1rem;
  background: var(--primary, #667eea);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-buttons button:hover:not(:disabled) {
  background: var(--primary-hover, #5568d3);
}

.action-buttons button:disabled {
  background: var(--text-muted, #6b7280);
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .conference-info {
    grid-template-columns: repeat(2, 1fr);
  }

  .gallery-container.layout-sidebar {
    grid-template-columns: 1fr;
  }

  .sidebar-list {
    flex-direction: row;
    overflow-x: auto;
    max-height: none;
  }

  .sidebar-list > :deep(.participant-tile) {
    flex: 0 0 150px;
  }
}
</style>
