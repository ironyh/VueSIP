# Settings Persistence

Application settings with persistent storage.

::: tip Try It Live
Run `pnpm dev` → Navigate to **SettingsDemo** in the playground
:::

## Overview

Settings management features:

- Audio preferences
- Ringtone selection
- Notification settings
- Theme preferences
- Session persistence

## Quick Start

```vue
<script setup lang="ts">
import { useSessionPersistence } from 'vuesip'

const { savedSessions, saveSession, restoreSession, deleteSession, clearAllSessions } =
  useSessionPersistence()

// Settings are automatically persisted
const settings = reactive({
  ringtone: 'default',
  volume: 0.8,
  autoAnswer: false,
  notifications: true,
})

// Watch and persist settings changes
watch(
  settings,
  (newSettings) => {
    localStorage.setItem('vuesip-settings', JSON.stringify(newSettings))
  },
  { deep: true }
)
</script>

<template>
  <div class="settings-demo">
    <h3>Audio Settings</h3>
    <label>
      Volume
      <input type="range" v-model.number="settings.volume" min="0" max="1" step="0.1" />
    </label>

    <label>
      Ringtone
      <select v-model="settings.ringtone">
        <option value="default">Default</option>
        <option value="classic">Classic</option>
        <option value="modern">Modern</option>
      </select>
    </label>

    <h3>Behavior</h3>
    <label>
      <input type="checkbox" v-model="settings.autoAnswer" />
      Auto-Answer Calls
    </label>

    <label>
      <input type="checkbox" v-model="settings.notifications" />
      Enable Notifications
    </label>

    <h3>Saved Sessions</h3>
    <div v-for="session in savedSessions" :key="session.id">
      {{ session.name }}
      <button @click="restoreSession(session.id)">Restore</button>
      <button @click="deleteSession(session.id)">Delete</button>
    </div>
  </div>
</template>
```

## Key Composables

| Composable              | Purpose               |
| ----------------------- | --------------------- |
| `useSessionPersistence` | Session state storage |

## Related

- [Audio Devices](/examples/audio-devices)
- [Call History](/examples/call-history)
- [Connection Recovery](/examples/connection-recovery)
