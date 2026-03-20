import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNotifications } from '@/composables/useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic functionality', () => {
    it('should create empty notifications array by default', () => {
      const { notifications, hasNotifications, unreadCount } = useNotifications()

      expect(notifications.value).toEqual([])
      expect(hasNotifications.value).toBe(false)
      expect(unreadCount.value).toBe(0)
    })

    it('should add a notification via notify()', () => {
      const { notify, notifications, hasNotifications } = useNotifications()

      const id = notify({
        type: 'info',
        title: 'Test Title',
        message: 'Test message',
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].title).toBe('Test Title')
      expect(notifications.value[0].message).toBe('Test message')
      expect(notifications.value[0].type).toBe('info')
      expect(hasNotifications.value).toBe(true)
    })

    it('should generate unique IDs for each notification', () => {
      const { notify, notifications } = useNotifications()

      const id1 = notify({ title: 'Title 1', message: 'Message 1' })
      const id2 = notify({ title: 'Title 2', message: 'Message 2' })

      expect(id1).not.toBe(id2)
      expect(notifications.value).toHaveLength(2)
    })
  })

  describe('notification types (shortcuts)', () => {
    it('should create info notification via info() shortcut', () => {
      const { info, notifications } = useNotifications()

      info('Info Title', 'Info Message')

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('info')
      expect(notifications.value[0].title).toBe('Info Title')
    })

    it('should create success notification via success() shortcut', () => {
      const { success, notifications } = useNotifications()

      success('Success Title', 'Success Message')

      expect(notifications.value[0].type).toBe('success')
    })

    it('should create warning notification via warning() shortcut', () => {
      const { warning, notifications } = useNotifications()

      warning('Warning Title', 'Warning Message')

      expect(notifications.value[0].type).toBe('warning')
    })

    it('should create error notification via error() shortcut', () => {
      const { error, notifications } = useNotifications()

      error('Error Title', 'Error Message')

      expect(notifications.value[0].type).toBe('error')
    })

    it('should create recovery notification via recovery() shortcut', () => {
      const { recovery, notifications } = useNotifications()

      recovery('Recovery Title', 'Recovery Message')

      expect(notifications.value[0].type).toBe('recovery')
    })
  })

  describe('dismiss functionality', () => {
    it('should dismiss a specific notification by ID', () => {
      const { notify, dismiss, notifications } = useNotifications()

      const id = notify({ title: 'Test', message: 'Test message' })
      expect(notifications.value).toHaveLength(1)

      dismiss(id)
      expect(notifications.value).toHaveLength(0)
    })

    it('should dismiss all notifications via dismissAll()', () => {
      const { notify, dismissAll, notifications } = useNotifications()

      notify({ title: 'Test 1', message: 'Message 1' })
      notify({ title: 'Test 2', message: 'Message 2' })
      notify({ title: 'Test 3', message: 'Message 3' })
      expect(notifications.value).toHaveLength(3)

      dismissAll()
      expect(notifications.value).toHaveLength(0)
    })

    it('should not throw when dismissing non-existent ID', () => {
      const { dismiss, notifications } = useNotifications()

      expect(() => dismiss('non-existent-id')).not.toThrow()
      expect(notifications.value).toHaveLength(0)
    })
  })

  describe('read/unread tracking', () => {
    it('should mark notification as read via markRead()', () => {
      const { notify, markRead, notifications } = useNotifications()

      const id = notify({ title: 'Test', message: 'Test' })
      expect(notifications.value[0].read).toBe(false)

      markRead(id)
      expect(notifications.value[0].read).toBe(true)
    })

    it('should mark all notifications as read via markAllRead()', () => {
      const { notify, markAllRead, notifications } = useNotifications()

      notify({ title: 'Test 1', message: 'Message 1' })
      notify({ title: 'Test 2', message: 'Message 2' })
      expect(notifications.value.every((n) => !n.read)).toBe(true)

      markAllRead()
      expect(notifications.value.every((n) => n.read)).toBe(true)
    })

    it('should track unread count correctly', () => {
      const { notify, markRead, unreadCount } = useNotifications()

      const id1 = notify({ title: 'Test 1', message: 'Message 1' })
      notify({ title: 'Test 2', message: 'Message 2' })

      expect(unreadCount.value).toBe(2)

      markRead(id1)
      expect(unreadCount.value).toBe(1)
    })
  })

  describe('auto-dismiss functionality', () => {
    it('should auto-dismiss after specified duration', () => {
      const { notify, notifications } = useNotifications()

      notify({
        title: 'Auto-dismiss',
        message: 'Should disappear',
        duration: 5000,
      })

      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(5000)

      expect(notifications.value).toHaveLength(0)
    })

    it('should not auto-dismiss when duration is 0 (persistent)', () => {
      const { notify, notifications } = useNotifications()

      notify({
        title: 'Persistent',
        message: 'Should stay',
        duration: 0,
      })

      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(100000)

      expect(notifications.value).toHaveLength(1)
    })

    it('should use type-specific default durations', () => {
      const { success, info, notifications } = useNotifications()

      // Success defaults to 3000ms
      success('Success', 'Message')

      // Info defaults to 5000ms
      info('Info', 'Message')

      // Both should exist initially
      expect(notifications.value).toHaveLength(2)

      // Advance past success duration but not info
      vi.advanceTimersByTime(3000)

      // Success should be dismissed, info should remain
      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('info')
    })
  })

  describe('priority sorting', () => {
    it('should sort notifications by type priority (error highest)', () => {
      const { notify, notifications } = useNotifications()

      notify({ type: 'info', title: 'Info', message: 'msg' })
      notify({ type: 'error', title: 'Error', message: 'msg' })
      notify({ type: 'success', title: 'Success', message: 'msg' })

      // Error should be first (highest priority), then by timestamp
      expect(notifications.value[0].type).toBe('error')
    })

    it('should sort same-type notifications by timestamp (newest first)', () => {
      const { notify, notifications } = useNotifications()

      notify({ title: 'First', message: 'msg' })
      vi.advanceTimersByTime(10)
      const id2 = notify({ title: 'Second', message: 'msg' })

      // Second should be first (newer timestamp)
      expect(notifications.value[0].id).toBe(id2)
    })
  })

  describe('max notifications limit', () => {
    it('should evict oldest lower-priority notification when limit reached', () => {
      const { notify, notifications } = useNotifications({ maxNotifications: 3 })

      // Add 3 notifications
      notify({ type: 'info', title: 'Info 1', message: 'msg' })
      vi.advanceTimersByTime(10)
      notify({ type: 'info', title: 'Info 2', message: 'msg' })
      vi.advanceTimersByTime(10)
      notify({ type: 'info', title: 'Info 3', message: 'msg' })

      expect(notifications.value).toHaveLength(3)

      // Add another - should evict the oldest
      notify({ type: 'info', title: 'Info 4', message: 'msg' })

      expect(notifications.value).toHaveLength(3)
      // The oldest should be evicted
      expect(notifications.value.find((n) => n.title === 'Info 1')).toBeUndefined()
    })

    it('should prefer keeping higher-priority notifications when evicting', () => {
      const { notify, notifications } = useNotifications({ maxNotifications: 2 })

      // Add low priority (info)
      notify({ type: 'info', title: 'Info', message: 'msg' })
      vi.advanceTimersByTime(10)

      // Add high priority (error) - should not cause eviction of info
      notify({ type: 'error', title: 'Error', message: 'msg' })

      expect(notifications.value).toHaveLength(2)

      // Add another info - should evict the info, not the error
      vi.advanceTimersByTime(10)
      notify({ type: 'info', title: 'Info 2', message: 'msg' })

      // Error should still be there
      expect(notifications.value.find((n) => n.type === 'error')).toBeDefined()
    })
  })

  describe('options', () => {
    it('should respect custom maxNotifications option', () => {
      const { notify, notifications } = useNotifications({ maxNotifications: 5 })

      for (let i = 0; i < 5; i++) {
        notify({ title: `Title ${i}`, message: `msg ${i}` })
      }
      expect(notifications.value).toHaveLength(5)

      // Adding 6th should evict one
      notify({ title: 'Title 6', message: 'msg 6' })
      expect(notifications.value).toHaveLength(5)
    })

    it('should respect explicit duration option', () => {
      const { notify, notifications } = useNotifications()

      // Explicit duration should override type default
      notify({ title: 'Test', message: 'msg', duration: 1000 })

      vi.advanceTimersByTime(999)
      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(notifications.value).toHaveLength(0)
    })

    it('should return configured position', () => {
      const { position } = useNotifications({ position: 'bottom-left' })
      expect(position.value).toBe('bottom-left')
    })

    it('should default position to top-right', () => {
      const { position } = useNotifications()
      expect(position.value).toBe('top-right')
    })
  })

  describe('notification properties', () => {
    it('should set dismissible to true by default', () => {
      const { notify, notifications } = useNotifications()

      notify({ title: 'Test', message: 'msg' })

      expect(notifications.value[0].dismissible).toBe(true)
    })

    it('should respect dismissible option', () => {
      const { notify, notifications } = useNotifications()

      notify({ title: 'Test', message: 'msg', dismissible: false })

      expect(notifications.value[0].dismissible).toBe(false)
    })

    it('should include timestamp', () => {
      const { notify, notifications } = useNotifications()
      const before = Date.now()

      notify({ title: 'Test', message: 'msg' })

      const after = Date.now()
      expect(notifications.value[0].timestamp).toBeGreaterThanOrEqual(before)
      expect(notifications.value[0].timestamp).toBeLessThanOrEqual(after)
    })

    it('should support action button', () => {
      const { notify, notifications } = useNotifications()
      const handler = vi.fn()

      notify({
        title: 'Test',
        message: 'msg',
        action: { label: 'Retry', handler },
      })

      expect(notifications.value[0].action).toBeDefined()
      expect(notifications.value[0].action?.label).toBe('Retry')
    })
  })
})
