<script setup lang="ts">
import { computed } from 'vue'
import ParticipantTile from './ParticipantTile.vue'
import type { VideoRoomParticipant } from '../composables/useVideoRoom'

interface Props {
  /** Remote participants */
  participants: VideoRoomParticipant[]
  /** Local participant */
  localParticipant: VideoRoomParticipant | null
  /** Active speaker ID */
  activeSpeakerId?: string | null
  /** Pinned participant ID */
  pinnedParticipantId?: string | null
  /** Is screen sharing active */
  isScreenSharing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeSpeakerId: null,
  pinnedParticipantId: null,
  isScreenSharing: false,
})

const emit = defineEmits<{
  pin: [participantId: string]
  unpin: []
}>()

/**
 * All participants including local
 */
const allParticipants = computed(() => {
  const result: VideoRoomParticipant[] = []

  // Add local participant first
  if (props.localParticipant) {
    result.push(props.localParticipant)
  }

  // Add remote participants
  result.push(...props.participants)

  return result
})

/**
 * Calculate grid columns based on participant count
 */
const gridColumns = computed(() => {
  const count = allParticipants.value.length

  // When screen sharing, show smaller tiles in a sidebar
  if (props.isScreenSharing) {
    return 1
  }

  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 2
  if (count <= 6) return 3
  if (count <= 9) return 3
  return 4
})

/**
 * Grid style
 */
const gridStyle = computed(() => {
  if (props.isScreenSharing) {
    return {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '200px',
      padding: '8px',
    }
  }

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
    gap: '8px',
    padding: '16px',
    width: '100%',
    height: '100%',
  }
})

/**
 * Handle pin click
 */
function handlePin(participantId: string) {
  if (props.pinnedParticipantId === participantId) {
    emit('unpin')
  } else {
    emit('pin', participantId)
  }
}
</script>

<template>
  <div class="video-grid" :class="{ 'screen-sharing-mode': isScreenSharing }" :style="gridStyle">
    <ParticipantTile
      v-for="participant in allParticipants"
      :key="participant.id"
      :participant="participant"
      :is-local="participant.id === localParticipant?.id"
      :is-active-speaker="activeSpeakerId === participant.id"
      :is-pinned="pinnedParticipantId === participant.id"
      :is-compact="isScreenSharing"
      @pin="handlePin(participant.id)"
    />
  </div>
</template>

<style scoped>
.video-grid {
  flex: 1;
  overflow: auto;
  background: var(--surface-ground);
}

.video-grid.screen-sharing-mode {
  flex: none;
  height: 100%;
  overflow-y: auto;
  background: var(--surface-card);
  border-left: 1px solid var(--surface-border);
}
</style>
