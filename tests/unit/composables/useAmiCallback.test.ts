/**
 * useAmiCallback composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiCallback } from '@/composables/useAmiCallback'
import type { AmiClient } from '@/core/AmiClient'
import type {  } from '@/types/callback.types'
import {
  createMockAmiClient,
  createAmiEvent,
  type MockAmiClient,
} from '../utils/mockFactories'

describe('useAmiCallback', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have empty callbacks initially', () => {
      const { callbacks } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(callbacks.value).toHaveLength(0)
    })

    it('should have no active callback initially', () => {
      const { activeCallback } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(activeCallback.value).toBeNull()
    })

    it('should have default stats', () => {
      const { stats } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(stats.value.pending).toBe(0)
      expect(stats.value.scheduled).toBe(0)
      expect(stats.value.inProgress).toBe(0)
      expect(stats.value.completedToday).toBe(0)
      expect(stats.value.failedToday).toBe(0)
      expect(stats.value.successRate).toBe(0)
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(error.value).toBeNull()
    })

    it('should not be executing initially', () => {
      const { isExecuting } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(isExecuting.value).toBe(false)
    })

    it('should have pending count of 0 initially', () => {
      const { pendingCount } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(pendingCount.value).toBe(0)
    })
  })

  describe('scheduleCallback', () => {
    it('should schedule a callback successfully', async () => {
      const onCallbackAdded = vi.fn()
      const { scheduleCallback, callbacks, pendingCount } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackAdded }
      )

      const callback = await scheduleCallback({
        callerNumber: '+1-555-123-4567',
        callerName: 'John Doe',
        reason: 'Sales inquiry',
        priority: 'high',
      })

      expect(callback.callerNumber).toBe('+1-555-123-4567')
      expect(callback.callerName).toBe('John Doe')
      expect(callback.reason).toBe('Sales inquiry')
      expect(callback.priority).toBe('high')
      expect(callback.status).toBe('pending')
      expect(callback.attempts).toBe(0)
      expect(callbacks.value).toHaveLength(1)
      expect(pendingCount.value).toBe(1)
      expect(onCallbackAdded).toHaveBeenCalledWith(callback)
    })

    it('should reject invalid phone numbers', async () => {
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(scheduleCallback({ callerNumber: '' })).rejects.toThrow('Invalid phone number format')
      await expect(scheduleCallback({ callerNumber: 'ab' })).rejects.toThrow('Invalid phone number format')
      await expect(scheduleCallback({ callerNumber: '<script>' })).rejects.toThrow('Invalid phone number format')
    })

    it('should accept valid phone number formats', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '5551234567' })
      await scheduleCallback({ callerNumber: '+1-555-123-4567' })
      await scheduleCallback({ callerNumber: '(555) 123-4567' })
      await scheduleCallback({ callerNumber: '555.123.4567 ext 123' })

      expect(callbacks.value).toHaveLength(4)
    })

    it('should sanitize HTML tags from user input fields', async () => {
      const { scheduleCallback, callbacks: _callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      const callback = await scheduleCallback({
        callerNumber: '555-123-4567',
        callerName: '<script>alert("xss")</script>John Doe',
        reason: '<img src=x onerror=alert(1)>Sales inquiry',
        targetQueue: '<b>sales</b>',
      })

      expect(callback.callerName).toBe('alert("xss")John Doe')
      expect(callback.reason).toBe('Sales inquiry')
      expect(callback.targetQueue).toBe('sales')
    })

    it('should schedule callback for future time', async () => {
      const { scheduleCallback, scheduledCallbacks, pendingCallbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const futureTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      const callback = await scheduleCallback({
        callerNumber: '555-123-4567',
        scheduledAt: futureTime,
      })

      expect(callback.status).toBe('scheduled')
      expect(callback.scheduledAt).toEqual(futureTime)
      expect(scheduledCallbacks.value).toHaveLength(1)
      expect(pendingCallbacks.value).toHaveLength(0) // Not yet due
    })

    it('should use default values from options', async () => {
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient, {
        defaultQueue: 'sales',
        defaultMaxAttempts: 5,
      })

      const callback = await scheduleCallback({
        callerNumber: '555-123-4567',
      })

      expect(callback.targetQueue).toBe('sales')
      expect(callback.maxAttempts).toBe(5)
    })
  })

  describe('executeCallback', () => {
    it('should throw if client is null', async () => {
      const { scheduleCallback, executeCallback } = useAmiCallback(null)

      // Schedule without client works
      await expect(scheduleCallback({ callerNumber: '555-123-4567' })).resolves.toBeDefined()

      // But executing fails
      await expect(executeCallback('any-id')).rejects.toThrow('AMI client not connected')
    })

    it('should throw if callback not found', async () => {
      const { executeCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(executeCallback('nonexistent')).rejects.toThrow('Callback not found')
    })

    it('should throw if already executing', async () => {
      mockClient.originate = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves

      const { scheduleCallback, executeCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      const cb1 = await scheduleCallback({ callerNumber: '555-111-1111' })
      const cb2 = await scheduleCallback({ callerNumber: '555-222-2222' })

      // Start first callback (will hang)
      const _exec1Promise = executeCallback(cb1.id)
      await nextTick()

      // Try to start second callback
      await expect(executeCallback(cb2.id)).rejects.toThrow('Another callback is already in progress')

      // Cleanup
      mockClient.originate.mockResolvedValue({ success: false })
    })

    it('should execute callback successfully', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/555-123-4567@from-internal-00000001',
      })

      const onCallbackStarted = vi.fn()
      const { scheduleCallback, executeCallback, activeCallback, isExecuting } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackStarted }
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      await executeCallback(callback.id)

      expect(mockClient.originate).toHaveBeenCalled()
      expect(onCallbackStarted).toHaveBeenCalled()
      expect(activeCallback.value).not.toBeNull()
      expect(activeCallback.value?.status).toBe('in_progress')
      expect(activeCallback.value?.attempts).toBe(1)
      expect(isExecuting.value).toBe(true)
    })

    it('should handle execution failure', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: false,
        message: 'Channel unavailable',
      })

      const { scheduleCallback, executeCallback, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { retryDelay: 60 }
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })

      await expect(executeCallback(callback.id)).rejects.toThrow('Channel unavailable')

      // Should be scheduled for retry
      const updatedCallback = callbacks.value.find(cb => cb.id === callback.id)
      expect(updatedCallback?.status).toBe('pending')
      expect(updatedCallback?.attempts).toBe(1)
    })

    it('should mark as failed after max attempts', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: false,
        message: 'Channel unavailable',
      })

      const onCallbackFailed = vi.fn()
      const { scheduleCallback, executeCallback, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackFailed }
      )

      const callback = await scheduleCallback({
        callerNumber: '555-123-4567',
        maxAttempts: 1, // Only 1 attempt allowed - should fail immediately
      })

      // First (and only) attempt
      await expect(executeCallback(callback.id)).rejects.toThrow()

      const updatedCallback = callbacks.value.find(cb => cb.id === callback.id)
      expect(updatedCallback?.status).toBe('failed')
      expect(onCallbackFailed).toHaveBeenCalled()
    })
  })

  describe('executeNext', () => {
    it('should throw if no pending callbacks', async () => {
      const { executeNext } = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(executeNext()).rejects.toThrow('No pending callbacks')
    })

    it('should execute highest priority callback first', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/test-00000001',
      })

      const { scheduleCallback, executeNext, activeCallback, nextCallback } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      await scheduleCallback({ callerNumber: '555-111-1111', priority: 'low' })
      await scheduleCallback({ callerNumber: '555-222-2222', priority: 'urgent' })
      await scheduleCallback({ callerNumber: '555-333-3333', priority: 'high' })

      // Before executing, verify nextCallback points to urgent (highest priority)
      expect(nextCallback.value?.callerNumber).toBe('555-222-2222')

      await executeNext()

      // After executing, the urgent callback should be the active one
      expect(activeCallback.value?.callerNumber).toBe('555-222-2222')
    })

    it('should execute oldest callback within same priority', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/test-00000001',
      })

      const { scheduleCallback, executeNext, activeCallback, nextCallback } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      // Schedule in order with same priority
      await scheduleCallback({ callerNumber: '555-444-1111', priority: 'normal' })
      await scheduleCallback({ callerNumber: '555-444-2222', priority: 'normal' })

      // Before executing, verify nextCallback points to the oldest (first scheduled)
      expect(nextCallback.value?.callerNumber).toBe('555-444-1111')

      await executeNext()

      expect(activeCallback.value?.callerNumber).toBe('555-444-1111')
    })
  })

  describe('cancelCallback', () => {
    it('should cancel a pending callback', async () => {
      const onCallbackCancelled = vi.fn()
      const { scheduleCallback, cancelCallback, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackCancelled }
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      await cancelCallback(callback.id, 'No longer needed')

      const cancelled = callbacks.value.find(cb => cb.id === callback.id)
      expect(cancelled?.status).toBe('cancelled')
      expect(cancelled?.notes).toContain('No longer needed')
      expect(onCallbackCancelled).toHaveBeenCalled()
    })

    it('should hangup channel if callback is in progress', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/555-123-4567@from-internal-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

      const { scheduleCallback, executeCallback, cancelCallback } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      await executeCallback(callback.id)
      await cancelCallback(callback.id)

      expect(mockClient.hangupChannel).toHaveBeenCalled()
    })
  })

  describe('rescheduleCallback', () => {
    it('should reschedule a pending callback', async () => {
      const { scheduleCallback, rescheduleCallback, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      const newTime = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

      await rescheduleCallback(callback.id, newTime)

      const rescheduled = callbacks.value.find(cb => cb.id === callback.id)
      expect(rescheduled?.status).toBe('scheduled')
      expect(rescheduled?.scheduledAt).toEqual(newTime)
    })

    it('should throw when rescheduling completed callback', async () => {
      const { scheduleCallback, markCompleted, rescheduleCallback } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      markCompleted(callback.id)

      const newTime = new Date(Date.now() + 60 * 60 * 1000)
      await expect(rescheduleCallback(callback.id, newTime)).rejects.toThrow('Cannot reschedule completed callback')
    })
  })

  describe('priority management', () => {
    it('should update callback priority', () => {
      const { scheduleCallback, updatePriority, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      scheduleCallback({ callerNumber: '555-123-4567', priority: 'normal' }).then(callback => {
        updatePriority(callback.id, 'urgent')

        const updated = callbacks.value.find(cb => cb.id === callback.id)
        expect(updated?.priority).toBe('urgent')
      })
    })
  })

  describe('notes management', () => {
    it('should add notes to callback', async () => {
      const { scheduleCallback, addNotes, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      addNotes(callback.id, 'First note')
      addNotes(callback.id, 'Second note')

      const updated = callbacks.value.find(cb => cb.id === callback.id)
      expect(updated?.notes).toContain('First note')
      expect(updated?.notes).toContain('Second note')
    })
  })

  describe('computed properties', () => {
    it('should compute pendingCallbacks correctly', async () => {
      const { scheduleCallback, pendingCallbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '555-111-1111' })
      await scheduleCallback({ callerNumber: '555-222-2222' })
      await scheduleCallback({
        callerNumber: '555-333-3333',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // Future
      })

      expect(pendingCallbacks.value).toHaveLength(2)
    })

    it('should compute completedCallbacks correctly', async () => {
      const { scheduleCallback, markCompleted, completedCallbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const cb1 = await scheduleCallback({ callerNumber: '555-111-1111' })
      const _cb2 = await scheduleCallback({ callerNumber: '555-222-2222' })

      markCompleted(cb1.id)

      expect(completedCallbacks.value).toHaveLength(1)
      expect(completedCallbacks.value[0].callerNumber).toBe('555-111-1111')
    })

    it('should compute nextCallback correctly', async () => {
      const { scheduleCallback, nextCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      expect(nextCallback.value).toBeNull()

      await scheduleCallback({ callerNumber: '555-111-1111', priority: 'low' })
      expect(nextCallback.value?.priority).toBe('low')

      await scheduleCallback({ callerNumber: '555-222-2222', priority: 'high' })
      expect(nextCallback.value?.priority).toBe('high')
    })
  })

  describe('auto-execute', () => {
    it('should start auto-execute mode', () => {
      const { autoExecuteEnabled, startAutoExecute } = useAmiCallback(mockClient as unknown as AmiClient)

      expect(autoExecuteEnabled.value).toBe(false)

      startAutoExecute()

      expect(autoExecuteEnabled.value).toBe(true)
    })

    it('should stop auto-execute mode', () => {
      const { autoExecuteEnabled, startAutoExecute, stopAutoExecute } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      startAutoExecute()
      expect(autoExecuteEnabled.value).toBe(true)

      stopAutoExecute()
      expect(autoExecuteEnabled.value).toBe(false)
    })

    it('should auto-execute when configured', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/test-00000001',
      })

      const { scheduleCallback, activeCallback: _activeCallback } = useAmiCallback(mockClient as unknown as AmiClient, {
        autoExecute: true,
        autoExecuteInterval: 1000,
      })

      await scheduleCallback({ callerNumber: '555-123-4567' })

      // Advance timer
      vi.advanceTimersByTime(1000)
      await nextTick()

      expect(mockClient.originate).toHaveBeenCalled()
    })
  })

  describe('queue management', () => {
    it('should clear completed callbacks', async () => {
      const { scheduleCallback, markCompleted, clearCompleted, callbacks, completedCallbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const cb1 = await scheduleCallback({ callerNumber: '555-111-1111' })
      const _cb2 = await scheduleCallback({ callerNumber: '555-222-2222' })

      markCompleted(cb1.id)
      expect(completedCallbacks.value).toHaveLength(1)

      clearCompleted()

      expect(completedCallbacks.value).toHaveLength(0)
      expect(callbacks.value).toHaveLength(1) // Only pending one remains
    })

    it('should clear failed callbacks', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: false,
        message: 'Failed',
      })

      const { scheduleCallback, executeCallback, clearFailed, failedCallbacks, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const cb = await scheduleCallback({
        callerNumber: '555-123-4567',
        maxAttempts: 1,
      })

      await expect(executeCallback(cb.id)).rejects.toThrow()
      expect(failedCallbacks.value).toHaveLength(1)

      clearFailed()

      expect(failedCallbacks.value).toHaveLength(0)
      expect(callbacks.value).toHaveLength(0)
    })
  })

  describe('getCallback', () => {
    it('should return callback by ID', async () => {
      const { scheduleCallback, getCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })

      const found = getCallback(callback.id)
      expect(found).toBeDefined()
      expect(found?.callerNumber).toBe('555-123-4567')
    })

    it('should return undefined for nonexistent ID', () => {
      const { getCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      const found = getCallback('nonexistent')
      expect(found).toBeUndefined()
    })
  })

  describe('getCallbacksForNumber', () => {
    it('should return callbacks matching phone number', async () => {
      const { scheduleCallback, getCallbacksForNumber } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '555-123-4567' })
      await scheduleCallback({ callerNumber: '555-123-9999' })
      await scheduleCallback({ callerNumber: '555-999-0000' })

      const matches = getCallbacksForNumber('555-123')
      expect(matches).toHaveLength(2)
    })
  })

  describe('stats', () => {
    it('should update stats on changes', async () => {
      const { scheduleCallback, markCompleted: _markCompleted, stats } = useAmiCallback(mockClient as unknown as AmiClient)

      expect(stats.value.pending).toBe(0)

      await scheduleCallback({ callerNumber: '555-111-1111', priority: 'high' })
      await scheduleCallback({ callerNumber: '555-222-2222', priority: 'low' })

      expect(stats.value.pending).toBe(2)
      expect(stats.value.byPriority.high).toBe(1)
      expect(stats.value.byPriority.low).toBe(1)
    })

    it('should calculate success rate', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/test',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

      const { scheduleCallback, markCompleted, refreshStats, stats, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      const cb1 = await scheduleCallback({ callerNumber: '555-111-1111' })
      const cb2 = await scheduleCallback({ callerNumber: '555-222-2222' })

      markCompleted(cb1.id, 'answered')

      // Mark cb2 as failed manually
      const idx = callbacks.value.findIndex(cb => cb.id === cb2.id)
      if (idx !== -1) {
        callbacks.value[idx] = {
          ...callbacks.value[idx],
          status: 'failed',
          completedAt: new Date(),
        }
      }

      // Manually refresh stats after mutation
      refreshStats()

      expect(stats.value.successRate).toBe(50)
    })
  })

  describe('event handling', () => {
    it('should handle hangup event for active callback', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/555-123-4567@from-internal-00000001',
      })

      const onCallbackCompleted = vi.fn()
      const { scheduleCallback, executeCallback, activeCallback, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackCompleted }
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      await executeCallback(callback.id)

      // Simulate hangup event
      mockClient._triggerEvent(
        'hangup',
        createAmiEvent('Hangup', {
          Channel: 'Local/555-123-4567@from-internal-00000001',
          Cause: '16', // Normal clearing
          CauseTxt: 'Normal Clearing',
        })
      )

      await nextTick()

      expect(activeCallback.value).toBeNull()
      expect(onCallbackCompleted).toHaveBeenCalled()

      const completed = callbacks.value.find(cb => cb.id === callback.id)
      expect(completed?.status).toBe('completed')
      expect(completed?.disposition).toBe('answered')
    })

    it('should handle hangup with busy cause', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/555-123-4567@from-internal-00000001',
      })

      const { scheduleCallback, executeCallback, callbacks } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { defaultMaxAttempts: 1 }
      )

      const callback = await scheduleCallback({
        callerNumber: '555-123-4567',
        maxAttempts: 1,
      })
      await executeCallback(callback.id)

      // Simulate hangup with busy
      mockClient._triggerEvent(
        'hangup',
        createAmiEvent('Hangup', {
          Channel: 'Local/555-123-4567@from-internal-00000001',
          Cause: '17', // User busy
          CauseTxt: 'User Busy',
        })
      )

      await nextTick()

      const completed = callbacks.value.find(cb => cb.id === callback.id)
      expect(completed?.disposition).toBe('busy')
    })
  })

  describe('callbacks', () => {
    it('should call onCallbackAdded', async () => {
      const onCallbackAdded = vi.fn()
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient, { onCallbackAdded })

      await scheduleCallback({ callerNumber: '555-123-4567' })

      expect(onCallbackAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          callerNumber: '555-123-4567',
        })
      )
    })

    it('should call onCallbackStarted', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/test',
      })

      const onCallbackStarted = vi.fn()
      const { scheduleCallback, executeCallback } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackStarted }
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      await executeCallback(callback.id)

      expect(onCallbackStarted).toHaveBeenCalled()
    })

    it('should call onCallbackCancelled', async () => {
      const onCallbackCancelled = vi.fn()
      const { scheduleCallback, cancelCallback } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackCancelled }
      )

      const callback = await scheduleCallback({ callerNumber: '555-123-4567' })
      await cancelCallback(callback.id)

      expect(onCallbackCancelled).toHaveBeenCalled()
    })
  })
})
