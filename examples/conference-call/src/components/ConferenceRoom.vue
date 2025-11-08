<template>
  <div class="conference-room" role="main" aria-labelledby="conference-title">
    <!-- ARIA Live Regions for Screen Reader Announcements -->
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ participantAnnouncement }}
    </div>

    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ speakingAnnouncement }}
    </div>

    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ muteAnnouncement }}
    </div>

    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      class="sr-only"
    >
      {{ conferenceStatusAnnouncement }}
    </div>

    <!-- Conference Header -->
    <div class="card conference-header">
      <div class="header-content">
        <div class="conference-title">
          <h2 id="conference-title">Conference Room</h2>
          <span
            v-if="isActive"
            class="status-badge status-connected"
            role="status"
            aria-label="Conference status: active"
          >
            Active
          </span>
          <span
            v-else
            class="status-badge status-disconnected"
            role="status"
            aria-label="Conference status: idle"
          >
            Idle
          </span>
        </div>

        <div
          v-if="isActive"
          class="participant-count"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ participantCount }} {{ participantCount === 1 ? 'Participant' : 'Participants' }}
        </div>
      </div>

      <!-- Conference Controls -->
      <div
        id="conference-controls"
        class="conference-controls"
        role="toolbar"
        aria-label="Conference controls"
      >
        <button
          v-if="!isActive"
          @click="handleCreateConference"
          class="primary"
          :disabled="creatingConference"
          :aria-label="creatingConference ? 'Creating conference, please wait' : 'Create conference'"
        >
          {{ creatingConference ? 'Creating...' : 'Create Conference' }}
        </button>

        <template v-else>
          <button
            @click="handleToggleLock"
            class="primary"
            :aria-pressed="isLocked"
            :aria-label="isLocked ? 'Unlock conference to allow new participants' : 'Lock conference to prevent new participants'"
          >
            <span aria-hidden="true">{{ isLocked ? '🔒' : '🔓' }}</span>
            {{ isLocked ? 'Unlock Conference' : 'Lock Conference' }}
          </button>

          <button
            @click="handleToggleRecording"
            :class="isRecording ? 'danger' : 'success'"
            :aria-pressed="isRecording"
            :aria-label="isRecording ? 'Stop recording conference' : 'Start recording conference'"
          >
            <span aria-hidden="true">{{ isRecording ? '⏹' : '⏺' }}</span>
            {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
          </button>

          <button
            @click="handleMuteAll"
            class="primary"
            aria-label="Mute all participants in the conference"
          >
            <span aria-hidden="true">🔇</span>
            Mute All Participants
          </button>

          <button
            @click="handleEndConference"
            class="danger"
            aria-label="End conference for all participants"
          >
            End Conference
          </button>
        </template>
      </div>
    </div>

    <!-- Add Participant Form (only shown when conference is active) -->
    <AddParticipantForm
      v-if="isActive"
      :is-locked="isLocked"
      :is-full="participantCount >= maxParticipants"
      :max-participants="maxParticipants"
      @add-participant="handleAddParticipant"
    />

    <!-- Participant List -->
    <ParticipantList
      id="participant-list"
      v-if="isActive"
      :participants="participants"
      :local-participant-id="localParticipant?.id"
      @mute-participant="handleMuteParticipant"
      @unmute-participant="handleUnmuteParticipant"
      @remove-participant="handleRemoveParticipant"
    />

    <!-- Conference Events Log -->
    <div v-if="eventLog.length > 0" class="card events-log" role="log" aria-label="Conference event log">
      <h3>Conference Events</h3>
      <div class="events-list" aria-live="polite">
        <div
          v-for="(event, index) in eventLog"
          :key="index"
          class="event-item"
        >
          <span class="event-time">{{ formatTime(event.timestamp) }}</span>
          <span class="event-message">{{ event.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { SipClient } from 'vuesip'
import { useConference } from 'vuesip'
import type { ConferenceEvent, ParticipantUpdatedEvent } from 'vuesip'
import ParticipantList from './ParticipantList.vue'
import AddParticipantForm from './AddParticipantForm.vue'

/**
 * Conference Room Component
 *
 * Main conference interface that demonstrates all conference functionality:
 * - Creating and managing conferences
 * - Adding/removing participants
 * - Muting/unmuting controls
 * - Locking and recording
 * - Event logging
 */

const props = defineProps<{
  sipClient: SipClient | null
}>()

// Conference composable
const sipClientRef = computed(() => props.sipClient)
const {
  conference,
  state,
  participants,
  localParticipant,
  participantCount,
  isActive,
  isLocked,
  isRecording,
  createConference,
  addParticipant,
  removeParticipant,
  muteParticipant,
  unmuteParticipant,
  endConference,
  lockConference,
  unlockConference,
  startRecording,
  stopRecording,
  onConferenceEvent,
} = useConference(sipClientRef as Ref<SipClient | null>)

// Local state
const creatingConference = ref(false)
const maxParticipants = computed(() => conference.value?.maxParticipants || 10)

// Event log for demonstration
interface EventLogItem {
  timestamp: Date
  message: string
}
const eventLog = ref<EventLogItem[]>([])

// ARIA Live Region Announcements
const participantAnnouncement = ref('')
const speakingAnnouncement = ref('')
const muteAnnouncement = ref('')
const conferenceStatusAnnouncement = ref('')

// Track speaking participants to avoid duplicate announcements
const currentSpeaker = ref<string | null>(null)
const speakingTimeout = ref<number | null>(null)

/**
 * Announce participant events
 */
const announceParticipant = (message: string) => {
  participantAnnouncement.value = message
  setTimeout(() => {
    participantAnnouncement.value = ''
  }, 3000)
}

/**
 * Announce speaking status
 */
const announceSpeaking = (participantName: string, isSpeaking: boolean) => {
  if (isSpeaking) {
    // Clear any existing timeout
    if (speakingTimeout.value) {
      clearTimeout(speakingTimeout.value)
    }

    // Only announce if it's a different speaker
    if (currentSpeaker.value !== participantName) {
      currentSpeaker.value = participantName
      speakingAnnouncement.value = `${participantName} is speaking`

      // Clear after 2 seconds
      speakingTimeout.value = window.setTimeout(() => {
        speakingAnnouncement.value = ''
      }, 2000)
    }
  } else {
    if (currentSpeaker.value === participantName) {
      currentSpeaker.value = null
    }
  }
}

/**
 * Announce mute status changes
 */
const announceMute = (participantName: string, isMuted: boolean) => {
  muteAnnouncement.value = `${participantName} ${isMuted ? 'muted' : 'unmuted'}`
  setTimeout(() => {
    muteAnnouncement.value = ''
  }, 3000)
}

/**
 * Announce conference status changes
 */
const announceConferenceStatus = (message: string) => {
  conferenceStatusAnnouncement.value = message
  setTimeout(() => {
    conferenceStatusAnnouncement.value = ''
  }, 4000)
}

/**
 * Create a new conference
 */
const handleCreateConference = async () => {
  try {
    creatingConference.value = true
    const conferenceId = await createConference({
      maxParticipants: 10,
      locked: false,
    })

    addEventLog(`Conference created: ${conferenceId}`)
    console.log('Conference created:', conferenceId)
  } catch (error) {
    console.error('Failed to create conference:', error)
    alert(`Failed to create conference: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    creatingConference.value = false
  }
}

/**
 * Add a participant to the conference
 */
const handleAddParticipant = async (uri: string, displayName: string) => {
  try {
    const participantId = await addParticipant(uri, displayName)
    addEventLog(`Participant added: ${displayName || uri}`)
    console.log('Participant added:', participantId)
  } catch (error) {
    console.error('Failed to add participant:', error)
    alert(`Failed to add participant: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Remove a participant from the conference
 */
const handleRemoveParticipant = async (participantId: string) => {
  try {
    await removeParticipant(participantId)
    addEventLog(`Participant removed`)
  } catch (error) {
    console.error('Failed to remove participant:', error)
    alert(`Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Mute a participant
 */
const handleMuteParticipant = async (participantId: string) => {
  try {
    await muteParticipant(participantId)
  } catch (error) {
    console.error('Failed to mute participant:', error)
    alert(`Failed to mute participant: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Unmute a participant
 */
const handleUnmuteParticipant = async (participantId: string) => {
  try {
    await unmuteParticipant(participantId)
  } catch (error) {
    console.error('Failed to unmute participant:', error)
    alert(`Failed to unmute participant: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Mute all participants in the conference
 */
const handleMuteAll = async () => {
  try {
    // Mute all participants except local
    const mutePromises = participants.value
      .filter(p => !p.isSelf && !p.isMuted)
      .map(p => muteParticipant(p.id))

    await Promise.all(mutePromises)
    addEventLog('All participants muted')
  } catch (error) {
    console.error('Failed to mute all participants:', error)
    alert(`Failed to mute all: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * End the conference
 */
const handleEndConference = async () => {
  if (!confirm('Are you sure you want to end the conference for all participants?')) {
    return
  }

  try {
    await endConference()
    addEventLog('Conference ended')
    // Clear event log after a delay
    setTimeout(() => {
      eventLog.value = []
    }, 3000)
  } catch (error) {
    console.error('Failed to end conference:', error)
    alert(`Failed to end conference: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Toggle conference lock state
 */
const handleToggleLock = async () => {
  try {
    if (isLocked.value) {
      await unlockConference()
      addEventLog('Conference unlocked')
      announceConferenceStatus('Conference unlocked. New participants can now join.')
    } else {
      await lockConference()
      addEventLog('Conference locked')
      announceConferenceStatus('Conference locked. No new participants can join.')
    }
  } catch (error) {
    console.error('Failed to toggle lock:', error)
    const errorMsg = `Failed to toggle lock: ${error instanceof Error ? error.message : 'Unknown error'}`
    alert(errorMsg)
    announceConferenceStatus(errorMsg)
  }
}

/**
 * Toggle conference recording
 */
const handleToggleRecording = async () => {
  try {
    if (isRecording.value) {
      await stopRecording()
      addEventLog('Recording stopped')
      announceConferenceStatus('Conference recording stopped')
    } else {
      await startRecording()
      addEventLog('Recording started')
      announceConferenceStatus('Conference recording started')
    }
  } catch (error) {
    console.error('Failed to toggle recording:', error)
    const errorMsg = `Failed to toggle recording: ${error instanceof Error ? error.message : 'Unknown error'}`
    alert(errorMsg)
    announceConferenceStatus(errorMsg)
  }
}

/**
 * Add an event to the log
 */
const addEventLog = (message: string) => {
  eventLog.value.unshift({
    timestamp: new Date(),
    message,
  })

  // Keep only last 20 events
  if (eventLog.value.length > 20) {
    eventLog.value = eventLog.value.slice(0, 20)
  }
}

/**
 * Format time for event log
 */
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}

/**
 * Listen to conference events
 */
let unsubscribeConferenceEvents: (() => void) | null = null

onMounted(() => {
  unsubscribeConferenceEvents = onConferenceEvent((event: ConferenceEvent) => {
    console.log('Conference event:', event)

    // Log specific events
    switch (event.type) {
      case 'participant:joined':
        if (event.participant) {
          const name = event.participant.displayName || event.participant.uri
          addEventLog(`${name} joined`)
          announceParticipant(`${name} joined the conference`)
        }
        break
      case 'participant:left':
        if (event.participant) {
          const name = event.participant.displayName || event.participant.uri
          addEventLog(`${name} left`)
          announceParticipant(`${name} left the conference`)
        }
        break
      case 'participant:updated': {
        // Handle participant updates - properly typed
        const updateEvent = event as ParticipantUpdatedEvent
        if (updateEvent.participant && updateEvent.changes) {
          const name = updateEvent.participant.displayName || updateEvent.participant.uri

          // Announce mute changes
          if ('isMuted' in updateEvent.changes) {
            addEventLog(`${name} ${updateEvent.participant.isMuted ? 'muted' : 'unmuted'}`)
            announceMute(name, updateEvent.participant.isMuted)
          }

          // Announce speaking changes (only if audio level changes significantly)
          if ('audioLevel' in updateEvent.changes) {
            const isSpeaking = (updateEvent.participant.audioLevel || 0) > 0.1
            announceSpeaking(name, isSpeaking)
          }
        }
        break
      }
      case 'state:changed':
        addEventLog(`Conference state: ${event.state}`)
        if (event.state === 'active') {
          announceConferenceStatus('Conference is now active')
        } else if (event.state === 'ended') {
          announceConferenceStatus('Conference has ended')
        }
        break
    }
  })
})

/**
 * Cleanup event listeners on unmount
 */
onUnmounted(() => {
  if (unsubscribeConferenceEvents) {
    unsubscribeConferenceEvents()
    unsubscribeConferenceEvents = null
  }

  // Cleanup speaking timeout
  if (speakingTimeout.value) {
    clearTimeout(speakingTimeout.value)
  }
})
</script>

<style scoped>
.conference-room {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.conference-header {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.conference-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.conference-title h2 {
  margin: 0;
}

.participant-count {
  font-size: 1.1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.conference-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.conference-controls button {
  flex: 1;
  min-width: 150px;
}

.events-log {
  max-height: 300px;
  overflow-y: auto;
}

.events-log h3 {
  margin-bottom: 1rem;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.9rem;
}

.event-time {
  color: rgba(255, 255, 255, 0.5);
  min-width: 100px;
}

.event-message {
  flex: 1;
}

@media (prefers-color-scheme: light) {
  .participant-count {
    color: rgba(0, 0, 0, 0.8);
  }

  .event-item {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .event-time {
    color: rgba(0, 0, 0, 0.5);
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .conference-controls {
    flex-direction: column;
  }

  .conference-controls button {
    width: 100%;
  }
}
</style>
