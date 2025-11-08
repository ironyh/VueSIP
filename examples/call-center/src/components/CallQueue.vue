<template>
  <div class="call-queue card">
    <h2>Call Queue</h2>

    <!-- Queue Announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ queueAnnouncement }}
    </div>

    <div v-if="queue.length === 0" class="empty-state">
      <p>No calls in queue</p>
      <p class="helper-text">
        {{ agentStatus === 'available' ? 'Waiting for incoming calls...' : 'Set status to Available to receive calls' }}
      </p>
    </div>

    <div v-else class="queue-table-wrapper">
      <table class="queue-table">
        <caption class="sr-only">
          Call Queue: {{ queue.length }} {{ queue.length === 1 ? 'call' : 'calls' }} waiting
        </caption>
        <thead>
          <tr>
            <th scope="col">Caller</th>
            <th scope="col">Wait Time</th>
            <th scope="col">Priority</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="call in sortedQueue"
            :key="call.id"
            :class="{ urgent: call.waitTime > 60 }"
          >
            <td>
              <div class="caller-info">
                <div class="caller-name">{{ call.displayName || 'Unknown' }}</div>
                <div class="caller-number">{{ formatUri(call.from) }}</div>
              </div>
            </td>
            <td>
              <span :class="{ 'wait-urgent': call.waitTime > 60 }">
                {{ formatWaitTime(call.waitTime) }}
                <span v-if="call.waitTime > 60" class="sr-only">(Urgent)</span>
              </span>
            </td>
            <td>
              <span class="priority-badge" :class="`priority-${call.priority || 1}`">
                {{ getPriorityText(call.priority || 1) }}
              </span>
            </td>
            <td>
              <button
                class="btn btn-success btn-sm"
                :disabled="agentStatus !== 'available'"
                @click="handleAnswerCall(call)"
                :aria-label="`Answer call from ${call.displayName || 'Unknown'}, waiting ${formatWaitTime(call.waitTime)}`"
              >
                Answer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="queue.length > 0" class="queue-summary" aria-live="polite" aria-atomic="true">
      <span>{{ queue.length }} {{ queue.length === 1 ? 'call' : 'calls' }} waiting</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ============================================================================
// Types
// ============================================================================

interface QueuedCall {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  queue: QueuedCall[]
  agentStatus: 'available' | 'busy' | 'away'
}>()

const emit = defineEmits<{
  answer: [call: QueuedCall]
  'queue-update': [announcement: string]
}>()

// ============================================================================
// State
// ============================================================================

const queueAnnouncement = ref('')
const previousQueueLength = ref(props.queue.length)

// ============================================================================
// Computed
// ============================================================================

/**
 * Sort queue by priority (highest first) and wait time (longest first)
 */
const sortedQueue = computed(() => {
  return [...props.queue].sort((a, b) => {
    // First by priority (higher priority first)
    if ((a.priority || 0) !== (b.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0)
    }
    // Then by wait time (longer wait first)
    return b.waitTime - a.waitTime
  })
})

// ============================================================================
// Methods
// ============================================================================

const formatUri = (uri: string): string => {
  // Extract username from SIP URI
  const match = uri.match(/sip:([^@]+)/)
  return match ? match[1] : uri
}

const formatWaitTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins === 0) {
    return `${secs}s`
  }
  return `${mins}m ${secs}s`
}

const getPriorityText = (priority: number): string => {
  switch (priority) {
    case 3:
      return 'High'
    case 2:
      return 'Medium'
    case 1:
    default:
      return 'Normal'
  }
}

const handleAnswerCall = (call: QueuedCall) => {
  const announcement = `Answering call from ${call.displayName || 'Unknown caller'}`
  queueAnnouncement.value = announcement
  emit('queue-update', announcement)
  emit('answer', call)

  setTimeout(() => {
    queueAnnouncement.value = ''
  }, 1000)
}

// Watch for queue length changes
watch(() => props.queue.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    const diff = newLength - oldLength
    const announcement = diff === 1
      ? 'New call in queue'
      : `${diff} new calls in queue`
    queueAnnouncement.value = announcement
    emit('queue-update', announcement)

    setTimeout(() => {
      queueAnnouncement.value = ''
    }, 2000)
  }
  previousQueueLength.value = newLength
})
</script>

<style scoped>
/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.call-queue {
  background: white;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.call-queue h2 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #111827;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
}

.empty-state p {
  margin-bottom: 0.5rem;
}

.helper-text {
  font-size: 0.875rem;
  color: #9ca3af;
}

.queue-table-wrapper {
  flex: 1;
  overflow-y: auto;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.queue-table thead th {
  text-align: left;
  padding: 0.75rem;
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 1;
}

.queue-table tbody td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.queue-table tbody tr:hover {
  background: #f9fafb;
}

.queue-table tbody tr.urgent {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.queue-table tbody tr.urgent:hover {
  background: #fef3c7;
}

.caller-info {
  display: flex;
  flex-direction: column;
}

.caller-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.caller-number {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.wait-urgent {
  color: #f59e0b;
  font-weight: 600;
}

.priority-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.priority-badge.priority-1 {
  background: #e5e7eb;
  color: #374151;
}

.priority-badge.priority-2 {
  background: #dbeafe;
  color: #1e40af;
}

.priority-badge.priority-3 {
  background: #fee2e2;
  color: #991b1b;
}

.queue-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}
</style>
