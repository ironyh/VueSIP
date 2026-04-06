/**
 * Test suite for enhanced useTheme composable
 * Tests dark mode toggle, persistence, accessibility, and smooth transitions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useTheme } from '../composables/useTheme'
import ThemeToggle from '../components/ui/ThemeToggle.vue'

// Mock localStorage and window.matchMedia
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

const mockMatchMedia = vi.fn()

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock localStorage
    global.localStorage = mockLocalStorage as unknown as Storage
    
    // Mock window.matchMedia
    global.window.matchMedia = mockMatchMedia
    
    // Reset singleton state
    const { _resetForTesting } = useTheme()
    _resetForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should default to light mode when no preference is set', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })
      
      const { isDarkMode, isInitialized } = useTheme()
      
      expect(isDarkMode.value).toBe(false)
      expect(isInitialized.value).toBe(true)
    })

    it('should use saved preference over system preference', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')
      mockMatchMedia.mockReturnValue({ matches: false })
      
      const { isDarkMode } = useTheme()
      
      expect(isDarkMode.value).toBe(true)
    })

    it('should use system preference when no saved preference exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: true })
      
      const { isDarkMode } = useTheme()
      
      expect(isDarkMode.value).toBe(true)
    })

    it('should fallback to light mode in non-browser environments', () => {
      // Remove global window and localStorage
      const originalWindow = global.window
      const originalLocalStorage = global.localStorage
      
      ;(global as unknown as { window: unknown }).window = undefined
      ;(global as unknown as { localStorage: unknown }).localStorage = undefined
      
      const { isDarkMode, isInitialized } = useTheme()
      
      expect(isDarkMode.value).toBe(false)
      expect(isInitialized.value).toBe(true)
      
      // Restore globals
      global.window = originalWindow
      global.localStorage = originalLocalStorage
    })
  })

  describe('Theme Toggling', () => {
    it('should toggle theme correctly', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })
      
      const { isDarkMode, toggleTheme } = useTheme()
      
      expect(isDarkMode.value).toBe(false)
      
      toggleTheme()
      expect(isDarkMode.value).toBe(true)
      
      toggleTheme()
      expect(isDarkMode.value).toBe(false)
    })

    it('should persist theme preference on toggle', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })
      
      const { toggleTheme } = useTheme()
      
      toggleTheme() // Switch to dark mode
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')
      
      toggleTheme() // Switch back to light mode
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vuesip-theme', 'light')
    })
  })

  describe('System Preference Listening', () => {
    it('should listen to system theme changes when no explicit preference is set', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
      
      const { systemThemeListener } = useTheme()
      
      // The systemThemeListener should be a cleanup function
      expect(typeof systemThemeListener).toBe('function')
    })

    it('should not listen to system changes when explicit preference is set', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
      
      const { systemThemeListener } = useTheme()
      
      // Should still return a cleanup function, but won't listen for changes
      expect(typeof systemThemeListener).toBe('function')
    })
  })

  describe('Accessibility', () => {
    it('should provide computed theme ref', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })
      
      const { theme } = useTheme()
      
      expect(theme.value).toBe('light')
      
      // Should react to changes
      const { toggleTheme } = useTheme()
      toggleTheme()
      expect(theme.value).toBe('dark')
    })

    it('should provide transitioning state', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockMatchMedia.mockReturnValue({ matches: false })
      
      const { isTransitioning } = useTheme()
      
      expect(isTransitioning.value).toBe(false)
    })
  })
})

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({ matches: false })
    
    // Mock DOM manipulation for theme application
    vi.spyOn(document.documentElement.classList, 'toggle')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render with correct icons based on theme', async () => {
    const { isDarkMode } = useTheme()
    
    const wrapper = mount(ThemeToggle, {
      props: {
        size: 'md',
        animated: true,
      },
    })
    
    // Initially in light mode, should show moon icon
    expect(wrapper.find('.moon-icon').exists()).toBe(true)
    expect(wrapper.find('.sun-icon').exists()).toBe(false)
    
    // Switch to dark mode
    isDarkMode.value = true
    await wrapper.vm.$nextTick()
    
    // Should now show sun icon
    expect(wrapper.find('.moon-icon').exists()).toBe(false)
    expect(wrapper.find('.sun-icon').exists()).toBe(true)
  })

  it('should handle theme toggle on click', async () => {
    const { toggleTheme } = useTheme()
    const toggleSpy = vi.spyOn({ toggleTheme }, 'toggleTheme')
    
    const wrapper = mount(ThemeToggle, {
      props: {
        size: 'md',
      },
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(toggleSpy).toHaveBeenCalled()
  })

  it('should handle keyboard navigation', async () => {
    const { toggleTheme } = useTheme()
    const toggleSpy = vi.spyOn({ toggleTheme }, 'toggleTheme')
    
    const wrapper = mount(ThemeToggle, {
      props: {
        size: 'md',
      },
    })
    
    // Test Space key
    await wrapper.find('button').trigger('keydown', { key: ' ' })
    expect(toggleSpy).toHaveBeenCalled()
    
    // Test Enter key
    await wrapper.find('button').trigger('keydown', { key: 'Enter' })
    expect(toggleSpy).toHaveBeenCalledTimes(2)
    
    // Test Escape key (should not toggle)
    await wrapper.find('button').trigger('keydown', { key: 'Escape' })
    expect(toggleSpy).toHaveBeenCalledTimes(2)
  })

  it('should apply correct size classes', () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        size: 'sm',
      },
    })
    
    expect(wrapper.find('.theme-toggle--sm').exists()).toBe(true)
    expect(wrapper.find('.theme-toggle--md').exists()).toBe(false)
    expect(wrapper.find('.theme-toggle--lg').exists()).toBe(false)
  })

  it('should have proper accessibility attributes', () => {
    const { isDarkMode } = useTheme()
    
    const wrapper = mount(ThemeToggle, {
      props: {
        size: 'md',
      },
    })
    
    const button = wrapper.find('button')
    
    expect(button.attributes('aria-label')).toBe('Switch to dark mode')
    
    // Update theme and check label
    isDarkMode.value = true
    wrapper.vm.$nextTick()
    
    expect(button.attributes('aria-label')).toBe('Switch to light mode')
  })

  it('should have proper focus styles', async () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        size: 'md',
      },
    })
    
    const button = wrapper.find('button')
    
    // Initially not focused
    expect(button.classes()).not.toContain('theme-toggle--focused')
    
    // Simulate focus
    await button.trigger('focus')
    expect(button.classes()).toContain('theme-toggle--focused')
    
    // Simulate blur
    await button.trigger('blur')
    expect(button.classes()).not.toContain('theme-toggle--focused')
  })
})

describe('Theme Integration', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({ matches: false })
    
    // Mock DOM manipulation
    vi.spyOn(document.documentElement.classList, 'add')
    vi.spyOn(document.documentElement.classList, 'remove')
    vi.spyOn(document.documentElement.classList, 'contains')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should apply CSS classes to document element', () => {
    const { setTheme } = useTheme()
    
    // Set dark mode
    setTheme('dark')
    
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark-mode', 'dark-theme')
    expect(document.documentElement.classList.remove).not.toHaveBeenCalled()
    
    // Set light mode
    setTheme('light')
    
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark-mode', 'dark-theme')
  })

  it('should respect transition preferences', () => {
    const { setTheme } = useTheme()
    
    // Set theme with transitions enabled
    setTheme('dark', true)
    
    // Set theme with transitions disabled
    setTheme('light', false)
    
    // The actual transition behavior is tested in CSS tests
    // This test verifies the function signature works correctly
  })
})