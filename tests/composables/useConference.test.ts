/**
 * Tests for useConference composable
 * @module tests/composables/useConference.test
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useConference } from '@/composables/useConference'
import {
  ConferenceState,
  ParticipantState,
  type Participant,
  type ConferenceOptions,
} from '@/types/conference.types'
import type { SipClient } from '@/core/SipClient'

// Create a mock SipClient
function createMockSipClient(overrides: Partial<SipClient> = {}): SipClient {
  return {
    getConfig: vi.fn().mockReturnValue({
      uri: 'sip:test@example.com',
      displayName: 'Test User',
    }),
    createConference: vi.fn().mockResolvedValue(undefined),
    joinConference: vi.fn().mockResolvedValue(undefined),
    inviteToConference: vi.fn().mockResolvedValue(undefined),
    removeFromConference: vi.fn().mockResolvedValue(undefined),
    muteAudio: vi.fn().mockResolvedValue(undefined),
    unmuteAudio: vi.fn().mockResolvedValue(undefined),
    muteParticipant: vi.fn().mockResolvedValue(undefined),
    unmuteParticipant: vi.fn().mockResolvedValue(undefined),
    endConference: vi.fn().mockResolvedValue(undefined),
    startConferenceRecording: vi.fn().mockResolvedValue(undefined),
    stopConferenceRecording: vi.fn().mockResolvedValue(undefined),
    getConferenceAudioLevels: vi.fn().mockReturnValue(new Map()),
    ...overrides,
  } as unknown as SipClient
}

// Helper to create a mock participant
function createParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'part-1',
    uri: 'sip:participant@example.com',
    displayName: 'Participant',
    state: ParticipantState.Connected,
    isMuted: false,
    isOnHold: false,
    isModerator: false,
    isSelf: false,
    audioLevel: 0,
    joinedAt: new Date(),
    ...overrides,
  }
}

describe('useConference', () => {
  let sipClient: ReturnType<typeof ref<SipClient | null>>

  beforeEach(() => {
    vi.clearAllMocks()
    sipClient = ref<SipClient | null>(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with null conference and Idle state', () => {
      const { conference, state, participants, participantCount, isActive, isLocked, isRecording } =
        useConference(sipClient)

      expect(conference.value).toBeNull()
      expect(state.value).toBe(ConferenceState.Idle)
      expect(participants.value).toEqual([])
      expect(participantCount.value).toBe(0)
      expect(isActive.value).toBe(false)
      expect(isLocked.value).toBe(false)
      expect(isRecording.value).toBe(false)
    })

    it('should have null localParticipant when no conference', () => {
      const { localParticipant } = useConference(sipClient)
      expect(localParticipant.value).toBeNull()
    })

    it('should return all methods defined', () => {
      const result = useConference(sipClient)
      expect(typeof result.createConference).toBe('function')
      expect(typeof result.joinConference).toBe('function')
      expect(typeof result.addParticipant).toBe('function')
      expect(typeof result.removeParticipant).toBe('function')
      expect(typeof result.muteParticipant).toBe('function')
      expect(typeof result.unmuteParticipant).toBe('function')
      expect(typeof result.endConference).toBe('function')
      expect(typeof result.lockConference).toBe('function')
      expect(typeof result.unlockConference).toBe('function')
      expect(typeof result.startRecording).toBe('function')
      expect(typeof result.stopRecording).toBe('function')
      expect(typeof result.getParticipant).toBe('function')
      expect(typeof result.onConferenceEvent).toBe('function')
    })
  })

  describe('createConference', () => {
    it('should throw when SIP client not initialized', async () => {
      const { createConference } = useConference(sipClient)
      await expect(createConference()).rejects.toThrow('SIP client not initialized')
    })

    it('should throw when conference already active', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference, conference } = useConference(sipClient)

      // Simulate existing active conference
      conference.value = {
        id: 'existing',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await expect(createConference()).rejects.toThrow('A conference is already active')
    })

    it('should throw when maxParticipants less than 1', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference } = useConference(sipClient)

      await expect(createConference({ maxParticipants: 0 })).rejects.toThrow(
        'maxParticipants must be at least 1'
      )

      await expect(createConference({ maxParticipants: -1 })).rejects.toThrow(
        'maxParticipants must be at least 1'
      )
    })

    it('should throw when maxParticipants exceeds 1000', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference } = useConference(sipClient)

      await expect(createConference({ maxParticipants: 1001 })).rejects.toThrow(
        'maxParticipants cannot exceed 1000'
      )
    })

    it('should create conference with default options', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference, conference, state, isActive, participantCount } =
        useConference(sipClient)

      const conferenceId = await createConference()

      expect(conferenceId).toMatch(/^conf-/)
      expect(conference.value).not.toBeNull()
      expect(conference.value!.id).toBe(conferenceId)
      expect(state.value).toBe(ConferenceState.Active)
      expect(isActive.value).toBe(true)
      expect(participantCount.value).toBe(1) // Local participant
      expect(mockClient.createConference).toHaveBeenCalledWith(conferenceId, {})
    })

    it('should create conference with custom options', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference, conference } = useConference(sipClient)

      const options: ConferenceOptions = {
        maxParticipants: 20,
        locked: true,
        metadata: { topic: 'Test Meeting' },
      }

      await createConference(options)

      expect(conference.value!.maxParticipants).toBe(20)
      expect(conference.value!.isLocked).toBe(true)
      expect(conference.value!.metadata).toEqual({ topic: 'Test Meeting' })
    })

    it('should set local participant as moderator', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference, localParticipant } = useConference(sipClient)

      await createConference()

      expect(localParticipant.value).not.toBeNull()
      expect(localParticipant.value!.isSelf).toBe(true)
      expect(localParticipant.value!.isModerator).toBe(true)
      expect(localParticipant.value!.uri).toBe('sip:test@example.com')
      expect(localParticipant.value!.displayName).toBe('Test User')
    })

    it('should emit created event', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { createConference, onConferenceEvent } = useConference(sipClient)
      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await createConference()

      expect(eventHandler).toHaveBeenCalled()
      const createdEvent = eventHandler.mock.calls.find((call: any[]) => call[0].type === 'created')
      expect(createdEvent).toBeDefined()
      expect(createdEvent![0].state).toBe(ConferenceState.Active)
    })

    it('should transition to Failed on error', async () => {
      const mockClient = createMockSipClient({
        createConference: vi.fn().mockRejectedValue(new Error('Server error')),
      })
      sipClient.value = mockClient

      const { createConference, state } = useConference(sipClient)

      await expect(createConference()).rejects.toThrow('Server error')
      expect(state.value).toBe(ConferenceState.Failed)
    })
  })

  describe('joinConference', () => {
    it('should throw when SIP client not initialized', async () => {
      const { joinConference } = useConference(sipClient)
      await expect(joinConference('sip:conf@example.com')).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should throw on invalid conference URI', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { joinConference } = useConference(sipClient)

      await expect(joinConference('invalid-uri')).rejects.toThrow('Invalid conference URI')
    })

    it('should throw when maxParticipants out of range', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { joinConference } = useConference(sipClient)

      await expect(joinConference('sip:conf@example.com', { maxParticipants: 0 })).rejects.toThrow(
        'maxParticipants must be at least 1'
      )

      await expect(
        joinConference('sip:conf@example.com', { maxParticipants: 1001 })
      ).rejects.toThrow('maxParticipants cannot exceed 1000')
    })

    it('should join conference successfully', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { joinConference, conference, state, isActive } = useConference(sipClient)

      await joinConference('sip:conf-room@example.com')

      expect(conference.value).not.toBeNull()
      expect(conference.value!.uri).toBe('sip:conf-room@example.com')
      expect(state.value).toBe(ConferenceState.Active)
      expect(isActive.value).toBe(true)
      expect(mockClient.joinConference).toHaveBeenCalledWith('sip:conf-room@example.com', {})
    })
  })

  describe('addParticipant', () => {
    it('should throw when no active conference', async () => {
      const { addParticipant } = useConference(sipClient)
      await expect(addParticipant('sip:user@example.com')).rejects.toThrow('No active conference')
    })

    it('should throw when conference is locked', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { addParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: true,
        isRecording: false,
      }

      await expect(addParticipant('sip:user@example.com')).rejects.toThrow('Conference is locked')
    })

    it('should throw when conference is full', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { addParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['local', createParticipant({ id: 'local', isSelf: true })]]),
        maxParticipants: 1,
        isLocked: false,
        isRecording: false,
      }

      await expect(addParticipant('sip:user@example.com')).rejects.toThrow('Conference is full')
    })

    it('should throw on invalid participant URI', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { addParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        maxParticipants: 10,
        isLocked: false,
        isRecording: false,
      }

      await expect(addParticipant('bad-uri')).rejects.toThrow('Invalid participant URI')
    })

    it('should add participant successfully', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { addParticipant, conference, participants, participantCount } =
        useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        maxParticipants: 10,
        isLocked: false,
        isRecording: false,
      }

      const participantId = await addParticipant('sip:alice@example.com', 'Alice')

      expect(participantId).toMatch(/^part-/)
      expect(participants.value.length).toBe(1)
      expect(participants.value[0].uri).toBe('sip:alice@example.com')
      expect(participants.value[0].displayName).toBe('Alice')
      expect(participants.value[0].state).toBe(ParticipantState.Connected)
      expect(participantCount.value).toBe(1)
      expect(mockClient.inviteToConference).toHaveBeenCalled()
    })

    it('should emit participant:joined event', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { addParticipant, conference, onConferenceEvent } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        maxParticipants: 10,
        isLocked: false,
        isRecording: false,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await addParticipant('sip:alice@example.com', 'Alice')

      const joinEvent = eventHandler.mock.calls.find(
        (call: any[]) => call[0].type === 'participant:joined'
      )
      expect(joinEvent).toBeDefined()
      expect(joinEvent![0].participant.uri).toBe('sip:alice@example.com')
    })
  })

  describe('removeParticipant', () => {
    it('should throw when no active conference', async () => {
      const { removeParticipant } = useConference(sipClient)
      await expect(removeParticipant('part-1')).rejects.toThrow('No active conference')
    })

    it('should throw when participant not found', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { removeParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await expect(removeParticipant('nonexistent')).rejects.toThrow(
        'Participant nonexistent not found'
      )
    })

    it('should throw when trying to remove self', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { removeParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['self', createParticipant({ id: 'self', isSelf: true })]]),
        isLocked: false,
        isRecording: false,
      }

      await expect(removeParticipant('self')).rejects.toThrow(
        'Cannot remove yourself, use endConference() instead'
      )
    })

    it('should remove participant successfully', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { removeParticipant, conference, participants } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1' })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      await removeParticipant('part-1')

      expect(participants.value.length).toBe(0)
      expect(mockClient.removeFromConference).toHaveBeenCalledWith('conf-1', participant.uri)
    })

    it('should emit participant:left event with reason', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { removeParticipant, conference, onConferenceEvent } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1' })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await removeParticipant('part-1', 'Violation of terms')

      const leftEvent = eventHandler.mock.calls.find(
        (call: any[]) => call[0].type === 'participant:left'
      )
      expect(leftEvent).toBeDefined()
      expect(leftEvent![0].reason).toBe('Violation of terms')
    })
  })

  describe('muteParticipant', () => {
    it('should throw when no active conference', async () => {
      const { muteParticipant } = useConference(sipClient)
      await expect(muteParticipant('part-1')).rejects.toThrow('No active conference')
    })

    it('should throw when participant not found', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { muteParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await expect(muteParticipant('nonexistent')).rejects.toThrow(
        'Participant nonexistent not found'
      )
    })

    it('should be idempotent when participant already muted', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { muteParticipant, conference } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1', isMuted: true })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      await expect(muteParticipant('part-1')).resolves.toBeUndefined()
      expect(mockClient.muteAudio).not.toHaveBeenCalled()
    })

    it('should mute self and call muteAudio', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { muteParticipant, conference } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1', isSelf: true, isMuted: false })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      await muteParticipant('part-1')

      expect(participant.isMuted).toBe(true)
      expect(mockClient.muteAudio).toHaveBeenCalled()
    })

    it('should mute other participant and call muteParticipant on client', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { muteParticipant, conference } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1', isSelf: false, isMuted: false })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      await muteParticipant('part-1')

      expect(participant.isMuted).toBe(true)
      expect(mockClient.muteParticipant).toHaveBeenCalledWith('conf-1', participant.uri)
    })
  })

  describe('unmuteParticipant', () => {
    it('should throw when no active conference', async () => {
      const { unmuteParticipant } = useConference(sipClient)
      await expect(unmuteParticipant('part-1')).rejects.toThrow('No active conference')
    })

    it('should throw when participant not found', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { unmuteParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await expect(unmuteParticipant('nonexistent')).rejects.toThrow(
        'Participant nonexistent not found'
      )
    })

    it('should be idempotent when participant not muted', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { unmuteParticipant, conference } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1', isMuted: false })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      await expect(unmuteParticipant('part-1')).resolves.toBeUndefined()
      expect(mockClient.unmuteAudio).not.toHaveBeenCalled()
    })

    it('should unmute self and call unmuteAudio', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { unmuteParticipant, conference } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1', isSelf: true, isMuted: true })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      await unmuteParticipant('part-1')

      expect(participant.isMuted).toBe(false)
      expect(mockClient.unmuteAudio).toHaveBeenCalled()
    })
  })

  describe('endConference', () => {
    it('should throw when no active conference', async () => {
      const { endConference } = useConference(sipClient)
      await expect(endConference()).rejects.toThrow('No active conference')
    })

    it('should end conference and transition through states', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { endConference, conference, state, isActive } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await endConference()

      expect(state.value).toBe(ConferenceState.Ended)
      expect(isActive.value).toBe(false)
      expect(mockClient.endConference).toHaveBeenCalledWith('conf-1')
    })

    it('should emit state:changed events', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { endConference, conference, onConferenceEvent } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await endConference()

      const stateChanges = eventHandler.mock.calls.filter(
        (call: any[]) => call[0].type === 'state:changed'
      )
      expect(stateChanges.length).toBeGreaterThanOrEqual(2)
      expect(stateChanges.map((c: any[]) => c[0].state)).toContain(ConferenceState.Ending)
      expect(stateChanges.map((c: any[]) => c[0].state)).toContain(ConferenceState.Ended)
    })
  })

  describe('lockConference', () => {
    it('should throw when no active conference', async () => {
      const { lockConference } = useConference(sipClient)
      await expect(lockConference()).rejects.toThrow('No active conference')
    })

    it('should be idempotent when already locked', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { lockConference, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: true,
        isRecording: false,
      }

      await expect(lockConference()).resolves.toBeUndefined()
    })

    it('should lock conference and emit locked event', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { lockConference, conference, isLocked, onConferenceEvent } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await lockConference()

      expect(isLocked.value).toBe(true)
      const lockedEvent = eventHandler.mock.calls.find((call: any[]) => call[0].type === 'locked')
      expect(lockedEvent).toBeDefined()
    })
  })

  describe('unlockConference', () => {
    it('should throw when no active conference', async () => {
      const { unlockConference } = useConference(sipClient)
      await expect(unlockConference()).rejects.toThrow('No active conference')
    })

    it('should be idempotent when already unlocked', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { unlockConference, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await expect(unlockConference()).resolves.toBeUndefined()
    })

    it('should unlock conference and emit unlocked event', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { unlockConference, conference, isLocked, onConferenceEvent } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: true,
        isRecording: false,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await unlockConference()

      expect(isLocked.value).toBe(false)
      const unlockedEvent = eventHandler.mock.calls.find(
        (call: any[]) => call[0].type === 'unlocked'
      )
      expect(unlockedEvent).toBeDefined()
    })
  })

  describe('startRecording', () => {
    it('should throw when no active conference', async () => {
      const { startRecording } = useConference(sipClient)
      await expect(startRecording()).rejects.toThrow('No active conference')
    })

    it('should be idempotent when already recording', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { startRecording, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: true,
      }

      await expect(startRecording()).resolves.toBeUndefined()
      expect(mockClient.startConferenceRecording).not.toHaveBeenCalled()
    })

    it('should start recording and emit recording:started event', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { startRecording, conference, isRecording, onConferenceEvent } =
        useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await startRecording()

      expect(isRecording.value).toBe(true)
      expect(mockClient.startConferenceRecording).toHaveBeenCalledWith('conf-1')
      const startedEvent = eventHandler.mock.calls.find(
        (call: any[]) => call[0].type === 'recording:started'
      )
      expect(startedEvent).toBeDefined()
    })
  })

  describe('stopRecording', () => {
    it('should throw when no active conference', async () => {
      const { stopRecording } = useConference(sipClient)
      await expect(stopRecording()).rejects.toThrow('No active conference')
    })

    it('should be idempotent when not recording', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { stopRecording, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await expect(stopRecording()).resolves.toBeUndefined()
      expect(mockClient.stopConferenceRecording).not.toHaveBeenCalled()
    })

    it('should stop recording and emit recording:stopped event', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { stopRecording, conference, isRecording, onConferenceEvent } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: true,
      }

      const eventHandler = vi.fn()
      onConferenceEvent(eventHandler)

      await stopRecording()

      expect(isRecording.value).toBe(false)
      expect(mockClient.stopConferenceRecording).toHaveBeenCalledWith('conf-1')
      const stoppedEvent = eventHandler.mock.calls.find(
        (call: any[]) => call[0].type === 'recording:stopped'
      )
      expect(stoppedEvent).toBeDefined()
    })
  })

  describe('getParticipant', () => {
    it('should return null when no conference', () => {
      const { getParticipant } = useConference(sipClient)
      expect(getParticipant('any')).toBeNull()
    })

    it('should return null for nonexistent participant', () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { getParticipant, conference } = useConference(sipClient)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      expect(getParticipant('nonexistent')).toBeNull()
    })

    it('should return participant by ID', () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { getParticipant, conference } = useConference(sipClient)

      const participant = createParticipant({ id: 'part-1' })
      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map([['part-1', participant]]),
        isLocked: false,
        isRecording: false,
      }

      const found = getParticipant('part-1')
      expect(found).not.toBeNull()
      expect(found!.id).toBe('part-1')
      expect(found!.uri).toBe(participant.uri)
    })
  })

  describe('onConferenceEvent', () => {
    it('should register listener and return unsubscribe function', () => {
      const { onConferenceEvent } = useConference(sipClient)
      const callback = vi.fn()

      const unsubscribe = onConferenceEvent(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should call listener when event emitted', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { onConferenceEvent, lockConference, conference } = useConference(sipClient)

      const callback = vi.fn()
      onConferenceEvent(callback)

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await lockConference()

      expect(callback).toHaveBeenCalled()
    })

    it('should unsubscribe listener on unsubscribe call', async () => {
      const mockClient = createMockSipClient()
      sipClient.value = mockClient

      const { onConferenceEvent, lockConference, conference } = useConference(sipClient)

      const callback = vi.fn()
      const unsubscribe = onConferenceEvent(callback)
      unsubscribe()

      conference.value = {
        id: 'conf-1',
        state: ConferenceState.Active,
        participants: new Map(),
        isLocked: false,
        isRecording: false,
      }

      await lockConference()

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
