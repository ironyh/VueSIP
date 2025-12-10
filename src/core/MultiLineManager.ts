/**
 * MultiLineManager - Core multi-line management system
 * Handles multiple concurrent SIP lines, conferences, and line parking
 */

import { EventBus, globalEventBus } from '@/core/EventBus'
import type { CallSession } from '@/types/call.types'

/**
 * Represents the current state of a line
 */
export enum LineState {
  /** Line is available and not in use */
  IDLE = 'idle',
  /** Incoming call ringing on this line */
  RINGING = 'ringing',
  /** Active call in progress on this line */
  ACTIVE = 'active',
  /** Call is on hold on this line */
  HELD = 'held',
  /** Call transfer in progress on this line */
  TRANSFERRING = 'transferring',
  /** Call is parked on this line */
  PARKED = 'parked'
}

/**
 * Ring policy for handling incoming calls
 */
export type RingPolicy = 'sequential' | 'parallel' | 'round-robin'

/**
 * Represents a single line in the multi-line system
 */
export interface Line {
  /** Unique line identifier (1-based) */
  id: number
  /** Current state of the line */
  state: LineState
  /** Associated call session if active */
  callSession: CallSession | null
  /** Remote party identifier (phone number or SIP URI) */
  remoteParty: string | null
  /** Call duration in seconds */
  duration: number
  /** Call start timestamp */
  startTime: Date | null
  /** Whether this line is part of a conference */
  isConference: boolean
  /** Conference ID if part of a conference */
  conferenceId?: string
  /** Park slot identifier if parked */
  parkSlot?: string
}

/**
 * Configuration options for multi-line manager
 */
export interface MultiLineConfig {
  /** Maximum number of lines to support */
  maxLines: number
  /** Automatically answer incoming calls */
  autoAnswer: boolean
  /** Policy for distributing incoming calls */
  ringPolicy: RingPolicy
  /** Default line to use for outgoing calls */
  defaultLine: number
  /** Enable conference bridging */
  conferenceEnabled: boolean
  /** Enable call parking */
  parkingEnabled: boolean
}

/**
 * Conference state tracking
 */
export interface ConferenceState {
  /** Unique conference identifier */
  id: string
  /** Lines participating in the conference */
  lines: number[]
  /** Whether the conference is active */
  active: boolean
  /** Whether all lines are bridged together */
  bridged: boolean
  /** Conference start time */
  startTime: Date
  /** Number of participants */
  participantCount: number
}

/**
 * Line state change event data
 */
export interface LineStateChangeEvent {
  /** Line that changed state */
  lineId: number
  /** Previous state */
  previousState: LineState
  /** New state */
  newState: LineState
  /** Associated call session if applicable */
  callSession?: CallSession
  /** Event timestamp */
  timestamp: Date
}

/**
 * Conference event data
 */
export interface ConferenceEvent {
  /** Conference identifier */
  conferenceId: string
  /** Event type */
  type: 'created' | 'participant-added' | 'participant-removed' | 'ended'
  /** Affected line ID */
  lineId?: number
  /** Current participant line IDs */
  participants: number[]
  /** Event timestamp */
  timestamp: Date
}

/**
 * Line selection criteria
 */
export interface LineSelectionCriteria {
  /** Prefer specific line ID */
  preferredLine?: number
  /** Require idle line */
  requireIdle?: boolean
  /** Exclude specific lines */
  excludeLines?: number[]
  /** Allow held lines */
  allowHeld?: boolean
}

/**
 * Park slot information
 */
export interface ParkSlot {
  /** Slot identifier */
  id: string
  /** Line ID that is parked */
  lineId: number
  /** Remote party information */
  remoteParty: string
  /** Park timestamp */
  parkedAt: Date
  /** Retrieval code */
  retrievalCode?: string
}

/**
 * Multi-line statistics
 */
export interface MultiLineStats {
  /** Total number of lines */
  totalLines: number
  /** Number of active lines */
  activeLines: number
  /** Number of held lines */
  heldLines: number
  /** Number of idle lines */
  idleLines: number
  /** Active conferences */
  activeConferences: number
  /** Parked calls */
  parkedCalls: number
  /** Total calls handled */
  totalCallsHandled: number
}

/**
 * Line event types for EventBus integration
 */
export enum LineEventType {
  LINE_STATE_CHANGED = 'line:state-changed',
  LINE_ASSIGNED = 'line:assigned',
  LINE_RELEASED = 'line:released',
  LINE_SWITCHED = 'line:switched',
  CONFERENCE_CREATED = 'conference:created',
  CONFERENCE_PARTICIPANT_ADDED = 'conference:participant-added',
  CONFERENCE_PARTICIPANT_REMOVED = 'conference:participant-removed',
  CONFERENCE_ENDED = 'conference:ended',
  CALL_PARKED = 'call:parked',
  CALL_RETRIEVED = 'call:retrieved'
}

/**
 * Error codes specific to multi-line operations
 */
export enum MultiLineErrorCode {
  LINE_NOT_FOUND = 'LINE_NOT_FOUND',
  LINE_BUSY = 'LINE_BUSY',
  LINE_NOT_IDLE = 'LINE_NOT_IDLE',
  NO_AVAILABLE_LINES = 'NO_AVAILABLE_LINES',
  INVALID_LINE_ID = 'INVALID_LINE_ID',
  CONFERENCE_ALREADY_EXISTS = 'CONFERENCE_ALREADY_EXISTS',
  CONFERENCE_NOT_FOUND = 'CONFERENCE_NOT_FOUND',
  PARK_SLOT_NOT_FOUND = 'PARK_SLOT_NOT_FOUND',
  PARK_SLOT_OCCUPIED = 'PARK_SLOT_OCCUPIED',
  INVALID_CONFERENCE_OPERATION = 'INVALID_CONFERENCE_OPERATION',
  MAX_LINES_REACHED = 'MAX_LINES_REACHED'
}

/**
 * Multi-line specific error
 */
export class MultiLineError extends Error {
  constructor(
    public code: MultiLineErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'MultiLineError'
  }
}

/**
 * Default configuration for multi-line manager
 */
const DEFAULT_CONFIG: MultiLineConfig = {
  maxLines: 4,
  autoAnswer: false,
  ringPolicy: 'sequential',
  defaultLine: 1,
  conferenceEnabled: true,
  parkingEnabled: true
}

/**
 * MultiLineManager manages multiple concurrent SIP lines
 * Provides line switching, conferencing, parking, and state management
 */
export class MultiLineManager {
  private lines: Map<number, Line>
  private activeLine: number
  private config: MultiLineConfig
  private conferences: Map<string, ConferenceState>
  private parkSlots: Map<string, ParkSlot>
  private callCounter: number
  private eventBus: EventBus

  constructor(config?: Partial<MultiLineConfig>, eventBus?: EventBus) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.lines = new Map()
    this.activeLine = this.config.defaultLine
    this.conferences = new Map()
    this.parkSlots = new Map()
    this.callCounter = 0
    this.eventBus = eventBus || globalEventBus

    this.initializeLines()
  }

  /**
   * Initialize all lines to idle state
   */
  private initializeLines(): void {
    for (let i = 1; i <= this.config.maxLines; i++) {
      this.lines.set(i, {
        id: i,
        state: LineState.IDLE,
        callSession: null,
        remoteParty: null,
        duration: 0,
        startTime: null,
        isConference: false
      })
    }
  }

  /**
   * Get a specific line by ID
   */
  getLine(lineId: number): Line | undefined {
    return this.lines.get(lineId)
  }

  /**
   * Get all lines
   */
  getAllLines(): Line[] {
    return Array.from(this.lines.values())
  }

  /**
   * Get the currently active line
   */
  getActiveLine(): Line | undefined {
    return this.lines.get(this.activeLine)
  }

  /**
   * Get the active line ID
   */
  getActiveLineId(): number {
    return this.activeLine
  }

  /**
   * Find an available line based on criteria
   */
  getAvailableLine(criteria?: LineSelectionCriteria): Line | undefined {
    // Check preferred line first
    if (criteria?.preferredLine) {
      const line = this.lines.get(criteria.preferredLine)
      if (line && this.isLineAvailable(line, criteria)) {
        return line
      }
    }

    // Find first available line
    for (const line of this.lines.values()) {
      if (criteria?.excludeLines?.includes(line.id)) {
        continue
      }
      if (this.isLineAvailable(line, criteria)) {
        return line
      }
    }

    return undefined
  }

  /**
   * Check if a line is available based on criteria
   */
  private isLineAvailable(line: Line, criteria?: LineSelectionCriteria): boolean {
    if (criteria?.requireIdle && line.state !== LineState.IDLE) {
      return false
    }

    if (!criteria?.allowHeld && line.state === LineState.HELD) {
      return false
    }

    return line.state === LineState.IDLE ||
           (criteria?.allowHeld === true && line.state === LineState.HELD)
  }

  /**
   * Assign a call to a specific line or auto-select
   */
  async assignCallToLine(
    callSession: CallSession,
    lineId?: number
  ): Promise<number> {
    let targetLine: Line | undefined

    if (lineId) {
      targetLine = this.lines.get(lineId)
      if (!targetLine) {
        throw new MultiLineError(
          MultiLineErrorCode.INVALID_LINE_ID,
          `Line ${lineId} does not exist`
        )
      }
      if (targetLine.state !== LineState.IDLE) {
        throw new MultiLineError(
          MultiLineErrorCode.LINE_BUSY,
          `Line ${lineId} is not available`,
          { lineState: targetLine.state }
        )
      }
    } else {
      targetLine = this.getAvailableLine({ requireIdle: true })
      if (!targetLine) {
        throw new MultiLineError(
          MultiLineErrorCode.NO_AVAILABLE_LINES,
          'No available lines for incoming call'
        )
      }
    }

    // Assign call to line
    // Extract remote party from the call session's remoteUri
    const remoteParty = typeof callSession.remoteUri === 'string'
      ? callSession.remoteUri
      : callSession.remoteUri?.user || callSession.remoteDisplayName || 'Unknown'

    this.updateLineState(targetLine.id, LineState.RINGING, {
      callSession,
      remoteParty
    })

    this.callCounter++

    this.eventBus.emit(LineEventType.LINE_ASSIGNED, {
      type: LineEventType.LINE_ASSIGNED,
      timestamp: new Date(),
      payload: { lineId: targetLine.id, callSession }
    })

    return targetLine.id
  }

  /**
   * Switch to a different line
   */
  async switchToLine(lineId: number): Promise<void> {
    const line = this.lines.get(lineId)
    if (!line) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_FOUND,
        `Line ${lineId} not found`
      )
    }

    const previousLine = this.activeLine

    // Put current active line on hold if it has an active call
    if (previousLine !== lineId) {
      const currentLine = this.lines.get(previousLine)
      if (currentLine?.state === LineState.ACTIVE && currentLine.callSession) {
        await this.holdLine(previousLine)
      }
    }

    this.activeLine = lineId

    // Resume the new line if it was held
    if (line.state === LineState.HELD && line.callSession) {
      await this.resumeLine(lineId)
    }

    this.eventBus.emit(LineEventType.LINE_SWITCHED, {
      type: LineEventType.LINE_SWITCHED,
      timestamp: new Date(),
      payload: { previousLine, newLine: lineId }
    })
  }

  /**
   * Hold a call on a specific line
   */
  async holdLine(lineId: number): Promise<void> {
    const line = this.lines.get(lineId)
    if (!line) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_FOUND,
        `Line ${lineId} not found`
      )
    }

    if (line.state !== LineState.ACTIVE) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_IDLE,
        `Cannot hold line ${lineId} - not active`,
        { currentState: line.state }
      )
    }

    if (!line.callSession) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_IDLE,
        `No call session on line ${lineId}`
      )
    }

    // Use hold functionality if available
    if (line.callSession.hold) {
      line.callSession.hold()
    }

    this.updateLineState(lineId, LineState.HELD)
  }

  /**
   * Resume a held call on a specific line
   */
  async resumeLine(lineId: number): Promise<void> {
    const line = this.lines.get(lineId)
    if (!line) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_FOUND,
        `Line ${lineId} not found`
      )
    }

    if (line.state !== LineState.HELD) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_IDLE,
        `Cannot resume line ${lineId} - not held`,
        { currentState: line.state }
      )
    }

    if (!line.callSession) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_IDLE,
        `No call session on line ${lineId}`
      )
    }

    // Use unhold functionality if available
    if (line.callSession.unhold) {
      line.callSession.unhold()
    }

    this.updateLineState(lineId, LineState.ACTIVE)
  }

  /**
   * Park a call from a specific line
   */
  async parkLine(lineId: number): Promise<string> {
    if (!this.config.parkingEnabled) {
      throw new MultiLineError(
        MultiLineErrorCode.INVALID_CONFERENCE_OPERATION,
        'Call parking is not enabled'
      )
    }

    const line = this.lines.get(lineId)
    if (!line) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_FOUND,
        `Line ${lineId} not found`
      )
    }

    if (!line.callSession || !line.remoteParty) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_IDLE,
        `No active call on line ${lineId}`
      )
    }

    // Generate park slot ID
    const parkSlotId = `park-${Date.now()}-${lineId}`
    const retrievalCode = Math.floor(1000 + Math.random() * 9000).toString()

    const parkSlot: ParkSlot = {
      id: parkSlotId,
      lineId,
      remoteParty: line.remoteParty,
      parkedAt: new Date(),
      retrievalCode
    }

    this.parkSlots.set(parkSlotId, parkSlot)
    this.updateLineState(lineId, LineState.PARKED, { parkSlot: parkSlotId })

    // Hold the call if hold method is available
    if (line.callSession.hold) {
      line.callSession.hold()
    }

    this.eventBus.emit(LineEventType.CALL_PARKED, {
      type: LineEventType.CALL_PARKED,
      timestamp: new Date(),
      payload: { lineId, parkSlot: parkSlotId, retrievalCode }
    })

    return parkSlotId
  }

  /**
   * Retrieve a parked call
   */
  async retrieveParked(parkSlot: string): Promise<number> {
    const slot = this.parkSlots.get(parkSlot)
    if (!slot) {
      throw new MultiLineError(
        MultiLineErrorCode.PARK_SLOT_NOT_FOUND,
        `Park slot ${parkSlot} not found`
      )
    }

    const line = this.lines.get(slot.lineId)
    if (!line || !line.callSession) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_FOUND,
        `Line ${slot.lineId} not found or no call session`
      )
    }

    // Unhold the call if unhold method is available
    if (line.callSession.unhold) {
      line.callSession.unhold()
    }

    this.updateLineState(slot.lineId, LineState.ACTIVE)
    this.parkSlots.delete(parkSlot)

    this.eventBus.emit(LineEventType.CALL_RETRIEVED, {
      type: LineEventType.CALL_RETRIEVED,
      timestamp: new Date(),
      payload: { lineId: slot.lineId, parkSlot }
    })

    return slot.lineId
  }

  /**
   * Create a conference from multiple lines
   */
  async createConference(lineIds: number[]): Promise<string> {
    if (!this.config.conferenceEnabled) {
      throw new MultiLineError(
        MultiLineErrorCode.INVALID_CONFERENCE_OPERATION,
        'Conference feature is not enabled'
      )
    }

    if (lineIds.length < 2) {
      throw new MultiLineError(
        MultiLineErrorCode.INVALID_CONFERENCE_OPERATION,
        'At least 2 lines required for conference'
      )
    }

    // Validate all lines
    for (const lineId of lineIds) {
      const line = this.lines.get(lineId)
      if (!line || !line.callSession) {
        throw new MultiLineError(
          MultiLineErrorCode.LINE_NOT_FOUND,
          `Line ${lineId} not found or has no active call`
        )
      }
    }

    const conferenceId = `conf-${Date.now()}`
    const conference: ConferenceState = {
      id: conferenceId,
      lines: lineIds,
      active: true,
      bridged: true,
      startTime: new Date(),
      participantCount: lineIds.length
    }

    this.conferences.set(conferenceId, conference)

    // Mark lines as conference participants
    for (const lineId of lineIds) {
      const line = this.lines.get(lineId)
      if (line) {
        line.isConference = true
        line.conferenceId = conferenceId
        this.updateLineState(lineId, LineState.ACTIVE)
      }
    }

    const event: ConferenceEvent = {
      conferenceId,
      type: 'created',
      participants: lineIds,
      timestamp: new Date()
    }

    this.eventBus.emit(LineEventType.CONFERENCE_CREATED, event)

    return conferenceId
  }

  /**
   * Add a line to an existing conference
   */
  async addToConference(lineId: number, conferenceId?: string): Promise<void> {
    const line = this.lines.get(lineId)
    if (!line || !line.callSession) {
      throw new MultiLineError(
        MultiLineErrorCode.LINE_NOT_FOUND,
        `Line ${lineId} not found or has no active call`
      )
    }

    // Find active conference or use specified one
    let conference: ConferenceState | undefined
    if (conferenceId) {
      conference = this.conferences.get(conferenceId)
    } else {
      // Find first active conference
      conference = Array.from(this.conferences.values()).find(c => c.active)
    }

    if (!conference) {
      throw new MultiLineError(
        MultiLineErrorCode.CONFERENCE_NOT_FOUND,
        'No active conference found'
      )
    }

    if (conference.lines.includes(lineId)) {
      return // Already in conference
    }

    conference.lines.push(lineId)
    conference.participantCount++
    line.isConference = true
    line.conferenceId = conference.id

    const event: ConferenceEvent = {
      conferenceId: conference.id,
      type: 'participant-added',
      lineId,
      participants: conference.lines,
      timestamp: new Date()
    }

    this.eventBus.emit(LineEventType.CONFERENCE_PARTICIPANT_ADDED, event)
  }

  /**
   * Remove a line from a conference
   */
  async removeFromConference(lineId: number): Promise<void> {
    const line = this.lines.get(lineId)
    if (!line || !line.conferenceId) {
      return // Not in a conference
    }

    const conference = this.conferences.get(line.conferenceId)
    if (!conference) {
      return
    }

    conference.lines = conference.lines.filter(id => id !== lineId)
    conference.participantCount--
    line.isConference = false
    delete line.conferenceId

    const event: ConferenceEvent = {
      conferenceId: conference.id,
      type: 'participant-removed',
      lineId,
      participants: conference.lines,
      timestamp: new Date()
    }

    this.eventBus.emit(LineEventType.CONFERENCE_PARTICIPANT_REMOVED, event)

    // End conference if only one participant left
    if (conference.participantCount <= 1) {
      await this.endConference(conference.id)
    }
  }

  /**
   * End a conference
   */
  private async endConference(conferenceId: string): Promise<void> {
    const conference = this.conferences.get(conferenceId)
    if (!conference) {
      return
    }

    conference.active = false
    conference.bridged = false

    // Remove conference flags from all lines
    for (const lineId of conference.lines) {
      const line = this.lines.get(lineId)
      if (line) {
        line.isConference = false
        delete line.conferenceId
      }
    }

    const event: ConferenceEvent = {
      conferenceId,
      type: 'ended',
      participants: conference.lines,
      timestamp: new Date()
    }

    this.eventBus.emit(LineEventType.CONFERENCE_ENDED, event)
    this.conferences.delete(conferenceId)
  }

  /**
   * Get conference state
   */
  getConference(conferenceId: string): ConferenceState | undefined {
    return this.conferences.get(conferenceId)
  }

  /**
   * Get all active conferences
   */
  getActiveConferences(): ConferenceState[] {
    return Array.from(this.conferences.values()).filter(c => c.active)
  }

  /**
   * Release a call from a line
   */
  releaseCall(lineId: number): void {
    const line = this.lines.get(lineId)
    if (!line) {
      return
    }

    // Remove from conference if applicable
    if (line.conferenceId) {
      this.removeFromConference(lineId)
    }

    // Remove from park slots
    for (const [slotId, slot] of this.parkSlots.entries()) {
      if (slot.lineId === lineId) {
        this.parkSlots.delete(slotId)
      }
    }

    this.updateLineState(lineId, LineState.IDLE, {
      callSession: null,
      remoteParty: null,
      duration: 0,
      startTime: null
    })

    this.eventBus.emit(LineEventType.LINE_RELEASED, {
      type: LineEventType.LINE_RELEASED,
      timestamp: new Date(),
      payload: { lineId }
    })
  }

  /**
   * Release a line (alias for releaseCall)
   */
  releaseLine(lineId: number): void {
    this.releaseCall(lineId)
  }

  /**
   * Update line state with optional data
   */
  private updateLineState(
    lineId: number,
    newState: LineState,
    data?: Partial<Line>
  ): void {
    const line = this.lines.get(lineId)
    if (!line) {
      return
    }

    const previousState = line.state
    line.state = newState

    if (data) {
      Object.assign(line, data)
    }

    // Set start time when call becomes active
    if (newState === LineState.ACTIVE && !line.startTime) {
      line.startTime = new Date()
    }

    // Clear start time when call ends
    if (newState === LineState.IDLE) {
      line.startTime = null
      line.duration = 0
    }

    const event: LineStateChangeEvent = {
      lineId,
      previousState,
      newState,
      callSession: line.callSession || undefined,
      timestamp: new Date()
    }

    this.eventBus.emit(LineEventType.LINE_STATE_CHANGED, {
      type: LineEventType.LINE_STATE_CHANGED,
      timestamp: new Date(),
      payload: event
    })
  }

  /**
   * Get statistics about line usage
   */
  getStats(): MultiLineStats {
    const lines = Array.from(this.lines.values())
    return {
      totalLines: this.config.maxLines,
      activeLines: lines.filter(l => l.state === LineState.ACTIVE).length,
      heldLines: lines.filter(l => l.state === LineState.HELD).length,
      idleLines: lines.filter(l => l.state === LineState.IDLE).length,
      activeConferences: this.getActiveConferences().length,
      parkedCalls: this.parkSlots.size,
      totalCallsHandled: this.callCounter
    }
  }

  /**
   * Get all parked calls
   */
  getParkedCalls(): ParkSlot[] {
    return Array.from(this.parkSlots.values())
  }

  /**
   * Update call duration for active lines
   */
  updateDurations(): void {
    const now = Date.now()
    for (const line of this.lines.values()) {
      if (line.startTime && line.state === LineState.ACTIVE) {
        line.duration = Math.floor((now - line.startTime.getTime()) / 1000)
      }
    }
  }

  /**
   * Reset all lines to idle state
   */
  reset(): void {
    // End all conferences
    for (const conferenceId of this.conferences.keys()) {
      this.endConference(conferenceId)
    }

    // Clear all park slots
    this.parkSlots.clear()

    // Reset all lines
    for (const lineId of this.lines.keys()) {
      this.releaseCall(lineId)
    }

    this.activeLine = this.config.defaultLine
    this.callCounter = 0
  }
}
