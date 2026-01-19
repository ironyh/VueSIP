<template>
  <div class="codec-policy-demo">
    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">🎛️</span>
          <span>Audio Codec Policy</span>
        </div>
      </template>
      <template #subtitle>Inspect capabilities and switch preference order</template>
      <template #content>
        <!-- Policy Toggle -->
        <div class="policy-toggle">
          <div class="toggle-group" role="group" aria-label="Codec policy selection">
            <Button
              :class="['toggle-btn', { active: activePolicy === 'opus' }]"
              label="Opus first"
              icon="pi pi-volume-up"
              @click="setOpusFirst()"
            />
            <Button
              :class="['toggle-btn', { active: activePolicy === 'g711' }]"
              label="G.711 first"
              icon="pi pi-sitemap"
              severity="secondary"
              @click="setG711First()"
            />
          </div>
          <div class="policy-help">
            Current policy: <Tag :value="policyLabel" severity="info" />
          </div>
        </div>

        <Divider />

        <!-- Capabilities -->
        <div class="capabilities">
          <h4>Local Audio Capabilities</h4>
          <div v-if="audioCaps.length === 0" class="empty">
            No capabilities found in this environment.
          </div>
          <ul v-else class="caps-list">
            <li v-for="(c, i) in audioCaps" :key="i">
              <code>{{ c.mimeType }}</code>
              <span v-if="c.clockRate"> — {{ c.clockRate }} Hz</span>
              <span v-if="c.channels"> — {{ c.channels }} ch</span>
            </li>
          </ul>
        </div>

        <Divider />

        <!-- Ordered by Policy -->
        <div class="ordered">
          <h4>Preferred Order (by current policy)</h4>
          <ul v-if="orderedAudio.length > 0" class="caps-list">
            <li v-for="(c, i) in orderedAudio" :key="i">
              <Tag :value="i + 1" severity="success" />
              <code>{{ c.mimeType }}</code>
            </li>
          </ul>
          <div v-else class="empty">No audio codecs to order.</div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, Divider, Button, Tag } from './shared-components'
import {
  useCodecs,
  DefaultSdpTransformer,
  DefaultCodecPolicy,
  type CodecPolicy,
} from '../../src/codecs'

type PolicyKind = 'opus' | 'g711'

const transformer = new DefaultSdpTransformer()
const { policy, getLocalCapabilities, negotiate } = useCodecs(DefaultCodecPolicy, transformer)

const activePolicy = ref<PolicyKind>('opus')
const audioCaps = ref<{ mimeType: string; clockRate?: number; channels?: number }[]>([])
const orderedAudio = ref<typeof audioCaps.value>([])

const policyLabel = computed(() => (activePolicy.value === 'opus' ? 'Opus first' : 'G.711 first'))

function setOpusFirst() {
  const p: CodecPolicy = {
    ...policy.value,
    audio: [
      { id: 'opus', priority: 100 },
      { id: 'pcmu', priority: 60 },
      { id: 'pcma', priority: 55 },
    ],
  }
  policy.value = p
  activePolicy.value = 'opus'
  recompute()
}

function setG711First() {
  const p: CodecPolicy = {
    ...policy.value,
    audio: [
      { id: 'pcmu', priority: 100 },
      { id: 'pcma', priority: 95 },
      { id: 'opus', priority: 60 },
    ],
  }
  policy.value = p
  activePolicy.value = 'g711'
  recompute()
}

function recompute() {
  const caps = getLocalCapabilities()
  audioCaps.value = caps.audio
  const ordered = negotiate(caps)
  orderedAudio.value = ordered.audio
}

onMounted(() => {
  recompute()
})
</script>

<style scoped>
.codec-policy-demo {
  max-width: 900px;
  margin: 0 auto;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  font-size: 1.25rem;
}

.policy-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.toggle-group {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn.active {
  outline: 2px solid var(--primary);
}

.policy-help {
  color: var(--text-secondary);
}

.caps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.caps-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-ground);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.empty {
  color: var(--text-secondary);
}
</style>
