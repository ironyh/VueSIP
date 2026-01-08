# Spec Tasks

## Tasks

- [x] 1. Create templates directory structure and shared configuration
  - [x] 1.1 Create `templates/` directory at project root
  - [x] 1.2 Create shared TypeScript and Vite configuration patterns
  - [x] 1.3 Create `.env.example` template for all templates
  - [x] 1.4 Verify directory structure matches technical spec

- [x] 2. Create Minimal Template
  - [x] 2.1 Initialize `templates/minimal/` with package.json and vite.config.ts
  - [x] 2.2 Create `src/App.vue` with inline SIP configuration form
  - [x] 2.3 Implement basic call flow (connect, call, hangup)
  - [x] 2.4 Add DTMF support during active calls
  - [x] 2.5 Create README.md with quick start instructions
  - [x] 2.6 Verify template runs with `pnpm install && pnpm dev`
  - [x] 2.7 Verify TypeScript compilation passes

- [x] 3. Create Basic Softphone Template
  - [x] 3.1 Initialize `templates/basic-softphone/` with package.json including PrimeVue
  - [x] 3.2 Create `Dialpad.vue` component with digit buttons and display
  - [x] 3.3 Create `CallControls.vue` with hold, mute, transfer buttons
  - [x] 3.4 Create `CallHistory.vue` with localStorage persistence
  - [x] 3.5 Create `DeviceSettings.vue` for audio device selection
  - [x] 3.6 Create main `App.vue` composing all components
  - [x] 3.7 Create `usePhone.ts` composable wrapping VueSip APIs
  - [x] 3.8 Create README.md with setup and customization guide
  - [x] 3.9 Verify template runs and all features work
  - [x] 3.10 Verify TypeScript compilation passes

- [x] 4. Create Call Center Template
  - [x] 4.1 Initialize `templates/call-center/` with package.json
  - [x] 4.2 Create `AgentDashboard.vue` with login/logout/pause controls
  - [x] 4.3 Create `QueueStats.vue` displaying real-time queue metrics
  - [x] 4.4 Create `CallPanel.vue` with call controls and disposition
  - [x] 4.5 Create `SupervisorPanel.vue` with spy/whisper/barge controls
  - [x] 4.6 Create `useAgent.ts` composable for agent state management
  - [x] 4.7 Create `useQueues.ts` composable for queue subscriptions
  - [x] 4.8 Add recording indicator integration
  - [x] 4.9 Create README.md with AMI configuration guide
  - [x] 4.10 Verify template runs and AMI features work
  - [x] 4.11 Verify TypeScript compilation passes

- [x] 5. Documentation and polish
  - [x] 5.1 Add SIP provider configuration examples to each README (Asterisk, FreePBX, etc.)
  - [x] 5.2 Add troubleshooting section to each README
  - [x] 5.3 Update main project README to reference templates
  - [x] 5.4 Add templates to VitePress documentation site
  - [x] 5.5 Final review of all templates for consistency
  - [x] 5.6 Verify all templates pass lint and type-check
