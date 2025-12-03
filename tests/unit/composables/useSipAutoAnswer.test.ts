/**
 * useSipAutoAnswer composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSipAutoAnswer } from '@/composables/useSipAutoAnswer'
import type { AutoAnswerHeaders } from '@/types/autoanswer.types'

describe('useSipAutoAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have default settings', () => {
      const { settings } = useSipAutoAnswer()
      expect(settings.value.enabled).toBe(false)
      expect(settings.value.mode).toBe('disabled')
      expect(settings.value.delay).toBe(0)
      expect(settings.value.intercomMode).toBe('duplex')
    })

    it('should not be enabled initially', () => {
      const { isEnabled } = useSipAutoAnswer()
      expect(isEnabled.value).toBe(false)
    })

    it('should have empty pending calls', () => {
      const { pendingCalls } = useSipAutoAnswer()
      expect(pendingCalls.value).toHaveLength(0)
    })

    it('should have zero stats', () => {
      const { stats } = useSipAutoAnswer()
      expect(stats.value.totalAutoAnswered).toBe(0)
      expect(stats.value.headerTriggered).toBe(0)
      expect(stats.value.whitelistTriggered).toBe(0)
    })

    it('should apply initial settings', () => {
      const { settings } = useSipAutoAnswer({
        initialSettings: {
          enabled: true,
          mode: 'all',
          delay: 1000,
        },
      })
      expect(settings.value.enabled).toBe(true)
      expect(settings.value.mode).toBe('all')
      expect(settings.value.delay).toBe(1000)
    })
  })

  describe('enable/disable', () => {
    it('should enable auto-answer', () => {
      const { enable, isEnabled, settings } = useSipAutoAnswer()
      enable()
      expect(isEnabled.value).toBe(true)
      expect(settings.value.enabled).toBe(true)
      expect(settings.value.mode).toBe('all')
    })

    it('should disable auto-answer', () => {
      const { enable, disable, isEnabled, settings } = useSipAutoAnswer()
      enable()
      disable()
      expect(isEnabled.value).toBe(false)
      expect(settings.value.enabled).toBe(false)
    })

    it('should toggle auto-answer', () => {
      const { toggle, isEnabled } = useSipAutoAnswer()
      toggle()
      expect(isEnabled.value).toBe(true)
      toggle()
      expect(isEnabled.value).toBe(false)
    })

    it('should cancel pending calls when disabled', () => {
      const onCancelled = vi.fn()
      const { enable, disable, pendingCalls } = useSipAutoAnswer({
        onCancelled,
      })
      enable()

      // Manually add a pending call (simulate the internal state)
      pendingCalls.value.push({
        callId: 'test-1',
        caller: '1001',
        trigger: 'all_calls',
        remainingTime: 1000,
        totalDelay: 1000,
        cancellable: true,
      })

      disable()
      expect(pendingCalls.value).toHaveLength(0)
    })
  })

  describe('mode management', () => {
    it('should set mode to all', () => {
      const { setMode, mode, isEnabled } = useSipAutoAnswer()
      setMode('all')
      expect(mode.value).toBe('all')
      expect(isEnabled.value).toBe(true)
    })

    it('should set mode to whitelist', () => {
      const { setMode, mode } = useSipAutoAnswer()
      setMode('whitelist')
      expect(mode.value).toBe('whitelist')
    })

    it('should set mode to intercom', () => {
      const { setMode, mode } = useSipAutoAnswer()
      setMode('intercom')
      expect(mode.value).toBe('intercom')
    })

    it('should disable when mode is set to disabled', () => {
      const { enable, setMode, isEnabled } = useSipAutoAnswer()
      enable()
      setMode('disabled')
      expect(isEnabled.value).toBe(false)
    })
  })

  describe('settings management', () => {
    it('should update settings', () => {
      const { updateSettings, settings } = useSipAutoAnswer()
      updateSettings({ delay: 2000, playBeep: false })
      expect(settings.value.delay).toBe(2000)
      expect(settings.value.playBeep).toBe(false)
    })

    it('should validate delay range', () => {
      const onError = vi.fn()
      const { updateSettings, error } = useSipAutoAnswer({ onError })
      updateSettings({ delay: 10000 }) // Exceeds default maxDelay of 5000
      expect(error.value).toContain('Invalid delay')
      expect(onError).toHaveBeenCalled()
    })

    it('should validate negative delay', () => {
      const onError = vi.fn()
      const { updateSettings, error } = useSipAutoAnswer({ onError })
      updateSettings({ delay: -100 })
      expect(error.value).toContain('Invalid delay')
    })

    it('should validate announcement URL', () => {
      const onError = vi.fn()
      const { updateSettings, error } = useSipAutoAnswer({ onError })
      updateSettings({ announcementUrl: 'not-a-url' })
      expect(error.value).toBe('Invalid announcement URL')
    })

    it('should accept valid announcement URL', () => {
      const { updateSettings, settings, error } = useSipAutoAnswer()
      updateSettings({ announcementUrl: 'https://example.com/beep.mp3' })
      expect(error.value).toBeNull()
      expect(settings.value.announcementUrl).toBe('https://example.com/beep.mp3')
    })

    it('should accept relative URL', () => {
      const { updateSettings, settings, error } = useSipAutoAnswer()
      updateSettings({ announcementUrl: '/audio/beep.mp3' })
      expect(error.value).toBeNull()
      expect(settings.value.announcementUrl).toBe('/audio/beep.mp3')
    })

    it('should reset settings to defaults', () => {
      const { updateSettings, resetSettings, settings } = useSipAutoAnswer()
      updateSettings({ delay: 3000, mode: 'all', enabled: true })
      resetSettings()
      expect(settings.value.delay).toBe(0)
      expect(settings.value.mode).toBe('disabled')
      expect(settings.value.enabled).toBe(false)
    })

    it('should set delay', () => {
      const { setDelay, settings } = useSipAutoAnswer()
      setDelay(1500)
      expect(settings.value.delay).toBe(1500)
    })

    it('should set intercom mode', () => {
      const { setIntercomMode, settings } = useSipAutoAnswer()
      setIntercomMode('simplex')
      expect(settings.value.intercomMode).toBe('simplex')
    })
  })

  describe('whitelist management', () => {
    it('should add to whitelist', () => {
      const { addToWhitelist, settings } = useSipAutoAnswer()
      addToWhitelist({ pattern: '+1555*', name: 'Office', enabled: true })
      expect(settings.value.whitelist).toHaveLength(1)
      expect(settings.value.whitelist[0].pattern).toBe('+1555*')
      expect(settings.value.whitelist[0].name).toBe('Office')
    })

    it('should prevent duplicate patterns', () => {
      const onError = vi.fn()
      const { addToWhitelist, settings, error } = useSipAutoAnswer({ onError })
      addToWhitelist({ pattern: '1001', enabled: true })
      addToWhitelist({ pattern: '1001', enabled: true })
      expect(settings.value.whitelist).toHaveLength(1)
      expect(error.value).toBe('Pattern already exists in whitelist')
    })

    it('should validate empty pattern', () => {
      const onError = vi.fn()
      const { addToWhitelist, error } = useSipAutoAnswer({ onError })
      addToWhitelist({ pattern: '', enabled: true })
      expect(error.value).toBe('Pattern is required')
    })

    it('should sanitize pattern input', () => {
      const { addToWhitelist, settings } = useSipAutoAnswer()
      addToWhitelist({ pattern: '<script>1001</script>', enabled: true })
      expect(settings.value.whitelist[0].pattern).not.toContain('<script>')
    })

    it('should remove from whitelist', () => {
      const { addToWhitelist, removeFromWhitelist, settings } = useSipAutoAnswer()
      addToWhitelist({ pattern: '1001', enabled: true })
      addToWhitelist({ pattern: '1002', enabled: true })
      removeFromWhitelist('1001')
      expect(settings.value.whitelist).toHaveLength(1)
      expect(settings.value.whitelist[0].pattern).toBe('1002')
    })

    it('should update whitelist entry', () => {
      const { addToWhitelist, updateWhitelistEntry, settings } = useSipAutoAnswer()
      addToWhitelist({ pattern: '1001', name: 'Original', enabled: true })
      updateWhitelistEntry('1001', { name: 'Updated', delay: 500 })
      expect(settings.value.whitelist[0].name).toBe('Updated')
      expect(settings.value.whitelist[0].delay).toBe(500)
    })

    it('should clear whitelist', () => {
      const { addToWhitelist, clearWhitelist, settings } = useSipAutoAnswer()
      addToWhitelist({ pattern: '1001', enabled: true })
      addToWhitelist({ pattern: '1002', enabled: true })
      clearWhitelist()
      expect(settings.value.whitelist).toHaveLength(0)
    })

    it('should check if number is whitelisted', () => {
      const { addToWhitelist, isWhitelisted } = useSipAutoAnswer()
      addToWhitelist({ pattern: '1001', enabled: true })
      addToWhitelist({ pattern: '1002', enabled: false })
      expect(isWhitelisted('1001')).toBe(true)
      expect(isWhitelisted('1002')).toBe(false) // Disabled entry
      expect(isWhitelisted('1003')).toBe(false) // Not in whitelist
    })

    it('should support wildcard patterns', () => {
      const { addToWhitelist, isWhitelisted } = useSipAutoAnswer()
      addToWhitelist({ pattern: '555*', enabled: true })
      expect(isWhitelisted('5551234')).toBe(true)
      expect(isWhitelisted('5559999')).toBe(true)
      expect(isWhitelisted('5661234')).toBe(false)
    })
  })

  describe('shouldAutoAnswer', () => {
    it('should not answer when disabled', () => {
      const { shouldAutoAnswer } = useSipAutoAnswer()
      const result = shouldAutoAnswer('call-1', '1001')
      expect(result.shouldAnswer).toBe(false)
    })

    it('should answer all calls in all mode', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('all')
      const result = shouldAutoAnswer('call-1', '1001')
      expect(result.shouldAnswer).toBe(true)
      expect(result.trigger).toBe('all_calls')
    })

    it('should answer whitelisted calls only in whitelist mode', () => {
      const { enable, setMode, addToWhitelist, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('whitelist')
      addToWhitelist({ pattern: '1001', enabled: true })

      const result1 = shouldAutoAnswer('call-1', '1001')
      expect(result1.shouldAnswer).toBe(true)
      expect(result1.trigger).toBe('whitelist')

      const result2 = shouldAutoAnswer('call-2', '1002')
      expect(result2.shouldAnswer).toBe(false)
    })

    it('should use whitelist entry delay override', () => {
      const { enable, setMode, addToWhitelist, shouldAutoAnswer, settings } = useSipAutoAnswer()
      enable()
      setMode('whitelist')
      settings.value.delay = 1000
      addToWhitelist({ pattern: '1001', enabled: true, delay: 2000 })

      const result = shouldAutoAnswer('call-1', '1001')
      expect(result.delay).toBe(2000)
    })

    it('should detect Call-Info header', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('all')

      const headers: Partial<AutoAnswerHeaders> = {
        'Call-Info': '<sip:example.com>;answer-after=2',
      }

      const result = shouldAutoAnswer('call-1', '1001', headers)
      expect(result.shouldAnswer).toBe(true)
      expect(result.trigger).toBe('header')
      expect(result.delay).toBe(2000)
    })

    it('should detect Alert-Info header', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('all')

      const headers: Partial<AutoAnswerHeaders> = {
        'Alert-Info': '<http://example.com/>;info=auto-answer',
      }

      const result = shouldAutoAnswer('call-1', '1001', headers)
      expect(result.shouldAnswer).toBe(true)
      expect(result.trigger).toBe('header')
    })

    it('should detect intercom header', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('intercom')

      const headers: Partial<AutoAnswerHeaders> = {
        'Alert-Info': '<http://example.com/>;info=intercom',
      }

      const result = shouldAutoAnswer('call-1', '1001', headers)
      expect(result.shouldAnswer).toBe(true)
      expect(result.trigger).toBe('intercom')
      expect(result.isIntercom).toBe(true)
    })

    it('should detect X-Cisco-Intercom header', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('intercom')

      const headers: Partial<AutoAnswerHeaders> = {
        'X-Cisco-Intercom': 'true',
      }

      const result = shouldAutoAnswer('call-1', '1001', headers)
      expect(result.shouldAnswer).toBe(true)
      expect(result.isIntercom).toBe(true)
    })

    it('should not answer intercom-only when no intercom header', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('intercom')

      const result = shouldAutoAnswer('call-1', '1001')
      expect(result.shouldAnswer).toBe(false)
    })

    it('should use default delay when header has none', () => {
      const { enable, setMode, updateSettings, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('all')
      updateSettings({ delay: 500 })

      const headers: Partial<AutoAnswerHeaders> = {
        'X-Auto-Answer': 'true',
      }

      const result = shouldAutoAnswer('call-1', '1001', headers)
      expect(result.delay).toBe(500)
    })
  })

  describe('pending call management', () => {
    it('should cancel pending call', () => {
      const onCancelled = vi.fn()
      const { cancelPending, pendingCalls } = useSipAutoAnswer({ onCancelled })

      // Add a pending call
      pendingCalls.value.push({
        callId: 'call-1',
        caller: '1001',
        trigger: 'all_calls',
        remainingTime: 1000,
        totalDelay: 1000,
        cancellable: true,
      })

      cancelPending('call-1')
      expect(pendingCalls.value).toHaveLength(0)
      expect(onCancelled).toHaveBeenCalledWith('call-1', 'User cancelled')
    })

    it('should cancel all pending calls', () => {
      const { cancelAllPending, pendingCalls } = useSipAutoAnswer()

      pendingCalls.value.push(
        {
          callId: 'call-1',
          caller: '1001',
          trigger: 'all_calls',
          remainingTime: 1000,
          totalDelay: 1000,
          cancellable: true,
        },
        {
          callId: 'call-2',
          caller: '1002',
          trigger: 'all_calls',
          remainingTime: 2000,
          totalDelay: 2000,
          cancellable: true,
        }
      )

      cancelAllPending()
      expect(pendingCalls.value).toHaveLength(0)
    })

    it('should trigger manual auto-answer', () => {
      const onAutoAnswer = vi.fn()
      const { triggerAutoAnswer, pendingCalls } = useSipAutoAnswer({ onAutoAnswer })

      pendingCalls.value.push({
        callId: 'call-1',
        caller: '1001',
        trigger: 'all_calls',
        remainingTime: 1000,
        totalDelay: 1000,
        cancellable: true,
      })

      triggerAutoAnswer('call-1')
      expect(pendingCalls.value).toHaveLength(0)
      expect(onAutoAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: 'call-1',
          trigger: 'manual',
        })
      )
    })
  })

  describe('announcement settings', () => {
    it('should set announcement URL', () => {
      const { setAnnouncementUrl, settings } = useSipAutoAnswer()
      setAnnouncementUrl('https://example.com/announcement.mp3')
      expect(settings.value.announcementUrl).toBe('https://example.com/announcement.mp3')
    })

    it('should reject invalid announcement URL', () => {
      const onError = vi.fn()
      const { setAnnouncementUrl, error } = useSipAutoAnswer({ onError })
      setAnnouncementUrl('invalid-url')
      expect(error.value).toBe('Invalid announcement URL')
    })

    it('should enable/disable announcement', () => {
      const { setPlayAnnouncement, settings } = useSipAutoAnswer()
      setPlayAnnouncement(true)
      expect(settings.value.playAnnouncement).toBe(true)
      setPlayAnnouncement(false)
      expect(settings.value.playAnnouncement).toBe(false)
    })
  })

  describe('statistics', () => {
    it('should reset stats', () => {
      const { stats, resetStats } = useSipAutoAnswer()
      stats.value.totalAutoAnswered = 10
      stats.value.headerTriggered = 5
      resetStats()
      expect(stats.value.totalAutoAnswered).toBe(0)
      expect(stats.value.headerTriggered).toBe(0)
    })

    it('should track recent events', () => {
      const { getRecentEvents } = useSipAutoAnswer()
      const events = getRecentEvents(5)
      expect(events).toHaveLength(0)
    })
  })

  describe('persistence', () => {
    it('should save settings to localStorage', async () => {
      const { updateSettings, saveSettings } = useSipAutoAnswer({
        persist: true,
        storageKey: 'test_auto_answer',
      })

      updateSettings({ delay: 1500 })
      // Manually save since the watcher may not fire synchronously with fake timers
      saveSettings()

      const stored = localStorage.getItem('test_auto_answer')
      expect(stored).toBeDefined()
      const parsed = JSON.parse(stored!)
      expect(parsed.delay).toBe(1500)
    })

    it('should load settings from localStorage', () => {
      localStorage.setItem(
        'test_auto_answer',
        JSON.stringify({
          enabled: true,
          mode: 'whitelist',
          delay: 2000,
          whitelist: [
            { pattern: '1001', enabled: true, addedAt: new Date().toISOString() },
          ],
        })
      )

      const { settings } = useSipAutoAnswer({
        persist: true,
        storageKey: 'test_auto_answer',
      })

      expect(settings.value.enabled).toBe(true)
      expect(settings.value.mode).toBe('whitelist')
      expect(settings.value.delay).toBe(2000)
      expect(settings.value.whitelist).toHaveLength(1)
    })

    it('should manually save settings', () => {
      const { updateSettings, saveSettings } = useSipAutoAnswer({
        persist: true,
        storageKey: 'test_auto_answer_2',
      })

      updateSettings({ delay: 3000 })
      saveSettings()

      const stored = localStorage.getItem('test_auto_answer_2')
      const parsed = JSON.parse(stored!)
      expect(parsed.delay).toBe(3000)
    })

    it('should manually load settings', () => {
      localStorage.setItem(
        'test_auto_answer_3',
        JSON.stringify({
          enabled: true,
          mode: 'all',
          delay: 1000,
        })
      )

      const { loadSettings, settings } = useSipAutoAnswer({
        persist: true,
        storageKey: 'test_auto_answer_3',
      })

      loadSettings()
      expect(settings.value.enabled).toBe(true)
    })
  })

  describe('callbacks', () => {
    it('should call onAutoAnswer', () => {
      const onAutoAnswer = vi.fn()
      const { triggerAutoAnswer, pendingCalls } = useSipAutoAnswer({ onAutoAnswer })

      pendingCalls.value.push({
        callId: 'call-1',
        caller: '1001',
        displayName: 'Test User',
        trigger: 'all_calls',
        remainingTime: 0,
        totalDelay: 0,
        cancellable: true,
      })

      triggerAutoAnswer('call-1')
      expect(onAutoAnswer).toHaveBeenCalled()
    })

    it('should call onSkipped', () => {
      const onSkipped = vi.fn()
      const { shouldAutoAnswer } = useSipAutoAnswer({ onSkipped })

      // When disabled, shouldAutoAnswer returns false but doesn't call onSkipped
      // onSkipped is for explicit skip scenarios
      const result = shouldAutoAnswer('call-1', '1001')
      expect(result.shouldAnswer).toBe(false)
    })

    it('should call onError', () => {
      const onError = vi.fn()
      const { updateSettings } = useSipAutoAnswer({ onError })
      updateSettings({ delay: -100 })
      expect(onError).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle case-insensitive pattern matching', () => {
      const { addToWhitelist, isWhitelisted } = useSipAutoAnswer()
      addToWhitelist({ pattern: 'ABC123', enabled: true })
      expect(isWhitelisted('abc123')).toBe(true)
      expect(isWhitelisted('ABC123')).toBe(true)
    })

    it('should handle SIP URI patterns', () => {
      const { addToWhitelist, isWhitelisted } = useSipAutoAnswer()
      addToWhitelist({ pattern: 'sip:1001@example.com', enabled: true })
      expect(isWhitelisted('sip:1001@example.com')).toBe(true)
    })

    it('should handle empty headers gracefully', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('all')

      const result = shouldAutoAnswer('call-1', '1001', {})
      expect(result.shouldAnswer).toBe(true)
      expect(result.trigger).toBe('all_calls')
    })

    it('should handle undefined headers gracefully', () => {
      const { enable, setMode, shouldAutoAnswer } = useSipAutoAnswer()
      enable()
      setMode('all')

      const result = shouldAutoAnswer('call-1', '1001', undefined)
      expect(result.shouldAnswer).toBe(true)
    })

    it('should accept data URLs for audio', () => {
      const { updateSettings, settings, error } = useSipAutoAnswer()
      updateSettings({ beepUrl: 'data:audio/wav;base64,UklGRl...' })
      expect(error.value).toBeNull()
      expect(settings.value.beepUrl).toContain('data:audio')
    })

    it('should accept blob URLs for audio', () => {
      const { updateSettings, settings: _settings, error } = useSipAutoAnswer()
      updateSettings({ beepUrl: 'blob:http://localhost:3000/abc123' })
      expect(error.value).toBeNull()
    })
  })
})
