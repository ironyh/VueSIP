/**
 * Tests for useVideoInset composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useVideoInset } from '@/composables/useVideoInset'

describe('useVideoInset', () => {
  let mockLocalStorage: Record<string, string>

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key]
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {}
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Initialization and Default State
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const {
        isVisible,
        position,
        size,
        dimensions,
        isSwapped,
        isDraggable,
        isDragging,
      } = useVideoInset()

      expect(isVisible.value).toBe(true)
      expect(position.value).toBe('bottom-right')
      expect(size.value).toBe('medium')
      expect(dimensions.value).toEqual({ width: 160, height: 120 })
      expect(isSwapped.value).toBe(false)
      expect(isDraggable.value).toBe(true)
      expect(isDragging.value).toBe(false)
    })

    it('should accept custom initial options', () => {
      const { isVisible, position, size, isDraggable } = useVideoInset({
        initialPosition: 'top-left',
        initialSize: 'large',
        showInitially: false,
        draggable: false,
      })

      expect(isVisible.value).toBe(false)
      expect(position.value).toBe('top-left')
      expect(size.value).toBe('large')
      expect(isDraggable.value).toBe(false)
    })

    it('should return correct dimensions for each size preset', () => {
      const small = useVideoInset({ initialSize: 'small' })
      expect(small.dimensions.value).toEqual({ width: 120, height: 90 })

      const medium = useVideoInset({ initialSize: 'medium' })
      expect(medium.dimensions.value).toEqual({ width: 160, height: 120 })

      const large = useVideoInset({ initialSize: 'large' })
      expect(large.dimensions.value).toEqual({ width: 240, height: 180 })
    })

    it('should use custom dimensions when size is custom', () => {
      const { dimensions, setCustomDimensions, size } = useVideoInset()

      setCustomDimensions(200, 150)

      expect(size.value).toBe('custom')
      expect(dimensions.value).toEqual({ width: 200, height: 150 })
    })
  })

  // ==========================================================================
  // Visibility Controls
  // ==========================================================================

  describe('Visibility Controls', () => {
    it('should show the inset', () => {
      const { isVisible, show } = useVideoInset({ showInitially: false })

      expect(isVisible.value).toBe(false)
      show()
      expect(isVisible.value).toBe(true)
    })

    it('should hide the inset', () => {
      const { isVisible, hide } = useVideoInset({ showInitially: true })

      expect(isVisible.value).toBe(true)
      hide()
      expect(isVisible.value).toBe(false)
    })

    it('should toggle visibility', () => {
      const { isVisible, toggle } = useVideoInset({ showInitially: true })

      expect(isVisible.value).toBe(true)
      toggle()
      expect(isVisible.value).toBe(false)
      toggle()
      expect(isVisible.value).toBe(true)
    })
  })

  // ==========================================================================
  // Position Controls
  // ==========================================================================

  describe('Position Controls', () => {
    it('should set position directly', () => {
      const { position, setPosition } = useVideoInset()

      setPosition('top-left')
      expect(position.value).toBe('top-left')

      setPosition('top-right')
      expect(position.value).toBe('top-right')

      setPosition('bottom-left')
      expect(position.value).toBe('bottom-left')

      setPosition('bottom-right')
      expect(position.value).toBe('bottom-right')
    })

    it('should cycle through positions in order', () => {
      const { position, cyclePosition } = useVideoInset({
        initialPosition: 'bottom-right',
      })

      expect(position.value).toBe('bottom-right')

      cyclePosition()
      expect(position.value).toBe('bottom-left')

      cyclePosition()
      expect(position.value).toBe('top-left')

      cyclePosition()
      expect(position.value).toBe('top-right')

      cyclePosition()
      expect(position.value).toBe('bottom-right') // Wraps around
    })
  })

  // ==========================================================================
  // Size Controls
  // ==========================================================================

  describe('Size Controls', () => {
    it('should set size preset', () => {
      const { size, dimensions, setSize } = useVideoInset()

      setSize('small')
      expect(size.value).toBe('small')
      expect(dimensions.value).toEqual({ width: 120, height: 90 })

      setSize('large')
      expect(size.value).toBe('large')
      expect(dimensions.value).toEqual({ width: 240, height: 180 })
    })

    it('should set custom dimensions and switch to custom size', () => {
      const { size, dimensions, setCustomDimensions } = useVideoInset({
        initialSize: 'medium',
      })

      expect(size.value).toBe('medium')

      setCustomDimensions(300, 225)

      expect(size.value).toBe('custom')
      expect(dimensions.value).toEqual({ width: 300, height: 225 })
    })
  })

  // ==========================================================================
  // Video Swap
  // ==========================================================================

  describe('Video Swap', () => {
    it('should toggle video swap state', () => {
      const { isSwapped, swapVideos } = useVideoInset()

      expect(isSwapped.value).toBe(false)
      swapVideos()
      expect(isSwapped.value).toBe(true)
      swapVideos()
      expect(isSwapped.value).toBe(false)
    })
  })

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe('Reset', () => {
    it('should reset to initial values', () => {
      const {
        isVisible,
        position,
        size,
        isSwapped,
        setPosition,
        setSize,
        swapVideos,
        hide,
        reset,
      } = useVideoInset({
        initialPosition: 'bottom-right',
        initialSize: 'medium',
        showInitially: true,
      })

      // Change all values
      setPosition('top-left')
      setSize('large')
      swapVideos()
      hide()

      expect(isVisible.value).toBe(false)
      expect(position.value).toBe('top-left')
      expect(size.value).toBe('large')
      expect(isSwapped.value).toBe(true)

      // Reset
      reset()

      expect(isVisible.value).toBe(true)
      expect(position.value).toBe('bottom-right')
      expect(size.value).toBe('medium')
      expect(isSwapped.value).toBe(false)
    })

    it('should reset custom dimensions to initial values', () => {
      const { dimensions, setCustomDimensions, reset } = useVideoInset({
        customWidth: 200,
        customHeight: 150,
      })

      setCustomDimensions(400, 300)
      expect(dimensions.value).toEqual({ width: 400, height: 300 })

      reset()
      // After reset, size goes back to 'medium' preset
      expect(dimensions.value).toEqual({ width: 160, height: 120 })
    })
  })

  // ==========================================================================
  // CSS Styles
  // ==========================================================================

  describe('CSS Styles', () => {
    it('should generate correct styles for bottom-right position', () => {
      const { insetStyles } = useVideoInset({
        initialPosition: 'bottom-right',
        initialSize: 'medium',
        margin: 16,
        borderRadius: 8,
      })

      const styles = insetStyles.value
      expect(styles.position).toBe('absolute')
      expect(styles.width).toBe('160px')
      expect(styles.height).toBe('120px')
      expect(styles.borderRadius).toBe('8px')
      expect(styles.bottom).toBe('16px')
      expect(styles.right).toBe('16px')
      expect(styles.top).toBeUndefined()
      expect(styles.left).toBeUndefined()
    })

    it('should generate correct styles for top-left position', () => {
      const { insetStyles } = useVideoInset({
        initialPosition: 'top-left',
        margin: 20,
      })

      const styles = insetStyles.value
      expect(styles.top).toBe('20px')
      expect(styles.left).toBe('20px')
      expect(styles.bottom).toBeUndefined()
      expect(styles.right).toBeUndefined()
    })

    it('should generate correct styles for top-right position', () => {
      const { insetStyles } = useVideoInset({
        initialPosition: 'top-right',
        margin: 12,
      })

      const styles = insetStyles.value
      expect(styles.top).toBe('12px')
      expect(styles.right).toBe('12px')
      expect(styles.bottom).toBeUndefined()
      expect(styles.left).toBeUndefined()
    })

    it('should generate correct styles for bottom-left position', () => {
      const { insetStyles } = useVideoInset({
        initialPosition: 'bottom-left',
        margin: 24,
      })

      const styles = insetStyles.value
      expect(styles.bottom).toBe('24px')
      expect(styles.left).toBe('24px')
      expect(styles.top).toBeUndefined()
      expect(styles.right).toBeUndefined()
    })

    it('should set cursor to move when draggable', () => {
      const { insetStyles } = useVideoInset({ draggable: true })
      expect(insetStyles.value.cursor).toBe('move')
    })

    it('should set cursor to default when not draggable', () => {
      const { insetStyles } = useVideoInset({ draggable: false })
      expect(insetStyles.value.cursor).toBe('default')
    })

    it('should disable transition when dragging', () => {
      const { insetStyles, isDragging } = useVideoInset()

      expect(insetStyles.value.transition).toBe('all 0.3s ease')

      isDragging.value = true
      expect(insetStyles.value.transition).toBe('none')
    })

    it('should update styles when position changes', () => {
      const { insetStyles, setPosition } = useVideoInset({
        initialPosition: 'bottom-right',
      })

      expect(insetStyles.value.bottom).toBe('16px')
      expect(insetStyles.value.right).toBe('16px')

      setPosition('top-left')

      expect(insetStyles.value.top).toBe('16px')
      expect(insetStyles.value.left).toBe('16px')
    })

    it('should update styles when size changes', () => {
      const { insetStyles, setSize } = useVideoInset({ initialSize: 'medium' })

      expect(insetStyles.value.width).toBe('160px')
      expect(insetStyles.value.height).toBe('120px')

      setSize('large')

      expect(insetStyles.value.width).toBe('240px')
      expect(insetStyles.value.height).toBe('180px')
    })
  })

  // ==========================================================================
  // Persistence
  // ==========================================================================

  describe('Persistence', () => {
    it('should not persist when persistPreference is false', () => {
      const { setPosition } = useVideoInset({
        persistPreference: false,
      })

      setPosition('top-left')

      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should persist preferences when enabled', () => {
      const { setPosition } = useVideoInset({
        persistPreference: true,
        preferenceKey: 'test-inset-prefs',
      })

      setPosition('top-left')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'test-inset-prefs',
        expect.any(String)
      )

      const savedData = JSON.parse(
        (localStorage.setItem as any).mock.calls[0][1]
      )
      expect(savedData.position).toBe('top-left')
    })

    it('should load persisted preferences on initialization', () => {
      mockLocalStorage['vuesip-video-inset'] = JSON.stringify({
        position: 'top-left',
        size: 'large',
        isVisible: false,
        customDimensions: { width: 300, height: 225 },
      })

      const { position, size, isVisible } = useVideoInset({
        persistPreference: true,
      })

      expect(position.value).toBe('top-left')
      expect(size.value).toBe('large')
      expect(isVisible.value).toBe(false)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['vuesip-video-inset'] = 'invalid-json'

      // Should not throw
      const { position, size } = useVideoInset({
        persistPreference: true,
      })

      // Should use defaults
      expect(position.value).toBe('bottom-right')
      expect(size.value).toBe('medium')
    })

    it('should handle localStorage errors gracefully', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => {
          throw new Error('localStorage error')
        }),
        setItem: vi.fn(() => {
          throw new Error('localStorage error')
        }),
      })

      // Should not throw
      const { setPosition, position } = useVideoInset({
        persistPreference: true,
      })

      expect(position.value).toBe('bottom-right')

      // Should not throw when saving
      setPosition('top-left')
      expect(position.value).toBe('top-left')
    })

    it('should persist visibility changes', () => {
      const { show, hide, toggle } = useVideoInset({
        persistPreference: true,
        showInitially: true,
      })

      hide()
      expect(localStorage.setItem).toHaveBeenCalled()

      show()
      expect(localStorage.setItem).toHaveBeenCalled()

      toggle()
      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should persist size changes', () => {
      const { setSize, setCustomDimensions } = useVideoInset({
        persistPreference: true,
      })

      setSize('large')
      expect(localStorage.setItem).toHaveBeenCalled()

      setCustomDimensions(200, 150)
      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should persist on reset', () => {
      const { reset } = useVideoInset({
        persistPreference: true,
      })

      reset()
      expect(localStorage.setItem).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle undefined localStorage', () => {
      vi.stubGlobal('localStorage', undefined)

      // Should not throw
      const { setPosition, position } = useVideoInset({
        persistPreference: true,
      })

      expect(position.value).toBe('bottom-right')
      setPosition('top-left')
      expect(position.value).toBe('top-left')
    })

    it('should handle partial persisted data', () => {
      mockLocalStorage['vuesip-video-inset'] = JSON.stringify({
        position: 'top-right',
        // Missing other fields
      })

      const { position, size, isVisible } = useVideoInset({
        persistPreference: true,
      })

      expect(position.value).toBe('top-right')
      // Should use defaults for missing fields
      expect(size.value).toBe('medium')
      expect(isVisible.value).toBe(true)
    })

    it('should use custom preference key', () => {
      const { setPosition } = useVideoInset({
        persistPreference: true,
        preferenceKey: 'my-custom-key',
      })

      setPosition('top-left')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'my-custom-key',
        expect.any(String)
      )
    })
  })
})
