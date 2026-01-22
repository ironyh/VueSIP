<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranscription } from 'vuesip'

const provider = ref<'web-speech'>('web-speech')
const language = ref('en-US')

const { isTranscribing, transcript, currentUtterance, error, start, stop, exportTranscript } =
  useTranscription({
    provider: provider.value,
    language: language.value,
  })

const transcriptText = computed(() => {
  const lines = transcript.value
    .slice(-50)
    .map((e: any) =>
      e?.participantName ? `${e.participantName}: ${e.text}` : String(e?.text ?? '')
    )
  return lines.join('\n')
})

async function toggleTranscription() {
  if (isTranscribing.value) {
    await stop()
    return
  }

  // Recreate with current config by reloading page is heavy; keep this simple.
  // For now, language/provider changes apply on next start.
  await start()
}

function downloadTxt() {
  const txt = exportTranscript('txt')
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="settings-section">
    <h3>Transcription (beta)</h3>

    <p class="hint">
      This uses your browser's speech recognition. It is best-effort and may require microphone
      permission.
    </p>

    <div class="setting-item">
      <label>Language</label>
      <select v-model="language" :disabled="isTranscribing">
        <option value="en-US">English (US)</option>
        <option value="en-GB">English (UK)</option>
        <option value="sv-SE">Swedish</option>
      </select>
    </div>

    <div class="setting-item">
      <label>Provider</label>
      <select v-model="provider" disabled>
        <option value="web-speech">Web Speech API</option>
      </select>
    </div>

    <button class="btn" type="button" @click="toggleTranscription">
      {{ isTranscribing ? 'Stop transcription' : 'Start transcription' }}
    </button>

    <button v-if="transcript.length > 0" class="btn secondary" type="button" @click="downloadTxt">
      Download transcript (.txt)
    </button>

    <p v-if="error" class="error">{{ error.message }}</p>

    <div v-if="isTranscribing || transcript.length > 0" class="preview">
      <div class="preview-title">Live</div>
      <div v-if="currentUtterance" class="interim">{{ currentUtterance }}</div>
      <pre class="transcript">{{ transcriptText }}</pre>
    </div>
  </section>
</template>

<style scoped>
.hint {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item label {
  font-weight: 500;
}

.setting-item select {
  flex: 1;
  max-width: 200px;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.btn {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn.secondary {
  background: transparent;
}

.error {
  margin: 0.75rem 0 0;
  color: var(--color-error);
  font-size: 0.875rem;
}

.preview {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
}

.preview-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.interim {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.transcript {
  margin: 0;
  white-space: pre-wrap;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 0.8rem;
  line-height: 1.25;
  color: var(--text-primary);
}
</style>
