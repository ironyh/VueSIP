# VueSIP - Composables Planning & Status

Version: 0.1.0
Last Updated: 2025-11-29
Source: Extracted from STATE.md

This document tracks all Vue composables in VueSIP, their implementation status, exports, and remaining work.

## Status Legend

- [x] Completed & Exported
- [~] Completed, Not Exported
- [-] Placeholder Only
- [ ] Not Started

---

## Composables Overview

### Total Composables: 40 files in `src/composables/`

| Category | Exported | Total | Coverage |
|----------|----------|-------|----------|
| Core SIP | 6 | 6 | 100% |
| Call Management | 4 | 4 | 100% |
| AMI Base | 6 | 6 | 100% |
| Phase 14.1 | 3 | 3 | 100% |
| Phase 14.2 | 5 | 5 | 100% |
| Phase 14.3 | 4 | 4 | 100% |
| Phase 14.4 | 5 | 5 | 100% |
| **Total** | **33** | **40** | **~85%** |

---

## Core SIP Composables

### useSipClient
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipClient.ts`
- **Export**: `export { useSipClient, type UseSipClientReturn } from './useSipClient'`
- **Purpose**: Main SIP client Vue composable
- **Features**:
  - Reactive connection and registration state
  - Configuration management
  - Auto-cleanup on unmount
  - Error state tracking

### useSipRegistration
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipRegistration.ts`
- **Export**: `export { useSipRegistration, type UseSipRegistrationReturn, type RegistrationOptions } from './useSipRegistration'`
- **Purpose**: SIP registration management

### useCallSession
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useCallSession.ts`
- **Export**: `export { useCallSession, type UseCallSessionReturn, type CallSessionOptions } from './useCallSession'`
- **Purpose**: Active call session management

### useMediaDevices
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useMediaDevices.ts`
- **Export**: `export { useMediaDevices, type UseMediaDevicesReturn, type DeviceTestOptions } from './useMediaDevices'`
- **Purpose**: Media device management

### useDTMF
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useDTMF.ts`
- **Export**: `export { useDTMF, type UseDTMFReturn, type DTMFSequenceOptions, type DTMFSendResult } from './useDTMF'`
- **Purpose**: DTMF tone sending

### useSipDtmf
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipDtmf.ts`
- **Export**: `export { useSipDtmf, type UseSipDtmfReturn } from './useSipDtmf'`
- **Purpose**: SIP-level DTMF handling

---

## Call Management Composables

### useCallHistory
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useCallHistory.ts`
- **Export**: `export { useCallHistory, type UseCallHistoryReturn } from './useCallHistory'`
- **Purpose**: Call history management with IndexedDB storage

### useCallControls
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useCallControls.ts`
- **Export**: `export { useCallControls, type UseCallControlsReturn, type ActiveTransfer } from './useCallControls'`
- **Purpose**: Call control operations (hold, transfer, etc.)

### usePresence
- **Status**: [x] Completed & Exported
- **File**: `src/composables/usePresence.ts`
- **Export**: `export { usePresence, type UsePresenceReturn } from './usePresence'`
- **Purpose**: SIP SUBSCRIBE/NOTIFY presence

### useDialog
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useDialog.ts`
- **Export**: `export { useDialog, type UseDialogReturn } from './useDialog'`
- **Purpose**: SIP dialog state management

---

## Audio/Media Composables

### useAudioDevices
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAudioDevices.ts`
- **Export**: `export { useAudioDevices, type UseAudioDevicesReturn } from './useAudioDevices'`
- **Purpose**: Audio device enumeration and selection

---

## Advanced Composables

### useMessaging
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useMessaging.ts`
- **Export**: `export { useMessaging, type UseMessagingReturn, type Conversation } from './useMessaging'`
- **Purpose**: SIP MESSAGE support

### useConference
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useConference.ts`
- **Export**: `export { useConference, type UseConferenceReturn } from './useConference'`
- **Purpose**: Conference call support

---

## AMI Base Composables

### useAmi
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmi.ts`
- **Export**: `export { useAmi, type UseAmiReturn, type AmiPresenceState } from './useAmi'`
- **Purpose**: Base AMI composable for WebSocket connection

### useAmiQueues
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiQueues.ts`
- **Export**: `export { useAmiQueues, type UseAmiQueuesReturn } from './useAmiQueues'`
- **Purpose**: Queue monitoring and agent control

### useAmiCalls
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiCalls.ts`
- **Export**: `export { useAmiCalls, type UseAmiCallsReturn, type ClickToCallOptions } from './useAmiCalls'`
- **Purpose**: AMI-based call origination

### useAmiPeers
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiPeers.ts`
- **Export**: `export { useAmiPeers, type UseAmiPeersReturn, type PeerStatusSummary } from './useAmiPeers'`
- **Purpose**: SIP/PJSIP peer monitoring

### useAmiDatabase
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiDatabase.ts`
- **Export**: `export { useAmiDatabase, type UseAmiDatabaseReturn, type ContactGroup } from './useAmiDatabase'`
- **Purpose**: AstDB contact storage

### useAmiSupervisor
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiSupervisor.ts`
- **Export**: `export { useAmiSupervisor, type UseAmiSupervisorReturn, type SupervisionMode, type SupervisionSession } from './useAmiSupervisor'`
- **Purpose**: Call supervision (listen/whisper/barge)

---

## Phase 14.1: High Priority Features

### useAmiVoicemail
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiVoicemail.ts`
- **Export**: `export { useAmiVoicemail, type UseAmiVoicemailReturn } from './useAmiVoicemail'`
- **Purpose**: Voicemail management via AMI
- **Features**:
  - MWI (Message Waiting Indicator) subscription
  - Voicemail message listing
  - Mailbox monitoring
  - Event callbacks for MWI changes
- **Tests**: 27 tests passing
- **Demo**: VoicemailDemo.vue

### useAmiParking
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiParking.ts`
- **Export**: `export { useAmiParking, type UseAmiParkingReturn } from './useAmiParking'`
- **Purpose**: Call parking lots via AMI
- **Features**:
  - Park call to lot with timeout
  - Retrieve parked call
  - Parking lot status monitoring
  - Multiple parking lots support
- **Tests**: 32 tests passing
- **Demo**: ParkingDemo.vue

### useSipWebRTCStats
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipWebRTCStats.ts`
- **Export**: `export { useSipWebRTCStats, type UseSipWebRTCStatsReturn } from './useSipWebRTCStats'`
- **Purpose**: WebRTC quality metrics
- **Features**:
  - RTCPeerConnection stats collection
  - Jitter, packet loss, RTT tracking
  - MOS score estimation
  - Quality level detection
- **Tests**: 46 tests passing
- **Demo**: WebRTCStatsDemo.vue

---

## Phase 14.2: Medium Priority Features

### useAmiRecording
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiRecording.ts`
- **Export**: `export { useAmiRecording } from './useAmiRecording'`
- **Purpose**: Call recording management
- **Features**:
  - Start/stop/pause recording
  - Recording list retrieval
  - Path traversal security protection
- **Tests**: 56 tests passing
- **Demo**: RecordingManagementDemo.vue

### useAmiCDR
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiCDR.ts`
- **Export**: `export { useAmiCDR } from './useAmiCDR'`
- **Purpose**: Real-time CDR processing
- **Features**:
  - Real-time CDR event handling
  - CDR aggregation by agent/queue
  - Daily/hourly statistics
  - Export functionality (CSV/JSON)
- **Tests**: 50 tests passing
- **Demo**: CDRDashboardDemo.vue

### useAmiAgentLogin
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiAgentLogin.ts`
- **Export**: `export { useAmiAgentLogin } from './useAmiAgentLogin'`
- **Purpose**: Agent queue login/logout
- **Features**:
  - Agent login to queues
  - Multi-queue login
  - Login state persistence
  - Pause/unpause functionality
- **Tests**: 58 tests passing
- **Demo**: AgentLoginDemo.vue

### useSipSecondLine
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipSecondLine.ts`
- **Export**: `export { useSipSecondLine } from './useSipSecondLine'`
- **Purpose**: Multi-line support
- **Features**:
  - Multiple simultaneous calls
  - Line switching
  - Hold/mute per line
  - Line transfer
- **Tests**: 68 tests passing
- **Demo**: MultiLineDemo.vue

### useAmiPaging
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiPaging.ts`
- **Export**: `export { useAmiPaging, type PagingMode, type PagingStatus, type PageGroup, type PagingSession, type UseAmiPagingReturn } from './useAmiPaging'`
- **Purpose**: Intercom/paging
- **Features**:
  - Single extension paging
  - Group paging
  - Duplex/simplex modes
- **Tests**: 45 tests passing
- **Demo**: PagingDemo.vue

---

## Phase 14.3: Lower Priority Features

### useAmiCallback
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiCallback.ts`
- **Export**: `export { useAmiCallback, type CallbackStatus, type CallbackRequest, type UseAmiCallbackReturn } from './useAmiCallback'`
- **Purpose**: Callback queue management
- **Features**:
  - Schedule callback
  - Cancel callback
  - Priority-based queue
  - AstDB persistence
- **Tests**: 45 tests passing
- **Demo**: CallbackDemo.vue

### useAmiFeatureCodes
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiFeatureCodes.ts`
- **Export**: `export { useAmiFeatureCodes, type DndStatus, type CallForwardStatus, type UseAmiFeatureCodesReturn } from './useAmiFeatureCodes'`
- **Purpose**: Dynamic feature codes (DND, CF, etc.)
- **Features**:
  - Execute feature codes
  - DND toggle
  - Call forward management
- **Tests**: 40 tests passing
- **Demo**: FeatureCodesDemo.vue

### useAmiBlacklist
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiBlacklist.ts`
- **Export**: `export { useAmiBlacklist, type BlockEntry, type BlockResult, type UseAmiBlacklistReturn } from './useAmiBlacklist'`
- **Purpose**: Call blocking/blacklist
- **Features**:
  - Block/unblock numbers
  - Pattern matching
  - Import/export
- **Tests**: 52 tests passing
- **Demo**: BlacklistDemo.vue

### useAmiTimeConditions
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiTimeConditions.ts`
- **Export**: `export { useAmiTimeConditions, type TimeCondition, type TimeConditionStatus, type UseAmiTimeConditionsReturn } from './useAmiTimeConditions'`
- **Purpose**: Time-based routing
- **Features**:
  - Business hours status
  - Schedule override toggle
  - Holiday schedule management
- **Tests**: 56 tests passing
- **Demo**: TimeConditionsDemo.vue

---

## Phase 14.4: Enterprise Features

### useSipAutoAnswer
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipAutoAnswer.ts`
- **Export**: `export { useSipAutoAnswer, type AutoAnswerMode, type AutoAnswerSettings, type UseSipAutoAnswerReturn } from './useSipAutoAnswer'`
- **Purpose**: Auto-answer mode
- **Features**:
  - Enable/disable auto-answer
  - Configurable delay
  - Whitelist management
  - Intercom mode support
- **Tests**: 62 tests passing
- **Demo**: AutoAnswerDemo.vue

### useAmiAgentStats
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiAgentStats.ts`
- **Export**: `export { useAmiAgentStats, type UseAmiAgentStatsReturn } from './useAmiAgentStats'`
- **Purpose**: Individual agent analytics
- **Features**:
  - Per-agent metrics
  - Talk/wrap time tracking
  - Performance level assessment
  - Historical data
- **Tests**: 49 tests passing
- **Demo**: AgentStatsDemo.vue

### useAmiRingGroups
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiRingGroups.ts`
- **Export**: `export { useAmiRingGroups, type UseAmiRingGroupsReturn } from './useAmiRingGroups'`
- **Purpose**: Ring group management
- **Features**:
  - Ring group listing
  - Member management
  - Ring strategy configuration
- **Tests**: 49 tests passing
- **Demo**: RingGroupsDemo.vue

### useAmiIVR
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useAmiIVR.ts`
- **Export**: `export { useAmiIVR, type UseAmiIVRReturn } from './useAmiIVR'`
- **Purpose**: IVR monitoring/control
- **Features**:
  - Callers in IVR tracking
  - IVR breakout
  - Menu navigation tracking
- **Tests**: 46 tests passing
- **Demo**: IVRMonitorDemo.vue

### useSipE911
- **Status**: [x] Completed & Exported
- **File**: `src/composables/useSipE911.ts`
- **Export**: `export { useSipE911, type UseSipE911Return } from './useSipE911'`
- **Purpose**: E911 emergency call handling
- **Features**:
  - E911 location management
  - Emergency call detection
  - Admin notification
  - Compliance logging
- **Tests**: Pending
- **Demo**: E911Demo.vue (pending)

---

## Not Exported (Utility/Internal)

### useSipConnection
- **Status**: [-] Internal only
- **File**: `src/composables/useSipConnection.ts`
- **Purpose**: Connection state management (SIP.js adapter, not used)
- **Notes**: This is a SIP.js adapter file, not exported as JsSIP is primary

### types.ts
- **Status**: [x] Internal types exported
- **File**: `src/composables/types.ts`
- **Export**: `export { type ExtendedCallSession, type ExtendedSipClient, hasCallSessionMethod } from './types'`

### constants.ts
- **Status**: [x] Constants exported
- **File**: `src/composables/constants.ts`
- **Export**: Multiple constants exported (REGISTRATION_CONSTANTS, PRESENCE_CONSTANTS, etc.)

---

## Remaining Work

### Composables Needing Exports
All Phase 14 composables are now exported from `src/composables/index.ts`.

### Demos Needing Real Implementation
The following demo components are currently placeholders and need to be updated to use real composables:

| Demo | Composable | Status |
|------|------------|--------|
| VoicemailDemo.vue | useAmiVoicemail | [~] Placeholder |
| ParkingDemo.vue | useAmiParking | [~] Placeholder |
| WebRTCStatsDemo.vue | useSipWebRTCStats | [~] Placeholder |
| RecordingManagementDemo.vue | useAmiRecording | [~] Placeholder |
| CDRDashboardDemo.vue | useAmiCDR | [~] Placeholder |
| AgentLoginDemo.vue | useAmiAgentLogin | [~] Placeholder |
| MultiLineDemo.vue | useSipSecondLine | [~] Placeholder |
| PagingDemo.vue | useAmiPaging | [-] Feature Preview |
| CallbackDemo.vue | useAmiCallback | [-] Feature Preview |
| FeatureCodesDemo.vue | useAmiFeatureCodes | [-] Feature Preview |
| BlacklistDemo.vue | useAmiBlacklist | [-] Feature Preview |
| TimeConditionsDemo.vue | useAmiTimeConditions | [-] Feature Preview |
| AutoAnswerDemo.vue | useSipAutoAnswer | [~] Placeholder |
| AgentStatsDemo.vue | useAmiAgentStats | [~] Placeholder |
| RingGroupsDemo.vue | useAmiRingGroups | [~] Placeholder |
| IVRMonitorDemo.vue | useAmiIVR | [~] Placeholder |
| E911Demo.vue | useSipE911 | [ ] Not Started |

### Documentation Needed

| Guide | Composable | Status |
|-------|------------|--------|
| docs/guide/call-recording.md | useAmiRecording | [ ] Not Started |
| docs/guide/cdr-analytics.md | useAmiCDR | [ ] Not Started |
| docs/guide/agent-management.md | useAmiAgentLogin | [ ] Not Started |
| docs/guide/paging-intercom.md | useAmiPaging | [ ] Not Started |
| docs/guide/callback-queue.md | useAmiCallback | [ ] Not Started |
| docs/guide/feature-codes.md | useAmiFeatureCodes | [ ] Not Started |
| docs/guide/call-blocking.md | useAmiBlacklist | [ ] Not Started |
| docs/guide/time-conditions.md | useAmiTimeConditions | [ ] Not Started |
| docs/guide/auto-answer.md | useSipAutoAnswer | [ ] Not Started |
| docs/guide/agent-analytics.md | useAmiAgentStats | [ ] Not Started |
| docs/guide/ring-groups.md | useAmiRingGroups | [ ] Not Started |
| docs/guide/ivr-monitoring.md | useAmiIVR | [ ] Not Started |
| docs/guide/e911-compliance.md | useSipE911 | [ ] Not Started |

---

## Future Composables (Not Started)

### useAmiHotDesking
- **Purpose**: Hot desk support
- **Features**: Login to shared phone, logout, profile sync
- **Priority**: Enterprise

### useAmiDialplan
- **Purpose**: Dynamic dialplan management
- **Features**: Dialplan reload, extension add/remove
- **Priority**: Enterprise

---

## Test Summary

| Phase | Tests | Status |
|-------|-------|--------|
| Core | ~200 | Passing |
| AMI Base | ~150 | Passing |
| Phase 14.1 | 105 | Passing |
| Phase 14.2 | 277 | Passing |
| Phase 14.3 | 193 | Passing |
| Phase 14.4 | 206 | Passing |
| **Total** | **~1131** | **Passing** |

---

## Quick Reference: Export Locations

All composables are exported from:
- **Primary**: `src/composables/index.ts`
- **Re-exported**: `src/index.ts` (main library entry)

Types are exported from:
- **Primary**: `src/types/index.ts`
- **Per-feature**: `src/types/*.types.ts`
