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

/**
 * Reset singleton state for testing purposes only
 * @internal
 */
export const _resetForTesting = (): void => {
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
  applyTheme(theme, enableTransition)
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
const initializeTheme = (options: {
  enableTransition?: boolean
  respectSystemPref?: boolean
  fallbackTheme?: Theme
} = {}): void => {
  if (isInitialized.value) return

  const {
    enableTransition = true,
    respectSystemPref = true,
    fallbackTheme = 'light'
  } = options

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
const onSystemThemeChange = (callback: (isDark: boolean) => void): () => void => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleChange = (event: MediaQueryListEvent) => {
    callback(event.matches)
  }

  mediaQuery.addEventListener('change', handleChange)
  
  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}

/**
 * Theme management composable with enhanced features
 * @returns Object containing theme state and control functions
 */
export function useTheme() {
  // Initialize on first use
  onMounted(() => {
    initializeTheme()
  })

  // Cleanup system listener on unmount
  const cleanupSystemListener = onUnmounted(() => {
    // Clean up any event listeners
    document.documentElement.classList.remove('theme-transitioning')
  })

  // Expose theme as a computed ref for better Vue 3 reactivity
  const theme = computed<Theme>(() => (isDarkMode.value ? 'dark' : 'light'))

  // Watch for theme changes and persist
  watch(isDarkMode, (newValue) => {
    if (isInitialized.value) {
      savePreference(newValue ? 'dark' : 'light')
    }
  })

  // Listen for system theme changes only when no explicit preference is set
  const systemThemeListener = computed(() => {
    if (!isInitialized.value) return () => {}
    
    const saved = getSavedPreference()
    if (saved !== null) return () => {} // Don't listen if user has explicit preference
    
    return onSystemThemeChange((isDark) => {
      if (!isTransitioning.value) {
        isDarkMode.value = isDark
        applyTheme(isDark, false) // No transition for system changes
      }
    })
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
    
    // Cleanup
    cleanupSystemListener,
    systemThemeListener: systemThemeListener.value,
    
    // Testing utilities
    _resetForTesting: () => _resetForTesting()
  }
}