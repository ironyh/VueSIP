<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import type { VideoRoomParticipant } from '../composables/useVideoRoom'

interface Props {
  participant: VideoRoomParticipant
  isLocal?: boolean
  isActiveSpeaker?: boolean
  isPinned?: boolean
  isCompact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLocal: false,
  isActiveSpeaker: false,
  isPinned: false,
  isCompact: false,
})

const emit = defineEmits<{
  pin: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const showControls = ref(false)

/**
 * Display name with "You" suffix for local participant
 */
const displayName = computed(() => {
  return props.isLocal ? `${props.participant.name} (You)` : props.participant.name
})

/**
 * Initials for avatar fallback
 */
const initials = computed(() => {
  const parts = props.participant.name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return props.participant.name.slice(0, 2).toUpperCase()
})

/**
 * Audio level indicator height
 */
const audioLevelStyle = computed(() => {
  const level = props.participant.audioLevel * 100
  return {
    height: `${Math.min(level * 3, 100)}%`,
  }
})

/**
 * Should show video
 */
const showVideo = computed(() => {
  return !props.participant.isVideoOff && props.participant.videoStream
})

/**
 * Attach video stream to element
 */
function attachStream() {
  if (videoRef.value && props.participant.videoStream) {
    videoRef.value.srcObject = props.participant.videoStream
  }
}

/**
 * Handle pin click
 */
function handlePinClick() {
  emit('pin')
}

// Watch for stream changes
watch(
  () => props.participant.videoStream,
  () => {
    attachStream()
  }
)

// Mount
onMounted(() => {
  attachStream()
})

// Unmount
onUnmounted(() => {
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
})
</script>

<template>
  <div
    class="participant-tile"
    :class="{
      'is-active-speaker': isActiveSpeaker,
      'is-pinned': isPinned,
      'is-local': isLocal,
      'is-compact': isCompact,
      'video-off': participant.isVideoOff,
    }"
    @mouseenter="showControls = true"
    @mouseleave="showControls = false"
  >
    <!-- Video -->
    <video
      v-if="showVideo"
      ref="videoRef"
      autoplay
      playsinline
      :muted="isLocal"
      class="participant-video"
      :class="{ mirrored: isLocal }"
    />

    <!-- Avatar fallback when video is off -->
    <div v-else class="avatar-fallback">
      <div class="avatar">
        {{ initials }}
      </div>
    </div>

    <!-- Audio level indicator -->
    <div v-if="!participant.isMuted" class="audio-level-indicator">
      <div class="audio-level-bar" :style="audioLevelStyle" />
    </div>

    <!-- Name tag -->
    <div class="name-tag">
      <i v-if="participant.isMuted" class="pi pi-microphone-slash muted-icon" />
      <span class="name">{{ displayName }}</span>
      <i v-if="isPinned" class="pi pi-thumbtack pinned-icon" />
    </div>

    <!-- Hover controls -->
    <Transition name="fade">
      <div v-if="showControls && !isCompact" class="tile-controls">
        <Button
          v-tooltip.top="isPinned ? 'Unpin' : 'Pin'"
          :icon="isPinned ? 'pi pi-thumbtack' : 'pi pi-thumbtack'"
          :class="{ pinned: isPinned }"
          rounded
          text
          size="small"
          @click="handlePinClick"
        />
      </div>
    </Transition>

    <!-- Active speaker indicator -->
    <div v-if="isActiveSpeaker" class="active-speaker-badge">
      <i class="pi pi-volume-up" />
    </div>
  </div>
</template>

<style scoped>
.participant-tile {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface-card);
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;
}

.participant-tile.is-compact {
  aspect-ratio: 4 / 3;
  min-height: 120px;
}

.participant-tile.is-active-speaker {
  border-color: var(--green-500);
}

.participant-tile.is-pinned {
  border-color: var(--primary-500);
}

.participant-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-video.mirrored {
  transform: scaleX(-1);
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
}

.is-compact .avatar {
  width: 50px;
  height: 50px;
  font-size: 1rem;
}

.audio-level-indicator {
  position: absolute;
  left: 8px;
  bottom: 40px;
  width: 4px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.audio-level-bar {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: var(--green-500);
  border-radius: 2px;
  transition: height 0.1s ease;
}

.name-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.name {
  flex: 1;
  font-size: 0.875rem;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.muted-icon {
  color: var(--red-400);
  font-size: 0.875rem;
}

.pinned-icon {
  color: var(--primary-300);
  font-size: 0.75rem;
}

.tile-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.tile-controls :deep(.p-button) {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  backdrop-filter: blur(4px);
}

.tile-controls :deep(.p-button:hover) {
  background: rgba(0, 0, 0, 0.8);
}

.tile-controls :deep(.p-button.pinned) {
  color: var(--primary-300);
}

.active-speaker-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background: var(--green-500);
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
