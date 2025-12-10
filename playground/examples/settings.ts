import type { ExampleDefinition } from './types'
import SettingsDemo from '../demos/SettingsDemo.vue'

export const settingsExample: ExampleDefinition = {
  id: 'settings',
  icon: '⚙️',
  title: 'Settings Manager',
  description: 'User preferences and application settings',
  category: 'utility',
  tags: ['Configuration', 'Preferences', 'User'],
  component: SettingsDemo,
  setupGuide: '<p>Manage user preferences and application settings. Configure audio devices, notifications, and display options.</p>',
  codeSnippets: [
    {
      title: 'Manage Settings',
      description: 'Read and update user settings',
      code: `import { useSettings } from 'vuesip'

const settings = useSettings({
  storageKey: 'vuesip-settings',
  defaults: {
    audioInputDevice: 'default',
    audioOutputDevice: 'default',
    ringtoneVolume: 0.8,
    notificationsEnabled: true,
    autoAnswer: false,
  },
  onSettingChange: (key, value) => {
    console.log('Setting changed:', key, '=', value)
  },
})

// Get a setting
const volume = settings.get('ringtoneVolume')
console.log('Ringtone volume:', volume)

// Update a setting
settings.set('ringtoneVolume', 0.5)

// Update multiple settings
settings.update({
  notificationsEnabled: false,
  autoAnswer: true,
})`,
    },
    {
      title: 'Settings Persistence',
      description: 'Save and restore settings',
      code: `// Export settings
const exported = settings.export()
console.log('Settings exported:', JSON.stringify(exported))

// Import settings
await settings.import({
  ringtoneVolume: 0.7,
  notificationsEnabled: true,
})

// Reset to defaults
settings.reset()

// Watch for changes
watch(settings.all, (newSettings) => {
  console.log('Settings updated:', newSettings)
})

// Check if setting exists
const hasCustomRingtone = settings.has('customRingtone')
console.log('Has custom ringtone:', hasCustomRingtone)`,
    },
    {
      title: 'Settings Data Models',
      description: 'TypeScript interfaces for comprehensive settings management',
      code: `// settings.types.ts
export interface AudioSettings {
  inputDevice: string
  outputDevice: string
  ringtoneDevice: string
  inputVolume: number
  outputVolume: number
  ringtoneVolume: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

export interface NotificationSettings {
  enabled: boolean
  sound: boolean
  vibrate: boolean
  desktop: boolean
  incomingCalls: boolean
  missedCalls: boolean
  voicemail: boolean
  messages: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string // HH:MM format
  quietHoursEnd: string
}

export interface CallSettings {
  autoAnswer: boolean
  autoAnswerDelay: number
  callWaiting: boolean
  doNotDisturb: boolean
  forwardingEnabled: boolean
  forwardingNumber: string
  voicemailEnabled: boolean
  recordingEnabled: boolean
  recordingAutoStart: boolean
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  compactMode: boolean
  showAvatars: boolean
  animationsEnabled: boolean
}

export interface NetworkSettings {
  sipTransport: 'wss' | 'ws' | 'tcp' | 'udp'
  iceServers: IceServerConfig[]
  stunEnabled: boolean
  turnEnabled: boolean
  keepAliveInterval: number
  registrationExpiry: number
}

export interface IceServerConfig {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface PrivacySettings {
  hideCallerId: boolean
  blockAnonymous: boolean
  encryptMedia: boolean
  clearHistoryOnExit: boolean
  analytics: boolean
}

export interface AppSettings {
  audio: AudioSettings
  notifications: NotificationSettings
  call: CallSettings
  display: DisplaySettings
  network: NetworkSettings
  privacy: PrivacySettings
  version: string
  lastUpdated: string
}

export const defaultSettings: AppSettings = {
  audio: {
    inputDevice: 'default',
    outputDevice: 'default',
    ringtoneDevice: 'default',
    inputVolume: 1.0,
    outputVolume: 1.0,
    ringtoneVolume: 0.8,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  notifications: {
    enabled: true,
    sound: true,
    vibrate: true,
    desktop: true,
    incomingCalls: true,
    missedCalls: true,
    voicemail: true,
    messages: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  },
  call: {
    autoAnswer: false,
    autoAnswerDelay: 3,
    callWaiting: true,
    doNotDisturb: false,
    forwardingEnabled: false,
    forwardingNumber: '',
    voicemailEnabled: true,
    recordingEnabled: false,
    recordingAutoStart: false
  },
  display: {
    theme: 'system',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    compactMode: false,
    showAvatars: true,
    animationsEnabled: true
  },
  network: {
    sipTransport: 'wss',
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ],
    stunEnabled: true,
    turnEnabled: false,
    keepAliveInterval: 30,
    registrationExpiry: 3600
  },
  privacy: {
    hideCallerId: false,
    blockAnonymous: false,
    encryptMedia: true,
    clearHistoryOnExit: false,
    analytics: true
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString()
}`,
    },
    {
      title: 'Settings Manager Class',
      description: 'Reactive settings manager with validation and persistence',
      code: `// SettingsManager.ts
import { ref, computed, watch, readonly } from 'vue'
import type { AppSettings, AudioSettings, NotificationSettings } from './settings.types'
import { defaultSettings } from './settings.types'

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

interface SettingsValidator {
  validate: (settings: DeepPartial<AppSettings>) => ValidationResult
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

interface ValidationError {
  path: string
  message: string
  value: unknown
}

export class SettingsManager {
  private storageKey: string
  private settings = ref<AppSettings>(defaultSettings)
  private isDirty = ref(false)
  private validators: SettingsValidator[] = []
  private changeListeners: Array<(settings: AppSettings) => void> = []

  constructor(storageKey: string = 'vuesip-settings') {
    this.storageKey = storageKey
    this.loadFromStorage()
    this.setupAutoSave()
  }

  // Getters
  get current(): Readonly<AppSettings> {
    return readonly(this.settings).value
  }

  get audio(): Readonly<AudioSettings> {
    return readonly(this.settings).value.audio
  }

  get notifications(): Readonly<NotificationSettings> {
    return readonly(this.settings).value.notifications
  }

  get hasUnsavedChanges(): boolean {
    return this.isDirty.value
  }

  // Deep get with path
  get<T = unknown>(path: string): T | undefined {
    const parts = path.split('.')
    let current: unknown = this.settings.value

    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      current = (current as Record<string, unknown>)[part]
    }

    return current as T
  }

  // Deep set with path
  set<T>(path: string, value: T): void {
    const parts = path.split('.')
    const lastKey = parts.pop()
    if (!lastKey) return

    let current: Record<string, unknown> = this.settings.value as Record<string, unknown>

    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    const oldValue = current[lastKey]
    current[lastKey] = value
    this.isDirty.value = true

    // Notify listeners
    this.notifyChange()
  }

  // Update multiple settings at once
  update(updates: DeepPartial<AppSettings>): ValidationResult {
    const validation = this.validateSettings(updates)

    if (!validation.valid) {
      return validation
    }

    this.deepMerge(this.settings.value, updates)
    this.isDirty.value = true
    this.settings.value.lastUpdated = new Date().toISOString()
    this.notifyChange()

    return validation
  }

  // Reset to defaults
  reset(section?: keyof AppSettings): void {
    if (section) {
      (this.settings.value as Record<string, unknown>)[section] =
        JSON.parse(JSON.stringify((defaultSettings as Record<string, unknown>)[section]))
    } else {
      this.settings.value = JSON.parse(JSON.stringify(defaultSettings))
    }
    this.isDirty.value = true
    this.notifyChange()
  }

  // Save to storage
  save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings.value))
      this.isDirty.value = false
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  // Load from storage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.deepMerge(this.settings.value, parsed)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  // Export settings
  export(): string {
    return JSON.stringify(this.settings.value, null, 2)
  }

  // Import settings
  import(data: string | DeepPartial<AppSettings>): ValidationResult {
    const settings = typeof data === 'string' ? JSON.parse(data) : data
    return this.update(settings)
  }

  // Add validator
  addValidator(validator: SettingsValidator): void {
    this.validators.push(validator)
  }

  // Add change listener
  onChange(callback: (settings: AppSettings) => void): () => void {
    this.changeListeners.push(callback)
    return () => {
      const index = this.changeListeners.indexOf(callback)
      if (index > -1) {
        this.changeListeners.splice(index, 1)
      }
    }
  }

  // Validate settings
  private validateSettings(settings: DeepPartial<AppSettings>): ValidationResult {
    const errors: ValidationError[] = []

    for (const validator of this.validators) {
      const result = validator.validate(settings)
      errors.push(...result.errors)
    }

    // Built-in validations
    if (settings.audio?.inputVolume !== undefined) {
      if (settings.audio.inputVolume < 0 || settings.audio.inputVolume > 1) {
        errors.push({
          path: 'audio.inputVolume',
          message: 'Volume must be between 0 and 1',
          value: settings.audio.inputVolume
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Deep merge utility
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && key in target) {
        this.deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        )
      } else {
        target[key] = source[key]
      }
    }
  }

  // Notify change listeners
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      listener(this.settings.value)
    }
  }

  // Setup auto-save
  private setupAutoSave(): void {
    watch(this.settings, () => {
      this.isDirty.value = true
    }, { deep: true })

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      if (this.isDirty.value) {
        this.save()
      }
    })
  }
}

// Singleton instance
export const settingsManager = new SettingsManager()`,
    },
    {
      title: 'Settings UI Component',
      description: 'Complete settings panel with tabs and sections',
      code: `<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h2>Settings</h2>
      <div class="header-actions">
        <button
          v-if="hasUnsavedChanges"
          class="btn-save"
          @click="saveSettings"
        >
          Save Changes
        </button>
        <button class="btn-icon" @click="emit('close')">×</button>
      </div>
    </div>

    <div class="settings-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="settings-content">
      <!-- Audio Settings -->
      <div v-if="activeTab === 'audio'" class="settings-section">
        <h3>Audio Devices</h3>

        <div class="setting-group">
          <label>Microphone</label>
          <select v-model="settings.audio.inputDevice">
            <option v-for="device in audioInputDevices" :key="device.deviceId" :value="device.deviceId">
              {{ device.label || 'Unknown Microphone' }}
            </option>
          </select>
          <div class="volume-control">
            <span>Input Volume</span>
            <input type="range" v-model.number="settings.audio.inputVolume" min="0" max="1" step="0.1" />
            <span>{{ Math.round(settings.audio.inputVolume * 100) }}%</span>
          </div>
        </div>

        <div class="setting-group">
          <label>Speaker</label>
          <select v-model="settings.audio.outputDevice">
            <option v-for="device in audioOutputDevices" :key="device.deviceId" :value="device.deviceId">
              {{ device.label || 'Unknown Speaker' }}
            </option>
          </select>
          <div class="volume-control">
            <span>Output Volume</span>
            <input type="range" v-model.number="settings.audio.outputVolume" min="0" max="1" step="0.1" />
            <span>{{ Math.round(settings.audio.outputVolume * 100) }}%</span>
          </div>
        </div>

        <h3>Audio Processing</h3>
        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.audio.echoCancellation" />
            <span class="toggle-label">Echo Cancellation</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.audio.noiseSuppression" />
            <span class="toggle-label">Noise Suppression</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.audio.autoGainControl" />
            <span class="toggle-label">Auto Gain Control</span>
          </label>
        </div>
      </div>

      <!-- Notifications Settings -->
      <div v-if="activeTab === 'notifications'" class="settings-section">
        <h3>Notification Preferences</h3>

        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.notifications.enabled" />
            <span class="toggle-label">Enable Notifications</span>
          </label>
          <label class="toggle-item" :class="{ disabled: !settings.notifications.enabled }">
            <input type="checkbox" v-model="settings.notifications.sound" :disabled="!settings.notifications.enabled" />
            <span class="toggle-label">Sound</span>
          </label>
          <label class="toggle-item" :class="{ disabled: !settings.notifications.enabled }">
            <input type="checkbox" v-model="settings.notifications.desktop" :disabled="!settings.notifications.enabled" />
            <span class="toggle-label">Desktop Notifications</span>
          </label>
        </div>

        <h3>Notify Me About</h3>
        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.notifications.incomingCalls" />
            <span class="toggle-label">Incoming Calls</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.notifications.missedCalls" />
            <span class="toggle-label">Missed Calls</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.notifications.voicemail" />
            <span class="toggle-label">Voicemail</span>
          </label>
        </div>

        <h3>Quiet Hours</h3>
        <label class="toggle-item">
          <input type="checkbox" v-model="settings.notifications.quietHoursEnabled" />
          <span class="toggle-label">Enable Quiet Hours</span>
        </label>
        <div v-if="settings.notifications.quietHoursEnabled" class="time-range">
          <div class="time-input">
            <label>Start</label>
            <input type="time" v-model="settings.notifications.quietHoursStart" />
          </div>
          <span class="time-separator">to</span>
          <div class="time-input">
            <label>End</label>
            <input type="time" v-model="settings.notifications.quietHoursEnd" />
          </div>
        </div>
      </div>

      <!-- Call Settings -->
      <div v-if="activeTab === 'calls'" class="settings-section">
        <h3>Call Handling</h3>

        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.call.autoAnswer" />
            <span class="toggle-label">Auto-Answer Calls</span>
          </label>
          <div v-if="settings.call.autoAnswer" class="sub-setting">
            <label>Delay (seconds)</label>
            <input type="number" v-model.number="settings.call.autoAnswerDelay" min="0" max="30" />
          </div>
        </div>

        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.call.callWaiting" />
            <span class="toggle-label">Call Waiting</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.call.doNotDisturb" />
            <span class="toggle-label">Do Not Disturb</span>
          </label>
        </div>

        <h3>Call Forwarding</h3>
        <label class="toggle-item">
          <input type="checkbox" v-model="settings.call.forwardingEnabled" />
          <span class="toggle-label">Enable Call Forwarding</span>
        </label>
        <div v-if="settings.call.forwardingEnabled" class="setting-group">
          <label>Forward to</label>
          <input type="tel" v-model="settings.call.forwardingNumber" placeholder="Enter phone number" />
        </div>
      </div>

      <!-- Display Settings -->
      <div v-if="activeTab === 'display'" class="settings-section">
        <h3>Appearance</h3>

        <div class="setting-group">
          <label>Theme</label>
          <div class="theme-selector">
            <button
              v-for="theme in themes"
              :key="theme.id"
              class="theme-option"
              :class="{ active: settings.display.theme === theme.id }"
              @click="settings.display.theme = theme.id"
            >
              <span class="theme-icon">{{ theme.icon }}</span>
              <span class="theme-label">{{ theme.label }}</span>
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>Language</label>
          <select v-model="settings.display.language">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.display.compactMode" />
            <span class="toggle-label">Compact Mode</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.display.animationsEnabled" />
            <span class="toggle-label">Enable Animations</span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <button class="btn-secondary" @click="resetSettings">Reset to Defaults</button>
      <button class="btn-secondary" @click="exportSettings">Export</button>
      <button class="btn-secondary" @click="importSettings">Import</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { settingsManager } from './SettingsManager'
import type { AppSettings } from './settings.types'

const emit = defineEmits(['close', 'settings-changed'])

const activeTab = ref('audio')

const tabs = [
  { id: 'audio', icon: '🔊', label: 'Audio' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'calls', icon: '📞', label: 'Calls' },
  { id: 'display', icon: '🎨', label: 'Display' }
]

const themes = [
  { id: 'light', icon: '☀️', label: 'Light' },
  { id: 'dark', icon: '🌙', label: 'Dark' },
  { id: 'system', icon: '💻', label: 'System' }
]

// Reactive copy of settings
const settings = reactive<AppSettings>(JSON.parse(JSON.stringify(settingsManager.current)))

const audioInputDevices = ref<MediaDeviceInfo[]>([])
const audioOutputDevices = ref<MediaDeviceInfo[]>([])

const hasUnsavedChanges = computed(() => {
  return JSON.stringify(settings) !== JSON.stringify(settingsManager.current)
})

const loadDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioInputDevices.value = devices.filter(d => d.kind === 'audioinput')
    audioOutputDevices.value = devices.filter(d => d.kind === 'audiooutput')
  } catch (error) {
    console.error('Failed to enumerate devices:', error)
  }
}

const saveSettings = () => {
  settingsManager.update(settings)
  settingsManager.save()
  emit('settings-changed', settings)
}

const resetSettings = () => {
  if (confirm('Reset all settings to defaults?')) {
    settingsManager.reset()
    Object.assign(settings, settingsManager.current)
  }
}

const exportSettings = () => {
  const data = settingsManager.export()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vuesip-settings.json'
  a.click()
  URL.revokeObjectURL(url)
}

const importSettings = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const text = await file.text()
      settingsManager.import(text)
      Object.assign(settings, settingsManager.current)
    }
  }
  input.click()
}

onMounted(() => {
  loadDevices()
})
</script>`,
    },
    {
      title: 'Settings Sync Service',
      description: 'Cross-device settings synchronization with cloud storage',
      code: `// SettingsSyncService.ts
import { ref, computed } from 'vue'
import type { AppSettings } from './settings.types'

interface SyncStatus {
  lastSynced: string | null
  isSyncing: boolean
  error: string | null
  pendingChanges: number
}

interface SyncConfig {
  apiEndpoint: string
  userId: string
  authToken: string
  syncInterval: number // milliseconds
  conflictResolution: 'local' | 'remote' | 'merge' | 'prompt'
}

interface SyncConflict {
  key: string
  localValue: unknown
  remoteValue: unknown
  localTimestamp: string
  remoteTimestamp: string
}

export class SettingsSyncService {
  private config: SyncConfig
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private status = ref<SyncStatus>({
    lastSynced: null,
    isSyncing: false,
    error: null,
    pendingChanges: 0
  })
  private pendingChanges: Array<{ key: string; value: unknown; timestamp: string }> = []
  private conflictHandlers: Array<(conflict: SyncConflict) => Promise<'local' | 'remote'>> = []

  constructor(config: SyncConfig) {
    this.config = config
    this.loadPendingChanges()
  }

  get syncStatus() {
    return computed(() => this.status.value)
  }

  get isOnline() {
    return navigator.onLine
  }

  // Start automatic sync
  startAutoSync(): void {
    if (this.syncTimer) return

    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.pendingChanges.length > 0) {
        this.sync()
      }
    }, this.config.syncInterval)

    // Sync on coming online
    window.addEventListener('online', () => this.sync())
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  // Queue a change for sync
  queueChange(key: string, value: unknown): void {
    const change = {
      key,
      value,
      timestamp: new Date().toISOString()
    }

    // Remove any existing change for the same key
    this.pendingChanges = this.pendingChanges.filter(c => c.key !== key)
    this.pendingChanges.push(change)

    this.status.value.pendingChanges = this.pendingChanges.length
    this.savePendingChanges()
  }

  // Perform sync
  async sync(): Promise<void> {
    if (this.status.value.isSyncing || !this.isOnline) return

    this.status.value.isSyncing = true
    this.status.value.error = null

    try {
      // Fetch remote settings
      const remoteSettings = await this.fetchRemoteSettings()

      // Check for conflicts
      const conflicts = await this.detectConflicts(remoteSettings)

      if (conflicts.length > 0) {
        await this.resolveConflicts(conflicts)
      }

      // Push local changes
      if (this.pendingChanges.length > 0) {
        await this.pushChanges()
      }

      this.status.value.lastSynced = new Date().toISOString()
      this.status.value.pendingChanges = 0
      this.pendingChanges = []
      this.savePendingChanges()

    } catch (error) {
      this.status.value.error = error instanceof Error ? error.message : 'Sync failed'
      console.error('Settings sync failed:', error)
    } finally {
      this.status.value.isSyncing = false
    }
  }

  // Fetch remote settings
  private async fetchRemoteSettings(): Promise<Partial<AppSettings>> {
    const response = await fetch(\`\${this.config.apiEndpoint}/settings/\${this.config.userId}\`, {
      headers: {
        'Authorization': \`Bearer \${this.config.authToken}\`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(\`Failed to fetch remote settings: \${response.status}\`)
    }

    return response.json()
  }

  // Push local changes
  private async pushChanges(): Promise<void> {
    const response = await fetch(\`\${this.config.apiEndpoint}/settings/\${this.config.userId}\`, {
      method: 'PATCH',
      headers: {
        'Authorization': \`Bearer \${this.config.authToken}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes: this.pendingChanges,
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      throw new Error(\`Failed to push changes: \${response.status}\`)
    }
  }

  // Detect conflicts between local and remote
  private async detectConflicts(remoteSettings: Partial<AppSettings>): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = []

    for (const change of this.pendingChanges) {
      const remotePath = change.key.split('.')
      let remoteValue: unknown = remoteSettings

      for (const part of remotePath) {
        if (remoteValue === null || remoteValue === undefined) break
        remoteValue = (remoteValue as Record<string, unknown>)[part]
      }

      if (remoteValue !== undefined && remoteValue !== change.value) {
        conflicts.push({
          key: change.key,
          localValue: change.value,
          remoteValue,
          localTimestamp: change.timestamp,
          remoteTimestamp: new Date().toISOString() // Would come from server
        })
      }
    }

    return conflicts
  }

  // Resolve conflicts based on configured strategy
  private async resolveConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      let resolution: 'local' | 'remote'

      switch (this.config.conflictResolution) {
        case 'local':
          resolution = 'local'
          break
        case 'remote':
          resolution = 'remote'
          break
        case 'merge':
          // Use timestamp-based merge (newer wins)
          resolution = conflict.localTimestamp > conflict.remoteTimestamp ? 'local' : 'remote'
          break
        case 'prompt':
          // Use registered conflict handlers
          resolution = await this.promptForResolution(conflict)
          break
        default:
          resolution = 'local'
      }

      if (resolution === 'remote') {
        // Remove from pending changes, will use remote value
        this.pendingChanges = this.pendingChanges.filter(c => c.key !== conflict.key)
      }
    }
  }

  // Prompt user or use handler for conflict resolution
  private async promptForResolution(conflict: SyncConflict): Promise<'local' | 'remote'> {
    for (const handler of this.conflictHandlers) {
      try {
        return await handler(conflict)
      } catch {
        // Try next handler
      }
    }

    // Default to local if no handler resolves
    return 'local'
  }

  // Register a conflict handler
  onConflict(handler: (conflict: SyncConflict) => Promise<'local' | 'remote'>): void {
    this.conflictHandlers.push(handler)
  }

  // Persist pending changes for offline support
  private savePendingChanges(): void {
    localStorage.setItem('vuesip-pending-sync', JSON.stringify(this.pendingChanges))
  }

  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem('vuesip-pending-sync')
      if (stored) {
        this.pendingChanges = JSON.parse(stored)
        this.status.value.pendingChanges = this.pendingChanges.length
      }
    } catch {
      this.pendingChanges = []
    }
  }
}

// Factory function for easy setup
export function createSettingsSync(config: Partial<SyncConfig>): SettingsSyncService {
  const fullConfig: SyncConfig = {
    apiEndpoint: config.apiEndpoint || '/api',
    userId: config.userId || '',
    authToken: config.authToken || '',
    syncInterval: config.syncInterval || 30000,
    conflictResolution: config.conflictResolution || 'merge'
  }

  return new SettingsSyncService(fullConfig)
}`,
    },
    {
      title: 'Settings Validation',
      description: 'Schema-based settings validation with custom rules',
      code: `// settings-validation.ts
import type { AppSettings, AudioSettings, NotificationSettings } from './settings.types'

// Validation result types
export interface ValidationError {
  path: string
  code: string
  message: string
  value: unknown
  constraint?: unknown
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// Validation rule types
type ValidatorFn<T> = (value: T, path: string) => ValidationError | null

interface FieldValidator<T> {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  enum?: T[]
  custom?: ValidatorFn<T>
}

type SchemaValidators<T> = {
  [K in keyof T]?: T[K] extends object
    ? SchemaValidators<T[K]> | FieldValidator<T[K]>
    : FieldValidator<T[K]>
}

// Settings validation schema
export const settingsSchema: SchemaValidators<AppSettings> = {
  audio: {
    inputDevice: { type: 'string', required: true },
    outputDevice: { type: 'string', required: true },
    ringtoneDevice: { type: 'string', required: true },
    inputVolume: { type: 'number', min: 0, max: 1, required: true },
    outputVolume: { type: 'number', min: 0, max: 1, required: true },
    ringtoneVolume: { type: 'number', min: 0, max: 1, required: true },
    echoCancellation: { type: 'boolean' },
    noiseSuppression: { type: 'boolean' },
    autoGainControl: { type: 'boolean' }
  },
  notifications: {
    enabled: { type: 'boolean', required: true },
    quietHoursStart: {
      type: 'string',
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      custom: (value, path) => {
        if (value && !/^\\d{2}:\\d{2}$/.test(value)) {
          return {
            path,
            code: 'INVALID_TIME_FORMAT',
            message: 'Time must be in HH:MM format',
            value
          }
        }
        return null
      }
    },
    quietHoursEnd: {
      type: 'string',
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  },
  call: {
    autoAnswerDelay: { type: 'number', min: 0, max: 60, required: true },
    forwardingNumber: {
      type: 'string',
      custom: (value, path) => {
        if (value && !/^[+]?[\\d\\s-()]+$/.test(value)) {
          return {
            path,
            code: 'INVALID_PHONE_NUMBER',
            message: 'Invalid phone number format',
            value
          }
        }
        return null
      }
    }
  },
  display: {
    theme: { type: 'string', enum: ['light', 'dark', 'system'] as const },
    language: { type: 'string', pattern: /^[a-z]{2}(-[A-Z]{2})?$/ },
    timeFormat: { type: 'string', enum: ['12h', '24h'] as const }
  },
  network: {
    sipTransport: { type: 'string', enum: ['wss', 'ws', 'tcp', 'udp'] as const },
    keepAliveInterval: { type: 'number', min: 10, max: 300 },
    registrationExpiry: { type: 'number', min: 60, max: 7200 }
  }
}

// Validation engine
export class SettingsValidator {
  private schema: SchemaValidators<AppSettings>
  private customValidators: Map<string, ValidatorFn<unknown>> = new Map()

  constructor(schema: SchemaValidators<AppSettings>) {
    this.schema = schema
  }

  validate(settings: Partial<AppSettings>): ValidationResult {
    const errors: ValidationError[] = []
    this.validateObject(settings, this.schema, '', errors)
    return {
      valid: errors.length === 0,
      errors
    }
  }

  validateField(path: string, value: unknown): ValidationResult {
    const errors: ValidationError[] = []
    const validator = this.getValidatorForPath(path)

    if (validator) {
      const error = this.validateValue(value, validator as FieldValidator<unknown>, path)
      if (error) errors.push(error)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  addCustomValidator(path: string, validator: ValidatorFn<unknown>): void {
    this.customValidators.set(path, validator)
  }

  private validateObject(
    obj: Record<string, unknown>,
    schema: Record<string, unknown>,
    basePath: string,
    errors: ValidationError[]
  ): void {
    for (const [key, validator] of Object.entries(schema)) {
      const path = basePath ? \`\${basePath}.\${key}\` : key
      const value = obj[key]

      // Check if it's a nested schema or a field validator
      if (this.isFieldValidator(validator)) {
        const error = this.validateValue(value, validator, path)
        if (error) errors.push(error)
      } else if (typeof validator === 'object' && value !== undefined) {
        this.validateObject(
          value as Record<string, unknown>,
          validator as Record<string, unknown>,
          path,
          errors
        )
      }

      // Run custom validators
      const customValidator = this.customValidators.get(path)
      if (customValidator) {
        const error = customValidator(value, path)
        if (error) errors.push(error)
      }
    }
  }

  private validateValue(
    value: unknown,
    validator: FieldValidator<unknown>,
    path: string
  ): ValidationError | null {
    // Required check
    if (validator.required && (value === undefined || value === null)) {
      return {
        path,
        code: 'REQUIRED',
        message: \`\${path} is required\`,
        value
      }
    }

    if (value === undefined || value === null) return null

    // Type check
    if (validator.type && typeof value !== validator.type) {
      return {
        path,
        code: 'INVALID_TYPE',
        message: \`Expected \${validator.type}, got \${typeof value}\`,
        value,
        constraint: validator.type
      }
    }

    // Number range check
    if (typeof value === 'number') {
      if (validator.min !== undefined && value < validator.min) {
        return {
          path,
          code: 'MIN_VALUE',
          message: \`Value must be at least \${validator.min}\`,
          value,
          constraint: validator.min
        }
      }
      if (validator.max !== undefined && value > validator.max) {
        return {
          path,
          code: 'MAX_VALUE',
          message: \`Value must be at most \${validator.max}\`,
          value,
          constraint: validator.max
        }
      }
    }

    // Pattern check
    if (validator.pattern && typeof value === 'string') {
      if (!validator.pattern.test(value)) {
        return {
          path,
          code: 'PATTERN_MISMATCH',
          message: \`Value does not match required pattern\`,
          value,
          constraint: validator.pattern.toString()
        }
      }
    }

    // Enum check
    if (validator.enum && !validator.enum.includes(value)) {
      return {
        path,
        code: 'INVALID_ENUM',
        message: \`Value must be one of: \${validator.enum.join(', ')}\`,
        value,
        constraint: validator.enum
      }
    }

    // Custom validation
    if (validator.custom) {
      return validator.custom(value, path)
    }

    return null
  }

  private isFieldValidator(obj: unknown): obj is FieldValidator<unknown> {
    if (!obj || typeof obj !== 'object') return false
    const keys = Object.keys(obj)
    return keys.some(k => ['type', 'required', 'min', 'max', 'pattern', 'enum', 'custom'].includes(k))
  }

  private getValidatorForPath(path: string): FieldValidator<unknown> | null {
    const parts = path.split('.')
    let current: unknown = this.schema

    for (const part of parts) {
      if (!current || typeof current !== 'object') return null
      current = (current as Record<string, unknown>)[part]
    }

    return this.isFieldValidator(current) ? current : null
  }
}

// Create default validator instance
export const settingsValidator = new SettingsValidator(settingsSchema)

// Composable for Vue integration
export function useSettingsValidation() {
  const validate = (settings: Partial<AppSettings>) => settingsValidator.validate(settings)
  const validateField = (path: string, value: unknown) => settingsValidator.validateField(path, value)

  return {
    validate,
    validateField,
    addCustomValidator: (path: string, fn: ValidatorFn<unknown>) =>
      settingsValidator.addCustomValidator(path, fn)
  }
}`,
    },
  ],
}
