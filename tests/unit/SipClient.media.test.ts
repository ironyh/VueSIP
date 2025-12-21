/**
 * SipClient media control features unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
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

describe('SipClient - Media Control Features', () => {
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

  describe('muteAudio()', () => {
    it('should emit audio muted event when no active calls', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:audio:muted', eventHandler)

      await sipClient.muteAudio()

      expect(eventHandler).toHaveBeenCalled()
    })

    it('should not mute when already muted', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:audio:muted', eventHandler)

      await sipClient.muteAudio()
      vi.clearAllMocks()

      await sipClient.muteAudio() // Second call should return early

      expect(eventHandler).not.toHaveBeenCalled()
    })
  })

  describe('unmuteAudio()', () => {
    beforeEach(() => {
      // Set audio as muted
      sipClient['isMuted'] = true
    })

    it('should emit audio unmuted event when no active calls', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:audio:unmuted', eventHandler)

      await sipClient.unmuteAudio()

      expect(eventHandler).toHaveBeenCalled()
    })

    it('should not unmute when already unmuted', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:audio:unmuted', eventHandler)

      await sipClient.unmuteAudio()
      vi.clearAllMocks()

      await sipClient.unmuteAudio() // Second call should return early

      expect(eventHandler).not.toHaveBeenCalled()
    })
  })

  describe('disableVideo()', () => {
    it('should emit video disabled event when no active calls', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:video:disabled', eventHandler)

      await sipClient.disableVideo()

      expect(eventHandler).toHaveBeenCalled()
    })

    it('should not disable when already disabled', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:video:disabled', eventHandler)

      await sipClient.disableVideo()
      vi.clearAllMocks()

      await sipClient.disableVideo() // Second call should return early

      expect(eventHandler).not.toHaveBeenCalled()
    })
  })

  describe('enableVideo()', () => {
    beforeEach(() => {
      // Set video as disabled
      sipClient['isVideoDisabled'] = true
    })

    it('should emit video enabled event when no active calls', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:video:enabled', eventHandler)

      await sipClient.enableVideo()

      expect(eventHandler).toHaveBeenCalled()
    })

    it('should not enable when already enabled', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:video:enabled', eventHandler)

      await sipClient.enableVideo()
      vi.clearAllMocks()

      await sipClient.enableVideo() // Second call should return early

      expect(eventHandler).not.toHaveBeenCalled()
    })
  })

  describe('Message handlers', () => {
    it('should register incoming message handler', () => {
      const handler = vi.fn()
      sipClient.onIncomingMessage(handler)
      // No direct way to verify, but shouldn't throw
    })

    it('should remove incoming message handler', () => {
      const handler = vi.fn()
      sipClient.onIncomingMessage(handler)
      sipClient.offIncomingMessage(handler)
      // No direct way to verify, but shouldn't throw
    })

    it('should register composing indicator handler', () => {
      const handler = vi.fn()
      sipClient.onComposingIndicator(handler)
      // No direct way to verify, but shouldn't throw
    })

    it('should remove composing indicator handler', () => {
      const handler = vi.fn()
      sipClient.onComposingIndicator(handler)
      sipClient.offComposingIndicator(handler)
      // No direct way to verify, but shouldn't throw
    })
  })

  describe('forceEmitConnected()', () => {
    it('should force emit connected event', () => {
      // Reset connection state so forceEmitConnected will emit
      sipClient['state'].connectionState = ConnectionState.Disconnected

      const eventHandler = vi.fn()
      eventBus.on('sip:connected', eventHandler)

      sipClient.forceEmitConnected('wss://test.com')

      expect(eventHandler).toHaveBeenCalled()
    })
  })

  describe('forceEmitDisconnected()', () => {
    it('should force emit disconnected event', () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:disconnected', eventHandler)

      sipClient.forceEmitDisconnected(new Error('Test error'))

      expect(eventHandler).toHaveBeenCalled()
    })
  })
})
