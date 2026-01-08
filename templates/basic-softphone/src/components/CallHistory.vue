<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import type { CallHistoryEntry } from 'vuesip'

const props = defineProps<{
  entries: readonly CallHistoryEntry[]
}>()

const emit = defineEmits<{
  call: [number: string]
  clear: []
}>()

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(d)
  }
}

function getStatus(entry: CallHistoryEntry): string {
  if (entry.wasMissed) return 'missed'
  if (!entry.wasAnswered) return 'rejected'
  return 'completed'
}

const sortedEntries = computed(() =>
  [...props.entries].sort((a, b) => {
    const dateA = a.startTime instanceof Date ? a.startTime : new Date(a.startTime)
    const dateB = b.startTime instanceof Date ? b.startTime : new Date(b.startTime)
    return dateB.getTime() - dateA.getTime()
  })
)

function handleCallback(entry: CallHistoryEntry) {
  emit('call', entry.remoteUri)
}
</script>

<template>
  <div class="call-history">
    <div class="history-header">
      <h3>Recent Calls</h3>
      <Button
        v-if="entries.length > 0"
        label="Clear"
        icon="pi pi-trash"
        class="p-button-text p-button-sm"
        @click="emit('clear')"
      />
    </div>

    <div v-if="entries.length === 0" class="empty-state">
      <i class="pi pi-history" />
      <p>No recent calls</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="entry in sortedEntries"
        :key="entry.id"
        class="history-entry"
        :class="{ missed: entry.wasMissed }"
      >
        <div class="entry-icon">
          <i
            :class="[
              'pi',
              entry.direction === 'incoming' ? 'pi-phone-incoming' : 'pi-phone-outgoing',
              entry.wasMissed ? 'missed' : ''
            ]"
          />
        </div>
        <div class="entry-details">
          <div class="entry-name">
            {{ entry.remoteDisplayName || entry.remoteUri }}
          </div>
          <div class="entry-meta">
            <span class="entry-date">{{ formatDate(entry.startTime) }}</span>
            <span class="entry-time">{{ formatTime(entry.startTime) }}</span>
            <span v-if="entry.wasAnswered" class="entry-duration">
              {{ formatDuration(entry.duration) }}
            </span>
            <span v-else class="entry-status">{{ getStatus(entry) }}</span>
          </div>
        </div>
        <Button
          icon="pi pi-phone"
          class="p-button-rounded p-button-success p-button-sm"
          @click="handleCallback(entry)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.call-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-50);
  border-radius: 8px;
}

.history-entry.missed {
  background: var(--red-50);
}

.entry-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-icon i {
  font-size: 1rem;
  color: var(--text-color-secondary);
}

.entry-icon i.missed {
  color: var(--red-500);
}

.entry-details {
  flex: 1;
  min-width: 0;
}

.entry-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-meta {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.entry-status {
  text-transform: capitalize;
}

.missed .entry-status {
  color: var(--red-500);
}
</style>
