<script setup lang="ts">
import { ref, computed } from 'vue'
import CallTransferDemo from './components/CallTransferDemo.vue'
import CallHoldDemo from './components/CallHoldDemo.vue'
import DTMFDemo from './components/DTMFDemo.vue'
import AudioDemo from './components/AudioDemo.vue'
import MultiLineDemo from './components/MultiLineDemo.vue'

type FeatureTab = 'transfer' | 'hold' | 'dtmf' | 'audio' | 'multiline'

const activeTab = ref<FeatureTab>('transfer')

const features = [
  { id: 'transfer' as const, name: 'Call Transfer', icon: '📞', status: 'new' },
  { id: 'hold' as const, name: 'Hold/Resume', icon: '⏸️', status: 'new' },
  { id: 'dtmf' as const, name: 'DTMF Tones', icon: '🔢', status: 'new' },
  { id: 'audio' as const, name: 'Audio Devices', icon: '🎧', status: 'new' },
  { id: 'multiline' as const, name: 'Multi-Line', icon: '📱', status: 'new' },
]

const currentFeature = computed(() => features.find(f => f.id === activeTab.value))
</script>

<template>
  <div class="playground">
    <header class="playground-header">
      <h1>🚀 VueSIP Playground</h1>
      <p>Interactive demos for all 5 new features - Try them out!</p>
    </header>

    <nav class="feature-tabs">
      <button
        v-for="feature in features"
        :key="feature.id"
        :class="['feature-tab', { active: activeTab === feature.id }]"
        @click="activeTab = feature.id"
      >
        <span>{{ feature.icon }} {{ feature.name }}</span>
        <span class="feature-badge">{{ feature.status }}</span>
      </button>
    </nav>

    <main class="demo-container">
      <Transition name="fade" mode="out-in">
        <CallTransferDemo v-if="activeTab === 'transfer'" />
        <CallHoldDemo v-else-if="activeTab === 'hold'" />
        <DTMFDemo v-else-if="activeTab === 'dtmf'" />
        <AudioDemo v-else-if="activeTab === 'audio'" />
        <MultiLineDemo v-else-if="activeTab === 'multiline'" />
      </Transition>
    </main>

    <footer style="text-align: center; margin-top: 2rem; color: var(--text-muted); font-size: 0.9rem;">
      <p>VueSIP v1.0.0 • Vue 3 Headless SIP Client Library</p>
      <p style="margin-top: 0.5rem;">
        <a href="https://github.com/ironyh/VueSIP" style="color: var(--primary);">GitHub</a>
        •
        <a href="/docs" style="color: var(--primary);">Documentation</a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
