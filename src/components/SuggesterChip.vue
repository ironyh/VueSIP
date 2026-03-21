<template>
  <button
    :class="['suggester-chip', { focused: isFocused, picked: isPicked }]"
    :data-testid="`suggester-chip-${suggestion.id}`"
    :aria-pressed="isPicked"
    :aria-label="suggestion.text"
    @click="$emit('pick', suggestion)"
    @keydown.enter.prevent="$emit('pick', suggestion)"
    @keydown.space.prevent="$emit('pick', suggestion)"
  >
    <span class="chip-text">{{ suggestion.text }}</span>
    <span v-if="showKeyword" class="chip-keyword">#{{ suggestion.matchedKeyword }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Suggestion } from '../composables/useSuggester'

interface Props {
  suggestion: Suggestion
  isFocused?: boolean
  isPicked?: boolean
  showKeyword?: boolean
}

withDefaults(defineProps<Props>(), {
  isFocused: false,
  isPicked: false,
  showKeyword: false,
})

defineEmits<{
  pick: [suggestion: Suggestion]
}>()
</script>

<style scoped>
.suggester-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border: 1.5px solid #334155;
  border-radius: 9999px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.8rem;
  line-height: 1.4;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s,
    transform 0.1s;
  white-space: nowrap;
  font-family: inherit;
}

.suggester-chip:hover {
  border-color: #3b82f6;
  background: #1e3a5f;
  color: #f1f5f9;
}

.suggester-chip.focused {
  border-color: #3b82f6;
  background: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  transform: scale(1.02);
}

.suggester-chip.picked {
  border-color: #22c55e;
  background: #14532d;
  color: #bbf7d0;
}

.chip-text {
  flex: 1;
  text-align: left;
}

.chip-keyword {
  font-size: 0.65rem;
  color: #64748b;
  padding: 0.1rem 0.3rem;
  background: #0f172a;
  border-radius: 4px;
  flex-shrink: 0;
}

.suggester-chip.picked .chip-keyword {
  color: #86efac;
}
</style>
