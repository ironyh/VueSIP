/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isNotificationsEnabled,
  setNotificationsEnabled,
  createNotificationManager,
  type NotificationManager,
} from '../notifications'

describe('notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

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
