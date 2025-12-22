# Settings Manager Design Document

## Overview

A comprehensive settings management system for VueSIP that provides a unified interface for managing all SIP client, media, audio device, and user preference configurations.

## Architecture

### Component Structure

```
src/
├── composables/
│   ├── useSettings.ts              # Main settings composable (orchestrator)
│   └── useSettingsPersistence.ts   # Local storage persistence layer
├── components/
│   └── settings/
│       ├── SettingsPanel.vue       # Main settings container
│       ├── SipServerSettings.vue   # SIP connection configuration
│       ├── AudioDeviceSettings.vue # Audio device selection
│       ├── MediaSettings.vue       # Audio/video quality settings
│       ├── CallSettings.vue        # Call behavior settings
│       └── NetworkSettings.vue     # Network/ICE configuration
└── stores/
    └── settingsStore.ts            # Centralized settings state
```

## Core Components

### 1. Settings Store (`settingsStore.ts`)

**Purpose**: Centralized reactive state for all settings with validation and persistence

**State Structure**:
```typescript
interface SettingsState {
  // SIP Server Configuration
  sipServer: {
    uri: string
    sipUri: string
    password: string
    displayName: string
    authorizationUsername?: string
    realm?: string
  }

  // Registration Settings
  registration: {
    autoRegister: boolean
    expires: number
    retryInterval: number
  }

  // Audio Device Selection
  audioDevices: {
    microphone: string | null
    speaker: string | null
    ringtone: string | null
  }

  // Media Configuration
  media: {
    echoCancellation: boolean
    noiseSuppression: boolean
    autoGainControl: boolean
    audioCodec: 'opus' | 'pcmu' | 'pcma' | 'g722'
    videoCodec?: 'vp8' | 'vp9' | 'h264'
  }

  // Call Behavior
  call: {
    autoAnswer: boolean
    autoAnswerDelay: number
    enableDtmf: boolean
    maxConcurrentCalls: number
    callTimeout: number
  }

  // Network Settings
  network: {
    stunServers: string[]
    turnServers: TurnServerConfig[]
    iceTransportPolicy: 'all' | 'relay'
  }

  // User Preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    ringToneUrl?: string
    ringBackToneUrl?: string
    enableAudio: boolean
    enableVideo: boolean
  }

  // Persistence
  persistence: {
    rememberCredentials: boolean
    lastModified: Date | null
  }
}
```

**Key Methods**:
- `updateSipServer(config: Partial<SipServerSettings>)`
- `updateAudioDevices(devices: Partial<AudioDeviceSettings>)`
- `updateMediaSettings(media: Partial<MediaSettings>)`
- `updateCallSettings(call: Partial<CallSettings>)`
- `updateNetworkSettings(network: Partial<NetworkSettings>)`
- `reset()` - Reset to defaults
- `exportSettings(includeCredentials: boolean)` - Export as JSON
- `importSettings(json: string)` - Import from JSON

### 2. Main Settings Composable (`useSettings.ts`)

**Purpose**: Orchestrate settings across multiple stores and provide unified API

**Features**:
- Integration with `configStore`, `settingsStore`, `useAudioDevices`
- Automatic validation before applying settings
- Real-time sync with SIP client when connected
- Undo/redo capability for settings changes
- Batch update support

**API**:
```typescript
interface UseSettingsReturn {
  // State
  settings: ComputedRef<SettingsState>
  isDirty: ComputedRef<boolean>
  validationErrors: Ref<Record<string, string[]>>

  // Actions
  updateSettings: (updates: Partial<SettingsState>) => Promise<ValidationResult>
  applySettings: () => Promise<void>
  resetSettings: () => void
  saveSettings: () => Promise<void>
  loadSettings: () => Promise<void>

  // Undo/Redo
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  undo: () => void
  redo: () => void

  // Export/Import
  exportSettings: (includeCredentials?: boolean) => string
  importSettings: (json: string) => Promise<ValidationResult>

  // Validation
  validateAll: () => ValidationResult
  validateSection: (section: keyof SettingsState) => ValidationResult
}
```

### 3. Settings Persistence (`useSettingsPersistence.ts`)

**Purpose**: Handle localStorage persistence with encryption for sensitive data

**Features**:
- Secure storage of credentials (optional)
- Automatic save on change (debounced)
- Migration support for settings schema changes
- Export/import with encryption

**Storage Keys**:
```typescript
const STORAGE_KEYS = {
  SIP_SERVER: 'vuesip-settings-sip-server',
  AUDIO_DEVICES: 'vuesip-settings-audio-devices',
  MEDIA: 'vuesip-settings-media',
  CALL: 'vuesip-settings-call',
  NETWORK: 'vuesip-settings-network',
  PREFERENCES: 'vuesip-settings-preferences',
  VERSION: 'vuesip-settings-version',
}
```

**Security**:
- Credentials stored separately with optional encryption
- Clear separation between sensitive and non-sensitive data
- Warning when "Remember Credentials" is enabled

## UI Components

### 1. SettingsPanel.vue

**Purpose**: Main container with tabbed interface

**Sections**:
1. SIP Server - Connection configuration
2. Audio Devices - Microphone/speaker selection
3. Media - Audio quality and codecs
4. Call Settings - Behavior and limits
5. Network - STUN/TURN configuration
6. Preferences - UI and notifications

**Features**:
- Tab navigation with icons
- Unsaved changes indicator
- Apply/Reset/Export/Import actions
- Validation error display
- Live preview of changes

### 2. SipServerSettings.vue

**Fields**:
- WebSocket URI (required)
- SIP URI (required)
- Password (required, type="password")
- Display Name
- Authorization Username
- Realm
- Auto-register checkbox
- Registration expires (seconds)
- Remember credentials checkbox

**Validation**:
- URI format validation
- SIP URI format (sip:user@domain)
- Required field checks

### 3. AudioDeviceSettings.vue

**Features**:
- Microphone selector with live audio meter
- Speaker selector with test button
- Ringtone device selector
- Device refresh button
- Permission request button
- "Default" device option

**Integration**:
- Uses `useAudioDevices` composable
- Real-time device list updates
- Audio level visualization

### 4. MediaSettings.vue

**Audio Settings**:
- Echo Cancellation toggle
- Noise Suppression toggle
- Auto Gain Control toggle
- Audio Codec selector (Opus, PCMU, PCMA, G.722)

**Video Settings** (Optional):
- Enable Video toggle
- Video Codec selector (VP8, VP9, H.264)
- Resolution presets

**Advanced**:
- Custom constraints JSON editor (collapsible)

### 5. CallSettings.vue

**Fields**:
- Auto-answer toggle
- Auto-answer delay (0-10 seconds)
- Enable DTMF tones toggle
- Max concurrent calls (1-10)
- Call timeout (30-300 seconds)

**Ring Tones**:
- Ring tone URL upload/select
- Ring back tone URL
- Test play buttons

### 6. NetworkSettings.vue

**STUN Servers**:
- List of STUN server URLs
- Add/remove buttons
- Default Google STUN servers

**TURN Servers**:
- TURN server URL
- Username
- Credential
- Add/remove multiple servers

**ICE Settings**:
- Transport Policy (All / Relay Only)
- Candidate Pool Size

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
1. Create `settingsStore.ts` with reactive state
2. Implement `useSettingsPersistence.ts` for localStorage
3. Build `useSettings.ts` orchestrator composable
4. Write unit tests for store and persistence

### Phase 2: UI Foundation (Day 2)
1. Create `SettingsPanel.vue` with tab navigation
2. Implement form validation utilities
3. Build reusable form components (input, select, toggle)
4. Create settings context provider

### Phase 3: Section Components (Day 3)
1. Implement `SipServerSettings.vue`
2. Implement `AudioDeviceSettings.vue` with live preview
3. Implement `MediaSettings.vue`
4. Implement `CallSettings.vue`

### Phase 4: Advanced Features (Day 4)
1. Implement `NetworkSettings.vue`
2. Add export/import functionality
3. Implement undo/redo system
4. Add validation and error display

### Phase 5: Integration & Testing (Day 5)
1. Integrate with existing playground
2. Write E2E tests for settings workflows
3. Add keyboard shortcuts
4. Performance optimization
5. Documentation

## Technical Considerations

### Reactivity
- Use `reactive` for store state
- `computed` for derived values
- `watch` with debounce for auto-save
- Shallow refs for device lists

### Validation
- Real-time validation on input
- Batch validation before apply
- Clear error messages with field highlighting
- Warning vs error differentiation

### Performance
- Lazy load section components
- Debounce auto-save (1000ms)
- Virtualized lists for device selection
- Memoized computed values

### Accessibility
- Keyboard navigation (Tab, Arrow keys)
- ARIA labels for all form controls
- Focus management in modals
- Screen reader announcements for errors

### Security
- No plaintext password storage by default
- Clear warnings for credential persistence
- Separate storage for sensitive data
- Option to encrypt credentials

## Integration Points

### Existing Systems
1. **configStore**: Sync SIP/media config bidirectionally
2. **useAudioDevices**: Real-time device selection
3. **useSipClient**: Apply settings when connected
4. **Connection Manager**: Integration with saved connections

### New Features
1. **Settings Profiles**: Save multiple configuration profiles
2. **Quick Settings**: Popup for common settings
3. **Settings Wizard**: First-time setup flow
4. **Settings Search**: Search all settings

## Testing Strategy

### Unit Tests
- Store mutations and getters
- Validation logic
- Persistence layer
- Import/export functionality

### Integration Tests
- Settings → Store → SIP Client flow
- Audio device selection → MediaManager
- Settings persistence → localStorage

### E2E Tests
- Complete settings configuration flow
- Import/export settings
- Settings validation errors
- Undo/redo functionality

## Migration Strategy

### V1 → V2 Settings
- Detect old localStorage format
- Migrate to new structure
- Clear old keys after migration
- Version tracking in storage

## Success Metrics

1. **Usability**: Settings change < 3 clicks away
2. **Performance**: Settings panel loads < 200ms
3. **Reliability**: 100% settings persistence success rate
4. **Validation**: 0 invalid configurations applied
5. **Coverage**: >90% test coverage for settings logic

## Future Enhancements

1. **Cloud Sync**: Sync settings across devices
2. **Advanced Audio**: Equalizer and audio effects
3. **Hot Keys**: Keyboard shortcuts for settings
4. **Themes**: Custom color themes
5. **Plugins**: Extensible settings system
