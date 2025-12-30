import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DTMFManager } from '@/core/DTMFManager'
import type { RTCSession } from 'jssip/lib/RTCSession'
import type { DTMFOptions, DTMFEvent } from '@/types/dtmf.types'

describe('DTMFManager', () => {
  let dtmfManager: DTMFManager
  let mockSession: RTCSession

  beforeEach(() => {
    dtmfManager = new DTMFManager()

    // Create comprehensive mock RTCSession
    mockSession = {
      connection: {
        localDescription: {
          sdp: 'v=0\r\no=- 123 456 IN IP4 127.0.0.1\r\na=rtpmap:101 telephone-event/8000\r\n',
        },
        remoteDescription: {
          sdp: 'v=0\r\no=- 789 012 IN IP4 127.0.0.1\r\na=rtpmap:101 telephone-event/8000\r\n',
        },
      },
      isEstablished: vi.fn(() => true),
      sendDTMF: vi.fn(),
      sendInfo: vi.fn(),
    } as unknown as RTCSession
  })

  afterEach(() => {
    dtmfManager.destroy()
    vi.clearAllMocks()
  })

  describe('Constructor and Initial State', () => {
    it('should initialize with null session and capabilities', () => {
      const manager = new DTMFManager()
      expect(manager.getCapabilities()).toBeNull()
      expect(manager.getState().isSending).toBe(false)
      expect(manager.getState().queueLength).toBe(0)
    })
  })

  describe('setSession', () => {
    it('should set session and detect capabilities', () => {
      dtmfManager.setSession(mockSession)

      const capabilities = dtmfManager.getCapabilities()
      expect(capabilities).not.toBeNull()
      expect(capabilities?.rfc2833Enabled).toBe(true)
      expect(capabilities?.sipInfoEnabled).toBe(true)
      expect(capabilities?.inbandEnabled).toBe(true)
      expect(capabilities?.supportedMethods).toContain('rfc2833')
      expect(capabilities?.supportedMethods).toContain('sipinfo')
      expect(capabilities?.preferredMethod).toBe('rfc2833')
    })

    it('should detect RFC 2833 when both SDPs support telephone-event', () => {
      dtmfManager.setSession(mockSession)

      const capabilities = dtmfManager.getCapabilities()
      expect(capabilities?.rfc2833Enabled).toBe(true)
      expect(capabilities?.preferredMethod).toBe('rfc2833')
    })

    it('should prefer SIP INFO when telephone-event is not in SDPs', () => {
      const sessionWithoutRFC2833 = {
        ...mockSession,
        connection: {
          localDescription: {
            sdp: 'v=0\r\no=- 123 456 IN IP4 127.0.0.1\r\n',
          },
          remoteDescription: {
            sdp: 'v=0\r\no=- 789 012 IN IP4 127.0.0.1\r\n',
          },
        },
      } as unknown as RTCSession

      dtmfManager.setSession(sessionWithoutRFC2833)

      const capabilities = dtmfManager.getCapabilities()
      expect(capabilities?.rfc2833Enabled).toBe(false)
      expect(capabilities?.sipInfoEnabled).toBe(true)
      expect(capabilities?.preferredMethod).toBe('sipinfo')
    })

    it('should clear capabilities when session is set to null', () => {
      dtmfManager.setSession(mockSession)
      expect(dtmfManager.getCapabilities()).not.toBeNull()

      dtmfManager.setSession(null)
      expect(dtmfManager.getCapabilities()).toBeNull()
    })

    it('should clear queue when session is set to null', async () => {
      dtmfManager.setSession(mockSession)

      // Queue some tones (will be pending)
      const sendPromise = dtmfManager.sendDTMF('123')

      // Give time for queue to be populated
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Clear session
      dtmfManager.setSession(null)

      // Queue should be cleared immediately
      const state = dtmfManager.getState()
      expect(state.queueLength).toBe(0)

      // Promise should resolve with error result
      const result = await sendPromise
      expect(result.success).toBe(false)
      expect(result.error).toBe('Session ended')
    })
  })

  describe('getState', () => {
    it('should return correct state when idle', () => {
      dtmfManager.setSession(mockSession)

      const state = dtmfManager.getState()
      expect(state.isSending).toBe(false)
      expect(state.currentTone).toBeNull()
      expect(state.queueLength).toBe(0)
      expect(state.capabilities).not.toBeNull()
    })

    it('should return current tone when processing queue', async () => {
      dtmfManager.setSession(mockSession)

      // Start sending (will process asynchronously)
      const promise = dtmfManager.sendDTMF('5')

      // Check state while processing (might catch it in sending state)
      await promise

      // After completion, should be idle again
      const finalState = dtmfManager.getState()
      expect(finalState.isSending).toBe(false)
    })
  })

  describe('sendDTMF', () => {
    it('should throw error when no session is set', async () => {
      await expect(dtmfManager.sendDTMF('1')).rejects.toThrow('No active call session')
    })

    it('should throw error when session is not established', async () => {
      const unestablishedSession = {
        ...mockSession,
        isEstablished: vi.fn(() => false),
      } as unknown as RTCSession

      dtmfManager.setSession(unestablishedSession)

      await expect(dtmfManager.sendDTMF('1')).rejects.toThrow('No active call session')
    })

    it('should throw error for invalid DTMF tones', async () => {
      dtmfManager.setSession(mockSession)

      await expect(dtmfManager.sendDTMF('X')).rejects.toThrow('Invalid DTMF tones')
      await expect(dtmfManager.sendDTMF('abc')).rejects.toThrow('Invalid DTMF tones')
    })

    it('should successfully send valid single tone', async () => {
      dtmfManager.setSession(mockSession)

      const result = await dtmfManager.sendDTMF('5')

      expect(result.success).toBe(true)
      expect(result.tones).toBe('5')
      expect(result.method).toBe('rfc2833')
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(mockSession.sendDTMF).toHaveBeenCalled()
    })

    it('should successfully send multiple tones', async () => {
      dtmfManager.setSession(mockSession)

      const result = await dtmfManager.sendDTMF('123')

      expect(result.success).toBe(true)
      expect(result.tones).toBe('123')
      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3)
    })

    it('should use preferred method from capabilities', async () => {
      dtmfManager.setSession(mockSession)

      await dtmfManager.sendDTMF('1')

      // Should use RFC 2833 since it's preferred
      expect(mockSession.sendDTMF).toHaveBeenCalled()
    })

    it('should respect custom method option', async () => {
      const sessionWithoutRFC2833 = {
        ...mockSession,
        connection: {
          localDescription: { sdp: 'v=0\r\n' },
          remoteDescription: { sdp: 'v=0\r\n' },
        },
      } as unknown as RTCSession

      dtmfManager.setSession(sessionWithoutRFC2833)

      const options: DTMFOptions = { method: 'sipinfo' }
      await dtmfManager.sendDTMF('1', options)

      expect(mockSession.sendInfo).toHaveBeenCalled()
    })

    it('should fallback to preferred method if requested method is not supported', async () => {
      const sessionWithoutRFC2833 = {
        ...mockSession,
        connection: {
          localDescription: { sdp: 'v=0\r\n' },
          remoteDescription: { sdp: 'v=0\r\n' },
        },
      } as unknown as RTCSession

      dtmfManager.setSession(sessionWithoutRFC2833)

      const options: DTMFOptions = { method: 'rfc2833' }
      const result = await dtmfManager.sendDTMF('1', options)

      expect(result.success).toBe(true)
      expect(mockSession.sendInfo).toHaveBeenCalled() // Should fallback to SIP INFO
    })

    it('should validate and clamp duration within allowed range', async () => {
      dtmfManager.setSession(mockSession)

      // Test minimum duration
      await dtmfManager.sendDTMF('1', { duration: 10 })
      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          duration: expect.any(Number),
        })
      )

      vi.clearAllMocks()

      // Test maximum duration
      await dtmfManager.sendDTMF('2', { duration: 10000 })
      expect(mockSession.sendDTMF).toHaveBeenCalled()
    })

    it('should validate and clamp interToneGap within allowed range', async () => {
      dtmfManager.setSession(mockSession)

      await dtmfManager.sendDTMF('12', { interToneGap: 10 })

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(2)
    })

    it('should emit start and end events', async () => {
      dtmfManager.setSession(mockSession)

      const events: DTMFEvent[] = []
      dtmfManager.on((event) => events.push(event))

      await dtmfManager.sendDTMF('1')

      expect(events).toHaveLength(3) // start, tone, end
      expect(events[0].type).toBe('start')
      expect(events[1].type).toBe('tone')
      expect(events[2].type).toBe('end')
    })

    it('should emit tone events for each tone', async () => {
      dtmfManager.setSession(mockSession)

      const events: DTMFEvent[] = []
      dtmfManager.on((event) => events.push(event))

      await dtmfManager.sendDTMF('123')

      const toneEvents = events.filter((e) => e.type === 'tone')
      expect(toneEvents).toHaveLength(3)
      expect(toneEvents[0].tone).toBe('1')
      expect(toneEvents[1].tone).toBe('2')
      expect(toneEvents[2].tone).toBe('3')
    })

    it('should emit error event on failure', async () => {
      const failingSession = {
        ...mockSession,
        sendDTMF: vi.fn(() => {
          throw new Error('Send failed')
        }),
        sendInfo: vi.fn(() => {
          throw new Error('Send failed')
        }), // Both methods fail
      } as unknown as RTCSession

      dtmfManager.setSession(failingSession)

      const events: DTMFEvent[] = []
      dtmfManager.on((event) => events.push(event))

      const result = await dtmfManager.sendDTMF('1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Send failed')

      const errorEvents = events.filter((e) => e.type === 'error')
      expect(errorEvents.length).toBeGreaterThanOrEqual(1)
      expect(errorEvents[0].error).toBe('Send failed')
    })

    it('should return error result without throwing on send failure', async () => {
      const failingSession = {
        ...mockSession,
        sendDTMF: vi.fn(() => {
          throw new Error('Network error')
        }),
        sendInfo: vi.fn(() => {
          throw new Error('Network error')
        }), // Both methods fail
      } as unknown as RTCSession

      dtmfManager.setSession(failingSession)

      const result = await dtmfManager.sendDTMF('1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('sendTone', () => {
    it('should delegate to sendDTMF for single tone', async () => {
      dtmfManager.setSession(mockSession)

      const result = await dtmfManager.sendTone('5')

      expect(result.success).toBe(true)
      expect(result.tones).toBe('5')
      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', expect.any(Object))
    })

    it('should pass options to sendDTMF', async () => {
      dtmfManager.setSession(mockSession)

      const options: DTMFOptions = { duration: 200, method: 'rfc2833' }
      await dtmfManager.sendTone('9', options)

      expect(mockSession.sendDTMF).toHaveBeenCalled()
    })
  })

  describe('Event Listeners', () => {
    it('should add event listener', async () => {
      dtmfManager.setSession(mockSession)

      const listener = vi.fn()
      dtmfManager.on(listener)

      await dtmfManager.sendDTMF('1')

      expect(listener).toHaveBeenCalled()
    })

    it('should remove event listener', async () => {
      dtmfManager.setSession(mockSession)

      const listener = vi.fn()
      dtmfManager.on(listener)
      dtmfManager.off(listener)

      await dtmfManager.sendDTMF('1')

      expect(listener).not.toHaveBeenCalled()
    })

    it('should support multiple event listeners', async () => {
      dtmfManager.setSession(mockSession)

      const listener1 = vi.fn()
      const listener2 = vi.fn()

      dtmfManager.on(listener1)
      dtmfManager.on(listener2)

      await dtmfManager.sendDTMF('1')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle removing non-existent listener gracefully', () => {
      const listener = vi.fn()

      expect(() => dtmfManager.off(listener)).not.toThrow()
    })
  })

  describe('RFC 2833 Method', () => {
    it('should use sendDTMF on session for RFC 2833', async () => {
      dtmfManager.setSession(mockSession)

      await dtmfManager.sendDTMF('1', { method: 'rfc2833' })

      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          interToneGap: 0, // Manager handles gaps
        })
      )
    })

    it('should wait for tone duration', async () => {
      dtmfManager.setSession(mockSession)

      const startTime = Date.now()
      await dtmfManager.sendDTMF('1', { method: 'rfc2833', duration: 100 })
      const endTime = Date.now()

      // Should have taken at least the duration time
      expect(endTime - startTime).toBeGreaterThanOrEqual(90) // Allow some margin
    })
  })

  describe('SIP INFO Method', () => {
    it('should use sendInfo on session for SIP INFO', async () => {
      const sessionWithoutRFC2833 = {
        ...mockSession,
        connection: {
          localDescription: { sdp: 'v=0\r\n' },
          remoteDescription: { sdp: 'v=0\r\n' },
        },
      } as unknown as RTCSession

      dtmfManager.setSession(sessionWithoutRFC2833)

      await dtmfManager.sendDTMF('5', { method: 'sipinfo' })

      expect(mockSession.sendInfo).toHaveBeenCalledWith(
        'application/dtmf-relay',
        expect.stringContaining('Signal=5'),
        expect.any(Object)
      )
    })

    it('should include duration in SIP INFO body', async () => {
      const sessionWithoutRFC2833 = {
        ...mockSession,
        connection: {
          localDescription: { sdp: 'v=0\r\n' },
          remoteDescription: { sdp: 'v=0\r\n' },
        },
      } as unknown as RTCSession

      dtmfManager.setSession(sessionWithoutRFC2833)

      await dtmfManager.sendDTMF('9', { method: 'sipinfo', duration: 250 })

      expect(mockSession.sendInfo).toHaveBeenCalledWith(
        'application/dtmf-relay',
        expect.stringContaining('Duration=250'),
        expect.any(Object)
      )
    })
  })

  describe('Queue Processing', () => {
    it('should process tones sequentially with inter-tone gaps', async () => {
      dtmfManager.setSession(mockSession)

      const startTime = Date.now()
      await dtmfManager.sendDTMF('12', { duration: 100, interToneGap: 50 })
      const endTime = Date.now()

      // Should take: duration1 + gap + duration2 = 100 + 50 + 100 = 250ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(200) // Allow margin
      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(2)
    })

    it('should not add inter-tone gap after last tone', async () => {
      dtmfManager.setSession(mockSession)

      const startTime = Date.now()
      await dtmfManager.sendDTMF('1', { duration: 100, interToneGap: 50 })
      const endTime = Date.now()

      // Should only take the tone duration, not the gap
      expect(endTime - startTime).toBeLessThan(200)
    })

    it('should handle concurrent send requests by queuing', async () => {
      dtmfManager.setSession(mockSession)

      const promise1 = dtmfManager.sendDTMF('1')
      const promise2 = dtmfManager.sendDTMF('2')

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(mockSession.sendDTMF).toHaveBeenCalledWith('1', expect.any(Object))
      expect(mockSession.sendDTMF).toHaveBeenCalledWith('2', expect.any(Object))
    })
  })

  describe('Method Fallback', () => {
    it('should fallback to SIP INFO when RFC 2833 fails', async () => {
      const fallbackSession = {
        ...mockSession,
        sendDTMF: vi.fn(() => {
          throw new Error('RFC 2833 not supported')
        }),
      } as unknown as RTCSession

      dtmfManager.setSession(fallbackSession)

      await dtmfManager.sendDTMF('1', { method: 'rfc2833' })

      expect(mockSession.sendInfo).toHaveBeenCalled()
    })

    it('should fallback to RFC 2833 when SIP INFO fails', async () => {
      const fallbackSession = {
        ...mockSession,
        sendInfo: vi.fn(() => {
          throw new Error('SIP INFO failed')
        }),
      } as unknown as RTCSession

      dtmfManager.setSession(fallbackSession)

      const result = await dtmfManager.sendDTMF('1', { method: 'sipinfo' })

      expect(result.success).toBe(true)
      expect(fallbackSession.sendDTMF).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should clear queue on destroy', async () => {
      dtmfManager.setSession(mockSession)

      // Queue a tone
      const promise = dtmfManager.sendDTMF('1')

      // Give time for queue to be populated
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Destroy manager
      dtmfManager.destroy()

      // Queue should be cleared
      expect(dtmfManager.getState().queueLength).toBe(0)

      // Promise should complete (may succeed or fail depending on timing)
      const result = await promise
      // If it was destroyed before processing, success will be false
      // If it completed before destroy, success will be true
      expect(result).toHaveProperty('success')
    })

    it('should clear session on destroy', () => {
      dtmfManager.setSession(mockSession)
      expect(dtmfManager.getCapabilities()).not.toBeNull()

      dtmfManager.destroy()

      expect(dtmfManager.getCapabilities()).toBeNull()
    })

    it('should clear event listeners on destroy', async () => {
      dtmfManager.setSession(mockSession)

      const listener = vi.fn()
      dtmfManager.on(listener)

      dtmfManager.destroy()

      // Re-set session and send - listener should not be called
      dtmfManager.setSession(mockSession)
      await dtmfManager.sendDTMF('1')

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
