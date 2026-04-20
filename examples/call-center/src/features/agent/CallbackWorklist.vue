<template>
  <section class="callback-worklist card" aria-label="Callback worklist">
    <header class="worklist-header">
      <div>
        <h2>Callback Worklist</h2>
        <p>Outbound calls can only start from queued callback work.</p>
      </div>
      <button
        class="btn btn-primary btn-sm"
        type="button"
        :disabled="!canStartOutbound"
        @click="$emit('start')"
      >
        Start Callback
      </button>
    </header>

    <div v-if="callbacks.length === 0" class="empty-state">
      <p>No callback tasks open.</p>
    </div>

    <ul v-else class="callback-list">
      <li
        v-for="callback in callbacks"
        :key="callback.id"
        class="callback-row"
        :class="{ selected: callback.id === selectedCallbackId }"
      >
        <button class="callback-select" type="button" @click="$emit('select', callback.id)">
          <div class="callback-main">
            <div class="callback-title">
              <strong>{{ callback.contactName || callback.targetUri }}</strong>
              <span class="status-pill" :class="callback.status">{{ callback.status }}</span>
            </div>
            <div class="callback-meta">
              <span>{{ callback.queue }}</span>
              <span>{{ callback.assignee }}</span>
              <span>{{ formatDueState(callback.dueAt) }}</span>
            </div>
            <p class="callback-reason">{{ callback.reason }}</p>
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { CallbackTaskView } from '../shared/mvp-types'

defineProps<{
  callbacks: CallbackTaskView[]
  selectedCallbackId: string | null
  canStartOutbound: boolean
}>()

defineEmits<{
  select: [callbackId: string]
  start: []
}>()

const formatDueState = (dueAt: Date) => {
  const diffMs = dueAt.getTime() - Date.now()

  if (diffMs < 0) {
    return 'Overdue'
  }

  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes <= 1) {
    return 'Due now'
  }

  return `Due in ${diffMinutes}m`
}
</script>

<style scoped>
.callback-worklist {
  background: white;
}

.worklist-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.worklist-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
}

.worklist-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.empty-state {
  color: #6b7280;
}

.callback-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.callback-row {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.callback-row.selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}

.callback-select {
  width: 100%;
  padding: 0.875rem;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.callback-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.callback-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.callback-reason {
  margin: 0;
  color: #111827;
  font-size: 0.875rem;
}

.status-pill {
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: #e5e7eb;
  color: #374151;
}

.status-pill.open {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill.in-progress {
  background: #fef3c7;
  color: #b45309;
}

.status-pill.completed {
  background: #dcfce7;
  color: #166534;
}
</style>
