<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCodecsStore } from '../composables/useCodecsStore'

const { policy, codecs, setAudioPreference, setVideoPreference, setLegacyFallbacks } =
  useCodecsStore()

const audioPref = ref<'auto' | 'opus' | 'pcmu' | 'pcma'>('auto')
const videoPref = ref<'auto' | 'vp8' | 'vp9' | 'h264'>('auto')
const legacyFallbacks = ref(policy.value.allowLegacyFallbacks ?? true)

onMounted(() => {
  // Initialize selectors from current policy
  const a = policy.value.audio?.[0]?.id?.toLowerCase()
  if (a && ['opus', 'pcmu', 'pcma'].includes(a)) audioPref.value = a as any
  const v = policy.value.video?.[0]?.id?.toLowerCase()
  if (v && ['vp8', 'vp9', 'h264'].includes(v)) videoPref.value = v as any
})

function applyPrefs() {
  setAudioPreference(audioPref.value)
  setVideoPreference(videoPref.value)
  setLegacyFallbacks(legacyFallbacks.value)
}

const localCaps = computed(() => codecs.getLocalCapabilities())

const snippetGlobal = computed(
  () => `// Global config
const config = {
  // ...other config
  codecPolicy: ${JSON.stringify(policy.value, null, 2)}
}`
)

const snippetPerCall = computed(
  () => `// Per-call override
await adapter.call('sip:bob@example.com', {
  codecPolicy: ${JSON.stringify(policy.value, null, 2)}
})`
)
</script>

<template>
  <div class="codecs-page">
    <section class="intro">
      <h3>Codec Policy & Negotiation</h3>
      <p>
        Configure preferred audio/video codecs and let VueSIP negotiate the best mutual choice.
        Preferences are applied via WebRTC transceivers where available; otherwise, a safe SDP
        fallback can be used.
      </p>
    </section>

    <section class="controls">
      <div class="control">
        <label>Audio preference</label>
        <select v-model="audioPref">
          <option value="auto">Auto</option>
          <option value="opus">Opus</option>
          <option value="pcmu">PCMU (G.711 µ-law)</option>
          <option value="pcma">PCMA (G.711 A-law)</option>
        </select>
      </div>
      <div class="control">
        <label>Video preference</label>
        <select v-model="videoPref">
          <option value="auto">Auto</option>
          <option value="vp8">VP8</option>
          <option value="vp9">VP9</option>
          <option value="h264">H264 (baseline)</option>
        </select>
      </div>
      <div class="control toggle">
        <label>
          <input type="checkbox" v-model="legacyFallbacks" /> Allow legacy fallbacks (PCMU/PCMA,
          H264)
        </label>
      </div>
      <button class="apply-btn" @click="applyPrefs">Apply & Save</button>
    </section>

    <section class="diagnostics">
      <h4>Local Capabilities</h4>
      <div class="caps">
        <div>
          <strong>Audio</strong>
          <ul>
            <li v-for="c in localCaps.audio" :key="c.mimeType">{{ c.mimeType }}</li>
          </ul>
        </div>
        <div>
          <strong>Video</strong>
          <ul>
            <li v-for="c in localCaps.video" :key="c.mimeType">{{ c.mimeType }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="snippets">
      <h4>Usage</h4>
      <div class="snippet">
        <h5>Global policy (config)</h5>
        <pre><code>{{ snippetGlobal }}</code></pre>
      </div>
      <div class="snippet">
        <h5>Per-call override</h5>
        <pre><code>{{ snippetPerCall }}</code></pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.codecs-page {
  display: grid;
  gap: 1rem;
}
.controls {
  display: flex;
  gap: 1rem;
  align-items: end;
  flex-wrap: wrap;
}
.control {
  display: grid;
  gap: 0.25rem;
}
.control select {
  padding: 0.5rem;
}
.apply-btn {
  padding: 0.5rem 0.75rem;
}
.caps {
  display: flex;
  gap: 2rem;
}
.snippet pre {
  background: #111;
  color: #eee;
  padding: 0.75rem;
  overflow: auto;
}
</style>
