<template>
  <div class="simulation-controls" :class="{ active: isSimulationMode }">
    <!-- Toggle Button -->
    <div class="simulation-header">
      <button
        class="simulation-toggle"
        :class="{ active: isSimulationMode }"
        @click="toggleSimulation"
      >
        <span class="toggle-icon">{{ isSimulationMode ? '🎭' : '🔌' }}</span>
        <span class="toggle-text">{{ isSimulationMode ? 'Simulation Mode' : 'Live Mode' }}</span>
        <span class="toggle-indicator" :class="{ on: isSimulationMode }"></span>
      </button>
    </div>

    <!-- Simulation Panel (expanded when active) -->
    <div v-if="isSimulationMode" key="simulation-panel" class="simulation-panel">
      <div class="panel-header">
        <h4>Simulation Scenarios</h4>
        <button class="reset-btn" @click="resetCall" title="Reset to idle">
          🔄 Reset
        </button>
      </div>

      <!-- Scenario Buttons -->
      <div class="scenario-grid">
        <button
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="scenario-btn"
          :class="{ active: activeScenario === scenario.id }"
          @click="runScenario(scenario.id)"
          :title="scenario.description"
        >
          <span class="scenario-icon">{{ scenario.icon }}</span>
          <span class="scenario-name">{{ scenario.name }}</span>
        </button>
      </div>

      <!-- Current State Display -->
      <div v-if="state !== 'idle'" key="current-state" class="current-state">
        <div class="state-header">
          <span class="state-badge" :class="state">{{ state }}</span>
          <span v-if="duration > 0" class="state-duration">{{ formatDuration(duration) }}</span>
        </div>

        <div class="state-info">
          <span class="remote-name">{{ remoteDisplayName || remoteUri }}</span>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button
            v-if="state === 'ringing'"
            class="action-btn answer"
            @click="answer"
          >
            ✅ Answer
          </button>
          <button
            v-if="state === 'active' || state === 'on-hold'"
            class="action-btn hold"
            @click="toggleHold"
          >
            {{ isOnHold ? '▶️ Resume' : '⏸️ Hold' }}
          </button>
          <button
            v-if="state === 'active' || state === 'on-hold'"
            class="action-btn mute"
            @click="toggleMute"
          >
            {{ isMuted ? '🔊 Unmute' : '🔇 Mute' }}
          </button>
          <button
            v-if="state !== 'idle' && state !== 'ended'"
            class="action-btn hangup"
            @click="hangup"
          >
            📵 End
          </button>
        </div>
      </div>

      <!-- Help Text -->
      <div class="simulation-help">
        <p>💡 Use simulation mode to test UI features without a real SIP connection</p>
      </div>
    </div>

    <!-- Collapsed hint when not in simulation mode -->
    <div v-else key="simulation-hint" class="simulation-hint">
      <span>No SIP connection? Enable simulation mode to test features</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import type { SimulationScenario } from '../composables/useSimulation'

// Props - receive simulation state from parent
const props = defineProps<{
  isSimulationMode: boolean
  activeScenario: string | null
  state: string
  duration: number
  remoteUri: string
  remoteDisplayName: string
  isOnHold: boolean
  isMuted: boolean
  scenarios: SimulationScenario[]
}>()

// Emits
const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'runScenario', scenarioId: string): void
  (e: 'reset'): void
  (e: 'answer'): void
  (e: 'hangup'): void
  (e: 'toggleHold'): void
  (e: 'toggleMute'): void
}>()

// Methods
const toggleSimulation = () => emit('toggle')
const runScenario = (id: string) => emit('runScenario', id)
const resetCall = () => emit('reset')
const answer = () => emit('answer')
const hangup = () => emit('hangup')
const toggleHold = () => emit('toggleHold')
const toggleMute = () => emit('toggleMute')

// Format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.simulation-controls {
  background: var(--bg-secondary, #f8fafc);
  border: 2px dashed var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.simulation-controls.active {
  border-style: solid;
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(168, 85, 247, 0.05));
}

.simulation-header {
  display: flex;
  justify-content: center;
}

.simulation-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-primary, white);
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.simulation-toggle:hover {
  border-color: #8b5cf6;
  transform: translateY(-1px);
}

.simulation-toggle.active {
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-color: transparent;
  color: white;
}

.toggle-icon {
  font-size: 1.25rem;
}

.toggle-text {
  font-size: 0.875rem;
}

.toggle-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #94a3b8;
  transition: all 0.2s;
}

.toggle-indicator.on {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

.simulation-panel {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.panel-header h4 {
  margin: 0;
  font-size: 0.875rem;
  color: #8b5cf6;
  font-weight: 600;
}

.reset-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: var(--bg-primary, white);
  border-color: #8b5cf6;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.scenario-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.scenario-btn:hover {
  border-color: #8b5cf6;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
}

.scenario-btn.active {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: white;
}

.scenario-icon {
  font-size: 1.25rem;
}

.scenario-name {
  font-size: 0.75rem;
  font-weight: 500;
}

.current-state {
  background: var(--bg-primary, white);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.state-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.state-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.state-badge.idle { background: #e2e8f0; color: #64748b; }
.state-badge.ringing { background: #fef3c7; color: #d97706; }
.state-badge.connecting { background: #dbeafe; color: #2563eb; }
.state-badge.active { background: #dcfce7; color: #16a34a; }
.state-badge.on-hold { background: #fce7f3; color: #db2777; }
.state-badge.ended { background: #fee2e2; color: #dc2626; }

.state-duration {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: #8b5cf6;
}

.state-info {
  margin-bottom: 0.75rem;
}

.remote-name {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.answer {
  background: #dcfce7;
  color: #16a34a;
}

.action-btn.answer:hover {
  background: #16a34a;
  color: white;
}

.action-btn.hold {
  background: #fef3c7;
  color: #d97706;
}

.action-btn.hold:hover {
  background: #d97706;
  color: white;
}

.action-btn.mute {
  background: #e0e7ff;
  color: #4f46e5;
}

.action-btn.mute:hover {
  background: #4f46e5;
  color: white;
}

.action-btn.hangup {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn.hangup:hover {
  background: #dc2626;
  color: white;
}

.simulation-help {
  text-align: center;
}

.simulation-help p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.simulation-hint {
  text-align: center;
  padding: 0.5rem;
}

.simulation-hint span {
  font-size: 0.8125rem;
  color: var(--text-secondary, #64748b);
}

@media (max-width: 640px) {
  .scenario-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .scenario-name {
    font-size: 0.6875rem;
  }
}
</style>
