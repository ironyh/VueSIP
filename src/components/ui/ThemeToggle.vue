<template>
  <button
    :class="themeToggleClasses"
    :aria-label="ariaLabel"
    @click="handleToggle"
    @keydown="handleKeydown"
    type="button"
    data-testid="theme-toggle"
  >
    <!-- Sun icon (light mode) -->
    <svg
      v-if="isDarkMode"
      class="theme-toggle-icon sun-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>

    <!-- Moon icon (dark mode) -->
    <svg
      v-else
      class="theme-toggle-icon moon-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>

    <!-- Transition effect -->
    <div class="theme-toggle-transition"></div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

interface Props {
  /**
   * Size of the theme toggle button
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show a tooltip
   * @default false
   */
  showTooltip?: boolean

  /**
   * Custom tooltip text
   * @default ''
   */
  tooltipText?: string

  /**
   * Whether to include animated transitions
   * @default true
   */
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showTooltip: false,
  tooltipText: '',
  animated: true,
})

const { isDarkMode, toggleTheme } = useTheme()

// Accessibility: Focus management
const isFocused = ref(false)

// Theme toggle classes
const themeToggleClasses = computed(() => [
  'theme-toggle',
  `theme-toggle--${props.size}`,
  {
    'theme-toggle--focused': isFocused.value,
    'theme-toggle--animated': props.animated,
  },
])

// ARIA label for accessibility
const ariaLabel = computed(() => {
  return `Switch to ${isDarkMode.value ? 'light' : 'dark'} mode`
})

// Event handlers
const handleToggle = () => {
  toggleTheme()
}

const handleKeydown = (event: KeyboardEvent) => {
  // Handle keyboard navigation (Space, Enter)
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    toggleTheme()
  }
  // Handle escape key to blur
  else if (event.key === 'Escape') {
    isFocused.value = false
  }
}
</script>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-primary);
  padding: 0;
  outline: none;
  overflow: hidden;
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

.theme-toggle--focused {
  box-shadow: 0 0 0 3px var(--color-info);
}

/* Size variants */
.theme-toggle--sm {
  width: 32px;
  height: 32px;
}

.theme-toggle--md {
  width: 40px;
  height: 40px;
}

.theme-toggle--lg {
  width: 48px;
  height: 48px;
}

/* Icon styles */
.theme-toggle-icon {
  position: relative;
  z-index: 2;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle:hover .theme-toggle-icon {
  transform: scale(1.1);
}

/* Animated transition effect */
.theme-toggle--animated .theme-toggle-transition {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, var(--color-info) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
}

.theme-toggle--animated:hover .theme-toggle-transition {
  opacity: 0.1;
}

/* Active state */
.theme-toggle:active {
  transform: scale(0.95);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .theme-toggle,
  .theme-toggle-icon,
  .theme-toggle--animated .theme-toggle-transition {
    transition: none;
  }

  .theme-toggle:hover .theme-toggle-icon {
    transform: none;
  }
}
</style>
