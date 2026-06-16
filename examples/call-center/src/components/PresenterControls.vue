<template>
  <section
    class="presenter-controls card"
    data-testid="presenter-controls"
    aria-label="Demo presenter controls"
  >
    <div class="presenter-copy">
      <h2>Presenter Controls</h2>
      <p>Drive the story without waiting for the demo timer.</p>
    </div>
    <div class="presenter-scenarios" role="group" aria-label="Presenter scenario">
      <button
        class="scenario-chip"
        :class="{ active: activeScenario === 'support' }"
        type="button"
        data-testid="presenter-scenario-support"
        @click="$emit('set-scenario', 'support')"
      >
        Support
      </button>
      <button
        class="scenario-chip"
        :class="{ active: activeScenario === 'billing' }"
        type="button"
        data-testid="presenter-scenario-billing"
        @click="$emit('set-scenario', 'billing')"
      >
        Billing
      </button>
      <button
        class="scenario-chip"
        :class="{ active: activeScenario === 'sales' }"
        type="button"
        data-testid="presenter-scenario-sales"
        @click="$emit('set-scenario', 'sales')"
      >
        Sales
      </button>
    </div>
    <div class="story-grid" role="group" aria-label="Presenter story scenes">
      <button
        class="story-card"
        type="button"
        data-testid="presenter-scene-peak-hour"
        @click="$emit('run-scene', 'peak-hour')"
      >
        <strong>Peak Hour</strong>
        <span>Load support queue pressure plus one overdue callback.</span>
      </button>
      <button
        class="story-card"
        type="button"
        data-testid="presenter-scene-vip-escalation"
        @click="$emit('run-scene', 'vip-escalation')"
      >
        <strong>VIP Escalation</strong>
        <span>One high-SLA caller with an escalation-safe callback task.</span>
      </button>
      <button
        class="story-card"
        type="button"
        data-testid="presenter-scene-billing-backlog"
        @click="$emit('run-scene', 'billing-backlog')"
      >
        <strong>Billing Backlog</strong>
        <span>Show overdue finance callbacks and a waiting billing queue.</span>
      </button>
      <button
        class="story-card"
        type="button"
        data-testid="presenter-scene-callback-recovery"
        @click="$emit('run-scene', 'callback-recovery')"
      >
        <strong>Callback Recovery</strong>
        <span>Use the worklist as the primary story when the queue is calm.</span>
      </button>
    </div>
    <div class="presenter-actions">
      <button
        class="btn btn-secondary btn-sm"
        type="button"
        data-testid="presenter-force-inbound"
        @click="$emit('force-inbound')"
      >
        Force Inbound Call
      </button>
      <button
        class="btn btn-secondary btn-sm"
        type="button"
        data-testid="presenter-seed-callback"
        @click="$emit('seed-callback')"
      >
        Seed Callback
      </button>
      <button
        class="btn btn-secondary btn-sm"
        type="button"
        data-testid="presenter-reset-demo"
        :disabled="resetDisabled"
        @click="$emit('reset-demo')"
      >
        Reset Demo
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  activeScenario: 'support' | 'billing' | 'sales'
  resetDisabled: boolean
}>()

defineEmits<{
  'set-scenario': [scenario: 'support' | 'billing' | 'sales']
  'run-scene': [scene: 'peak-hour' | 'vip-escalation' | 'billing-backlog' | 'callback-recovery']
  'force-inbound': []
  'seed-callback': []
  'reset-demo': []
}>()
</script>

<style scoped>
.presenter-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 1rem;
  background: linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%);
  border: 1px solid #fdba74;
}

.presenter-copy h2 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: #9a3412;
}

.presenter-copy p {
  margin: 0;
  color: #9a3412;
  font-size: 0.875rem;
}

.presenter-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  grid-column: 1 / -1;
}

.story-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(251, 146, 60, 0.38);
  background: rgba(255, 255, 255, 0.8);
  color: #9a3412;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.story-card:hover {
  transform: translateY(-1px);
}

.story-card strong {
  font-size: 0.88rem;
}

.story-card span {
  font-size: 0.8rem;
  line-height: 1.45;
}

.presenter-scenarios {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.scenario-chip {
  border: 1px solid #fdba74;
  background: rgba(255, 255, 255, 0.75);
  color: #9a3412;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scenario-chip.active {
  background: #ea580c;
  border-color: #ea580c;
  color: white;
}

@media (max-width: 1200px) {
  .presenter-controls {
    grid-template-columns: 1fr;
  }

  .story-grid {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .presenter-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
