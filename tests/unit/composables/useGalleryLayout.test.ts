/**
 * Tests for useGalleryLayout composable
 *
 * Tests gallery layout calculations for conference participant display.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useGalleryLayout } from '@/composables/useGalleryLayout'
import type { ContainerSize, GalleryLayoutMode } from '@/types/gallery-layout.types'
import { withSetup } from '../../utils/test-helpers'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useGalleryLayout', () => {
  let participantCount: Ref<number>
  let containerSize: Ref<ContainerSize>

  beforeEach(() => {
    participantCount = ref(1)
    containerSize = ref({ width: 1920, height: 1080 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Initial State
  // ============================================================================

  describe('Initial State', () => {
    it('should initialize with grid layout by default', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.layout.value).toBe('grid')

      unmount()
    })

    it('should initialize with no pinned participant', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.pinnedParticipantId.value).toBeNull()

      unmount()
    })

    it('should initialize with 1x1 grid for single participant', () => {
      participantCount.value = 1

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(1)
      expect(result.gridRows.value).toBe(1)

      unmount()
    })

    it('should accept custom options', () => {
      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, {
          gap: 16,
          maxCols: 3,
          maxRows: 3,
          aspectRatio: 4 / 3,
        })
      )

      expect(result.layout.value).toBe('grid')

      unmount()
    })
  })

  // ============================================================================
  // Grid Calculation
  // ============================================================================

  describe('Grid Calculation', () => {
    it('should calculate 1x1 grid for 1 participant', () => {
      participantCount.value = 1

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(1)
      expect(result.gridRows.value).toBe(1)

      unmount()
    })

    it('should calculate 2x1 grid for 2 participants', () => {
      participantCount.value = 2

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(2)
      expect(result.gridRows.value).toBe(1)

      unmount()
    })

    it('should calculate 2x2 grid for 3 participants', () => {
      participantCount.value = 3

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(2)
      expect(result.gridRows.value).toBe(2)

      unmount()
    })

    it('should calculate 2x2 grid for 4 participants', () => {
      participantCount.value = 4

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(2)
      expect(result.gridRows.value).toBe(2)

      unmount()
    })

    it('should calculate 3x2 grid for 5 participants', () => {
      participantCount.value = 5

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(3)
      expect(result.gridRows.value).toBe(2)

      unmount()
    })

    it('should calculate 3x2 grid for 6 participants', () => {
      participantCount.value = 6

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(3)
      expect(result.gridRows.value).toBe(2)

      unmount()
    })

    it('should calculate 3x3 grid for 7 participants', () => {
      participantCount.value = 7

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(3)
      expect(result.gridRows.value).toBe(3)

      unmount()
    })

    it('should calculate 3x3 grid for 9 participants', () => {
      participantCount.value = 9

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(3)
      expect(result.gridRows.value).toBe(3)

      unmount()
    })

    it('should calculate 4x3 grid for 10 participants', () => {
      participantCount.value = 10

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(4)
      expect(result.gridRows.value).toBe(3)

      unmount()
    })

    it('should calculate 4x3 grid for 12 participants', () => {
      participantCount.value = 12

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(4)
      expect(result.gridRows.value).toBe(3)

      unmount()
    })

    it('should calculate 4x4 grid for 13+ participants', () => {
      participantCount.value = 13

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(4)
      expect(result.gridRows.value).toBe(4)

      unmount()
    })

    it('should calculate 4x4 grid for 16 participants', () => {
      participantCount.value = 16

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(4)
      expect(result.gridRows.value).toBe(4)

      unmount()
    })

    it('should cap at maxCols and maxRows for very large participant counts', () => {
      participantCount.value = 50

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { maxCols: 4, maxRows: 4 })
      )

      expect(result.gridCols.value).toBeLessThanOrEqual(4)
      expect(result.gridRows.value).toBeLessThanOrEqual(4)

      unmount()
    })

    it('should handle 0 participants', () => {
      participantCount.value = 0

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(1)
      expect(result.gridRows.value).toBe(1)

      unmount()
    })

    it('should react to participant count changes', () => {
      participantCount.value = 1

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(1)

      // Change participant count
      participantCount.value = 6

      expect(result.gridCols.value).toBe(3)
      expect(result.gridRows.value).toBe(2)

      unmount()
    })
  })

  // ============================================================================
  // Tile Dimensions Calculation
  // ============================================================================

  describe('Tile Dimensions Calculation', () => {
    it('should calculate tile dimensions based on container size', () => {
      participantCount.value = 4
      containerSize.value = { width: 1920, height: 1080 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, {
          containerSize,
          gap: 8,
        })
      )

      // 2x2 grid with 8px gap
      // Width: (1920 - 8 * 1) / 2 = 956
      // Height should respect aspect ratio
      expect(result.tileDimensions.value.width).toBeGreaterThan(0)
      expect(result.tileDimensions.value.height).toBeGreaterThan(0)

      unmount()
    })

    it('should apply gap correctly in tile width calculation', () => {
      participantCount.value = 4
      containerSize.value = { width: 1000, height: 600 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, {
          containerSize,
          gap: 10,
        })
      )

      // 2x2 grid: (1000 - 10 * (2-1)) / 2 = (1000 - 10) / 2 = 495
      expect(result.tileDimensions.value.width).toBe(495)

      unmount()
    })

    it('should maintain aspect ratio in tile dimensions', () => {
      participantCount.value = 1
      containerSize.value = { width: 1600, height: 900 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, {
          containerSize,
          gap: 0,
          aspectRatio: 16 / 9,
        })
      )

      const { width, height } = result.tileDimensions.value
      const calculatedRatio = width / height

      // Should be approximately 16/9
      expect(calculatedRatio).toBeCloseTo(16 / 9, 1)

      unmount()
    })

    it('should return default dimensions when container size is not provided', () => {
      participantCount.value = 4

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      // Default tile dimensions (0x0 when no container size)
      expect(result.tileDimensions.value.width).toBe(0)
      expect(result.tileDimensions.value.height).toBe(0)

      unmount()
    })

    it('should react to container size changes', () => {
      participantCount.value = 4
      containerSize.value = { width: 1000, height: 600 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, {
          containerSize,
          gap: 0,
        })
      )

      const initialWidth = result.tileDimensions.value.width

      // Change container size
      containerSize.value = { width: 2000, height: 1200 }

      const newWidth = result.tileDimensions.value.width
      expect(newWidth).toBeGreaterThan(initialWidth)

      unmount()
    })

    it('should handle very small container sizes', () => {
      participantCount.value = 4
      containerSize.value = { width: 100, height: 100 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, {
          containerSize,
          gap: 8,
        })
      )

      expect(result.tileDimensions.value.width).toBeGreaterThan(0)
      expect(result.tileDimensions.value.height).toBeGreaterThan(0)

      unmount()
    })
  })

  // ============================================================================
  // CSS Grid Style
  // ============================================================================

  describe('CSS Grid Style', () => {
    it('should generate correct grid style string', () => {
      participantCount.value = 4

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { gap: 8 })
      )

      const style = result.gridStyle.value

      expect(style).toContain('display: grid')
      expect(style).toContain('grid-template-columns: repeat(2, 1fr)')
      expect(style).toContain('gap: 8px')

      unmount()
    })

    it('should update grid style when participant count changes', () => {
      participantCount.value = 2

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { gap: 8 })
      )

      expect(result.gridStyle.value).toContain('grid-template-columns: repeat(2, 1fr)')

      participantCount.value = 9

      expect(result.gridStyle.value).toContain('grid-template-columns: repeat(3, 1fr)')

      unmount()
    })

    it('should use custom gap value', () => {
      participantCount.value = 4

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { gap: 16 })
      )

      expect(result.gridStyle.value).toContain('gap: 16px')

      unmount()
    })

    it('should use default gap of 8 when not specified', () => {
      participantCount.value = 4

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridStyle.value).toContain('gap: 8px')

      unmount()
    })
  })

  // ============================================================================
  // Layout Mode
  // ============================================================================

  describe('Layout Mode', () => {
    it('should allow changing layout mode with setLayout', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.layout.value).toBe('grid')

      result.setLayout('speaker')
      expect(result.layout.value).toBe('speaker')

      result.setLayout('sidebar')
      expect(result.layout.value).toBe('sidebar')

      result.setLayout('spotlight')
      expect(result.layout.value).toBe('spotlight')

      result.setLayout('grid')
      expect(result.layout.value).toBe('grid')

      unmount()
    })

    it('should handle all valid layout modes', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      const modes: GalleryLayoutMode[] = ['grid', 'speaker', 'sidebar', 'spotlight']

      modes.forEach((mode) => {
        result.setLayout(mode)
        expect(result.layout.value).toBe(mode)
      })

      unmount()
    })
  })

  // ============================================================================
  // Pinned Participant
  // ============================================================================

  describe('Pinned Participant', () => {
    it('should pin a participant', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      result.pinParticipant('participant-123')

      expect(result.pinnedParticipantId.value).toBe('participant-123')

      unmount()
    })

    it('should unpin a participant', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      result.pinParticipant('participant-123')
      expect(result.pinnedParticipantId.value).toBe('participant-123')

      result.unpinParticipant()
      expect(result.pinnedParticipantId.value).toBeNull()

      unmount()
    })

    it('should replace pinned participant when pinning another', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      result.pinParticipant('participant-1')
      expect(result.pinnedParticipantId.value).toBe('participant-1')

      result.pinParticipant('participant-2')
      expect(result.pinnedParticipantId.value).toBe('participant-2')

      unmount()
    })
  })

  // ============================================================================
  // Focused Participant
  // ============================================================================

  describe('Focused Participant', () => {
    it('should return null when no participant is pinned or active speaker', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.focusedParticipantId.value).toBeNull()

      unmount()
    })

    it('should return pinned participant as focused when pinned', () => {
      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      result.pinParticipant('pinned-participant')

      expect(result.focusedParticipantId.value).toBe('pinned-participant')

      unmount()
    })

    it('should return active speaker as focused when not pinned', () => {
      const activeSpeakerId = ref<string | null>('active-speaker-1')

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { activeSpeakerId })
      )

      expect(result.focusedParticipantId.value).toBe('active-speaker-1')

      unmount()
    })

    it('should prioritize pinned participant over active speaker', () => {
      const activeSpeakerId = ref<string | null>('active-speaker-1')

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { activeSpeakerId })
      )

      result.pinParticipant('pinned-participant')

      expect(result.focusedParticipantId.value).toBe('pinned-participant')

      unmount()
    })

    it('should react to active speaker changes', () => {
      const activeSpeakerId = ref<string | null>('speaker-1')

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { activeSpeakerId })
      )

      expect(result.focusedParticipantId.value).toBe('speaker-1')

      activeSpeakerId.value = 'speaker-2'

      expect(result.focusedParticipantId.value).toBe('speaker-2')

      unmount()
    })
  })

  // ============================================================================
  // Max Cols/Rows Configuration
  // ============================================================================

  describe('Max Cols/Rows Configuration', () => {
    it('should respect maxCols option', () => {
      participantCount.value = 20

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { maxCols: 3 })
      )

      expect(result.gridCols.value).toBeLessThanOrEqual(3)

      unmount()
    })

    it('should respect maxRows option', () => {
      participantCount.value = 20

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { maxRows: 3 })
      )

      expect(result.gridRows.value).toBeLessThanOrEqual(3)

      unmount()
    })

    it('should use default maxCols of 4', () => {
      participantCount.value = 20

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBeLessThanOrEqual(4)

      unmount()
    })

    it('should use default maxRows of 4', () => {
      participantCount.value = 20

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridRows.value).toBeLessThanOrEqual(4)

      unmount()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle negative participant count as 0', () => {
      participantCount.value = -5

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      expect(result.gridCols.value).toBe(1)
      expect(result.gridRows.value).toBe(1)

      unmount()
    })

    it('should handle very large participant count', () => {
      participantCount.value = 1000

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { maxCols: 4, maxRows: 4 })
      )

      expect(result.gridCols.value).toBeLessThanOrEqual(4)
      expect(result.gridRows.value).toBeLessThanOrEqual(4)

      unmount()
    })

    it('should handle container with zero dimensions', () => {
      participantCount.value = 4
      containerSize.value = { width: 0, height: 0 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { containerSize })
      )

      expect(result.tileDimensions.value.width).toBe(0)
      expect(result.tileDimensions.value.height).toBe(0)

      unmount()
    })

    it('should handle container with negative dimensions', () => {
      participantCount.value = 4
      containerSize.value = { width: -100, height: -100 }

      const { result, unmount } = withSetup(() =>
        useGalleryLayout(participantCount, { containerSize })
      )

      // Should clamp to 0 or handle gracefully
      expect(result.tileDimensions.value.width).toBeGreaterThanOrEqual(0)
      expect(result.tileDimensions.value.height).toBeGreaterThanOrEqual(0)

      unmount()
    })
  })

  // ============================================================================
  // Performance
  // ============================================================================

  describe('Performance', () => {
    it('should efficiently calculate grid for rapid participant changes', () => {
      participantCount.value = 1

      const { result, unmount } = withSetup(() => useGalleryLayout(participantCount))

      const startTime = performance.now()

      // Rapidly change participant count
      for (let i = 1; i <= 100; i++) {
        participantCount.value = i
        // Access computed values to trigger recalculation
        result.gridCols.value
        result.gridRows.value
      }

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should be fast

      unmount()
    })
  })
})
