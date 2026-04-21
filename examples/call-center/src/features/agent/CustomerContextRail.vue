<template>
  <section class="customer-context card" aria-label="Customer context">
    <header class="context-header">
      <div>
        <h2>Customer Context</h2>
        <p>Selected callback or active caller context with SLA and case pressure.</p>
      </div>
      <div class="badge-stack">
        <span
          v-if="context.accountTier"
          class="context-pill account-tier"
          data-testid="customer-context-account-tier"
        >
          {{ context.accountTier }}
        </span>
        <span class="workspace-badge" :class="workspaceState">{{ workspaceLabel }}</span>
      </div>
    </header>

    <div class="context-pills">
      <span v-if="context.serviceLevel" class="context-pill">
        {{ context.serviceLevel }}
      </span>
      <span
        v-if="context.accountHealth"
        class="context-pill"
        :class="`health-${context.accountHealth}`"
        data-testid="customer-context-account-health"
      >
        {{ healthLabel }}
      </span>
    </div>

    <dl class="context-grid">
      <div>
        <dt>Customer</dt>
        <dd>{{ context.displayName || 'Unknown Caller' }}</dd>
      </div>
      <div>
        <dt>Address</dt>
        <dd>{{ context.address || 'No address yet' }}</dd>
      </div>
      <div>
        <dt>Queue</dt>
        <dd>{{ context.queue || 'No queue selected' }}</dd>
      </div>
      <div>
        <dt>Last Outcome</dt>
        <dd>{{ context.latestDisposition || 'No prior outcome' }}</dd>
      </div>
      <div>
        <dt>Open Case</dt>
        <dd data-testid="customer-context-open-case">
          {{ context.openCaseTitle || 'No active case title' }}
        </dd>
      </div>
      <div>
        <dt>Last Interaction</dt>
        <dd>{{ context.lastInteractionAt || 'No recent touchpoint' }}</dd>
      </div>
    </dl>

    <div class="context-note">
      <strong>Summary:</strong>
      <span>{{ context.noteSummary || 'No prior note summary' }}</span>
    </div>

    <div class="context-note callback-reason">
      <strong>Callback Reason:</strong>
      <span>{{ context.callbackReason || 'No callback prompt selected' }}</span>
    </div>

    <div class="callback-state">
      <span :class="{ open: context.hasOpenCallback || pendingCallbackCount > 0 }">
        {{
          pendingCallbackCount > 0
            ? `${pendingCallbackCount} callback tasks open`
            : 'No open callbacks'
        }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentWorkspaceState, CustomerContextView } from '../shared/mvp-types'

const props = defineProps<{
  context: CustomerContextView
  workspaceState: AgentWorkspaceState
  pendingCallbackCount: number
}>()

const workspaceLabel = computed(() => {
  switch (props.workspaceState) {
    case 'wrap-up':
      return 'Wrap-Up'
    case 'ringing':
      return 'Incoming'
    case 'busy':
      return 'On Call'
    case 'attention':
      return 'Attention'
    case 'available':
      return 'Available'
    default:
      return 'Idle'
  }
})

const healthLabel = computed(() => {
  switch (props.context.accountHealth) {
    case 'healthy':
      return 'Healthy account'
    case 'watch':
      return 'Watch account'
    case 'at-risk':
      return 'At-risk account'
    default:
      return ''
  }
})
</script>

<style scoped>
.customer-context {
  background: white;
  margin-bottom: 1rem;
}

.context-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.context-header h2 {
  font-size: 1.125rem;
  margin: 0;
}

.context-header p {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.badge-stack,
.context-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.context-pills {
  margin-bottom: 1rem;
}

.context-pill,
.workspace-badge {
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e5e7eb;
  color: #374151;
}

.workspace-badge.ringing {
  background: #dbeafe;
  color: #1d4ed8;
}

.workspace-badge.busy {
  background: #fee2e2;
  color: #b91c1c;
}

.workspace-badge.wrap-up {
  background: #fef3c7;
  color: #b45309;
}

.workspace-badge.available {
  background: #dcfce7;
  color: #166534;
}

.workspace-badge.attention {
  background: #ffedd5;
  color: #c2410c;
}

.context-pill {
  background: #eff6ff;
  color: #1d4ed8;
}

.context-pill.account-tier {
  background: #ecfccb;
  color: #3f6212;
}

.context-pill.health-healthy {
  background: #dcfce7;
  color: #166534;
}

.context-pill.health-watch {
  background: #fef3c7;
  color: #b45309;
}

.context-pill.health-at-risk {
  background: #fee2e2;
  color: #b91c1c;
}

.context-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0 0 1rem;
}

.context-grid dt {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.context-grid dd {
  margin: 0.25rem 0 0;
  color: #111827;
}

.context-note {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  color: #374151;
}

.callback-reason {
  margin-top: 0.75rem;
}

.callback-state {
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.callback-state .open {
  color: #1d4ed8;
  font-weight: 600;
}

@media (max-width: 640px) {
  .context-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
