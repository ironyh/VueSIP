<template>
  <div class="timer">
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="effectiveDuration"
      :remote-uri="effectiveRemoteUri"
      :remote-display-name="effectiveRemoteDisplayName"
      :is-on-hold="effectiveIsOnHold"
      :is-muted="effectiveIsMuted"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <div v-if="!isActive" class="timer__idle" role="status">
      <span class="timer__idle-led" aria-hidden="true"></span>
      <span class="timer__idle-label">Timer</span>
      <span class="timer__idle-value">Idle</span>
      <span class="timer__idle-hint">
        {{
          isSimulationMode
            ? 'Run the "Active Call" scenario'
            : 'Dial or answer a call to start the clock'
        }}
      </span>
    </div>

    <section v-else class="timer__stage" aria-live="polite" aria-atomic="true">
      <div class="timer__head">
        <span class="timer__pulse" aria-hidden="true"></span>
        <span class="timer__head-label">In call</span>
        <span class="timer__head-name">{{
          effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown'
        }}</span>
      </div>

      <div class="timer__hero">
        <span class="timer__hero-label">Duration</span>
        <span class="timer__hero-value">{{ formatMMSS(effectiveDuration) }}</span>
      </div>

      <div class="timer__grid">
        <div class="timer__card">
          <span class="timer__card-label">MM:SS</span>
          <span class="timer__card-value">{{ formatMMSS(effectiveDuration) }}</span>
          <span class="timer__card-desc">Standard format</span>
        </div>
        <div class="timer__card">
          <span class="timer__card-label">HH:MM:SS</span>
          <span class="timer__card-value">{{ formatHHMMSS(effectiveDuration) }}</span>
          <span class="timer__card-desc">Long calls</span>
        </div>
        <div class="timer__card">
          <span class="timer__card-label">Human</span>
          <span class="timer__card-value timer__card-value--prose">{{
            formatHuman(effectiveDuration)
          }}</span>
          <span class="timer__card-desc">Natural language</span>
        </div>
        <div class="timer__card">
          <span class="timer__card-label">Compact</span>
          <span class="timer__card-value">{{ formatCompact(effectiveDuration) }}</span>
          <span class="timer__card-desc">Space-efficient</span>
        </div>
      </div>

      <dl class="timer__stats" aria-label="Raw timer values">
        <div>
          <dt>Total seconds</dt>
          <dd>{{ effectiveDuration }}</dd>
        </div>
        <div>
          <dt>Minutes</dt>
          <dd>{{ Math.floor(effectiveDuration / 60) }}</dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd>{{ Math.floor(effectiveDuration / 3600) }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SimulationControls from '../../components/SimulationControls.vue'
import { formatCompact, formatHHMMSS, formatHuman, formatMMSS } from './formatters'
import { useCallTimerDemoContext } from './sharedContext'

const { callSession, simulation } = useCallTimerDemoContext()
const { isSimulationMode, activeScenario } = simulation

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
const effectiveIsMuted = computed(() =>
  isSimulationMode.value ? simulation.isMuted.value : callSession.isMuted.value
)

const isActive = computed(
  () => effectiveCallState.value === 'active' || effectiveCallState.value === 'held'
)
</script>

<style scoped>
.timer {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --serif: var(--demo-serif, 'Instrument Serif', Georgia, serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.timer__idle {
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
.timer__idle-led {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--muted);
}
.timer__idle-label {
  color: var(--muted);
}
.timer__idle-value {
  color: var(--ink);
  font-weight: 700;
}
.timer__idle-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.timer__stage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.timer__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.timer__pulse {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--accent);
  animation: timer-pulse 1.1s ease-in-out infinite;
}
@keyframes timer-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent);
  }
  70% {
    box-shadow: 0 0 0 8px transparent;
  }
}
.timer__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.timer__head-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}

.timer__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem 0.5rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
  gap: 0.15rem;
}
.timer__hero-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: color-mix(in srgb, var(--paper) 50%, transparent);
}
.timer__hero-value {
  font-family: var(--mono);
  font-size: 3.2rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.timer__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.timer__card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.65rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.timer__card-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--muted);
}
.timer__card-value {
  font-family: var(--mono);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.1rem 0;
}
.timer__card-value--prose {
  font-size: 1.05rem;
  font-family: var(--serif);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
}
.timer__card-desc {
  font-size: 0.7rem;
  color: var(--muted);
}

.timer__stats {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--rule);
}
.timer__stats div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  align-items: center;
}
.timer__stats dt {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.timer__stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
</style>
