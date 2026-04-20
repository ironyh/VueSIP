<template>
  <section class="breakdown" aria-live="polite">
    <div v-if="!isVisible" class="breakdown__idle" role="status">
      <span class="breakdown__idle-label">Breakdown</span>
      <span class="breakdown__idle-value">Idle</span>
      <span class="breakdown__idle-hint">
        {{
          isSimulationMode
            ? 'Run the "Active Call" or "Hold" scenario'
            : 'Start a call to see active and hold time split out'
        }}
      </span>
    </div>

    <div v-else class="breakdown__stage">
      <div class="breakdown__head">
        <span class="breakdown__head-label">Call phases</span>
        <span class="breakdown__head-name">{{
          effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown'
        }}</span>
      </div>

      <div class="breakdown__hero">
        <div class="breakdown__hero-card">
          <span class="breakdown__hero-label">Active talk time</span>
          <span class="breakdown__hero-value">{{ formatMMSS(activeSeconds) }}</span>
        </div>
        <div class="breakdown__hero-card">
          <span class="breakdown__hero-label">Hold time</span>
          <span class="breakdown__hero-value">{{ formatMMSS(holdSeconds) }}</span>
        </div>
        <div class="breakdown__hero-card">
          <span class="breakdown__hero-label">Session total</span>
          <span class="breakdown__hero-value">{{ formatMMSS(totalSeconds) }}</span>
        </div>
      </div>

      <div class="breakdown__bar" aria-hidden="true">
        <div class="breakdown__bar-active" :style="{ width: activePct + '%' }"></div>
        <div class="breakdown__bar-hold" :style="{ width: holdPct + '%' }"></div>
      </div>

      <dl class="breakdown__stats">
        <div>
          <dt>Talking</dt>
          <dd>{{ activePct.toFixed(0) }}%</dd>
        </div>
        <div>
          <dt>On hold</dt>
          <dd>{{ holdPct.toFixed(0) }}%</dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd>{{ effectiveCallState }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatMMSS } from './formatters'
import { useCallTimerDemoContext } from './sharedContext'

const { callSession, simulation } = useCallTimerDemoContext()

const holdSecondsBase = ref(0)
const holdStartedAt = ref<number | null>(null)

const isSimulationMode = computed(() => simulation.isSimulationMode.value)
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
const effectiveIsOnHold = computed(() =>
  isSimulationMode.value ? simulation.isOnHold.value : callSession.isOnHold.value
)

const tick = ref(0)
let intervalId: number | null = null

const isVisible = computed(
  () =>
    effectiveCallState.value === 'active' ||
    effectiveCallState.value === 'held' ||
    effectiveIsOnHold.value ||
    holdSecondsBase.value > 0
)

const holdSeconds = computed(() => {
  tick.value
  if (!effectiveIsOnHold.value || holdStartedAt.value === null) {
    return holdSecondsBase.value
  }
  return holdSecondsBase.value + Math.floor((Date.now() - holdStartedAt.value) / 1000)
})

const activeSeconds = computed(() => effectiveDuration.value)
const totalSeconds = computed(() => activeSeconds.value + holdSeconds.value)

const activePct = computed(() => {
  if (totalSeconds.value === 0) return 0
  return (activeSeconds.value / totalSeconds.value) * 100
})

const holdPct = computed(() => {
  if (totalSeconds.value === 0) return 0
  return (holdSeconds.value / totalSeconds.value) * 100
})

watch(
  effectiveIsOnHold,
  (isOnHold, wasOnHold) => {
    if (isOnHold && !wasOnHold) {
      holdStartedAt.value = Date.now()
      return
    }

    if (!isOnHold && wasOnHold && holdStartedAt.value !== null) {
      holdSecondsBase.value += Math.floor((Date.now() - holdStartedAt.value) / 1000)
      holdStartedAt.value = null
    }
  },
  { immediate: true }
)

watch(effectiveCallState, (state, previousState) => {
  if (state === 'terminated' || state === 'failed' || state === 'idle') {
    holdSecondsBase.value = 0
    holdStartedAt.value = null
  }

  if (previousState === 'held' && state === 'active' && holdStartedAt.value !== null) {
    holdSecondsBase.value += Math.floor((Date.now() - holdStartedAt.value) / 1000)
    holdStartedAt.value = null
  }
})

onMounted(() => {
  intervalId = window.setInterval(() => {
    if (effectiveIsOnHold.value) tick.value++
  }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})
</script>

<style scoped>
.breakdown {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --accent-soft: #eab308;
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.breakdown__idle {
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

.breakdown__idle-label {
  color: var(--muted);
}
.breakdown__idle-value {
  color: var(--ink);
  font-weight: 700;
}
.breakdown__idle-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.breakdown__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.breakdown__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.breakdown__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}

.breakdown__head-name {
  font-family: var(--mono);
  font-size: 0.92rem;
}

.breakdown__hero {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

@media (max-width: 640px) {
  .breakdown__hero {
    grid-template-columns: 1fr;
  }
}

.breakdown__hero-card {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.8rem 0.9rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.breakdown__hero-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.breakdown__hero-value {
  font-family: var(--mono);
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.breakdown__bar {
  display: flex;
  height: 0.9rem;
  border: 1px solid var(--rule);
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--paper) 70%, transparent);
}

.breakdown__bar-active {
  background: var(--accent);
}

.breakdown__bar-hold {
  background: var(--accent-soft);
}

.breakdown__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0;
}

@media (max-width: 640px) {
  .breakdown__stats {
    grid-template-columns: 1fr;
  }
}

.breakdown__stats > div {
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: color-mix(in srgb, var(--paper) 75%, transparent);
}

.breakdown__stats dt {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.breakdown__stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}
</style>
