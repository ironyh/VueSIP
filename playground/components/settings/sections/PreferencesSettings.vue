<template>
  <div class="preferences-settings">
    <h3>User Preferences</h3>

    <!-- Appearance -->
    <div class="settings-section">
      <h4>Appearance</h4>

      <div class="field-group">
        <label for="theme">Theme</label>
        <select id="theme" v-model="theme" @change="handleThemeChange">
          <option value="auto">Auto (System)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p class="field-help">
          <span v-if="theme === 'auto'">Follow system dark mode preference</span>
          <span v-else-if="theme === 'light'">Use light theme</span>
          <span v-else>Use dark theme</span>
        </p>
      </div>

      <div class="field-group">
        <label for="language">Language</label>
        <select id="language" v-model="language" @change="handleLanguageChange">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
        <p class="field-help">Interface language (requires page reload)</p>
      </div>
    </div>

    <!-- Notifications -->
    <div class="settings-section">
      <h4>Notifications</h4>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="enableDesktopNotifications" @change="handleNotificationChange" />
          <span>Enable Desktop Notifications</span>
        </label>
        <p class="field-help">Show system notifications for incoming calls and messages</p>
      </div>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="enableSoundNotifications" @change="handleNotificationChange" />
          <span>Enable Sound Notifications</span>
        </label>
        <p class="field-help">Play sounds for events</p>
      </div>

      <div class="checkbox-group" v-if="enableDesktopNotifications">
        <label>
          <input type="checkbox" v-model="notifyOnMissedCalls" @change="handleNotificationChange" />
          <span>Notify on Missed Calls</span>
        </label>
      </div>

      <div class="checkbox-group" v-if="enableDesktopNotifications">
        <label>
          <input type="checkbox" v-model="notifyOnNewMessages" @change="handleNotificationChange" />
          <span>Notify on New Messages</span>
        </label>
      </div>
    </div>

    <!-- Keyboard Shortcuts -->
    <div class="settings-section">
      <h4>Keyboard Shortcuts</h4>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="enableKeyboardShortcuts" @change="handleShortcutsChange" />
          <span>Enable Keyboard Shortcuts</span>
        </label>
        <p class="field-help">Use keyboard shortcuts for common actions</p>
      </div>

      <div v-if="enableKeyboardShortcuts" class="shortcuts-list">
        <div class="shortcut-item">
          <span class="shortcut-keys">
            <kbd>Ctrl</kbd> + <kbd>D</kbd>
          </span>
          <span class="shortcut-description">Toggle Do Not Disturb</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-keys">
            <kbd>Ctrl</kbd> + <kbd>M</kbd>
          </span>
          <span class="shortcut-description">Toggle Mute</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-keys">
            <kbd>Ctrl</kbd> + <kbd>H</kbd>
          </span>
          <span class="shortcut-description">Toggle Hold</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-keys">
            <kbd>Ctrl</kbd> + <kbd>E</kbd>
          </span>
          <span class="shortcut-description">End Call</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-keys">
            <kbd>Ctrl</kbd> + <kbd>Z</kbd>
          </span>
          <span class="shortcut-description">Undo Settings Change</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-keys">
            <kbd>Ctrl</kbd> + <kbd>Y</kbd>
          </span>
          <span class="shortcut-description">Redo Settings Change</span>
        </div>
      </div>
    </div>

    <!-- Advanced -->
    <div class="settings-section">
      <h4>Advanced</h4>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="debugMode" @change="handleDebugChange" />
          <span>Debug Mode</span>
        </label>
        <p class="field-help">Enable detailed logging (console and logs)</p>
      </div>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="autoSaveSettings" @change="handleAutoSaveChange" />
          <span>Auto-Save Settings</span>
        </label>
        <p class="field-help">Automatically save settings changes</p>
      </div>

      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="rememberCredentials" @change="handleCredentialsChange" />
          <span>Remember Credentials</span>
        </label>
        <p class="field-help">
          <span class="warning">⚠️ Store credentials locally (less secure)</span>
        </p>
      </div>

      <div class="field-group">
        <label for="log-level">Log Level</label>
        <select id="log-level" v-model="logLevel" @change="handleLogLevelChange" :disabled="!debugMode">
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
          <option value="trace">Trace</option>
        </select>
        <p class="field-help">Level of detail in logs (requires debug mode)</p>
      </div>
    </div>

    <!-- Storage & Data -->
    <div class="settings-section">
      <h4>Storage & Data</h4>

      <div class="storage-stats">
        <div class="stat-row">
          <span class="stat-label">Settings Size:</span>
          <span class="stat-value">{{ storageSize }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Call History:</span>
          <span class="stat-value">{{ callHistoryCount }} calls</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Cached Data:</span>
          <span class="stat-value">{{ cachedDataSize }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-secondary" @click="clearCallHistory">Clear Call History</button>
        <button class="btn-secondary" @click="clearCache">Clear Cache</button>
        <button class="btn-danger" @click="clearAllData">Clear All Data</button>
      </div>
    </div>

    <!-- Reset -->
    <div class="settings-section">
      <h4>Reset Settings</h4>

      <div class="reset-warning">
        <p>
          <strong>⚠️ Warning:</strong> This will reset all settings to their default values. This
          action cannot be undone.
        </p>
      </div>

      <button class="btn-danger-large" @click="handleResetSettings">Reset All Settings</button>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="dialog-overlay" @click="closeConfirmDialog">
      <div class="dialog" @click.stop>
        <h3>{{ confirmTitle }}</h3>
        <p>{{ confirmMessage }}</p>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="closeConfirmDialog">Cancel</button>
          <button class="btn-danger" @click="confirmAction">{{ confirmButtonText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  'update:settings': [settings: Record<string, any>]
  'reset-all': []
}>()

// Appearance
const theme = ref<'auto' | 'light' | 'dark'>('auto')
const language = ref('en')

// Notifications
const enableDesktopNotifications = ref(false)
const enableSoundNotifications = ref(true)
const notifyOnMissedCalls = ref(true)
const notifyOnNewMessages = ref(true)

// Keyboard Shortcuts
const enableKeyboardShortcuts = ref(true)

// Advanced
const debugMode = ref(false)
const autoSaveSettings = ref(true)
const rememberCredentials = ref(false)
const logLevel = ref<'error' | 'warn' | 'info' | 'debug' | 'trace'>('info')

// Storage
const storageSize = ref('0 KB')
const callHistoryCount = ref(0)
const cachedDataSize = ref('0 KB')

// Confirmation dialog
const showConfirmDialog = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmButtonText = ref('Confirm')
const confirmCallback = ref<(() => void) | null>(null)

// Methods
const handleThemeChange = () => {
  applyTheme(theme.value)
  emitSettings()
}

const handleLanguageChange = () => {
  emitSettings()
  // In production, this would trigger i18n language change
}

const handleNotificationChange = () => {
  if (enableDesktopNotifications.value && Notification.permission === 'default') {
    requestNotificationPermission()
  }
  emitSettings()
}

const handleShortcutsChange = () => {
  emitSettings()
}

const handleDebugChange = () => {
  emitSettings()
}

const handleAutoSaveChange = () => {
  emitSettings()
}

const handleCredentialsChange = () => {
  emitSettings()
}

const handleLogLevelChange = () => {
  emitSettings()
}

const emitSettings = () => {
  const settings = {
    userPreferences: {
      theme: theme.value,
      language: language.value,
      enableDesktopNotifications: enableDesktopNotifications.value,
      enableSoundNotifications: enableSoundNotifications.value,
      notifyOnMissedCalls: notifyOnMissedCalls.value,
      notifyOnNewMessages: notifyOnNewMessages.value,
      enableKeyboardShortcuts: enableKeyboardShortcuts.value,
      debugMode: debugMode.value,
      autoSaveSettings: autoSaveSettings.value,
      rememberCredentials: rememberCredentials.value,
      logLevel: logLevel.value,
    },
  }

  emit('update:settings', settings)
}

const applyTheme = (selectedTheme: 'auto' | 'light' | 'dark') => {
  const isDark =
    selectedTheme === 'dark' ||
    (selectedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      enableDesktopNotifications.value = false
    }
  }
}

const clearCallHistory = () => {
  showConfirm(
    'Clear Call History',
    'Are you sure you want to clear all call history? This action cannot be undone.',
    'Clear History',
    () => {
      // Clear call history
      callHistoryCount.value = 0
      console.log('Call history cleared')
    }
  )
}

const clearCache = () => {
  showConfirm('Clear Cache', 'Are you sure you want to clear all cached data?', 'Clear Cache', () => {
    // Clear cache
    cachedDataSize.value = '0 KB'
    console.log('Cache cleared')
  })
}

const clearAllData = () => {
  showConfirm(
    'Clear All Data',
    'Are you sure you want to clear ALL data including settings, call history, and cache? This action cannot be undone.',
    'Clear All',
    () => {
      // Clear all data
      storageSize.value = '0 KB'
      callHistoryCount.value = 0
      cachedDataSize.value = '0 KB'
      localStorage.clear()
      console.log('All data cleared')
    }
  )
}

const handleResetSettings = () => {
  showConfirm(
    'Reset All Settings',
    'Are you sure you want to reset all settings to their default values? This action cannot be undone.',
    'Reset Settings',
    () => {
      emit('reset-all')
      // Reset to defaults
      theme.value = 'auto'
      language.value = 'en'
      enableDesktopNotifications.value = false
      enableSoundNotifications.value = true
      notifyOnMissedCalls.value = true
      notifyOnNewMessages.value = true
      enableKeyboardShortcuts.value = true
      debugMode.value = false
      autoSaveSettings.value = true
      rememberCredentials.value = false
      logLevel.value = 'info'
      emitSettings()
    }
  )
}

const showConfirm = (title: string, message: string, buttonText: string, callback: () => void) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmButtonText.value = buttonText
  confirmCallback.value = callback
  showConfirmDialog.value = true
}

const closeConfirmDialog = () => {
  showConfirmDialog.value = false
  confirmCallback.value = null
}

const confirmAction = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  closeConfirmDialog()
}

const calculateStorageSize = () => {
  let total = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return `${(total / 1024).toFixed(2)} KB`
}

onMounted(() => {
  // Apply theme on mount
  applyTheme(theme.value)

  // Calculate storage sizes
  storageSize.value = calculateStorageSize()
  callHistoryCount.value = 0 // Would load from storage
  cachedDataSize.value = '0 KB' // Would calculate from cache
})
</script>

<style scoped>
.preferences-settings {
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

.field-group {
  margin-bottom: 1rem;
}

.field-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.field-group select,
.field-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
}

.field-help {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0 0;
}

.warning {
  color: var(--color-warning);
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

.shortcuts-list {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: 4px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-keys {
  display: flex;
  gap: 0.25rem;
  font-family: monospace;
}

kbd {
  padding: 0.25rem 0.5rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.shortcut-description {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.storage-stats {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: 4px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-weight: 500;
  color: var(--color-text);
}

.stat-value {
  color: var(--color-text-secondary);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-secondary,
.btn-danger,
.btn-danger-large {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-secondary {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-border);
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-danger-large {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #dc2626;
  color: white;
}

.btn-danger-large:hover {
  background: #b91c1c;
}

.reset-warning {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid #dc2626;
  border-radius: 4px;
}

.reset-warning p {
  margin: 0;
  color: var(--color-text);
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--color-background);
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dialog h3 {
  margin: 0 0 1rem 0;
}

.dialog p {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
