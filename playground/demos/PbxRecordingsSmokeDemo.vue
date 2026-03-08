<template>
  <div class="pbx-recordings-smoke" data-testid="pbx-recordings-smoke">
    <h3>PBX Recordings (smoke)</h3>
    <p v-if="loading" data-testid="pbx-recordings-loading">Loading…</p>
    <p v-else-if="error" data-testid="pbx-recordings-error" role="alert">{{ error }}</p>
    <div v-else data-testid="pbx-recordings-list" class="recordings-list">
      <div
        v-for="rec in recordings"
        :key="rec.id"
        class="recording-row"
        :data-testid="`recording-row-${rec.id}`"
      >
        <span class="recording-id">{{ rec.id }}</span>
        <span class="recording-meta">{{ rec.callerId }} → {{ rec.callee }} ({{ rec.duration }}s)</span>
        <button
          type="button"
          class="play-button"
          :data-testid="`play-button-${rec.id}`"
          :disabled="loading"
          @click="onPlay(rec.id)"
        >
          Play
        </button>
      </div>
    </div>
    <div v-if="lastPlaybackUrl" data-testid="last-playback-url" role="status">
      {{ lastPlaybackUrl }}
    </div>
    <div v-if="playbackError" data-testid="playback-error" role="alert">
      {{ playbackError.code }}: {{ playbackError.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import { usePbxRecordings } from '@/composables/usePbxRecordings'
import type {
  PbxRecordingProvider,
  PbxRecordingListQuery,
  PbxRecordingListResult,
  RecordingSummary,
  RecordingPlaybackInfo,
  PbxRecordingProviderCapabilities,
} from '@/types/pbx-recording.types'

const MOCK_PLAYBACK_URL = 'https://example.com/play/rec-1'

const capabilities: PbxRecordingProviderCapabilities = {
  listRecordings: true,
  getPlaybackInfo: true,
}

const mockProvider: PbxRecordingProvider = {
  capabilities,
  listRecordings: async (_query: PbxRecordingListQuery): Promise<PbxRecordingListResult> => ({
    items: [
      {
        id: 'rec-1',
        startTime: new Date('2025-01-15T10:00:00Z'),
        duration: 120,
        callerId: '101',
        callee: '102',
      },
    ] as RecordingSummary[],
    totalCount: 1,
    hasMore: false,
  }),
  getPlaybackInfo: async (recordingId: string): Promise<RecordingPlaybackInfo | null> => ({
    recordingId,
    playbackUrl: MOCK_PLAYBACK_URL,
    format: 'audio/wav',
  }),
}

const providerRef = shallowRef<PbxRecordingProvider | null>(mockProvider)
const {
  recordings,
  loading,
  error,
  playbackError,
  fetchRecordings,
  getPlaybackUrl,
} = usePbxRecordings(providerRef)

const lastPlaybackUrl = ref<string | null>(null)

async function onPlay(recordingId: string) {
  lastPlaybackUrl.value = null
  try {
    const url = await getPlaybackUrl(recordingId)
    lastPlaybackUrl.value = url
  } catch {
    // playbackError is set by composable
  }
}

onMounted(() => {
  fetchRecordings()
})
</script>

<style scoped>
.pbx-recordings-smoke {
  padding: 1rem;
}
.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.recording-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  background: var(--p-surface-100, #f3f4f6);
  border-radius: 6px;
}
.play-button {
  padding: 0.25rem 0.75rem;
  cursor: pointer;
}
[data-testid='last-playback-url'] {
  margin-top: 1rem;
  padding: 0.5rem;
  background: var(--p-surface-200, #e5e7eb);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.875rem;
}
</style>
