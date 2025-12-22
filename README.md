# VueSip

Headless Vue components that makes it possible to create great working SIP interfaces!

VueSip provides a set of powerful, headless Vue 3 composables for building SIP (Session Initiation Protocol) interfaces with Asterisk and other VoIP systems. Built with TypeScript and designed for flexibility, VueSip gives you the business logic while letting you control the UI.

## Features

✨ **Headless Components** - Complete separation of logic and UI
📞 **Full SIP Support** - WebRTC-based calling with SIP.js
🎨 **UI Agnostic** - Use with any UI framework (PrimeVue, Vuetify, etc.)
🔌 **Composable Architecture** - Vue 3 Composition API
🎯 **TypeScript** - Full type safety and IntelliSense
📱 **DTMF Support** - Send dialpad tones during calls
🎤 **Audio Device Management** - Select microphones and speakers
⚙️ **Settings Manager** - Persistent settings with validation and cloud sync
⌨️ **Keyboard Shortcuts** - Power user shortcuts for all features
💾 **Export/Import** - Backup and restore settings
⚡ **Modern Stack** - Vue 3, Vite, TypeScript
> A headless Vue.js component library for SIP/VoIP applications

[![npm version](https://img.shields.io/npm/v/vuesip.svg)](https://www.npmjs.com/package/vuesip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install vuesip
# or
yarn add vuesip
# or
pnpm add vuesip
```

## Quick Start

```vue
<script setup lang="ts">
import { useSipClient, useCallSession } from 'vuesip'

const clientConfig = {
  uri: 'wss://sip.example.com',
  sipUri: 'sip:user@example.com',
  password: 'secret',
  displayName: 'John Doe',
  autoRegister: true
}

const { connect, isConnected, isRegistered } = useSipClient(clientConfig)
const { currentCall, makeCall, hangup } = useCallSession()

// Connect to SIP server
await connect()

// Make a call
await makeCall('sip:2000@example.com')
</script>
```

## Core Composables

### useSipClient

Manages SIP server connection and registration.

```typescript
import { useSipClient } from 'vuesip'

const {
  isConnected,      // Ref<boolean> - Connection state
  isRegistered,     // Ref<boolean> - Registration state
  connect,          // () => Promise<void> - Connect to server
  disconnect,       // () => Promise<void> - Disconnect from server
  register,         // () => Promise<void> - Register manually
  unregister        // () => Promise<void> - Unregister manually
} = useSipClient(config)
```

**Configuration:**

```typescript
interface SipClientConfig {
  uri: string                 // SIP server WebSocket URI
  sipUri: string              // SIP username/URI
  password: string            // SIP password
  displayName?: string        // Display name for calls
  autoRegister?: boolean      // Auto-register on connect (default: true)
}
```

### useCallSession

Manages call state and operations.

```typescript
import { useCallSession } from 'vuesip'

const {
  state,              // Ref<CallState> - Current call state
  remoteUri,          // Ref<string | undefined> - Remote party URI
  isOnHold,           // Ref<boolean> - Hold status
  makeCall,           // (target: string) => Promise<void> - Start call
  answer,             // (options?: AnswerOptions) => Promise<void> - Answer call
  hangup,             // () => Promise<void> - End call
  hold,               // () => Promise<void> - Hold call
  unhold,             // () => Promise<void> - Resume call
  transfer            // (target: string) => Promise<void> - Blind transfer
} = useCallSession()
```

const {
  currentCall,      // Ref<CallSession | null> - Active call
  incomingCall,     // Ref<CallSession | null> - Incoming call
  isCalling,        // Ref<boolean> - Outgoing call in progress
  isInCall,         // Ref<boolean> - Call established
  makeCall,         // (target: string) => Promise<void> - Make call
  answerCall,       // () => Promise<void> - Answer incoming call
  endCall,          // () => Promise<void> - End active call
  rejectCall        // () => Promise<void> - Reject incoming call
} = useSipCall(userAgentRef)
```

**Call Session:**

```typescript
interface CallSession {
  id: string                           // Unique call ID
  remoteIdentity: string              // Remote party identifier
  direction: 'incoming' | 'outgoing'  // Call direction
  state: CallState                    // Current state
  startTime?: Date                    // Call start time
  answerTime?: Date                   // Call answer time
  endTime?: Date                      // Call end time
}
```

### useSipDtmf

Send DTMF (dialpad) tones during calls.

```typescript
import { useSipDtmf } from 'vuesip'

const {
  sendDtmf,         // (digit: string) => Promise<void> - Send single digit
  sendDtmfSequence  // (digits: string, interval?: number) => Promise<void>
} = useSipDtmf(currentSessionRef)

// Send single digit
await sendDtmf('1')

// Send sequence
await sendDtmfSequence('1234', 160)
```

### useAudioDevices

Manage audio input/output devices.

```typescript
import { useAudioDevices } from 'vuesip'

const {
  audioInputDevices,      // Ref<AudioDevice[]> - Available microphones
  audioOutputDevices,     // Ref<AudioDevice[]> - Available speakers
  selectedInputDevice,    // Ref<string | null> - Selected mic ID
  selectedOutputDevice,   // Ref<string | null> - Selected speaker ID
  refreshDevices,         // () => Promise<void> - Refresh device list
  setInputDevice,         // (deviceId: string) => void - Set microphone
  setOutputDevice         // (deviceId: string) => void - Set speaker
} = useAudioDevices()
```

### useSettings

Comprehensive settings management with persistence, validation, and cloud sync.

```typescript
import { useSettings } from 'vuesip'

const settings = useSettings({
  storageKey: 'vuesip-settings',
  defaults: {
    audio: {
      inputDevice: 'default',
      outputDevice: 'default',
      ringtoneVolume: 0.8,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    notifications: {
      enabled: true,
      sound: true,
      desktop: true
    },
    call: {
      autoAnswer: false,
      callWaiting: true,
      doNotDisturb: false
    },
    display: {
      theme: 'system',
      language: 'en',
      compactMode: false
    }
  },
  onSettingChange: (key, value) => {
    console.log(`Setting ${key} changed to`, value)
  }
})

// Get settings with dot notation
const theme = settings.get('display.theme')
const audioInput = settings.get('audio.inputDevice')

// Update settings with validation
const result = settings.update({
  audio: { inputVolume: 0.75 },
  display: { theme: 'dark' }
})

if (!result.valid) {
  console.error('Validation errors:', result.errors)
}

// Export/import settings
const exported = settings.export() // JSON string
await settings.import(exported)

// Reset to defaults
settings.reset() // Reset all
settings.reset('audio') // Reset section
```

**Keyboard Shortcuts:**

- `Ctrl/Cmd + ,` - Open settings
- `Ctrl/Cmd + S` - Save settings
- `Ctrl/Cmd + E` - Export settings
- `Ctrl/Cmd + I` - Import settings
- `Esc` - Close settings

**Settings Features:**

- ✅ Type-safe with TypeScript
- ✅ Persistent localStorage storage
- ✅ Built-in validation with custom rules
- ✅ Export/import for backup
- ✅ Cloud sync (optional)
- ✅ Change listeners and reactivity
- ✅ Hierarchical namespaces
- ✅ Deep path access with dot notation

### Settings Manager Deployment

The Settings Manager provides a complete UI for managing application settings with 9 categories: SIP accounts, audio, video, network, AMI (Asterisk Manager Interface), call settings, UI preferences, privacy, and advanced options.

**Installation & Setup:**

```typescript
// 1. Install dependencies (if not already installed)
npm install pinia  # State management (required)

// 2. Setup Pinia in your app
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// 3. Import and use the settings components
import { useSettings } from 'vuesip'
import SettingsPanel from 'vuesip/components/settings/SettingsPanel.vue'

const { settings, save, load, reset } = useSettings()
```

**Using the Settings Panel:**

```vue
<template>
  <SettingsPanel
    :initial-tab="activeTab"
    :is-dirty="isDirty"
    @save="handleSave"
    @reset="handleReset"
    @export="handleExport"
    @tab-change="handleTabChange"
  >
    <!-- SIP Account Settings -->
    <template #sip>
      <SipServerSettings />
    </template>

    <!-- Audio Settings -->
    <template #audio>
      <AudioDeviceSettings />
    </template>

    <!-- Media Settings -->
    <template #media>
      <MediaSettings />
    </template>

    <!-- Call Settings -->
    <template #call>
      <CallSettings />
    </template>

    <!-- Network Settings -->
    <template #network>
      <NetworkSettings />
    </template>

    <!-- AMI Settings -->
    <template #ami>
      <AmiSettings />
    </template>

    <!-- Preferences -->
    <template #preferences>
      <PreferencesSettings />
    </template>
  </SettingsPanel>
</template>

<script setup lang="ts">
import { useSettings } from 'vuesip'
import SettingsPanel from 'vuesip/components/settings/SettingsPanel.vue'
import SipServerSettings from 'vuesip/components/settings/sections/SipServerSettings.vue'
import AudioDeviceSettings from 'vuesip/components/settings/sections/AudioDeviceSettings.vue'
import MediaSettings from 'vuesip/components/settings/sections/MediaSettings.vue'
import CallSettings from 'vuesip/components/settings/sections/CallSettings.vue'
import NetworkSettings from 'vuesip/components/settings/sections/NetworkSettings.vue'
import AmiSettings from 'vuesip/components/settings/sections/AmiSettings.vue'
import PreferencesSettings from 'vuesip/components/settings/sections/PreferencesSettings.vue'

const {
  settings,
  isDirty,
  save,
  load,
  reset,
  exportSettings,
  activeAccount
} = useSettings()

const handleSave = async () => {
  const success = await save()
  if (success) {
    console.log('Settings saved successfully')
  }
}

const handleReset = async () => {
  await reset()
}

const handleExport = () => {
  exportSettings() // Downloads settings.json
}
</script>
```

**Production Deployment Checklist:**

1. **Environment Configuration:**
   ```typescript
   // Ensure proper environment variables
   VITE_APP_NAME=your-app-name
   VITE_STORAGE_PREFIX=your-prefix  # For localStorage namespacing
   ```

2. **Build Optimization:**
   ```bash
   # Build with production optimizations
   npm run build

   # Verify build output
   # - dist/vuesip.js (~533KB, ~137KB gzipped)
   # - dist/vuesip.cjs (~532KB, ~139KB gzipped)
   # - dist/vuesip.umd.js (~533KB, ~139KB gzipped)
   ```

3. **Bundle Size Monitoring:**
   ```bash
   # The settings manager adds approximately:
   # - 15-20KB gzipped to your bundle
   # - 20-40KB runtime memory usage
   # - <200ms initial load time
   ```

4. **Security Considerations:**
   - Settings are encrypted in localStorage using XOR encryption
   - For production, consider upgrading to Web Crypto API (AES-GCM)
   - Sensitive data (passwords, tokens) should use additional encryption
   - Enable CSP headers to prevent XSS attacks

5. **Testing Before Deployment:**
   ```bash
   # Run all tests
   npm run test          # 3078+ unit tests
   npm run test:e2e      # End-to-end browser tests
   npm run typecheck     # TypeScript validation
   npm run lint          # Code quality checks
   ```

6. **Performance Validation:**
   - Auto-save debouncing: 1 second (configurable)
   - LocalStorage quota: ~5-10MB limit (monitored)
   - Input latency: <50ms for all form fields
   - Settings load time: <200ms

7. **Browser Compatibility:**
   - Chrome/Edge 90+ ✅
   - Firefox 88+ ✅
   - Safari 14+ ✅
   - Requires: localStorage, Web Storage API

**Migration & Versioning:**

```typescript
// Settings are versioned and auto-migrate
// Current version: 1.0.0

// If you need custom migration logic:
import { useSettingsPersistence } from 'vuesip'

const persistence = useSettingsPersistence()

// Register custom migration
persistence.registerMigration('1.0.0', '2.0.0', (oldSettings) => {
  // Transform settings structure
  return {
    ...oldSettings,
    version: '2.0.0',
    // Add new fields, transform data, etc.
  }
})
```

**Monitoring & Analytics:**

```typescript
// Track settings changes in production
const { settings } = useSettings()

watch(() => settings.value, (newSettings, oldSettings) => {
  // Log to analytics service
  analytics.track('settings_changed', {
    changed_fields: getChangedFields(newSettings, oldSettings),
    user_id: currentUser.id
  })
}, { deep: true })
```

**Troubleshooting:**

Common deployment issues:

1. **Settings not persisting:**
   - Check localStorage is enabled in browser
   - Verify storage quota hasn't been exceeded
   - Check for private browsing mode restrictions

2. **Performance issues:**
   - Disable auto-save during bulk updates
   - Use batch operations for multiple changes
   - Monitor localStorage size (>5MB warning)

3. **TypeScript errors:**
   - Ensure Pinia is installed and configured
   - Check Vue version compatibility (3.3+)
   - Verify all peer dependencies are installed

**Documentation:**

For detailed documentation, see:
- [Settings Architecture Guide](docs/settings-manager-design.md)
- [Keyboard Shortcuts Reference](docs/keyboard-shortcuts.md)
- [User Guide](docs/guide/settings-manager.md)
- [Performance Analysis](docs/performance-analysis-report.md)
- [Production Readiness Report](docs/production-readiness-report.md)

## Example Components

VueSip includes example components built with PrimeVue to demonstrate usage:

### Dialpad Component

```vue
<template>
  <Dialpad 
    :is-calling="isCalling"
    @digit="handleDtmf"
    @call="handleMakeCall"
  />
</template>
```

### Call Controls Component

```vue
<template>
  <CallControls
    :current-call="currentCall"
    :incoming-call="incomingCall"
    :is-calling="isCalling"
    @answer="handleAnswer"
    @reject="handleReject"
    @end="handleEnd"
  />
</template>
```

## Interactive Playground

VueSip includes an interactive playground where you can explore and experiment with all the composables:

```bash
# Install dependencies
npm install

# Run development server with playground
npm run dev
```

Visit `http://localhost:5173` to access the interactive playground with:

- 🎯 **Live Demos** - Try out features in real-time
- 💻 **Code Examples** - View implementation snippets
- 📚 **Setup Guides** - Learn how to integrate each feature
- 🎮 **Multiple Examples** - Basic calls, DTMF, audio devices, and more

See the [playground README](playground/README.md) for more details.

## Building the Library

```bash
# Build library for distribution
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck
```

## Use Cases

- **Asterisk Dialpad Interfaces** - Build custom dialpad UIs
- **Contact Center Applications** - Agent softphones
- **WebRTC Applications** - Browser-based calling
- **VoIP Integration** - Integrate calling into web apps
- **Custom SIP Clients** - Full control over UI/UX

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires WebRTC support.

## Architecture

VueSip follows the headless component pattern:

1. **Composables** provide the business logic and state management
2. **You** provide the UI components and styling
3. **Complete flexibility** to match your design system

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  SipConfig,
  CallSession,
  CallState,
  AudioDevice,
  SipError
} from 'vuesip'
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Built with:
- [Vue 3](https://vuejs.org/)
- [SIP.js](https://sipjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
