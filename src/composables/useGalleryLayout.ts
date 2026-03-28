/**
 * Gallery Layout Composable
 *
 * Provides reactive gallery layout calculations for displaying conference participants.
 * Calculates optimal grid dimensions based on participant count and supports multiple
 * layout modes including grid, speaker focus, sidebar, and spotlight.
 *
 * @module composables/useGalleryLayout
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type {
  GalleryLayoutMode,
  GalleryLayoutOptions,
  TileDimensions,
  UseGalleryLayoutReturn,
} from '../types/gallery-layout.types'
import { createLogger } from '../utils/logger'

const log = createLogger('useGalleryLayout')

/** Default gap between tiles in pixels */
const DEFAULT_GAP = 8

/** Default maximum columns */
const DEFAULT_MAX_COLS = 4

/** Default maximum rows */
const DEFAULT_MAX_ROWS = 4

/** Default aspect ratio (16:9) */
const DEFAULT_ASPECT_RATIO = 16 / 9

/**
 * Calculate optimal grid columns for participant count
 *
 * Grid sizing rules:
 * - 1 participant: 1x1
 * - 2 participants: 2x1
 * - 3-4 participants: 2x2
 * - 5-6 participants: 3x2
 * - 7-9 participants: 3x3
 * - 10-12 participants: 4x3
 * - 13+ participants: 4x4 or calculated from sqrt
 *
 * @param count - Number of participants
 * @param maxCols - Maximum allowed columns
 * @returns Optimal column count
 */
function calculateOptimalCols(count: number, maxCols: number): number {
  if (count <= 0) return 1
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 2
  if (count <= 6) return 3
  if (count <= 9) return 3
  if (count <= 12) return 4

  // For larger counts, use sqrt-based calculation capped at maxCols
  const cols = Math.ceil(Math.sqrt(count))
  return Math.min(cols, maxCols)
}

/**
 * Calculate optimal grid rows based on participant count and columns
 *
 * @param count - Number of participants
 * @param cols - Number of columns
 * @param maxRows - Maximum allowed rows
 * @returns Optimal row count
 */
function calculateOptimalRows(count: number, cols: number, maxRows: number): number {
  if (count <= 0) return 1
  if (cols <= 0) return 1

  const rows = Math.ceil(count / cols)
  return Math.min(rows, maxRows)
}

/**
 * Gallery Layout Composable
 *
 * Calculates optimal grid dimensions for displaying conference participants
 * based on participant count, container size, and layout mode.
 *
 * Features:
 * - Optimal grid calculation (cols x rows) based on participant count
 * - Tile dimension calculation from container size
 * - Multiple layout modes (grid, speaker, sidebar, spotlight)
 * - Participant pinning support
 * - Active speaker focus support
 * - CSS grid style generation
 *
 * @param participantCount - Reactive reference to number of participants
 * @param options - Configuration options
 * @returns Object containing layout state and control methods
 *
 * @since 1.0.0
 *
 * @example Basic usage
 * ```typescript
 * import { ref } from 'vue'
 * import { useGalleryLayout } from './composables/useGalleryLayout'
 *
 * const participantCount = ref(6)
 * const { gridCols, gridRows, gridStyle } = useGalleryLayout(participantCount)
 *
 * // gridCols.value = 3, gridRows.value = 2
 * // gridStyle.value = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;"
 * ```
 *
 * @example With container size for tile dimensions
 * ```typescript
 * const containerSize = ref({ width: 1920, height: 1080 })
 * const { tileDimensions, gridStyle } = useGalleryLayout(participantCount, {
 *   containerSize,
 *   gap: 16,
 * })
 *
 * // tileDimensions.value = { width: 624, height: 351 }
 * ```
 *
 * @example With active speaker support
 * ```typescript
 * const activeSpeakerId = ref('speaker-1')
 * const { focusedParticipantId, pinParticipant } = useGalleryLayout(participantCount, {
 *   activeSpeakerId,
 * })
 *
 * // focusedParticipantId.value = 'speaker-1'
 * pinParticipant('pinned-user')
 * // focusedParticipantId.value = 'pinned-user' (pinned takes priority)
 * ```
 */
export function useGalleryLayout(
  participantCount: Ref<number>,
  options: GalleryLayoutOptions = {}
): UseGalleryLayoutReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  const containerSize = options.containerSize
  const gap = options.gap ?? DEFAULT_GAP
  const activeSpeakerId = options.activeSpeakerId
  const maxCols = options.maxCols ?? DEFAULT_MAX_COLS
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS
  const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO

  // ============================================================================
  // Internal State
  // ============================================================================

  const layout = ref<GalleryLayoutMode>('grid')
  const pinnedParticipantId = ref<string | null>(null)

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Calculate optimal grid columns based on participant count
   */
  const gridCols: ComputedRef<number> = computed(() => {
    const count = Math.max(0, participantCount.value)
    return calculateOptimalCols(count, maxCols)
  })

  /**
   * Calculate optimal grid rows based on participant count and columns
   */
  const gridRows: ComputedRef<number> = computed(() => {
    const count = Math.max(0, participantCount.value)
    return calculateOptimalRows(count, gridCols.value, maxRows)
  })

  /**
   * Calculate tile dimensions based on container size
   */
  const tileDimensions: ComputedRef<TileDimensions> = computed(() => {
    // Return zero dimensions if no container size provided
    if (!containerSize) {
      return { width: 0, height: 0 }
    }

    const containerWidth = Math.max(0, containerSize.value.width)
    const containerHeight = Math.max(0, containerSize.value.height)

    // Handle zero container dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      return { width: 0, height: 0 }
    }

    const cols = gridCols.value
    const rows = gridRows.value

    // Calculate available width and height accounting for gaps
    const totalHorizontalGap = gap * (cols - 1)
    const totalVerticalGap = gap * (rows - 1)

    const availableWidth = containerWidth - totalHorizontalGap
    const availableHeight = containerHeight - totalVerticalGap

    // Calculate tile dimensions
    const maxTileWidth = Math.floor(availableWidth / cols)
    const maxTileHeight = Math.floor(availableHeight / rows)

    // Apply aspect ratio constraint
    // Calculate both dimensions and use the one that fits within the container
    const widthFromHeight = Math.floor(maxTileHeight * aspectRatio)
    const heightFromWidth = Math.floor(maxTileWidth / aspectRatio)

    let tileWidth: number
    let tileHeight: number

    if (widthFromHeight <= maxTileWidth) {
      // Height is the limiting factor
      tileWidth = widthFromHeight
      tileHeight = maxTileHeight
    } else {
      // Width is the limiting factor
      tileWidth = maxTileWidth
      tileHeight = heightFromWidth
    }

    return {
      width: Math.max(0, tileWidth),
      height: Math.max(0, tileHeight),
    }
  })

  /**
   * Generate CSS grid style string
   */
  const gridStyle: ComputedRef<string> = computed(() => {
    return `display: grid; grid-template-columns: repeat(${gridCols.value}, 1fr); gap: ${gap}px;`
  })

  /**
   * Currently focused participant (pinned or active speaker)
   */
  const focusedParticipantId: ComputedRef<string | null> = computed(() => {
    // Pinned participant takes priority
    if (pinnedParticipantId.value) {
      return pinnedParticipantId.value
    }

    // Fall back to active speaker if provided
    if (activeSpeakerId) {
      return activeSpeakerId.value
    }

    return null
  })

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Set the layout mode
   * @param mode - The layout mode to set
   */
  const setLayout = (mode: GalleryLayoutMode): void => {
    layout.value = mode
    log.debug('Layout mode changed', { mode })
  }

  /**
   * Pin a participant to focus
   * @param id - The participant ID to pin
   */
  const pinParticipant = (id: string): void => {
    pinnedParticipantId.value = id
    log.debug('Participant pinned', { id })
  }

  /**
   * Unpin the focused participant
   */
  const unpinParticipant = (): void => {
    const previousId = pinnedParticipantId.value
    pinnedParticipantId.value = null
    log.debug('Participant unpinned', { previousId })
  }

  // ============================================================================
  // Return Public API
  // ============================================================================

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
