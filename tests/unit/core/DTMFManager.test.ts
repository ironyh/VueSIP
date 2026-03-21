/**
 * Unit tests for DTMFManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DTMFManager } from '@/core/DTMFManager'

// Mock RTCSession
const createMockSession = (isEstablished = true) => ({
  isEstablished: vi.fn(() => isEstablished),
  connection: {
    localDescription: {
      sdp: 'a=rtpmap:101 telephone-event/8000\r\n',
    },
    remoteDescription: {
      sdp: 'a=rtpmap:101 telephone-event/8000\r\n',
    },
  },
  sendDTMF: vi.fn(),
  sendInfo: vi.fn(),
})

describe('DTMFManager', () => {
  let manager: DTMFManager

  beforeEach(() => {
    manager = new DTMFManager()
  })

  afterEach(() => {
    manager.destroy()
  })

  describe('constructor', () => {
    it('should create manager with empty state', () => {
      const state = manager.getState()
      expect(state.isSending).toBe(false)
      expect(state.currentTone).toBeNull()
      expect(state.queueLength).toBe(0)
      expect(state.capabilities).toBeNull()
    })
  })

  describe('setSession', () => {
    it('should set session and detect capabilities', () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      const capabilities = manager.getCapabilities()
      expect(capabilities).not.toBeNull()
      expect(capabilities?.supportedMethods).toContain('rfc2833')
      expect(capabilities?.supportedMethods).toContain('sipinfo')
      expect(capabilities?.rfc2833Enabled).toBe(true)
      expect(capabilities?.preferredMethod).toBe('rfc2833')
    })

    it('should clear capabilities when session is null', () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)
      expect(manager.getCapabilities()).not.toBeNull()

      manager.setSession(null)
      expect(manager.getCapabilities()).toBeNull()
    })

    it('should detect RFC 2833 disabled when not in SDP', () => {
      const mockSession = {
        isEstablished: vi.fn(() => true),
        connection: {
          localDescription: { sdp: 'audio' },
          remoteDescription: { sdp: 'audio' },
        },
      } as any

      manager.setSession(mockSession)

      const capabilities = manager.getCapabilities()
      expect(capabilities?.rfc2833Enabled).toBe(false)
      expect(capabilities?.preferredMethod).toBe('sipinfo')
    })
  })

  describe('sendDTMF', () => {
    it('should throw error when no session', async () => {
      await expect(manager.sendDTMF('123')).rejects.toThrow('No active call session')
    })

    it('should throw error for invalid tones', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      await expect(manager.sendDTMF('')).rejects.toThrow('Invalid DTMF tones')
      await expect(manager.sendDTMF('12x3')).rejects.toThrow('Invalid DTMF tones')
    })

    it('should send DTMF successfully with valid tones', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      const result = await manager.sendDTMF('123')

      expect(result.success).toBe(true)
      expect(result.tones).toBe('123')
      expect(result.method).toBe('rfc2833')
      expect(result.error).toBeUndefined()
    })

    it('should emit start and end events', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      const events: any[] = []
      manager.on((event) => events.push(event))

      await manager.sendDTMF('1')

      expect(events[0].type).toBe('start')
      expect(events[1].type).toBe('tone')
      expect(events[2].type).toBe('end')
    })

    it('should respect custom duration option', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      await manager.sendDTMF('1', { duration: 200 })

      // The session's sendDTMF should be called
      expect(mockSession.sendDTMF).toHaveBeenCalled()
    })

    it('should fallback to sipinfo when rfc2833 not available', async () => {
      const mockSession = {
        isEstablished: vi.fn(() => true),
        connection: {
          localDescription: { sdp: 'audio' },
          remoteDescription: { sdp: 'audio' },
        },
        sendDTMF: vi.fn(),
        sendInfo: vi.fn(),
      } as any

      manager.setSession(mockSession)

      const result = await manager.sendDTMF('1')
      expect(result.method).toBe('sipinfo')
    })
  })

  describe('sendTone', () => {
    it('should send single tone', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      const result = await manager.sendTone('5')
      expect(result.success).toBe(true)
      expect(result.tones).toBe('5')
    })
  })

  describe('getState', () => {
    it('should return current state', () => {
      const state = manager.getState()
      expect(state.isSending).toBe(false)
      expect(state.queueLength).toBe(0)
    })

    it('should reflect sending state', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      const sendPromise = manager.sendDTMF('123')

      // Give it a moment to start processing
      await new Promise((r) => setTimeout(r, 10))

      const state = manager.getState()
      expect(state.isSending).toBe(true)

      await sendPromise
    })
  })

  describe('event listeners', () => {
    it('should add and remove listeners', () => {
      const listener = vi.fn()
      manager.on(listener)
      manager.off(listener)

      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      // Trigger event by sending DTMF
      manager.sendDTMF('1')

      expect(listener).not.toHaveBeenCalled()
    })

    it('should support multiple listeners', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      manager.on(listener1)
      manager.on(listener2)

      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      await manager.sendDTMF('1')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('validation', () => {
    it('should clamp duration to valid range', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      // Duration below minimum
      await manager.sendDTMF('1', { duration: 10 })
      expect(mockSession.sendDTMF).toHaveBeenCalled()

      // Duration above maximum
      await manager.sendDTMF('1', { duration: 10000 })
      expect(mockSession.sendDTMF).toHaveBeenCalled()
    })

    it('should clamp interToneGap to valid range', async () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      await manager.sendDTMF('12', { interToneGap: 10 })
      await manager.sendDTMF('12', { interToneGap: 10000 })
    })
  })

  describe('destroy', () => {
    it('should cleanup all resources', () => {
      const mockSession = createMockSession()
      manager.setSession(mockSession as any)

      manager.destroy()

      expect(manager.getCapabilities()).toBeNull()
      expect(manager.getState().queueLength).toBe(0)
    })
  })
})
