/**
 * Gallery layout type definitions
 *
 * Types for the useGalleryLayout composable which calculates optimal grid
 * dimensions for displaying conference participants.
 *
 * @packageDocumentation
 */

import type { ComputedRef, Ref } from 'vue'

/**
 * Gallery layout mode
 *
 * - grid: Standard grid layout with equal-sized tiles
 * - speaker: Focus on dominant speaker with smaller tiles for others
 * - sidebar: Main content with sidebar of participant tiles
 * - spotlight: Single participant in focus
 */
export type GalleryLayoutMode = 'grid' | 'speaker' | 'sidebar' | 'spotlight'

/**
 * Container dimensions for layout calculations
 */
export interface ContainerSize {
  /** Container width in pixels */
  width: number
  /** Container height in pixels */
  height: number
}

/**
 * Tile dimensions for participant video tiles
 */
export interface TileDimensions {
  /** Tile width in pixels */
  width: number
  /** Tile height in pixels */
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
  /** Aspect ratio for tiles (width/height). Default: 16/9 */
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
