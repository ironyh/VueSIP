/**
 * Theme management composable
 * Provides theme toggling and state management with CSS variable system
 */
import { ref, watch, onMounted } from 'vue'

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
 */
const applyTheme = (dark: boolean): void => {
  if (dark) {
    document.documentElement.classList.add('dark-mode', 'dark-theme')
  } else {
    document.documentElement.classList.remove('dark-mode', 'dark-theme')
  }
}

/**
 * Get current theme
 */
const getCurrentTheme = (): Theme => {
  return isDarkMode.value ? 'dark' : 'light'
}

/**
 * Set theme
 */
const setTheme = (theme: Theme): void => {
  isDarkMode.value = theme === 'dark'
}

/**
 * Toggle theme
 */
const toggleTheme = (): void => {
  isDarkMode.value = !isDarkMode.value
}

/**
 * Initialize theme from localStorage or system preference
 */
const initializeTheme = (): void => {
  if (isInitialized.value) return

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
 */
export function useTheme() {
  // Initialize on first use
  onMounted(() => {
    initializeTheme()
  })

  // Watch for theme changes and persist
  watch(isDarkMode, (newValue) => {
    applyTheme(newValue)
    localStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light')
  })

  return {
    isDarkMode,
    theme: getCurrentTheme,
    setTheme,
    toggleTheme,
  }
}
