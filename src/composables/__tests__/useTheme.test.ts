/**
 * @vitest-environment jsdom
 *
 * Tests for useTheme composable with singleton pattern.
 * Uses _resetForTesting() to reset singleton state between tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useTheme, _resetForTesting } from '../useTheme'

describe('useTheme', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  beforeEach(() => {
    // Clear mocks and storage before each test
    vi.clearAllMocks()
    localStorageMock.clear()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // Default matchMedia mock (light mode) - tests can override for dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })

    // Reset singleton state for proper test isolation
    _resetForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with light theme by default when no stored preference and no system preference', async () => {
      // Mock matchMedia to return false (light mode)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')
      expect(themeInstance.isDarkMode.value).toBe(false)
      expect(themeInstance.theme()).toBe('light')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
    })

    it('should initialize with dark theme when system prefers dark mode', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')
      expect(themeInstance.isDarkMode.value).toBe(true)
      expect(themeInstance.theme()).toBe('dark')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
    })

    it('should initialize with stored theme preference', async () => {
      localStorageMock.getItem.mockReturnValue('dark')

      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(localStorageMock.getItem).toHaveBeenCalledWith('vuesip-theme')
      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')
      expect(themeInstance.isDarkMode.value).toBe(true)
      expect(themeInstance.theme()).toBe('dark')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
    })

    it('should prioritize stored preference over system preference', async () => {
      localStorageMock.getItem.mockReturnValue('light')

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      const TestComponent = defineComponent({
        setup() {
          return useTheme()
        },
        template: '<div>Test</div>',
      })

      const wrapper = mount(TestComponent)
      await nextTick()

      const { isDarkMode } = wrapper.vm as ReturnType<typeof useTheme>

      expect(isDarkMode).toBe(false)
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
    })
  })

  describe('theme toggling', () => {
    it('should toggle from light to dark theme', async () => {
      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')
      expect(themeInstance.isDarkMode.value).toBe(false)
      expect(themeInstance.theme()).toBe('light')

      themeInstance.toggleTheme()
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance.isDarkMode.value).toBe(true)
      expect(themeInstance.theme()).toBe('dark')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')
    })

    it('should toggle from dark to light theme', async () => {
      localStorageMock.getItem.mockReturnValue('dark')

      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')
      expect(themeInstance.isDarkMode.value).toBe(true)

      themeInstance.toggleTheme()
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance.isDarkMode.value).toBe(false)
      expect(themeInstance.theme()).toBe('light')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip-theme', 'light')
    })

    it('should persist theme changes to localStorage', async () => {
      const TestComponent = defineComponent({
        setup() {
          return useTheme()
        },
        template: '<div>Test</div>',
      })

      const wrapper = mount(TestComponent)
      await nextTick()

      const { toggleTheme } = wrapper.vm as ReturnType<typeof useTheme>

      // Toggle to dark
      toggleTheme()
      await nextTick()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')

      // Toggle back to light
      toggleTheme()
      await nextTick()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip-theme', 'light')
    })
  })

  describe('theme setting', () => {
    it('should set theme to dark programmatically', async () => {
      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')

      themeInstance.setTheme('dark')
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance.isDarkMode.value).toBe(true)
      expect(themeInstance.theme()).toBe('dark')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip-theme', 'dark')
    })

    it('should set theme to light programmatically', async () => {
      localStorageMock.getItem.mockReturnValue('dark')

      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')

      themeInstance.setTheme('light')
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance.isDarkMode.value).toBe(false)
      expect(themeInstance.theme()).toBe('light')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip-theme', 'light')
    })
  })

  describe('DOM updates', () => {
    it('should apply dark-mode class when dark theme is active', async () => {
      const TestComponent = defineComponent({
        setup() {
          return useTheme()
        },
        template: '<div>Test</div>',
      })

      const wrapper = mount(TestComponent)
      await nextTick()

      const { setTheme } = wrapper.vm as ReturnType<typeof useTheme>

      setTheme('dark')
      await nextTick()

      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
    })

    it('should remove dark-mode class when light theme is active', async () => {
      localStorageMock.getItem.mockReturnValue('dark')

      let themeInstance: ReturnType<typeof useTheme> | null = null

      const TestComponent = defineComponent({
        setup() {
          themeInstance = useTheme()
          return themeInstance
        },
        template: '<div>Test</div>',
      })

      const _wrapper = mount(TestComponent)
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(themeInstance).not.toBeNull()
      if (!themeInstance) throw new Error('themeInstance should not be null')
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true)

      themeInstance.setTheme('light')
      await nextTick()
      await nextTick() // Double tick for watcher

      expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
    })
  })

  describe('singleton behavior', () => {
    it('should share state across multiple component instances', async () => {
      const TestComponent1 = defineComponent({
        setup() {
          return useTheme()
        },
        template: '<div>Test1</div>',
      })

      const TestComponent2 = defineComponent({
        setup() {
          return useTheme()
        },
        template: '<div>Test2</div>',
      })

      const wrapper1 = mount(TestComponent1)
      const wrapper2 = mount(TestComponent2)

      await nextTick()

      const comp1 = wrapper1.vm as ReturnType<typeof useTheme>
      const comp2 = wrapper2.vm as ReturnType<typeof useTheme>

      // Both should reference the same reactive state
      expect(comp1.isDarkMode).toBe(comp2.isDarkMode)

      // Toggle in one component
      comp1.toggleTheme()
      await nextTick()

      // Both should reflect the change
      expect(comp1.isDarkMode).toBe(true)
      expect(comp2.isDarkMode).toBe(true)
    })
  })
})
