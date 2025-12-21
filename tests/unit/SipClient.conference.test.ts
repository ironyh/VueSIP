/**
 * SipClient conference features unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import { ConferenceState, ParticipantState } from '@/types/conference.types'
import { ConnectionState } from '@/types/sip.types'

// Mock JsSIP
const { mockUA, mockWebSocketInterface, triggerEvent, eventHandlers, onceHandlers } = vi.hoisted(() => {
  const eventHandlers: Record<string, Array<(...args: any[]) => void>> = {}
  const onceHandlers: Record<string, Array<(...args: any[]) => void>> = {}

  const triggerEvent = (event: string, data?: any) => {
    const handlers = eventHandlers[event] || []
    handlers.forEach((handler) => handler(data))
    const once = onceHandlers[event] || []
    once.forEach((handler) => handler(data))
    onceHandlers[event] = []
  }

  const mockUA = {
    start: vi.fn(),
    stop: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    call: vi.fn(),
    sendMessage: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    isRegistered: vi.fn().mockReturnValue(true),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    once: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    }),
    off: vi.fn(),
  }

  const mockWebSocketInterface = vi.fn()

  return { mockUA, mockWebSocketInterface, eventHandlers, onceHandlers, triggerEvent }
})

vi.mock('jssip', () => {
  return {
    default: {
      UA: vi.fn(function () {
        return mockUA
      }),
      WebSocketInterface: mockWebSocketInterface,
      debug: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
    },
  }
})

describe('SipClient - Conference Features', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()

    // Clear event handlers
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
    Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])

    // Restore default mock implementations
    mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    })
    mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    })

    mockUA.isConnected.mockReturnValue(true)
    mockUA.isRegistered.mockReturnValue(true)

    eventBus = createEventBus()
    config = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      debug: false,
    }

    sipClient = new SipClient(config, eventBus)

    // Set UA reference and connection state for testing
    sipClient['ua'] = mockUA as any
    sipClient['state'].connectionState = ConnectionState.Connected
  })

  afterEach(() => {
    sipClient.destroy()
    eventBus.destroy()
  })

  describe('createConference()', () => {
    it('should create a new conference', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:conference:created', eventHandler)

      await sipClient.createConference('conf123', {
        maxParticipants: 10,
        enableVideo: true,
      })

      expect(eventHandler).toHaveBeenCalled()
      const event = eventHandler.mock.calls[0][0]
      expect(event.conferenceId).toBe('conf123')
      expect(event.conference.state).toBe(ConferenceState.Active)
      expect(event.conference.maxParticipants).toBe(10)
    })

    it('should throw error when not connected', async () => {
      mockUA.isConnected.mockReturnValue(false)
      await expect(sipClient.createConference('conf123')).rejects.toThrow('not connected')
    })

    it('should throw error when UA is null', async () => {
      const client = new SipClient(config, eventBus)
      await expect(client.createConference('conf123')).rejects.toThrow('not connected')
    })
  })

  describe('endConference()', () => {
    beforeEach(() => {
      // Create a mock conference
      sipClient['conferences'].set('conf123', {
        id: 'conf123',
        state: ConferenceState.Active,
        participants: new Map(),
        maxParticipants: 10,
        isRecording: false,
      } as any)
    })

    it('should end a conference', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:conference:ended', eventHandler)

      await sipClient.endConference('conf123')

      expect(eventHandler).toHaveBeenCalled()
      const event = eventHandler.mock.calls[0][0]
      expect(event.conferenceId).toBe('conf123')
      expect(event.conference.state).toBe(ConferenceState.Ended)
    })

    it('should throw error for non-existent conference', async () => {
      await expect(sipClient.endConference('nonexistent')).rejects.toThrow('not found')
    })
  })

  describe('startConferenceRecording()', () => {
    beforeEach(() => {
      // Create a mock conference
      sipClient['conferences'].set('conf123', {
        id: 'conf123',
        state: ConferenceState.Active,
        participants: new Map(),
        maxParticipants: 10,
        isRecording: false,
      } as any)
    })

    it('should start conference recording', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:conference:recording:started', eventHandler)

      await sipClient.startConferenceRecording('conf123')

      expect(eventHandler).toHaveBeenCalled()
      const event = eventHandler.mock.calls[0][0]
      expect(event.conferenceId).toBe('conf123')
    })

    it('should throw error for non-existent conference', async () => {
      await expect(sipClient.startConferenceRecording('nonexistent')).rejects.toThrow(
        'not found'
      )
    })
  })

  describe('stopConferenceRecording()', () => {
    beforeEach(() => {
      // Create a mock conference with recording enabled
      sipClient['conferences'].set('conf123', {
        id: 'conf123',
        state: ConferenceState.Active,
        participants: new Map(),
        maxParticipants: 10,
        isRecording: true,
      } as any)
    })

    it('should stop conference recording', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:conference:recording:stopped', eventHandler)

      await sipClient.stopConferenceRecording('conf123')

      expect(eventHandler).toHaveBeenCalled()
      const event = eventHandler.mock.calls[0][0]
      expect(event.conferenceId).toBe('conf123')
    })

    it('should throw error for non-existent conference', async () => {
      await expect(sipClient.stopConferenceRecording('nonexistent')).rejects.toThrow('not found')
    })
  })

  describe('getConferenceAudioLevels()', () => {
    it('should return undefined for non-existent conference', () => {
      const levels = sipClient.getConferenceAudioLevels?.('nonexistent')
      expect(levels).toBeUndefined()
    })

    it('should return undefined when no audio levels available', async () => {
      await sipClient.createConference('conf123')
      const levels = sipClient.getConferenceAudioLevels?.('conf123')
      expect(levels).toBeUndefined()
    })
  })
})
