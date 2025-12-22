# Settings Manager Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     VueSIP Settings Manager                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            SettingsPanel.vue (Container)                │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  [SIP Server] [Audio] [Media] [Call]             │  │    │
│  │  │  [Network] [Preferences]                          │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │                                                   │  │    │
│  │  │  ┌────────────────────────────────────────────┐  │  │    │
│  │  │  │  Active Section Component                  │  │  │    │
│  │  │  │                                            │  │  │    │
│  │  │  │  • SipServerSettings.vue                  │  │  │    │
│  │  │  │  • AudioDeviceSettings.vue                │  │  │    │
│  │  │  │  • MediaSettings.vue                      │  │  │    │
│  │  │  │  • CallSettings.vue                       │  │  │    │
│  │  │  │  • NetworkSettings.vue                    │  │  │    │
│  │  │  │  • PreferencesSettings.vue                │  │  │    │
│  │  │  └────────────────────────────────────────────┘  │  │    │
│  │  │                                                   │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  [Reset] [Export] [Import]           [Apply]     │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              useSettings() - Main Orchestrator            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  • Coordinate settingsStore + persistence           │ │ │
│  │  │  • Undo/Redo system (20-state history)             │ │ │
│  │  │  • Batch validation before apply                   │ │ │
│  │  │  • Sync with SIP client when connected             │ │ │
│  │  │  • Error handling and rollback                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         useSettingsPersistence() - Storage Layer         │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  • localStorage abstraction                         │ │ │
│  │  │  • Auto-save with debouncing (1s)                   │ │ │
│  │  │  • Optional credential encryption                   │ │ │
│  │  │  • Schema migration support                         │ │ │
│  │  │  • Storage quota handling                           │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                settingsStore (Reactive State)             │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  sipServer: {                                       │ │ │
│  │  │    uri, sipUri, password, displayName, ...         │ │ │
│  │  │  }                                                  │ │ │
│  │  │                                                     │ │ │
│  │  │  registration: {                                    │ │ │
│  │  │    autoRegister, expires, retryInterval            │ │ │
│  │  │  }                                                  │ │ │
│  │  │                                                     │ │ │
│  │  │  audioDevices: {                                    │ │ │
│  │  │    microphone, speaker, ringtone                   │ │ │
│  │  │  }                                                  │ │ │
│  │  │                                                     │ │ │
│  │  │  media: {                                           │ │ │
│  │  │    echoCancellation, noiseSuppression, codec, ...  │ │ │
│  │  │  }                                                  │ │ │
│  │  │                                                     │ │ │
│  │  │  call: {                                            │ │ │
│  │  │    autoAnswer, enableDtmf, maxConcurrent, ...      │ │ │
│  │  │  }                                                  │ │ │
│  │  │                                                     │ │ │
│  │  │  network: {                                         │ │ │
│  │  │    stunServers[], turnServers[], icePolicy         │ │ │
│  │  │  }                                                  │ │ │
│  │  │                                                     │ │ │
│  │  │  preferences: {                                     │ │ │
│  │  │    theme, ringToneUrl, enableAudio, ...            │ │ │
│  │  │  }                                                  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION & PERSISTENCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  configStore │  │ useAudioDev  │  │   useSipClient       │  │
│  │              │  │              │  │                      │  │
│  │ • SIP config │  │ • Devices    │  │ • Apply settings     │  │
│  │ • Media cfg  │  │ • Selection  │  │ • Registration       │  │
│  │ • Validation │  │ • Preview    │  │ • Connection         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         ↕                  ↕                    ↕                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      localStorage                          │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  vuesip-settings-sip-server                          │ │ │
│  │  │  vuesip-settings-audio-devices                       │ │ │
│  │  │  vuesip-settings-media                               │ │ │
│  │  │  vuesip-settings-call                                │ │ │
│  │  │  vuesip-settings-network                             │ │ │
│  │  │  vuesip-settings-preferences                         │ │ │
│  │  │  vuesip-settings-version                             │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERACTION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. USER CHANGES SETTING
   │
   ├─► Component emits change event
   │
   └─► useSettings.updateSettings(changes)
       │
       ├─► Validate changes
       │   │
       │   ├─► Field-level validation
       │   └─► Cross-field validation
       │
       ├─► Push to undo history
       │
       ├─► Update settingsStore
       │
       ├─► Mark as dirty (unsaved)
       │
       └─► Auto-save (debounced 1s)
           │
           └─► useSettingsPersistence.save()
               │
               └─► localStorage.setItem()

2. USER CLICKS "APPLY"
   │
   ├─► useSettings.applySettings()
       │
       ├─► Validate all settings
       │   │
       │   ├─► If invalid → Show errors, abort
       │   └─► If valid → Continue
       │
       ├─► Sync with configStore
       │
       ├─► If SIP client connected:
       │   │
       │   ├─► Apply new configuration
       │   └─► May require reconnect
       │
       ├─► Update audio devices if changed
       │
       ├─► Clear dirty flag
       │
       └─► Clear undo history

3. USER CLICKS "UNDO"
   │
   ├─► useSettings.undo()
       │
       ├─► Pop from history stack
       │
       ├─► Restore previous state
       │
       └─► Update UI reactively

4. USER EXPORTS SETTINGS
   │
   ├─► useSettings.exportSettings(includeCredentials)
       │
       ├─► Serialize settingsStore to JSON
       │
       ├─► Optionally exclude credentials
       │
       └─► Download or copy to clipboard

5. USER IMPORTS SETTINGS
   │
   ├─► useSettings.importSettings(json)
       │
       ├─► Parse JSON
       │
       ├─► Validate schema
       │
       ├─► Show preview of changes
       │
       ├─► User confirms
       │
       └─► Apply imported settings
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│              │     │              │     │                  │
│  Component   │────▶│  useSettings │────▶│  settingsStore   │
│              │     │  (Composable)│     │   (Reactive)     │
│              │◀────│              │◀────│                  │
└──────────────┘     └──────────────┘     └──────────────────┘
                            │  ▲
                            │  │
                            ▼  │
                     ┌──────────────┐
                     │ Persistence  │
                     │   Layer      │
                     └──────────────┘
                            │  ▲
                            │  │
                            ▼  │
                     ┌──────────────┐
                     │ localStorage │
                     └──────────────┘

PARALLEL INTEGRATION:

settingsStore ◀────▶ configStore (SIP config sync)
              ◀────▶ useAudioDevices (Device selection)
              ◀────▶ useSipClient (Apply to client)
```

## Settings Schema Structure

```typescript
SettingsState {
  ├─ sipServer {
  │   ├─ uri: string                    // WebSocket URI
  │   ├─ sipUri: string                 // SIP URI (sip:user@domain)
  │   ├─ password: string               // SIP password
  │   ├─ displayName?: string           // Display name
  │   ├─ authorizationUsername?: string // Auth username
  │   └─ realm?: string                 // SIP realm
  │  }
  │
  ├─ registration {
  │   ├─ autoRegister: boolean          // Auto-register on connect
  │   ├─ expires: number                // Registration expiry (seconds)
  │   └─ retryInterval: number          // Retry interval (ms)
  │  }
  │
  ├─ audioDevices {
  │   ├─ microphone: string | null      // Microphone device ID
  │   ├─ speaker: string | null         // Speaker device ID
  │   └─ ringtone: string | null        // Ringtone device ID
  │  }
  │
  ├─ media {
  │   ├─ echoCancellation: boolean      // Echo cancellation
  │   ├─ noiseSuppression: boolean      // Noise suppression
  │   ├─ autoGainControl: boolean       // Auto gain control
  │   ├─ audioCodec: AudioCodec         // Preferred audio codec
  │   └─ videoCodec?: VideoCodec        // Preferred video codec
  │  }
  │
  ├─ call {
  │   ├─ autoAnswer: boolean            // Auto-answer incoming calls
  │   ├─ autoAnswerDelay: number        // Auto-answer delay (ms)
  │   ├─ enableDtmf: boolean            // Enable DTMF tones
  │   ├─ maxConcurrentCalls: number     // Max concurrent calls
  │   └─ callTimeout: number            // Call timeout (ms)
  │  }
  │
  ├─ network {
  │   ├─ stunServers: string[]          // STUN server URLs
  │   ├─ turnServers: TurnServer[]      // TURN server configs
  │   └─ iceTransportPolicy: IcePolicy  // ICE transport policy
  │  }
  │
  ├─ preferences {
  │   ├─ theme: Theme                   // UI theme
  │   ├─ ringToneUrl?: string           // Ring tone URL
  │   ├─ ringBackToneUrl?: string       // Ring back tone URL
  │   ├─ enableAudio: boolean           // Enable audio by default
  │   └─ enableVideo: boolean           // Enable video by default
  │  }
  │
  └─ persistence {
      ├─ rememberCredentials: boolean   // Remember credentials
      └─ lastModified: Date | null      // Last modification date
     }
}
```

## Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       VALIDATION SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

Input Change
     │
     ▼
┌────────────────┐
│ Field Validator│
└────────────────┘
     │
     ├─► Format validation (URI, SIP URI, etc.)
     ├─► Range validation (numbers within bounds)
     ├─► Required field check
     └─► Custom validators
         │
         ├─ Valid? ────────▶ Update store
         │
         └─ Invalid? ──────▶ Show inline error
                             Don't update store

Apply Button Clicked
     │
     ▼
┌────────────────┐
│ Batch Validator│
└────────────────┘
     │
     ├─► Validate all sections
     ├─► Check cross-field dependencies
     └─► Verify required fields
         │
         ├─ All Valid? ────▶ Apply to SIP client
         │                   Clear dirty flag
         │                   Save to localStorage
         │
         └─ Any Invalid? ──▶ Show error summary
                             Highlight invalid fields
                             Abort apply operation
```

## File Organization

```
src/
├── composables/
│   ├── useSettings.ts              ← Main orchestrator (300 lines)
│   └── useSettingsPersistence.ts   ← Storage layer (200 lines)
│
├── stores/
│   └── settingsStore.ts            ← Reactive state (500 lines)
│
├── components/
│   └── settings/
│       ├── SettingsPanel.vue       ← Container (200 lines)
│       ├── SipServerSettings.vue   ← SIP config (250 lines)
│       ├── AudioDeviceSettings.vue ← Devices (300 lines)
│       ├── MediaSettings.vue       ← Media quality (200 lines)
│       ├── CallSettings.vue        ← Call behavior (200 lines)
│       ├── NetworkSettings.vue     ← Network config (250 lines)
│       ├── PreferencesSettings.vue ← Preferences (150 lines)
│       │
│       └── common/
│           ├── FormInput.vue       ← Input component (100 lines)
│           ├── FormSelect.vue      ← Select component (100 lines)
│           ├── FormToggle.vue      ← Toggle component (80 lines)
│           └── FormSection.vue     ← Section wrapper (80 lines)
│
├── utils/
│   ├── settings-validators.ts      ← Validation functions (300 lines)
│   └── settings-formatters.ts      ← Format helpers (150 lines)
│
└── types/
    └── settings.types.ts           ← TypeScript types (200 lines)

Total: ~3,400 lines of code
```

---

*Architecture designed by Coder Agent*
*Session: swarm-1765412592416-z70n5jwdj*
*Date: 2025-12-11*
