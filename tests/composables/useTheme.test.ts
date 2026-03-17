/**
 * Tests for useTheme composable
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useTheme } from '../../src/composables/useTheme'

// Mock localStorage
const localStorageMock = () => {
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
}

// Mock document.documentElement
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
}

describe('useTheme', () => {
  let mockLocalStorage: ReturnType<typeof localStorageMock>

  beforeEach(() => {
    mockLocalStorage = localStorageMock()
    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('document', {
      documentElement: {
        classList: mockClassList,
      },
    })
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('returned values', () => {
    it('should return isDarkMode as a ref', () => {
      const { isDarkMode } = useTheme()

      expect(isDarkMode).toBeDefined()
      expect(typeof isDarkMode.value).toBe('boolean')
    })

    it('should return theme as a function', () => {
      const { theme } = useTheme()

      expect(theme).toBeDefined()
      expect(typeof theme).toBe('function')
    })

    it('should return setTheme as a function', () => {
      const { setTheme } = useTheme()

      expect(setTheme).toBeDefined()
      expect(typeof setTheme).toBe('function')
    })

    it('should return toggleTheme as a function', () => {
      const { toggleTheme } = useTheme()

      expect(toggleTheme).toBeDefined()
      expect(typeof toggleTheme).toBe('function')
    })
  })

  describe('setTheme', () => {
    it('should set isDarkMode to true for dark theme', () => {
      const { setTheme, isDarkMode } = useTheme()

      setTheme('dark')

      expect(isDarkMode.value).toBe(true)
    })

    it('should set isDarkMode to false for light theme', () => {
      const { setTheme, isDarkMode } = useTheme()

      setTheme('light')

      expect(isDarkMode.value).toBe(false)
    })
  })

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      const { toggleTheme, isDarkMode } = useTheme()

      // Start with light (default)
      isDarkMode.value = false
      toggleTheme()

      expect(isDarkMode.value).toBe(true)
    })

    it('should toggle from dark to light', () => {
      const { toggleTheme, isDarkMode } = useTheme()

      // Start with dark
      isDarkMode.value = true
      toggleTheme()

      expect(isDarkMode.value).toBe(false)
    })
  })

  describe('theme function', () => {
    it('should return "dark" when isDarkMode is true', () => {
      const { theme, setTheme } = useTheme()

      setTheme('dark')

      expect(theme()).toBe('dark')
    })

    it('should return "light" when isDarkMode is false', () => {
      const { theme, setTheme } = useTheme()

      setTheme('light')

      expect(theme()).toBe('light')
    })
  })
})
