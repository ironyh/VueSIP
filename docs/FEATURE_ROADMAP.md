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
**Effort**: 5 days | **Impact**: High | **Status**: 🔄 In Progress

- [x] Basic stats collection (`useSipWebRTCStats`)
- [ ] Quality scoring algorithm
- [ ] Network quality indicators
- [ ] Bandwidth adaptation recommendations

### 2.2 Connection Recovery
**Effort**: 4 days | **Impact**: High | **Status**: 📋 Planned

- [ ] Automatic reconnection on network change
- [ ] ICE restart handling
- [ ] Session persistence across reconnects

## Phase 3: Advanced Features

### 3.1 Conference Calling
**Effort**: 10 days | **Impact**: High | **Status**: 🔄 In Progress

- [x] Basic conference support (`useConference`)
- [ ] Participant management UI components
- [ ] Active speaker detection
- [ ] Gallery view layout

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
