# Product Roadmap

## Phase 0: Already Completed

**Goal:** Core library functionality with comprehensive SIP and AMI support
**Status:** Complete

### Core SIP Features
- [x] `useSipClient` - SIP connection management `M`
- [x] `useSipConnection` - Connection state tracking `S`
- [x] `useSipRegistration` - Registration handling `S`
- [x] `useCallSession` - Call state machine `M`
- [x] `useCallControls` - Call operations (answer, reject, end) `S`
- [x] `useCallHold` - Hold/resume functionality `S`
- [x] `useCallTransfer` - Blind and attended transfer `M`
- [x] `useDTMF` / `useSipDtmf` - DTMF tone sending `S`
- [x] `useMultiLine` - Multi-line call handling `L`
- [x] `useSipSecondLine` - Second line support `M`

### Media Management
- [x] `useMediaDevices` - Device enumeration and selection `M`
- [x] `useAudioDevices` - Audio device management `S`
- [x] `usePictureInPicture` - Browser PiP API support `S`
- [x] `useVideoInset` - Video overlay positioning `S`

### Call Quality & Recovery
- [x] `useSipWebRTCStats` - WebRTC statistics collection `M`
- [x] `useCallQualityScore` - Quality scoring (A-F grades) `M`
- [x] `useNetworkQualityIndicator` - Network health indicators `S`
- [x] `useBandwidthAdaptation` - Bandwidth recommendations `M`
- [x] `useConnectionRecovery` - ICE restart and reconnection `L`
- [x] `useSessionPersistence` - Session state persistence `M`

### Conference Features
- [x] `useConference` - Multi-party conference support `L`
- [x] `useActiveSpeaker` - Active speaker detection `M`
- [x] `useGalleryLayout` - Gallery layout calculations `M`
- [x] `useParticipantControls` - Participant management `M`

### Recording
- [x] `useLocalRecording` - Client-side MediaRecorder `M`
- [x] `useRecordingIndicator` - Recording status UI `S`

### Communication
- [x] `usePresence` - Presence subscribe/publish `M`
- [x] `useMessaging` - SIP MESSAGE support `S`

### AMI Integration
- [x] `useAmi` - Base AMI client composable `M`
- [x] `useAmiQueues` - Queue statistics and management `L`
- [x] `useAmiAgentLogin` - Agent login/logout/pause `M`
- [x] `useAmiAgentStats` - Agent statistics `M`
- [x] `useAmiCalls` - Call origination and control `M`
- [x] `useAmiRecording` - Recording control via AMI `M`
- [x] `useAmiVoicemail` - Voicemail management `M`
- [x] `useAmiPeers` - Peer status monitoring `S`
- [x] `useAmiCDR` - Call Detail Records `M`
- [x] `useAmiParking` - Call parking `S`
- [x] `useAmiPaging` - Paging/intercom `S`
- [x] `useAmiRingGroups` - Ring group management `M`
- [x] `useAmiBlacklist` - Blacklist management `S`
- [x] `useAmiCallback` - Callback requests `S`
- [x] `useAmiFeatureCodes` - Feature code execution `S`
- [x] `useAmiIVR` - IVR management `M`
- [x] `useAmiTimeConditions` - Time condition control `S`
- [x] `useAmiSupervisor` - Supervisor features (spy, whisper, barge) `M`
- [x] `useAmiDatabase` - AstDB operations `S`
- [x] `useFreePBXPresence` - FreePBX presence bridge `M`

### Infrastructure
- [x] Adapter pattern (JsSIP, SIP.js) `L`
- [x] Plugin system (PluginManager, HookManager) `L`
- [x] EventBus for decoupled events `M`
- [x] Storage adapters (LocalStorage, SessionStorage, IndexedDB) `M`
- [x] Comprehensive TypeScript types `L`
- [x] Vue plugin API `S`

### Testing & Documentation
- [x] Unit tests with Vitest `L`
- [x] E2E tests with Playwright `L`
- [x] Performance benchmarks `M`
- [x] VitePress documentation site `L`
- [x] TypeDoc API documentation `M`
- [x] Example applications (5 examples) `L`
- [x] Interactive playground `L`

---

## Phase 1: Developer Experience Improvements

**Goal:** Make VueSip easier to adopt and use for new developers
**Success Criteria:** <5 min to first working call in new project

### Features
- [ ] CLI scaffolding tool (`create-vuesip`) `M`
- [ ] Starter templates (basic, enterprise, call-center) `M`
- [ ] Auto-configuration from common PBX providers `S`
- [ ] Enhanced error messages with troubleshooting hints `S`
- [ ] Interactive connection debugger composable `M`
- [ ] VS Code extension with snippets `S`

### Dependencies
- Stable v1.0 release
- Documentation complete

---

## Phase 2: Advanced Call Features

**Goal:** Support complex enterprise calling scenarios
**Success Criteria:** Feature parity with desktop softphones

### Features
- [ ] Call queue position and wait time display `S`
- [ ] Automatic call distribution (ACD) integration `L`
- [ ] Screen pop with CRM integration hooks `M`
- [ ] Call tagging and disposition codes `S`
- [ ] Scheduled callbacks with reminder `M`
- [ ] Call scripting/guided flows composable `L`

### Dependencies
- Phase 1 complete
- Enterprise customer feedback

---

## Phase 3: Analytics & Monitoring

**Goal:** Provide actionable insights for call center managers
**Success Criteria:** Real-time dashboard with historical trends

### Features
- [ ] Real-time dashboard composables `L`
- [ ] Agent performance metrics aggregation `M`
- [ ] Queue performance analytics `M`
- [ ] Call quality trend analysis `M`
- [ ] Exportable reports (CSV, JSON) `S`
- [ ] Webhook integrations for external analytics `M`

### Dependencies
- AMI integration stable
- Performance optimized for high-volume environments

---

## Phase 4: Security & Compliance

**Goal:** Meet enterprise security and compliance requirements
**Success Criteria:** SOC 2 compatible, HIPAA-ready configuration

### Features
- [ ] End-to-end encryption verification `M`
- [ ] Audit logging composable `M`
- [ ] PCI-DSS compliant recording controls `L`
- [ ] HIPAA configuration guide `S`
- [ ] OAuth2/SAML SSO integration improvements `M`
- [ ] Security headers and CSP recommendations `S`

### Dependencies
- Security audit complete
- Legal compliance review

---

## Phase 5: Platform Expansion

**Goal:** Support additional platforms and frameworks
**Success Criteria:** Nuxt, Quasar official support

### Features
- [ ] Nuxt module (`@vuesip/nuxt`) `L`
- [ ] Quasar App Extension `M`
- [ ] React port (`react-sip` companion library) `XL`
- [ ] Mobile optimizations (PWA, Capacitor) `L`
- [ ] Electron desktop app support `M`
- [ ] WebRTC gateway adapter (Obi, Twilio, etc.) `L`

### Dependencies
- Core API stable
- Community demand assessment

---

## Effort Scale

- **XS:** 1 day
- **S:** 2-3 days
- **M:** 1 week
- **L:** 2 weeks
- **XL:** 3+ weeks
