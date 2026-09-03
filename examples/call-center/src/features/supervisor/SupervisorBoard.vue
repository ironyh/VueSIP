<template>
  <section
    class="supervisor-board card"
    aria-label="Supervisor board"
    data-testid="supervisor-board"
  >
    <header class="board-header">
      <div>
        <h2>Supervisor Board</h2>
        <p>Read-only operational oversight with callback reassignment only.</p>
      </div>
    </header>

    <div class="board-grid">
      <section>
        <h3>Queues</h3>
        <ul class="simple-list">
          <li
            v-for="queue in queueRows"
            :key="queue.queue"
            :data-testid="`queue-summary-${queue.queue}`"
          >
            <strong>{{ queue.queue }}</strong>
            <span>{{ queue.waitingCalls }} waiting</span>
            <span>{{ queue.longestWaitSeconds }}s longest wait</span>
          </li>
          <li v-if="queueRows.length === 0" class="empty-row">No queue pressure</li>
        </ul>
      </section>

      <section>
        <h3>Agents</h3>
        <ul class="simple-list">
          <li
            v-for="agent in agentRows"
            :key="agent.agentId"
            :data-testid="`agent-summary-${agent.agentId}`"
          >
            <strong>{{ agent.agentId }}</strong>
            <span>{{ agent.status }}</span>
            <span>{{ agent.workspaceState }}</span>
            <span v-if="agent.activeCallId" class="spy-controls">
              <button
                class="spy-btn"
                :data-testid="`supervisor-listen-${agent.agentId}`"
                @click="$emit('spy', agent.agentId, 'listen')"
                aria-label="Listen to agent call"
              >
                Listen
              </button>
              <button
                class="spy-btn spy-barge"
                :data-testid="`supervisor-barge-${agent.agentId}`"
                @click="$emit('spy', agent.agentId, 'barge')"
                aria-label="Barge in on agent call"
              >
                Barge
              </button>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <section class="alerts-section">
      <h3>Alerts</h3>
      <ul class="simple-list">
        <li
          v-for="alert in alertRows"
          :key="alert.id"
          :class="`severity-${alert.severity}`"
          :data-testid="`alert-row-${alert.id}`"
        >
          <strong>{{ alert.severity }}</strong>
          <span>{{ alert.message }}</span>
        </li>
        <li v-if="alertRows.length === 0" class="empty-row">No active alerts</li>
      </ul>
    </section>

    <section class="reassign-section">
      <h3>Callback Reassignment</h3>
      <ul class="simple-list">
        <li
          v-for="callback in callbackRows"
          :key="callback.id"
          :data-testid="`supervisor-callback-${callback.id}`"
        >
          <div class="callback-row">
            <span>{{ callback.contactName || callback.targetUri }}</span>
            <span>{{ callback.assignee }}</span>
            <button
              class="btn btn-secondary btn-sm"
              type="button"
              :data-testid="`supervisor-reassign-${callback.id}`"
              @click="$emit('reassign', callback.id)"
            >
              Reassign
            </button>
          </div>
        </li>
        <li v-if="callbackRows.length === 0" class="empty-row">No open callback tasks</li>
      </ul>
    </section>
  </section>
</template>

<script setup lang="ts">
import type {
  SupervisorAgentRow,
  SupervisorAlertRow,
  SupervisorQueueRow,
} from './useSupervisorBoard'
import type { CallbackTaskView } from '../shared/mvp-types'

defineProps<{
  queueRows: SupervisorQueueRow[]
  agentRows: SupervisorAgentRow[]
  alertRows: SupervisorAlertRow[]
  callbackRows: CallbackTaskView[]
}>()

defineEmits<{
  reassign: [callbackId: string]
  spy: [agentId: string, mode: 'listen' | 'barge']
}>()
</script>

<style scoped>
.supervisor-board {
  background: white;
}

.board-header {
  margin-bottom: 1rem;
}

.board-header h2,
.alerts-section h3,
.reassign-section h3 {
  margin: 0 0 0.25rem;
}

.board-header p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.simple-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.simple-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
}

.callback-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.75rem;
}

.severity-warning {
  border-color: #fbbf24;
  background: #fffbeb;
}

.severity-critical {
  border-color: #f87171;
  background: #fef2f2;
}

.empty-row {
  color: #6b7280;
}

@media (max-width: 1200px) {
  .board-grid {
    grid-template-columns: 1fr;
  }
}

.spy-controls {
  display: inline-flex;
  gap: 0.25rem;
  margin-left: auto;
}

.spy-btn {
  padding: 0.15rem 0.5rem;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  background: transparent;
  color: #3b82f6;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
}

.spy-btn:hover {
  background: #3b82f6;
  color: #ffffff;
}

.spy-barge {
  border-color: #ef4444;
  color: #ef4444;
}

.spy-barge:hover {
  background: #ef4444;
  color: #ffffff;
}
</style>
