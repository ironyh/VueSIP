<template>
  <div class="settings-panel">
    <!-- Header with Actions -->
    <div class="settings-header">
      <h2>Settings</h2>
      <div class="header-actions">
        <span v-if="isDirty" class="dirty-indicator">● Unsaved changes</span>
        <button class="btn btn-secondary btn-sm" @click="handleReset" :disabled="!isDirty">
          Reset
        </button>
        <button class="btn btn-secondary btn-sm" @click="handleExport">Export</button>
        <button class="btn btn-primary btn-sm" @click="handleSave" :disabled="!isDirty">
          Save
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="setActiveTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <slot :name="activeTab"></slot>
    </div>

    <!-- Keyboard Shortcut Hint -->
    <div class="keyboard-hint">
      <span>💡 Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save changes</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Define tabs configuration
const tabs = [
  { id: 'sip', label: 'SIP', icon: '📞' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'media', label: 'Media', icon: '📹' },
  { id: 'call', label: 'Call', icon: '☎️' },
  { id: 'network', label: 'Network', icon: '🌐' },
  { id: 'ami', label: 'AMI', icon: '🔌' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
] as const

type TabId = (typeof tabs)[number]['id']

// Props
const props = defineProps<{
  initialTab?: TabId
  isDirty?: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'save'): void
  (e: 'reset'): void
  (e: 'export'): void
  (e: 'tab-change', tabId: TabId): void
}>()

// State
const activeTab = ref<TabId>(props.initialTab || 'sip')

// Computed
const isDirty = computed(() => props.isDirty ?? false)

// Methods
const setActiveTab = (tabId: TabId) => {
  activeTab.value = tabId
  // Update URL hash
  window.location.hash = tabId
  emit('tab-change', tabId)
}

const handleSave = () => {
  emit('save')
}

const handleReset = () => {
  if (confirm('Are you sure you want to reset all changes?')) {
    emit('reset')
  }
}

const handleExport = () => {
  emit('export')
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+S or Cmd+S to save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (isDirty.value) {
      handleSave()
    }
  }
}

// Initialize from URL hash
onMounted(() => {
  const hash = window.location.hash.slice(1)
  if (hash && tabs.some((tab) => tab.id === hash)) {
    activeTab.value = hash as TabId
  }

  // Add keyboard listener
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.settings-panel {
  max-width: 900px;
  margin: 0 auto;
  background: var(--bg-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Header */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--primary, #667eea), #764ba2);
  color: white;
}

.settings-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dirty-indicator {
  font-size: 0.875rem;
  color: #fbbf24;
  font-weight: 500;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  background: var(--bg-secondary, #f8fafc);
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  overflow-x: auto;
  scrollbar-width: thin;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
  white-space: nowrap;
  min-width: 120px;
}

.tab-button:hover {
  background: var(--bg-primary, white);
  color: var(--text-primary, #0f172a);
}

.tab-button.active {
  background: var(--bg-primary, white);
  color: var(--primary, #667eea);
  border-bottom-color: var(--primary, #667eea);
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-label {
  font-size: 0.875rem;
}

/* Tab Content */
.tab-content {
  padding: 2rem;
  min-height: 400px;
}

/* Keyboard Hint */
.keyboard-hint {
  padding: 1rem 1.5rem;
  background: var(--bg-secondary, #f8fafc);
  border-top: 1px solid var(--border-color, #e2e8f0);
  text-align: center;
}

.keyboard-hint span {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: white;
  color: var(--primary, #667eea);
}

.btn-primary:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .settings-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .tab-navigation {
    overflow-x: auto;
  }

  .tab-button {
    min-width: 100px;
    flex: 0 0 auto;
  }

  .tab-content {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .tab-label {
    display: none;
  }

  .tab-button {
    min-width: auto;
    padding: 0.75rem 1rem;
  }
}
</style>
