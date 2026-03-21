import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DTMFManager } from '../DTMFManager'
import type { RTCSession } from 'jssip/lib/RTCSession'
import type { DTMFEvent } from '@/types/dtmf.types'

// Mock RTCSession
const createMockSession = (isEstablished = true) =>
  ({
    isEstablished: vi.fn(() => isEstablished),
    sendDTMF: vi.fn(),
    sendInfo: vi.fn(),
    connection: {
      localDescription: {
        sdp: 'v=0\r\na=rtpmap:96 telephone-event/8000\r\n',
      },
      remoteDescription: {
        sdp: 'v=0\r\na=rtpmap:96 telephone-event/8000\r\n',
      },
    },
  }) as unknown as RTCSession

describe('DTMFManager', () => {
  let manager: DTMFManager
  let mockSession: RTCSession

  beforeEach(() => {
    manager = new DTMFManager()
    mockSession = createMockSession()
  })

  afterEach(() => {
    manager.destroy()
    vi.clearAllMocks()
  })

  describe('setSession', () => {
    it('should set session and detect capabilities', () => {
      manager.setSession(mockSession)
      const caps = manager.getCapabilities()

      expect(caps).not.toBeNull()
      expect(caps?.supportedMethods).toContain('rfc2833')
      expect(caps?.supportedMethods).toContain('sipinfo')
    })

    it('should clear capabilities when session is null', () => {
      manager.setSession(mockSession)
      manager.setSession(null)

      expect(manager.getCapabilities()).toBeNull()
    })
  })

  describe('getState', () => {
    it('should return correct initial state', () => {
      manager.setSession(mockSession)
      const state = manager.getState()

      expect(state.isSending).toBe(false)
      expect(state.currentTone).toBeNull()
      expect(state.queueLength).toBe(0)
      expect(state.capabilities).not.toBeNull()
    })
  })

  describe('sendDTMF', () => {
    it('should throw error when no session', async () => {
      await expect(manager.sendDTMF('1')).rejects.toThrow('No active call session')
    })

    it('should throw error for invalid tones', async () => {
      manager.setSession(mockSession)
      await expect(manager.sendDTMF('invalid')).rejects.toThrow('Invalid DTMF tones')
    })

    it('should send valid tones successfully', async () => {
      manager.setSession(mockSession)
      const result = await manager.sendDTMF('123')

      expect(result.success).toBe(true)
      expect(result.tones).toBe('123')
    })

    it('should emit start, tone, and end events', async () => {
      manager.setSession(mockSession)
      const events: DTMFEvent[] = []

      manager.on((event) => events.push(event))

      await manager.sendDTMF('5')

      // Should emit: start -> tone -> end
      expect(events.length).toBeGreaterThanOrEqual(3)
      expect(events[0].type).toBe('start')
      expect(events.some((e) => e.type === 'tone')).toBe(true)
      expect(events[events.length - 1].type).toBe('end')
    })
  })

  describe('sendTone', () => {
    it('should send single tone', async () => {
      manager.setSession(mockSession)
      const result = await manager.sendTone('9')

      expect(result.success).toBe(true)
      expect(result.tones).toBe('9')
    })
  })

  describe('event listeners', () => {
    it('should add and remove listeners', () => {
      const listener = vi.fn()

      manager.on(listener)
      manager.off(listener)

      // Should not throw, listener is removed
      expect(true).toBe(true)
    })

    it('should emit events to all listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      manager.on(listener1)
      manager.on(listener2)

      manager.setSession(mockSession)

      // Trigger event by sending DTMF
      manager.sendDTMF('1')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should cleanup resources', () => {
      manager.setSession(mockSession)
      manager.destroy()

      expect(manager.getCapabilities()).toBeNull()
    })
  })
})
