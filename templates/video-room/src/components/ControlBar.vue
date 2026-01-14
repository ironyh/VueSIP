<script setup lang="ts">
import Button from 'primevue/button'

interface Props {
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleVideo: []
  toggleAudio: []
  toggleScreenShare: []
  leave: []
}>()

function handleToggleVideo() {
  emit('toggleVideo')
}

function handleToggleAudio() {
  emit('toggleAudio')
}

function handleToggleScreenShare() {
  emit('toggleScreenShare')
}

function handleLeave() {
  emit('leave')
}
</script>

<template>
  <div class="control-bar">
    <div class="control-group">
      <!-- Camera toggle -->
      <Button
        v-tooltip.top="isVideoEnabled ? 'Turn off camera' : 'Turn on camera'"
        :icon="isVideoEnabled ? 'pi pi-video' : 'pi pi-video-off'"
        :class="{ 'control-off': !isVideoEnabled }"
        rounded
        text
        size="large"
        @click="handleToggleVideo"
      />

      <!-- Microphone toggle -->
      <Button
        v-tooltip.top="isAudioEnabled ? 'Mute' : 'Unmute'"
        :icon="isAudioEnabled ? 'pi pi-microphone' : 'pi pi-microphone-slash'"
        :class="{ 'control-off': !isAudioEnabled }"
        rounded
        text
        size="large"
        @click="handleToggleAudio"
      />

      <!-- Screen share toggle -->
      <Button
        v-tooltip.top="isScreenSharing ? 'Stop sharing' : 'Share screen'"
        :icon="isScreenSharing ? 'pi pi-desktop' : 'pi pi-desktop'"
        :class="{ 'control-active': isScreenSharing }"
        rounded
        text
        size="large"
        @click="handleToggleScreenShare"
      />
    </div>

    <!-- Leave button -->
    <Button
      v-tooltip.top="'Leave meeting'"
      icon="pi pi-phone"
      class="leave-button"
      rounded
      severity="danger"
      size="large"
      @click="handleLeave"
    />
  </div>
</template>

<style scoped>
.control-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  padding: 1rem 2rem;
  background: var(--surface-card);
  border-top: 1px solid var(--surface-border);
}

.control-group {
  display: flex;
  gap: 0.5rem;
}

.control-bar :deep(.p-button) {
  width: 3rem;
  height: 3rem;
  background: var(--surface-200);
  color: var(--text-color);
  border: none;
}

.control-bar :deep(.p-button:hover) {
  background: var(--surface-300);
}

.control-bar :deep(.p-button.control-off) {
  background: var(--red-500);
  color: white;
}

.control-bar :deep(.p-button.control-off:hover) {
  background: var(--red-600);
}

.control-bar :deep(.p-button.control-active) {
  background: var(--primary-500);
  color: white;
}

.control-bar :deep(.p-button.control-active:hover) {
  background: var(--primary-600);
}

.leave-button {
  transform: rotate(135deg);
}

.control-bar :deep(.leave-button) {
  background: var(--red-500);
  color: white;
}

.control-bar :deep(.leave-button:hover) {
  background: var(--red-600);
}
</style>
