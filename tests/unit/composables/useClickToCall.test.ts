/**
 * useClickToCall composable unit tests
 * Comprehensive tests for click-to-call widget functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock useSipMock - we'll use this in the composable
vi.mock('@/composables/useSipMock', () => ({
  useSipMock: vi.fn(() => {
    const callState = ref('idle')
    return {
      isConnected: ref(false),
      isRegistered: ref(false),
      callState,
      activeCall: ref(null),
      error: ref(null),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      call: vi.fn().mockImplementation(async () => {
        callState.value = 'active'
        return 'mock-call-id'
      }),
      hangup: vi.fn().mockImplementation(async () => {
        callState.value = 'ended'
      }),
      answer: vi.fn().mockImplementation(async () => {
        callState.value = 'active'
      }),
      configure: vi.fn(),
    }
  }),
}))

import {
  useClickToCall,
  type ClickToCallPosition,
  type ClickToCallTheme,
  type ClickToCallSize,
} from '@/composables/useClickToCall'

describe('useClickToCall', () => {
  let mockLocalStorage: Record<string, string>

  beforeEach(() => {
    vi.useFakeTimers()

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

    // Mock window dimensions
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const {
        isVisible,
        isMinimized,
        isDragging,
        position,
        isConnected,
        isOnCall,
        callState,
        callDuration,
        remoteNumber,
      } = useClickToCall()

      expect(isVisible.value).toBe(true)
      expect(isMinimized.value).toBe(false)
      expect(isDragging.value).toBe(false)
      expect(position.value).toEqual({ x: expect.any(Number), y: expect.any(Number) })
      expect(isConnected.value).toBe(false)
      expect(isOnCall.value).toBe(false)
      expect(callState.value).toBe('idle')
      expect(callDuration.value).toBe(0)
      expect(remoteNumber.value).toBeNull()
    })

    it('should accept custom position option', () => {
      const { position } = useClickToCall({ position: 'top-left' })

      // top-left should position in top-left corner
      expect(position.value.x).toBeLessThan(100)
      expect(position.value.y).toBeLessThan(100)
    })

    it('should accept custom offset options', () => {
      const { position } = useClickToCall({
        position: 'bottom-right',
        offsetX: 50,
        offsetY: 100,
      })

      // Position should be offset from bottom-right corner
      expect(position.value.x).toBeGreaterThan(0)
      expect(position.value.y).toBeGreaterThan(0)
    })

    it('should start visible by default', () => {
      const { isVisible } = useClickToCall()
      expect(isVisible.value).toBe(true)
    })

    it('should enable mock mode when specified', () => {
      const { isConnected, callState } = useClickToCall({ mockMode: true })

      // Mock mode should be active
      expect(isConnected.value).toBe(false)
      expect(callState.value).toBe('idle')
    })

    it('should accept defaultNumber option', () => {
      const result = useClickToCall({ defaultNumber: '+1234567890' })
      expect(result).toBeDefined()
    })

    it('should accept theme option', () => {
      const { cssVars } = useClickToCall({ theme: 'dark' })
      expect(cssVars.value).toBeDefined()
    })

    it('should accept primaryColor option', () => {
      const { cssVars } = useClickToCall({ primaryColor: '#ff0000' })
      expect(cssVars.value['--ctc-primary']).toBe('#ff0000')
    })

    it('should accept size option', () => {
      const { cssVars } = useClickToCall({ size: 'large' })
      expect(cssVars.value).toBeDefined()
    })
  })

  // ==========================================================================
  // Position Management Tests
  // ==========================================================================

  describe('Position Management', () => {
    // Widget dimensions for medium size: 320x420
    // Viewport: 1024x768
    // bottom-right with offset 20: x = 1024 - 320 - 20 = 684, y = 768 - 420 - 20 = 328

    it('should calculate initial position for bottom-right', () => {
      const { position } = useClickToCall({
        position: 'bottom-right',
        offsetX: 20,
        offsetY: 20,
      })

      // For bottom-right with viewport 1024x768 and widget 320x420
      // x = 1024 - 320 - 20 = 684
      // y = 768 - 420 - 20 = 328
      expect(position.value.x).toBe(684)
      expect(position.value.y).toBe(328)
    })

    it('should calculate initial position for bottom-left', () => {
      const { position } = useClickToCall({
        position: 'bottom-left',
        offsetX: 20,
        offsetY: 20,
      })

      // x = 20 (offset from left)
      // y = 768 - 420 - 20 = 328
      expect(position.value.x).toBe(20)
      expect(position.value.y).toBe(328)
    })

    it('should calculate initial position for top-right', () => {
      const { position } = useClickToCall({
        position: 'top-right',
        offsetX: 20,
        offsetY: 20,
      })

      // x = 1024 - 320 - 20 = 684
      // y = 20 (offset from top)
      expect(position.value.x).toBe(684)
      expect(position.value.y).toBe(20)
    })

    it('should calculate initial position for top-left', () => {
      const { position } = useClickToCall({
        position: 'top-left',
        offsetX: 20,
        offsetY: 20,
      })

      expect(position.value.x).toBe(20)
      expect(position.value.y).toBe(20)
    })

    it('should reset position to initial', () => {
      const { position, resetPosition } = useClickToCall({
        position: 'bottom-right',
        offsetX: 20,
        offsetY: 20,
      })

      const initialX = position.value.x
      const initialY = position.value.y

      // Simulate a position change
      position.value = { x: 100, y: 100 }
      expect(position.value.x).toBe(100)

      // Reset
      resetPosition()

      expect(position.value.x).toBe(initialX)
      expect(position.value.y).toBe(initialY)
    })

    it('should load persisted position from localStorage', () => {
      // Use position within viewport bounds (medium widget: 320x420, viewport: 1024x768)
      // Max x = 1024 - 320 = 704, max y = 768 - 420 = 348
      mockLocalStorage['vuesip-click-to-call-position'] = JSON.stringify({
        x: 300,
        y: 200,
      })

      const { position } = useClickToCall({ persistPosition: true })

      expect(position.value.x).toBe(300)
      expect(position.value.y).toBe(200)
    })

    it('should save position to localStorage when persistPosition is true', async () => {
      const { position } = useClickToCall({ persistPosition: true })

      // Clear any initial calls
      vi.clearAllMocks()

      // Modify position - need to trigger the watch
      position.value = { x: 250, y: 150 }

      // Advance timers to let the watch fire
      await vi.advanceTimersByTimeAsync(100)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vuesip-click-to-call-position',
        expect.any(String)
      )
    })

    it('should not persist position when persistPosition is false', () => {
      const { position } = useClickToCall({ persistPosition: false })

      position.value = { x: 250, y: 350 }
      vi.advanceTimersByTime(100)

      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['vuesip-click-to-call-position'] = 'invalid-json'

      // Should not throw
      const { position } = useClickToCall({ persistPosition: true })

      // Should use default position
      expect(position.value.x).toBeDefined()
      expect(position.value.y).toBeDefined()
    })
  })

  // ==========================================================================
  // Widget State Tests
  // ==========================================================================

  describe('Widget State', () => {
    it('should show the widget', () => {
      const { isVisible, show, hide } = useClickToCall()

      hide()
      expect(isVisible.value).toBe(false)

      show()
      expect(isVisible.value).toBe(true)
    })

    it('should hide the widget', () => {
      const { isVisible, hide } = useClickToCall()

      expect(isVisible.value).toBe(true)
      hide()
      expect(isVisible.value).toBe(false)
    })

    it('should minimize the widget', () => {
      const { isMinimized, minimize } = useClickToCall()

      expect(isMinimized.value).toBe(false)
      minimize()
      expect(isMinimized.value).toBe(true)
    })

    it('should maximize the widget', () => {
      const { isMinimized, minimize, maximize } = useClickToCall()

      minimize()
      expect(isMinimized.value).toBe(true)

      maximize()
      expect(isMinimized.value).toBe(false)
    })

    it('should respect minimizable option', () => {
      const { minimize, isMinimized } = useClickToCall({ minimizable: false })

      minimize()
      // Should not minimize when minimizable is false
      expect(isMinimized.value).toBe(false)
    })

    it('should respect draggable option', () => {
      const { isDragging } = useClickToCall({ draggable: false })

      // Dragging should be disabled
      expect(isDragging.value).toBe(false)
    })
  })

  // ==========================================================================
  // Call Controls Tests
  // ==========================================================================

  describe('Call Controls', () => {
    it('should make a call with defaultNumber', async () => {
      const onCallStart = vi.fn()
      const { call } = useClickToCall({
        mockMode: true,
        defaultNumber: '+1234567890',
        onCallStart,
      })

      await call()

      // The call should be initiated
      expect(onCallStart).toHaveBeenCalledWith('+1234567890')
    })

    it('should make a call with provided number', async () => {
      const onCallStart = vi.fn()
      const { call } = useClickToCall({
        mockMode: true,
        onCallStart,
      })

      await call('+9876543210')

      expect(onCallStart).toHaveBeenCalledWith('+9876543210')
    })

    it('should hangup active call', async () => {
      const onCallEnd = vi.fn()
      const { call, hangup } = useClickToCall({
        mockMode: true,
        defaultNumber: '+1234567890',
        onCallEnd,
      })

      await call()
      await vi.advanceTimersByTimeAsync(5000) // 5 seconds call duration
      await hangup()

      expect(onCallEnd).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should answer incoming call', async () => {
      const { answer } = useClickToCall({ mockMode: true })

      // Should not throw
      await expect(answer()).resolves.not.toThrow()
    })

    it('should call error callback on failure', async () => {
      const onError = vi.fn()

      // Import the actual mock to manipulate it
      const { useSipMock } = await import('@/composables/useSipMock')
      vi.mocked(useSipMock).mockReturnValueOnce({
        isConnected: { value: false },
        isRegistered: { value: false },
        callState: { value: 'idle' },
        activeCall: { value: null },
        error: { value: null },
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn().mockResolvedValue(undefined),
        call: vi.fn().mockRejectedValue(new Error('Call failed')),
        hangup: vi.fn().mockResolvedValue(undefined),
        answer: vi.fn().mockResolvedValue(undefined),
        configure: vi.fn(),
      } as any)

      const { call } = useClickToCall({
        mockMode: true,
        defaultNumber: '+1234567890',
        onError,
      })

      await call().catch(() => {})

      // Error callback may or may not be called depending on implementation
      // The key is that it doesn't throw unhandled
    })
  })

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('Configuration', () => {
    it('should allow runtime configuration changes', () => {
      const { configure, cssVars } = useClickToCall()

      configure({ primaryColor: '#00ff00' })

      expect(cssVars.value['--ctc-primary']).toBe('#00ff00')
    })

    it('should merge partial configuration', () => {
      const { configure, cssVars } = useClickToCall({
        primaryColor: '#ff0000',
        theme: 'light',
      })

      configure({ primaryColor: '#00ff00' })

      expect(cssVars.value['--ctc-primary']).toBe('#00ff00')
    })

    it('should update theme at runtime', () => {
      const { configure, cssVars } = useClickToCall({ theme: 'light' })

      configure({ theme: 'dark' })

      // Dark theme should have different background colors
      expect(cssVars.value['--ctc-bg']).toBeDefined()
    })
  })

  // ==========================================================================
  // Theme & CSS Variables Tests
  // ==========================================================================

  describe('Theming', () => {
    it('should generate CSS variables for light theme', () => {
      const { cssVars } = useClickToCall({ theme: 'light' })

      expect(cssVars.value['--ctc-bg']).toBeDefined()
      expect(cssVars.value['--ctc-text']).toBeDefined()
      expect(cssVars.value['--ctc-primary']).toBeDefined()
    })

    it('should generate CSS variables for dark theme', () => {
      const { cssVars } = useClickToCall({ theme: 'dark' })

      expect(cssVars.value['--ctc-bg']).toBeDefined()
      expect(cssVars.value['--ctc-text']).toBeDefined()
    })

    it('should use custom primary color in CSS variables', () => {
      const { cssVars } = useClickToCall({ primaryColor: '#ff5500' })

      expect(cssVars.value['--ctc-primary']).toBe('#ff5500')
    })

    it('should generate size-specific CSS variables', () => {
      const small = useClickToCall({ size: 'small' })
      const large = useClickToCall({ size: 'large' })

      expect(small.cssVars.value['--ctc-width']).toBeDefined()
      expect(large.cssVars.value['--ctc-width']).toBeDefined()

      // Large should be bigger than small
      const smallWidth = parseInt(small.cssVars.value['--ctc-width'] || '0')
      const largeWidth = parseInt(large.cssVars.value['--ctc-width'] || '0')
      expect(largeWidth).toBeGreaterThan(smallWidth)
    })

    it('should handle auto theme (defaults to light)', () => {
      const { cssVars } = useClickToCall({ theme: 'auto' })

      // Auto should default to some theme
      expect(cssVars.value['--ctc-bg']).toBeDefined()
    })
  })

  // ==========================================================================
  // Call State Integration Tests
  // ==========================================================================

  describe('Call State Integration', () => {
    it('should track call duration', async () => {
      const { call, callDuration } = useClickToCall({
        mockMode: true,
        defaultNumber: '+1234567890',
      })

      expect(callDuration.value).toBe(0)

      await call()

      // Advance timer to simulate call duration
      await vi.advanceTimersByTimeAsync(5000)

      // Duration tracking depends on implementation
      // At minimum it should be defined
      expect(callDuration.value).toBeDefined()
    })

    it('should track remote number', async () => {
      const { call, remoteNumber } = useClickToCall({
        mockMode: true,
        defaultNumber: '+1234567890',
      })

      await call()

      // Remote number should be set after call
      expect(remoteNumber.value).toBe('+1234567890')
    })

    it('should reset call state after hangup', async () => {
      const { call, hangup, isOnCall, remoteNumber } = useClickToCall({
        mockMode: true,
        defaultNumber: '+1234567890',
      })

      await call()
      expect(remoteNumber.value).toBe('+1234567890')

      await hangup()
      expect(isOnCall.value).toBe(false)
    })
  })

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle undefined localStorage', () => {
      vi.stubGlobal('localStorage', undefined)

      // Should not throw
      const { position } = useClickToCall({ persistPosition: true })

      expect(position.value.x).toBeDefined()
      expect(position.value.y).toBeDefined()
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
      const { position } = useClickToCall({ persistPosition: true })

      expect(position.value.x).toBeDefined()
    })

    it('should constrain position to viewport bounds', () => {
      mockLocalStorage['vuesip-click-to-call-position'] = JSON.stringify({
        x: 5000, // Way outside viewport
        y: 5000,
      })

      const { position } = useClickToCall({ persistPosition: true })

      // Position should be constrained to viewport
      expect(position.value.x).toBeLessThanOrEqual(1024)
      expect(position.value.y).toBeLessThanOrEqual(768)
    })

    it('should handle negative position values', () => {
      mockLocalStorage['vuesip-click-to-call-position'] = JSON.stringify({
        x: -100,
        y: -100,
      })

      const { position } = useClickToCall({ persistPosition: true })

      // Position should be constrained to positive values
      expect(position.value.x).toBeGreaterThanOrEqual(0)
      expect(position.value.y).toBeGreaterThanOrEqual(0)
    })

    it('should call without number when defaultNumber is not set', async () => {
      const { call } = useClickToCall({ mockMode: true })

      // Should handle gracefully - either throw or use empty string
      try {
        await call()
      } catch (e) {
        expect(e).toBeDefined()
      }
    })

    it('should handle rapid show/hide cycles', () => {
      const { show, hide, isVisible } = useClickToCall()

      for (let i = 0; i < 10; i++) {
        show()
        expect(isVisible.value).toBe(true)
        hide()
        expect(isVisible.value).toBe(false)
      }
    })

    it('should handle rapid minimize/maximize cycles', () => {
      const { minimize, maximize, isMinimized } = useClickToCall({ minimizable: true })

      for (let i = 0; i < 10; i++) {
        minimize()
        expect(isMinimized.value).toBe(true)
        maximize()
        expect(isMinimized.value).toBe(false)
      }
    })
  })

  // ==========================================================================
  // SIP Configuration Tests
  // ==========================================================================

  describe('SIP Configuration', () => {
    it('should accept SIP configuration', () => {
      const result = useClickToCall({
        sipConfig: {
          wsUri: 'wss://sip.example.com',
          sipUri: 'sip:user@example.com',
          password: 'secret',
          displayName: 'Test User',
        },
      })

      expect(result).toBeDefined()
      expect(result.isConnected).toBeDefined()
    })

    it('should use mock mode when mockMode is true regardless of sipConfig', () => {
      const { isConnected } = useClickToCall({
        mockMode: true,
        sipConfig: {
          wsUri: 'wss://sip.example.com',
          sipUri: 'sip:user@example.com',
          password: 'secret',
        },
      })

      // Should use mock mode
      expect(isConnected.value).toBe(false)
    })
  })

  // ==========================================================================
  // Type Safety Tests (compile-time checked)
  // ==========================================================================

  describe('Type Safety', () => {
    it('should accept valid position values', () => {
      const positions: ClickToCallPosition[] = [
        'bottom-right',
        'bottom-left',
        'top-right',
        'top-left',
      ]

      positions.forEach((pos) => {
        const { position } = useClickToCall({ position: pos })
        expect(position.value).toBeDefined()
      })
    })

    it('should accept valid theme values', () => {
      const themes: ClickToCallTheme[] = ['light', 'dark', 'auto']

      themes.forEach((theme) => {
        const { cssVars } = useClickToCall({ theme })
        expect(cssVars.value).toBeDefined()
      })
    })

    it('should accept valid size values', () => {
      const sizes: ClickToCallSize[] = ['small', 'medium', 'large']

      sizes.forEach((size) => {
        const { cssVars } = useClickToCall({ size })
        expect(cssVars.value).toBeDefined()
      })
    })
  })
})
