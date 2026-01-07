/**
 * SipClient conference features unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import { ConferenceState } from '@/types/conference.types'
import { ConnectionState } from '@/types/sip.types'

// Enable automatic mocking using __mocks__/jssip.ts
vi.mock('jssip')

// Import mock helpers from the mocked module
import { mockUA, resetMockJsSip } from 'jssip'

describe('SipClient - Conference Features', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  beforeEach(() => {
    // Reset all mocks and handlers using shared helper
    resetMockJsSip()

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
      sipClient['state'].connectionState = ConnectionState.Disconnected
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
      await expect(sipClient.startConferenceRecording('nonexistent')).rejects.toThrow('not found')
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
