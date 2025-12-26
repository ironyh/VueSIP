# TICKET-001: Fix EventBus Type Safety in MediaManager

## Priority: HIGH 🔴

**Estimated Effort**: 2-3 hours
**Impact**: Maintainability, refactoring safety, compile-time error detection

## Problem Statement

MediaManager currently uses 40+ instances of `(this.eventBus as any).emitSync()` which bypasses TypeScript type checking. This creates several issues:

1. **No compile-time type safety** for event names and payloads
2. **No autocomplete** for event names and data structures
3. **Potential runtime errors** from mismatched event payloads
4. **Refactoring risks** - changes to event types won't be caught by compiler

## Current Implementation

```typescript
// Lines 228, 235, 243, 257, 275, 283, 312, etc.
;(this.eventBus as any).emitSync('media:ice:candidate', {
  candidate: event.candidate,
})
;(this.eventBus as any).emitSync('media:ice:connection:state', {
  state: this.peerConnection.iceConnectionState,
})
```

## Proposed Solution

### 1. Define Event Type Map

Create a strongly-typed event map in EventBus types:

```typescript
// src/types/events.ts or src/core/EventBus.ts
export interface MediaEventMap {
  'media:ice:candidate': { candidate: RTCIceCandidate | null }
  'media:ice:gathering:complete': { candidates: RTCIceCandidate[] }
  'media:ice:connection:state': { state: RTCIceConnectionState }
  'media:ice:gathering:state': { state: RTCIceGatheringState }
  'media:stream:added': { stream: MediaStream; type: 'local' | 'remote' }
  'media:stream:removed': { type: 'local' | 'remote' }
  'media:track:added': { track: MediaStreamTrack; stream: MediaStream }
  'media:statistics': { statistics: MediaStatistics }
  'media:device:changed': { devices: MediaDevice[] }
}
```

### 2. Update EventBus Interface

```typescript
interface EventBus {
  // Add typed emitSync method
  emitSync<K extends keyof MediaEventMap>(event: K, data: MediaEventMap[K]): void

  // Existing methods...
  on(event: string, handler: (...args: any[]) => void): void
  off(event: string, handler: (...args: any[]) => void): void
}
```

### 3. Update MediaManager Usage

```typescript
// Remove 'as any' casts - full type safety!
this.eventBus.emitSync('media:ice:candidate', {
  candidate: event.candidate, // Type-checked!
})

this.eventBus.emitSync('media:ice:connection:state', {
  state: this.peerConnection.iceConnectionState, // Type-checked!
})
```

## Implementation Steps

1. [ ] Define `MediaEventMap` interface with all event types
2. [ ] Update EventBus interface with typed `emitSync` method
3. [ ] Remove all `as any` casts in MediaManager.ts (40+ locations)
4. [ ] Verify TypeScript compilation passes
5. [ ] Run existing tests to ensure no regressions
6. [ ] Update any event listeners to use typed events

## Files to Modify

- `src/types/events.ts` (create or update)
- `src/core/EventBus.ts` (update interface)
- `src/core/MediaManager.ts` (remove `as any` casts)

## Testing Requirements

- [ ] All existing tests pass without modification
- [ ] TypeScript compilation succeeds with strict mode
- [ ] No type errors in MediaManager event emissions
- [ ] IDE autocomplete works for event names and payloads

## Success Criteria

✅ Zero `as any` casts related to EventBus in MediaManager
✅ Full IntelliSense/autocomplete for event names
✅ Compile-time errors for invalid event names or payloads
✅ All tests pass without changes

## Risk Assessment

**Risk Level**: LOW

- Non-breaking change (backwards compatible)
- Isolated to type definitions
- Existing runtime behavior unchanged
- Comprehensive test coverage exists

## Dependencies

None - can be implemented independently

## Related Issues

- TICKET-002: Standardize Error Handling (complementary improvement)
