<template>
  <div
    class="participant-tile"
    :class="{
      'active-speaker': isActiveSpeaker,
      'is-muted': participant.isMuted,
      'is-pinned': isPinned,
      featured,
      thumbnail,
      sidebar,
    }"
    @mouseenter="showControls = true"
    @mouseleave="showControls = false"
  >
    <!-- Video/Avatar Container -->
    <div class="tile-content">
      <!-- Avatar (placeholder for video) -->
      <div class="avatar">
        <span class="avatar-initial">{{ avatarInitial }}</span>
      </div>

      <!-- Active Speaker Indicator Border -->
      <div v-if="isActiveSpeaker" class="speaker-border"></div>

      <!-- Participant Info Overlay -->
      <div class="info-overlay">
        <div class="participant-name">
          <span v-if="participant.isSelf" class="self-badge">You</span>
          <span>{{ participant.displayName || 'Unknown' }}</span>
          <span v-if="participant.isModerator" class="moderator-badge" title="Moderator">*</span>
        </div>

        <!-- Status Icons -->
        <div class="status-icons">
          <span v-if="participant.isMuted" class="status-icon muted" title="Muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>
            </svg>
          </span>
          <span v-if="isPinned" class="status-icon pinned" title="Pinned">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          </span>
        </div>
      </div>

      <!-- Audio Level Bar -->
      <div class="audio-level-container">
        <div
          class="audio-level-bar"
          :style="{ width: `${Math.round((participant.audioLevel || 0) * 100)}%` }"
        ></div>
      </div>
    </div>

    <!-- Controls Overlay -->
    <div v-show="showControls && !participant.isSelf" class="controls-overlay">
      <button
        v-if="canMute"
        class="control-btn"
        :title="participant.isMuted ? 'Unmute' : 'Mute'"
        @click.stop="emit('toggleMute', participant)"
      >
        <span v-if="participant.isMuted">🔊</span>
        <span v-else>🔇</span>
      </button>

      <button
        v-if="canPin"
        class="control-btn"
        :title="isPinned ? 'Unpin' : 'Pin'"
        @click.stop="emit('togglePin', participant)"
      >
        <span v-if="isPinned">📍</span>
        <span v-else>📌</span>
      </button>

      <button
        v-if="canKick"
        class="control-btn kick"
        title="Remove from call"
        @click.stop="emit('kick', participant)"
      >
        <span>❌</span>
      </button>

      <!-- Volume Slider -->
      <div v-if="!participant.isSelf" class="volume-control">
        <span class="volume-icon">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="volumeLevel"
          @input="handleVolumeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ParticipantState, type Participant } from '../../src/types/conference.types'

const props = defineProps<{
  participant: Participant
  isActiveSpeaker?: boolean
  isPinned?: boolean
  isModerator?: boolean
  featured?: boolean
  thumbnail?: boolean
  sidebar?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleMute', participant: Participant): void
  (e: 'togglePin', participant: Participant): void
  (e: 'kick', participant: Participant): void
  (e: 'volumeChange', participant: Participant, volume: number): void
}>()

const showControls = ref(false)
const volumeLevel = ref(1)

// Computed values
const avatarInitial = computed(() => {
  const name = props.participant.displayName || props.participant.uri
  return name?.charAt(0).toUpperCase() || '?'
})

const canMute = computed(() => {
  return props.participant.state === ParticipantState.Connected
})

const canPin = computed(() => {
  return props.participant.state === ParticipantState.Connected
})

const canKick = computed(() => {
  // Can't kick yourself, must be moderator
  if (props.participant.isSelf) return false
  return props.isModerator
})

// Volume change handler
const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const volume = parseFloat(target.value)
  volumeLevel.value = volume
  emit('volumeChange', props.participant, volume)
}
</script>

<style scoped>
.participant-tile {
  position: relative;
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  transition: all 0.2s ease;
}

.participant-tile.featured {
  aspect-ratio: auto;
  height: 100%;
}

.participant-tile.thumbnail {
  aspect-ratio: 3 / 2;
}

.participant-tile.sidebar {
  aspect-ratio: 4 / 3;
}

.participant-tile.active-speaker {
  box-shadow: 0 0 0 3px var(--success, #10b981);
}

.participant-tile.is-pinned {
  box-shadow: 0 0 0 3px var(--primary, #667eea);
}

.participant-tile.active-speaker.is-pinned {
  box-shadow:
    0 0 0 3px var(--success, #10b981),
    0 0 0 6px var(--primary, #667eea);
}

.tile-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  color: white;
}

.participant-tile.thumbnail .avatar,
.participant-tile.sidebar .avatar {
  width: 48px;
  height: 48px;
  font-size: 1.25rem;
}

.speaker-border {
  position: absolute;
  inset: 0;
  border: 3px solid var(--success, #10b981);
  border-radius: 8px;
  pointer-events: none;
  animation: speakerPulse 2s ease-in-out infinite;
}

@keyframes speakerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.participant-name {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.participant-tile.thumbnail .participant-name,
.participant-tile.sidebar .participant-name {
  font-size: 0.75rem;
}

.self-badge {
  padding: 0.125rem 0.375rem;
  background: var(--primary, #667eea);
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
}

.moderator-badge {
  color: var(--warning, #f59e0b);
  font-weight: bold;
}

.status-icons {
  display: flex;
  gap: 0.375rem;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  color: white;
}

.status-icon.muted {
  color: var(--danger, #ef4444);
}

.status-icon.pinned {
  color: var(--primary, #667eea);
}

.audio-level-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
}

.audio-level-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--success, #10b981), var(--primary, #667eea));
  transition: width 0.1s ease;
}

.controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn.kick:hover {
  background: var(--danger, #ef4444);
}

.participant-tile.thumbnail .control-btn,
.participant-tile.sidebar .control-btn {
  width: 32px;
  height: 32px;
  font-size: 1rem;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
}

.volume-icon {
  font-size: 0.875rem;
}

.volume-control input[type='range'] {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
}

.volume-control input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.participant-tile.is-muted .avatar {
  opacity: 0.6;
}
</style>
