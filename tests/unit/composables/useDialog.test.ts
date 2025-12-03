/**
 * useDialog composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { DialogState, DEFAULT_DIALOG_DISPLAY } from '@/types/presence.types'
import type { SipClient } from '@/core/SipClient'
import type { DialogStatus } from '@/types/presence.types'

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

// Mock EventBus
const mockEventBus = {
  on: vi.fn((event: string, handler: Function) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler)
  }),
  off: vi.fn((event: string, handler: Function) => {
    if (eventHandlers[event]) {
      eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
    }
  }),
}

// Create mock SIP client
const createMockSipClient = (): SipClient => {
  Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

  return {
    subscribeDialog: vi.fn().mockResolvedValue('sub-123'),
    unsubscribeDialog: vi.fn().mockResolvedValue(undefined),
    unsubscribeAllDialogs: vi.fn().mockResolvedValue(undefined),
    getEventBus: vi.fn().mockReturnValue(mockEventBus),
    eventBus: mockEventBus,
  } as unknown as SipClient
}

// Helper to trigger events
function triggerEvent(event: string, data: any) {
  eventHandlers[event]?.forEach(handler => handler(data))
}

describe('useDialog', () => {
  let mockSipClient: SipClient

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
    mockSipClient = createMockSipClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty watched extensions initially', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { watchedExtensions } = useDialog(sipClientRef)

      expect(watchedExtensions.value.size).toBe(0)
    })

    it('should have empty subscriptions initially', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscriptions, subscriptionCount } = useDialog(sipClientRef)

      expect(subscriptions.value.size).toBe(0)
      expect(subscriptionCount.value).toBe(0)
    })

    it('should have default display config', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { displayConfig } = useDialog(sipClientRef)

      expect(displayConfig.value.mode).toBe('emoji')
      expect(displayConfig.value.animations).toBe(true)
    })

    it('should handle null sip client gracefully', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { watchedExtensions, subscriptions } = useDialog(sipClientRef)

      expect(watchedExtensions.value.size).toBe(0)
      expect(subscriptions.value.size).toBe(0)
    })
  })

  describe('subscribe', () => {
    it('should subscribe to extension dialog', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscribe } = useDialog(sipClientRef)

      const subId = await subscribe('sip:1000@pbx.example.com')

      expect(subId).toBe('sub-123')
      expect(mockSipClient.subscribeDialog).toHaveBeenCalledWith('sip:1000@pbx.example.com', undefined)
    })

    it('should pass options to subscribeDialog', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscribe } = useDialog(sipClientRef)

      await subscribe('sip:1000@pbx.example.com', { expires: 3600 })

      expect(mockSipClient.subscribeDialog).toHaveBeenCalledWith('sip:1000@pbx.example.com', { expires: 3600 })
    })

    it('should throw for invalid SIP URI', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscribe } = useDialog(sipClientRef)

      await expect(subscribe('invalid-uri')).rejects.toThrow('Invalid SIP URI')
    })

    it('should throw when sip client is null', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { subscribe } = useDialog(sipClientRef)

      await expect(subscribe('sip:1000@pbx.example.com')).rejects.toThrow('SIP client not available')
    })

    it('should emit error event on failure', async () => {
      ;(mockSipClient.subscribeDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscribe, onDialogEvent } = useDialog(sipClientRef)

      const eventHandler = vi.fn()
      onDialogEvent(eventHandler)

      await expect(subscribe('sip:1000@pbx.example.com')).rejects.toThrow('Network error')

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          uri: 'sip:1000@pbx.example.com',
          error: 'Network error',
        })
      )
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe from extension dialog', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { unsubscribe } = useDialog(sipClientRef)

      await unsubscribe('sip:1000@pbx.example.com')

      expect(mockSipClient.unsubscribeDialog).toHaveBeenCalledWith('sip:1000@pbx.example.com')
    })

    it('should throw when sip client is null', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { unsubscribe } = useDialog(sipClientRef)

      await expect(unsubscribe('sip:1000@pbx.example.com')).rejects.toThrow('SIP client not available')
    })
  })

  describe('subscribeMany', () => {
    it('should subscribe to multiple extensions', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscribeMany } = useDialog(sipClientRef)

      const results = await subscribeMany([
        'sip:1000@pbx.example.com',
        'sip:1001@pbx.example.com',
        'sip:1002@pbx.example.com',
      ])

      expect(results.length).toBe(3)
      expect(mockSipClient.subscribeDialog).toHaveBeenCalledTimes(3)
    })

    it('should continue on individual subscription failures', async () => {
      ;(mockSipClient.subscribeDialog as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('sub-1')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('sub-3')

      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscribeMany } = useDialog(sipClientRef)

      const results = await subscribeMany([
        'sip:1000@pbx.example.com',
        'sip:1001@pbx.example.com',
        'sip:1002@pbx.example.com',
      ])

      expect(results.length).toBe(2)
      expect(results).toContain('sub-1')
      expect(results).toContain('sub-3')
    })
  })

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all extensions', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { unsubscribeAll, subscriptions, watchedExtensions } = useDialog(sipClientRef)

      // Add some entries first
      subscriptions.value.set('sip:1000@test.com', {
        id: 'sub-1',
        targetUri: 'sip:1000@test.com',
        state: 'active',
        expires: 600,
        expiresAt: new Date(),
      })
      watchedExtensions.value.set('sip:1000@test.com', {
        state: DialogState.Confirmed,
        direction: 'initiator',
        remoteTag: '',
        callId: '',
      })

      await unsubscribeAll()

      expect(mockSipClient.unsubscribeAllDialogs).toHaveBeenCalled()
      expect(subscriptions.value.size).toBe(0)
      expect(watchedExtensions.value.size).toBe(0)
    })

    it('should handle null sip client gracefully', async () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { unsubscribeAll } = useDialog(sipClientRef)

      await unsubscribeAll() // Should not throw
    })
  })

  describe('getStatus', () => {
    it('should return status for watched extension', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { getStatus, watchedExtensions } = useDialog(sipClientRef)

      const status: DialogStatus = {
        state: DialogState.Confirmed,
        direction: 'initiator',
        remoteTag: 'abc123',
        callId: 'call-123',
      }
      watchedExtensions.value.set('sip:1000@test.com', status)

      const result = getStatus('sip:1000@test.com')

      expect(result).toEqual(status)
    })

    it('should return undefined for unknown extension', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { getStatus } = useDialog(sipClientRef)

      expect(getStatus('sip:unknown@test.com')).toBeUndefined()
    })
  })

  describe('getDisplayOptions', () => {
    it('should return display options for dialog state', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { getDisplayOptions } = useDialog(sipClientRef)

      const options = getDisplayOptions(DialogState.Confirmed)

      expect(options).toHaveProperty('icon')
      expect(options).toHaveProperty('label')
      expect(options).toHaveProperty('color')
    })

    it('should return default options for unknown state', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { getDisplayOptions } = useDialog(sipClientRef)

      const options = getDisplayOptions(DialogState.Unknown)

      expect(options).toEqual(DEFAULT_DIALOG_DISPLAY[DialogState.Unknown])
    })

    it('should use custom display config when set', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { getDisplayOptions, setDisplayConfig } = useDialog(sipClientRef)

      setDisplayConfig({
        stateDisplay: {
          [DialogState.Confirmed]: {
            icon: 'custom-icon',
            label: 'Custom Label',
            color: '#ff0000',
            cssClass: 'custom-class',
          },
        },
      })

      const options = getDisplayOptions(DialogState.Confirmed)

      expect(options.icon).toBe('custom-icon')
      expect(options.label).toBe('Custom Label')
      expect(options.color).toBe('#ff0000')
    })
  })

  describe('setDisplayConfig', () => {
    it('should update display config', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { displayConfig, setDisplayConfig } = useDialog(sipClientRef)

      setDisplayConfig({
        mode: 'icon',
        animations: false,
      })

      expect(displayConfig.value.mode).toBe('icon')
      expect(displayConfig.value.animations).toBe(false)
    })

    it('should merge with existing config', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { displayConfig, setDisplayConfig } = useDialog(sipClientRef)

      setDisplayConfig({ mode: 'icon' })
      setDisplayConfig({ animations: false })

      expect(displayConfig.value.mode).toBe('icon')
      expect(displayConfig.value.animations).toBe(false)
    })
  })

  describe('onDialogEvent', () => {
    it('should register event listener', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { onDialogEvent } = useDialog(sipClientRef)

      const callback = vi.fn()
      const unsubscribe = onDialogEvent(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should unregister event listener', () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { onDialogEvent, watchedExtensions: _watchedExtensions } = useDialog(sipClientRef)

      const callback = vi.fn()
      const unsubscribe = onDialogEvent(callback)

      unsubscribe()

      // Simulate an event
      triggerEvent('sip:dialog:notify', {
        uri: 'sip:1000@test.com',
        status: { state: DialogState.Confirmed, direction: 'initiator', remoteTag: '', callId: '' },
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('event handling', () => {
    it('should handle dialog notify events', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { watchedExtensions, onDialogEvent } = useDialog(sipClientRef)

      const callback = vi.fn()
      onDialogEvent(callback)

      const status: DialogStatus = {
        state: DialogState.Early,
        direction: 'recipient',
        remoteTag: 'tag123',
        callId: 'call-456',
      }

      triggerEvent('sip:dialog:notify', {
        uri: 'sip:1000@test.com',
        status,
      })

      await nextTick()

      expect(watchedExtensions.value.get('sip:1000@test.com')).toEqual(status)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'updated',
          uri: 'sip:1000@test.com',
          status,
        })
      )
    })

    it('should handle subscription events', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscriptions, onDialogEvent } = useDialog(sipClientRef)

      const callback = vi.fn()
      onDialogEvent(callback)

      triggerEvent('sip:dialog:subscribe', {
        uri: 'sip:1000@test.com',
        subscriptionId: 'sub-123',
        expires: 600,
      })

      await nextTick()

      expect(subscriptions.value.has('sip:1000@test.com')).toBe(true)
      const sub = subscriptions.value.get('sip:1000@test.com')
      expect(sub?.id).toBe('sub-123')
      expect(sub?.expires).toBe(600)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscribed',
          uri: 'sip:1000@test.com',
        })
      )
    })

    it('should handle unsubscribe events', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscriptions, watchedExtensions, onDialogEvent } = useDialog(sipClientRef)

      // Add initial data
      subscriptions.value.set('sip:1000@test.com', {
        id: 'sub-123',
        targetUri: 'sip:1000@test.com',
        state: 'active',
        expires: 600,
        expiresAt: new Date(),
      })
      watchedExtensions.value.set('sip:1000@test.com', {
        state: DialogState.Confirmed,
        direction: 'initiator',
        remoteTag: '',
        callId: '',
      })

      const callback = vi.fn()
      onDialogEvent(callback)

      triggerEvent('sip:dialog:unsubscribe', {
        uri: 'sip:1000@test.com',
      })

      await nextTick()

      expect(subscriptions.value.has('sip:1000@test.com')).toBe(false)
      expect(watchedExtensions.value.has('sip:1000@test.com')).toBe(false)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unsubscribed',
          uri: 'sip:1000@test.com',
        })
      )
    })

    it('should handle refresh events', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscriptions, onDialogEvent } = useDialog(sipClientRef)

      // Add initial subscription
      const originalExpiresAt = new Date(Date.now() - 1000) // Already expired
      subscriptions.value.set('sip:1000@test.com', {
        id: 'sub-123',
        targetUri: 'sip:1000@test.com',
        state: 'active',
        expires: 600,
        expiresAt: originalExpiresAt,
      })

      const callback = vi.fn()
      onDialogEvent(callback)

      triggerEvent('sip:dialog:refreshed', {
        uri: 'sip:1000@test.com',
      })

      await nextTick()

      const sub = subscriptions.value.get('sip:1000@test.com')
      expect(sub?.expiresAt?.getTime()).toBeGreaterThan(originalExpiresAt.getTime())
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refreshed',
          uri: 'sip:1000@test.com',
        })
      )
    })

    it('should ignore events with missing data', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { watchedExtensions } = useDialog(sipClientRef)

      triggerEvent('sip:dialog:notify', {
        uri: null,
        status: null,
      })

      await nextTick()

      expect(watchedExtensions.value.size).toBe(0)
    })
  })

  describe('subscriptionCount', () => {
    it('should update when subscriptions change', async () => {
      const sipClientRef = ref<SipClient | null>(mockSipClient)
      const { subscriptions, subscriptionCount } = useDialog(sipClientRef)

      expect(subscriptionCount.value).toBe(0)

      subscriptions.value.set('sip:1000@test.com', {
        id: 'sub-1',
        targetUri: 'sip:1000@test.com',
        state: 'active',
        expires: 600,
        expiresAt: new Date(),
      })

      await nextTick()
      expect(subscriptionCount.value).toBe(1)

      subscriptions.value.set('sip:1001@test.com', {
        id: 'sub-2',
        targetUri: 'sip:1001@test.com',
        state: 'active',
        expires: 600,
        expiresAt: new Date(),
      })

      await nextTick()
      expect(subscriptionCount.value).toBe(2)

      subscriptions.value.delete('sip:1000@test.com')

      await nextTick()
      expect(subscriptionCount.value).toBe(1)
    })
  })
})
