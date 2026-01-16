<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCodecsStore } from '../composables/useCodecsStore'
import { playgroundSipClient } from '../sipClient'

const {
  policy,
  codecs,
  presets,
  applyPreset,
  customPresets,
  saveCustomPreset,
  deleteCustomPreset,
  applyCustomPreset,
  exportPolicy,
  importPolicy,
  remoteProfiles,
  selectedRemoteProfile,
  selectedPreset,
  setAudioPreference,
  setVideoPreference,
  setLegacyFallbacks,
  negotiatePreview,
} = useCodecsStore()

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

// Use-in-call demo
const targetUri = ref('sip:2000@example.com')
const placing = ref(false)
const callError = ref<string | null>(null)
async function placeCall() {
  callError.value = null
  try {
    placing.value = true
    const client = playgroundSipClient.getClient()
    if (!client) throw new Error('SIP client not initialized')
    await client.call(targetUri.value, {
      mediaConstraints: { audio: true, video: false },
      codecPolicy: policy.value as any,
    } as any)
  } catch (e) {
    callError.value = e instanceof Error ? e.message : String(e)
  } finally {
    placing.value = false
  }
}

// Custom preset helpers
const newPresetName = ref('My PBX Policy')
const importText = ref('')
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
        <label>Preset</label>
        <select v-model="selectedPreset" @change="applyPreset(selectedPreset)">
          <option v-for="p in presets" :value="p.id" :key="p.id">{{ p.label }}</option>
        </select>
      </div>
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
      <div class="control toggle">
        <label>
          <input type="checkbox" v-model="forceSdpFallback" /> Force SDP fallback (disable
          transceiver API)
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

    <section class="diagnostics">
      <h4>Negotiated Result Preview</h4>
      <div class="control">
        <label>Remote Profile</label>
        <select v-model="selectedRemoteProfile">
          <option v-for="rp in remoteProfiles" :key="rp.id" :value="rp.id">{{ rp.label }}</option>
        </select>
      </div>
      <div class="caps">
        <div>
          <strong>Audio Order</strong>
          <ul>
            <li v-for="c in negotiatePreview().audio" :key="c.mimeType">{{ c.mimeType }}</li>
          </ul>
        </div>
        <div>
          <strong>Video Order</strong>
          <ul>
            <li v-for="c in negotiatePreview().video" :key="c.mimeType">{{ c.mimeType }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="presets">
      <h4>Custom Presets</h4>
      <div class="controls">
        <div class="control">
          <label>Preset name</label>
          <input v-model="newPresetName" placeholder="My PBX Policy" />
        </div>
        <button class="apply-btn" @click="saveCustomPreset(newPresetName)">Save Preset</button>
      </div>
      <div v-if="Object.keys(customPresets).length" class="custom-list">
        <strong>Saved:</strong>
        <ul>
          <li v-for="(p, name) in customPresets" :key="name">
            <span>{{ name }}</span>
            <button @click="applyCustomPreset(name)" class="link">Apply</button>
            <button @click="deleteCustomPreset(name)" class="link danger">Delete</button>
          </li>
        </ul>
      </div>
      <div class="import-export">
        <div>
          <h5>Export Current Policy</h5>
          <pre><code>{{ exportPolicy() }}</code></pre>
        </div>
        <div>
          <h5>Import Policy (JSON)</h5>
          <textarea v-model="importText" rows="6" placeholder="Paste policy JSON here"></textarea>
          <div>
            <button
              class="apply-btn"
              @click="importPolicy(importText) || (callError = 'Invalid JSON')"
            >
              Import
            </button>
          </div>
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

    <section class="provider-notes">
      <h4>Provider Notes</h4>
      <div v-if="selectedPreset === 'asterisk_legacy'">
        <ul>
          <li>
            H264 often requires baseline profile. When using SDP fallback, ensure fmtp compatibility
            if you customize transforms.
          </li>
          <li>Legacy IVRs may expect G.711 (PCMU/PCMA). Keep Opus as secondary for browsers.</li>
        </ul>
      </div>
      <div v-else-if="selectedPreset === 'telnyx'">
        <ul>
          <li>Opus is generally preferred for audio. H264 and VP8 both interop well.</li>
          <li>Prefer transceiver API when possible; use fallback only for legacy interop tests.</li>
        </ul>
      </div>
      <div v-else-if="selectedPreset === 'twilio'">
        <ul>
          <li>Twilio WebRTC commonly supports Opus + VP8; H264 is available in many regions.</li>
          <li>Safari may prefer H264; test on target browsers if you prioritize VP8 first.</li>
        </ul>
      </div>
      <div v-else>
        <ul>
          <li>
            Default preset favors Opus/VP8. Use Auto unless your PBX enforces a specific codec.
          </li>
          <li>Toggle legacy fallbacks and SDP fallback when integrating with older gateways.</li>
        </ul>
      </div>
    </section>

    <section class="use-in-call">
      <h4>Use in Call (Demo)</h4>
      <div class="controls">
        <div class="control">
          <label>Target SIP URI</label>
          <input v-model="targetUri" placeholder="sip:2000@example.com" />
        </div>
        <button class="apply-btn" :disabled="placing" @click="placeCall">
          {{ placing ? 'Placing…' : 'Call with Current Policy' }}
        </button>
      </div>
      <p v-if="callError" class="error">{{ callError }}</p>
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
.presets .custom-list ul {
  list-style: none;
  padding: 0;
}
.presets .custom-list li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.link {
  background: transparent;
  color: #4da3ff;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
}
.link.danger {
  color: #ff6b6b;
}
textarea {
  width: 100%;
  max-width: 600px;
}
.error {
  color: #e33;
}
.provider-notes ul {
  margin: 0;
  padding-left: 1.25rem;
}
</style>
