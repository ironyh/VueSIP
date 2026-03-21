<template>
  <div
    v-if="suggestions.length > 0"
    class="suggester-panel"
    role="listbox"
    aria-label="Triage suggestions"
    @keydown="handleKeydown"
  >
    <div class="panel-header">
      <span class="panel-label">💡 Följdfrågor</span>
      <span class="panel-hint">↑↓ navigera • Enter välj • Esc stäng</span>
      <button class="dismiss-btn" aria-label="Dismiss suggestions" @click="$emit('dismiss')">
        ✕
      </button>
    </div>
    <div class="chips-container">
      <SuggesterChip
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.id"
        :suggestion="suggestion"
        :is-focused="index === focusedIndex"
        :is-picked="pickedId === suggestion.id"
        :show-keyword="false"
        @pick="onPick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SuggesterChip from './SuggesterChip.vue'
import type { Suggestion } from '../composables/useSuggester'

interface Props {
  suggestions: Suggestion[]
  focusedIndex: number
  pickedId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  pickedId: null,
})

const emit = defineEmits<{
  pick: [suggestion: Suggestion]
  dismiss: []
  'update:focusedIndex': [index: number]
}>()

function onPick(suggestion: Suggestion) {
  emit('pick', suggestion)
}

function handleKeydown(event: KeyboardEvent) {
  const len = props.suggestions.length
  if (len === 0) return

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault()
      emit('update:focusedIndex', (props.focusedIndex + 1) % len)
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault()
      emit('update:focusedIndex', props.focusedIndex <= 0 ? len - 1 : props.focusedIndex - 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (props.focusedIndex >= 0) {
        const suggestion = props.suggestions[props.focusedIndex]
        if (suggestion) emit('pick', suggestion)
      }
      break
    case 'Escape':
      event.preventDefault()
      emit('dismiss')
      break
  }
}
</script>

<style scoped>
.suggester-panel {
  background: #0f172a;
  border: 1px solid #1e3a5f;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}

.panel-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
}

.panel-hint {
  font-size: 0.65rem;
  color: #475569;
  flex: 1;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition:
    color 0.15s,
    background 0.15s;
}

.dismiss-btn:hover {
  color: #e2e8f0;
  background: #1e293b;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
