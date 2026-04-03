/**
 * Theme management composable
 * Provides theme toggling and state management with CSS variable system
 */
import { ref, computed, watch, onMounted } from 'vue'

const THEME_STORAGE_KEY = 'vuesip-theme'

export type Theme = 'light' | 'dark'

// Singleton state for theme management
const isDarkMode = ref<boolean>(false)
const isInitialized = ref<boolean>(false)

/**
 * Reset singleton state for testing purposes only
 * @internal
 */
export const _resetForTesting = (): void => {
  isDarkMode.value = false
  isInitialized.value = false
  document.documentElement.classList.remove('dark-mode', 'dark-theme')
}

/**
 * Apply theme to document
 * @param dark - Whether to apply dark mode
 */
const applyTheme = (dark: boolean): void => {
  if (dark) {
    document.documentElement.classList.add('dark-mode', 'dark-theme')
  } else {
    document.documentElement.classList.remove('dark-mode', 'dark-theme')
  }
}

const setTheme = (theme: Theme): void => {
  isDarkMode.value = theme === 'dark'
}

/**
 * Toggle theme
 * @returns The new theme after toggling ('light' or 'dark')
 */
const toggleTheme = (): void => {
  isDarkMode.value = !isDarkMode.value
}

/**
 * Initialize theme from localStorage or system preference
 * @returns void
 */
const initializeTheme = (): void => {
  if (isInitialized.value) return

  // Guard against non-browser environments (SSR, workers, etc.)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    isDarkMode.value = false
    isInitialized.value = true
    return
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored) {
    isDarkMode.value = stored === 'dark'
  } else {
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  applyTheme(isDarkMode.value)
  isInitialized.value = true
}

/**
 * Theme management composable
 * @returns Object containing theme state and control functions
 */
export function useTheme() {
  // Initialize on first use
  onMounted(() => {
    initializeTheme()
  })

  // Expose theme as a computed ref for better Vue 3 reactivity
  const theme = computed<Theme>(() => (isDarkMode.value ? 'dark' : 'light'))

  // Watch for theme changes and persist
  watch(isDarkMode, (newValue) => {
    applyTheme(newValue)
    // Guard against non-browser environments
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light')
    }
  })

  return {
    isDarkMode,
    theme,
    setTheme,
    toggleTheme,
  }
}
