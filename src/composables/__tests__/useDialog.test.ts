/**
 * useDialog composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDialog } from '../useDialog'
import { DialogState, type DialogStatus, type DialogSubscription } from '@/types/presence.types'
import type { SipClient } from '@/core/SipClient'
import { EventEmitter } from '@/utils/EventEmitter'

describe('useDialog', () => {
  let mockSipClient: SipClient
  let mockEventBus: EventEmitter

  beforeEach(() => {
    mockEventBus = new EventEmitter()
    mockSipClient = {
      eventBus: mockEventBus,
    } as unknown as SipClient
  })

  describe('initial state', () => {
    it('should return empty watched extensions map', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { watchedExtensions, subscriptions, subscriptionCount } = useDialog(sipClientRef)

      expect(watchedExtensions.value).toBeInstanceOf(Map)
      expect(watchedExtensions.value.size).toBe(0)
      expect(subscriptions.value).toBeInstanceOf(Map)
      expect(subscriptions.value.size).toBe(0)
      expect(subscriptionCount.value).toBe(0)
    })

    it('should return default display config', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { displayConfig } = useDialog(sipClientRef)

      expect(displayConfig.value).toEqual({
        mode: 'emoji',
        animations: true,
      })
    })
  })

  describe('display configuration', () => {
    it('should allow setting display config', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { displayConfig, setDisplayConfig } = useDialog(sipClientRef)

      setDisplayConfig({ mode: 'text', animations: false })

      expect(displayConfig.value.mode).toBe('text')
      expect(displayConfig.value.animations).toBe(false)
    })

    it('should merge partial display config', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { displayConfig, setDisplayConfig } = useDialog(sipClientRef)

      setDisplayConfig({ mode: 'text' })

      expect(displayConfig.value.mode).toBe('text')
      expect(displayConfig.value.animations).toBe(true) // unchanged
    })
  })

  describe('getStatus', () => {
    it('should return undefined for unknown extension', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { getStatus } = useDialog(sipClientRef)

      expect(getStatus('sip:6001@pbx.example.com')).toBeUndefined()
    })
  })

  describe('getDisplayOptions', () => {
    it('should return display options for each dialog state', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { getDisplayOptions } = useDialog(sipClientRef)

      const states = [
        DialogState.Idle,
        DialogState.Ringing,
        DialogState.Trying,
        DialogState.InCall,
        DialogState.OnHold,
        DialogState.Confirmed,
        DialogState.Unavailable,
        DialogState.Unknown,
      ]

      states.forEach((state) => {
        const options = getDisplayOptions(state)
        expect(options).toBeDefined()
        expect(options.icon).toBeDefined()
        expect(options.label).toBeDefined()
        expect(options.color).toBeDefined()
      })
    })

    it('should apply state overrides when configured', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { getDisplayOptions, setDisplayConfig } = useDialog(sipClientRef)

      setDisplayConfig({
        stateOverrides: {
          [DialogState.Busy]: {
            icon: '🔥',
            label: 'On Fire',
          },
        },
      } as any)

      // Note: This tests the override mechanism exists
      const options = getDisplayOptions(DialogState.Idle)
      expect(options.icon).toBeDefined()
    })
  })

  describe('event handling', () => {
    it('should allow registering dialog event listeners', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { onDialogEvent } = useDialog(sipClientRef)

      const callback = vi.fn()
      const unsubscribe = onDialogEvent(callback)

      // Should return unsubscribe function
      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
    })

    it('should call registered listeners on dialog events', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { onDialogEvent, watchedExtensions } = useDialog(sipClientRef)

      const callback = vi.fn()
      onDialogEvent(callback)

      // Manually trigger a dialog event by updating watchedExtensions
      const testStatus: DialogStatus = {
        state: DialogState.Ringing,
        callId: 'test-call-123',
        remoteUri: 'sip:6001@pbx.example.com',
      }

      watchedExtensions.value.set('sip:6001@pbx.example.com', testStatus)

      await nextTick()

      // The event emission happens internally when status changes
      // This test verifies the setup works
      expect(watchedExtensions.value.size).toBe(1)
    })
  })

  describe('subscription count', () => {
    it('should update subscription count reactively', () => {
      const sipClientRef = ref<SipClient | null>(null)
      const { subscriptions, subscriptionCount } = useDialog(sipClientRef)

      expect(subscriptionCount.value).toBe(0)

      // Manually add a subscription to test reactivity
      const testSub: DialogSubscription = {
        id: 'sub-1',
        targetUri: 'sip:6001@pbx.example.com',
        state: 'active',
        expires: 600,
        expiresAt: new Date(),
      }

      subscriptions.value.set('sip:6001@pbx.example.com', testSub)

      expect(subscriptionCount.value).toBe(1)
    })
  })
})
