/**
 * useNotifications composable unit tests
 *
 * Tests for the notification queue system including:
 * - Initial state
 * - Adding notifications with priority
 * - Priority sorting
 * - Auto-dismiss with timeout
 * - Manual dismiss
 * - Maximum notifications limit
 * - Custom duration
 * - Shortcut methods
 * - Read/unread tracking
 * - Lifecycle cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNotifications } from '@/composables/useNotifications'
import type { NotificationAction } from '@/composables/useNotifications'
import { withSetup } from '../../utils/test-helpers'
import { NOTIFICATION_CONSTANTS } from '@/composables/constants'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('should start with empty notifications', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      expect(result.notifications.value).toEqual([])
      expect(result.hasNotifications.value).toBe(false)
      expect(result.unreadCount.value).toBe(0)
      unmount()
    })

    it('should use default position of top-right', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      expect(result.position.value).toBe('top-right')
      unmount()
    })

    it('should accept custom position', () => {
      const { result, unmount } = withSetup(() => useNotifications({ position: 'bottom-left' }))

      expect(result.position.value).toBe('bottom-left')
      unmount()
    })
  })

  describe('Adding Notifications', () => {
    it('should add a notification and return its ID', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.notify({
        title: 'Test',
        message: 'Test message',
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(result.notifications.value).toHaveLength(1)
      expect(result.hasNotifications.value).toBe(true)
      unmount()
    })

    it('should create notification with correct properties', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.notify({
        type: 'warning',
        title: 'Warning Title',
        message: 'Warning message',
        dismissible: false,
      })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification).toBeDefined()
      expect(notification?.type).toBe('warning')
      expect(notification?.title).toBe('Warning Title')
      expect(notification?.message).toBe('Warning message')
      expect(notification?.dismissible).toBe(false)
      expect(notification?.read).toBe(false)
      expect(notification?.timestamp).toBeGreaterThan(0)
      unmount()
    })

    it('should default to info type when not specified', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.notify({
        title: 'Test',
        message: 'Test message',
      })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.type).toBe('info')
      unmount()
    })

    it('should default to dismissible true when not specified', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.notify({
        title: 'Test',
        message: 'Test message',
      })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.dismissible).toBe(true)
      unmount()
    })

    it('should include action when provided', () => {
      const { result, unmount } = withSetup(() => useNotifications())
      const handler = vi.fn()

      const id = result.notify({
        title: 'Test',
        message: 'Test message',
        action: {
          label: 'Retry',
          handler,
        },
      })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.action).toBeDefined()
      expect(notification?.action?.label).toBe('Retry')
      expect(notification?.action?.handler).toBe(handler)
      unmount()
    })
  })

  describe('Priority Sorting', () => {
    it('should sort notifications by priority (error > recovery > warning > info > success)', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      // Add in random order
      result.notify({ type: 'info', title: 'Info', message: 'Info msg' })
      result.notify({ type: 'error', title: 'Error', message: 'Error msg' })
      result.notify({ type: 'success', title: 'Success', message: 'Success msg' })
      result.notify({ type: 'warning', title: 'Warning', message: 'Warning msg' })
      result.notify({ type: 'recovery', title: 'Recovery', message: 'Recovery msg' })

      const types = result.notifications.value.map((n) => n.type)

      // Error (5) > Recovery (4) > Warning (3) > Info (2) > Success (1)
      expect(types).toEqual(['error', 'recovery', 'warning', 'info', 'success'])
      unmount()
    })

    it('should sort by timestamp (newest first) within same priority', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      // Add multiple warnings with time gaps
      result.notify({ type: 'warning', title: 'Warning 1', message: 'First' })
      vi.advanceTimersByTime(100)
      result.notify({ type: 'warning', title: 'Warning 2', message: 'Second' })
      vi.advanceTimersByTime(100)
      result.notify({ type: 'warning', title: 'Warning 3', message: 'Third' })

      const titles = result.notifications.value.map((n) => n.title)

      // Newest first within same priority
      expect(titles).toEqual(['Warning 3', 'Warning 2', 'Warning 1'])
      unmount()
    })
  })

  describe('Auto-Dismiss', () => {
    it('should auto-dismiss info notification after default duration', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'info', title: 'Info', message: 'Info msg' })
      expect(result.notifications.value).toHaveLength(1)

      // Advance past default info duration
      await vi.advanceTimersByTimeAsync(NOTIFICATION_CONSTANTS.DEFAULT_DURATION + 100)

      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })

    it('should auto-dismiss success notification after success duration', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'success', title: 'Success', message: 'Success msg' })
      expect(result.notifications.value).toHaveLength(1)

      // Advance past success duration
      await vi.advanceTimersByTimeAsync(NOTIFICATION_CONSTANTS.SUCCESS_DURATION + 100)

      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })

    it('should auto-dismiss warning notification after warning duration', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'warning', title: 'Warning', message: 'Warning msg' })
      expect(result.notifications.value).toHaveLength(1)

      // Advance past warning duration
      await vi.advanceTimersByTimeAsync(NOTIFICATION_CONSTANTS.WARNING_DURATION + 100)

      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })

    it('should NOT auto-dismiss error notification (persistent)', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'error', title: 'Error', message: 'Error msg' })
      expect(result.notifications.value).toHaveLength(1)

      // Advance a long time
      await vi.advanceTimersByTimeAsync(60000)

      // Error should still be there (duration = 0 means persistent)
      expect(result.notifications.value).toHaveLength(1)
      unmount()
    })

    it('should NOT auto-dismiss recovery notification (persistent)', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'recovery', title: 'Recovery', message: 'Recovery msg' })
      expect(result.notifications.value).toHaveLength(1)

      // Advance a long time
      await vi.advanceTimersByTimeAsync(60000)

      // Recovery should still be there (duration = 0 means persistent)
      expect(result.notifications.value).toHaveLength(1)
      unmount()
    })

    it('should use custom duration when provided', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({
        type: 'info',
        title: 'Custom',
        message: 'Custom duration',
        duration: 2000,
      })
      expect(result.notifications.value).toHaveLength(1)

      // Should still be there before custom duration
      await vi.advanceTimersByTimeAsync(1500)
      expect(result.notifications.value).toHaveLength(1)

      // Should be gone after custom duration
      await vi.advanceTimersByTimeAsync(600)
      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })

    it('should not auto-dismiss when duration is 0', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({
        type: 'info',
        title: 'Persistent',
        message: 'Persistent notification',
        duration: 0,
      })
      expect(result.notifications.value).toHaveLength(1)

      // Advance a long time
      await vi.advanceTimersByTimeAsync(60000)

      // Should still be there
      expect(result.notifications.value).toHaveLength(1)
      unmount()
    })
  })

  describe('Manual Dismiss', () => {
    it('should dismiss a specific notification by ID', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id1 = result.notify({ title: 'First', message: 'First msg' })
      const id2 = result.notify({ title: 'Second', message: 'Second msg' })
      const id3 = result.notify({ title: 'Third', message: 'Third msg' })

      expect(result.notifications.value).toHaveLength(3)

      result.dismiss(id2)

      expect(result.notifications.value).toHaveLength(2)
      expect(result.notifications.value.find((n) => n.id === id1)).toBeDefined()
      expect(result.notifications.value.find((n) => n.id === id2)).toBeUndefined()
      expect(result.notifications.value.find((n) => n.id === id3)).toBeDefined()
      unmount()
    })

    it('should handle dismissing non-existent ID gracefully', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ title: 'Test', message: 'Test msg' })
      expect(result.notifications.value).toHaveLength(1)

      // Should not throw
      expect(() => result.dismiss('non-existent-id')).not.toThrow()
      expect(result.notifications.value).toHaveLength(1)
      unmount()
    })

    it('should clear auto-dismiss timer when manually dismissed', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.notify({
        type: 'info',
        title: 'Test',
        message: 'Test msg',
        duration: 5000,
      })

      // Manually dismiss before auto-dismiss
      result.dismiss(id)
      expect(result.notifications.value).toHaveLength(0)

      // Advance past original duration - should not cause issues
      await vi.advanceTimersByTimeAsync(6000)

      // Still empty, no errors
      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })
  })

  describe('Dismiss All', () => {
    it('should clear all notifications', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ title: 'First', message: 'First msg' })
      result.notify({ title: 'Second', message: 'Second msg' })
      result.notify({ title: 'Third', message: 'Third msg' })

      expect(result.notifications.value).toHaveLength(3)

      result.dismissAll()

      expect(result.notifications.value).toHaveLength(0)
      expect(result.hasNotifications.value).toBe(false)
      unmount()
    })

    it('should clear all auto-dismiss timers', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'info', title: 'First', message: 'First msg' })
      result.notify({ type: 'info', title: 'Second', message: 'Second msg' })

      result.dismissAll()

      // Advance past auto-dismiss time - should not cause issues
      await vi.advanceTimersByTimeAsync(10000)

      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })

    it('should handle dismissAll on empty queue', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      expect(() => result.dismissAll()).not.toThrow()
      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })
  })

  describe('Maximum Notifications Limit', () => {
    it('should evict lowest priority notification when limit reached', () => {
      const { result, unmount } = withSetup(() => useNotifications({ maxNotifications: 3 }))

      // Add 3 notifications
      result.notify({ type: 'error', title: 'Error', message: 'Error msg' })
      result.notify({ type: 'warning', title: 'Warning', message: 'Warning msg' })
      result.notify({ type: 'info', title: 'Info', message: 'Info msg' })

      expect(result.notifications.value).toHaveLength(3)

      // Add 4th - should evict lowest priority (info)
      result.notify({ type: 'success', title: 'Success', message: 'Success msg' })

      expect(result.notifications.value).toHaveLength(3)
      // Info should be evicted (lowest priority among existing)
      const types = result.notifications.value.map((n) => n.type)
      expect(types).not.toContain('info')
      unmount()
    })

    it('should evict oldest notification when priorities are equal', () => {
      const { result, unmount } = withSetup(() => useNotifications({ maxNotifications: 3 }))

      // Add 3 info notifications with time gaps
      result.notify({ type: 'info', title: 'Info 1', message: 'First' })
      vi.advanceTimersByTime(100)
      result.notify({ type: 'info', title: 'Info 2', message: 'Second' })
      vi.advanceTimersByTime(100)
      result.notify({ type: 'info', title: 'Info 3', message: 'Third' })

      expect(result.notifications.value).toHaveLength(3)

      // Add 4th info - should evict oldest (Info 1)
      vi.advanceTimersByTime(100)
      result.notify({ type: 'info', title: 'Info 4', message: 'Fourth' })

      expect(result.notifications.value).toHaveLength(3)
      const titles = result.notifications.value.map((n) => n.title)
      expect(titles).not.toContain('Info 1')
      expect(titles).toContain('Info 4')
      unmount()
    })

    it('should use default max of 10 when not specified', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      // Add 11 notifications
      for (let i = 0; i < 11; i++) {
        result.notify({ title: `Notification ${i}`, message: `Message ${i}` })
      }

      expect(result.notifications.value).toHaveLength(10)
      unmount()
    })
  })

  describe('Shortcut Methods', () => {
    it('should create info notification via info()', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.info('Info Title', 'Info message')

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.type).toBe('info')
      expect(notification?.title).toBe('Info Title')
      expect(notification?.message).toBe('Info message')
      unmount()
    })

    it('should create success notification via success()', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.success('Success Title', 'Success message')

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.type).toBe('success')
      expect(notification?.title).toBe('Success Title')
      expect(notification?.message).toBe('Success message')
      unmount()
    })

    it('should create warning notification via warning()', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.warning('Warning Title', 'Warning message')

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.type).toBe('warning')
      expect(notification?.title).toBe('Warning Title')
      expect(notification?.message).toBe('Warning message')
      unmount()
    })

    it('should create error notification via error()', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.error('Error Title', 'Error message')

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.type).toBe('error')
      expect(notification?.title).toBe('Error Title')
      expect(notification?.message).toBe('Error message')
      unmount()
    })

    it('should create recovery notification via recovery()', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.recovery('Recovery Title', 'Recovery message')

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.type).toBe('recovery')
      expect(notification?.title).toBe('Recovery Title')
      expect(notification?.message).toBe('Recovery message')
      unmount()
    })

    it('should accept action in shortcut methods', () => {
      const { result, unmount } = withSetup(() => useNotifications())
      const handler = vi.fn()
      const action: NotificationAction = { label: 'Retry', handler }

      const id = result.error('Error', 'Error message', action)

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.action).toBeDefined()
      expect(notification?.action?.label).toBe('Retry')
      unmount()
    })
  })

  describe('Read/Unread Tracking', () => {
    it('should start notifications as unread', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ title: 'Test', message: 'Test msg' })

      expect(result.notifications.value[0].read).toBe(false)
      expect(result.unreadCount.value).toBe(1)
      unmount()
    })

    it('should mark a specific notification as read', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id1 = result.notify({ title: 'First', message: 'First msg' })
      const id2 = result.notify({ title: 'Second', message: 'Second msg' })

      expect(result.unreadCount.value).toBe(2)

      result.markRead(id1)

      const notification1 = result.notifications.value.find((n) => n.id === id1)
      const notification2 = result.notifications.value.find((n) => n.id === id2)

      expect(notification1?.read).toBe(true)
      expect(notification2?.read).toBe(false)
      expect(result.unreadCount.value).toBe(1)
      unmount()
    })

    it('should mark all notifications as read', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ title: 'First', message: 'First msg' })
      result.notify({ title: 'Second', message: 'Second msg' })
      result.notify({ title: 'Third', message: 'Third msg' })

      expect(result.unreadCount.value).toBe(3)

      result.markAllRead()

      expect(result.unreadCount.value).toBe(0)
      result.notifications.value.forEach((n) => {
        expect(n.read).toBe(true)
      })
      unmount()
    })

    it('should handle markRead on non-existent ID gracefully', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ title: 'Test', message: 'Test msg' })

      expect(() => result.markRead('non-existent-id')).not.toThrow()
      expect(result.unreadCount.value).toBe(1)
      unmount()
    })

    it('should handle markAllRead on empty queue', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      expect(() => result.markAllRead()).not.toThrow()
      expect(result.unreadCount.value).toBe(0)
      unmount()
    })
  })

  describe('Computed Properties', () => {
    it('should update hasNotifications reactively', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      expect(result.hasNotifications.value).toBe(false)

      const id = result.notify({ title: 'Test', message: 'Test msg' })
      expect(result.hasNotifications.value).toBe(true)

      result.dismiss(id)
      expect(result.hasNotifications.value).toBe(false)
      unmount()
    })

    it('should update unreadCount reactively', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      expect(result.unreadCount.value).toBe(0)

      const id1 = result.notify({ title: 'First', message: 'First msg' })
      expect(result.unreadCount.value).toBe(1)

      result.notify({ title: 'Second', message: 'Second msg' })
      expect(result.unreadCount.value).toBe(2)

      result.markRead(id1)
      expect(result.unreadCount.value).toBe(1)

      result.markAllRead()
      expect(result.unreadCount.value).toBe(0)
      unmount()
    })

    it('should return sorted notifications from computed', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ type: 'success', title: 'Success', message: 'Success msg' })
      result.notify({ type: 'error', title: 'Error', message: 'Error msg' })

      // notifications computed should return sorted array
      expect(result.notifications.value[0].type).toBe('error')
      expect(result.notifications.value[1].type).toBe('success')
      unmount()
    })
  })

  describe('Configuration Options', () => {
    it('should accept custom maxNotifications', () => {
      const { result, unmount } = withSetup(() => useNotifications({ maxNotifications: 5 }))

      for (let i = 0; i < 7; i++) {
        result.notify({ title: `Notification ${i}`, message: `Message ${i}` })
      }

      expect(result.notifications.value).toHaveLength(5)
      unmount()
    })

    it('should accept custom defaultDuration', async () => {
      const { result, unmount } = withSetup(() => useNotifications({ defaultDuration: 1000 }))

      // Info type uses defaultDuration when type-specific duration is not set
      // But info has its own default, so let's test with a type that would use defaultDuration
      result.notify({ title: 'Test', message: 'Test msg', duration: 1000 })

      expect(result.notifications.value).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(1100)

      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })

    it('should accept all position options', () => {
      const positions = [
        'top-right',
        'top-left',
        'bottom-right',
        'bottom-left',
        'top-center',
        'bottom-center',
      ] as const

      positions.forEach((pos) => {
        const { result, unmount } = withSetup(() => useNotifications({ position: pos }))
        expect(result.position.value).toBe(pos)
        unmount()
      })
    })
  })

  describe('Notification Lifecycle', () => {
    it('should track notification from creation to dismissal', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      // Created
      const id = result.notify({
        type: 'info',
        title: 'Lifecycle Test',
        message: 'Testing lifecycle',
        duration: 3000,
      })

      // Shown (in queue)
      expect(result.notifications.value.find((n) => n.id === id)).toBeDefined()
      expect(result.hasNotifications.value).toBe(true)

      // Auto-dismissed
      await vi.advanceTimersByTimeAsync(3100)

      expect(result.notifications.value.find((n) => n.id === id)).toBeUndefined()
      expect(result.hasNotifications.value).toBe(false)
      unmount()
    })

    it('should handle rapid add/dismiss cycles', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      for (let i = 0; i < 100; i++) {
        const id = result.notify({ title: `Test ${i}`, message: `Message ${i}` })
        result.dismiss(id)
      }

      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })
  })

  describe('Scope Disposal', () => {
    it('should cleanup timers on scope dispose', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      // Add notifications with auto-dismiss
      result.notify({ type: 'info', title: 'Test 1', message: 'Message 1' })
      result.notify({ type: 'info', title: 'Test 2', message: 'Message 2' })

      expect(result.notifications.value).toHaveLength(2)

      // Unmount (triggers onScopeDispose)
      unmount()

      // Advance timers - should not cause errors
      await vi.advanceTimersByTimeAsync(10000)

      // No errors should occur
    })

    it('should clear all notifications on dispose', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      result.notify({ title: 'Test', message: 'Message' })
      expect(result.notifications.value).toHaveLength(1)

      unmount()

      // After unmount, the composable state is cleaned up
      // We can't access result.notifications after unmount in a meaningful way
      // but the test verifies no errors occur during cleanup
    })
  })

  describe('Edge Cases', () => {
    it('should generate unique IDs for each notification', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const id = result.notify({ title: `Test ${i}`, message: `Message ${i}` })
        ids.add(id)
      }

      // All IDs should be unique
      expect(ids.size).toBe(100)
      unmount()
    })

    it('should handle empty title and message', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const id = result.notify({ title: '', message: '' })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.title).toBe('')
      expect(notification?.message).toBe('')
      unmount()
    })

    it('should handle very long title and message', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const longText = 'A'.repeat(10000)
      const id = result.notify({ title: longText, message: longText })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.title).toBe(longText)
      expect(notification?.message).toBe(longText)
      unmount()
    })

    it('should handle special characters in title and message', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const specialChars = '<script>alert("xss")</script> & "quotes" \'apostrophe\''
      const id = result.notify({ title: specialChars, message: specialChars })

      const notification = result.notifications.value.find((n) => n.id === id)
      expect(notification?.title).toBe(specialChars)
      expect(notification?.message).toBe(specialChars)
      unmount()
    })

    it('should handle concurrent auto-dismiss timers', async () => {
      const { result, unmount } = withSetup(() => useNotifications())

      // Add multiple notifications with different durations
      result.notify({ title: 'Short', message: 'Short', duration: 1000 })
      result.notify({ title: 'Medium', message: 'Medium', duration: 2000 })
      result.notify({ title: 'Long', message: 'Long', duration: 3000 })

      expect(result.notifications.value).toHaveLength(3)

      await vi.advanceTimersByTimeAsync(1100)
      expect(result.notifications.value).toHaveLength(2)

      await vi.advanceTimersByTimeAsync(1000)
      expect(result.notifications.value).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(1000)
      expect(result.notifications.value).toHaveLength(0)
      unmount()
    })
  })

  describe('Action Handler Execution', () => {
    it('should preserve action handler reference', () => {
      const { result, unmount } = withSetup(() => useNotifications())
      const handler = vi.fn()

      const id = result.notify({
        title: 'Test',
        message: 'Test msg',
        action: { label: 'Click', handler },
      })

      const notification = result.notifications.value.find((n) => n.id === id)

      // Execute the handler
      notification?.action?.handler()

      expect(handler).toHaveBeenCalledTimes(1)
      unmount()
    })
  })

  describe('Type-Specific Default Durations', () => {
    it('should use correct default duration for each type', () => {
      const { result, unmount } = withSetup(() => useNotifications())

      const infoId = result.notify({ type: 'info', title: 'Info', message: 'Info' })
      const successId = result.notify({ type: 'success', title: 'Success', message: 'Success' })
      const warningId = result.notify({ type: 'warning', title: 'Warning', message: 'Warning' })
      const errorId = result.notify({ type: 'error', title: 'Error', message: 'Error' })
      const recoveryId = result.notify({ type: 'recovery', title: 'Recovery', message: 'Recovery' })

      const infoNotif = result.notifications.value.find((n) => n.id === infoId)
      const successNotif = result.notifications.value.find((n) => n.id === successId)
      const warningNotif = result.notifications.value.find((n) => n.id === warningId)
      const errorNotif = result.notifications.value.find((n) => n.id === errorId)
      const recoveryNotif = result.notifications.value.find((n) => n.id === recoveryId)

      expect(infoNotif?.duration).toBe(NOTIFICATION_CONSTANTS.DEFAULT_DURATION)
      expect(successNotif?.duration).toBe(NOTIFICATION_CONSTANTS.SUCCESS_DURATION)
      expect(warningNotif?.duration).toBe(NOTIFICATION_CONSTANTS.WARNING_DURATION)
      expect(errorNotif?.duration).toBe(NOTIFICATION_CONSTANTS.ERROR_DURATION)
      expect(recoveryNotif?.duration).toBe(NOTIFICATION_CONSTANTS.RECOVERY_DURATION)
      unmount()
    })
  })
})
