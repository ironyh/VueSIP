import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTheme, _resetForTesting } from '@/composables/useTheme'
import { withSetup } from '../../utils/test-helpers'

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

// Mock window.matchMedia
const matchMediaMock = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
})

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    document.documentElement.classList.remove('dark-mode', 'dark-theme')
    _resetForTesting()
  })

  afterEach(() => {
    _resetForTesting()
  })

  it('should return dark mode state', () => {
    const { result, unmount } = withSetup(() => {
      const { isDarkMode } = useTheme()
      return { isDarkMode }
    })

    expect(result.isDarkMode.value).toBe(false)
    unmount()
  })

  it('should return theme function', () => {
    const { result, unmount } = withSetup(() => {
      const { theme } = useTheme()
      return { theme }
    })

    expect(result.theme()).toBe('light')
    unmount()
  })

  it('should set theme to dark', async () => {
    const { result, unmount } = withSetup(() => {
      const { isDarkMode, setTheme } = useTheme()
      return { isDarkMode, setTheme }
    })

    result.setTheme('dark')
    // Wait for watch to trigger applyTheme
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(result.isDarkMode.value).toBe(true)
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
    unmount()
  })

  it('should set theme to light', () => {
    const { result, unmount } = withSetup(() => {
      const { isDarkMode, setTheme } = useTheme()
      return { isDarkMode, setTheme }
    })

    result.setTheme('dark')
    result.setTheme('light')
    expect(result.isDarkMode.value).toBe(false)
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
    unmount()
  })

  it('should toggle theme', () => {
    const { result, unmount } = withSetup(() => {
      const { isDarkMode, toggleTheme } = useTheme()
      return { isDarkMode, toggleTheme }
    })

    expect(result.isDarkMode.value).toBe(false)

    result.toggleTheme()
    expect(result.isDarkMode.value).toBe(true)

    result.toggleTheme()
    expect(result.isDarkMode.value).toBe(false)
    unmount()
  })

  it('should initialize theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    _resetForTesting()

    const { result: _result, unmount } = withSetup(() => {
      const { isDarkMode } = useTheme()
      return { isDarkMode }
    })

    expect(localStorageMock.getItem).toHaveBeenCalledWith('vuesip-theme')
    unmount()
  })

  it('should initialize theme from system preference when no storage', () => {
    localStorageMock.getItem.mockReturnValue(null)
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
    _resetForTesting()

    const { unmount } = withSetup(() => {
      useTheme()
    })

    expect(localStorageMock.getItem).toHaveBeenCalledWith('vuesip-theme')
    unmount()
  })
})
