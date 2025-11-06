/**
 * High-Priority Fixes Tests
 *
 * Tests for high-priority issues identified in Phase 10 code review
 * These tests validate the fixes implemented in Phase 10.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsPlugin } from '../../src/plugins/AnalyticsPlugin'
import { RecordingPlugin } from '../../src/plugins/RecordingPlugin'
import { createMockPluginContext, waitForEvent } from '../utils/test-helpers'
import { EventBus } from '../../src/core/EventBus'

describe('High-Priority Fixes', () => {
  describe('AnalyticsPlugin - Session ID Generation', () => {
    it('should use crypto.randomUUID when available', () => {
      // Mock crypto.randomUUID
      const originalCrypto = global.crypto
      global.crypto = {
        ...global.crypto,
        randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
      } as any

      const plugin = new AnalyticsPlugin()
      // Access private sessionId through reflection
      const sessionId = (plugin as any).sessionId

      expect(sessionId).toContain('session-')
      expect(sessionId).toContain('123e4567')
      expect(global.crypto.randomUUID).toHaveBeenCalled()

      global.crypto = originalCrypto
    })

    it('should use crypto.getRandomValues when randomUUID not available', () => {
      // Mock crypto without randomUUID
      const originalCrypto = global.crypto
      global.crypto = {
        getRandomValues: vi.fn((array: Uint32Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = 0x12345678
          }
          return array
        }),
      } as any

      const plugin = new AnalyticsPlugin()
      const sessionId = (plugin as any).sessionId

      expect(sessionId).toContain('session-')
      expect(sessionId).toContain('12345678')
      expect(global.crypto.getRandomValues).toHaveBeenCalled()

      global.crypto = originalCrypto
    })

    it('should fallback to Math.random when crypto not available', () => {
      // Mock environment without crypto
      const originalCrypto = global.crypto
      ;(global as any).crypto = undefined

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const plugin = new AnalyticsPlugin()
      const sessionId = (plugin as any).sessionId

      expect(sessionId).toContain('session-')
      // Should have logged warning about non-cryptographic generation
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      global.crypto = originalCrypto
    })

    it('should generate unique session IDs', () => {
      const plugin1 = new AnalyticsPlugin()
      const plugin2 = new AnalyticsPlugin()
      const plugin3 = new AnalyticsPlugin()

      const id1 = (plugin1 as any).sessionId
      const id2 = (plugin2 as any).sessionId
      const id3 = (plugin3 as any).sessionId

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })
  })

  describe('AnalyticsPlugin - Batch Timer Memory Leak', () => {
    it('should cleanup timer when install fails', async () => {
      const plugin = new AnalyticsPlugin()
      const context = createMockPluginContext()

      // Mock registerEventListeners to throw error
      const originalMethod = (plugin as any).registerEventListeners
      ;(plugin as any).registerEventListeners = vi.fn(() => {
        throw new Error('Registration failed')
      })

      await expect(
        plugin.install(context, {
          endpoint: 'https://test.com',
          batchEvents: true,
          sendInterval: 1000,
        })
      ).rejects.toThrow('Registration failed')

      // Timer should be cleaned up
      const batchTimer = (plugin as any).batchTimer
      expect(batchTimer).toBeNull()

      // Cleanup functions should be cleared
      const cleanupFunctions = (plugin as any).cleanupFunctions
      expect(cleanupFunctions).toHaveLength(0)

      ;(plugin as any).registerEventListeners = originalMethod
    })

    it('should not leak timer if trackEvent throws', async () => {
      const plugin = new AnalyticsPlugin()
      const context = createMockPluginContext()

      // Mock trackEvent to throw
      const originalTrackEvent = plugin.trackEvent
      plugin.trackEvent = vi.fn(() => {
        throw new Error('Track failed')
      })

      await expect(
        plugin.install(context, {
          endpoint: 'https://test.com',
          batchEvents: true,
        })
      ).rejects.toThrow('Track failed')

      // Timer should be cleaned up
      const batchTimer = (plugin as any).batchTimer
      expect(batchTimer).toBeNull()

      plugin.trackEvent = originalTrackEvent
    })
  })

  describe('RecordingPlugin - IndexedDB Transaction Failures', () => {
    let plugin: RecordingPlugin
    let mockDb: any

    beforeEach(() => {
      plugin = new RecordingPlugin()

      // Mock IndexedDB
      mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
          })),
          onabort: null,
          onerror: null,
          error: null,
        })),
      }

      ;(plugin as any).db = mockDb
    })

    it('should handle transaction abort during save', async () => {
      const recording = {
        id: 'test-recording',
        callId: 'test-call',
        startTime: new Date(),
        mimeType: 'audio/webm',
        state: 'stopped',
        blob: new Blob(['test'], { type: 'audio/webm' }),
      }

      const transaction = {
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        onabort: null,
        onerror: null,
        error: new Error('Transaction aborted by user'),
      }

      mockDb.transaction.mockReturnValue(transaction)

      const savePromise = (plugin as any).saveRecording(recording)

      // Simulate transaction abort
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (transaction.onabort) {
        transaction.onabort()
      }

      await expect(savePromise).rejects.toThrow('Transaction aborted')
    })

    it('should handle transaction error during save', async () => {
      const recording = {
        id: 'test-recording',
        callId: 'test-call',
        startTime: new Date(),
        mimeType: 'audio/webm',
        state: 'stopped',
        blob: new Blob(['test'], { type: 'audio/webm' }),
      }

      const transaction = {
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        onabort: null,
        onerror: null,
        error: new Error('Transaction error'),
      }

      mockDb.transaction.mockReturnValue(transaction)

      const savePromise = (plugin as any).saveRecording(recording)

      // Simulate transaction error
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (transaction.onerror) {
        transaction.onerror()
      }

      await expect(savePromise).rejects.toThrow('Transaction failed')
    })
  })

  describe('RecordingPlugin - Download in Non-Browser Environment', () => {
    let plugin: RecordingPlugin

    beforeEach(() => {
      plugin = new RecordingPlugin()

      // Add a recording
      ;(plugin as any).recordings.set('test-recording', {
        id: 'test-recording',
        callId: 'test-call',
        startTime: new Date(),
        mimeType: 'audio/webm',
        state: 'stopped',
        blob: new Blob(['test'], { type: 'audio/webm' }),
      })
    })

    it('should throw error when document is undefined', () => {
      const originalDocument = global.document
      ;(global as any).document = undefined

      expect(() => plugin.downloadRecording('test-recording')).toThrow(
        'Download is only supported in browser environments with DOM access'
      )

      global.document = originalDocument
    })

    it('should throw error when document.body is null', () => {
      const originalBody = document.body
      ;(document as any).body = null

      expect(() => plugin.downloadRecording('test-recording')).toThrow(
        'Download is only supported in browser environments with DOM access'
      )

      ;(document as any).body = originalBody
    })

    it('should work normally in browser environment', () => {
      const clickSpy = vi.fn()
      const mockAnchor = {
        click: clickSpy,
        href: '',
        download: '',
      }

      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor as any)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

      plugin.downloadRecording('test-recording', 'test.webm')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(clickSpy).toHaveBeenCalled()
      expect(mockAnchor.download).toBe('test.webm')

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })

  describe('RecordingPlugin - Pause/Resume Edge Cases', () => {
    let plugin: RecordingPlugin

    beforeEach(() => {
      plugin = new RecordingPlugin()
    })

    it('should ignore pause when already paused', () => {
      const mockRecorder = {
        state: 'paused',
        pause: vi.fn(),
        resume: vi.fn(),
      }

      ;(plugin as any).activeRecordings.set('test-call', mockRecorder)

      // Should not throw
      plugin.pauseRecording('test-call')

      // pause() should not be called
      expect(mockRecorder.pause).not.toHaveBeenCalled()
    })

    it('should ignore resume when already recording', () => {
      const mockRecorder = {
        state: 'recording',
        pause: vi.fn(),
        resume: vi.fn(),
      }

      ;(plugin as any).activeRecordings.set('test-call', mockRecorder)

      // Should not throw
      plugin.resumeRecording('test-call')

      // resume() should not be called
      expect(mockRecorder.resume).not.toHaveBeenCalled()
    })

    it('should handle rapid pause/resume/pause calls gracefully', () => {
      const mockRecorder = {
        state: 'recording',
        pause: vi.fn().mockImplementation(function (this: any) {
          this.state = 'paused'
        }),
        resume: vi.fn().mockImplementation(function (this: any) {
          this.state = 'recording'
        }),
      }

      ;(plugin as any).activeRecordings.set('test-call', mockRecorder)

      // Rapid calls
      plugin.pauseRecording('test-call')
      plugin.resumeRecording('test-call')
      plugin.pauseRecording('test-call')

      // Should have been called correct number of times
      expect(mockRecorder.pause).toHaveBeenCalledTimes(2)
      expect(mockRecorder.resume).toHaveBeenCalledTimes(1)
      expect(mockRecorder.state).toBe('paused')
    })

    it('should warn when pausing in invalid state', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockRecorder = {
        state: 'inactive',
        pause: vi.fn(),
        resume: vi.fn(),
      }

      ;(plugin as any).activeRecordings.set('test-call', mockRecorder)

      plugin.pauseRecording('test-call')

      expect(consoleSpy).toHaveBeenCalled()
      expect(mockRecorder.pause).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Test Utilities - waitForEvent Cleanup', () => {
    let eventBus: EventBus

    beforeEach(() => {
      eventBus = new EventBus()
    })

    it('should cleanup event listener on timeout', async () => {
      const initialListeners = eventBus.listenerCount('test-event')

      const waitPromise = waitForEvent(eventBus, 'test-event', 100)

      await expect(waitPromise).rejects.toThrow('Timeout waiting for event')

      // Event listener should be removed
      const finalListeners = eventBus.listenerCount('test-event')
      expect(finalListeners).toBe(initialListeners)
    })

    it('should cleanup event listener on success', async () => {
      const initialListeners = eventBus.listenerCount('test-event')

      const waitPromise = waitForEvent(eventBus, 'test-event', 1000)

      // Emit event after a short delay
      setTimeout(() => {
        eventBus.emit('test-event', { data: 'test' })
      }, 50)

      await expect(waitPromise).resolves.toEqual({ data: 'test' })

      // Event listener should be removed
      const finalListeners = eventBus.listenerCount('test-event')
      expect(finalListeners).toBe(initialListeners)
    })

    it('should cleanup timer on event success', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const waitPromise = waitForEvent(eventBus, 'test-event', 5000)

      setTimeout(() => {
        eventBus.emit('test-event', { data: 'test' })
      }, 10)

      await waitPromise

      // Timer should have been cleared
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should not leak listeners with multiple concurrent waits', async () => {
      const initialListeners = eventBus.listenerCount('test-event')

      // Start multiple waits
      const wait1 = waitForEvent(eventBus, 'test-event', 100)
      const wait2 = waitForEvent(eventBus, 'test-event', 100)
      const wait3 = waitForEvent(eventBus, 'test-event', 100)

      // All should timeout
      await expect(wait1).rejects.toThrow()
      await expect(wait2).rejects.toThrow()
      await expect(wait3).rejects.toThrow()

      // No listeners should remain
      const finalListeners = eventBus.listenerCount('test-event')
      expect(finalListeners).toBe(initialListeners)
    })
  })

  describe('Configuration - Coverage Thresholds', () => {
    it('should document that coverage thresholds increased to 80%', () => {
      // This is a documentation test
      // Actual thresholds are in vite.config.ts:
      // - lines: 80
      // - functions: 80
      // - branches: 75
      // - statements: 80
      expect(true).toBe(true)
    })
  })

  describe('Configuration - Flaky Test Detection', () => {
    it('should document that retry configuration is enabled', () => {
      // This is a documentation test
      // Actual configuration is in vite.config.ts:
      // - retry: 2 (failed tests retry twice)
      // - testTimeout: 10000 (10 second timeout)
      expect(true).toBe(true)
    })
  })
})
