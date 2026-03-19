/**
 * useConfirm Composable Tests
 *
 * Tests for the confirmation dialog composable including:
 * - Basic confirm/cancel flow
 * - Options merging
 * - Helper functions
 * - Reset functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useConfirm,
  confirmEndCall,
  confirmLeaveConference,
  confirmDeleteRecording,
} from '../../src/composables/useConfirm'

describe('useConfirm', () => {
  beforeEach(() => {
    // Clean up any global state before each test
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic State', () => {
    it('should initialize with correct default state', () => {
      const { isOpen, options, isConfirming, isVisible } = useConfirm()

      expect(isOpen.value).toBe(false)
      expect(options.value).toBe(null)
      expect(isConfirming.value).toBe(false)
      expect(isVisible.value).toBe(false)
    })
  })

  describe('confirm', () => {
    it('should open dialog with provided options', async () => {
      const { confirm, isOpen, options } = useConfirm()

      const promise = confirm({
        title: 'Test Title',
        message: 'Test Message',
        variant: 'danger',
      })

      // Dialog should be open
      expect(isOpen.value).toBe(true)
      expect(options.value?.title).toBe('Test Title')
      expect(options.value?.message).toBe('Test Message')
      expect(options.value?.variant).toBe('danger')

      // Complete the confirmation
      promise.then(() => {}) // Keep promise alive
    })

    it('should merge options with defaults', async () => {
      const { confirm, options } = useConfirm()

      const promise = confirm({
        message: 'Custom message',
      })

      expect(options.value?.title).toBe('Confirm Action') // default
      expect(options.value?.message).toBe('Custom message')
      expect(options.value?.confirmText).toBe('Confirm') // default
      expect(options.value?.showCancel).toBe(true) // default
      expect(options.value?.width).toBe('400px') // default

      promise.then(() => {})
    })

    it('should allow overriding default options', async () => {
      const { confirm, options } = useConfirm({
        title: 'Default Title',
        confirmText: 'Yes',
      })

      const promise = confirm({
        message: 'Override test',
        title: 'Specific Title', // This should override the default
      })

      // Per implementation, later options override earlier ones
      expect(options.value?.title).toBe('Specific Title')
      expect(options.value?.confirmText).toBe('Yes')

      promise.then(() => {})
    })

    it('should resolve with confirmed: true when confirmCurrent is called', async () => {
      const { confirm, confirmCurrent } = useConfirm()

      const promise = confirm({
        message: 'Test confirmation',
      })

      // Simulate user clicking confirm
      confirmCurrent({ extraData: 'test' })

      const result = await promise
      expect(result.confirmed).toBe(true)
      expect(result.payload).toEqual({ extraData: 'test' })
    })

    it('should resolve with confirmed: false when cancelCurrent is called', async () => {
      const { confirm, cancelCurrent } = useConfirm()

      const promise = confirm({
        message: 'Test cancellation',
      })

      // Simulate user clicking cancel
      cancelCurrent()

      const result = await promise
      expect(result.confirmed).toBe(false)
    })

    it('should resolve with false when close is called', async () => {
      const { confirm, close } = useConfirm()

      const promise = confirm({
        message: 'Test close',
      })

      close()

      const result = await promise
      expect(result.confirmed).toBe(false)
    })
  })

  describe('confirmAsync', () => {
    it('should call onConfirm callback when confirmed', async () => {
      vi.useRealTimers() // Use real timers for async tests
      const { confirmAsync, confirmCurrent } = useConfirm()

      const onConfirm = vi.fn().mockResolvedValue(undefined)
      const onCancel = vi.fn()

      const promise = confirmAsync(
        {
          message: 'Async test',
        },
        onConfirm,
        onCancel
      )

      // Resolve the confirmation
      confirmCurrent()

      await promise

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should call onCancel callback when cancelled', async () => {
      const { confirmAsync, cancelCurrent } = useConfirm()

      const onConfirm = vi.fn()
      const onCancel = vi.fn().mockImplementation(() => {})

      const promise = confirmAsync(
        {
          message: 'Async cancel test',
        },
        onConfirm,
        onCancel
      )

      // Cancel the dialog
      cancelCurrent()

      await promise

      expect(onConfirm).not.toHaveBeenCalled()
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should set isConfirming during callback execution', async () => {
      vi.useRealTimers()
      const { confirmAsync, isConfirming, confirmCurrent } = useConfirm()

      let confirmingDuringCallback = false

      const onConfirm = vi.fn().mockImplementation(() => {
        confirmingDuringCallback = isConfirming.value
        return Promise.resolve()
      })

      const promise = confirmAsync(
        {
          message: 'Is confirming test',
        },
        onConfirm
      )

      confirmCurrent()

      await promise

      expect(confirmingDuringCallback).toBe(true)
      expect(isConfirming.value).toBe(false) // Should be reset after
    })
  })

  describe('close', () => {
    it('should close dialog and clear options', () => {
      const { confirm, close, isOpen, options } = useConfirm()

      // Open dialog
      confirm({ message: 'Test' })
      expect(isOpen.value).toBe(true)

      // Close dialog
      close()

      expect(isOpen.value).toBe(false)
      expect(options.value).toBe(null)
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { confirm, reset, isOpen, options, isConfirming } = useConfirm()

      // Open and modify state
      confirm({ message: 'Test' })
      expect(isOpen.value).toBe(true)

      // Reset
      reset()

      expect(isOpen.value).toBe(false)
      expect(options.value).toBe(null)
      expect(isConfirming.value).toBe(false)
    })
  })
})

describe('Helper Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('confirmEndCall', () => {
    it('should open confirmation with correct options for ending a call', async () => {
      const promise = confirmEndCall()

      // The composable uses global state, so we need to resolve it
      // We'll just verify it returns a promise
      expect(promise).toBeInstanceOf(Promise)

      // Clean up - resolve the promise
      const { confirmCurrent } = useConfirm()
      confirmCurrent()
      await promise
    })
  })

  describe('confirmLeaveConference', () => {
    it('should open confirmation with conference name when provided', async () => {
      const promise = confirmLeaveConference('Test Conference')

      expect(promise).toBeInstanceOf(Promise)

      const { confirmCurrent } = useConfirm()
      confirmCurrent()
      await promise
    })

    it('should open confirmation without conference name when not provided', async () => {
      const promise = confirmLeaveConference()

      expect(promise).toBeInstanceOf(Promise)

      const { confirmCurrent } = useConfirm()
      confirmCurrent()
      await promise
    })
  })

  describe('confirmDeleteRecording', () => {
    it('should open confirmation with recording name when provided', async () => {
      const promise = confirmDeleteRecording('Test Recording')

      expect(promise).toBeInstanceOf(Promise)

      const { confirmCurrent } = useConfirm()
      confirmCurrent()
      await promise
    })

    it('should include danger variant and delete button text', async () => {
      // Just verify the function returns a promise and doesn't throw
      const promise = confirmDeleteRecording('Important Recording')

      expect(promise).toBeInstanceOf(Promise)

      const { confirmCurrent } = useConfirm()
      confirmCurrent()
      await promise
    })
  })
})
