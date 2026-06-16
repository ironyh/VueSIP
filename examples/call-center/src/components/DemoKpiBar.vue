<template>
  <section class="demo-kpi-bar" data-testid="call-center-kpis" aria-label="Demo KPIs">
    <article class="kpi-card" data-testid="kpi-active-scenario">
      <span class="kpi-label">Scenario</span>
      <strong class="kpi-value">{{ activeScenario }}</strong>
    </article>
    <article class="kpi-card" data-testid="kpi-queue-load">
      <span class="kpi-label">Queue Load</span>
      <strong class="kpi-value">{{ queueLoad }}</strong>
    </article>
    <article class="kpi-card" data-testid="kpi-open-callbacks">
      <span class="kpi-label">Open Callbacks</span>
      <strong class="kpi-value">{{ openCallbacks }}</strong>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  activeScenario: 'support' | 'billing' | 'sales'
  queueLoad: number
  openCallbacks: number
}>()
</script>

<style scoped>
.demo-kpi-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.kpi-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #dbeafe;
  border-radius: 14px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.kpi-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 700;
}

.kpi-value {
  font-size: 1.1rem;
  color: #0f172a;
}

@media (max-width: 1200px) {
  .demo-kpi-bar {
    grid-template-columns: 1fr;
  }
}
</style>
