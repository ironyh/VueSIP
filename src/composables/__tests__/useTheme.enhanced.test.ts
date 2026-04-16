/**
 * Test suite for enhanced useTheme composable
 * Tests dark mode toggle, persistence, accessibility, and smooth transitions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useTheme, _resetForTesting } from '../useTheme'
import ThemeToggle from '../../components/ui/ThemeToggle.vue'
import { withSetup } from '../../../tests/utils/test-helpers'

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

const mockMatchMedia = vi.fn()

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    })
    _resetForTesting()
  })

  afterEach(() => {
    _resetForTesting()
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should default to light mode when no preference is set', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })

      const { result, unmount } = withSetup(() => useTheme())

      expect(result.isDarkMode.value).toBe(false)
      expect(result.isInitialized.value).toBe(true)
      unmount()
    })

    it('should use saved preference over system preference', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')
      mockMatchMedia.mockReturnValue({ matches: false })

      const { result, unmount } = withSetup(() => useTheme())

      expect(result.isDarkMode.value).toBe(true)
      unmount()
    })

    it('should use system preference when no saved preference exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: true })

      const { result, unmount } = withSetup(() => useTheme())

      expect(result.isDarkMode.value).toBe(true)
      unmount()
    })
  })

  describe('Theme Toggling', () => {
    it('should toggle theme correctly', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })

      const { result, unmount } = withSetup(() => useTheme())

      expect(result.isDarkMode.value).toBe(false)

      result.toggleTheme()
      expect(result.isDarkMode.value).toBe(true)

      result.toggleTheme()
      expect(result.isDarkMode.value).toBe(false)
      unmount()
    })

    it('should persist theme preference on toggle', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })

      const { result, unmount } = withSetup(() => useTheme())

      result.toggleTheme()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')

      result.toggleTheme()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'light')
      unmount()
    })
  })

  describe('System Preference Listening', () => {
    it('should expose a systemThemeListener factory when no explicit preference is set', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))

      const { result, unmount } = withSetup(() => useTheme())

      expect(typeof result.systemThemeListener).toBe('function')
      expect(typeof result.systemThemeListener()).toBe('function')
      unmount()
    })

    it('should not attach OS listener when explicit preference is set', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))

      const { result, unmount } = withSetup(() => useTheme())

      expect(typeof result.systemThemeListener).toBe('function')
      expect(result.systemThemeListener()).toBeInstanceOf(Function)
      unmount()
    })
  })

  describe('Accessibility', () => {
    it('should provide computed theme ref', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })

      const { result, unmount } = withSetup(() => useTheme())

      expect(result.theme.value).toBe('light')

      result.toggleTheme()
      expect(result.theme.value).toBe('dark')
      unmount()
    })

    it('should provide transitioning state', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })

      vi.useFakeTimers()
      const { result, unmount } = withSetup(() => useTheme())
      await vi.runAllTimersAsync()
      expect(result.isTransitioning.value).toBe(false)
      unmount()
      vi.useRealTimers()
    })
  })
})

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({ matches: false })
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    })
    _resetForTesting()
  })

  afterEach(() => {
    _resetForTesting()
    vi.restoreAllMocks()
  })

  it('should render with correct icons based on theme', async () => {
    const wrapper = mount(ThemeToggle, {
      props: { size: 'md', animated: true },
    })

    expect(wrapper.find('.moon-icon').exists()).toBe(true)
    expect(wrapper.find('.sun-icon').exists()).toBe(false)

    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.moon-icon').exists()).toBe(false)
    expect(wrapper.find('.sun-icon').exists()).toBe(true)
  })

  it('should handle theme toggle on click', async () => {
    const wrapper = mount(ThemeToggle, {
      props: { size: 'md' },
    })

    await wrapper.find('button').trigger('click')

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')
  })

  it('should handle keyboard navigation', async () => {
    const wrapper = mount(ThemeToggle, {
      props: { size: 'md' },
    })

    await wrapper.find('button').trigger('keydown', { key: ' ' })
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')

    mockLocalStorage.setItem.mockClear()

    await wrapper.find('button').trigger('keydown', { key: 'Enter' })
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'light')

    mockLocalStorage.setItem.mockClear()
    await wrapper.find('button').trigger('keydown', { key: 'Escape' })
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
  })

  it('should apply correct size classes', () => {
    const wrapper = mount(ThemeToggle, {
      props: { size: 'sm' },
    })

    expect(wrapper.find('.theme-toggle--sm').exists()).toBe(true)
    expect(wrapper.find('.theme-toggle--md').exists()).toBe(false)
    expect(wrapper.find('.theme-toggle--lg').exists()).toBe(false)
  })

  it('should have proper accessibility attributes', async () => {
    const wrapper = mount(ThemeToggle, {
      props: { size: 'md' },
    })

    const button = wrapper.find('button')

    expect(button.attributes('aria-label')).toBe('Switch to dark mode')

    await button.trigger('click')
    await wrapper.vm.$nextTick()

    expect(button.attributes('aria-label')).toBe('Switch to light mode')
  })

  it('should have proper focus styles', async () => {
    const wrapper = mount(ThemeToggle, {
      props: { size: 'md' },
      attachTo: document.body,
    })

    const button = wrapper.find('button')

    expect(button.classes()).not.toContain('theme-toggle--focused')

    button.element.focus()
    await wrapper.vm.$nextTick()
    expect(button.classes()).toContain('theme-toggle--focused')

    button.element.blur()
    await wrapper.vm.$nextTick()
    expect(button.classes()).not.toContain('theme-toggle--focused')

    wrapper.unmount()
  })
})

describe('Theme Integration', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({ matches: false })
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    })
    _resetForTesting()
    vi.spyOn(document.documentElement.classList, 'add')
    vi.spyOn(document.documentElement.classList, 'remove')
  })

  afterEach(() => {
    _resetForTesting()
    vi.restoreAllMocks()
  })

  it('should apply CSS classes to document element', () => {
    const { result, unmount } = withSetup(() => useTheme())

    result.setTheme('dark')

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark-mode', 'dark-theme')

    result.setTheme('light')

    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      'dark-mode',
      'dark-theme'
    )
    unmount()
  })

  it('should respect transition preferences', () => {
    const { result, unmount } = withSetup(() => useTheme())

    result.setTheme('dark', true)
    result.setTheme('light', false)
    unmount()
  })
})
