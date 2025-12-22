/**
 * Tests for useAmiCallback composable
 *
 * Callback management system providing:
 * - Scheduling callbacks with priority management
 * - Execution with retry logic and auto-execute mode
 * - Event-based completion tracking via Hangup events
 * - Statistics tracking for success rates and queue management
 * - Input validation and sanitization for security
 *
 * @see src/composables/useAmiCallback.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiCallback } from '@/composables/useAmiCallback'
import type { AmiClient } from '@/core/AmiClient'
import { createMockAmiClient } from '../../utils/test-helpers'
import type { CallbackPriority, CallbackStatus, CallbackDisposition } from '@/types/callback.types'

/**
 * Test fixture: AMI event creator
 * Creates mock AMI events with proper structure
 */
function createAmiEvent(eventType: string, properties: Record<string, any> = {}) {
  return {
    Event: eventType,
    ...properties,
  }
}

/**
 * Test fixture: Mock AMI Client with typed interface
 * Extends basic mock client with originate and hangup capabilities
 */
interface MockAmiClient extends ReturnType<typeof createMockAmiClient> {
  originate: ReturnType<typeof vi.fn>
  hangupChannel: ReturnType<typeof vi.fn>
  _triggerEvent: (event: string, data: any) => void
}

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  phoneNumbers: {
    valid: {
      simple: '5551234567',
      withDashes: '+1-555-123-4567',
      withParens: '(555) 123-4567',
      withExtension: '555.123.4567 ext 123',
    },
    invalid: {
      empty: '',
      tooShort: 'ab',
      malicious: '<script>',
    },
  },
  callbacks: {
    basic: {
      callerNumber: '+1-555-123-4567',
      callerName: 'John Doe',
      reason: 'Sales inquiry',
      priority: 'high' as CallbackPriority,
    },
    alternate: {
      callerNumber: '555-111-1111',
      callerName: 'Jane Smith',
      reason: 'Support request',
      priority: 'normal' as CallbackPriority,
    },
    withHtml: {
      callerNumber: '555-123-4567',
      callerName: '<script>alert("xss")</script>John Doe',
      reason: '<img src=x onerror=alert(1)>Sales inquiry',
      targetQueue: '<b>sales</b>',
    },
  },
  priorities: ['low', 'normal', 'high', 'urgent'] as CallbackPriority[],
  dispositions: ['answered', 'busy', 'no_answer', 'failed', 'cancelled'] as CallbackDisposition[],
  statuses: ['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled'] as CallbackStatus[],
  timeouts: {
    short: 100,
    medium: 1000,
    long: 5000,
  },
} as const

/**
 * Factory functions for creating test objects
 */


/**
 * Factory: Create AMI originate response
 */
function createOriginateResponse(success: boolean = true, overrides?: any) {
  return {
    success,
    channel: success ? 'Local/555-123-4567@from-internal-00000001' : undefined,
    message: !success ? 'Channel unavailable' : undefined,
    ...overrides,
  }
}

/**
 * Factory: Create mock AMI client with callback capabilities
 */
function createMockCallbackClient(): MockAmiClient {
  const client = createMockAmiClient() as MockAmiClient
  client.originate = vi.fn().mockResolvedValue(createOriginateResponse(true))
  client.hangupChannel = vi.fn().mockResolvedValue(undefined)

  // Add event trigger method for testing
  client._triggerEvent = (event: string, data: any) => {
    const handlers = client.getEventHandlers()
    const handler = handlers.get(event)
    if (handler) {
      handler(data)
    }
  }

  return client
}

describe('useAmiCallback', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockCallbackClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  /**
   * Initial State Tests
   * Verify composable starts with correct defaults
   */
  describe('Initial State', () => {
    describe.each([
      {
        property: 'callbacks',
        description: 'empty callbacks array',
        getValue: (instance: any) => instance.callbacks.value,
        expected: [],
        matchType: 'toEqual' as const,
      },
      {
        property: 'activeCallback',
        description: 'no active callback',
        getValue: (instance: any) => instance.activeCallback.value,
        expected: null,
        matchType: 'toBe' as const,
      },
      {
        property: 'isLoading',
        description: 'loading false',
        getValue: (instance: any) => instance.isLoading.value,
        expected: false,
        matchType: 'toBe' as const,
      },
      {
        property: 'error',
        description: 'no error',
        getValue: (instance: any) => instance.error.value,
        expected: null,
        matchType: 'toBe' as const,
      },
      {
        property: 'isExecuting',
        description: 'not executing',
        getValue: (instance: any) => instance.isExecuting.value,
        expected: false,
        matchType: 'toBe' as const,
      },
      {
        property: 'pendingCount',
        description: 'pending count zero',
        getValue: (instance: any) => instance.pendingCount.value,
        expected: 0,
        matchType: 'toBe' as const,
      },
    ])('$property', ({ description, getValue, expected, matchType }) => {
      it(`should have ${description} initially`, () => {
        const instance = useAmiCallback(mockClient as unknown as AmiClient)
        const value = getValue(instance)

        if (matchType === 'toBe') {
          expect(value).toBe(expected)
        } else {
          expect(value).toEqual(expected)
        }
      })
    })

    it('should have default stats initially', () => {
      const { stats } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(stats.value.pending).toBe(0)
      expect(stats.value.scheduled).toBe(0)
      expect(stats.value.inProgress).toBe(0)
      expect(stats.value.completedToday).toBe(0)
      expect(stats.value.failedToday).toBe(0)
      expect(stats.value.successRate).toBe(0)
    })
  })

  /**
   * scheduleCallback Tests
   * Verify callback scheduling with validation and sanitization
   */
  describe('scheduleCallback', () => {
    it('should schedule a callback successfully', async () => {
      const onCallbackAdded = vi.fn()
      const { scheduleCallback, callbacks, pendingCount } = useAmiCallback(
        mockClient as unknown as AmiClient,
        { onCallbackAdded }
      )

      const callback = await scheduleCallback(TEST_FIXTURES.callbacks.basic)

      expect(callback.callerNumber).toBe(TEST_FIXTURES.callbacks.basic.callerNumber)
      expect(callback.callerName).toBe(TEST_FIXTURES.callbacks.basic.callerName)
      expect(callback.reason).toBe(TEST_FIXTURES.callbacks.basic.reason)
      expect(callback.priority).toBe(TEST_FIXTURES.callbacks.basic.priority)
      expect(callback.status).toBe('pending')
      expect(callback.attempts).toBe(0)
      expect(callbacks.value).toHaveLength(1)
      expect(pendingCount.value).toBe(1)
      expect(onCallbackAdded).toHaveBeenCalledWith(callback)
    })

    /**
     * Phone number validation tests
     * Verify security and format validation
     */
    describe('phone number validation', () => {
      describe.each([
        {
          description: 'empty string',
          phoneNumber: TEST_FIXTURES.phoneNumbers.invalid.empty,
          shouldReject: true,
        },
        {
          description: 'too short',
          phoneNumber: TEST_FIXTURES.phoneNumbers.invalid.tooShort,
          shouldReject: true,
        },
        {
          description: 'script tag injection',
          phoneNumber: TEST_FIXTURES.phoneNumbers.invalid.malicious,
          shouldReject: true,
        },
        {
          description: 'simple digits',
          phoneNumber: TEST_FIXTURES.phoneNumbers.valid.simple,
          shouldReject: false,
        },
        {
          description: 'with dashes',
          phoneNumber: TEST_FIXTURES.phoneNumbers.valid.withDashes,
          shouldReject: false,
        },
        {
          description: 'with parentheses',
          phoneNumber: TEST_FIXTURES.phoneNumbers.valid.withParens,
          shouldReject: false,
        },
        {
          description: 'with extension',
          phoneNumber: TEST_FIXTURES.phoneNumbers.valid.withExtension,
          shouldReject: false,
        },
      ])('$description: $phoneNumber', ({ phoneNumber, shouldReject }) => {
        it(`should ${shouldReject ? 'reject' : 'accept'} phone number`, async () => {
          const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient)

          if (shouldReject) {
            await expect(scheduleCallback({ callerNumber: phoneNumber }))
              .rejects.toThrow('Invalid phone number format')
          } else {
            await expect(scheduleCallback({ callerNumber: phoneNumber }))
              .resolves.toBeDefined()
          }
        })
      })
    })

    /**
     * HTML sanitization tests
     * Verify XSS protection in user input
     */
    it('should sanitize HTML tags from user input fields', async () => {
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      const callback = await scheduleCallback(TEST_FIXTURES.callbacks.withHtml)

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

  /**
   * executeCallback Tests
   * Verify callback execution with state management and error handling
   */
  describe('executeCallback', () => {
    /**
     * Error condition tests
     * Verify proper error handling for invalid states
     */
    describe('error conditions', () => {
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

  /**
   * Event Handling Tests
   * Verify proper handling of AMI Hangup events for completion tracking
   */
  describe('event handling', () => {
    /**
     * Hangup event tests
     * Verify disposition mapping based on hangup cause codes
     */
    describe.each([
      {
        description: 'normal clearing (answered)',
        cause: '16',
        causeTxt: 'Normal Clearing',
        expectedDisposition: 'answered' as CallbackDisposition,
        expectedStatus: 'completed' as CallbackStatus,
      },
      {
        description: 'user busy',
        cause: '17',
        causeTxt: 'User Busy',
        expectedDisposition: 'busy' as CallbackDisposition,
        expectedStatus: 'failed' as CallbackStatus, // Busy with maxAttempts=1 becomes failed
      },
    ])('hangup with $description', ({ cause, causeTxt, expectedDisposition, expectedStatus }) => {
      it(`should set disposition to ${expectedDisposition}`, async () => {
        mockClient.originate = vi.fn().mockResolvedValue(
          createOriginateResponse(true, { channel: 'Local/555-123-4567@from-internal-00000001' })
        )

        const onCallbackCompleted = vi.fn()
        const { scheduleCallback, executeCallback, activeCallback, callbacks } = useAmiCallback(
          mockClient as unknown as AmiClient,
          { onCallbackCompleted, defaultMaxAttempts: 1 }
        )

        const callback = await scheduleCallback({ callerNumber: '555-123-4567', maxAttempts: 1 })
        await executeCallback(callback.id)

        // Simulate hangup event with proper structure (data wrapped in event object)
        mockClient._triggerEvent('hangup', {
          data: createAmiEvent('Hangup', {
            Channel: 'Local/555-123-4567@from-internal-00000001',
            Cause: cause,
            CauseTxt: causeTxt,
          }),
        })

        await nextTick()

        // First hangup event should clear active callback
        if (expectedDisposition === 'answered') {
          expect(activeCallback.value).toBeNull()
          expect(onCallbackCompleted).toHaveBeenCalled()
        }

        const completed = callbacks.value.find(cb => cb.id === callback.id)
        expect(completed?.status).toBe(expectedStatus)
        expect(completed?.disposition).toBe(expectedDisposition)
      })
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
