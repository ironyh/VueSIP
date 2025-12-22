# Settings Manager Guide

Complete guide to using VueSip's comprehensive settings management system.

## Overview

The Settings Manager provides a robust, type-safe solution for managing application settings with:

- **Persistent Storage** - Automatic localStorage persistence
- **Cloud Sync** - Optional cross-device synchronization
- **Validation** - Built-in and custom validation rules
- **Export/Import** - Backup and restore settings
- **Type Safety** - Full TypeScript support
- **Reactivity** - Vue 3 reactive system integration

## Quick Start

### Basic Setup

```typescript
import { useSettings } from 'vuesip'

const settings = useSettings({
  storageKey: 'my-app-settings',
  defaults: {
    audio: {
      inputDevice: 'default',
      outputDevice: 'default',
      ringtoneVolume: 0.8
    },
    notifications: {
      enabled: true,
      sound: true
    }
  }
})
```

### Reading Settings

```typescript
// Get single value with dot notation
const volume = settings.get('audio.ringtoneVolume')

// Get entire section
const audioSettings = settings.get('audio')

// Access all settings
const allSettings = settings.current
```

### Updating Settings

```typescript
// Update single value
settings.set('audio.ringtoneVolume', 0.5)

// Update multiple values
settings.update({
  audio: {
    ringtoneVolume: 0.6,
    inputDevice: 'device-123'
  },
  notifications: {
    enabled: false
  }
})
```

## Settings Structure

### Default Structure

VueSip provides a comprehensive default settings structure:

```typescript
interface AppSettings {
  audio: AudioSettings
  notifications: NotificationSettings
  call: CallSettings
  display: DisplaySettings
  network: NetworkSettings
  privacy: PrivacySettings
  version: string
  lastUpdated: string
}
```

### Audio Settings

```typescript
interface AudioSettings {
  inputDevice: string           // Microphone device ID
  outputDevice: string          // Speaker device ID
  ringtoneDevice: string        // Ringtone device ID
  inputVolume: number           // 0-1 range
  outputVolume: number          // 0-1 range
  ringtoneVolume: number        // 0-1 range
  echoCancellation: boolean     // Echo cancellation enabled
  noiseSuppression: boolean     // Noise suppression enabled
  autoGainControl: boolean      // Auto gain control enabled
}
```

### Notification Settings

```typescript
interface NotificationSettings {
  enabled: boolean              // Master toggle
  sound: boolean                // Sound notifications
  vibrate: boolean              // Vibration (mobile)
  desktop: boolean              // Desktop notifications
  incomingCalls: boolean        // Notify on incoming calls
  missedCalls: boolean          // Notify on missed calls
  voicemail: boolean            // Notify on voicemail
  messages: boolean             // Notify on messages
  quietHoursEnabled: boolean    // Quiet hours feature
  quietHoursStart: string       // Start time (HH:MM)
  quietHoursEnd: string         // End time (HH:MM)
}
```

### Call Settings

```typescript
interface CallSettings {
  autoAnswer: boolean           // Auto-answer calls
  autoAnswerDelay: number       // Delay in seconds
  callWaiting: boolean          // Call waiting enabled
  doNotDisturb: boolean         // Do not disturb mode
  forwardingEnabled: boolean    // Call forwarding
  forwardingNumber: string      // Forward to number
  voicemailEnabled: boolean     // Voicemail enabled
  recordingEnabled: boolean     // Call recording
  recordingAutoStart: boolean   // Auto-start recording
}
```

## Validation

### Built-in Validation

The Settings Manager includes built-in validation:

```typescript
const result = settings.update({
  audio: { inputVolume: 1.5 } // Invalid: > 1.0
})

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(error.message)
    // "Value must be at most 1"
  })
}
```

### Custom Validation

Add custom validation rules:

```typescript
import { useSettingsValidation } from 'vuesip'

const { addCustomValidator } = useSettingsValidation()

addCustomValidator('call.forwardingNumber', (value) => {
  if (value && !/^\+?[\d\s-()]+$/.test(value)) {
    return {
      path: 'call.forwardingNumber',
      code: 'INVALID_PHONE_NUMBER',
      message: 'Invalid phone number format',
      value
    }
  }
  return null
})
```

### Validation Errors

Detailed error information:

```typescript
interface ValidationError {
  path: string        // 'audio.inputVolume'
  code: string        // 'MAX_VALUE'
  message: string     // 'Value must be at most 1'
  value: unknown      // 1.5
  constraint?: unknown // 1
}
```

## Persistence

### Automatic Persistence

Settings are automatically saved to localStorage:

```typescript
const settings = useSettings({
  storageKey: 'vuesip-settings',
  autoSave: true  // Default
})

// Changes are automatically saved
settings.set('audio.inputVolume', 0.8)
// Saved to localStorage immediately
```

### Manual Persistence

Control when settings are saved:

```typescript
const settings = useSettings({
  autoSave: false
})

// Make changes
settings.set('audio.inputVolume', 0.8)
settings.set('display.theme', 'dark')

// Save manually
settings.save()
```

### Load from Storage

Settings are automatically loaded on initialization:

```typescript
// Settings are loaded from localStorage if available
const settings = useSettings()

// Check if settings were loaded
const hasStoredSettings = settings.hasUnsavedChanges === false
```

## Export and Import

### Export Settings

Export settings to JSON:

```typescript
// Get JSON string
const json = settings.export()

// Download as file
const blob = new Blob([json], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'vuesip-settings.json'
a.click()
URL.revokeObjectURL(url)
```

### Import Settings

Import settings from JSON:

```typescript
// From string
const result = settings.import(jsonString)

// From file
const file = event.target.files[0]
const text = await file.text()
const result = settings.import(text)

if (!result.valid) {
  console.error('Import failed:', result.errors)
}
```

## Cloud Sync

### Enable Cloud Sync

Optional cloud synchronization:

```typescript
import { createSettingsSync } from 'vuesip'

const sync = createSettingsSync({
  apiEndpoint: 'https://api.example.com',
  userId: 'user-123',
  authToken: 'token-456',
  syncInterval: 30000, // 30 seconds
  conflictResolution: 'merge' // or 'local', 'remote', 'prompt'
})

// Start automatic sync
sync.startAutoSync()

// Manual sync
await sync.sync()
```

### Conflict Resolution

Handle sync conflicts:

```typescript
const sync = createSettingsSync({
  conflictResolution: 'prompt'
})

sync.onConflict(async (conflict) => {
  // Custom resolution UI
  const userChoice = await showConflictDialog(conflict)
  return userChoice // 'local' or 'remote'
})
```

## Change Listeners

### Listen for Changes

React to settings changes:

```typescript
const unsubscribe = settings.onChange((newSettings) => {
  console.log('Settings updated:', newSettings)
})

// Cleanup
unsubscribe()
```

### Watch Specific Settings

Watch for changes to specific paths:

```typescript
import { watch } from 'vue'

watch(
  () => settings.get('audio.inputDevice'),
  (newDevice, oldDevice) => {
    console.log(`Input device changed from ${oldDevice} to ${newDevice}`)
  }
)
```

## Reset to Defaults

### Reset All Settings

```typescript
settings.reset()
```

### Reset Section

```typescript
settings.reset('audio') // Reset only audio settings
```

### Reset with Confirmation

```vue
<template>
  <button @click="handleReset">Reset to Defaults</button>
</template>

<script setup>
const handleReset = () => {
  if (confirm('Reset all settings to defaults?')) {
    settings.reset()
  }
}
</script>
```

## Advanced Usage

### Custom Settings Structure

Extend the default structure:

```typescript
interface CustomSettings extends AppSettings {
  custom: {
    theme: string
    customField: number
  }
}

const settings = useSettings<CustomSettings>({
  defaults: {
    ...defaultSettings,
    custom: {
      theme: 'blue',
      customField: 42
    }
  }
})
```

### Settings Class

Use the SettingsManager class directly:

```typescript
import { SettingsManager } from 'vuesip'

const manager = new SettingsManager('my-storage-key')

// Access current settings
const current = manager.current

// Update with validation
const result = manager.update({ audio: { inputVolume: 0.8 } })

// Save manually
manager.save()
```

## Best Practices

### 1. Use Descriptive Storage Keys

```typescript
// Good
const settings = useSettings({
  storageKey: 'myapp-v2-settings'
})

// Bad
const settings = useSettings({
  storageKey: 'settings'
})
```

### 2. Validate User Input

```typescript
const handleVolumeChange = (value: number) => {
  const result = settings.update({
    audio: { inputVolume: value }
  })

  if (!result.valid) {
    showError(result.errors[0].message)
    return
  }
}
```

### 3. Handle Migration

```typescript
const migrateSettings = (oldSettings: OldSettings): AppSettings => {
  return {
    audio: {
      inputDevice: oldSettings.mic || 'default',
      outputDevice: oldSettings.speaker || 'default',
      // ... map other fields
    }
  }
}

const hasOldSettings = localStorage.getItem('old-settings-key')
if (hasOldSettings) {
  const old = JSON.parse(hasOldSettings)
  settings.import(migrateSettings(old))
  localStorage.removeItem('old-settings-key')
}
```

### 4. Provide User Feedback

```vue
<template>
  <div class="settings-status">
    <span v-if="settings.hasUnsavedChanges">
      Unsaved changes
      <button @click="settings.save()">Save</button>
    </span>
    <span v-else>
      All changes saved ✓
    </span>
  </div>
</template>
```

## Performance

### Lazy Loading

Load settings only when needed:

```typescript
const settings = ref(null)

onMounted(() => {
  settings.value = useSettings()
})
```

### Debounced Updates

Debounce frequent updates:

```typescript
import { useDebounceFn } from '@vueuse/core'

const debouncedUpdate = useDebounceFn((key, value) => {
  settings.set(key, value)
}, 500)

// In component
<input @input="e => debouncedUpdate('audio.inputVolume', e.target.value)" />
```

## Troubleshooting

### Settings Not Persisting

Check localStorage availability:

```typescript
const settings = useSettings({
  storageKey: 'vuesip-settings',
  onError: (error) => {
    console.error('Settings error:', error)
  }
})
```

### Validation Failing

Debug validation errors:

```typescript
const result = settings.update(newSettings)
if (!result.valid) {
  console.table(result.errors)
}
```

### Cloud Sync Issues

Monitor sync status:

```typescript
const syncStatus = computed(() => sync.syncStatus.value)

watch(syncStatus, (status) => {
  if (status.error) {
    console.error('Sync error:', status.error)
  }
  if (!navigator.onLine) {
    console.log('Offline - sync will resume when online')
  }
})
```

## See Also

- [Migration Guide](../settings-migration-guide.md)
- [Keyboard Shortcuts](../keyboard-shortcuts.md)
- [API Documentation](../api/settings-manager.md)
- [Examples](../examples/settings.md)
