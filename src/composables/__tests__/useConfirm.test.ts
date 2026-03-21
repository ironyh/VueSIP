/**
 * useConfirm composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { useConfirm } from '../useConfirm'

describe('useConfirm', () => {
  afterEach(() => {
    // Reset global state between tests
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should return initial false values for isOpen and isConfirming', () => {
      const { isOpen, isConfirming, isVisible } = useConfirm()

      expect(isOpen.value).toBe(false)
      expect(isConfirming.value).toBe(false)
      expect(isVisible.value).toBe(false)
    })

    it('should return null for options initially', () => {
      const { options } = useConfirm()

      expect(options.value).toBeNull()
    })
  })

  describe('confirm', () => {
    it('should open dialog with provided options', async () => {
      const { confirm, isOpen, options, confirmCurrent } = useConfirm()

      vi.useFakeTimers()
      const promise = confirm({
        title: 'Test Title',
        message: 'Test message',
        variant: 'danger',
      })

      // Advance timers to let the promise resolve check run
      vi.advanceTimersByTime(100)

      expect(isOpen.value).toBe(true)
      expect(options.value).not.toBeNull()
      expect(options.value?.title).toBe('Test Title')
      expect(options.value?.message).toBe('Test message')
      expect(options.value?.variant).toBe('danger')

      // Resolve the confirmation
      confirmCurrent()

      const result = await promise
      expect(result.confirmed).toBe(true)
      vi.useRealTimers()
    })

    it('should merge options with defaults', async () => {
      const { confirm, options, confirmCurrent } = useConfirm()

      vi.useFakeTimers()
      const promise = confirm({ message: 'Simple message' })
      vi.advanceTimersByTime(100)

      expect(options.value?.title).toBe('Confirm Action') // default
      expect(options.value?.message).toBe('Simple message') // provided
      expect(options.value?.confirmText).toBe('Confirm') // default
      expect(options.value?.variant).toBe('primary') // default

      confirmCurrent()
      await promise
      vi.useRealTimers()
    })

    it('should resolve with false when cancelled', async () => {
      const { confirm, isOpen, cancelCurrent } = useConfirm()

      vi.useFakeTimers()
      const promise = confirm({ message: 'Test' })
      vi.advanceTimersByTime(100)

      cancelCurrent()

      const result = await promise

      expect(result.confirmed).toBe(false)
      expect(isOpen.value).toBe(false)
      vi.useRealTimers()
    })

    it('should include payload when provided', async () => {
      const { confirm, confirmCurrent } = useConfirm()

      vi.useFakeTimers()
      const promise = confirm({ message: 'Test' })
      vi.advanceTimersByTime(100)

      confirmCurrent({ userId: 123 })

      const result = await promise

      expect(result.confirmed).toBe(true)
      expect(result.payload).toEqual({ userId: 123 })
      vi.useRealTimers()
    })
  })

  describe('close', () => {
    it('should close dialog without confirming', async () => {
      const { confirm, isOpen, options, close } = useConfirm()

      vi.useFakeTimers()
      const promise = confirm({ message: 'Test' })
      vi.advanceTimersByTime(100)

      expect(isOpen.value).toBe(true)

      close()

      const result = await promise
      expect(result.confirmed).toBe(false)
      expect(isOpen.value).toBe(false)
      expect(options.value).toBeNull()
      vi.useRealTimers()
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { confirm, isOpen, isConfirming, options, reset } = useConfirm()

      // Open and set some state
      confirm({ message: 'Test' })

      reset()

      expect(isOpen.value).toBe(false)
      expect(isConfirming.value).toBe(false)
      expect(options.value).toBeNull()
    })
  })
})
