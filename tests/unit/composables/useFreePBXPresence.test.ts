/**
 * useFreePBXPresence Composable Tests
 *
 * @group composables
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFreePBXPresence } from '@/composables/useFreePBXPresence'
import type { FreePBXPresenceBridgeConfig } from '@/types/freepbx-presence.types'
import { FreePBXPresenceCode } from '@/types/freepbx-presence.types'

// Use vi.hoisted to create mock before import
const { FreePBXPresenceBridge: MockBridge } = vi.hoisted(() => ({
  FreePBXPresenceBridge: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    setUserAgent: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn(),
    unsubscribeAll: vi.fn(),
    setReturnTime: vi.fn(),
    clearReturnTime: vi.fn(),
  })),
}))

vi.mock('@/core/FreePBXPresenceBridge', () => ({
  FreePBXPresenceBridge: MockBridge,
}))

describe('useFreePBXPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should create with default empty state', () => {
      const { presenceMap, presenceList, isSubscribed, error, selectedExtension } =
        useFreePBXPresence()

      expect(presenceMap.value).toBeInstanceOf(Map)
      expect(presenceMap.value.size).toBe(0)
      expect(presenceList.value).toEqual([])
      expect(isSubscribed.value).toBe(false)
      expect(error.value).toBeNull()
      expect(selectedExtension.value).toBeNull()
    })

    it('should initialize with provided config', () => {
      const config: FreePBXPresenceBridgeConfig = {
        host: 'pbx.example.com',
        apiToken: 'test-token',
      }

      const { initialize } = useFreePBXPresence()

      expect(() => initialize(config)).not.toThrow()
    })
  })

  describe('computed properties', () => {
    it('should count available, busy, and away extensions', () => {
      const { presenceMap, availableCount, busyCount, awayCount } = useFreePBXPresence()

      // Manually set some presence data
      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
        ['102', { extension: '102', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
        ['103', { extension: '103', presenceCode: FreePBXPresenceCode.Away, state: 'away' }],
        [
          '104',
          { extension: '104', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      expect(availableCount.value).toBe(2)
      expect(busyCount.value).toBe(1)
      expect(awayCount.value).toBe(1)
    })

    it('should identify busy extensions correctly', () => {
      const { presenceMap, busyCount } = useFreePBXPresence()

      presenceMap.value = new Map([
        ['101', { extension: '101', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
        ['102', { extension: '102', presenceCode: FreePBXPresenceCode.Busy, state: 'busy' }],
        ['103', { extension: '103', presenceCode: FreePBXPresenceCode.InMeeting, state: 'busy' }],
        [
          '104',
          { extension: '104', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      expect(busyCount.value).toBe(3)
    })

    it('should identify away extensions correctly', () => {
      const { presenceMap, awayCount } = useFreePBXPresence()

      presenceMap.value = new Map([
        ['101', { extension: '101', presenceCode: FreePBXPresenceCode.Away, state: 'away' }],
        [
          '102',
          { extension: '102', presenceCode: FreePBXPresenceCode.ExtendedAway, state: 'away' },
        ],
        ['103', { extension: '103', presenceCode: FreePBXPresenceCode.Lunch, state: 'away' }],
        [
          '104',
          { extension: '104', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      expect(awayCount.value).toBe(3)
    })
  })

  describe('getPresence', () => {
    it('should return null for non-existent extension', () => {
      const { getPresence } = useFreePBXPresence()

      expect(getPresence('999')).toBeNull()
    })

    it('should return ExtensionPresence with computed helpers', () => {
      const { presenceMap, getPresence } = useFreePBXPresence()

      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      const presence = getPresence('101')
      expect(presence).not.toBeNull()
      expect(presence!.extension).toBe('101')
      expect(presence!.isAvailable).toBe(true)
      expect(presence!.isBusy).toBe(false)
      expect(presence!.isAway).toBe(false)
    })
  })

  describe('selectExtension', () => {
    it('should set and clear selected extension', () => {
      const { selectExtension, selectedExtension, presenceMap, selectedPresence } =
        useFreePBXPresence()

      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      selectExtension('101')
      expect(selectedExtension.value).toBe('101')
      expect(selectedPresence.value).not.toBeNull()
      expect(selectedPresence.value?.extension).toBe('101')

      selectExtension(null)
      expect(selectedExtension.value).toBeNull()
      expect(selectedPresence.value).toBeNull()
    })
  })

  describe('isExtensionAvailable', () => {
    it('should check if extension is available', () => {
      const { presenceMap, isExtensionAvailable } = useFreePBXPresence()

      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
        ['102', { extension: '102', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
      ])

      expect(isExtensionAvailable('101')).toBe(true)
      expect(isExtensionAvailable('102')).toBe(false)
      expect(isExtensionAvailable('999')).toBe(false)
    })
  })

  describe('isExtensionBusy', () => {
    it('should check if extension is busy', () => {
      const { presenceMap, isExtensionBusy } = useFreePBXPresence()

      presenceMap.value = new Map([
        ['101', { extension: '101', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
        [
          '102',
          { extension: '102', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      expect(isExtensionBusy('101')).toBe(true)
      expect(isExtensionBusy('102')).toBe(false)
    })
  })

  describe('filterByState', () => {
    it('should filter extensions by presence state', () => {
      const { presenceMap, filterByState } = useFreePBXPresence()

      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
        ['102', { extension: '102', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
        ['103', { extension: '103', presenceCode: FreePBXPresenceCode.Away, state: 'away' }],
      ])

      const available = filterByState('available')
      expect(available).toHaveLength(1)
      expect(available[0].extension).toBe('101')

      const busy = filterByState('busy')
      expect(busy).toHaveLength(1)
      expect(busy[0].extension).toBe('102')
    })
  })

  describe('returnTime tracking', () => {
    it('should count extensions with return time', () => {
      const { presenceMap, withReturnTimeCount } = useFreePBXPresence()

      const now = new Date()
      const future = new Date(now.getTime() + 30 * 60 * 1000) // 30 min from now

      presenceMap.value = new Map([
        [
          '101',
          {
            extension: '101',
            presenceCode: FreePBXPresenceCode.OnPhone,
            state: 'busy',
            returnTime: {
              time: future,
              isOverdue: false,
              formattedTime: '14:30',
              formattedRemaining: '30 min',
            },
          },
        ],
        [
          '102',
          { extension: '102', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])

      expect(withReturnTimeCount.value).toBe(1)
    })

    it('should identify overdue extensions', () => {
      const { presenceMap, overdueCount, overdueExtensions } = useFreePBXPresence()

      const past = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago

      presenceMap.value = new Map([
        [
          '101',
          {
            extension: '101',
            presenceCode: FreePBXPresenceCode.OnPhone,
            state: 'busy',
            returnTime: {
              time: past,
              isOverdue: true,
              formattedTime: '14:00',
              formattedRemaining: '-30 min',
            },
          },
        ],
        ['102', { extension: '102', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
      ])

      expect(overdueCount.value).toBe(1)
      expect(overdueExtensions.value).toHaveLength(1)
      expect(overdueExtensions.value[0].extension).toBe('101')
    })
  })

  describe('destroy', () => {
    it('should cleanup all state', () => {
      // Test state cleanup without bridge initialization
      const { presenceMap, isSubscribed, selectedExtension, destroy } = useFreePBXPresence()

      // Add some data
      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
      ])
      isSubscribed.value = true
      selectedExtension.value = '101'

      destroy()

      expect(presenceMap.value.size).toBe(0)
      expect(isSubscribed.value).toBe(false)
      expect(selectedExtension.value).toBeNull()
    })
  })

  describe('presenceList', () => {
    it('should convert map to array with computed helpers', () => {
      const { presenceMap, presenceList } = useFreePBXPresence()

      presenceMap.value = new Map([
        [
          '101',
          { extension: '101', presenceCode: FreePBXPresenceCode.Available, state: 'available' },
        ],
        ['102', { extension: '102', presenceCode: FreePBXPresenceCode.OnPhone, state: 'busy' }],
      ])

      expect(presenceList.value).toHaveLength(2)
      expect(presenceList.value[0]).toHaveProperty('isAvailable')
      expect(presenceList.value[0]).toHaveProperty('isBusy')
      expect(presenceList.value[0]).toHaveProperty('isAway')
    })
  })
})
