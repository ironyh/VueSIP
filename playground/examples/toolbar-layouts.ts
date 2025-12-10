import type { ExampleDefinition } from './types'
import ToolbarLayoutsDemo from '../demos/ToolbarLayoutsDemo.vue'

export const toolbarLayoutsExample: ExampleDefinition = {
  id: 'toolbar-layouts',
  icon: '🎛️',
  title: 'Toolbar Layout Patterns',
  description: 'Interactive demos of different toolbar positions and component arrangements',
  category: 'utility',
  tags: ['UI', 'Layout', 'Patterns', 'Advanced'],
  component: ToolbarLayoutsDemo,
  setupGuide: `
<p>This demo showcases different toolbar layout patterns for VueSIP applications, with live integration of <code>useSipClient</code> and <code>useCallSession</code> composables.</p>

<h4>Key Concepts</h4>
<ul>
  <li><strong>Top Horizontal:</strong> Global navigation and status, always visible</li>
  <li><strong>Left Sidebar:</strong> Traditional navigation, good for desktop apps</li>
  <li><strong>Right Sidebar:</strong> Details panels, settings, notifications</li>
  <strong>Bottom Toolbar:</strong> Mobile-first, thumb-friendly controls</li>
</ul>

<h4>Component Types</h4>
<ul>
  <li><strong>Status Indicators:</strong> Real-time connection and registration state</li>
  <li><strong>Action Buttons:</strong> Interactive controls with hover and active states</li>
  <li><strong>Call Controls:</strong> VueSIP-specific controls (answer, hangup, mute, hold)</li>
  <li><strong>Information Display:</strong> Live call data with duration counter</li>
</ul>

<p><strong>Try it:</strong> Connect from Basic Call Demo, make a call, and switch between layouts to see how the toolbar adapts!</p>
  `,
  codeSnippets: [
    {
      title: 'Top Horizontal Toolbar',
      description: 'Full-width toolbar at the top of the application',
      code: `<template>
  <div class="app">
    <!-- Top Toolbar -->
    <header class="toolbar-top">
      <!-- Status -->
      <div class="status-section">
        <div class="status-item">
          <span class="dot" :class="{ connected: isConnected }"></span>
          <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <div class="status-item">
          <span class="dot" :class="{ connected: isRegistered }"></span>
          <span>{{ isRegistered ? 'Registered' : 'Not Registered' }}</span>
        </div>
      </div>

      <!-- Call Info -->
      <div v-if="session" class="call-info">
        <span class="badge">{{ state }}</span>
        <span>{{ remoteDisplayName || remoteUri }}</span>
        <span class="duration">{{ formattedDuration }}</span>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button v-if="showAnswer" @click="answer()">📞 Answer</button>
        <button v-if="isActive" @click="toggleMute()">
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <button v-if="isActive" @click="hangup()">❌ Hangup</button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- Your app content here -->
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { isConnected, isRegistered } = useSipClient()
const {
  session,
  state,
  remoteUri,
  remoteDisplayName,
  duration,
  isActive,
  isMuted,
  answer,
  hangup,
  mute,
  unmute
} = useCallSession()

const showAnswer = computed(() =>
  state.value === 'ringing' && direction.value === 'incoming'
)

const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
})

const toggleMute = () => isMuted.value ? unmute() : mute()
</script>

<style scoped>
.toolbar-top {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(120deg, #667eea, #764ba2);
  color: white;
}

.status-section {
  display: flex;
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.dot.connected {
  background: #10b981;
}

.call-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.controls {
  display: flex;
  gap: 0.5rem;
}
</style>`,
    },
    {
      title: 'Left Vertical Sidebar',
      description: 'Vertical sidebar for navigation and status',
      code: `<template>
  <div class="app-layout">
    <!-- Left Sidebar -->
    <aside class="sidebar-left">
      <!-- Status Section -->
      <div class="sidebar-section">
        <h4>Status</h4>
        <div class="status-item">
          <span class="dot" :class="{ connected: isConnected }"></span>
          <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <div class="status-item">
          <span class="dot" :class="{ connected: isRegistered }"></span>
          <span>{{ isRegistered ? 'Registered' : 'Not Registered' }}</span>
        </div>
      </div>

      <!-- Call Info Section -->
      <div v-if="session" class="sidebar-section">
        <h4>Active Call</h4>
        <div class="info-row">
          <span class="label">State:</span>
          <span class="value">{{ state }}</span>
        </div>
        <div class="info-row">
          <span class="label">From:</span>
          <span class="value">{{ remoteDisplayName || 'Unknown' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Duration:</span>
          <span class="value">{{ formattedDuration }}</span>
        </div>
      </div>

      <!-- Controls Section -->
      <div v-if="session" class="sidebar-section">
        <h4>Controls</h4>
        <button v-if="showAnswer" @click="answer()" class="btn-block">
          📞 Answer
        </button>
        <button v-if="isActive" @click="toggleMute()" class="btn-block">
          {{ isMuted ? '🔇 Unmute' : '🔊 Mute' }}
        </button>
        <button v-if="isActive" @click="hangup()" class="btn-block btn-danger">
          ❌ Hangup
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="content">
      <!-- Your app content here -->
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { isConnected, isRegistered } = useSipClient()
const {
  session,
  state,
  direction,
  remoteDisplayName,
  duration,
  isActive,
  isMuted,
  answer,
  hangup,
  mute,
  unmute
} = useCallSession()

const showAnswer = computed(() =>
  state.value === 'ringing' && direction.value === 'incoming'
)

const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
})

const toggleMute = () => isMuted.value ? unmute() : mute()
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}

.sidebar-left {
  width: 240px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  color: white;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sidebar-section h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.9;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  opacity: 0.8;
}

.value {
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-block {
  width: 100%;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-weight: 600;
  text-align: left;
}

.btn-danger {
  background: #ef4444;
}

.content {
  flex: 1;
  overflow: auto;
}
</style>`,
    },
    {
      title: 'Right Sidebar for Details',
      description: 'Right-side panel for call details and settings',
      code: `<template>
  <div class="app-layout">
    <!-- Main Content -->
    <main class="content">
      <!-- Your app content here -->
    </main>

    <!-- Right Sidebar -->
    <aside v-if="session" class="sidebar-right">
      <!-- Call Details -->
      <div class="details-section">
        <h4>Call Details</h4>

        <div class="detail-card">
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value status-badge">{{ state }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Caller</span>
            <span class="detail-value">{{ remoteDisplayName || remoteUri }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Duration</span>
            <span class="detail-value mono">{{ formattedDuration }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Direction</span>
            <span class="detail-value">{{ direction }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="actions-section">
        <h4>Quick Actions</h4>
        <div class="action-buttons">
          <button
            @click="toggleMute()"
            class="action-btn"
            :class="{ active: isMuted }"
            :title="isMuted ? 'Unmute' : 'Mute'"
          >
            {{ isMuted ? '🔇' : '🔊' }}
          </button>

          <button
            @click="toggleHold()"
            class="action-btn"
            :class="{ active: isOnHold }"
            :title="isOnHold ? 'Resume' : 'Hold'"
          >
            {{ isOnHold ? '▶️' : '⏸️' }}
          </button>

          <button
            @click="hangup()"
            class="action-btn danger"
            title="Hangup"
          >
            ❌
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCallSession } from 'vuesip'

const {
  session,
  state,
  direction,
  remoteUri,
  remoteDisplayName,
  duration,
  isMuted,
  isOnHold,
  hangup,
  mute,
  unmute,
  hold,
  unhold
} = useCallSession()

const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
})

const toggleMute = () => isMuted.value ? unmute() : mute()
const toggleHold = () => isOnHold.value ? unhold() : hold()
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}

.content {
  flex: 1;
  overflow: auto;
}

.sidebar-right {
  width: 280px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  color: white;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.details-section h4,
.actions-section h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  margin: 0 0 1rem 0;
  opacity: 0.9;
}

.detail-card {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.75rem;
  opacity: 0.8;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
  text-transform: capitalize;
}

.mono {
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 60px;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.action-btn.active {
  background: rgba(255, 255, 255, 0.4);
}

.action-btn.danger {
  background: #ef4444;
}
</style>`,
    },
    {
      title: 'Bottom Toolbar (Mobile-First)',
      description: 'Fixed bottom toolbar for mobile-friendly layouts',
      code: `<template>
  <div class="app-mobile">
    <!-- Main Content -->
    <main class="content">
      <!-- Your app content here -->
    </main>

    <!-- Bottom Toolbar -->
    <footer class="toolbar-bottom">
      <!-- Status -->
      <div class="status-compact">
        <span class="dot" :class="{ connected: isConnected }"></span>
        <span class="dot" :class="{ connected: isRegistered }"></span>
      </div>

      <!-- Call Info -->
      <div v-if="session" class="call-info-compact">
        <span class="badge-compact">{{ state }}</span>
        <span class="caller-compact">{{ remoteDisplayName || 'Unknown' }}</span>
        <span class="duration-compact">{{ formattedDuration }}</span>
      </div>
      <div v-else class="call-info-compact">
        <span class="idle-text">No active call</span>
      </div>

      <!-- Controls -->
      <div class="controls-compact">
        <button v-if="showAnswer" @click="answer()" class="btn-icon">
          📞
        </button>
        <button v-if="isActive" @click="toggleMute()" class="btn-icon">
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <button v-if="isActive" @click="hangup()" class="btn-icon btn-danger">
          ❌
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { isConnected, isRegistered } = useSipClient()
const {
  session,
  state,
  direction,
  remoteDisplayName,
  duration,
  isActive,
  isMuted,
  answer,
  hangup,
  mute,
  unmute
} = useCallSession()

const showAnswer = computed(() =>
  state.value === 'ringing' && direction.value === 'incoming'
)

const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
})

const toggleMute = () => isMuted.value ? unmute() : mute()
</script>

<style scoped>
.app-mobile {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content {
  flex: 1;
  overflow: auto;
  padding-bottom: 70px; /* Space for fixed toolbar */
}

.toolbar-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(120deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
}

.status-compact {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.dot.connected {
  background: #10b981;
}

.call-info-compact {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.badge-compact {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
  text-transform: capitalize;
}

.caller-compact {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.duration-compact {
  font-family: monospace;
  font-size: 0.875rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
}

.idle-text {
  font-size: 0.875rem;
  opacity: 0.8;
  font-style: italic;
}

.controls-compact {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  padding: 0.625rem 0.875rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  min-width: 44px; /* Touch-friendly */
  min-height: 44px;
}

.btn-danger {
  background: #ef4444;
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .toolbar-bottom {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .caller-compact {
    max-width: 100px;
  }
}
</style>`,
    },
    {
      title: 'Floating Action Button Toolbar',
      description: 'Expandable FAB-style toolbar for minimal UI',
      code: `<template>
  <div class="fab-container">
    <!-- Main FAB -->
    <button
      class="fab-main"
      :class="{ expanded: isExpanded }"
      @click="toggleExpand"
    >
      <span class="fab-icon">{{ isExpanded ? '×' : '📞' }}</span>
    </button>

    <!-- Expandable Actions -->
    <transition-group name="fab-action" tag="div" class="fab-actions">
      <button
        v-for="(action, index) in fabActions"
        v-show="isExpanded"
        :key="action.id"
        class="fab-action"
        :class="action.class"
        :style="getActionStyle(index)"
        @click="handleAction(action)"
      >
        <span class="action-icon">{{ action.icon }}</span>
        <span v-if="showLabels" class="action-label">{{ action.label }}</span>
      </button>
    </transition-group>

    <!-- Active call mini-card -->
    <transition name="slide-up">
      <div v-if="hasActiveCall && !isExpanded" class="mini-call-card">
        <span class="call-timer">{{ formattedDuration }}</span>
        <span class="call-name">{{ currentCall.remoteName }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

interface FabAction {
  id: string
  icon: string
  label: string
  action: () => void
  class?: string
  showWhen?: () => boolean
}

const { makeCall, hangup } = useSipClient()
const { currentCall, callState, duration } = useCallSession()

const isExpanded = ref(false)
const showLabels = ref(true)

const hasActiveCall = computed(() =>
  ['connecting', 'connected'].includes(callState.value)
)

const formattedDuration = computed(() => {
  const d = duration.value
  const mins = Math.floor(d / 60)
  const secs = d % 60
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`
})

const fabActions = computed<FabAction[]>(() => {
  const actions: FabAction[] = []

  if (!hasActiveCall.value) {
    actions.push(
      { id: 'dial', icon: '📞', label: 'Dial', action: openDialer },
      { id: 'contacts', icon: '👥', label: 'Contacts', action: openContacts },
      { id: 'history', icon: '📜', label: 'History', action: openHistory }
    )
  } else {
    actions.push(
      { id: 'mute', icon: '🔇', label: 'Mute', action: toggleMute },
      { id: 'hold', icon: '⏸️', label: 'Hold', action: toggleHold },
      { id: 'transfer', icon: '↗️', label: 'Transfer', action: openTransfer },
      { id: 'hangup', icon: '📵', label: 'Hang up', action: hangup, class: 'danger' }
    )
  }

  return actions
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const getActionStyle = (index: number) => {
  const angle = -90 + (index * 45) // Spread in arc
  const distance = 70
  const radian = (angle * Math.PI) / 180
  const x = Math.cos(radian) * distance
  const y = Math.sin(radian) * distance

  return {
    transform: \`translate(\${x}px, \${y}px)\`,
    transitionDelay: \`\${index * 50}ms\`
  }
}

const handleAction = (action: FabAction) => {
  action.action()
  if (action.id !== 'hangup') {
    isExpanded.value = false
  }
}
</script>

<style scoped>
.fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  position: relative;
}

.fab-main:hover {
  transform: scale(1.1);
}

.fab-main.expanded {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  transform: rotate(45deg);
}

.fab-actions {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 56px;
  height: 56px;
}

.fab-action {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  bottom: 6px;
  right: 6px;
}

.fab-action:hover {
  transform: scale(1.15) !important;
}

.fab-action.danger {
  background: #ef4444;
  color: white;
}

.mini-call-card {
  position: absolute;
  bottom: 70px;
  right: 0;
  background: white;
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 120px;
}

.call-timer {
  font-size: 0.875rem;
  font-weight: 600;
  color: #22c55e;
}

.call-name {
  font-size: 0.75rem;
  color: #64748b;
}

/* Animations */
.fab-action-enter-active,
.fab-action-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-action-enter-from,
.fab-action-leave-to {
  opacity: 0;
  transform: translate(0, 0) scale(0) !important;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>`,
    },
    {
      title: 'Responsive Adaptive Toolbar',
      description: 'Toolbar that adapts layout based on screen size and orientation',
      code: `<template>
  <div class="adaptive-toolbar" :class="layoutClass">
    <div class="toolbar-segment primary">
      <button
        v-for="action in primaryActions"
        :key="action.id"
        class="toolbar-btn"
        :class="{ active: action.isActive?.() }"
        @click="action.handler"
      >
        <span class="btn-icon">{{ action.icon }}</span>
        <span v-if="showLabels" class="btn-label">{{ action.label }}</span>
      </button>
    </div>

    <div v-if="!isCompact" class="toolbar-segment secondary">
      <button
        v-for="action in secondaryActions"
        :key="action.id"
        class="toolbar-btn secondary-btn"
        @click="action.handler"
      >
        <span class="btn-icon">{{ action.icon }}</span>
        <span v-if="showLabels" class="btn-label">{{ action.label }}</span>
      </button>
    </div>

    <!-- Overflow menu for compact mode -->
    <div v-if="isCompact && secondaryActions.length" class="overflow-menu">
      <button class="toolbar-btn" @click="toggleOverflow">
        <span class="btn-icon">⋯</span>
      </button>

      <transition name="dropdown">
        <div v-if="overflowOpen" class="overflow-dropdown">
          <button
            v-for="action in secondaryActions"
            :key="action.id"
            class="overflow-item"
            @click="handleOverflowAction(action)"
          >
            <span class="item-icon">{{ action.icon }}</span>
            <span class="item-label">{{ action.label }}</span>
          </button>
        </div>
      </transition>
    </div>

    <!-- Call end button always visible -->
    <div class="toolbar-segment end-call">
      <button
        v-if="hasActiveCall"
        class="toolbar-btn end-btn"
        @click="endCall"
      >
        <span class="btn-icon">📵</span>
        <span v-if="showLabels" class="btn-label">End</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

interface ToolbarAction {
  id: string
  icon: string
  label: string
  handler: () => void
  isActive?: () => boolean
  priority: number
}

const { hangup } = useSipClient()
const { callState, isMuted, isOnHold, toggleMute, toggleHold } = useCallSession()

const screenWidth = ref(window.innerWidth)
const orientation = ref<'portrait' | 'landscape'>(
  window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
)
const overflowOpen = ref(false)

const hasActiveCall = computed(() =>
  ['connecting', 'connected'].includes(callState.value)
)

const isCompact = computed(() => screenWidth.value < 600)
const isMedium = computed(() => screenWidth.value >= 600 && screenWidth.value < 900)
const showLabels = computed(() => screenWidth.value >= 480)

const layoutClass = computed(() => ({
  compact: isCompact.value,
  medium: isMedium.value,
  landscape: orientation.value === 'landscape',
  portrait: orientation.value === 'portrait'
}))

const allActions: ToolbarAction[] = [
  { id: 'mute', icon: '🔇', label: 'Mute', handler: toggleMute, isActive: () => isMuted.value, priority: 1 },
  { id: 'hold', icon: '⏸️', label: 'Hold', handler: toggleHold, isActive: () => isOnHold.value, priority: 2 },
  { id: 'dialpad', icon: '⌨️', label: 'Keypad', handler: () => emit('open-dialpad'), priority: 3 },
  { id: 'transfer', icon: '↗️', label: 'Transfer', handler: () => emit('open-transfer'), priority: 4 },
  { id: 'record', icon: '⏺️', label: 'Record', handler: () => emit('toggle-record'), priority: 5 },
  { id: 'park', icon: '🅿️', label: 'Park', handler: () => emit('park-call'), priority: 6 },
  { id: 'conference', icon: '👥', label: 'Conference', handler: () => emit('add-to-conference'), priority: 7 }
]

const primaryActions = computed(() => {
  const maxPrimary = isCompact.value ? 2 : isMedium.value ? 4 : 6
  return allActions
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxPrimary)
})

const secondaryActions = computed(() => {
  const maxPrimary = isCompact.value ? 2 : isMedium.value ? 4 : 6
  return allActions
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(maxPrimary)
})

const emit = defineEmits(['open-dialpad', 'open-transfer', 'toggle-record', 'park-call', 'add-to-conference'])

const updateDimensions = () => {
  screenWidth.value = window.innerWidth
  orientation.value = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
}

const toggleOverflow = () => {
  overflowOpen.value = !overflowOpen.value
}

const handleOverflowAction = (action: ToolbarAction) => {
  action.handler()
  overflowOpen.value = false
}

const endCall = () => {
  hangup()
}

onMounted(() => {
  window.addEventListener('resize', updateDimensions)
  window.addEventListener('orientationchange', updateDimensions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
  window.removeEventListener('orientationchange', updateDimensions)
})
</script>

<style scoped>
.adaptive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 16px;
  gap: 8px;
  transition: all 0.3s ease;
}

.adaptive-toolbar.landscape {
  flex-direction: row;
}

.adaptive-toolbar.portrait.compact {
  padding: 8px 12px;
}

.toolbar-segment {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-segment.secondary {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding-left: 12px;
  margin-left: 4px;
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  padding: 10px 14px;
  min-width: 50px;
  transition: all 0.2s ease;
}

.adaptive-toolbar.compact .toolbar-btn {
  padding: 8px 10px;
  min-width: 44px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.toolbar-btn.active {
  background: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}

.toolbar-btn.end-btn {
  background: rgba(239, 68, 68, 0.8);
}

.toolbar-btn.end-btn:hover {
  background: rgba(239, 68, 68, 1);
}

.btn-icon {
  font-size: 1.25rem;
}

.btn-label {
  font-size: 0.625rem;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

/* Overflow menu */
.overflow-menu {
  position: relative;
}

.overflow-dropdown {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background: #1e293b;
  border-radius: 12px;
  padding: 8px;
  min-width: 150px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

.overflow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.overflow-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.item-icon {
  font-size: 1.1rem;
}

.item-label {
  font-size: 0.875rem;
}

/* Animations */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>`,
    },
    {
      title: 'Toolbar Theme System',
      description: 'Customizable toolbar themes and appearance settings',
      code: `// toolbar-themes.ts
export interface ToolbarTheme {
  id: string
  name: string
  colors: {
    background: string
    backgroundGradient?: string
    buttonBg: string
    buttonHover: string
    buttonActive: string
    buttonText: string
    dangerBg: string
    dangerHover: string
    accent: string
    divider: string
  }
  styling: {
    borderRadius: string
    buttonRadius: string
    padding: string
    gap: string
    shadow: string
    blur?: string
  }
  effects: {
    useGradient: boolean
    useGlass: boolean
    useShadow: boolean
    useAnimation: boolean
  }
}

export const defaultThemes: Record<string, ToolbarTheme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      background: '#1e293b',
      backgroundGradient: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      buttonBg: 'rgba(255, 255, 255, 0.1)',
      buttonHover: 'rgba(255, 255, 255, 0.2)',
      buttonActive: 'rgba(59, 130, 246, 0.5)',
      buttonText: '#ffffff',
      dangerBg: 'rgba(239, 68, 68, 0.8)',
      dangerHover: 'rgba(239, 68, 68, 1)',
      accent: '#3b82f6',
      divider: 'rgba(255, 255, 255, 0.1)'
    },
    styling: {
      borderRadius: '16px',
      buttonRadius: '12px',
      padding: '12px 16px',
      gap: '8px',
      shadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    },
    effects: {
      useGradient: true,
      useGlass: false,
      useShadow: true,
      useAnimation: true
    }
  },

  light: {
    id: 'light',
    name: 'Light',
    colors: {
      background: '#ffffff',
      backgroundGradient: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
      buttonBg: 'rgba(0, 0, 0, 0.05)',
      buttonHover: 'rgba(0, 0, 0, 0.1)',
      buttonActive: 'rgba(59, 130, 246, 0.2)',
      buttonText: '#1e293b',
      dangerBg: 'rgba(239, 68, 68, 0.1)',
      dangerHover: 'rgba(239, 68, 68, 0.2)',
      accent: '#3b82f6',
      divider: 'rgba(0, 0, 0, 0.1)'
    },
    styling: {
      borderRadius: '16px',
      buttonRadius: '12px',
      padding: '12px 16px',
      gap: '8px',
      shadow: '0 2px 12px rgba(0, 0, 0, 0.1)'
    },
    effects: {
      useGradient: true,
      useGlass: false,
      useShadow: true,
      useAnimation: true
    }
  },

  glass: {
    id: 'glass',
    name: 'Glass',
    colors: {
      background: 'rgba(255, 255, 255, 0.1)',
      buttonBg: 'rgba(255, 255, 255, 0.15)',
      buttonHover: 'rgba(255, 255, 255, 0.25)',
      buttonActive: 'rgba(59, 130, 246, 0.4)',
      buttonText: '#ffffff',
      dangerBg: 'rgba(239, 68, 68, 0.6)',
      dangerHover: 'rgba(239, 68, 68, 0.8)',
      accent: '#3b82f6',
      divider: 'rgba(255, 255, 255, 0.2)'
    },
    styling: {
      borderRadius: '20px',
      buttonRadius: '14px',
      padding: '14px 18px',
      gap: '10px',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      blur: '20px'
    },
    effects: {
      useGradient: false,
      useGlass: true,
      useShadow: true,
      useAnimation: true
    }
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      background: 'transparent',
      buttonBg: 'transparent',
      buttonHover: 'rgba(0, 0, 0, 0.05)',
      buttonActive: 'rgba(59, 130, 246, 0.1)',
      buttonText: '#475569',
      dangerBg: 'transparent',
      dangerHover: 'rgba(239, 68, 68, 0.1)',
      accent: '#3b82f6',
      divider: 'rgba(0, 0, 0, 0.05)'
    },
    styling: {
      borderRadius: '0',
      buttonRadius: '8px',
      padding: '8px 12px',
      gap: '4px',
      shadow: 'none'
    },
    effects: {
      useGradient: false,
      useGlass: false,
      useShadow: false,
      useAnimation: false
    }
  }
}

// Theme manager composable
import { ref, computed, watch } from 'vue'

export function useToolbarTheme(initialTheme: string = 'dark') {
  const currentThemeId = ref(initialTheme)
  const customThemes = ref<Record<string, ToolbarTheme>>({})

  const allThemes = computed(() => ({
    ...defaultThemes,
    ...customThemes.value
  }))

  const currentTheme = computed(() =>
    allThemes.value[currentThemeId.value] || defaultThemes.dark
  )

  const cssVariables = computed(() => {
    const theme = currentTheme.value
    return {
      '--toolbar-bg': theme.colors.background,
      '--toolbar-bg-gradient': theme.colors.backgroundGradient || theme.colors.background,
      '--toolbar-btn-bg': theme.colors.buttonBg,
      '--toolbar-btn-hover': theme.colors.buttonHover,
      '--toolbar-btn-active': theme.colors.buttonActive,
      '--toolbar-btn-text': theme.colors.buttonText,
      '--toolbar-danger-bg': theme.colors.dangerBg,
      '--toolbar-danger-hover': theme.colors.dangerHover,
      '--toolbar-accent': theme.colors.accent,
      '--toolbar-divider': theme.colors.divider,
      '--toolbar-radius': theme.styling.borderRadius,
      '--toolbar-btn-radius': theme.styling.buttonRadius,
      '--toolbar-padding': theme.styling.padding,
      '--toolbar-gap': theme.styling.gap,
      '--toolbar-shadow': theme.styling.shadow,
      '--toolbar-blur': theme.styling.blur || '0'
    }
  })

  const setTheme = (themeId: string) => {
    if (allThemes.value[themeId]) {
      currentThemeId.value = themeId
      localStorage.setItem('toolbar-theme', themeId)
    }
  }

  const addCustomTheme = (theme: ToolbarTheme) => {
    customThemes.value[theme.id] = theme
  }

  const removeCustomTheme = (themeId: string) => {
    if (customThemes.value[themeId]) {
      delete customThemes.value[themeId]
      if (currentThemeId.value === themeId) {
        setTheme('dark')
      }
    }
  }

  // Load saved theme preference
  const savedTheme = localStorage.getItem('toolbar-theme')
  if (savedTheme && allThemes.value[savedTheme]) {
    currentThemeId.value = savedTheme
  }

  return {
    currentThemeId,
    currentTheme,
    allThemes,
    cssVariables,
    setTheme,
    addCustomTheme,
    removeCustomTheme
  }
}`,
    },
  ],
}
