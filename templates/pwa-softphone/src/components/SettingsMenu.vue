<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import Elks46OutboundSettings from './Elks46OutboundSettings.vue'
import TranscriptionSettingsSection from './TranscriptionSettingsSection.vue'

type SettingsCategory =
  | 'account'
  | 'audio'
  | 'calls'
  | 'transcription'
  | 'notifications'
  | 'privacy'
  | 'advanced'

interface Category {
  id: SettingsCategory
  label: string
  icon: string
}

const categories: Category[] = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'audio', label: 'Audio', icon: '🔊' },
  { id: 'calls', label: 'Calls', icon: '📞' },
  { id: 'transcription', label: 'Transcription', icon: '📝' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️' },
]

const props = defineProps<{
  // Phone state
  isConnected: boolean
  accounts: Array<{ id: string; name: string }>
  outboundAccountId: string | null
  audioInputDevices: readonly MediaDeviceInfo[]
  audioOutputDevices: readonly MediaDeviceInfo[]
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
  pushPermissionGranted: boolean
  currentProviderId?: string
  // Handlers
  onSetOutboundAccount: (id: string) => void
  onSelectAudioInput: (id: string) => void
  onSelectAudioOutput: (id: string) => void
  onRefresh46ElksPreferences?: () => void
}>()

const emit = defineEmits<{
  disconnect: []
}>()

const activeCategory = ref<SettingsCategory>('account')

// Scrollable categories for mobile
const scrollableCategories = computed(() => {
  return categories
})

// Audio testing
const isTestingMic = ref(false)
const isTestingSpeaker = ref(false)
let micTestStream: MediaStream | null = null
let speakerTestAudio: HTMLAudioElement | null = null

async function testMicrophone() {
  if (isTestingMic.value) {
    // Stop test
    if (micTestStream) {
      micTestStream.getTracks().forEach((track) => track.stop())
      micTestStream = null
    }
    isTestingMic.value = false
    return
  }

  try {
    isTestingMic.value = true
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: props.selectedAudioInputId ? { exact: props.selectedAudioInputId } : undefined,
      },
    })
    micTestStream = stream
    // Visual feedback - could add waveform visualization here
    setTimeout(() => {
      if (micTestStream) {
        micTestStream.getTracks().forEach((track) => track.stop())
        micTestStream = null
      }
      isTestingMic.value = false
    }, 3000)
  } catch (error) {
    console.error('Microphone test failed:', error)
    isTestingMic.value = false
  }
}

async function testSpeaker() {
  if (isTestingSpeaker.value) {
    // Stop test
    if (speakerTestAudio) {
      speakerTestAudio.pause()
      speakerTestAudio = null
    }
    isTestingSpeaker.value = false
    return
  }

  try {
    isTestingSpeaker.value = true
    // Create a test tone
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const destination = audioContext.destination

    oscillator.connect(gainNode)
    gainNode.connect(destination)

    oscillator.frequency.value = 440 // A4 note
    gainNode.gain.value = 0.1

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.5)

    setTimeout(() => {
      isTestingSpeaker.value = false
    }, 500)
  } catch (error) {
    console.error('Speaker test failed:', error)
    isTestingSpeaker.value = false
  }
}

function handleDisconnect() {
  emit('disconnect')
}

// Cleanup audio test streams on unmount
onUnmounted(() => {
  if (micTestStream) {
    micTestStream.getTracks().forEach((track) => track.stop())
    micTestStream = null
  }
  if (speakerTestAudio) {
    speakerTestAudio.pause()
    speakerTestAudio = null
  }
})
</script>

<template>
  <div class="settings-menu">
    <!-- Category Navigation -->
    <div class="category-nav">
      <div class="category-nav-scroll">
        <button
          v-for="category in scrollableCategories"
          :key="category.id"
          class="category-btn"
          :class="{ active: activeCategory === category.id }"
          @click="activeCategory = category.id"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-label">{{ category.label }}</span>
        </button>
      </div>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <!-- Account Settings -->
      <div v-if="activeCategory === 'account'" class="category-content">
        <div class="settings-section">
          <h3 class="section-header">
            <span class="section-icon">👤</span>
            <span>Account</span>
          </h3>

          <div
            v-if="props.currentProviderId === '46elks' && props.isConnected"
            class="section-content"
          >
            <Elks46OutboundSettings
              :is-connected="props.isConnected"
              @updated="props.onRefresh46ElksPreferences"
            />
          </div>

          <div v-if="props.accounts.length > 0" class="section-content">
            <div class="setting-item">
              <div class="setting-info">
                <label>Outbound Account</label>
                <p class="setting-hint">Select which account to use for outbound calls</p>
              </div>
              <select
                :value="props.outboundAccountId || ''"
                @change="(e) => props.onSetOutboundAccount((e.target as HTMLSelectElement).value)"
                class="setting-control"
              >
                <option v-for="acc in props.accounts" :key="acc.id" :value="acc.id">
                  {{ acc.name }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="props.isConnected" class="section-content">
            <div class="setting-item danger">
              <div class="setting-info">
                <label>Disconnect</label>
                <p class="setting-hint">Disconnect from the SIP server</p>
              </div>
              <button class="disconnect-btn" @click="handleDisconnect">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Audio Settings -->
      <div v-if="activeCategory === 'audio'" class="category-content">
        <div class="settings-section">
          <h3 class="section-header">
            <span class="section-icon">🔊</span>
            <span>Audio Devices</span>
          </h3>

          <div class="section-content">
            <div class="setting-item">
              <div class="setting-info">
                <label>Microphone</label>
                <p class="setting-hint">Select your microphone input device</p>
              </div>
              <div class="setting-control-group">
                <select
                  :value="props.selectedAudioInputId || ''"
                  @change="(e) => props.onSelectAudioInput((e.target as HTMLSelectElement).value)"
                  class="setting-control"
                >
                  <option
                    v-for="device in props.audioInputDevices"
                    :key="device.deviceId"
                    :value="device.deviceId"
                  >
                    {{ device.label || 'Microphone ' + device.deviceId.slice(0, 8) }}
                  </option>
                </select>
                <button
                  class="test-btn"
                  :class="{ active: isTestingMic }"
                  @click="testMicrophone"
                  title="Test microphone"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label>Speaker</label>
                <p class="setting-hint">Select your speaker output device</p>
              </div>
              <div class="setting-control-group">
                <select
                  :value="props.selectedAudioOutputId || ''"
                  @change="(e) => props.onSelectAudioOutput((e.target as HTMLSelectElement).value)"
                  class="setting-control"
                >
                  <option
                    v-for="device in props.audioOutputDevices"
                    :key="device.deviceId"
                    :value="device.deviceId"
                  >
                    {{ device.label || 'Speaker ' + device.deviceId.slice(0, 8) }}
                  </option>
                </select>
                <button
                  class="test-btn"
                  :class="{ active: isTestingSpeaker }"
                  @click="testSpeaker"
                  title="Test speaker"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calls Settings -->
      <div v-if="activeCategory === 'calls'" class="category-content">
        <div class="settings-section">
          <h3 class="section-header">
            <span class="section-icon">📞</span>
            <span>Call Settings</span>
          </h3>

          <div class="section-content">
            <div class="setting-item">
              <div class="setting-info">
                <label>Call Settings</label>
                <p class="setting-hint">Configure call behavior and preferences</p>
              </div>
              <p class="coming-soon">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Transcription Settings -->
      <div v-if="activeCategory === 'transcription'" class="category-content">
        <TranscriptionSettingsSection />
      </div>

      <!-- Notifications Settings -->
      <div v-if="activeCategory === 'notifications'" class="category-content">
        <div class="settings-section">
          <h3 class="section-header">
            <span class="section-icon">🔔</span>
            <span>Notifications</span>
          </h3>

          <div class="section-content">
            <div class="setting-item">
              <div class="setting-info">
                <label>Push Notifications</label>
                <p class="setting-hint">Receive notifications when the app is in the background</p>
              </div>
              <span class="badge" :class="{ active: props.pushPermissionGranted }">
                {{ props.pushPermissionGranted ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Privacy Settings -->
      <div v-if="activeCategory === 'privacy'" class="category-content">
        <div class="settings-section">
          <h3 class="section-header">
            <span class="section-icon">🔒</span>
            <span>Privacy</span>
          </h3>

          <div class="section-content">
            <div class="setting-item">
              <div class="setting-info">
                <label>Privacy Settings</label>
                <p class="setting-hint">Manage your privacy and data preferences</p>
              </div>
              <p class="coming-soon">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div v-if="activeCategory === 'advanced'" class="category-content">
        <div class="settings-section">
          <h3 class="section-header">
            <span class="section-icon">⚙️</span>
            <span>Advanced</span>
          </h3>

          <div class="section-content">
            <div class="setting-item">
              <div class="setting-info">
                <label>Advanced Settings</label>
                <p class="setting-hint">Network, codecs, and technical configuration</p>
              </div>
              <p class="coming-soon">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-menu {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Category Navigation */
.category-nav {
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.category-nav-scroll {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  min-width: min-content;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  min-width: 60px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.category-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.category-btn.active {
  background: var(--color-primary);
  color: white;
}

.category-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.category-label {
  font-size: 0.75rem;
  font-weight: 500;
}

/* Settings Content */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  margin: 0;
}

.section-icon {
  font-size: 1rem;
}

.section-content {
  padding: 0.75rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 0;
  gap: 1rem;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.setting-item.danger {
  border-top: 1px solid var(--border-color);
  margin-top: 0.5rem;
  padding-top: 1rem;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-info label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.setting-control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.setting-control {
  min-width: 150px;
  max-width: 200px;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.test-btn:hover {
  background: var(--bg-primary);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.test-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  animation: pulse 1s ease-in-out infinite;
}

.test-btn svg {
  width: 18px;
  height: 18px;
}

.setting-control:hover {
  border-color: var(--color-primary);
}

.setting-control:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.badge {
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge.active {
  background: var(--color-success);
  color: white;
}

.disconnect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.disconnect-btn:hover {
  opacity: 0.9;
}

.disconnect-btn svg {
  width: 18px;
  height: 18px;
}

.coming-soon {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
  padding: 0.5rem 0;
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .category-nav-scroll {
    padding: 0.5rem;
  }

  .category-btn {
    min-width: 50px;
    padding: 0.5rem;
  }

  .category-label {
    font-size: 0.7rem;
  }

  .settings-content {
    padding: 0.75rem;
  }

  .setting-control {
    min-width: 120px;
    max-width: 150px;
  }
}
</style>
