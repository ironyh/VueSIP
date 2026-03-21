/**
 * useNotifications Unit Tests
 *
 * @group composables
 * @group notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotifications } from '../useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty notifications array', () => {
      const { notifications } = useNotifications()
      expect(notifications.value).toEqual([])
    })

    it('should initialize with no unread count', () => {
      const { unreadCount } = useNotifications()
      expect(unreadCount.value).toBe(0)
    })

    it('should initialize with no notifications', () => {
      const { hasNotifications } = useNotifications()
      expect(hasNotifications.value).toBe(false)
    })
  })

  describe('notify', () => {
    it('should add a basic notification', () => {
      const { notifications, notify } = useNotifications()

      const id = notify({
        type: 'info',
        title: 'Test Title',
        message: 'Test message',
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].title).toBe('Test Title')
    })

    it('should add notification with custom duration', () => {
      const { notifications, notify } = useNotifications()

      notify({
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
        duration: 5000,
      })

      expect(notifications.value[0].duration).toBe(5000)
    })

    it('should add persistent notification when duration is 0', () => {
      const { notifications, notify } = useNotifications()

      notify({
        type: 'error',
        title: 'Error',
        message: 'Something went wrong',
        duration: 0,
      })

      expect(notifications.value[0].duration).toBe(0)
    })

    it('should add dismissible notification', () => {
      const { notifications, notify } = useNotifications()

      notify({
        type: 'warning',
        title: 'Warning',
        message: 'Check this',
        dismissible: true,
      })

      expect(notifications.value[0].dismissible).toBe(true)
    })

    it('should support all notification types', () => {
      const { notifications, notify, dismissAll } = useNotifications()
      const types = ['info', 'success', 'warning', 'error', 'recovery'] as const

      types.forEach((type) => {
        notify({
          type,
          title: type,
          message: `${type} message`,
        })

        expect(notifications.value[0].type).toBe(type)
        dismissAll()
      })
    })
  })

  describe('dismiss notification', () => {
    it('should remove notification by id', () => {
      const { notifications, notify, dismiss } = useNotifications()

      const id = notify({
        type: 'info',
        title: 'Test',
        message: 'Test message',
      })

      expect(notifications.value).toHaveLength(1)

      dismiss(id)

      expect(notifications.value).toHaveLength(0)
    })

    it('should handle removing non-existent notification', () => {
      const { notifications, notify, dismiss } = useNotifications()

      notify({
        type: 'info',
        title: 'Test',
        message: 'Test message',
      })

      // Should not throw
      expect(() => dismiss('non-existent-id')).not.toThrow()
      expect(notifications.value).toHaveLength(1)
    })
  })

  describe('dismissAll', () => {
    it('should clear all notifications', () => {
      const { notifications, notify, dismissAll } = useNotifications()

      notify({ type: 'info', title: '1', message: 'msg' })
      notify({ type: 'success', title: '2', message: 'msg' })
      notify({ type: 'warning', title: '3', message: 'msg' })

      expect(notifications.value).toHaveLength(3)

      dismissAll()

      expect(notifications.value).toHaveLength(0)
    })
  })

  describe('convenience methods', () => {
    it('should have info method', () => {
      const { notifications, info } = useNotifications()

      const id = info('Info Title', 'Info message')

      expect(id).toBeDefined()
      expect(notifications.value[0].type).toBe('info')
      expect(notifications.value[0].title).toBe('Info Title')
      expect(notifications.value[0].message).toBe('Info message')
    })

    it('should have success method', () => {
      const { notifications, success } = useNotifications()

      const id = success('Success Title', 'Success message')

      expect(id).toBeDefined()
      expect(notifications.value[0].type).toBe('success')
    })

    it('should have warning method', () => {
      const { notifications, warning } = useNotifications()

      const id = warning('Warning Title', 'Warning message')

      expect(id).toBeDefined()
      expect(notifications.value[0].type).toBe('warning')
    })

    it('should have error method', () => {
      const { notifications, error: errorNotify } = useNotifications()

      const id = errorNotify('Error Title', 'Error message')

      expect(id).toBeDefined()
      expect(notifications.value[0].type).toBe('error')
    })

    it('should have recovery method', () => {
      const { notifications, recovery } = useNotifications()

      const id = recovery('Recovery Title', 'Recovery message')

      expect(id).toBeDefined()
      expect(notifications.value[0].type).toBe('recovery')
    })
  })

  describe('notification timestamp', () => {
    it('should set timestamp on creation', () => {
      const { notifications, notify } = useNotifications()

      const before = Date.now()

      notify({
        type: 'info',
        title: 'Test',
        message: 'Test',
      })

      const after = Date.now()

      const notification = notifications.value[0]
      expect(notification.timestamp).toBeGreaterThanOrEqual(before)
      expect(notification.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('read/unread tracking', () => {
    it('should track unread count', () => {
      const { notifications, unreadCount, notify, markRead, markAllRead } = useNotifications()

      notify({ type: 'info', title: '1', message: 'msg' })
      notify({ type: 'info', title: '2', message: 'msg' })

      expect(unreadCount.value).toBe(2)

      // Mark first as read
      markRead(notifications.value[0].id)
      expect(unreadCount.value).toBe(1)

      // Mark all as read
      markAllRead()
      expect(unreadCount.value).toBe(0)
    })
  })

  describe('max notifications', () => {
    it('should respect maxNotifications limit', () => {
      const { dismissAll } = useNotifications()
      const notif = useNotifications({ maxNotifications: 2 })

      // Add 3 notifications to a max of 2
      notif.notify({ type: 'info', title: '1', message: 'msg' })
      notif.notify({ type: 'info', title: '2', message: 'msg' })
      notif.notify({ type: 'info', title: '3', message: 'msg' })

      expect(notif.notifications.value.length).toBeLessThanOrEqual(2)
      dismissAll()
    })
  })
})
