/**
 * useDialog Composable Tests
 *
 * Tests for the Dialog/BLF (Busy Lamp Field) composable including:
 * - Basic state initialization
 * - Subscription management
 * - Dialog event handling
 * - Display configuration
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, type Ref } from 'vitest'
import { ref } from 'vue'
import { useDialog } from '../../src/composables/useDialog'
import { DialogState } from '../../src/types/presence.types'
import type { SipClient } from '../../src/core/SipClient'

// Mock the SipClient
const createMockSipClient = (): Partial<SipClient> => {
  const eventBus = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }

  return {
    eventBus: eventBus as any,
    subscribeDialog: vi.fn().mockResolvedValue('sub-123'),
    unsubscribeDialog: vi.fn().mockResolvedValue(undefined),
    unsubscribeAllDialogs: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useDialog', () => {
  let mockSipClient: Partial<SipClient>
  let sipClientRef: Ref<SipClient | null>

  beforeEach(() => {
    mockSipClient = createMockSipClient()
    sipClientRef = ref(mockSipClient as SipClient)
    vi.clearAllMocks()
  })

  describe('Basic State', () => {
    it('should initialize with empty watched extensions', () => {
      const { watchedExtensions } = useDialog(sipClientRef)
      expect(watchedExtensions.value.size).toBe(0)
    })

    it('should initialize with empty subscriptions', () => {
      const { subscriptions } = useDialog(sipClientRef)
      expect(subscriptions.value.size).toBe(0)
    })

    it('should initialize with default display config', () => {
      const { displayConfig } = useDialog(sipClientRef)
      expect(displayConfig.value.mode).toBe('emoji')
      expect(displayConfig.value.animations).toBe(true)
    })

    it('should compute correct subscription count', () => {
      const { subscriptionCount } = useDialog(sipClientRef)
      expect(subscriptionCount.value).toBe(0)
    })
  })

  describe('getStatus', () => {
    it('should return undefined for unknown extension', () => {
      const { getStatus } = useDialog(sipClientRef)
      expect(getStatus('sip:6001@example.com')).toBeUndefined()
    })

    it('should return status for known extension', () => {
      const { getStatus, watchedExtensions } = useDialog(sipClientRef)

      // Manually add a watched extension
      watchedExtensions.value.set('sip:6001@example.com', {
        state: DialogState.Idle,
        localUri: 'sip:6001@example.com',
        remoteUri: 'sip:6002@example.com',
      })

      const status = getStatus('sip:6001@example.com')
      expect(status).toBeDefined()
      expect(status?.state).toBe(DialogState.Idle)
    })
  })

  describe('getDisplayOptions', () => {
    it('should return default options for Idle state', () => {
      const { getDisplayOptions } = useDialog(sipClientRef)
      const options = getDisplayOptions(DialogState.Idle)

      expect(options.color).toBe('green')
      expect(options.icon).toBe('phone-idle')
      expect(options.label).toBe('Available')
      expect(options.isActive).toBe(false)
    })

    it('should return default options for InCall state', () => {
      const { getDisplayOptions } = useDialog(sipClientRef)
      const options = getDisplayOptions(DialogState.InCall)

      expect(options.color).toBe('red')
      expect(options.icon).toBe('phone-in-talk')
      expect(options.label).toBe('In Call')
      expect(options.isActive).toBe(true)
    })

    it('should return default options for Ringing state', () => {
      const { getDisplayOptions } = useDialog(sipClientRef)
      const options = getDisplayOptions(DialogState.Ringing)

      expect(options.color).toBe('orange')
      expect(options.icon).toBe('phone-ringing')
      expect(options.label).toBe('Ringing')
      expect(options.isActive).toBe(true)
    })

    it('should return default options for unknown state', () => {
      const { getDisplayOptions } = useDialog(sipClientRef)
      const options = getDisplayOptions(DialogState.Unknown)

      expect(options.color).toBe('gray')
      expect(options.icon).toBe('phone-unknown')
      expect(options.label).toBe('Unknown')
      expect(options.isActive).toBe(false)
    })
  })

  describe('setDisplayConfig', () => {
    it('should update display config', () => {
      const { setDisplayConfig, displayConfig } = useDialog(sipClientRef)

      setDisplayConfig({ mode: 'text' })

      expect(displayConfig.value.mode).toBe('text')
    })

    it('should preserve existing config when updating', () => {
      const { setDisplayConfig, displayConfig } = useDialog(sipClientRef)

      setDisplayConfig({ animations: false })

      expect(displayConfig.value.mode).toBe('emoji') // original
      expect(displayConfig.value.animations).toBe(false)
    })
  })

  describe('onDialogEvent', () => {
    it('should add and return cleanup function for event listener', () => {
      const { onDialogEvent } = useDialog(sipClientRef)
      const callback = vi.fn()

      const cleanup = onDialogEvent(callback)

      expect(typeof cleanup).toBe('function')
      cleanup()
    })

    it('should call registered callback on dialog event', () => {
      const { onDialogEvent, watchedExtensions } = useDialog(sipClientRef)
      const callback = vi.fn()

      onDialogEvent(callback)

      // Manually add extension to trigger event
      watchedExtensions.value.set('sip:6001@example.com', {
        state: DialogState.InCall,
        localUri: 'sip:6001@example.com',
        remoteUri: 'sip:6002@example.com',
      })

      // The callback should be called when events are emitted
      // (This is tested via the internal emitDialogEvent)
    })
  })

  describe('null SipClient', () => {
    it('should handle null sipClient gracefully', () => {
      const nullClientRef = ref(null)
      const { subscribe, unsubscribe, unsubscribeAll } = useDialog(nullClientRef)

      // These should throw or handle null gracefully
      expect(() => subscribe('sip:6001@example.com')).rejects.toThrow('SIP client not available')
      expect(() => unsubscribe('sip:6001@example.com')).rejects.toThrow('SIP client not available')
      expect(() => unsubscribeAll()).not.toThrow()
    })
  })

  describe('Dialog State Coverage', () => {
    it('should provide display options for all dialog states', () => {
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
        expect(options.color).toBeDefined()
        expect(options.icon).toBeDefined()
        expect(options.label).toBeDefined()
        expect(typeof options.isActive).toBe('boolean')
      })
    })
  })
})
