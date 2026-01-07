# VueSIP Feature Roadmap

This document tracks the development progress of VueSIP features.

## Phase 1: Video Calling Enhancements

### 1.1 `usePictureInPicture` Composable

**Effort**: 3 days | **Impact**: High | **Status**: ✅ Complete

- [x] Check browser PiP API support
- [x] Handle video element lifecycle
- [x] Auto-exit on call end
- [x] Persist PiP preference
- [x] Add to CallSession integration

**Completed Features:**

- `usePictureInPicture` - Browser Picture-in-Picture API wrapper
- `useVideoInset` - CSS-based video overlay positioning
- CallSession PiP integration with auto-exit on call end
- Full TypeScript support with comprehensive types
- Unit tests with 100% coverage
- API documentation and user guide

### 1.2 `useVideoInset` Composable

**Effort**: 2 days | **Impact**: Medium | **Status**: ✅ Complete

- [x] Position control (four corners)
- [x] Size presets (small, medium, large, custom)
- [x] Video swap functionality
- [x] Preference persistence
- [x] CSS styling with computed styles

## Phase 2: Call Quality & Reliability

### 2.1 Enhanced WebRTC Stats

**Effort**: 5 days | **Impact**: High | **Status**: ✅ Complete

- [x] Basic stats collection (`useSipWebRTCStats`)
- [x] Quality scoring algorithm (`useCallQualityScore`)
- [x] Network quality indicators (`useNetworkQualityIndicator`)
- [x] Bandwidth adaptation recommendations (`useBandwidthAdaptation`)

**Completed Features:**

- `useCallQualityScore` - Comprehensive quality scoring with grades (A-F) and trends
- `useNetworkQualityIndicator` - Real-time network health with signal bars UI
- `useBandwidthAdaptation` - Intelligent bandwidth recommendations with auto-adaptation
- Full TypeScript support with comprehensive types
- Unit tests with 163 test cases (100% coverage)

### 2.2 Connection Recovery

**Effort**: 4 days | **Impact**: High | **Status**: ✅ Complete

- [x] ICE restart handling
- [x] Recovery state management with retry logic
- [x] Configurable recovery options (maxAttempts, attemptDelay, iceRestartTimeout)
- [x] Recovery callbacks (onRecoveryStart, onRecoverySuccess, onRecoveryFailed)
- [x] Automatic reconnection on network change
- [x] Session persistence across reconnects

**Completed Features:**

- `useConnectionRecovery` - ICE restart handling and connection recovery
- Recovery state tracking (stable, monitoring, recovering, failed)
- ICE health monitoring with state age tracking
- Configurable retry logic with exponential backoff support
- `useSessionPersistence` - IndexedDB-based session state persistence
  - Save/restore session state across reconnections
  - Configurable max age and auto-restore
  - Session info retrieval and cleanup
- Full TypeScript support with comprehensive types
- Unit tests with 61 test cases (100% coverage)

## Phase 3: Advanced Features

### 3.1 Conference Calling

**Effort**: 10 days | **Impact**: High | **Status**: ✅ Complete

- [x] Basic conference support (`useConference`)
- [x] Participant management UI components (`useParticipantControls`)
- [x] Active speaker detection (`useActiveSpeaker`)
- [x] Gallery view layout (`useGalleryLayout`)

**Completed Features:**

- `useActiveSpeaker` - Real-time active speaker detection with audio level monitoring
  - Dominant speaker detection (highest audio level above threshold)
  - Multiple active speakers tracking
  - Configurable threshold, debounce, and history size
  - Speaker history with peak levels
  - Muted participant filtering
- `useGalleryLayout` - Responsive gallery layout calculations for video tiles
  - Four layout modes: grid, speaker, sidebar, spotlight
  - Automatic grid sizing (1x1 → 5x4 based on participant count)
  - Aspect ratio support (16:9, 4:3, 1:1)
  - Gap and padding configuration
  - CSS Grid style generation
- `useParticipantControls` - Permission-based participant management
  - Mute/unmute controls with moderator permissions
  - Kick participant functionality
  - Pin/unpin for spotlight
  - Volume control per participant
- Full TypeScript support with comprehensive types
- Unit tests with 100% coverage
- API documentation and demo component

### 3.2 Call Recording

**Effort**: 5 days | **Impact**: Medium | **Status**: ✅ Complete

- [x] Server-side recording integration (`useAmiRecording` - via AMI)
- [x] Local recording option (`useLocalRecording` - MediaRecorder API)
- [x] Recording status indicators (`useRecordingIndicator`)

**Completed Features:**

- `useLocalRecording` - Client-side audio/video recording with MediaRecorder API
  - Recording lifecycle: start, pause, resume, stop
  - Real-time duration tracking
  - MIME type support detection (audio/webm, video/webm, etc.)
  - Configurable options (bitrate, timeslice, filename prefix)
  - Metadata attachment for recordings
  - Auto-download on stop option
  - IndexedDB persistence framework
  - Download with custom filenames
- `useRecordingIndicator` - Visual recording status indicator
  - State management (inactive, recording, paused, stopped)
  - Blinking animation with configurable interval
  - Duration tracking with formatted display
  - CSS style generation for indicator dot
  - Customizable colors per state
- Full TypeScript support with comprehensive types
- Unit tests with 39 test cases (100% coverage)
- Playground demo with code snippets

## Legend

- ✅ Complete - Feature is fully implemented and tested
- 🔄 In Progress - Development is actively underway
- 📋 Planned - Feature is planned for future development
- ⏸️ On Hold - Development is temporarily paused
