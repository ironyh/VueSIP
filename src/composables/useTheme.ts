/**
 * Theme management composable with smooth transitions and accessibility support
 * Provides theme toggling and state management with CSS variable system
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const THEME_STORAGE_KEY = 'vuesip-theme'

export type Theme = 'light' | 'dark'

// Singleton state for theme management
const isDarkMode = ref<boolean>(false)
const isInitialized = ref<boolean>(false)
const isTransitioning = ref<boolean>(false)

/** Active `prefers-color-scheme` listener cleanup (shared across useTheme() consumers). */
let systemThemeMediaCleanup: (() => void) | null = null
/** Number of mounted components currently using useTheme(). */
let useThemeSubscriberCount = 0

function updateSystemThemeListener(): void {
  if (typeof window === 'undefined') return
  if (!isInitialized.value || useThemeSubscriberCount === 0) {
    if (systemThemeMediaCleanup) {
      systemThemeMediaCleanup()
      systemThemeMediaCleanup = null
    }
    return
  }

  if (getSavedPreference() !== null) {
    if (systemThemeMediaCleanup) {
      systemThemeMediaCleanup()
      systemThemeMediaCleanup = null
    }
    return
  }

  if (systemThemeMediaCleanup) return

  systemThemeMediaCleanup = onSystemThemeChange((isDark) => {
    if (!isTransitioning.value && getSavedPreference() === null) {
      isDarkMode.value = isDark
      applyTheme(isDark, false)
    }
  })
}

/**
 * Reset singleton state for testing purposes only
 * @internal
 */
export const _resetForTesting = (): void => {
  if (systemThemeMediaCleanup) {
    systemThemeMediaCleanup()
    systemThemeMediaCleanup = null
  }
  useThemeSubscriberCount = 0
  isDarkMode.value = false
  isInitialized.value = false
  isTransitioning.value = false
  document.documentElement.classList.remove('dark-mode', 'dark-theme')
  document.documentElement.classList.remove('theme-transitioning')
}

/**
 * Apply theme to document with smooth transitions
 * @param dark - Whether to apply dark mode
 * @param enableTransition - Whether to enable smooth transition animation
 */
const applyTheme = (dark: boolean, enableTransition = true): void => {
  if (enableTransition && !isTransitioning.value) {
    isTransitioning.value = true
    document.documentElement.classList.add('theme-transitioning')

    // Remove transition class after animation completes
    setTimeout(() => {
      isTransitioning.value = false
      document.documentElement.classList.remove('theme-transitioning')
    }, 300) // Match CSS transition duration
  }

  if (dark) {
    document.documentElement.classList.add('dark-mode', 'dark-theme')
  } else {
    document.documentElement.classList.remove('dark-mode', 'dark-theme')
  }
}

/**
 * Get system preference for dark mode
 * @returns True if system prefers dark mode
 */
const getSystemPreference = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Get saved theme preference from localStorage
 * @returns Saved theme preference or null if not set
 */
const getSavedPreference = (): Theme | null => {
  if (typeof localStorage === 'undefined') {
    return null
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'dark' || stored === 'light' ? stored : null
}

/**
 * Set theme preference in localStorage
 * @param theme - Theme to save
 */
const savePreference = (theme: Theme): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}

const setTheme = (theme: Theme, enableTransition = true): void => {
  isDarkMode.value = theme === 'dark'
  applyTheme(theme === 'dark', enableTransition)
  savePreference(theme)
}

/**
 * Toggle theme with smooth transition
 * @param enableTransition - Whether to enable smooth transition
 * @returns The new theme after toggling ('light' or 'dark')
 */
const toggleTheme = (enableTransition = true): Theme => {
  const newTheme: Theme = isDarkMode.value ? 'light' : 'dark'
  setTheme(newTheme, enableTransition)
  return newTheme
}

/**
 * Initialize theme from localStorage or system preference
 * @param options - Configuration options
 * @returns void
 */
const initializeTheme = (
  options: {
    enableTransition?: boolean
    respectSystemPref?: boolean
    fallbackTheme?: Theme
  } = {}
): void => {
  if (isInitialized.value) return

  const { enableTransition = true, respectSystemPref = true, fallbackTheme = 'light' } = options

  // Guard against non-browser environments (SSR, workers, etc.)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    isDarkMode.value = fallbackTheme === 'dark'
    isInitialized.value = true
    return
  }

  const saved = getSavedPreference()

  if (saved) {
    // Use saved preference
    isDarkMode.value = saved === 'dark'
  } else if (respectSystemPref) {
    // Use system preference
    isDarkMode.value = getSystemPreference()
  } else {
    // Use fallback
    isDarkMode.value = fallbackTheme === 'dark'
  }

  applyTheme(isDarkMode.value, enableTransition)
  isInitialized.value = true
}

/**
 * Listen for system theme changes
 * @param callback - Callback to execute when system theme changes
 * @returns Cleanup function
 */
const onSystemThemeChange = (callback: (isDark: boolean) => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = (): void => {
    callback(mediaQuery.matches)
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }

  // JSDOM / legacy environments often only implement addListener/removeListener
  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }

  return () => {}
}

/**
 * Theme management composable with enhanced features
 * @returns Object containing theme state and control functions
 */
export function useTheme() {
  onMounted(() => {
    initializeTheme()
    useThemeSubscriberCount++
    updateSystemThemeListener()
  })

  onUnmounted(() => {
    document.documentElement.classList.remove('theme-transitioning')
    useThemeSubscriberCount = Math.max(0, useThemeSubscriberCount - 1)
    updateSystemThemeListener()
  })

  // Expose theme as a computed ref for better Vue 3 reactivity
  const theme = computed<Theme>(() => (isDarkMode.value ? 'dark' : 'light'))

  // Watch for theme changes and persist
  watch(isDarkMode, () => {
    if (isInitialized.value) {
      savePreference(isDarkMode.value ? 'dark' : 'light')
      updateSystemThemeListener()
    }
  })

  return {
    // State
    isDarkMode,
    theme,
    isTransitioning,
    isInitialized,

    // Actions
    setTheme,
    toggleTheme,
    initializeTheme,

    // System preference
    getSystemPreference,

    // Cleanup (detach OS theme listener; callers may invoke when tests need a clean slate)
    cleanupSystemListener: () => {
      if (systemThemeMediaCleanup) {
        systemThemeMediaCleanup()
        systemThemeMediaCleanup = null
      }
    },
    /** Returns the active media-query listener cleanup, or a no-op if none is attached. */
    systemThemeListener: () => systemThemeMediaCleanup ?? (() => {}),

    // Testing utilities
    _resetForTesting: () => _resetForTesting(),
  }
}
