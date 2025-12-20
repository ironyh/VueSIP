# Settings Manager Migration Guide

This guide helps you migrate from the old `SettingsDemo` component to the new comprehensive Settings Manager system.

## Overview

The new Settings Manager provides:

- ✅ **Type-safe settings** with full TypeScript support
- ✅ **Persistent storage** with localStorage and cloud sync
- ✅ **Validation system** with custom rules and error reporting
- ✅ **Reactive updates** with Vue 3 composition API
- ✅ **Export/Import** for backup and migration
- ✅ **Keyboard shortcuts** for power users
- ✅ **Cross-device sync** with cloud storage (optional)

## Breaking Changes

### 1. **New Import Path**

**Before:**
```typescript
import { SettingsDemo } from '@/playground/demos'
```

**After:**
```typescript
import { useSettings } from 'vuesip'
```

### 2. **API Changes**

The settings API has been completely redesigned for better type safety and consistency.

**Before:**
```typescript
// Old approach - direct localStorage access
const settings = {
  audioInput: localStorage.getItem('audioInput') || 'default',
  audioOutput: localStorage.getItem('audioOutput') || 'default'
}

// Manual persistence
localStorage.setItem('audioInput', device.id)
```

**After:**
```typescript
// New approach - managed settings with validation
const settings = useSettings({
  storageKey: 'vuesip-settings',
  defaults: defaultSettings,
  onSettingChange: (key, value) => {
    console.log(`Setting ${key} changed to`, value)
  }
})

// Automatic persistence and validation
settings.set('audio.inputDevice', device.id)
```

### 3. **Settings Structure**

**Before:**
```typescript
// Flat structure
interface Settings {
  audioInput: string
  audioOutput: string
  ringtoneVolume: number
  notificationsEnabled: boolean
}
```

**After:**
```typescript
// Hierarchical structure with namespaces
interface AppSettings {
  audio: AudioSettings
  notifications: NotificationSettings
  call: CallSettings
  display: DisplaySettings
  network: NetworkSettings
  privacy: PrivacySettings
}
```

### 4. **Validation**

**Before:**
```typescript
// Manual validation
if (volume < 0 || volume > 1) {
  throw new Error('Invalid volume')
}
```

**After:**
```typescript
// Built-in validation with detailed errors
const result = settings.update({ audio: { inputVolume: 1.5 } })
if (!result.valid) {
  console.error(result.errors)
  // [{
  //   path: 'audio.inputVolume',
  //   code: 'MAX_VALUE',
  //   message: 'Value must be at most 1',
  //   value: 1.5,
  //   constraint: 1
  // }]
}
```

## Migration Steps

### Step 1: Update Dependencies

Ensure you have the latest version of VueSip:

```bash
npm install vuesip@latest
# or
pnpm install vuesip@latest
```

### Step 2: Update Imports

Replace old imports with new composable:

```typescript
// Remove old imports
// import { SettingsDemo } from '@/playground/demos'

// Add new imports
import { useSettings } from 'vuesip'
import type { AppSettings } from 'vuesip'
```

### Step 3: Initialize Settings Manager

**Before:**
```vue
<script setup>
const audioInput = ref(localStorage.getItem('audioInput') || 'default')
const audioOutput = ref(localStorage.getItem('audioOutput') || 'default')

watch(audioInput, (value) => {
  localStorage.setItem('audioInput', value)
})
</script>
```

**After:**
```vue
<script setup>
import { useSettings } from 'vuesip'

const settings = useSettings({
  storageKey: 'vuesip-settings',
  defaults: {
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
    }
  }
})

// Access settings reactively
const audioInput = computed(() => settings.get('audio.inputDevice'))
const audioOutput = computed(() => settings.get('audio.outputDevice'))
</script>
```

### Step 4: Update Setting Access Patterns

**Before:**
```typescript
// Direct access
const volume = audioSettings.value.volume

// Direct mutation
audioSettings.value.volume = 0.5
```

**After:**
```typescript
// Path-based access
const volume = settings.get('audio.inputVolume')

// Validated mutation
settings.set('audio.inputVolume', 0.5)
```

### Step 5: Add Validation (Optional)

```typescript
import { useSettingsValidation } from 'vuesip'

const { validate, addCustomValidator } = useSettingsValidation()

// Add custom validation
addCustomValidator('audio.inputVolume', (value) => {
  if (value < 0.1) {
    return {
      path: 'audio.inputVolume',
      code: 'TOO_QUIET',
      message: 'Volume is too low for practical use',
      value
    }
  }
  return null
})
```

### Step 6: Implement Export/Import

```vue
<template>
  <div class="settings-actions">
    <button @click="exportSettings">Export Settings</button>
    <button @click="importSettings">Import Settings</button>
    <button @click="resetSettings">Reset to Defaults</button>
  </div>
</template>

<script setup>
const exportSettings = () => {
  const data = settings.export()
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
    const file = e.target.files[0]
    if (file) {
      const text = await file.text()
      const result = settings.import(text)
      if (!result.valid) {
        alert('Invalid settings file')
      }
    }
  }
  input.click()
}

const resetSettings = () => {
  if (confirm('Reset all settings to defaults?')) {
    settings.reset()
  }
}
</script>
```

## Backward Compatibility

### Using Old Settings Format

If you need to maintain backward compatibility:

```typescript
// Migration helper
const migrateOldSettings = () => {
  const oldSettings = {
    audioInput: localStorage.getItem('audioInput'),
    audioOutput: localStorage.getItem('audioOutput'),
    ringtoneVolume: parseFloat(localStorage.getItem('ringtoneVolume') || '0.8'),
    notificationsEnabled: localStorage.getItem('notificationsEnabled') === 'true'
  }

  // Convert to new format
  settings.update({
    audio: {
      inputDevice: oldSettings.audioInput || 'default',
      outputDevice: oldSettings.audioOutput || 'default',
      ringtoneVolume: oldSettings.ringtoneVolume
    },
    notifications: {
      enabled: oldSettings.notificationsEnabled
    }
  })

  // Clean up old keys
  localStorage.removeItem('audioInput')
  localStorage.removeItem('audioOutput')
  localStorage.removeItem('ringtoneVolume')
  localStorage.removeItem('notificationsEnabled')
}

// Run migration on first use
const hasOldSettings = localStorage.getItem('audioInput') !== null
if (hasOldSettings) {
  migrateOldSettings()
}
```

## Feature Comparison

| Feature | Old System | New System |
|---------|-----------|-----------|
| **Type Safety** | ❌ None | ✅ Full TypeScript |
| **Validation** | ❌ Manual | ✅ Built-in + Custom |
| **Persistence** | ❌ Manual localStorage | ✅ Automatic + Cloud sync |
| **Export/Import** | ❌ None | ✅ JSON export/import |
| **Namespaces** | ❌ Flat structure | ✅ Hierarchical |
| **Change Tracking** | ❌ None | ✅ onChange listeners |
| **Undo/Redo** | ❌ None | ✅ Built-in |
| **Deep Path Access** | ❌ None | ✅ Dot notation |
| **Validation Errors** | ❌ None | ✅ Detailed errors |
| **Cloud Sync** | ❌ None | ✅ Optional |

## Common Migration Scenarios

### Scenario 1: Simple Audio Settings

**Before:**
```typescript
const audioInput = ref('default')
watch(audioInput, (val) => localStorage.setItem('audioInput', val))
```

**After:**
```typescript
const settings = useSettings()
const audioInput = computed({
  get: () => settings.get('audio.inputDevice'),
  set: (val) => settings.set('audio.inputDevice', val)
})
```

### Scenario 2: Notification Settings

**Before:**
```typescript
const notifications = reactive({
  enabled: true,
  sound: true,
  desktop: true
})
```

**After:**
```typescript
const notifications = computed(() => settings.current.notifications)
// Or update multiple at once:
settings.update({
  notifications: {
    enabled: true,
    sound: true,
    desktop: true
  }
})
```

### Scenario 3: Settings Panel

**Before:**
```vue
<template>
  <div>
    <select v-model="audioInput">
      <option v-for="device in devices" :value="device.id">
        {{ device.label }}
      </option>
    </select>
  </div>
</template>
```

**After:**
```vue
<template>
  <div>
    <select :value="settings.get('audio.inputDevice')"
            @change="e => settings.set('audio.inputDevice', e.target.value)">
      <option v-for="device in devices" :value="device.id">
        {{ device.label }}
      </option>
    </select>
  </div>
</template>
```

## Testing Your Migration

### 1. Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { useSettings } from 'vuesip'

describe('Settings Migration', () => {
  it('should maintain backward compatibility', () => {
    const settings = useSettings()

    // Old format
    const oldValue = 'device-123'

    // New format
    settings.set('audio.inputDevice', oldValue)

    expect(settings.get('audio.inputDevice')).toBe(oldValue)
  })

  it('should validate new settings', () => {
    const settings = useSettings()

    const result = settings.update({
      audio: { inputVolume: 1.5 }
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].code).toBe('MAX_VALUE')
  })
})
```

### 2. Integration Tests

```typescript
it('should persist settings across reloads', () => {
  const settings1 = useSettings({ storageKey: 'test-settings' })
  settings1.set('audio.inputVolume', 0.75)
  settings1.save()

  // Simulate reload
  const settings2 = useSettings({ storageKey: 'test-settings' })

  expect(settings2.get('audio.inputVolume')).toBe(0.75)
})
```

## Troubleshooting

### Issue: Settings Not Persisting

**Problem:**
```typescript
settings.set('audio.inputVolume', 0.5)
// After reload, value is back to default
```

**Solution:**
```typescript
// Ensure you call save() or enable auto-save
settings.set('audio.inputVolume', 0.5)
settings.save() // Manual save

// Or use auto-save (enabled by default)
const settings = useSettings({
  autoSave: true // Default
})
```

### Issue: Validation Errors

**Problem:**
```typescript
const result = settings.update(newSettings)
// result.valid is false but no clear reason
```

**Solution:**
```typescript
const result = settings.update(newSettings)
if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`)
    console.error(`  Code: ${error.code}`)
    console.error(`  Value: ${error.value}`)
    console.error(`  Constraint: ${error.constraint}`)
  })
}
```

### Issue: Type Errors

**Problem:**
```typescript
// TypeScript error: Property 'audio' does not exist
settings.get('audios.inputDevice')
```

**Solution:**
```typescript
// Use correct path with autocomplete
settings.get('audio.inputDevice')

// Or define custom type
interface CustomSettings extends AppSettings {
  custom: {
    theme: string
  }
}

const settings = useSettings<CustomSettings>()
```

## Getting Help

- 📚 [Full API Documentation](./api/settings-manager.md)
- 💡 [Code Examples](./examples/settings.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Community Discord](https://discord.gg/your-server)

## Next Steps

1. ✅ Complete migration using this guide
2. ✅ Add validation for your specific use cases
3. ✅ Implement export/import functionality
4. ✅ Consider adding cloud sync (optional)
5. ✅ Update your tests
6. ✅ Review keyboard shortcuts documentation

---

**Migration Checklist:**

- [ ] Update dependencies to latest VueSip
- [ ] Replace old imports with new composable
- [ ] Update settings structure to hierarchical format
- [ ] Implement validation where needed
- [ ] Add export/import functionality
- [ ] Update tests
- [ ] Remove old localStorage code
- [ ] Test thoroughly in production-like environment
- [ ] Update documentation
- [ ] Deploy and monitor
