<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CallTransferDemo from './components/CallTransferDemo.vue'
import CallHoldDemo from './components/CallHoldDemo.vue'
import DTMFDemo from './components/DTMFDemo.vue'
import AudioDemo from './components/AudioDemo.vue'
import MultiLineDemo from './components/MultiLineDemo.vue'
import ThemeToggle from '../src/components/ui/ThemeToggle.vue'

type FeatureTab = 'transfer' | 'hold' | 'dtmf' | 'audio' | 'multiline'

const activeTab = ref<FeatureTab>('transfer')

const features = [
  { id: 'transfer' as const, name: 'Call Transfer', icon: '📞', status: 'new' },
  { id: 'hold' as const, name: 'Hold/Resume', icon: '⏸️', status: 'new' },
  { id: 'dtmf' as const, name: 'DTMF Tones', icon: '🔢', status: 'new' },
  { id: 'audio' as const, name: 'Audio Devices', icon: '🎧', status: 'new' },
  { id: 'multiline' as const, name: 'Multi-Line', icon: '📱', status: 'new' },
]

// Initialize theme when component mounts
onMounted(() => {
  // Initialize theme system
  const stored = localStorage.getItem('vuesip-theme')
  if (stored) {
    document.documentElement.classList.toggle('dark-mode', stored === 'dark')
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark-mode')
  }
})
</script>

<template>
  <div class="playground">
    <header class="playground-header">
      <div class="header-content">
        <div class="header-title">
          <h1>🚀 VueSIP Playground</h1>
          <p>Interactive demos for all 5 new features - Try them out!</p>
        </div>
        <div class="header-actions">
          <ThemeToggle size="md" />
        </div>
      </div>
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

    <footer
      style="text-align: center; margin-top: 2rem; color: var(--text-muted); font-size: 0.9rem"
    >
      <p>VueSIP v1.0.0 • Vue 3 Headless SIP Client Library</p>
      <p style="margin-top: 0.5rem">
        <a href="https://github.com/ironyh/VueSIP" style="color: var(--primary)">GitHub</a>
        •
        <a href="/docs" style="color: var(--primary)">Documentation</a>
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

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-title {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Ensure theme toggle is visible on both light and dark backgrounds */
:deep(.theme-toggle) {
  color: var(--text-primary);
}

:deep(.theme-toggle-icon) {
  color: var(--text-primary);
}
</style>
