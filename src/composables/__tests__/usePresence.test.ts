import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowRef } from 'vue'
import { usePresence, type UsePresenceReturn } from '../usePresence'
import { PresenceState, type PresenceStatus } from '@/types/presence.types'
import type { SipClient } from '@/core/SipClient'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock validators
vi.mock('@/utils/validators', () => ({
  validateSipUri: vi.fn((uri: string) => {
    const isValid = uri.startsWith('sip:') || uri.includes('@')
    return {
      valid: isValid,
      error: isValid ? undefined : 'Invalid SIP URI format',
    }
  }),
}))

// Mock constants
vi.mock('../constants', () => ({
  PRESENCE_CONSTANTS: {
    DEFAULT_EXPIRES: 3600,
    SUBSCRIPTION_REFRESH_PERCENTAGE: 0.9,
  },
}))

describe('usePresence', () => {
  let mockSipClient: Partial<SipClient>
  let sipClientRef: ReturnType<typeof shallowRef>

  beforeEach(() => {
    mockSipClient = {
      getConfig: vi.fn().mockReturnValue({ uri: 'sip:user@domain.com' }),
      publishPresence: vi.fn().mockResolvedValue(undefined),
      subscribePresence: vi.fn().mockResolvedValue(undefined),
      unsubscribePresence: vi.fn().mockResolvedValue(undefined),
    }
    sipClientRef = shallowRef(mockSipClient)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  const createPresence = (): UsePresenceReturn => {
    return usePresence(sipClientRef)
  }

  describe('initial state', () => {
    it('should initialize with null current status', () => {
      const { currentStatus } = createPresence()
      expect(currentStatus.value).toBeNull()
    })

    it('should initialize with empty watched users map', () => {
      const { watchedUsers } = createPresence()
      expect(watchedUsers.value.size).toBe(0)
    })

    it('should initialize with empty subscriptions map', () => {
      const { subscriptions } = createPresence()
      expect(subscriptions.value.size).toBe(0)
    })

    it('should initialize with offline current state', () => {
      const { currentState } = createPresence()
      expect(currentState.value).toBe(PresenceState.Offline)
    })

    it('should initialize with zero subscription count', () => {
      const { subscriptionCount } = createPresence()
      expect(subscriptionCount.value).toBe(0)
    })
  })

  describe('setStatus', () => {
    it('should throw error when SIP client is not initialized', async () => {
      sipClientRef.value = null
      const { setStatus } = createPresence()

      await expect(setStatus(PresenceState.Available)).rejects.toThrow('SIP client not initialized')
    })

    it('should throw error for invalid presence state', async () => {
      const { setStatus } = createPresence()

      await expect(setStatus('invalid-state' as any)).rejects.toThrow('Invalid presence state')
    })

    it('should successfully set presence status', async () => {
      const { setStatus, currentStatus, currentState } = createPresence()

      await setStatus(PresenceState.Available, { statusMessage: 'Working' })

      expect(mockSipClient.publishPresence).toHaveBeenCalledWith({
        state: PresenceState.Available,
        statusMessage: 'Working',
        expires: 3600,
        extraHeaders: undefined,
      })
      expect(currentStatus.value).toEqual({
        uri: 'sip:user@domain.com',
        state: PresenceState.Available,
        statusMessage: 'Working',
        lastUpdated: expect.any(Date),
      })
      expect(currentState.value).toBe(PresenceState.Available)
    })

    it('should use custom expires value when provided', async () => {
      const { setStatus } = createPresence()

      await setStatus(PresenceState.Busy, { expires: 1800 })

      expect(mockSipClient.publishPresence).toHaveBeenCalledWith(
        expect.objectContaining({ expires: 1800 })
      )
    })

    it('should throw error for invalid expires value', async () => {
      const { setStatus } = createPresence()

      await expect(setStatus(PresenceState.Available, { expires: 0 })).rejects.toThrow(
        'Expires must be between 1 and 86400 seconds'
      )
      await expect(setStatus(PresenceState.Available, { expires: 90000 })).rejects.toThrow(
        'Expires must be between 1 and 86400 seconds'
      )
    })
  })

  describe('subscribe', () => {
    it('should throw error when SIP client is not initialized', async () => {
      sipClientRef.value = null
      const { subscribe } = createPresence()

      await expect(subscribe('sip:alice@domain.com')).rejects.toThrow('SIP client not initialized')
    })

    it('should throw error for invalid URI', async () => {
      const { subscribe } = createPresence()

      await expect(subscribe('invalid-uri')).rejects.toThrow('Invalid target URI')
    })

    it('should return existing subscription ID if already subscribed', async () => {
      const { subscribe, subscriptions } = createPresence()

      // First subscription
      const subId1 = await subscribe('sip:alice@domain.com')
      expect(subId1).toContain('sub-')

      // Second subscription - should return same
      const subId2 = await subscribe('sip:alice@domain.com')
      expect(subId2).toBe(subId1)
      expect(subscriptions.value.size).toBe(1)
    })

    it('should successfully subscribe to user presence', async () => {
      const { subscribe, subscriptions, subscriptionCount } = createPresence()

      const subscriptionId = await subscribe('sip:alice@domain.com')

      expect(subscriptionId).toContain('sub-')
      expect(subscriptions.value.has('sip:alice@domain.com')).toBe(true)
      expect(subscriptionCount.value).toBe(1)
      expect(mockSipClient.subscribePresence).toHaveBeenCalledWith(
        'sip:alice@domain.com',
        expect.objectContaining({
          expires: 3600,
          onNotify: expect.any(Function),
        })
      )
    })

    it('should set subscription state to active after successful subscription', async () => {
      const { subscribe, subscriptions } = createPresence()

      await subscribe('sip:alice@domain.com')

      const subscription = subscriptions.value.get('sip:alice@domain.com')
      expect(subscription?.state).toBe('active')
    })

    it('should handle subscription errors gracefully', async () => {
      mockSipClient.subscribePresence.mockRejectedValue(new Error('Network error'))
      const { subscribe, subscriptions } = createPresence()

      await expect(subscribe('sip:alice@domain.com')).rejects.toThrow('Network error')
      expect(subscriptions.value.has('sip:alice@domain.com')).toBe(false)
    })
  })

  describe('unsubscribe', () => {
    it('should throw error when SIP client is not initialized', async () => {
      sipClientRef.value = null
      const { unsubscribe } = createPresence()

      await expect(unsubscribe('sip:alice@domain.com')).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should throw error for invalid URI', async () => {
      const { unsubscribe } = createPresence()

      await expect(unsubscribe('invalid-uri')).rejects.toThrow('Invalid target URI')
    })

    it('should warn and return if no active subscription exists', async () => {
      const { unsubscribe } = createPresence()

      // Should not throw
      await unsubscribe('sip:alice@domain.com')
      expect(mockSipClient.unsubscribePresence).not.toHaveBeenCalled()
    })

    it('should successfully unsubscribe from user presence', async () => {
      const { subscribe, unsubscribe, subscriptions, watchedUsers } = createPresence()

      await subscribe('sip:alice@domain.com')
      expect(subscriptions.value.size).toBe(1)

      await unsubscribe('sip:alice@domain.com')

      expect(mockSipClient.unsubscribePresence).toHaveBeenCalledWith('sip:alice@domain.com')
      expect(subscriptions.value.has('sip:alice@domain.com')).toBe(false)
      expect(watchedUsers.value.has('sip:alice@domain.com')).toBe(false)
    })
  })

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all watched users', async () => {
      const { subscribe, unsubscribeAll, subscriptions } = createPresence()

      await subscribe('sip:alice@domain.com')
      await subscribe('sip:bob@domain.com')
      expect(subscriptions.value.size).toBe(2)

      await unsubscribeAll()

      expect(subscriptions.value.size).toBe(0)
    })
  })

  describe('getStatus', () => {
    it('should return null for invalid URI', () => {
      const { getStatus } = createPresence()

      expect(getStatus('invalid-uri')).toBeNull()
    })

    it('should return null for non-watched user', () => {
      const { getStatus } = createPresence()

      expect(getStatus('sip:alice@domain.com')).toBeNull()
    })

    it('should return presence status for watched user', () => {
      const { getStatus, subscribe, watchedUsers } = createPresence()

      // Subscribe first to set up subscription
      subscribe('sip:alice@domain.com')

      // Directly add to watchedUsers
      const status: PresenceStatus = {
        uri: 'sip:alice@domain.com',
        state: PresenceState.Available,
        lastUpdated: new Date(),
      }
      watchedUsers.value.set('sip:alice@domain.com', status)

      expect(getStatus('sip:alice@domain.com')).toEqual(status)
    })
  })

  describe('onPresenceEvent', () => {
    it('should add and return unsubscribe function for event listener', () => {
      const { onPresenceEvent } = createPresence()
      const callback = vi.fn()

      const unsubscribe = onPresenceEvent(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should call listeners when event is emitted', async () => {
      const { subscribe, onPresenceEvent } = createPresence()
      const callback = vi.fn()
      onPresenceEvent(callback)

      await subscribe('sip:alice@domain.com')

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscribed',
          uri: 'sip:alice@domain.com',
        })
      )
    })

    it('should remove listener when unsubscribe is called', async () => {
      const { subscribe, onPresenceEvent } = createPresence()
      const callback = vi.fn()
      const unsubscribe = onPresenceEvent(callback)

      unsubscribe()
      await subscribe('sip:alice@domain.com')

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('computed properties', () => {
    it('should update currentState when currentStatus changes', async () => {
      const { setStatus, currentState } = createPresence()

      expect(currentState.value).toBe(PresenceState.Offline)

      await setStatus(PresenceState.Available)
      expect(currentState.value).toBe(PresenceState.Available)

      await setStatus(PresenceState.Busy)
      expect(currentState.value).toBe(PresenceState.Busy)
    })

    it('should update subscriptionCount when subscriptions change', async () => {
      const { subscribe, subscriptionCount } = createPresence()

      expect(subscriptionCount.value).toBe(0)

      await subscribe('sip:alice@domain.com')
      expect(subscriptionCount.value).toBe(1)

      await subscribe('sip:bob@domain.com')
      expect(subscriptionCount.value).toBe(2)
    })
  })
})
