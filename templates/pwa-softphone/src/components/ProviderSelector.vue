<script setup lang="ts">
import { ref } from 'vue'

type ProviderId = '46elks' | 'telnyx' | 'custom' | 'advanced'

interface Provider {
  id: ProviderId
  name: string
  description: string
  icon: string
}

const providers: Provider[] = [
  {
    id: '46elks',
    name: '46 elks',
    description: 'Login with API credentials',
    icon: '🦌',
  },
  {
    id: 'telnyx',
    name: 'Telnyx',
    description: 'SIP credentials',
    icon: '📞',
  },
  {
    id: 'custom',
    name: 'Custom PBX',
    description: 'Manual SIP configuration',
    icon: '🔧',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Multi-account mode',
    icon: '🧰',
  },
]

const emit = defineEmits<{
  select: [providerId: ProviderId]
}>()

const selectedProvider = ref<ProviderId | null>(null)

function handleSelect(providerId: ProviderId) {
  selectedProvider.value = providerId
  emit('select', providerId)
}
</script>

<template>
  <div class="provider-selector">
    <div class="selector-header">
      <h2>Choose Provider</h2>
      <p>Select your VoIP provider to get started</p>
    </div>

    <div class="provider-list">
      <button
        v-for="provider in providers"
        :key="provider.id"
        class="provider-card"
        :class="{ selected: selectedProvider === provider.id }"
        @click="handleSelect(provider.id)"
      >
        <span class="provider-icon">{{ provider.icon }}</span>
        <div class="provider-info">
          <span class="provider-name">{{ provider.name }}</span>
          <span class="provider-description">{{ provider.description }}</span>
        </div>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.provider-selector {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.selector-header {
  text-align: center;
  padding: 1.5rem 0;
}

.selector-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.selector-header p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.provider-card:hover {
  border-color: var(--color-primary);
  background: var(--bg-tertiary, var(--bg-secondary));
}

.provider-card.selected {
  border-color: var(--color-primary);
  background: rgba(79, 70, 229, 0.1);
}

.provider-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.provider-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.provider-description {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.chevron {
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
  transition: transform 0.2s;
}

.provider-card:hover .chevron {
  transform: translateX(4px);
  color: var(--color-primary);
}
</style>
