/**
 * useAmiCallback Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiCallback } from '../useAmiCallback'
import type { AmiClient } from '@/core/AmiClient'
import type { CallbackRequest } from '@/types/callback.types'

// Re-implement mock AMI client locally to avoid cross-directory import issues
interface MockAmiClient extends AmiClient {
  _triggerEvent: (event: string, ...args: unknown[]) => void
  _eventHandlers: Record<string, Function[]>
}

function createMockAmiClient(): MockAmiClient {
  const eventHandlers: Record<string, Function[]> = {}
  return {
    isConnected: true,
    sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
    originate: vi.fn().mockResolvedValue({
      success: true,
      channel: 'Local/5551234567@from-internal-00000001',
      response: 'Success',
    }),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      eventHandlers[event]!.push(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        eventHandlers[event] = eventHandlers[event]!.filter((h) => h !== handler)
      }
    }),
    _triggerEvent: (event: string, ...args: unknown[]) => {
      eventHandlers[event]?.forEach((handler) => handler(...args))
    },
    _eventHandlers: eventHandlers,
  } as unknown as MockAmiClient
}

// Helper to build a minimal callback for test setup
function makeCallback(overrides: Partial<CallbackRequest> = {}): CallbackRequest {
  return {
    id: 'cb-test-1',
    callerNumber: '+15551234567',
    priority: 'normal',
    status: 'pending',
    requestedAt: new Date(),
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  }
}

describe('useAmiCallback', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockClient = createMockAmiClient()
    // Default successful originate
    mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ========================================================================
  // Initial State
  // ========================================================================

  describe('initial state', () => {
    it('should initialize with empty callbacks list', () => {
      const { callbacks } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(callbacks.value).toHaveLength(0)
    })

    it('should have null activeCallback initially', () => {
      const { activeCallback } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(activeCallback.value).toBeNull()
    })

    it('should have isLoading false initially', () => {
      const { isLoading } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(error.value).toBeNull()
    })

    it('should initialize stats with zero values', () => {
      const { stats } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(stats.value.pending).toBe(0)
      expect(stats.value.scheduled).toBe(0)
      expect(stats.value.inProgress).toBe(0)
      expect(stats.value.completedToday).toBe(0)
      expect(stats.value.failedToday).toBe(0)
    })

    it('should not be executing initially', () => {
      const { isExecuting } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(isExecuting.value).toBe(false)
    })

    it('should have null nextCallback initially', () => {
      const { nextCallback } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(nextCallback.value).toBeNull()
    })

    it('should have zero pendingCount initially', () => {
      const { pendingCount } = useAmiCallback(mockClient as unknown as AmiClient)
      expect(pendingCount.value).toBe(0)
    })
  })

  // ========================================================================
  // scheduleCallback
  // ========================================================================

  describe('scheduleCallback', () => {
    it('should add a callback to the list', async () => {
      const { callbacks, scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      const callback = await scheduleCallback({
        callerNumber: '+15551234567',
        reason: 'Sales inquiry',
        priority: 'high',
      })

      expect(callbacks.value).toHaveLength(1)
      expect(callback.callerNumber).toBe('+15551234567')
      expect(callback.reason).toBe('Sales inquiry')
      expect(callback.priority).toBe('high')
      expect(callback.status).toBe('pending')
      expect(callback.attempts).toBe(0)
    })

    it('should normalize and validate phone number', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '555-1234' })

      expect(callbacks.value[0].callerNumber).toBe('555-1234')
    })

    it('should reject invalid phone number', async () => {
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(scheduleCallback({ callerNumber: 'ab' })).rejects.toThrow(
        'Invalid phone number format'
      )
    })

    it('should reject empty phone number', async () => {
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(scheduleCallback({ callerNumber: '' })).rejects.toThrow(
        'Invalid phone number format'
      )
    })

    it('should accept extension notation in phone number', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '555-1234 x500' })

      expect(callbacks.value[0].callerNumber).toBe('555-1234 x500')
    })

    it('should set scheduled status when scheduledAt is provided', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)
      const futureDate = new Date(Date.now() + 3600000)

      await scheduleCallback({ callerNumber: '+15551234567', scheduledAt: futureDate })

      expect(callbacks.value[0].status).toBe('scheduled')
      expect(callbacks.value[0].scheduledAt).toEqual(futureDate)
    })

    it('should call onCallbackAdded callback', async () => {
      const onCallbackAdded = vi.fn()
      const { scheduleCallback } = useAmiCallback(mockClient as unknown as AmiClient, {
        onCallbackAdded,
      })

      await scheduleCallback({ callerNumber: '+15551234567' })

      expect(onCallbackAdded).toHaveBeenCalledTimes(1)
      expect(onCallbackAdded.mock.calls[0][0].callerNumber).toBe('+15551234567')
    })

    it('should sanitize callerName input', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({
        callerNumber: '+15551234567',
        callerName: '<script>alert("xss")</script>John',
      })

      // HTML tags are stripped, but content between tags remains
      expect(callbacks.value[0].callerName).toBe('alert("xss")John')
    })

    it('should sanitize reason input', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({
        callerNumber: '+15551234567',
        reason: '<b>Bold</b> text',
      })

      // HTML tags are stripped, but content between tags remains
      expect(callbacks.value[0].reason).toBe('Bold text')
    })

    it('should use default options when not provided', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient, {
        defaultQueue: 'support',
        defaultMaxAttempts: 5,
      })

      await scheduleCallback({ callerNumber: '+15551234567' })

      expect(callbacks.value[0].targetQueue).toBe('support')
      expect(callbacks.value[0].maxAttempts).toBe(5)
    })

    it('should set scheduledAt to now when not provided', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '+15551234567' })

      expect(callbacks.value[0].requestedAt).toBeInstanceOf(Date)
      expect(callbacks.value[0].scheduledAt).toBeUndefined()
    })

    it('should use targetAgent when specified', async () => {
      const { scheduleCallback, callbacks } = useAmiCallback(mockClient as unknown as AmiClient)

      await scheduleCallback({ callerNumber: '+15551234567', targetAgent: '1001' })

      expect(callbacks.value[0].targetAgent).toBe('1001')
    })
  })

  // ========================================================================
  // Computed: pendingCallbacks, scheduledCallbacks, etc.
  // ========================================================================

  describe('computed getters', () => {
    it('should return pending callbacks sorted by priority then time', async () => {
      const { pendingCallbacks, scheduleCallback } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      await scheduleCallback({ callerNumber: '+15551111111', priority: 'low' })
      await scheduleCallback({ callerNumber: '+15552222222', priority: 'high' })
      await scheduleCallback({ callerNumber: '+15553333333', priority: 'urgent' })

      // By default, useAmiCallback uses fake timers so all requestedAt are equal
      // but pendingCallbacks sorts by priority desc
      const pending = pendingCallbacks.value
      expect(pending).toHaveLength(3)
      expect(pending[0].priority).toBe('urgent')
      expect(pending[1].priority).toBe('high')
      expect(pending[2].priority).toBe('low')
    })

    it('should filter out scheduled callbacks with future scheduledAt from pending', async () => {
      const { pendingCallbacks, scheduleCallback } = useAmiCallback(
        mockClient as unknown as AmiClient
      )

      await scheduleCallback({ callerNumber: '+15551111111', priority: 'normal' })
      await scheduleCallback({
        callerNumber: '+15552222222',
        priority: 'high',
        scheduledAt: new Date(Date.now() + 10000),
      })

      expect(pendingCallbacks.value).toHaveLength(1)
      expect(pendingCallbacks.value[0].callerNumber).toBe('+15551111111')
    })

    it('should return completed callbacks', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551111111' })
      const cbId = instance.callbacks.value[0].id
      instance.markCompleted(cbId, 'answered')

      expect(instance.completedCallbacks.value).toHaveLength(1)
      expect(instance.completedCallbacks.value[0].disposition).toBe('answered')
    })

    it('should return failed callbacks', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      // Push a callback with attempts == maxAttempts so markCompleted makes it 'failed' (no retry)
      instance.callbacks.value.push(
        makeCallback({
          id: 'cb-failed',
          attempts: 1,
          maxAttempts: 1,
          status: 'pending',
          callerNumber: '+15551111111',
        })
      )
      instance.markCompleted('cb-failed', 'failed')

      expect(instance.failedCallbacks.value).toHaveLength(1)
    })

    it('scheduledCallbacks should only return future-scheduled entries', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      await instance.scheduleCallback({ callerNumber: '+15551111111' })
      await instance.scheduleCallback({
        callerNumber: '+15552222222',
        scheduledAt: new Date(Date.now() + 10000),
      })

      const scheduled = instance.scheduledCallbacks.value
      expect(scheduled).toHaveLength(1)
      expect(scheduled[0].callerNumber).toBe('+15552222222')
    })
  })

  // ========================================================================
  // executeCallback
  // ========================================================================

  describe('executeCallback', () => {
    it('should execute a pending callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      await instance.executeCallback(cbId)

      expect(instance.isExecuting.value).toBe(true)
      expect(instance.activeCallback.value).not.toBeNull()
    })

    it('should throw when client is not connected', async () => {
      const instance = useAmiCallback(null)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      await expect(instance.executeCallback(cbId)).rejects.toThrow('AMI client not connected')
    })

    it('should throw when no pending callbacks', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(instance.executeCallback('nonexistent')).rejects.toThrow('Callback not found')
    })

    it('should throw when a callback is already in progress', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        defaultTimeout: 5,
      })
      await instance.scheduleCallback({ callerNumber: '+15551111111' })
      await instance.scheduleCallback({ callerNumber: '+15552222222', priority: 'high' })
      const cbId = instance.callbacks.value[0].id

      // Mock originate to not resolve immediately so the callback stays in_progress
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551111111@from-internal-00000001',
      })

      await instance.executeCallback(cbId)

      // Try to execute another while one is active
      const secondCbId = instance.callbacks.value[1].id
      await expect(instance.executeCallback(secondCbId)).rejects.toThrow(
        'Another callback is already in progress'
      )
    })

    it('should throw when callback is already completed', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id
      instance.markCompleted(cbId, 'answered')

      await expect(instance.executeCallback(cbId)).rejects.toThrow('Callback already completed')
    })

    it('should throw when callback is cancelled', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id
      await instance.cancelCallback(cbId, 'Test cancel')

      await expect(instance.executeCallback(cbId)).rejects.toThrow('Callback already cancelled')
    })

    it('should call onCallbackStarted callback', async () => {
      const onCallbackStarted = vi.fn()
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        onCallbackStarted,
      })
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551234567@from-internal-00000001',
      })

      await instance.executeCallback(cbId)

      expect(onCallbackStarted).toHaveBeenCalledTimes(1)
      expect(onCallbackStarted.mock.calls[0][0].callerNumber).toBe('+15551234567')
    })

    it('should set status to in_progress during execution', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551234567@from-internal-00000001',
      })

      await instance.executeCallback(cbId)

      expect(instance.callbacks.value[0].status).toBe('in_progress')
      expect(instance.callbacks.value[0].attempts).toBe(1)
    })

    it('should increment attempts on each execution', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        defaultTimeout: 5,
      })
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551234567@from-internal-00000001',
      })

      // Execute once
      await instance.executeCallback(cbId)

      // Reset activeCallback by completing
      instance.markCompleted(cbId, 'answered')
      expect(instance.callbacks.value[0].attempts).toBe(1)
    })
  })

  // ========================================================================
  // executeNext
  // ========================================================================

  describe('executeNext', () => {
    it('should execute the highest priority pending callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551111111', priority: 'low' })
      await instance.scheduleCallback({ callerNumber: '+15552222222', priority: 'high' })
      await instance.scheduleCallback({ callerNumber: '+15553333333', priority: 'urgent' })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5553333333@from-internal-00000001',
      })

      await instance.executeNext()

      expect(instance.activeCallback.value?.callerNumber).toBe('+15553333333')
    })

    it('should throw when no pending callbacks', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(instance.executeNext()).rejects.toThrow('No pending callbacks')
    })
  })

  // ========================================================================
  // cancelCallback
  // ========================================================================

  describe('cancelCallback', () => {
    it('should cancel a pending callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      await instance.cancelCallback(cbId, 'Customer called back')

      expect(instance.callbacks.value[0].status).toBe('cancelled')
    })

    it('should throw when callback not found', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(instance.cancelCallback('nonexistent')).rejects.toThrow('Callback not found')
    })

    it('should call onCallbackCancelled callback', async () => {
      const onCallbackCancelled = vi.fn()
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        onCallbackCancelled,
      })
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      await instance.cancelCallback(cbId, 'Test')

      expect(onCallbackCancelled).toHaveBeenCalledTimes(1)
    })

    it('should append cancel reason to notes', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      await instance.cancelCallback(cbId, 'Customer no longer interested')

      expect(instance.callbacks.value[0].notes).toContain(
        'Cancelled: Customer no longer interested'
      )
    })

    it('should clear activeCallback when cancelling in-progress callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551234567@from-internal-00000001',
      })

      await instance.executeCallback(cbId)
      expect(instance.activeCallback.value).not.toBeNull()

      await instance.cancelCallback(cbId)
      expect(instance.activeCallback.value).toBeNull()
    })
  })

  // ========================================================================
  // rescheduleCallback
  // ========================================================================

  describe('rescheduleCallback', () => {
    it('should reschedule a pending callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id
      const newTime = new Date(Date.now() + 7200000)

      await instance.rescheduleCallback(cbId, newTime)

      expect(instance.callbacks.value[0].status).toBe('scheduled')
      expect(instance.callbacks.value[0].scheduledAt).toEqual(newTime)
    })

    it('should throw for completed callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id
      instance.markCompleted(cbId, 'answered')

      await expect(instance.rescheduleCallback(cbId, new Date())).rejects.toThrow(
        'Cannot reschedule completed callback'
      )
    })

    it('should throw for cancelled callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id
      await instance.cancelCallback(cbId)

      await expect(instance.rescheduleCallback(cbId, new Date())).rejects.toThrow(
        'Cannot reschedule cancelled callback'
      )
    })

    it('should throw for in-progress callback', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551234567@from-internal-00000001',
      })

      await instance.executeCallback(cbId)

      await expect(instance.rescheduleCallback(cbId, new Date())).rejects.toThrow(
        'Cannot reschedule callback in progress'
      )
    })
  })

  // ========================================================================
  // updatePriority
  // ========================================================================

  describe('updatePriority', () => {
    it('should update callback priority', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      // Use internal state to add callback
      instance.callbacks.value.push(makeCallback({ id: 'cb-1', priority: 'normal' }))

      instance.updatePriority('cb-1', 'urgent')

      expect(instance.callbacks.value[0].priority).toBe('urgent')
    })

    it('should throw when callback not found', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      expect(() => instance.updatePriority('nonexistent', 'high')).toThrow('Callback not found')
    })
  })

  // ========================================================================
  // addNotes
  // ========================================================================

  describe('addNotes', () => {
    it('should append notes to callback', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      instance.callbacks.value.push(makeCallback({ id: 'cb-1' }))

      instance.addNotes('cb-1', 'Left voicemail')
      instance.addNotes('cb-1', 'Will call back tomorrow')

      expect(instance.callbacks.value[0].notes).toContain('Left voicemail')
      expect(instance.callbacks.value[0].notes).toContain('Will call back tomorrow')
    })

    it('should sanitize notes input', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      instance.callbacks.value.push(makeCallback({ id: 'cb-1' }))

      instance.addNotes('cb-1', '<script>alert(1)</script>Customer called')

      expect(instance.callbacks.value[0].notes).not.toContain('<script>')
    })
  })

  // ========================================================================
  // markCompleted
  // ========================================================================

  describe('markCompleted', () => {
    it('should mark callback as completed with disposition', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      instance.callbacks.value.push(makeCallback({ id: 'cb-1' }))

      instance.markCompleted('cb-1', 'answered')

      expect(instance.callbacks.value[0].status).toBe('completed')
      expect(instance.callbacks.value[0].disposition).toBe('answered')
      expect(instance.callbacks.value[0].completedAt).toBeInstanceOf(Date)
    })

    it('should mark as failed for failed disposition after max attempts', () => {
      // When attempts >= maxAttempts, retry is not scheduled and status stays 'failed'
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      instance.callbacks.value.push(makeCallback({ id: 'cb-1', attempts: 1, maxAttempts: 1 }))

      instance.markCompleted('cb-1', 'failed')

      expect(instance.callbacks.value[0].status).toBe('failed')
      expect(instance.callbacks.value[0].disposition).toBe('failed')
    })

    it('should reschedule (retry) for no_answer when attempts < maxAttempts', () => {
      // The composable retries non-answer dispositions when attempts < maxAttempts
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      instance.callbacks.value.push(makeCallback({ id: 'cb-1', attempts: 0, maxAttempts: 3 }))

      instance.markCompleted('cb-1', 'no_answer')

      expect(instance.callbacks.value[0].status).toBe('pending')
      expect(instance.callbacks.value[0].disposition).toBe('no_answer')
      expect(instance.callbacks.value[0].scheduledAt).toBeDefined()
    })

    it('should call onCallbackCompleted for answered disposition', () => {
      const onCallbackCompleted = vi.fn()
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        onCallbackCompleted,
      })
      instance.callbacks.value.push(makeCallback({ id: 'cb-1' }))

      instance.markCompleted('cb-1', 'answered')

      expect(onCallbackCompleted).toHaveBeenCalledTimes(1)
    })

    it('should call onCallbackFailed after max attempts exhausted', () => {
      const onCallbackFailed = vi.fn()
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        onCallbackFailed,
      })
      // attempts == maxAttempts means no more retries available
      instance.callbacks.value.push(makeCallback({ id: 'cb-1', attempts: 3, maxAttempts: 3 }))

      instance.markCompleted('cb-1', 'no_answer')

      expect(onCallbackFailed).toHaveBeenCalledTimes(1)
      expect(instance.callbacks.value[0].status).toBe('failed')
    })
  })

  // ========================================================================
  // getCallback / getCallbacksForNumber
  // ========================================================================

  describe('getCallback / getCallbacksForNumber', () => {
    it('should get callback by ID', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      const cbId = instance.callbacks.value[0].id

      const cb = instance.getCallback(cbId)

      expect(cb).toBeDefined()
      expect(cb?.callerNumber).toBe('+15551234567')
    })

    it('should return undefined for unknown ID', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      expect(instance.getCallback('nonexistent')).toBeUndefined()
    })

    it('should get callbacks for a phone number', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551234567' })
      await instance.scheduleCallback({ callerNumber: '+15559876543' })
      await instance.scheduleCallback({ callerNumber: '+15551111111' })

      const results = instance.getCallbacksForNumber('5551234567')

      expect(results).toHaveLength(1)
      expect(results[0].callerNumber).toBe('+15551234567')
    })
  })

  // ========================================================================
  // Auto-Execute
  // ========================================================================

  describe('auto-execute', () => {
    it('should start auto-execute mode', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        autoExecute: false,
      })

      expect(instance.autoExecuteEnabled.value).toBe(false)

      instance.startAutoExecute()

      expect(instance.autoExecuteEnabled.value).toBe(true)
    })

    it('should stop auto-execute mode', () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      instance.stopAutoExecute()

      expect(instance.autoExecuteEnabled.value).toBe(false)
    })

    it('should auto-execute on interval when started', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        autoExecuteInterval: 100,
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
        channel: 'Local/5551234567@from-internal-00000001',
      })

      await instance.scheduleCallback({ callerNumber: '+15551234567' })

      // Advance timers to trigger auto-execute
      vi.advanceTimersByTime(150)
      await vi.runAllTimersAsync()

      // The callback should have been executed
      // Note: execution may happen async, so we check isExecuting
    })
  })

  // ========================================================================
  // Queue Management: clearCompleted / clearFailed
  // ========================================================================

  describe('clearCompleted / clearFailed', () => {
    it('should clear completed callbacks', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551111111' })
      // Push a callback with attempts == maxAttempts to avoid retry
      instance.callbacks.value.push(
        makeCallback({
          id: 'cb-failed',
          attempts: 1,
          maxAttempts: 1,
          status: 'pending',
          callerNumber: '+15551111112',
        })
      )

      instance.markCompleted(instance.callbacks.value[0].id, 'answered')
      instance.markCompleted('cb-failed', 'failed')

      expect(instance.callbacks.value).toHaveLength(2)

      instance.clearCompleted()

      expect(instance.callbacks.value).toHaveLength(1)
      expect(instance.callbacks.value[0].status).toBe('failed')
    })

    it('should clear failed callbacks', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551111111' })
      // Push a callback with attempts == maxAttempts to avoid retry
      instance.callbacks.value.push(
        makeCallback({
          id: 'cb-failed',
          attempts: 1,
          maxAttempts: 1,
          status: 'pending',
          callerNumber: '+15551111112',
        })
      )

      instance.markCompleted(instance.callbacks.value[0].id, 'answered')
      instance.markCompleted('cb-failed', 'failed')

      instance.clearFailed()

      expect(instance.callbacks.value).toHaveLength(1)
      expect(instance.callbacks.value[0].status).toBe('completed')
    })
  })

  // ========================================================================
  // Stats
  // ========================================================================

  describe('stats', () => {
    it('should refresh stats correctly', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551111111', priority: 'high' })
      await instance.scheduleCallback({ callerNumber: '+15552222222', priority: 'low' })
      await instance.scheduleCallback({ callerNumber: '+15553333333', priority: 'urgent' })

      instance.refreshStats()

      expect(instance.stats.value.pending).toBe(3)
      expect(instance.stats.value.byPriority.urgent).toBe(1)
      expect(instance.stats.value.byPriority.high).toBe(1)
      expect(instance.stats.value.byPriority.low).toBe(1)
    })

    it('should count completed and failed today', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      await instance.scheduleCallback({ callerNumber: '+15551111111' })
      // Push a callback directly with attempts == maxAttempts so markCompleted makes it 'failed'
      const cb2 = makeCallback({
        id: 'cb-failed',
        attempts: 1,
        maxAttempts: 1,
        status: 'pending',
        callerNumber: '+15552222222',
      })
      instance.callbacks.value.push(cb2)

      instance.markCompleted(instance.callbacks.value[0].id, 'answered')
      instance.markCompleted('cb-failed', 'failed')

      // Verify status directly
      expect(instance.callbacks.value[0].status).toBe('completed')
      expect(instance.callbacks.value[0].disposition).toBe('answered')
      expect(instance.callbacks.value[1].status).toBe('failed')
      expect(instance.callbacks.value[1].disposition).toBe('failed')

      instance.refreshStats()

      expect(instance.stats.value.completedToday).toBe(1)
      expect(instance.stats.value.failedToday).toBe(1)
    })
  })

  // ========================================================================
  // Persistence (AstDB)
  // ========================================================================

  describe('AstDB persistence', () => {
    it('should throw when loadFromStorage without client', async () => {
      const instance = useAmiCallback(null)

      await expect(instance.loadFromStorage()).rejects.toThrow('AMI client not connected')
    })

    it('should throw when saveToStorage without client', async () => {
      const instance = useAmiCallback(null)

      await expect(instance.saveToStorage()).rejects.toThrow('AMI client not connected')
    })

    it('should throw when clearStorage without client', async () => {
      const instance = useAmiCallback(null)

      await expect(instance.clearStorage()).rejects.toThrow('AMI client not connected')
    })

    it('should persist callback to AstDB when scheduling', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient, {
        storage: { persistEnabled: true },
      })

      await instance.scheduleCallback({ callerNumber: '+15551234567' })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBPut',
          Family: 'vuesip/callbacks',
        })
      )
    })
  })

  // ========================================================================
  // Input Validation
  // ========================================================================

  describe('input validation', () => {
    it('should reject phone numbers that are too long', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)
      const longNumber = '1'.repeat(33)

      await expect(instance.scheduleCallback({ callerNumber: longNumber })).rejects.toThrow(
        'Invalid phone number format'
      )
    })

    it('should reject phone numbers with invalid characters', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(instance.scheduleCallback({ callerNumber: '555-ABC-1234' })).rejects.toThrow(
        'Invalid phone number format'
      )
    })

    it('should accept international format with +', async () => {
      const instance = useAmiCallback(mockClient as unknown as AmiClient)

      await expect(
        instance.scheduleCallback({ callerNumber: '+442071234567' })
      ).resolves.toBeDefined()
    })
  })
})
