<template>
  <div class="billable">
    <div class="billable__controls">
      <label class="billable__label" for="bill-rate">Rate ($/min)</label>
      <input
        id="bill-rate"
        v-model.number="ratePerMinute"
        type="number"
        min="0"
        step="0.01"
        class="billable__input"
      />

      <label class="billable__label" for="bill-increment">Billing increment (s)</label>
      <select id="bill-increment" v-model.number="increment" class="billable__input">
        <option :value="1">1 — per second</option>
        <option :value="6">6 — 1/10 minute</option>
        <option :value="30">30 — half minute</option>
        <option :value="60">60 — per minute</option>
      </select>
    </div>

    <div v-if="!isActive" class="billable__idle">
      <span class="billable__idle-label">Meter</span>
      <span class="billable__idle-value">Idle</span>
      <span class="billable__idle-hint">
        {{
          isSimulationMode
            ? 'Run the "Active Call" scenario to watch the meter tick'
            : 'Start a call to begin billing'
        }}
      </span>
    </div>

    <section v-else class="billable__stage" aria-live="polite" aria-atomic="true">
      <div class="billable__head">
        <span class="billable__pulse" aria-hidden="true"></span>
        <span class="billable__head-label">Metering</span>
        <span class="billable__head-name">{{
          effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown'
        }}</span>
      </div>

      <div class="billable__hero">
        <span class="billable__hero-label">Running charge</span>
        <span class="billable__hero-value">{{ formatCurrency(currentCharge) }}</span>
        <span class="billable__hero-hint"
          >{{ billableSeconds }}s billable · {{ effectiveDuration }}s elapsed</span
        >
      </div>

      <div class="billable__meter" aria-hidden="true">
        <div class="billable__meter-fill" :style="{ width: progressPct + '%' }"></div>
        <span class="billable__meter-text">
          Next increment at {{ nextBoundarySeconds }}s ({{ formatCurrency(nextCharge) }})
        </span>
      </div>

      <div class="billable__breakdown">
        <div>
          <span class="billable__breakdown-label">Billable units</span>
          <span class="billable__breakdown-value">{{ billableUnits }} × {{ increment }}s</span>
        </div>
        <div>
          <span class="billable__breakdown-label">Unit price</span>
          <span class="billable__breakdown-value">{{ formatCurrency(unitPrice) }}</span>
        </div>
        <div>
          <span class="billable__breakdown-label">Rounded from</span>
          <span class="billable__breakdown-value"
            >{{ effectiveDuration }}s → {{ billableSeconds }}s</span
          >
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCallTimerDemoContext } from './sharedContext'

const { callSession, simulation } = useCallTimerDemoContext()
const { isSimulationMode } = simulation

const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : callSession.state.value
)
const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : callSession.duration.value || 0
)
const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : callSession.remoteUri.value
)
const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : callSession.remoteDisplayName.value
)

const ratePerMinute = ref(0.75)
const increment = ref(60)

const isActive = computed(
  () => effectiveCallState.value === 'active' || effectiveCallState.value === 'held'
)

const billableUnits = computed(() => Math.ceil(effectiveDuration.value / increment.value))
const billableSeconds = computed(() => billableUnits.value * increment.value)
const unitPrice = computed(() => (ratePerMinute.value / 60) * increment.value)
const currentCharge = computed(() => billableUnits.value * unitPrice.value)
const nextCharge = computed(() => (billableUnits.value + 1) * unitPrice.value)
const nextBoundarySeconds = computed(() => billableUnits.value * increment.value || increment.value)
const progressPct = computed(() => {
  if (!effectiveDuration.value) return 0
  const within = effectiveDuration.value % increment.value
  return increment.value === 0 ? 0 : (within / increment.value) * 100
})

const formatCurrency = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
</script>

<style scoped>
.billable {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.billable__controls {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 0.5rem 0.75rem;
  align-items: center;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}
@media (max-width: 540px) {
  .billable__controls {
    grid-template-columns: auto 1fr;
  }
}
.billable__label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.billable__input {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.85rem;
}
.billable__input:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.billable__idle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.billable__idle-label {
  color: var(--muted);
}
.billable__idle-value {
  color: var(--ink);
  font-weight: 700;
}
.billable__idle-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.billable__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}
.billable__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}
.billable__pulse {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--accent);
  animation: billable-pulse 1.1s ease-in-out infinite;
}
@keyframes billable-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent);
  }
  70% {
    box-shadow: 0 0 0 8px transparent;
  }
}
.billable__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.billable__head-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}

.billable__hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 1rem 1.1rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
}
.billable__hero-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: color-mix(in srgb, var(--paper) 50%, transparent);
}
.billable__hero-value {
  font-family: var(--mono);
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.billable__hero-hint {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: color-mix(in srgb, var(--paper) 60%, transparent);
  letter-spacing: 0.05em;
}

.billable__meter {
  position: relative;
  height: 2rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  overflow: hidden;
}
.billable__meter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  transition: width 0.3s linear;
}
.billable__meter-text {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink);
  letter-spacing: 0.06em;
}

.billable__breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
@media (max-width: 540px) {
  .billable__breakdown {
    grid-template-columns: 1fr;
  }
}
.billable__breakdown > div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.billable__breakdown-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.billable__breakdown-value {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
</style>
