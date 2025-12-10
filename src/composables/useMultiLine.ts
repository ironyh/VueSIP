/**
 * Multi-line Composable
 *
 * Vue 3 composable for managing multiple SIP lines with:
 * - Reactive line list management
 * - Current active line state
 * - Line switching and call assignment
 * - Conference and parking support
 * - Per-line call management
 */

import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import {
  MultiLineManager,
  LineState,
  type Line,
  type MultiLineConfig,
  type MultiLineStats,
  type ConferenceState,
  type ParkSlot,
} from '../core/MultiLineManager'
import type { CallSession } from '../types/call.types'

export interface UseMultiLineReturn {
  // State
  lines: Ref<Line[]>
  activeLine: ComputedRef<Line | undefined>
  activeLineId: ComputedRef<number>
  stats: Ref<MultiLineStats>

  // Computed state
  hasAvailableLine: ComputedRef<boolean>
  activeCallCount: ComputedRef<number>
  heldCallCount: ComputedRef<number>

  // Line operations
  getLine: (lineId: number) => Line | undefined
  switchToLine: (lineId: number) => Promise<void>
  holdLine: (lineId: number) => Promise<void>
  resumeLine: (lineId: number) => Promise<void>

  // Call management
  assignCallToLine: (callSession: CallSession, lineId?: number) => Promise<number>
  releaseCall: (lineId: number) => void

  // Conference support
  createConference: (lineIds: number[]) => Promise<string>
  addToConference: (lineId: number, conferenceId?: string) => Promise<void>
  removeFromConference: (lineId: number) => Promise<void>
  getActiveConferences: () => ConferenceState[]

  // Parking support
  parkLine: (lineId: number) => Promise<string>
  retrieveParked: (parkSlot: string) => Promise<number>
  getParkedCalls: () => ParkSlot[]

  // Status helpers
  isLineActive: (lineId: number) => boolean
  isLineHeld: (lineId: number) => boolean
  isLineIdle: (lineId: number) => boolean

  // Manager access (for advanced use)
  manager: MultiLineManager
}

/**
 * Create multi-line composable
 *
 * @param config - Optional multi-line configuration
 * @returns Multi-line state and methods
 *
 * @example
 * ```typescript
 * const {
 *   lines,
 *   activeLine,
 *   switchToLine,
 *   holdLine,
 *   resumeLine,
 *   assignCallToLine
 * } = useMultiLine({ maxLines: 4 })
 *
 * // Switch to line 2
 * await switchToLine(2)
 *
 * // Hold current line
 * await holdLine(activeLine.value?.id)
 *
 * // Assign incoming call to available line
 * const lineId = await assignCallToLine(incomingSession)
 * ```
 */
export function useMultiLine(config?: Partial<MultiLineConfig>): UseMultiLineReturn {
  // Initialize manager
  const manager = new MultiLineManager(config)

  // Reactive state
  const lines = ref<Line[]>(manager.getAllLines())
  const stats = ref<MultiLineStats>(manager.getStats())

  // Computed values
  const activeLine = computed(() => manager.getActiveLine())
  const activeLineId = computed(() => manager.getActiveLineId())

  const hasAvailableLine = computed(() => {
    return lines.value.some((line) => line.state === LineState.IDLE)
  })

  const activeCallCount = computed(() => {
    return lines.value.filter((line) => line.state === LineState.ACTIVE).length
  })

  const heldCallCount = computed(() => {
    return lines.value.filter((line) => line.state === LineState.HELD).length
  })

  // Update reactive state from manager
  const updateState = () => {
    lines.value = manager.getAllLines()
    stats.value = manager.getStats()
  }

  // Duration update interval
  let durationInterval: ReturnType<typeof setInterval> | null = null

  // Setup event subscriptions on mount
  onMounted(() => {
    // Subscribe to line events via EventBus
    // The manager emits events through its eventBus property
    // We update state on any line change

    // Start duration update interval
    durationInterval = setInterval(() => {
      manager.updateDurations()
      updateState()
    }, 1000)
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
    manager.reset()
  })

  // Line operations
  const getLine = (lineId: number): Line | undefined => {
    return manager.getLine(lineId)
  }

  const switchToLine = async (lineId: number): Promise<void> => {
    await manager.switchToLine(lineId)
    updateState()
  }

  const holdLine = async (lineId: number): Promise<void> => {
    await manager.holdLine(lineId)
    updateState()
  }

  const resumeLine = async (lineId: number): Promise<void> => {
    await manager.resumeLine(lineId)
    updateState()
  }

  // Call management
  const assignCallToLine = async (callSession: CallSession, lineId?: number): Promise<number> => {
    const assignedLineId = await manager.assignCallToLine(callSession, lineId)
    updateState()
    return assignedLineId
  }

  const releaseCall = (lineId: number): void => {
    manager.releaseCall(lineId)
    updateState()
  }

  // Conference support
  const createConference = async (lineIds: number[]): Promise<string> => {
    const conferenceId = await manager.createConference(lineIds)
    updateState()
    return conferenceId
  }

  const addToConference = async (lineId: number, conferenceId?: string): Promise<void> => {
    await manager.addToConference(lineId, conferenceId)
    updateState()
  }

  const removeFromConference = async (lineId: number): Promise<void> => {
    await manager.removeFromConference(lineId)
    updateState()
  }

  const getActiveConferences = (): ConferenceState[] => {
    return manager.getActiveConferences()
  }

  // Parking support
  const parkLine = async (lineId: number): Promise<string> => {
    const parkSlot = await manager.parkLine(lineId)
    updateState()
    return parkSlot
  }

  const retrieveParked = async (parkSlot: string): Promise<number> => {
    const lineId = await manager.retrieveParked(parkSlot)
    updateState()
    return lineId
  }

  const getParkedCalls = (): ParkSlot[] => {
    return manager.getParkedCalls()
  }

  // Status helpers
  const isLineActive = (lineId: number): boolean => {
    const line = manager.getLine(lineId)
    return line?.state === LineState.ACTIVE
  }

  const isLineHeld = (lineId: number): boolean => {
    const line = manager.getLine(lineId)
    return line?.state === LineState.HELD
  }

  const isLineIdle = (lineId: number): boolean => {
    const line = manager.getLine(lineId)
    return line?.state === LineState.IDLE
  }

  return {
    // State
    lines,
    activeLine,
    activeLineId,
    stats,

    // Computed state
    hasAvailableLine,
    activeCallCount,
    heldCallCount,

    // Line operations
    getLine,
    switchToLine,
    holdLine,
    resumeLine,

    // Call management
    assignCallToLine,
    releaseCall,

    // Conference support
    createConference,
    addToConference,
    removeFromConference,
    getActiveConferences,

    // Parking support
    parkLine,
    retrieveParked,
    getParkedCalls,

    // Status helpers
    isLineActive,
    isLineHeld,
    isLineIdle,

    // Manager access
    manager,
  }
}

// Re-export types for convenience
export { LineState } from '../core/MultiLineManager'
export type {
  Line,
  MultiLineConfig,
  MultiLineStats,
  ConferenceState,
  ParkSlot,
} from '../core/MultiLineManager'
