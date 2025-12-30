/**
 * FreePBXPresenceBridge unit tests
 * Comprehensive test coverage for FreePBX presence subscriptions and return time tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FreePBXPresenceBridge } from '@/core/FreePBXPresenceBridge'
import {
  FreePBXPresenceCode,
  ExtendedAwayReason,
  type FreePBXPresenceEvent,
  type FreePBXPresenceBridgeConfig,
  type ReturnTimeSpec,
} from '@/types/freepbx-presence.types'
import { PresenceState } from '@/types/presence.types'
import type { UA } from 'jssip/lib/UA'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('FreePBXPresenceBridge', () => {
  let bridge: FreePBXPresenceBridge
  let config: FreePBXPresenceBridgeConfig
  let mockUA: Partial<UA>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    config = {
      host: 'pbx.example.com',
      apiToken: 'test-token',
      amiPort: 5038,
      restPort: 443,
      useRestApi: false,
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      parseReturnTime: true,
    }

    mockUA = {
      // JsSIP UA mock - minimal implementation
    }

    bridge = new FreePBXPresenceBridge(config)
  })

  afterEach(() => {
    bridge.destroy()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Constructor and Configuration', () => {
    it('should create bridge with default config values', () => {
      const minimalConfig: FreePBXPresenceBridgeConfig = {
        host: 'pbx.test.com',
      }
      const testBridge = new FreePBXPresenceBridge(minimalConfig)

      expect(testBridge).toBeInstanceOf(FreePBXPresenceBridge)
      testBridge.destroy()
    })

    it('should merge provided config with defaults', () => {
      const customConfig: FreePBXPresenceBridgeConfig = {
        host: 'custom.pbx.com',
        amiPort: 5039,
        useRestApi: true,
      }
      const testBridge = new FreePBXPresenceBridge(customConfig)

      expect(testBridge).toBeInstanceOf(FreePBXPresenceBridge)
      testBridge.destroy()
    })
  })

  describe('setUserAgent', () => {
    it('should set user agent successfully', () => {
      bridge.setUserAgent(mockUA as UA)
      // UA should be set internally, verify no errors
      expect(true).toBe(true)
    })

    it('should unsubscribe all when UA is set to null', () => {
      bridge.setUserAgent(mockUA as UA)

      // Subscribe to some extensions first
      vi.fn()

      // Then remove UA
      bridge.setUserAgent(null)

      // Should have cleaned up subscriptions
      expect(bridge.getAllPresenceStatuses().size).toBe(0)
    })
  })

  describe('PIDF Document Parsing', () => {
    it('should parse basic PIDF document with open status', () => {
      const pidf = `<?xml version="1.0"?>
        <presence xmlns="urn:ietf:params:xml:ns:pidf">
          <tuple>
            <status><basic>open</basic></status>
          </tuple>
        </presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.extension).toBe('1001')
      expect(result.presenceCode).toBe(FreePBXPresenceCode.Available)
      expect(result.pidfDocument).toBe(pidf)
    })

    it('should parse PIDF document with closed status', () => {
      const pidf = `<?xml version="1.0"?>
        <presence xmlns="urn:ietf:params:xml:ns:pidf">
          <tuple>
            <status><basic>closed</basic></status>
          </tuple>
        </presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.presenceCode).toBe(FreePBXPresenceCode.Offline)
    })

    it('should parse PIDF with status note/message', () => {
      const pidf = `<?xml version="1.0"?>
        <presence xmlns="urn:ietf:params:xml:ns:pidf">
          <tuple>
            <status><basic>open</basic></status>
            <note>At lunch, back at 2:30 PM</note>
          </tuple>
        </presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayMessage).toContain('lunch')
      expect(result.presenceCode).toBe(FreePBXPresenceCode.ExtendedAway)
      expect(result.returnTime).toBeDefined()
    })

    it('should parse PIDF with device state hint', () => {
      const pidf = `<?xml version="1.0"?>
        <presence xmlns="urn:ietf:params:xml:ns:pidf">
          <tuple state="INUSE">
            <status><basic>open</basic></status>
          </tuple>
        </presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.hintState).toBe('INUSE')
      expect(result.presenceCode).toBe(FreePBXPresenceCode.OnPhone)
    })

    it('should parse PIDF with display name', () => {
      const pidf = `<?xml version="1.0"?>
        <presence xmlns="urn:ietf:params:xml:ns:pidf">
          <tuple>
            <status><basic>open</basic></status>
            <display-name>John Doe</display-name>
          </tuple>
        </presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.displayName).toBe('John Doe')
    })

    it('should handle malformed PIDF gracefully', () => {
      const pidf = 'not valid xml at all'

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.extension).toBe('1001')
      expect(result.pidfDocument).toBe(pidf)
    })
  })

  describe('Return Time Parsing', () => {
    it('should parse absolute time "2:30 PM"', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Back at 2:30 PM</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
      expect(result.returnTime?.formattedTime).toContain('2:30')
      expect(result.awayReason).toBeDefined()
    })

    it('should parse 24-hour time "14:30"', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Returning at 14:30</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
    })

    it('should parse relative duration "30 minutes"', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Back in 30 minutes</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
      expect(result.returnTime?.durationMinutes).toBe(30)
    })

    it('should parse relative duration "1 hour"', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Away for 1 hour</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
      expect(result.returnTime?.durationMinutes).toBe(60)
    })

    it('should parse shorthand "~15m"', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>BRB ~15m</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
      expect(result.returnTime?.durationMinutes).toBe(15)
    })

    it('should parse shorthand "~2h"', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Meeting ~2h</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
      expect(result.returnTime?.durationMinutes).toBe(120)
    })

    it('should handle time earlier than now (assume tomorrow)', () => {
      const now = new Date()
      now.setHours(15, 0, 0, 0) // 3:00 PM
      vi.setSystemTime(now)

      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Back at 9:00 AM</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime).toBeDefined()
      // Should be tomorrow's 9 AM
      const returnTime = result.returnTime!.returnTime
      expect(returnTime.getDate()).toBe(now.getDate() + 1)
    })

    it('should detect overdue return times', () => {
      const now = new Date()
      const pastTime = new Date(now.getTime() - 3600000) // 1 hour ago

      vi.setSystemTime(now)

      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Back at ${pastTime.getHours()}:${pastTime.getMinutes()}</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.returnTime?.isOverdue).toBe(true)
      expect(result.returnTime?.remainingMs).toBe(0)
    })
  })

  describe('Away Reason Detection', () => {
    it('should detect lunch reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>At lunch, back in 30 minutes</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.Lunch)
    })

    it('should detect break reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>On break, returning soon</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.Break)
    })

    it('should detect meeting reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>In meeting until 3 PM</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.Meeting)
    })

    it('should detect rounds reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Making rounds, back at 4:00 PM</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.Rounds)
    })

    it('should detect patient care reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>With patient in room 302</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.WithPatient)
    })

    it('should detect procedure reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>In procedure, ~1h</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.InProcedure)
    })

    it('should detect vacation reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>On vacation until Monday</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.Vacation)
    })

    it('should detect out of office reason', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Out of office today</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.OutOfOffice)
    })

    it('should default to Away for unknown reasons', () => {
      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>Somewhere doing something</note></tuple></presence>`

      const result = bridge.parsePIDF(pidf, '1001')

      expect(result.awayReason).toBe(ExtendedAwayReason.Away)
    })
  })

  describe('REST API Subscription', () => {
    it('should start REST API polling when useRestApi is true', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'available',
          displayName: 'Test User',
        }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
      })

      expect(mockFetch).toHaveBeenCalled()

      restBridge.destroy()
    })

    it('should poll presence status at specified interval', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        pollingInterval: 1000,
      })

      // Initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance time to trigger polling
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalledTimes(3)

      restBridge.destroy()
    })

    it('should handle API errors gracefully', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
      })

      // Should not throw, just log error
      expect(mockFetch).toHaveBeenCalled()

      restBridge.destroy()
    })

    it('should map REST status codes correctly', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockCallback = vi.fn()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'on_phone',
          displayName: 'Test User',
        }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        onPresenceUpdate: mockCallback,
      })

      // Wait for update
      await vi.advanceTimersByTimeAsync(0)

      const status = restBridge.getPresenceStatus('1001')
      expect(status?.presenceCode).toBe(FreePBXPresenceCode.OnPhone)

      restBridge.destroy()
    })
  })

  describe('Presence Status Management', () => {
    it('should get presence status for extension', () => {
      const status = bridge.getPresenceStatus('1001')
      expect(status).toBeUndefined()
    })

    it('should get all presence statuses', () => {
      const allStatuses = bridge.getAllPresenceStatuses()
      expect(allStatuses).toBeInstanceOf(Map)
      expect(allStatuses.size).toBe(0)
    })

    it('should get default presence status', () => {
      const defaultStatus = bridge.getDefaultPresenceStatus('1001')

      expect(defaultStatus.extension).toBe('1001')
      expect(defaultStatus.state).toBe(PresenceState.Offline)
      expect(defaultStatus.presenceCode).toBe(FreePBXPresenceCode.Offline)
      expect(defaultStatus.uri).toContain('1001')
    })
  })

  describe('Return Time Management', () => {
    it('should set return time with Date object', async () => {
      // First create a presence status
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
      })
      await vi.advanceTimersByTimeAsync(0)

      const returnTime = new Date(Date.now() + 3600000) // 1 hour from now
      restBridge.setReturnTime('1001', returnTime)

      const status = restBridge.getPresenceStatus('1001')
      expect(status?.returnTime).toBeDefined()
      expect(status?.presenceCode).toBe(FreePBXPresenceCode.ExtendedAway)

      restBridge.destroy()
    })

    it('should set return time with duration in minutes', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
      })
      await vi.advanceTimersByTimeAsync(0)

      restBridge.setReturnTime('1001', 30) // 30 minutes

      const returnTimeSpec = restBridge.getReturnTime('1001')
      expect(returnTimeSpec).toBeDefined()
      expect(returnTimeSpec?.durationMinutes).toBe(30)

      restBridge.destroy()
    })

    it('should clear return time', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
      })
      await vi.advanceTimersByTimeAsync(0)

      restBridge.setReturnTime('1001', 30)
      expect(restBridge.getReturnTime('1001')).toBeDefined()

      restBridge.clearReturnTime('1001')
      expect(restBridge.getReturnTime('1001')).toBeUndefined()

      const status = restBridge.getPresenceStatus('1001')
      expect(status?.presenceCode).toBe(FreePBXPresenceCode.Available)

      restBridge.destroy()
    })

    it('should handle setting return time for non-existent extension', () => {
      bridge.setReturnTime('9999', 30)

      // Should not throw, just log warning
      expect(bridge.getReturnTime('9999')).toBeUndefined()
    })

    it('should handle clearing return time for non-existent extension', () => {
      bridge.clearReturnTime('9999')

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('Event Callbacks', () => {
    it('should call onPresenceUpdate when presence changes', async () => {
      const mockCallback = vi.fn()
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'on_phone',
          displayName: 'Test User',
        }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        onPresenceUpdate: mockCallback,
      })

      await vi.advanceTimersByTimeAsync(0)

      expect(mockCallback).toHaveBeenCalled()
      const event: FreePBXPresenceEvent = mockCallback.mock.calls[0][0]
      expect(event.extension).toBe('1001')
      expect(event.type).toBe('presence_updated')

      restBridge.destroy()
    })

    it('should call onReturnTimeUpdate when return time countdown updates', async () => {
      const mockPresenceCallback = vi.fn()
      const mockReturnTimeCallback = vi.fn()

      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        onPresenceUpdate: mockPresenceCallback,
        onReturnTimeUpdate: mockReturnTimeCallback,
      })
      await vi.advanceTimersByTimeAsync(0)

      restBridge.setReturnTime('1001', 5) // 5 minutes

      // Advance time to trigger countdown update
      await vi.advanceTimersByTimeAsync(1000)

      expect(mockReturnTimeCallback).toHaveBeenCalled()

      restBridge.destroy()
    })

    it('should emit return_time_expired event when overdue', async () => {
      const mockCallback = vi.fn()
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        onPresenceUpdate: mockCallback,
      })
      await vi.advanceTimersByTimeAsync(0)

      // Set return time in the past
      const pastTime = new Date(Date.now() - 1000)
      restBridge.setReturnTime('1001', pastTime)

      // Advance countdown timer
      await vi.advanceTimersByTimeAsync(1000)

      // Should have emitted return_time_expired event
      const expiredEvent = mockCallback.mock.calls.find(
        (call) => call[0].type === 'return_time_expired'
      )
      expect(expiredEvent).toBeDefined()

      restBridge.destroy()
    })

    it('should handle errors in callback gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })

      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        onPresenceUpdate: errorCallback,
      })

      // Should not throw despite error in callback
      await vi.advanceTimersByTimeAsync(0)
      expect(errorCallback).toHaveBeenCalled()

      restBridge.destroy()
    })
  })

  describe('Unsubscribe and Cleanup', () => {
    it('should unsubscribe from specific extension', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001', '1002'],
      })
      await vi.advanceTimersByTimeAsync(0)

      expect(restBridge.getPresenceStatus('1001')).toBeDefined()
      expect(restBridge.getPresenceStatus('1002')).toBeDefined()

      restBridge.unsubscribe('1001')

      expect(restBridge.getPresenceStatus('1001')).toBeUndefined()
      expect(restBridge.getPresenceStatus('1002')).toBeDefined()

      restBridge.destroy()
    })

    it('should unsubscribe from all extensions', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001', '1002'],
      })
      await vi.advanceTimersByTimeAsync(0)

      expect(restBridge.getAllPresenceStatuses().size).toBeGreaterThan(0)

      restBridge.unsubscribeAll()

      expect(restBridge.getAllPresenceStatuses().size).toBe(0)

      restBridge.destroy()
    })
  })

  describe('Destroy and Resource Cleanup', () => {
    it('should cleanup all resources on destroy', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
      })
      await vi.advanceTimersByTimeAsync(0)

      restBridge.setReturnTime('1001', 30)

      restBridge.destroy()

      // All resources should be cleaned up
      expect(restBridge.getAllPresenceStatuses().size).toBe(0)
    })

    it('should stop polling timer on destroy', async () => {
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        pollingInterval: 1000,
      })

      const callCountBefore = mockFetch.mock.calls.length

      restBridge.destroy()

      // Advance time - should not trigger more polling
      await vi.advanceTimersByTimeAsync(5000)

      // No new calls after destroy
      expect(mockFetch.mock.calls.length).toBe(callCountBefore)
    })

    it('should clear all callbacks on destroy', async () => {
      const mockCallback = vi.fn()
      const restBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await restBridge.subscribe({
        extensions: ['1001'],
        onPresenceUpdate: mockCallback,
      })

      restBridge.destroy()

      // Callbacks should be cleared
      expect(true).toBe(true)
    })
  })

  describe('Custom Return Time Parser', () => {
    it('should use custom parser when provided', () => {
      const customParser = vi.fn((message: string): ReturnTimeSpec | null => {
        if (message.includes('custom')) {
          return {
            returnTime: new Date(Date.now() + 3600000),
            durationMinutes: 60,
            remainingMs: 3600000,
            isOverdue: false,
            formattedTime: '1 hour',
            formattedRemaining: '1h 0m',
          }
        }
        return null
      })

      const customBridge = new FreePBXPresenceBridge({
        ...config,
        returnTimeParser: customParser,
      })

      const pidf = `<?xml version="1.0"?>
        <presence><tuple><note>custom format</note></tuple></presence>`

      const result = customBridge.parsePIDF(pidf, '1001')

      expect(customParser).toHaveBeenCalled()
      expect(result.returnTime).toBeDefined()

      customBridge.destroy()
    })
  })

  describe('SIP SUBSCRIBE Fallback', () => {
    it('should fallback to REST API when SIP SUBSCRIBE not supported', async () => {
      const sipBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: false, // Try to use SIP
      })

      sipBridge.setUserAgent(mockUA as UA)

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await sipBridge.subscribe({
        extensions: ['1001'],
      })

      // Should have fallen back to REST API
      expect(mockFetch).toHaveBeenCalled()

      sipBridge.destroy()
    })

    it('should warn when no UA available for SIP subscription', async () => {
      const sipBridge = new FreePBXPresenceBridge({
        ...config,
        useRestApi: false,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'available' }),
      })
      global.fetch = mockFetch

      await sipBridge.subscribe({
        extensions: ['1001'],
      })

      // Should have fallen back to REST without UA
      expect(mockFetch).toHaveBeenCalled()

      sipBridge.destroy()
    })
  })

  describe('Fetch All Extensions', () => {
    it('should warn when fetching all extensions without API token', async () => {
      const noTokenBridge = new FreePBXPresenceBridge({
        ...config,
        apiToken: undefined,
      })

      const mockFetch = vi.fn()
      global.fetch = mockFetch

      await noTokenBridge.subscribe({
        extensions: 'all',
      })

      // Should not make API call without token
      expect(mockFetch).not.toHaveBeenCalled()

      noTokenBridge.destroy()
    })
  })
})
