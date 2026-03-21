/**
 * useVideoInset Composable Tests
 *
 * Tests for picture-in-picture style video inset layouts including:
 * - Visibility toggling
 * - Position control (four corners)
 * - Size presets and custom dimensions
 * - Video swap functionality
 * - Position cycling
 * - Reset functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useVideoInset } from '../../src/composables/useVideoInset'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('useVideoInset', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { isVisible, position, size, dimensions, isSwapped, isDraggable } = useVideoInset()

      expect(isVisible.value).toBe(true)
      expect(position.value).toBe('bottom-right')
      expect(size.value).toBe('medium')
      expect(dimensions.value).toEqual({ width: 160, height: 120 })
      expect(isSwapped.value).toBe(false)
      expect(isDraggable.value).toBe(true)
    })

    it('should accept custom initial position', () => {
      const { position } = useVideoInset({ initialPosition: 'top-left' })
      expect(position.value).toBe('top-left')
    })

    it('should accept custom initial size', () => {
      const { size, dimensions } = useVideoInset({ initialSize: 'small' })
      expect(size.value).toBe('small')
      expect(dimensions.value).toEqual({ width: 120, height: 90 })
    })

    it('should respect showInitially option', () => {
      const { isVisible: hidden } = useVideoInset({ showInitially: false })
      expect(hidden.value).toBe(false)

      const { isVisible: visible } = useVideoInset({ showInitially: true })
      expect(visible.value).toBe(true)
    })

    it('should respect draggable option', () => {
      const { isDraggable: draggable } = useVideoInset({ draggable: true })
      expect(draggable.value).toBe(true)

      const { isDraggable: notDraggable } = useVideoInset({ draggable: false })
      expect(notDraggable.value).toBe(false)
    })
  })

  describe('Size Presets', () => {
    it('should return correct dimensions for small preset', () => {
      const { size, dimensions } = useVideoInset({ initialSize: 'small' })
      expect(size.value).toBe('small')
      expect(dimensions.value).toEqual({ width: 120, height: 90 })
    })

    it('should return correct dimensions for medium preset', () => {
      const { size, dimensions } = useVideoInset({ initialSize: 'medium' })
      expect(size.value).toBe('medium')
      expect(dimensions.value).toEqual({ width: 160, height: 120 })
    })

    it('should return correct dimensions for large preset', () => {
      const { size, dimensions } = useVideoInset({ initialSize: 'large' })
      expect(size.value).toBe('large')
      expect(dimensions.value).toEqual({ width: 240, height: 180 })
    })
  })

  describe('Custom Dimensions', () => {
    it('should use custom dimensions when size is custom', () => {
      const { size, dimensions, setCustomDimensions } = useVideoInset({
        initialSize: 'custom',
        customWidth: 200,
        customHeight: 150,
      })

      expect(size.value).toBe('custom')
      expect(dimensions.value).toEqual({ width: 200, height: 150 })

      setCustomDimensions(300, 200)
      expect(dimensions.value).toEqual({ width: 300, height: 200 })
    })

    it('should update custom dimensions and keep custom size', () => {
      const { size, dimensions, setCustomDimensions } = useVideoInset({
        initialSize: 'medium',
      })

      setCustomDimensions(100, 100)
      expect(size.value).toBe('custom')
      expect(dimensions.value).toEqual({ width: 100, height: 100 })
    })
  })

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

  describe('Position Controls', () => {
    it('should set position correctly', () => {
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
      const { position, cyclePosition } = useVideoInset({ initialPosition: 'bottom-right' })

      // bottom-right -> bottom-left -> top-left -> top-right -> bottom-right
      expect(position.value).toBe('bottom-right')

      cyclePosition()
      expect(position.value).toBe('bottom-left')

      cyclePosition()
      expect(position.value).toBe('top-left')

      cyclePosition()
      expect(position.value).toBe('top-right')

      cyclePosition()
      expect(position.value).toBe('bottom-right')
    })

    it('should start cycling from initial position', () => {
      const { position, cyclePosition } = useVideoInset({ initialPosition: 'top-left' })

      expect(position.value).toBe('top-left')

      cyclePosition()
      expect(position.value).toBe('top-right')

      cyclePosition()
      expect(position.value).toBe('bottom-right')
    })
  })

  describe('Video Swap', () => {
    it('should swap videos', () => {
      const { isSwapped, swapVideos } = useVideoInset()

      expect(isSwapped.value).toBe(false)

      swapVideos()
      expect(isSwapped.value).toBe(true)

      swapVideos()
      expect(isSwapped.value).toBe(false)
    })
  })

  describe('Reset', () => {
    it('should reset to initial values', () => {
      const { position, size, isSwapped, setPosition, setSize, swapVideos, reset, dimensions } =
        useVideoInset({
          initialPosition: 'bottom-right',
          initialSize: 'medium',
          showInitially: true,
        })

      // Modify all values
      setPosition('top-left')
      setSize('small')
      swapVideos()
      // isVisible is already true by default

      expect(position.value).toBe('top-left')
      expect(size.value).toBe('small')
      expect(isSwapped.value).toBe(true)

      // Reset
      reset()

      // Should be back to initial values
      expect(position.value).toBe('bottom-right')
      expect(size.value).toBe('medium')
      expect(isSwapped.value).toBe(false)
      expect(dimensions.value).toEqual({ width: 160, height: 120 })
    })
  })

  describe('CSS Styles', () => {
    it('should generate correct styles for bottom-right position', () => {
      const { insetStyles } = useVideoInset({
        initialPosition: 'bottom-right',
        margin: 16,
        borderRadius: 8,
      })

      expect(insetStyles.value).toMatchObject({
        position: 'absolute',
        right: '16px',
        bottom: '16px',
        borderRadius: '8px',
        zIndex: 10,
      })
    })

    it('should generate correct styles for top-left position', () => {
      const { insetStyles, setPosition } = useVideoInset({
        initialPosition: 'bottom-right',
        margin: 20,
        borderRadius: 4,
      })

      setPosition('top-left')

      expect(insetStyles.value).toMatchObject({
        position: 'absolute',
        left: '20px',
        top: '20px',
        borderRadius: '4px',
      })
    })

    it('should include correct dimensions in styles', () => {
      const { insetStyles } = useVideoInset({
        initialSize: 'large',
      })

      expect(insetStyles.value.width).toBe('240px')
      expect(insetStyles.value.height).toBe('180px')
    })

    it('should disable transition while dragging', () => {
      const { insetStyles, isDragging } = useVideoInset()

      expect(insetStyles.value.transition).toBe('all 0.3s ease')

      isDragging.value = true

      expect(insetStyles.value.transition).toBe('none')
    })
  })

  describe('Persistence', () => {
    it('should not persist by default', () => {
      useVideoInset({
        initialPosition: 'top-left',
        persistPreference: false,
      })

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should load persisted preferences on init', () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ position: 'top-left', size: 'large' })
      )

      const { position, size } = useVideoInset({
        persistPreference: true,
        preferenceKey: 'vuesip-video-inset',
      })

      expect(localStorageMock.getItem).toHaveBeenCalledWith('vuesip-video-inset')
      expect(position.value).toBe('top-left')
      expect(size.value).toBe('large')
    })

    it('should persist preferences when they change', () => {
      const { setPosition, setSize } = useVideoInset({
        persistPreference: true,
        preferenceKey: 'test-inset',
      })

      setPosition('top-left')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-inset',
        expect.stringContaining('"position":"top-left"')
      )

      setSize('small')
      expect(localStorageMock.setItem).toHaveBeenCalled()
      // Verify position is still top-left in the last call
      const lastCall = (localStorageMock.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => (call[1] as string).includes('"size":"small"')
      )
      expect(lastCall).toBeDefined()
      expect((lastCall as unknown[])[1]).toContain('"position":"top-left"')
    })
  })
})
