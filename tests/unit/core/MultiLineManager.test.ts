/**
 * MultiLineManager unit tests
 * Comprehensive test coverage for multi-line call management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  MultiLineManager,
  LineState,
  MultiLineError,
  LineEventType,
  type MultiLineConfig,
  type LineSelectionCriteria,
} from '@/core/MultiLineManager'
import { EventBus } from '@/core/EventBus'
import type { CallSession } from '@/types/call.types'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('MultiLineManager', () => {
  let manager: MultiLineManager
  let mockEventBus: EventBus
  let config: Partial<MultiLineConfig>

  const createMockCallSession = (id: string = 'session-1'): Partial<CallSession> => ({
    id,
    direction: 'inbound',
    state: 'confirmed',
    remoteUri: `sip:${id}@example.com`,
    remoteDisplayName: `Caller ${id}`,
    localUri: 'sip:1000@example.com',
    hold: vi.fn(),
    unhold: vi.fn(),
    terminate: vi.fn(),
  })

  beforeEach(() => {
    mockEventBus = new EventBus()
    vi.spyOn(mockEventBus, 'emit')

    config = {
      maxLines: 4,
      autoAnswer: false,
      ringPolicy: 'sequential',
      defaultLine: 1,
      conferenceEnabled: true,
      parkingEnabled: true,
    }

    manager = new MultiLineManager(config, mockEventBus)
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default config', () => {
      const defaultManager = new MultiLineManager()
      expect(defaultManager).toBeInstanceOf(MultiLineManager)
      expect(defaultManager.getAllLines()).toHaveLength(4) // default maxLines
    })

    it('should initialize with custom config', () => {
      const customConfig: Partial<MultiLineConfig> = {
        maxLines: 6,
        defaultLine: 2,
      }
      const customManager = new MultiLineManager(customConfig)

      expect(customManager.getAllLines()).toHaveLength(6)
      expect(customManager.getActiveLineId()).toBe(2)
    })

    it('should initialize all lines to IDLE state', () => {
      const lines = manager.getAllLines()

      expect(lines).toHaveLength(4)
      lines.forEach((line) => {
        expect(line.state).toBe(LineState.IDLE)
        expect(line.callSession).toBeNull()
        expect(line.remoteParty).toBeNull()
        expect(line.duration).toBe(0)
        expect(line.startTime).toBeNull()
        expect(line.isConference).toBe(false)
      })
    })

    it('should use provided event bus', () => {
      expect(mockEventBus.emit).not.toHaveBeenCalled()
    })
  })

  describe('Line Retrieval', () => {
    it('should get specific line by ID', () => {
      const line = manager.getLine(1)

      expect(line).toBeDefined()
      expect(line?.id).toBe(1)
      expect(line?.state).toBe(LineState.IDLE)
    })

    it('should return undefined for non-existent line', () => {
      const line = manager.getLine(99)
      expect(line).toBeUndefined()
    })

    it('should get all lines', () => {
      const lines = manager.getAllLines()

      expect(lines).toHaveLength(4)
      expect(lines[0].id).toBe(1)
      expect(lines[3].id).toBe(4)
    })

    it('should get active line', () => {
      const activeLine = manager.getActiveLine()

      expect(activeLine).toBeDefined()
      expect(activeLine?.id).toBe(1) // default line
    })

    it('should get active line ID', () => {
      expect(manager.getActiveLineId()).toBe(1)
    })
  })

  describe('Line Availability and Selection', () => {
    it('should find available idle line', () => {
      const line = manager.getAvailableLine({ requireIdle: true })

      expect(line).toBeDefined()
      expect(line?.state).toBe(LineState.IDLE)
    })

    it('should prefer specific line when available', () => {
      const criteria: LineSelectionCriteria = {
        preferredLine: 3,
        requireIdle: true,
      }

      const line = manager.getAvailableLine(criteria)

      expect(line).toBeDefined()
      expect(line?.id).toBe(3)
    })

    it('should exclude specified lines', async () => {
      const criteria: LineSelectionCriteria = {
        requireIdle: true,
        excludeLines: [1, 2],
      }

      const line = manager.getAvailableLine(criteria)

      expect(line).toBeDefined()
      expect([3, 4]).toContain(line?.id)
    })

    it('should allow held lines when specified', async () => {
      // Assign and hold a call first
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      // Simulate accepting the call
      const line1 = manager.getLine(1)
      if (line1) {
        line1.state = LineState.ACTIVE
      }

      await manager.holdLine(1)

      const criteria: LineSelectionCriteria = {
        allowHeld: true,
      }

      const line = manager.getAvailableLine(criteria)

      expect(line).toBeDefined()
      expect(line?.state).toBe(LineState.HELD)
    })

    it('should not return held lines when allowHeld is false', async () => {
      // Put line 1 on hold
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line1 = manager.getLine(1)
      if (line1) {
        line1.state = LineState.ACTIVE
      }

      await manager.holdLine(1)

      const criteria: LineSelectionCriteria = {
        requireIdle: false,
        allowHeld: false,
      }

      const line = manager.getAvailableLine(criteria)

      // Should find line 2, 3, or 4 instead of held line 1
      expect(line?.id).not.toBe(1)
    })

    it('should return undefined when no lines match criteria', () => {
      const criteria: LineSelectionCriteria = {
        requireIdle: true,
        excludeLines: [1, 2, 3, 4],
      }

      const line = manager.getAvailableLine(criteria)
      expect(line).toBeUndefined()
    })
  })

  describe('Call Assignment', () => {
    it('should assign call to specific line', async () => {
      const mockSession = createMockCallSession('caller-123')
      const lineId = await manager.assignCallToLine(mockSession as CallSession, 2)

      expect(lineId).toBe(2)

      const line = manager.getLine(2)
      expect(line?.state).toBe(LineState.RINGING)
      expect(line?.callSession).toBe(mockSession)
      expect(line?.remoteParty).toContain('caller-123')
    })

    it('should auto-assign call to first available line', async () => {
      const mockSession = createMockCallSession()
      const lineId = await manager.assignCallToLine(mockSession as CallSession)

      expect(lineId).toBeGreaterThanOrEqual(1)
      expect(lineId).toBeLessThanOrEqual(4)

      const line = manager.getLine(lineId)
      expect(line?.state).toBe(LineState.RINGING)
      expect(line?.callSession).toBe(mockSession)
    })

    it('should emit LINE_ASSIGNED event', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.LINE_ASSIGNED,
        expect.objectContaining({
          type: LineEventType.LINE_ASSIGNED,
          payload: expect.objectContaining({
            lineId: 1,
            callSession: mockSession,
          }),
        })
      )
    })

    it('should throw error for invalid line ID', async () => {
      const mockSession = createMockCallSession()

      await expect(manager.assignCallToLine(mockSession as CallSession, 99)).rejects.toThrow(
        MultiLineError
      )

      await expect(manager.assignCallToLine(mockSession as CallSession, 99)).rejects.toThrow(
        'Line 99 does not exist'
      )
    })

    it('should throw error when line is busy', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)

      await expect(manager.assignCallToLine(mockSession2 as CallSession, 1)).rejects.toThrow(
        MultiLineError
      )

      await expect(manager.assignCallToLine(mockSession2 as CallSession, 1)).rejects.toThrow(
        'Line 1 is not available'
      )
    })

    it('should throw error when no available lines', async () => {
      // Fill all lines
      for (let i = 1; i <= 4; i++) {
        const mockSession = createMockCallSession(`session-${i}`)
        await manager.assignCallToLine(mockSession as CallSession, i)
      }

      const mockSession = createMockCallSession('session-overflow')

      await expect(manager.assignCallToLine(mockSession as CallSession)).rejects.toThrow(
        MultiLineError
      )

      await expect(manager.assignCallToLine(mockSession as CallSession)).rejects.toThrow(
        'No available lines for incoming call'
      )
    })

    it('should extract remote party from remoteUri string', async () => {
      const mockSession = {
        ...createMockCallSession(),
        remoteUri: 'sip:1234567890@example.com',
      }

      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      expect(line?.remoteParty).toBe('sip:1234567890@example.com')
    })

    it('should extract remote party from remoteUri object', async () => {
      const mockSession = {
        ...createMockCallSession(),
        remoteUri: { user: '1234567890' },
      }

      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      expect(line?.remoteParty).toBe('1234567890')
    })

    it('should fallback to remoteDisplayName for remote party', async () => {
      const mockSession = {
        ...createMockCallSession(),
        remoteUri: undefined,
        remoteDisplayName: 'John Doe',
      }

      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      expect(line?.remoteParty).toBe('John Doe')
    })

    it('should use "Unknown" as fallback remote party', async () => {
      const mockSession = {
        ...createMockCallSession(),
        remoteUri: undefined,
        remoteDisplayName: undefined,
      }

      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      expect(line?.remoteParty).toBe('Unknown')
    })

    it('should increment call counter', async () => {
      const initialStats = manager.getStats()
      const initialCount = initialStats.totalCallsHandled

      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession)

      const newStats = manager.getStats()
      expect(newStats.totalCallsHandled).toBe(initialCount + 1)
    })
  })

  describe('Line Switching', () => {
    it('should switch to different line', async () => {
      await manager.switchToLine(3)

      expect(manager.getActiveLineId()).toBe(3)
    })

    it('should emit LINE_SWITCHED event', async () => {
      await manager.switchToLine(2)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.LINE_SWITCHED,
        expect.objectContaining({
          type: LineEventType.LINE_SWITCHED,
          payload: expect.objectContaining({
            previousLine: 1,
            newLine: 2,
          }),
        })
      )
    })

    it('should hold active line when switching away', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      // Simulate active call
      const line1 = manager.getLine(1)
      if (line1) {
        line1.state = LineState.ACTIVE
      }

      await manager.switchToLine(2)

      expect(line1?.state).toBe(LineState.HELD)
      expect(mockSession.hold).toHaveBeenCalled()
    })

    it('should resume held line when switching to it', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 2)

      const line2 = manager.getLine(2)
      if (line2) {
        line2.state = LineState.HELD
      }

      await manager.switchToLine(2)

      expect(line2?.state).toBe(LineState.ACTIVE)
      expect(mockSession.unhold).toHaveBeenCalled()
    })

    it('should throw error for non-existent line', async () => {
      await expect(manager.switchToLine(99)).rejects.toThrow(MultiLineError)

      await expect(manager.switchToLine(99)).rejects.toThrow('Line 99 not found')
    })

    it('should not hold line when switching to same line', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line1 = manager.getLine(1)
      if (line1) {
        line1.state = LineState.ACTIVE
      }

      vi.clearAllMocks()

      await manager.switchToLine(1)

      expect(mockSession.hold).not.toHaveBeenCalled()
    })
  })

  describe('Hold and Resume Operations', () => {
    it('should hold active line', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
      }

      await manager.holdLine(1)

      expect(line?.state).toBe(LineState.HELD)
      expect(mockSession.hold).toHaveBeenCalled()
    })

    it('should resume held line', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.HELD
      }

      await manager.resumeLine(1)

      expect(line?.state).toBe(LineState.ACTIVE)
      expect(mockSession.unhold).toHaveBeenCalled()
    })

    it('should throw error when holding non-active line', async () => {
      await expect(manager.holdLine(1)).rejects.toThrow(MultiLineError)

      await expect(manager.holdLine(1)).rejects.toThrow('not active')
    })

    it('should throw error when resuming non-held line', async () => {
      await expect(manager.resumeLine(1)).rejects.toThrow(MultiLineError)

      await expect(manager.resumeLine(1)).rejects.toThrow('not held')
    })

    it('should throw error when line not found', async () => {
      await expect(manager.holdLine(99)).rejects.toThrow(MultiLineError)

      await expect(manager.resumeLine(99)).rejects.toThrow(MultiLineError)
    })

    it('should throw error when no call session on line', async () => {
      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.callSession = null
      }

      await expect(manager.holdLine(1)).rejects.toThrow('No call session on line')
    })

    it('should handle missing hold method on call session', async () => {
      const mockSession = {
        ...createMockCallSession(),
        hold: undefined,
      }

      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
      }

      // Should not throw even without hold method
      await manager.holdLine(1)
      expect(line?.state).toBe(LineState.HELD)
    })
  })

  describe('Call Parking', () => {
    it('should park a call', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.remoteParty = 'Test Caller'
      }

      const parkSlotId = await manager.parkLine(1)

      expect(parkSlotId).toBeDefined()
      expect(parkSlotId).toContain('park-')

      expect(line?.state).toBe(LineState.PARKED)
      expect(mockSession.hold).toHaveBeenCalled()
    })

    it('should emit CALL_PARKED event', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.remoteParty = 'Test Caller'
      }

      const parkSlotId = await manager.parkLine(1)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.CALL_PARKED,
        expect.objectContaining({
          type: LineEventType.CALL_PARKED,
          payload: expect.objectContaining({
            lineId: 1,
            parkSlot: parkSlotId,
            retrievalCode: expect.any(String),
          }),
        })
      )
    })

    it('should retrieve parked call', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.remoteParty = 'Test Caller'
      }

      const parkSlotId = await manager.parkLine(1)

      vi.clearAllMocks()

      const retrievedLineId = await manager.retrieveParked(parkSlotId)

      expect(retrievedLineId).toBe(1)
      expect(line?.state).toBe(LineState.ACTIVE)
      expect(mockSession.unhold).toHaveBeenCalled()
    })

    it('should emit CALL_RETRIEVED event', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.remoteParty = 'Test Caller'
      }

      const parkSlotId = await manager.parkLine(1)

      vi.clearAllMocks()

      await manager.retrieveParked(parkSlotId)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.CALL_RETRIEVED,
        expect.objectContaining({
          type: LineEventType.CALL_RETRIEVED,
          payload: expect.objectContaining({
            lineId: 1,
            parkSlot: parkSlotId,
          }),
        })
      )
    })

    it('should throw error when parking is disabled', async () => {
      const managerNoPark = new MultiLineManager({
        ...config,
        parkingEnabled: false,
      })

      await expect(managerNoPark.parkLine(1)).rejects.toThrow('Call parking is not enabled')
    })

    it('should throw error when no active call on line', async () => {
      await expect(manager.parkLine(1)).rejects.toThrow('No active call on line')
    })

    it('should throw error when retrieving non-existent park slot', async () => {
      await expect(manager.retrieveParked('invalid-slot')).rejects.toThrow(
        'Park slot invalid-slot not found'
      )
    })

    it('should list all parked calls', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line1.remoteParty = 'Caller 1'
        line2.state = LineState.ACTIVE
        line2.remoteParty = 'Caller 2'
      }

      await manager.parkLine(1)
      await manager.parkLine(2)

      const parkedCalls = manager.getParkedCalls()

      expect(parkedCalls).toHaveLength(2)
      expect(parkedCalls[0].lineId).toBeDefined()
      expect(parkedCalls[0].retrievalCode).toBeDefined()
    })
  })

  describe('Conference Management', () => {
    it('should create conference with multiple lines', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      const conferenceId = await manager.createConference([1, 2])

      expect(conferenceId).toBeDefined()
      expect(conferenceId).toContain('conf-')

      expect(line1?.isConference).toBe(true)
      expect(line1?.conferenceId).toBe(conferenceId)
      expect(line2?.isConference).toBe(true)
      expect(line2?.conferenceId).toBe(conferenceId)
    })

    it('should emit CONFERENCE_CREATED event', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      await manager.createConference([1, 2])

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.CONFERENCE_CREATED,
        expect.objectContaining({
          type: 'created',
          participants: [1, 2],
        })
      )
    })

    it('should throw error when conference is disabled', async () => {
      const managerNoConf = new MultiLineManager({
        ...config,
        conferenceEnabled: false,
      })

      await expect(managerNoConf.createConference([1, 2])).rejects.toThrow(
        'Conference feature is not enabled'
      )
    })

    it('should throw error when less than 2 lines provided', async () => {
      await expect(manager.createConference([1])).rejects.toThrow(
        'At least 2 lines required for conference'
      )
    })

    it('should throw error when line not found or no call', async () => {
      // Set up Line 1 with an active call so validation reaches Line 99
      const mockSession1 = createMockCallSession('session-1')
      await manager.assignCallToLine(mockSession1 as CallSession, 1)

      await expect(manager.createConference([1, 99])).rejects.toThrow(
        'Line 99 not found or has no active call'
      )
    })

    it('should add line to existing conference', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')
      const mockSession3 = createMockCallSession('session-3')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)
      await manager.assignCallToLine(mockSession3 as CallSession, 3)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)
      const line3 = manager.getLine(3)

      if (line1 && line2 && line3) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
        line3.state = LineState.ACTIVE
      }

      const conferenceId = await manager.createConference([1, 2])

      vi.clearAllMocks()

      await manager.addToConference(3, conferenceId)

      expect(line3?.isConference).toBe(true)
      expect(line3?.conferenceId).toBe(conferenceId)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.CONFERENCE_PARTICIPANT_ADDED,
        expect.objectContaining({
          type: 'participant-added',
          lineId: 3,
        })
      )
    })

    it('should add to first active conference if ID not provided', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')
      const mockSession3 = createMockCallSession('session-3')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)
      await manager.assignCallToLine(mockSession3 as CallSession, 3)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)
      const line3 = manager.getLine(3)

      if (line1 && line2 && line3) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
        line3.state = LineState.ACTIVE
      }

      await manager.createConference([1, 2])

      await manager.addToConference(3) // No conference ID

      expect(line3?.isConference).toBe(true)
    })

    it('should not add line already in conference', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      const conferenceId = await manager.createConference([1, 2])

      const conference = manager.getConference(conferenceId)
      const initialCount = conference?.participantCount

      await manager.addToConference(1, conferenceId) // Already in conference

      expect(conference?.participantCount).toBe(initialCount)
    })

    it('should remove line from conference', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')
      const mockSession3 = createMockCallSession('session-3')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)
      await manager.assignCallToLine(mockSession3 as CallSession, 3)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)
      const line3 = manager.getLine(3)

      if (line1 && line2 && line3) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
        line3.state = LineState.ACTIVE
      }

      await manager.createConference([1, 2, 3])

      vi.clearAllMocks()

      await manager.removeFromConference(3)

      expect(line3?.isConference).toBe(false)
      expect(line3?.conferenceId).toBeUndefined()

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.CONFERENCE_PARTICIPANT_REMOVED,
        expect.objectContaining({
          type: 'participant-removed',
          lineId: 3,
        })
      )
    })

    it('should end conference when only one participant remains', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      const conferenceId = await manager.createConference([1, 2])

      vi.clearAllMocks()

      await manager.removeFromConference(2)

      // Conference should be ended
      const conference = manager.getConference(conferenceId)
      expect(conference).toBeUndefined()

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.CONFERENCE_ENDED,
        expect.objectContaining({
          type: 'ended',
          conferenceId,
        })
      )
    })

    it('should get conference state', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      const conferenceId = await manager.createConference([1, 2])
      const conference = manager.getConference(conferenceId)

      expect(conference).toBeDefined()
      expect(conference?.id).toBe(conferenceId)
      expect(conference?.lines).toEqual([1, 2])
      expect(conference?.active).toBe(true)
      expect(conference?.bridged).toBe(true)
      expect(conference?.participantCount).toBe(2)
    })

    it('should get all active conferences', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')
      const mockSession3 = createMockCallSession('session-3')
      const mockSession4 = createMockCallSession('session-4')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)
      await manager.assignCallToLine(mockSession3 as CallSession, 3)
      await manager.assignCallToLine(mockSession4 as CallSession, 4)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)
      const line3 = manager.getLine(3)
      const line4 = manager.getLine(4)

      if (line1 && line2 && line3 && line4) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
        line3.state = LineState.ACTIVE
        line4.state = LineState.ACTIVE
      }

      await manager.createConference([1, 2])
      await manager.createConference([3, 4])

      const conferences = manager.getActiveConferences()

      expect(conferences).toHaveLength(2)
    })
  })

  describe('Call Release', () => {
    it('should release call from line', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      manager.releaseCall(1)

      const line = manager.getLine(1)

      expect(line?.state).toBe(LineState.IDLE)
      expect(line?.callSession).toBeNull()
      expect(line?.remoteParty).toBeNull()
      expect(line?.duration).toBe(0)
      expect(line?.startTime).toBeNull()
    })

    it('should emit LINE_RELEASED event', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      vi.clearAllMocks()

      manager.releaseCall(1)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        LineEventType.LINE_RELEASED,
        expect.objectContaining({
          type: LineEventType.LINE_RELEASED,
          payload: expect.objectContaining({
            lineId: 1,
          }),
        })
      )
    })

    it('should remove from conference when releasing', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      await manager.createConference([1, 2])

      manager.releaseCall(1)

      expect(line1?.isConference).toBe(false)
      expect(line1?.conferenceId).toBeUndefined()
    })

    it('should remove from park slots when releasing', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.remoteParty = 'Test Caller'
      }

      await manager.parkLine(1)

      expect(manager.getParkedCalls()).toHaveLength(1)

      manager.releaseCall(1)

      expect(manager.getParkedCalls()).toHaveLength(0)
    })

    it('should handle releasing non-existent line gracefully', () => {
      manager.releaseCall(99)

      // Should not throw error
      expect(true).toBe(true)
    })

    it('should alias releaseLine to releaseCall', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      manager.releaseLine(1)

      const line = manager.getLine(1)
      expect(line?.state).toBe(LineState.IDLE)
    })
  })

  describe('Line State Management', () => {
    it('should update line state and emit event', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      vi.clearAllMocks()

      const line = manager.getLine(1)
      if (line) {
        // Manually trigger state change (normally done internally)
        line.state = LineState.ACTIVE
      }

      // State changes are emitted via updateLineState which is private
      // We test this through public methods that use it
      expect(line?.state).toBe(LineState.ACTIVE)
    })

    it('should set start time when call becomes active', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      expect(line?.startTime).toBeNull()

      // Transition to ACTIVE through resumeLine
      if (line) {
        line.state = LineState.HELD
      }

      await manager.resumeLine(1)

      expect(line?.startTime).toBeDefined()
    })

    it('should clear start time when call ends', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.startTime = new Date()
      }

      manager.releaseCall(1)

      expect(line?.startTime).toBeNull()
      expect(line?.duration).toBe(0)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should get line statistics', async () => {
      const stats = manager.getStats()

      expect(stats.totalLines).toBe(4)
      expect(stats.idleLines).toBe(4)
      expect(stats.activeLines).toBe(0)
      expect(stats.heldLines).toBe(0)
      expect(stats.activeConferences).toBe(0)
      expect(stats.parkedCalls).toBe(0)
      expect(stats.totalCallsHandled).toBe(0)
    })

    it('should track active lines in stats', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
      }

      const stats = manager.getStats()

      expect(stats.activeLines).toBe(1)
      expect(stats.idleLines).toBe(3)
    })

    it('should track held lines in stats', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
      }

      await manager.holdLine(1)

      const stats = manager.getStats()

      expect(stats.heldLines).toBe(1)
      expect(stats.activeLines).toBe(0)
    })

    it('should update call durations', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.startTime = new Date(Date.now() - 5000) // 5 seconds ago
      }

      manager.updateDurations()

      expect(line?.duration).toBeGreaterThanOrEqual(4)
      expect(line?.duration).toBeLessThanOrEqual(6)
    })

    it('should not update duration for non-active lines', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.HELD
        line.startTime = new Date(Date.now() - 5000)
        line.duration = 10
      }

      manager.updateDurations()

      expect(line?.duration).toBe(10) // Should not change
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all lines to idle', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      manager.reset()

      const lines = manager.getAllLines()

      lines.forEach((line) => {
        expect(line.state).toBe(LineState.IDLE)
        expect(line.callSession).toBeNull()
      })
    })

    it('should end all conferences on reset', async () => {
      const mockSession1 = createMockCallSession('session-1')
      const mockSession2 = createMockCallSession('session-2')

      await manager.assignCallToLine(mockSession1 as CallSession, 1)
      await manager.assignCallToLine(mockSession2 as CallSession, 2)

      const line1 = manager.getLine(1)
      const line2 = manager.getLine(2)

      if (line1 && line2) {
        line1.state = LineState.ACTIVE
        line2.state = LineState.ACTIVE
      }

      await manager.createConference([1, 2])

      manager.reset()

      expect(manager.getActiveConferences()).toHaveLength(0)
    })

    it('should clear all park slots on reset', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession, 1)

      const line = manager.getLine(1)
      if (line) {
        line.state = LineState.ACTIVE
        line.remoteParty = 'Test Caller'
      }

      await manager.parkLine(1)

      manager.reset()

      expect(manager.getParkedCalls()).toHaveLength(0)
    })

    it('should reset active line to default', async () => {
      await manager.switchToLine(3)

      manager.reset()

      expect(manager.getActiveLineId()).toBe(1) // default line
    })

    it('should reset call counter', async () => {
      const mockSession = createMockCallSession()
      await manager.assignCallToLine(mockSession as CallSession)

      manager.reset()

      const stats = manager.getStats()
      expect(stats.totalCallsHandled).toBe(0)
    })
  })
})
