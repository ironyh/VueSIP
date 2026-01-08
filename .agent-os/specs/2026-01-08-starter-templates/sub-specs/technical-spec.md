# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2026-01-08-starter-templates/spec.md

## Technical Requirements

### Directory Structure

```
templates/
├── minimal/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   └── composables/
│   │       └── useSipPhone.ts
│   └── README.md
├── basic-softphone/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── components/
│   │   │   ├── Dialpad.vue
│   │   │   ├── CallControls.vue
│   │   │   ├── CallHistory.vue
│   │   │   └── DeviceSettings.vue
│   │   └── composables/
│   │       └── usePhone.ts
│   └── README.md
└── call-center/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── main.ts
    │   ├── App.vue
    │   ├── components/
    │   │   ├── AgentDashboard.vue
    │   │   ├── QueueStats.vue
    │   │   ├── CallPanel.vue
    │   │   └── SupervisorPanel.vue
    │   └── composables/
    │       ├── useAgent.ts
    │       └── useQueues.ts
    └── README.md
```

### Template 1: Minimal

**Purpose:** Demonstrate VueSip integration with zero dependencies beyond Vue and VueSip.

**Features:**
- Single `App.vue` with inline SIP configuration form
- Uses `useSipClient`, `useCallSession`, `useDTMF`
- No UI framework - plain HTML/CSS
- Environment variable support for credentials
- ~50 lines of code total

**Package Dependencies:**
- vue: ^3.4.0
- vuesip: ^1.0.0
- vite: ^7.0.0
- typescript: ~5.4.0

### Template 2: Basic Softphone

**Purpose:** Production-ready softphone with modern UI.

**Features:**
- PrimeVue UI components
- Dialpad with DTMF during calls
- Call history (localStorage persistence)
- Audio device selection
- Call timer and status display
- Hold, mute, transfer controls
- Responsive design

**Package Dependencies:**
- All minimal dependencies plus:
- primevue: ^3.50.0
- primeicons: ^7.0.0

**Composables Used:**
- `useSipClient`
- `useCallSession`
- `useCallControls`
- `useCallHold`
- `useCallTransfer`
- `useDTMF`
- `useAudioDevices`
- `useCallHistory`

### Template 3: Call Center

**Purpose:** Enterprise call center agent interface with AMI integration.

**Features:**
- Agent login/logout/pause states
- Real-time queue statistics
- Incoming call popup
- Call disposition/tagging UI
- Supervisor spy/whisper/barge (if supervisor role)
- Multiple queue membership display
- Call recording indicator

**Package Dependencies:**
- All basic-softphone dependencies
- (AMI connection via VueSip's built-in `useAmi*` composables)

**Composables Used:**
- All basic-softphone composables plus:
- `useAmiAgentLogin`
- `useAmiQueues`
- `useAmiAgentStats`
- `useAmiRecording`
- `useAmiSupervisor`
- `useRecordingIndicator`

### Configuration Pattern

Each template uses a consistent configuration approach:

```typescript
// src/config.ts
export const sipConfig = {
  uri: import.meta.env.VITE_SIP_URI || 'wss://sip.example.com',
  sipUri: import.meta.env.VITE_SIP_USER || 'sip:1000@example.com',
  password: import.meta.env.VITE_SIP_PASSWORD || '',
  displayName: import.meta.env.VITE_SIP_DISPLAY_NAME || 'VueSip User',
}

// For call-center template, also:
export const amiConfig = {
  url: import.meta.env.VITE_AMI_URL || 'ws://localhost:8089/ami',
  username: import.meta.env.VITE_AMI_USER || '',
  secret: import.meta.env.VITE_AMI_SECRET || '',
}
```

### README Template Structure

Each template README includes:

1. **Quick Start** - Clone, install, configure, run (4 steps)
2. **Configuration** - Environment variables explained
3. **SIP Provider Examples** - Asterisk, FreePBX, Twilio, common providers
4. **Project Structure** - File/folder explanation
5. **Customization Guide** - How to modify UI, add features
6. **Troubleshooting** - Common issues and solutions

### Testing Requirements

- Each template must build without errors
- Each template must pass TypeScript type-checking
- Each template must work with mock SIP server in E2E tests
- README instructions must be validated (steps actually work)

### Performance Requirements

- Template bundle size: <500KB (minimal), <1MB (basic), <1.5MB (call-center)
- Dev server startup: <3 seconds
- Hot reload: <500ms
