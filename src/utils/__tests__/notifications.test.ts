/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isNotificationsEnabled,
  setNotificationsEnabled,
  ensurePermission,
  showIncomingCallNotification,
  createNotificationManager,
  type NotificationManager,
} from '../notifications'

describe('notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    vi.restoreAllMocks()
    // Reset Notification if it was mocked
    if (typeof window !== 'undefined' && (window as any)._originalNotification) {
      Object.defineProperty(window, 'Notification', {
        value: (window as any)._originalNotification,
        writable: true,
      })
    }
  })

  // Helper to set up Notification mock with static permission property
  const mockNotificationPermission = (permission: string) => {
    const originalNotification = (window as any).Notification
    ;(window as any)._originalNotification = originalNotification
    Object.defineProperty(window, 'Notification', {
      value: class MockNotification {
        static get permission() {
          return permission
        }
        static requestPermission() {
          return Promise.resolve(permission === 'granted' ? 'granted' : 'denied')
        }
      },
      writable: true,
    })
  }

  const restoreNotification = () => {
    if ((window as any)._originalNotification) {
      Object.defineProperty(window, 'Notification', {
        value: (window as any)._originalNotification,
        writable: true,
      })
    }
  }

  describe('isNotificationsEnabled', () => {
    it('should return false when key not set', () => {
      expect(isNotificationsEnabled()).toBe(false)
    })

    it('should return true when set to true', () => {
      localStorage.setItem('vuesip_notifications_enabled', 'true')
      expect(isNotificationsEnabled()).toBe(true)
    })

    it('should return false when set to false', () => {
      localStorage.setItem('vuesip_notifications_enabled', 'false')
      expect(isNotificationsEnabled()).toBe(false)
    })

    it('should return false on localStorage error', () => {
      const originalGetItem = localStorage.getItem
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      expect(isNotificationsEnabled()).toBe(false)
      localStorage.getItem = originalGetItem
    })
  })

  describe('setNotificationsEnabled', () => {
    it('should set localStorage to true', () => {
      setNotificationsEnabled(true)
      expect(localStorage.getItem('vuesip_notifications_enabled')).toBe('true')
    })

    it('should set localStorage to false', () => {
      setNotificationsEnabled(false)
      expect(localStorage.getItem('vuesip_notifications_enabled')).toBe('false')
    })

    it('should handle localStorage error silently', () => {
      const originalSetItem = localStorage.setItem
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      expect(() => setNotificationsEnabled(true)).not.toThrow()
      localStorage.setItem = originalSetItem
    })
  })

  describe('ensurePermission', () => {
    afterEach(() => {
      restoreNotification()
    })

    it('should return false when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as any).window
      const result = await ensurePermission()
      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return false when Notification API not available', async () => {
      const originalWindow = globalThis.window
      globalThis.window = {} as Window & typeof globalThis
      const result = await ensurePermission()
      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true when permission already granted', async () => {
      mockNotificationPermission('granted')
      const result = await ensurePermission()
      expect(result).toBe(true)
    })

    it('should return false when permission denied', async () => {
      mockNotificationPermission('denied')
      const result = await ensurePermission()
      expect(result).toBe(false)
    })

    it('should request permission when userGesture is true', async () => {
      mockNotificationPermission('default')
      const result = await ensurePermission(true)
      expect(result).toBe(false) // default returns false without user gesture handling
    })

    it('should not request permission when userGesture is false', async () => {
      mockNotificationPermission('default')
      const result = await ensurePermission(false)
      expect(result).toBe(false)
    })

    it('should handle permission request error gracefully', async () => {
      // Mock with default, then make requestPermission throw
      const originalNotification = (window as any).Notification
      Object.defineProperty(window, 'Notification', {
        value: class {
          static get permission() {
            return 'default'
          }
          static requestPermission() {
            throw new Error('Denied')
          }
        },
        writable: true,
      })
      const result = await ensurePermission(true)
      window.Notification = originalNotification
      expect(result).toBe(false)
    })
  })

  describe('showIncomingCallNotification', () => {
    afterEach(() => {
      restoreNotification()
    })

    it('should return false when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as any).window
      const result = await showIncomingCallNotification({ title: 'Test', body: 'Body' })
      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return false when Notification API not available', async () => {
      const originalWindow = globalThis.window
      globalThis.window = {} as Window & typeof globalThis
      const result = await showIncomingCallNotification({ title: 'Test', body: 'Body' })
      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return false when permission not granted', async () => {
      mockNotificationPermission('default')
      const result = await showIncomingCallNotification({ title: 'Test', body: 'Body' })
      expect(result).toBe(false)
    })

    it('should show notification when permission granted', async () => {
      const mockClose = vi.fn()
      const originalNotification = (window as any).Notification

      // Mock Notification constructor and static permission
      Object.defineProperty(window, 'Notification', {
        value: class MockNotification {
          static get permission() {
            return 'granted'
          }
          constructor(title: string, opts: any) {
            return {
              title,
              ...opts,
              onclick: null,
              close: mockClose,
            }
          }
        },
        writable: true,
      })
      const originalFocus = window.focus
      window.focus = vi.fn()

      const result = await showIncomingCallNotification({
        title: 'Incoming Call',
        body: 'From: +1234567890',
        icon: '/icon.png',
        callId: 'abc123',
      })

      window.focus = originalFocus
      window.Notification = originalNotification
      expect(result).toBe(true)
    })

    it('should handle notification creation error gracefully', async () => {
      const originalNotification = (window as any).Notification

      Object.defineProperty(window, 'Notification', {
        value: function () {
          throw new Error('Error')
        } as any,
        writable: true,
      })
      Object.defineProperty(window.Notification, 'permission', {
        get() {
          return 'granted'
        },
      })

      const originalFocus = window.focus
      window.focus = vi.fn()

      const result = await showIncomingCallNotification({ title: 'Test', body: 'Body' })

      window.focus = originalFocus
      window.Notification = originalNotification
      expect(result).toBe(false)
    })
  })

  describe('NotificationManager', () => {
    let manager: NotificationManager

    it('should create with default strategy', () => {
      manager = createNotificationManager()
      expect(manager).toBeDefined()
    })

    it('should create with custom strategy', () => {
      manager = createNotificationManager({ strategy: 'in_page' })
      expect(manager).toBeDefined()
    })

    it('should create with auto strategy', () => {
      manager = createNotificationManager({ strategy: 'auto' })
      expect(manager).toBeDefined()
    })

    it('should create with sw_actions strategy', () => {
      manager = createNotificationManager({ strategy: 'sw_actions' })
      expect(manager).toBeDefined()
    })
  })
})
