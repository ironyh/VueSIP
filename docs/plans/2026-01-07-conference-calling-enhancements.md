# Phase 3.1: Conference Calling Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement participant management UI components, active speaker detection, and gallery view layout for VueSIP conference calling.

**Architecture:** Build three new composables (`useActiveSpeaker`, `useGalleryLayout`, `useParticipantControls`) that integrate with the existing `useConference` composable. Create Vue components for participant tiles, gallery view, and controls that use these composables. Follow the existing demo pattern with simulation support.

**Tech Stack:** Vue 3 Composition API, TypeScript, CSS Grid for gallery layout, existing `useConference` composable (audio levels already available via `audio:level` events).

---

## Pre-Implementation Checklist

Before starting, ensure:
- [ ] `npm install` dependencies are up to date
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] Working on a feature branch: `git checkout -b feature/conference-enhancements`

---

## Task 1: Create `useActiveSpeaker` Composable

**Files:**
- Create: `src/composables/useActiveSpeaker.ts`
- Create: `src/types/active-speaker.types.ts`
- Test: `tests/unit/composables/useActiveSpeaker.test.ts`

### Step 1: Write the failing test for active speaker detection

```typescript
// tests/unit/composables/useActiveSpeaker.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useActiveSpeaker } from '../../../src/composables/useActiveSpeaker'
import type { Participant } from '../../../src/types/conference.types'

describe('useActiveSpeaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with no active speaker', () => {
    const participants = ref<Participant[]>([])
    const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants)

    expect(activeSpeaker.value).toBeNull()
    expect(activeSpeakers.value).toEqual([])
  })

  it('should detect active speaker from audio levels', async () => {
    const participants = ref<Participant[]>([
      createMockParticipant('1', 'Alice', 0.1),
      createMockParticipant('2', 'Bob', 0.6),
      createMockParticipant('3', 'Charlie', 0.2),
    ])

    const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants, {
      threshold: 0.15,
      debounceMs: 100,
    })

    await nextTick()
    vi.advanceTimersByTime(100)

    expect(activeSpeaker.value?.id).toBe('2')
    expect(activeSpeakers.value.length).toBe(2) // Bob and Charlie above threshold
  })

  it('should respect speaking threshold', async () => {
    const participants = ref<Participant[]>([
      createMockParticipant('1', 'Alice', 0.05),
      createMockParticipant('2', 'Bob', 0.08),
    ])

    const { activeSpeakers } = useActiveSpeaker(participants, {
      threshold: 0.1,
    })

    await nextTick()
    vi.advanceTimersByTime(100)

    expect(activeSpeakers.value).toEqual([])
  })

  it('should exclude muted participants', async () => {
    const mutedParticipant = createMockParticipant('1', 'Alice', 0.8)
    mutedParticipant.isMuted = true

    const participants = ref<Participant[]>([
      mutedParticipant,
      createMockParticipant('2', 'Bob', 0.3),
    ])

    const { activeSpeaker } = useActiveSpeaker(participants)

    await nextTick()
    vi.advanceTimersByTime(100)

    expect(activeSpeaker.value?.id).toBe('2')
  })

  it('should debounce speaker changes', async () => {
    const participants = ref<Participant[]>([
      createMockParticipant('1', 'Alice', 0.8),
    ])

    const { activeSpeaker, speakerHistory } = useActiveSpeaker(participants, {
      debounceMs: 500,
    })

    await nextTick()
    vi.advanceTimersByTime(100)

    // Change speaker
    participants.value[0].audioLevel = 0.1
    participants.value.push(createMockParticipant('2', 'Bob', 0.9))

    await nextTick()
    vi.advanceTimersByTime(100)

    // Should still be Alice (debounce not elapsed)
    expect(activeSpeaker.value?.id).toBe('1')

    vi.advanceTimersByTime(400) // Total 500ms
    expect(activeSpeaker.value?.id).toBe('2')
  })

  it('should track speaker history', async () => {
    const participants = ref<Participant[]>([
      createMockParticipant('1', 'Alice', 0.8),
    ])

    const { speakerHistory } = useActiveSpeaker(participants, {
      historySize: 5,
      debounceMs: 0,
    })

    await nextTick()
    vi.advanceTimersByTime(100)

    expect(speakerHistory.value.length).toBe(1)
    expect(speakerHistory.value[0].participantId).toBe('1')
  })
})

function createMockParticipant(
  id: string,
  displayName: string,
  audioLevel: number
): Participant {
  return {
    id,
    uri: `sip:${displayName.toLowerCase()}@example.com`,
    displayName,
    state: 'connected' as const,
    isMuted: false,
    isOnHold: false,
    isModerator: false,
    isSelf: false,
    audioLevel,
    joinedAt: new Date(),
  }
}
```

### Step 2: Run test to verify it fails

Run: `npm run test -- tests/unit/composables/useActiveSpeaker.test.ts`
Expected: FAIL with "Cannot find module '../../../src/composables/useActiveSpeaker'"

### Step 3: Create type definitions

```typescript
// src/types/active-speaker.types.ts
import type { ComputedRef, Ref } from 'vue'
import type { Participant } from './conference.types'

/**
 * Active speaker detection options
 */
export interface ActiveSpeakerOptions {
  /** Audio level threshold to consider someone speaking (0-1). Default: 0.15 */
  threshold?: number
  /** Debounce time in ms to prevent rapid speaker switching. Default: 300 */
  debounceMs?: number
  /** Number of recent speakers to track in history. Default: 10 */
  historySize?: number
  /** Exclude muted participants from detection. Default: true */
  excludeMuted?: boolean
  /** Callback when active speaker changes */
  onSpeakerChange?: (speaker: Participant | null, previous: Participant | null) => void
}

/**
 * Speaker history entry
 */
export interface SpeakerHistoryEntry {
  /** Participant ID */
  participantId: string
  /** Display name at time of speaking */
  displayName: string
  /** When they started speaking */
  startedAt: number
  /** When they stopped speaking (null if still speaking) */
  endedAt: number | null
  /** Peak audio level during this speaking period */
  peakLevel: number
}

/**
 * Return type for useActiveSpeaker composable
 */
export interface UseActiveSpeakerReturn {
  /** Current dominant speaker (highest audio level above threshold) */
  activeSpeaker: ComputedRef<Participant | null>
  /** All participants currently speaking (above threshold) */
  activeSpeakers: ComputedRef<Participant[]>
  /** Is anyone currently speaking */
  isSomeone Speaking: ComputedRef<boolean>
  /** Recent speaker history */
  speakerHistory: Ref<SpeakerHistoryEntry[]>
  /** Clear speaker history */
  clearHistory: () => void
  /** Update threshold dynamically */
  setThreshold: (threshold: number) => void
}
```

### Step 4: Implement the composable

```typescript
// src/composables/useActiveSpeaker.ts
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { Participant } from '../types/conference.types'
import type {
  ActiveSpeakerOptions,
  SpeakerHistoryEntry,
  UseActiveSpeakerReturn,
} from '../types/active-speaker.types'

/**
 * Active speaker detection composable
 *
 * Detects the dominant speaker from participant audio levels with debouncing
 * and history tracking.
 *
 * @param participants - Reactive array of conference participants
 * @param options - Configuration options
 * @returns Active speaker detection state and methods
 *
 * @example
 * ```ts
 * const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants, {
 *   threshold: 0.15,
 *   debounceMs: 300,
 * })
 * ```
 */
export function useActiveSpeaker(
  participants: Ref<Participant[]> | ComputedRef<Participant[]>,
  options: ActiveSpeakerOptions = {}
): UseActiveSpeakerReturn {
  const {
    threshold: initialThreshold = 0.15,
    debounceMs = 300,
    historySize = 10,
    excludeMuted = true,
    onSpeakerChange,
  } = options

  // State
  const currentThreshold = ref(initialThreshold)
  const speakerHistory = ref<SpeakerHistoryEntry[]>([])
  const debouncedSpeakerId = ref<string | null>(null)
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null
  let lastSpeakerId: string | null = null

  // Computed: All participants above threshold
  const activeSpeakers = computed(() => {
    return participants.value
      .filter((p) => {
        if (excludeMuted && p.isMuted) return false
        if (p.isOnHold) return false
        return (p.audioLevel ?? 0) >= currentThreshold.value
      })
      .sort((a, b) => (b.audioLevel ?? 0) - (a.audioLevel ?? 0))
  })

  // Computed: Single dominant speaker
  const activeSpeaker = computed(() => {
    const speakerId = debouncedSpeakerId.value
    if (!speakerId) return null
    return participants.value.find((p) => p.id === speakerId) ?? null
  })

  // Computed: Is anyone speaking
  const isSomeoneSpeaking = computed(() => activeSpeakers.value.length > 0)

  // Watch for speaker changes with debouncing
  watch(
    activeSpeakers,
    (speakers) => {
      const topSpeaker = speakers[0] ?? null
      const topSpeakerId = topSpeaker?.id ?? null

      // If same speaker, no change needed
      if (topSpeakerId === lastSpeakerId) return

      // Clear existing debounce
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }

      // Debounce the speaker change
      debounceTimeout = setTimeout(() => {
        const previousSpeaker = activeSpeaker.value
        debouncedSpeakerId.value = topSpeakerId
        lastSpeakerId = topSpeakerId

        // Update history
        if (topSpeaker) {
          updateHistory(topSpeaker)
        }

        // Callback
        if (onSpeakerChange) {
          onSpeakerChange(topSpeaker, previousSpeaker)
        }
      }, debounceMs)
    },
    { immediate: true }
  )

  // Update speaker history
  function updateHistory(speaker: Participant): void {
    const now = Date.now()

    // End previous speaker's entry
    const lastEntry = speakerHistory.value[0]
    if (lastEntry && lastEntry.endedAt === null) {
      lastEntry.endedAt = now
    }

    // Add new entry
    speakerHistory.value.unshift({
      participantId: speaker.id,
      displayName: speaker.displayName ?? speaker.uri,
      startedAt: now,
      endedAt: null,
      peakLevel: speaker.audioLevel ?? 0,
    })

    // Trim history
    if (speakerHistory.value.length > historySize) {
      speakerHistory.value = speakerHistory.value.slice(0, historySize)
    }
  }

  // Methods
  function clearHistory(): void {
    speakerHistory.value = []
  }

  function setThreshold(threshold: number): void {
    currentThreshold.value = Math.max(0, Math.min(1, threshold))
  }

  // Cleanup
  onUnmounted(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
  })

  return {
    activeSpeaker,
    activeSpeakers,
    isSomeoneSpeaking,
    speakerHistory,
    clearHistory,
    setThreshold,
  }
}
```

### Step 5: Run tests to verify they pass

Run: `npm run test -- tests/unit/composables/useActiveSpeaker.test.ts`
Expected: PASS

### Step 6: Run lint and type check

Run: `npm run lint && npm run typecheck`
Expected: PASS with no errors

### Step 7: Commit

```bash
git add src/composables/useActiveSpeaker.ts src/types/active-speaker.types.ts tests/unit/composables/useActiveSpeaker.test.ts
git commit -m "feat(conference): add useActiveSpeaker composable for speaker detection

- Detect dominant speaker from audio levels with debouncing
- Track speaker history with configurable size
- Support threshold configuration and muted participant exclusion
- Add onSpeakerChange callback for speaker change events"
```

---

## Task 2: Create `useGalleryLayout` Composable

**Files:**
- Create: `src/composables/useGalleryLayout.ts`
- Create: `src/types/gallery-layout.types.ts`
- Test: `tests/unit/composables/useGalleryLayout.test.ts`

### Step 1: Write the failing test

```typescript
// tests/unit/composables/useGalleryLayout.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useGalleryLayout } from '../../../src/composables/useGalleryLayout'

describe('useGalleryLayout', () => {
  it('should initialize with default layout', () => {
    const participantCount = ref(4)
    const { gridCols, gridRows, layout } = useGalleryLayout(participantCount)

    expect(gridCols.value).toBe(2)
    expect(gridRows.value).toBe(2)
    expect(layout.value).toBe('grid')
  })

  it('should calculate optimal grid for various participant counts', () => {
    const participantCount = ref(1)
    const { gridCols, gridRows } = useGalleryLayout(participantCount)

    // 1 participant: 1x1
    expect(gridCols.value).toBe(1)
    expect(gridRows.value).toBe(1)

    // 2 participants: 2x1
    participantCount.value = 2
    expect(gridCols.value).toBe(2)
    expect(gridRows.value).toBe(1)

    // 3 participants: 2x2 (with one empty)
    participantCount.value = 3
    expect(gridCols.value).toBe(2)
    expect(gridRows.value).toBe(2)

    // 4 participants: 2x2
    participantCount.value = 4
    expect(gridCols.value).toBe(2)
    expect(gridRows.value).toBe(2)

    // 5-6 participants: 3x2
    participantCount.value = 6
    expect(gridCols.value).toBe(3)
    expect(gridRows.value).toBe(2)

    // 7-9 participants: 3x3
    participantCount.value = 9
    expect(gridCols.value).toBe(3)
    expect(gridRows.value).toBe(3)
  })

  it('should support speaker focus layout', () => {
    const participantCount = ref(4)
    const activeSpeakerId = ref<string | null>('speaker-1')

    const { layout, focusedParticipantId, setLayout } = useGalleryLayout(
      participantCount,
      { activeSpeakerId }
    )

    setLayout('speaker')
    expect(layout.value).toBe('speaker')
    expect(focusedParticipantId.value).toBe('speaker-1')
  })

  it('should calculate tile dimensions', () => {
    const participantCount = ref(4)
    const containerSize = ref({ width: 800, height: 600 })

    const { tileDimensions } = useGalleryLayout(participantCount, {
      containerSize,
      gap: 8,
    })

    // 2x2 grid with 8px gap in 800x600 container
    // Width: (800 - 8) / 2 = 396
    // Height: (600 - 8) / 2 = 296
    expect(tileDimensions.value.width).toBe(396)
    expect(tileDimensions.value.height).toBe(296)
  })

  it('should support pinned participant', () => {
    const participantCount = ref(4)
    const { pinnedParticipantId, pinParticipant, unpinParticipant } = useGalleryLayout(participantCount)

    pinParticipant('participant-1')
    expect(pinnedParticipantId.value).toBe('participant-1')

    unpinParticipant()
    expect(pinnedParticipantId.value).toBeNull()
  })

  it('should generate CSS grid styles', () => {
    const participantCount = ref(4)
    const { gridStyle } = useGalleryLayout(participantCount, { gap: 10 })

    expect(gridStyle.value).toContain('grid-template-columns')
    expect(gridStyle.value).toContain('gap: 10px')
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm run test -- tests/unit/composables/useGalleryLayout.test.ts`
Expected: FAIL

### Step 3: Create type definitions

```typescript
// src/types/gallery-layout.types.ts
import type { ComputedRef, Ref } from 'vue'

/**
 * Gallery layout mode
 */
export type GalleryLayoutMode = 'grid' | 'speaker' | 'sidebar' | 'spotlight'

/**
 * Container dimensions
 */
export interface ContainerSize {
  width: number
  height: number
}

/**
 * Tile dimensions
 */
export interface TileDimensions {
  width: number
  height: number
}

/**
 * Gallery layout options
 */
export interface GalleryLayoutOptions {
  /** Container size for dimension calculations */
  containerSize?: Ref<ContainerSize>
  /** Gap between tiles in pixels. Default: 8 */
  gap?: number
  /** Active speaker ID for speaker-focused layouts */
  activeSpeakerId?: Ref<string | null>
  /** Maximum columns. Default: 4 */
  maxCols?: number
  /** Maximum rows. Default: 4 */
  maxRows?: number
  /** Aspect ratio for tiles. Default: 16/9 */
  aspectRatio?: number
}

/**
 * Return type for useGalleryLayout composable
 */
export interface UseGalleryLayoutReturn {
  /** Current layout mode */
  layout: Ref<GalleryLayoutMode>
  /** Number of grid columns */
  gridCols: ComputedRef<number>
  /** Number of grid rows */
  gridRows: ComputedRef<number>
  /** Calculated tile dimensions */
  tileDimensions: ComputedRef<TileDimensions>
  /** CSS grid style string */
  gridStyle: ComputedRef<string>
  /** Currently focused participant ID (for speaker layout) */
  focusedParticipantId: ComputedRef<string | null>
  /** Pinned participant ID */
  pinnedParticipantId: Ref<string | null>
  /** Set layout mode */
  setLayout: (mode: GalleryLayoutMode) => void
  /** Pin a participant to focus */
  pinParticipant: (id: string) => void
  /** Unpin the focused participant */
  unpinParticipant: () => void
}
```

### Step 4: Implement the composable

```typescript
// src/composables/useGalleryLayout.ts
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type {
  GalleryLayoutMode,
  GalleryLayoutOptions,
  TileDimensions,
  UseGalleryLayoutReturn,
} from '../types/gallery-layout.types'

/**
 * Gallery layout composable for conference participant display
 *
 * Calculates optimal grid dimensions and tile sizes for displaying
 * conference participants in various layout modes.
 *
 * @param participantCount - Number of participants to display
 * @param options - Layout configuration options
 * @returns Layout state and methods
 *
 * @example
 * ```ts
 * const { gridCols, gridRows, gridStyle } = useGalleryLayout(participantCount, {
 *   gap: 8,
 *   maxCols: 4,
 * })
 * ```
 */
export function useGalleryLayout(
  participantCount: Ref<number> | ComputedRef<number>,
  options: GalleryLayoutOptions = {}
): UseGalleryLayoutReturn {
  const {
    containerSize,
    gap = 8,
    activeSpeakerId,
    maxCols = 4,
    maxRows = 4,
    aspectRatio = 16 / 9,
  } = options

  // State
  const layout = ref<GalleryLayoutMode>('grid')
  const pinnedParticipantId = ref<string | null>(null)

  // Calculate optimal grid dimensions
  const gridCols = computed(() => {
    const count = participantCount.value
    if (count <= 0) return 1
    if (count === 1) return 1
    if (count === 2) return 2
    if (count <= 4) return 2
    if (count <= 6) return 3
    if (count <= 9) return 3
    if (count <= 12) return 4
    return Math.min(maxCols, Math.ceil(Math.sqrt(count)))
  })

  const gridRows = computed(() => {
    const count = participantCount.value
    if (count <= 0) return 1
    return Math.min(maxRows, Math.ceil(count / gridCols.value))
  })

  // Calculate tile dimensions based on container
  const tileDimensions = computed<TileDimensions>(() => {
    if (!containerSize?.value) {
      return { width: 320, height: 180 } // Default 16:9
    }

    const { width, height } = containerSize.value
    const cols = gridCols.value
    const rows = gridRows.value

    const totalGapX = gap * (cols - 1)
    const totalGapY = gap * (rows - 1)

    const tileWidth = Math.floor((width - totalGapX) / cols)
    const tileHeight = Math.floor((height - totalGapY) / rows)

    return { width: tileWidth, height: tileHeight }
  })

  // Generate CSS grid style
  const gridStyle = computed(() => {
    const cols = gridCols.value
    return `
      display: grid;
      grid-template-columns: repeat(${cols}, 1fr);
      gap: ${gap}px;
    `.trim()
  })

  // Focused participant (pinned takes precedence over active speaker)
  const focusedParticipantId = computed(() => {
    if (pinnedParticipantId.value) return pinnedParticipantId.value
    if (layout.value === 'speaker' && activeSpeakerId?.value) {
      return activeSpeakerId.value
    }
    return null
  })

  // Methods
  function setLayout(mode: GalleryLayoutMode): void {
    layout.value = mode
  }

  function pinParticipant(id: string): void {
    pinnedParticipantId.value = id
  }

  function unpinParticipant(): void {
    pinnedParticipantId.value = null
  }

  return {
    layout,
    gridCols,
    gridRows,
    tileDimensions,
    gridStyle,
    focusedParticipantId,
    pinnedParticipantId,
    setLayout,
    pinParticipant,
    unpinParticipant,
  }
}
```

### Step 5: Run tests to verify they pass

Run: `npm run test -- tests/unit/composables/useGalleryLayout.test.ts`
Expected: PASS

### Step 6: Run lint and type check

Run: `npm run lint && npm run typecheck`
Expected: PASS

### Step 7: Commit

```bash
git add src/composables/useGalleryLayout.ts src/types/gallery-layout.types.ts tests/unit/composables/useGalleryLayout.test.ts
git commit -m "feat(conference): add useGalleryLayout composable for grid calculations

- Calculate optimal grid dimensions based on participant count
- Support grid, speaker, sidebar, and spotlight layouts
- Calculate tile dimensions from container size
- Support participant pinning and active speaker focus
- Generate CSS grid styles"
```

---

## Task 3: Create `useParticipantControls` Composable

**Files:**
- Create: `src/composables/useParticipantControls.ts`
- Create: `src/types/participant-controls.types.ts`
- Test: `tests/unit/composables/useParticipantControls.test.ts`

### Step 1: Write the failing test

```typescript
// tests/unit/composables/useParticipantControls.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useParticipantControls } from '../../../src/composables/useParticipantControls'
import type { Participant } from '../../../src/types/conference.types'

describe('useParticipantControls', () => {
  const createMockParticipant = (id: string, overrides = {}): Participant => ({
    id,
    uri: `sip:user-${id}@example.com`,
    displayName: `User ${id}`,
    state: 'connected' as const,
    isMuted: false,
    isOnHold: false,
    isModerator: false,
    isSelf: false,
    joinedAt: new Date(),
    ...overrides,
  })

  it('should provide mute/unmute controls', () => {
    const participant = ref(createMockParticipant('1'))
    const onMute = vi.fn()
    const onUnmute = vi.fn()

    const { toggleMute, canMute } = useParticipantControls(participant, {
      onMute,
      onUnmute,
    })

    expect(canMute.value).toBe(true)

    // Mute
    toggleMute()
    expect(onMute).toHaveBeenCalledWith(participant.value)

    // Update state
    participant.value = { ...participant.value, isMuted: true }

    // Unmute
    toggleMute()
    expect(onUnmute).toHaveBeenCalledWith(participant.value)
  })

  it('should provide kick control for moderators', () => {
    const participant = ref(createMockParticipant('1'))
    const isModerator = ref(true)
    const onKick = vi.fn()

    const { kickParticipant, canKick } = useParticipantControls(participant, {
      isModerator,
      onKick,
    })

    expect(canKick.value).toBe(true)

    kickParticipant()
    expect(onKick).toHaveBeenCalledWith(participant.value)
  })

  it('should not allow kicking when not moderator', () => {
    const participant = ref(createMockParticipant('1'))
    const isModerator = ref(false)

    const { canKick } = useParticipantControls(participant, { isModerator })

    expect(canKick.value).toBe(false)
  })

  it('should not allow self-kick', () => {
    const participant = ref(createMockParticipant('1', { isSelf: true }))
    const isModerator = ref(true)

    const { canKick } = useParticipantControls(participant, { isModerator })

    expect(canKick.value).toBe(false)
  })

  it('should provide pin/unpin controls', () => {
    const participant = ref(createMockParticipant('1'))
    const isPinned = ref(false)
    const onPin = vi.fn()
    const onUnpin = vi.fn()

    const { togglePin } = useParticipantControls(participant, {
      isPinned,
      onPin,
      onUnpin,
    })

    // Pin
    togglePin()
    expect(onPin).toHaveBeenCalledWith(participant.value)

    // Update state
    isPinned.value = true

    // Unpin
    togglePin()
    expect(onUnpin).toHaveBeenCalledWith(participant.value)
  })

  it('should provide volume control', () => {
    const participant = ref(createMockParticipant('1'))
    const onVolumeChange = vi.fn()

    const { setVolume, volume } = useParticipantControls(participant, {
      initialVolume: 0.8,
      onVolumeChange,
    })

    expect(volume.value).toBe(0.8)

    setVolume(0.5)
    expect(volume.value).toBe(0.5)
    expect(onVolumeChange).toHaveBeenCalledWith(participant.value, 0.5)
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm run test -- tests/unit/composables/useParticipantControls.test.ts`
Expected: FAIL

### Step 3: Create type definitions

```typescript
// src/types/participant-controls.types.ts
import type { ComputedRef, Ref } from 'vue'
import type { Participant } from './conference.types'

/**
 * Participant controls options
 */
export interface ParticipantControlsOptions {
  /** Whether the current user is a moderator */
  isModerator?: Ref<boolean>
  /** Whether this participant is currently pinned */
  isPinned?: Ref<boolean>
  /** Initial volume level (0-1). Default: 1 */
  initialVolume?: number
  /** Callback when participant is muted */
  onMute?: (participant: Participant) => void
  /** Callback when participant is unmuted */
  onUnmute?: (participant: Participant) => void
  /** Callback when participant is kicked */
  onKick?: (participant: Participant) => void
  /** Callback when participant is pinned */
  onPin?: (participant: Participant) => void
  /** Callback when participant is unpinned */
  onUnpin?: (participant: Participant) => void
  /** Callback when volume changes */
  onVolumeChange?: (participant: Participant, volume: number) => void
}

/**
 * Return type for useParticipantControls composable
 */
export interface UseParticipantControlsReturn {
  /** Can mute/unmute this participant */
  canMute: ComputedRef<boolean>
  /** Can kick this participant */
  canKick: ComputedRef<boolean>
  /** Can pin this participant */
  canPin: ComputedRef<boolean>
  /** Current volume level */
  volume: Ref<number>
  /** Toggle mute state */
  toggleMute: () => void
  /** Kick participant from conference */
  kickParticipant: () => void
  /** Toggle pin state */
  togglePin: () => void
  /** Set volume level */
  setVolume: (level: number) => void
}
```

### Step 4: Implement the composable

```typescript
// src/composables/useParticipantControls.ts
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Participant } from '../types/conference.types'
import type {
  ParticipantControlsOptions,
  UseParticipantControlsReturn,
} from '../types/participant-controls.types'

/**
 * Participant controls composable
 *
 * Provides control actions for a conference participant including
 * mute, kick, pin, and volume controls.
 *
 * @param participant - The participant to control
 * @param options - Control options and callbacks
 * @returns Control state and methods
 *
 * @example
 * ```ts
 * const { toggleMute, canKick, kickParticipant } = useParticipantControls(
 *   participant,
 *   {
 *     isModerator: ref(true),
 *     onMute: (p) => conference.muteParticipant(p.id),
 *   }
 * )
 * ```
 */
export function useParticipantControls(
  participant: Ref<Participant> | ComputedRef<Participant>,
  options: ParticipantControlsOptions = {}
): UseParticipantControlsReturn {
  const {
    isModerator = ref(false),
    isPinned = ref(false),
    initialVolume = 1,
    onMute,
    onUnmute,
    onKick,
    onPin,
    onUnpin,
    onVolumeChange,
  } = options

  // State
  const volume = ref(initialVolume)

  // Computed permissions
  const canMute = computed(() => {
    return participant.value.state === 'connected'
  })

  const canKick = computed(() => {
    // Can't kick yourself
    if (participant.value.isSelf) return false
    // Must be moderator to kick
    return isModerator.value
  })

  const canPin = computed(() => {
    return participant.value.state === 'connected'
  })

  // Actions
  function toggleMute(): void {
    if (!canMute.value) return

    if (participant.value.isMuted) {
      onUnmute?.(participant.value)
    } else {
      onMute?.(participant.value)
    }
  }

  function kickParticipant(): void {
    if (!canKick.value) return
    onKick?.(participant.value)
  }

  function togglePin(): void {
    if (!canPin.value) return

    if (isPinned.value) {
      onUnpin?.(participant.value)
    } else {
      onPin?.(participant.value)
    }
  }

  function setVolume(level: number): void {
    const clampedLevel = Math.max(0, Math.min(1, level))
    volume.value = clampedLevel
    onVolumeChange?.(participant.value, clampedLevel)
  }

  return {
    canMute,
    canKick,
    canPin,
    volume,
    toggleMute,
    kickParticipant,
    togglePin,
    setVolume,
  }
}
```

### Step 5: Run tests to verify they pass

Run: `npm run test -- tests/unit/composables/useParticipantControls.test.ts`
Expected: PASS

### Step 6: Run lint and type check

Run: `npm run lint && npm run typecheck`
Expected: PASS

### Step 7: Commit

```bash
git add src/composables/useParticipantControls.ts src/types/participant-controls.types.ts tests/unit/composables/useParticipantControls.test.ts
git commit -m "feat(conference): add useParticipantControls composable

- Provide mute/unmute, kick, and pin controls
- Support volume adjustment per participant
- Permission checking (moderator for kick, no self-kick)
- Callbacks for all control actions"
```

---

## Task 4: Export New Composables from Index

**Files:**
- Modify: `src/composables/index.ts`
- Modify: `src/types/index.ts`
- Modify: `src/index.ts`

### Step 1: Update composables index

```typescript
// Add to src/composables/index.ts
export { useActiveSpeaker } from './useActiveSpeaker'
export { useGalleryLayout } from './useGalleryLayout'
export { useParticipantControls } from './useParticipantControls'
```

### Step 2: Update types index

```typescript
// Add to src/types/index.ts
export * from './active-speaker.types'
export * from './gallery-layout.types'
export * from './participant-controls.types'
```

### Step 3: Run tests and lint

Run: `npm run test && npm run lint && npm run typecheck`
Expected: PASS

### Step 4: Commit

```bash
git add src/composables/index.ts src/types/index.ts
git commit -m "chore(exports): export conference enhancement composables

- Export useActiveSpeaker, useGalleryLayout, useParticipantControls
- Export all related type definitions"
```

---

## Task 5: Create ConferenceGalleryDemo.vue

**Files:**
- Create: `playground/demos/ConferenceGalleryDemo.vue`
- Modify: `playground/examples/index.ts`
- Create: `playground/examples/conference-gallery.ts`

### Step 1: Create the demo component

Create a comprehensive demo following the ConnectionRecoveryDemo pattern with:
- SimulationControls integration
- Gallery view with active speaker detection
- Layout switching (grid, speaker, sidebar)
- Participant controls (mute, kick, pin)
- Real-time audio level visualization

### Step 2: Create example definition

```typescript
// playground/examples/conference-gallery.ts
import type { ExampleDefinition } from './types'
import ConferenceGalleryDemo from '../demos/ConferenceGalleryDemo.vue'

export const conferenceGalleryExample: ExampleDefinition = {
  id: 'conference-gallery',
  icon: '🎬',
  title: 'Conference Gallery',
  description: 'Gallery view with active speaker detection and layouts',
  category: 'sip',
  tags: ['Advanced', 'Video', 'Conference'],
  component: ConferenceGalleryDemo,
  setupGuide: '<p>View conference participants in a responsive gallery layout with automatic active speaker detection and multiple layout modes.</p>',
  codeSnippets: [
    // Add code snippets showing usage
  ],
}
```

### Step 3: Update examples index

Add `conferenceGalleryExample` to `sipExamples` array in `playground/examples/index.ts`.

### Step 4: Run and test manually

Run: `npm run dev` and test the demo in the playground.

### Step 5: Commit

```bash
git add playground/demos/ConferenceGalleryDemo.vue playground/examples/conference-gallery.ts playground/examples/index.ts
git commit -m "feat(playground): add Conference Gallery demo

- Gallery view with grid, speaker, and sidebar layouts
- Active speaker detection with visual indicators
- Participant controls (mute, kick, pin, volume)
- Audio level visualization
- Simulation support for testing"
```

---

## Task 6: Update API Documentation

**Files:**
- Modify: `docs/api/composables.md`

### Step 1: Add documentation for new composables

Add sections for:
- `useActiveSpeaker` - with options, return values, and examples
- `useGalleryLayout` - with layout modes and grid calculations
- `useParticipantControls` - with permissions and callbacks

### Step 2: Update examples in docs

Ensure code examples work correctly.

### Step 3: Commit

```bash
git add docs/api/composables.md
git commit -m "docs(api): add documentation for conference enhancements

- Document useActiveSpeaker with speaker detection options
- Document useGalleryLayout with layout modes
- Document useParticipantControls with permissions"
```

---

## Task 7: Update Feature Roadmap

**Files:**
- Modify: `docs/FEATURE_ROADMAP.md`

### Step 1: Mark Phase 3.1 items as complete

Update the roadmap to mark:
- [x] Participant management UI components
- [x] Active speaker detection
- [x] Gallery view layout

### Step 2: Commit

```bash
git add docs/FEATURE_ROADMAP.md
git commit -m "docs(roadmap): mark Phase 3.1 as complete

- Participant management UI components ✅
- Active speaker detection ✅
- Gallery view layout ✅"
```

---

## Task 8: Final Validation

### Step 1: Run full test suite

Run: `npm run test`
Expected: All tests pass

### Step 2: Run linting

Run: `npm run lint`
Expected: No errors

### Step 3: Run type checking

Run: `npm run typecheck`
Expected: No errors

### Step 4: Run build

Run: `npm run build`
Expected: Build succeeds

### Step 5: Test playground manually

Run: `npm run dev`
- Navigate to Conference Gallery demo
- Test all layout modes
- Test speaker detection simulation
- Test participant controls

---

## Summary

This plan implements Phase 3.1 with:

1. **`useActiveSpeaker`** - Detects dominant speaker from audio levels with debouncing and history tracking
2. **`useGalleryLayout`** - Calculates optimal grid dimensions and supports multiple layout modes
3. **`useParticipantControls`** - Provides mute, kick, pin, and volume controls with permission checking
4. **ConferenceGalleryDemo** - Interactive playground demo showcasing all features

All implementations follow TDD methodology with comprehensive tests, TypeScript types, and documentation.
