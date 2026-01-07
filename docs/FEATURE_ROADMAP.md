# VueSIP Feature Roadmap

This document tracks the development progress of VueSIP features.

## Phase 1: Video Calling Enhancements

### 1.1 `usePictureInPicture` Composable

**Effort**: 3 days | **Impact**: High | **Status**: ✅ Complete

- [x] Check browser PiP API support
- [x] Handle video element lifecycle
- [x] Auto-exit on call end
- [x] Persist PiP preference
- [ ] Add to CallSession integration (Phase 2 - optional enhancement)

**Completed Features:**

- `usePictureInPicture` - Browser Picture-in-Picture API wrapper
- `useVideoInset` - CSS-based video overlay positioning
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
- [ ] Automatic reconnection on network change (Phase 2 - optional enhancement)
- [ ] Session persistence across reconnects (Phase 2 - optional enhancement)

**Completed Features:**

- `useConnectionRecovery` - ICE restart handling and connection recovery
- Recovery state tracking (stable, monitoring, recovering, failed)
- ICE health monitoring with state age tracking
- Configurable retry logic with exponential backoff support
- Full TypeScript support with comprehensive types
- Unit tests with 31 test cases (100% coverage)

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

**Effort**: 5 days | **Impact**: Medium | **Status**: 📋 Planned

- [ ] Server-side recording integration
- [ ] Local recording option
- [ ] Recording status indicators

## Legend

- ✅ Complete - Feature is fully implemented and tested
- 🔄 In Progress - Development is actively underway
- 📋 Planned - Feature is planned for future development
- ⏸️ On Hold - Development is temporarily paused
