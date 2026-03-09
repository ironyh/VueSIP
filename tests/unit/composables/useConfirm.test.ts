/**
 * useConfirm Unit Tests
 *
 * Tests for the confirmation dialog composable.
 *
 * @module composables/useConfirm.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useConfirm,
  confirmEndCall,
  confirmLeaveConference,
  confirmDeleteRecording,
  confirmMuteParticipant,
  confirmRemoveParticipant,
  confirmTransferCall,
  confirmStartRecording,
} from '@/composables/useConfirm'

describe('useConfirm', () => {
  beforeEach(() => {
    // Reset global state before each test
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
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
        message: 'Test message',
        variant: 'danger',
      })

      // Should open the dialog
      expect(isOpen.value).toBe(true)
      expect(options.value).not.toBe(null)
      expect(options.value?.title).toBe('Test Title')
      expect(options.value?.message).toBe('Test message')
      expect(options.value?.variant).toBe('danger')

      // Resolve the confirmation
      const { confirmCurrent } = useConfirm()
      confirmCurrent()

      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('should merge options with defaults', async () => {
      const { confirm, options } = useConfirm()

      const promise = confirm({
        message: 'Custom message',
      })

      expect(options.value?.message).toBe('Custom message')
      expect(options.value?.title).toBe('Confirm Action') // default
      expect(options.value?.confirmText).toBe('Confirm') // default

      const { confirmCurrent } = useConfirm()
      confirmCurrent()
      await promise
    })

    it('should allow custom default options', async () => {
      const { confirm, options } = useConfirm({
        title: 'Default Title',
        variant: 'warning',
      })

      const promise = confirm({
        message: 'Message with defaults',
      })

      expect(options.value?.title).toBe('Default Title')
      expect(options.value?.variant).toBe('warning')

      const { cancelCurrent } = useConfirm()
      cancelCurrent()
      await promise
    })

    it('should allow overriding default options per call', async () => {
      const { confirm, options } = useConfirm({
        title: 'Default Title',
        variant: 'warning',
      })

      const promise = confirm({
        title: 'Override Title',
        message: 'Test',
      })

      expect(options.value?.title).toBe('Override Title')
      expect(options.value?.variant).toBe('warning') // kept from defaults

      const { cancelCurrent } = useConfirm()
      cancelCurrent()
      await promise
    })
  })

  describe('confirmAsync', () => {
    it('should call onConfirm when confirmed', async () => {
      const instance = useConfirm()
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      const onCancel = vi.fn()

      // Start the async confirmation
      const promise = instance.confirmAsync({ message: 'Test' }, onConfirm, onCancel)

      // Advance timers to let promise resolve
      await Promise.resolve()

      // The promise should be pending because confirm() returns a promise
      // We need to manually resolve the confirmation
      instance.confirmCurrent()

      await promise

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('should set isConfirming during callback execution', async () => {
      const { confirmAsync, isConfirming, confirmCurrent } = useConfirm()

      let duringCallback = false
      const onConfirm = vi.fn().mockImplementation(() => {
        duringCallback = isConfirming.value
        return Promise.resolve()
      })

      const promise = confirmAsync({ message: 'Test' }, onConfirm)

      // Need to wait for the promise chain
      await Promise.resolve()
      confirmCurrent()

      await promise

      expect(duringCallback).toBe(true)
      expect(isConfirming.value).toBe(false) // reset after
    })
  })

  describe('close', () => {
    it('should close the dialog and reset state', async () => {
      const { confirm, isOpen, options, close } = useConfirm()

      const promise = confirm({
        title: 'Test',
        message: 'Test message',
      })

      expect(isOpen.value).toBe(true)

      close()

      expect(isOpen.value).toBe(false)
      expect(options.value).toBe(null)

      // Promise should resolve to false
      const result = await promise
      expect(result.confirmed).toBe(false)
    })
  })

  describe('confirmCurrent', () => {
    it('should confirm and resolve with true', async () => {
      const { confirm, confirmCurrent } = useConfirm()

      const promise = confirm({
        message: 'Test',
      })

      confirmCurrent({ extraData: 'test' })

      const result = await promise
      expect(result.confirmed).toBe(true)
      expect(result.payload).toEqual({ extraData: 'test' })
    })
  })

  describe('cancelCurrent', () => {
    it('should cancel and resolve with false', async () => {
      const { confirm, cancelCurrent } = useConfirm()

      const promise = confirm({
        message: 'Test',
      })

      cancelCurrent()

      const result = await promise
      expect(result.confirmed).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset all state', () => {
      const { confirm, isOpen, options, isConfirming, reset } = useConfirm()

      // Set some state
      confirm({
        title: 'Test',
        message: 'Test',
      })

      expect(isOpen.value).toBe(true)
      expect(options.value).not.toBe(null)
      expect(isConfirming.value).toBe(false)

      reset()

      expect(isOpen.value).toBe(false)
      expect(options.value).toBe(null)
      expect(isConfirming.value).toBe(false)
    })
  })

  describe('helper functions', () => {
    it('confirmEndCall should return a promise with confirmed=true when confirmed', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmEndCall()

      expect(promise).toBeInstanceOf(Promise)

      // Resolve the confirmation
      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('confirmLeaveConference should return a promise', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmLeaveConference('Test Conference')
      expect(promise).toBeInstanceOf(Promise)

      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('confirmDeleteRecording should return a promise', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmDeleteRecording('Test Recording')
      expect(promise).toBeInstanceOf(Promise)

      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('confirmMuteParticipant should return a promise', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmMuteParticipant('John Doe')
      expect(promise).toBeInstanceOf(Promise)

      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('confirmRemoveParticipant should return a promise', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmRemoveParticipant('Jane Doe')
      expect(promise).toBeInstanceOf(Promise)

      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('confirmTransferCall should return a promise', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmTransferCall('+1234567890')
      expect(promise).toBeInstanceOf(Promise)

      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })

    it('confirmStartRecording should return a promise', async () => {
      const { confirmCurrent } = useConfirm()

      const promise = confirmStartRecording()
      expect(promise).toBeInstanceOf(Promise)

      confirmCurrent()
      const result = await promise
      expect(result.confirmed).toBe(true)
    })
  })

  describe('timeout handling', () => {
    it('should auto-resolve after 60 seconds', async () => {
      const { confirm, isOpen } = useConfirm()

      const promise = confirm({
        message: 'Test',
      })

      // Advance timers past 60 seconds
      vi.advanceTimersByTime(60001)

      const result = await promise
      expect(result.confirmed).toBe(false)
      expect(isOpen.value).toBe(false)
    })
  })
})
