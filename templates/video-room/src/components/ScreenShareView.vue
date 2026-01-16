<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'

interface Props {
  participantId: string
  participantName: string
  stream: MediaStream | null
  isLocal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLocal: false,
})

const emit = defineEmits<{
  stopSharing: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)

/**
 * Attach stream to video element
 */
function attachStream() {
  if (videoRef.value && props.stream) {
    videoRef.value.srcObject = props.stream
  }
}

/**
 * Handle stop sharing
 */
function handleStopSharing() {
  emit('stopSharing')
}

// Watch for stream changes
watch(
  () => props.stream,
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
  <div class="screen-share-view">
    <!-- Header -->
    <div class="share-header">
      <div class="presenter-info">
        <i class="pi pi-desktop" />
        <span class="presenter-name">
          {{ isLocal ? 'You are presenting' : `${participantName} is presenting` }}
        </span>
      </div>
      <Button
        v-if="isLocal"
        label="Stop Sharing"
        icon="pi pi-times"
        severity="danger"
        size="small"
        @click="handleStopSharing"
      />
    </div>

    <!-- Screen content -->
    <div class="share-content">
      <video v-if="stream" ref="videoRef" autoplay playsinline class="share-video" />
      <div v-else class="no-stream">
        <i class="pi pi-desktop" />
        <p>Waiting for screen share...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen-share-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
  min-width: 0;
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.presenter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary-500);
}

.presenter-info i {
  font-size: 1.25rem;
}

.presenter-name {
  font-weight: 500;
}

.share-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow: hidden;
}

.share-video {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.no-stream {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--text-color-secondary);
}

.no-stream i {
  font-size: 4rem;
}

.no-stream p {
  margin: 0;
  font-size: 1.125rem;
}
</style>
