<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import type { VideoRoomParticipant } from '../composables/useVideoRoom'

interface Props {
  participants: VideoRoomParticipant[]
  localParticipant: VideoRoomParticipant | null
  activeSpeakerId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  activeSpeakerId: null,
})

const emit = defineEmits<{
  close: []
}>()

/**
 * All participants including local
 */
const allParticipants = computed(() => {
  const result: Array<VideoRoomParticipant & { isLocal: boolean }> = []

  // Add local participant first
  if (props.localParticipant) {
    result.push({ ...props.localParticipant, isLocal: true })
  }

  // Add remote participants
  props.participants.forEach((p) => {
    result.push({ ...p, isLocal: false })
  })

  return result
})

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Format join time
 */
function formatJoinTime(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 60000)

  if (diff < 1) return 'Just joined'
  if (diff === 1) return '1 min ago'
  if (diff < 60) return `${diff} mins ago`

  const hours = Math.floor(diff / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

/**
 * Handle close
 */
function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="participant-list">
    <!-- Header -->
    <div class="list-header">
      <h3>Participants ({{ allParticipants.length }})</h3>
      <Button icon="pi pi-times" text rounded size="small" @click="handleClose" />
    </div>

    <!-- Participants -->
    <div class="participants-container">
      <div
        v-for="participant in allParticipants"
        :key="participant.id"
        class="participant-item"
        :class="{
          'is-speaking': activeSpeakerId === participant.id,
          'is-local': participant.isLocal,
        }"
      >
        <Avatar
          :label="getInitials(participant.name)"
          shape="circle"
          size="large"
          class="participant-avatar"
        />

        <div class="participant-info">
          <div class="participant-name">
            {{ participant.name }}
            <span v-if="participant.isLocal" class="local-badge">(You)</span>
          </div>
          <div class="participant-status">
            {{ formatJoinTime(participant.joinedAt) }}
          </div>
        </div>

        <div class="participant-indicators">
          <!-- Muted indicator -->
          <i
            v-if="participant.isMuted"
            v-tooltip.left="'Muted'"
            class="pi pi-microphone-slash indicator muted"
          />
          <i v-else v-tooltip.left="'Unmuted'" class="pi pi-microphone indicator" />

          <!-- Video indicator -->
          <i
            v-if="participant.isVideoOff"
            v-tooltip.left="'Camera off'"
            class="pi pi-video-off indicator video-off"
          />
          <i v-else v-tooltip.left="'Camera on'" class="pi pi-video indicator" />

          <!-- Screen share indicator -->
          <i
            v-if="participant.isScreenSharing"
            v-tooltip.left="'Sharing screen'"
            class="pi pi-desktop indicator sharing"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.participant-list {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-left: 1px solid var(--surface-border);
  z-index: 10;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.list-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.participants-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.participant-item:hover {
  background: var(--surface-100);
}

.participant-item.is-speaking {
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid var(--green-500);
}

.participant-avatar {
  background: var(--primary-500);
  color: white;
  flex-shrink: 0;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.local-badge {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  font-weight: normal;
}

.participant-status {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.participant-indicators {
  display: flex;
  gap: 0.5rem;
}

.indicator {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.indicator.muted {
  color: var(--red-500);
}

.indicator.video-off {
  color: var(--red-500);
}

.indicator.sharing {
  color: var(--primary-500);
}
</style>
