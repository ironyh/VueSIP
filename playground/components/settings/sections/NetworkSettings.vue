<template>
  <div class="network-settings">
    <h3>Network Configuration</h3>

    <!-- STUN Servers -->
    <div class="settings-section">
      <div class="section-header">
        <h4>STUN Servers</h4>
        <button class="btn-small" @click="addStunServer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add STUN
        </button>
      </div>

      <div v-if="stunServers.length === 0" class="empty-state">
        No STUN servers configured. Using browser defaults.
      </div>

      <div v-for="(server, index) in stunServers" :key="`stun-${index}`" class="server-item">
        <input
          v-model="stunServers[index]"
          type="text"
          placeholder="stun:stun.example.com:19302"
          class="server-input"
          @input="handleStunChange"
        />
        <button class="btn-icon btn-danger" @click="removeStunServer(index)" title="Remove">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- TURN Servers -->
    <div class="settings-section">
      <div class="section-header">
        <h4>TURN Servers</h4>
        <button class="btn-small" @click="addTurnServer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add TURN
        </button>
      </div>

      <div v-if="turnServers.length === 0" class="empty-state">
        No TURN servers configured. May have issues with restrictive NAT/firewalls.
      </div>

      <div
        v-for="(server, index) in turnServers"
        :key="`turn-${index}`"
        class="turn-server-item"
      >
        <div class="turn-header">
          <span class="turn-label">TURN Server {{ index + 1 }}</span>
          <button class="btn-icon btn-danger" @click="removeTurnServer(index)" title="Remove">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="turn-fields">
          <div class="field-group">
            <label>URLs (comma-separated)</label>
            <input
              v-model="server.urls"
              type="text"
              placeholder="turn:turn.example.com:3478"
              @input="handleTurnChange"
            />
          </div>

          <div class="field-row">
            <div class="field-group">
              <label>Username</label>
              <input
                v-model="server.username"
                type="text"
                placeholder="username"
                @input="handleTurnChange"
              />
            </div>

            <div class="field-group">
              <label>Credential</label>
              <input
                v-model="server.credential"
                :type="server.showCredential ? 'text' : 'password'"
                placeholder="password"
                @input="handleTurnChange"
              />
              <button
                class="toggle-visibility"
                @click="server.showCredential = !server.showCredential"
                type="button"
              >
                {{ server.showCredential ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>

          <div class="field-group">
            <label>Credential Type</label>
            <select v-model="server.credentialType" @change="handleTurnChange">
              <option value="password">Password</option>
              <option value="oauth">OAuth</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- ICE Transport Policy -->
    <div class="settings-section">
      <h4>ICE Configuration</h4>

      <div class="field-group">
        <label for="ice-transport">ICE Transport Policy</label>
        <select id="ice-transport" v-model="iceTransportPolicy" @change="handleIceChange">
          <option value="all">All (Recommended)</option>
          <option value="relay">Relay Only (Force TURN)</option>
          <option value="public">Public Only</option>
        </select>
        <p class="field-help">
          <span v-if="iceTransportPolicy === 'all'"
          >Use all available candidates (STUN, TURN, and local)</span
          >
          <span v-else-if="iceTransportPolicy === 'relay'"
          >Force all traffic through TURN servers for maximum privacy</span
          >
          <span v-else>Use only public IP addresses (no relay servers)</span>
        </p>
      </div>

      <div class="field-group">
        <label for="bundle-policy">Bundle Policy</label>
        <select id="bundle-policy" v-model="bundlePolicy" @change="handleBundleChange">
          <option value="balanced">Balanced (Recommended)</option>
          <option value="max-bundle">Max Bundle</option>
          <option value="max-compat">Max Compatibility</option>
        </select>
        <p class="field-help">
          <span v-if="bundlePolicy === 'balanced'">
            Balance between performance and compatibility
          </span>
          <span v-else-if="bundlePolicy === 'max-bundle'">
            Use single connection for all media (best performance)
          </span>
          <span v-else>Use separate connections for maximum compatibility</span>
        </p>
      </div>

      <div class="field-group">
            <label for="ice-pool-size">ICE Candidate Pool Size</label>
            <input
              id="ice-pool-size"
              v-model.number="iceCandidatePoolSize"
              type="number"
              min="0"
              max="10"
              @input="handleIcePoolChange"
            />
            <p class="field-help">
              Number of ICE candidates to pre-gather (0 = disabled, 4-6 recommended for faster
              connection)
            </p>
      </div>
    </div>

    <!-- Bandwidth Limits -->
    <div class="settings-section">
      <h4>Bandwidth Configuration</h4>

      <div class="field-group">
        <label for="audio-bandwidth">Audio Bandwidth Limit (kbps)</label>
        <input
          id="audio-bandwidth"
          v-model.number="audioBandwidth"
          type="number"
          min="16"
          max="128"
          step="8"
          @input="handleBandwidthChange"
        />
        <p class="field-help">Recommended: 32-64 kbps for voice calls</p>
      </div>

      <div class="field-group">
        <label for="video-bandwidth">Video Bandwidth Limit (kbps)</label>
        <input
          id="video-bandwidth"
          v-model.number="videoBandwidth"
          type="number"
          min="128"
          max="4096"
          step="128"
          @input="handleBandwidthChange"
        />
        <p class="field-help">Recommended: 512-1024 kbps for video calls</p>
      </div>
    </div>

    <!-- Connection Quality -->
    <div class="settings-section">
      <h4>Connection Quality Monitoring</h4>

      <div class="quality-stats" v-if="connectionStats">
        <div class="stat-item">
          <span class="stat-label">Round-Trip Time:</span>
          <span class="stat-value" :class="getRttClass(connectionStats.rtt)">
            {{ connectionStats.rtt ? `${connectionStats.rtt.toFixed(0)}ms` : 'N/A' }}
          </span>
        </div>

        <div class="stat-item">
          <span class="stat-label">Packet Loss:</span>
          <span class="stat-value" :class="getPacketLossClass(connectionStats.packetLoss)">
            {{ connectionStats.packetLoss ? `${connectionStats.packetLoss.toFixed(1)}%` : 'N/A' }}
          </span>
        </div>

        <div class="stat-item">
          <span class="stat-label">Jitter:</span>
          <span class="stat-value" :class="getJitterClass(connectionStats.jitter)">
            {{ connectionStats.jitter ? `${connectionStats.jitter.toFixed(1)}ms` : 'N/A' }}
          </span>
        </div>

        <div class="stat-item">
          <span class="stat-label">Connection Type:</span>
          <span class="stat-value">{{ connectionStats.candidateType || 'Unknown' }}</span>
        </div>
      </div>

      <div v-else class="empty-state">No active connection to monitor</div>
    </div>

    <!-- Advanced Options -->
    <div class="settings-section">
      <h4>Advanced WebRTC Options</h4>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="rtcpMuxEnabled" @change="handleRtcpMuxChange" />
          <span>Enable RTCP Multiplexing (Recommended)</span>
        </label>
        <p class="field-help">Combine RTP and RTCP on same port for better firewall traversal</p>
      </div>

      <div class="checkbox-group">
        <label>
          <input
            type="checkbox"
            v-model="autoQualityAdjustment"
            @change="handleQualityAdjustmentChange"
          />
          <span>Automatic Quality Adjustment</span>
        </label>
        <p class="field-help">
          Automatically adjust bitrate based on network conditions (experimental)
        </p>
      </div>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="ipv6Enabled" @change="handleIpv6Change" />
          <span>Enable IPv6</span>
        </label>
        <p class="field-help">Allow ICE to use IPv6 addresses</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { TurnServerConfig } from '@/types/config.types'

interface TurnServerInput extends TurnServerConfig {
  showCredential?: boolean
}

interface ConnectionStats {
  rtt?: number
  packetLoss?: number
  jitter?: number
  candidateType?: string
}

const emit = defineEmits<{
  'update:settings': [settings: Record<string, any>]
}>()

// STUN Servers
const stunServers = ref<string[]>([])

// TURN Servers
const turnServers = ref<TurnServerInput[]>([])

// ICE Configuration
const iceTransportPolicy = ref<'all' | 'relay' | 'public'>('all')
const bundlePolicy = ref<'balanced' | 'max-bundle' | 'max-compat'>('balanced')
const iceCandidatePoolSize = ref(0)

// Bandwidth
const audioBandwidth = ref(64)
const videoBandwidth = ref(1024)

// Advanced
const rtcpMuxEnabled = ref(true)
const autoQualityAdjustment = ref(false)
const ipv6Enabled = ref(true)

// Connection stats
const connectionStats = ref<ConnectionStats | null>(null)
let statsInterval: NodeJS.Timeout | null = null

// Methods
const addStunServer = () => {
  stunServers.value.push('')
}

const removeStunServer = (index: number) => {
  stunServers.value.splice(index, 1)
  emitSettings()
}

const addTurnServer = () => {
  turnServers.value.push({
    urls: '',
    username: '',
    credential: '',
    credentialType: 'password',
    showCredential: false,
  })
}

const removeTurnServer = (index: number) => {
  turnServers.value.splice(index, 1)
  emitSettings()
}

const handleStunChange = () => {
  emitSettings()
}

const handleTurnChange = () => {
  emitSettings()
}

const handleIceChange = () => {
  emitSettings()
}

const handleBundleChange = () => {
  emitSettings()
}

const handleIcePoolChange = () => {
  emitSettings()
}

const handleBandwidthChange = () => {
  emitSettings()
}

const handleRtcpMuxChange = () => {
  emitSettings()
}

const handleQualityAdjustmentChange = () => {
  emitSettings()
}

const handleIpv6Change = () => {
  emitSettings()
}

const emitSettings = () => {
  const settings = {
    rtcConfiguration: {
      stunServers: stunServers.value.filter((s) => s.trim()),
      turnServers: turnServers.value
        .filter((s) => s.urls.trim())
        .map((s) => ({
          urls: s.urls.split(',').map((u) => u.trim()),
          username: s.username || undefined,
          credential: s.credential || undefined,
          credentialType: s.credentialType,
        })),
      iceTransportPolicy: iceTransportPolicy.value,
      bundlePolicy: bundlePolicy.value,
      iceCandidatePoolSize: iceCandidatePoolSize.value,
      rtcpMuxPolicy: rtcpMuxEnabled.value ? 'require' : 'negotiate',
    },
    mediaConfiguration: {
      audioBandwidth: audioBandwidth.value,
      videoBandwidth: videoBandwidth.value,
    },
    autoQualityAdjustment: autoQualityAdjustment.value,
    ipv6Enabled: ipv6Enabled.value,
  }

  emit('update:settings', settings)
}

// Quality class helpers
const getRttClass = (rtt?: number) => {
  if (!rtt) return ''
  if (rtt < 100) return 'quality-good'
  if (rtt < 300) return 'quality-fair'
  return 'quality-poor'
}

const getPacketLossClass = (loss?: number) => {
  if (!loss) return ''
  if (loss < 1) return 'quality-good'
  if (loss < 5) return 'quality-fair'
  return 'quality-poor'
}

const getJitterClass = (jitter?: number) => {
  if (!jitter) return ''
  if (jitter < 30) return 'quality-good'
  if (jitter < 100) return 'quality-fair'
  return 'quality-poor'
}

// Mock connection stats (in real app, get from MediaManager)
const updateConnectionStats = () => {
  // This would come from actual WebRTC stats in production
  connectionStats.value = {
    rtt: Math.random() * 200 + 20,
    packetLoss: Math.random() * 5,
    jitter: Math.random() * 50 + 10,
    candidateType: 'host',
  }
}

onMounted(() => {
  // Start stats monitoring if connection active
  statsInterval = setInterval(updateConnectionStats, 2000)
})

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})
</script>

<style scoped>
.network-settings {
  padding: 1rem;
}

h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  color: var(--color-text);
}

h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-small {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-small:hover {
  background: var(--color-primary-dark);
}

.btn-icon {
  padding: 0.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.btn-icon:hover {
  background: var(--color-background-mute);
}

.btn-danger {
  color: var(--color-error);
}

.btn-danger:hover {
  background: rgba(220, 38, 38, 0.1);
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
}

.server-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.server-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: monospace;
}

.turn-server-item {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.turn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.turn-label {
  font-weight: 600;
  color: var(--color-text);
}

.turn-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.field-group input,
.field-group select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
}

.toggle-visibility {
  position: absolute;
  right: 0.5rem;
  top: 1.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}

.field-help {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0 0;
}

.quality-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.quality-good {
  color: #10b981;
}

.quality-fair {
  color: #f59e0b;
}

.quality-poor {
  color: #ef4444;
}

.checkbox-group {
  margin-bottom: 1rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-group input[type='checkbox'] {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}
</style>
