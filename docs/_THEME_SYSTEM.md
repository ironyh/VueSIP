# VueSIP Theme System Documentation

## Overview

The VueSIP theme system provides a comprehensive dark mode implementation with smooth transitions, accessibility support, and persistent user preferences. The system uses CSS custom properties for theming and includes a reusable theme toggle component.

## Features

### ✨ Key Features

- **Dark Mode Toggle**: Easy-to-use theme switcher with smooth animations
- **System Preference Detection**: Automatically detects and respects system color scheme preferences
- **Persistence**: Saves theme preference in localStorage
- **Smooth Transitions**: Animated theme switching with optimized performance
- **Accessibility**: Full keyboard navigation and ARIA support
- **Responsive Design**: Works across all screen sizes
- **TypeScript Support**: Full type safety and IntelliSense support

### 🎨 Theme System Architecture

```
Theme System Components:
├── useTheme Composable (src/composables/useTheme.ts)
│   ├── State management
│   ├── Theme persistence
│   ├── System preference listening
│   └── Transition controls
├── ThemeToggle Component (src/components/ui/ThemeToggle.vue)
│   ├── Interactive theme switcher
│   ├── Keyboard navigation
│   └── Accessibility features
└── CSS Theme System (playground/styles/themes.css)
    ├── CSS custom properties
    ├── Smooth transition animations
    └── Theme-specific styles
```

## Installation & Setup

### 1. Using the Theme Composable

```typescript
import { useTheme } from '@/composables/useTheme'

const { isDarkMode, theme, toggleTheme, setTheme } = useTheme()
```

### 2. Adding Theme Toggle to Components

```vue
<template>
  <div>
    <h1>My Application</h1>
    <ThemeToggle size=\"md\" :animated=\"true\" />
    <!-- Your content here -->
  </div>
</template>

<script setup lang=\"ts\">
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
</script>
```

## API Reference

### useTheme Composable

#### State Properties

```typescript
const { isDarkMode, theme, isTransitioning, isInitialized } = useTheme()

// Current theme mode (true for dark, false for light)
const isDarkMode: Ref<boolean>

// Current theme as string ('light' | 'dark')
const theme: Ref<'light' | 'dark'>

// Whether a theme transition is in progress
const isTransitioning: Ref<boolean>

// Whether the theme system has been initialized
const isInitialized: Ref<boolean>
```

#### Methods

```typescript
// Toggle between light and dark mode
const toggleTheme = (enableTransition?: boolean): 'light' | 'dark'

// Set specific theme
const setTheme = (theme: 'light' | 'dark', enableTransition?: boolean): void

// Initialize theme with options
const initializeTheme = (options?: {
  enableTransition?: boolean
  respectSystemPref?: boolean
  fallbackTheme?: 'light' | 'dark'
}): void

// Get current system preference
const getSystemPreference = (): boolean

// Reset state (testing only)
const _resetForTesting = (): void
```

#### System Preference Listening

```typescript
// Listen for system theme changes (auto-setup when no explicit preference)
const systemThemeListener = (): () => void

// Manual cleanup
const cleanupSystemListener = (): void
```

### ThemeToggle Component

#### Props

```typescript
interface ThemeToggleProps {
  // Size of the toggle button: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg'
  
  // Whether to show animated transitions
  animated?: boolean
  
  // Whether to enable tooltip
  showTooltip?: boolean
  
  // Custom tooltip text
  tooltipText?: string
}
```

#### Events

The component emits the following events:

- **@click**: When the toggle button is clicked
- **@keydown**: When keyboard keys are pressed

#### Slots

The component does not use slots.

## Usage Examples

### Basic Usage

```vue
<template>
  <div class=\"app\">
    <header>
      <h1>My App</h1>
      <ThemeToggle />
    </header>
    <main>
      <!-- Content -->
    </main>
  </div>
</template>

<script setup lang=\"ts\">
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useTheme } from '@/composables/useTheme'

const { isDarkMode, toggleTheme } = useTheme()

// Access current theme state
console.log('Current theme:', isDarkMode.value ? 'dark' : 'light')
</script>
```

### Advanced Usage with System Preferences

```vue
<template>
  <div>
    <ThemeToggle 
      size=\"lg\"
      :animated=\"true\"
      :show-tooltip=\"true\"
      tooltip-text=\"Toggle theme\"
    />
    
    <div v-if=\"isTransitioning\">
      <p>Theme is changing...</p>
    </div>
  </div>
</template>

<script setup lang=\"ts\">
import { useTheme } from '@/composables/useTheme'
import { watch, onMounted } from 'vue'

const { 
  isDarkMode, 
  theme, 
  toggleTheme, 
  isTransitioning,
  getSystemPreference 
} = useTheme()

// Watch for theme changes
watch(theme, (newTheme) => {
  console.log(`Theme changed to: ${newTheme}`)
})

// Log system preference
onMounted(() => {
  console.log('System prefers dark mode:', getSystemPreference())
})
</script>
```

### Custom Theme Integration

```vue
<template>
  <div :class=\"{ 'dark-theme': isDarkMode }\">
    <!-- Your themed content -->
    <button :style=\"{ 
      backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
      color: isDarkMode ? '#f1f5f9' : '#0f172a'
    }\">
      Styled Button
    </button>
  </div>
</template>

<script setup lang=\"ts\">
import { useTheme } from '@/composables/useTheme'

const { isDarkMode } = useTheme()
</script>
```

## CSS Theme Variables

The theme system uses CSS custom properties for easy theming. These variables are automatically updated when the theme changes.

### Color Variables

```css
/* Light Mode (Default) */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-color: #e2e8f0;
}

/* Dark Mode */
.dark-mode {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --border-color: #334155;
}
```

### Available Variables

```css
/* Background Colors */
--bg-primary          /* Main background */
--bg-secondary        /* Secondary background */
--bg-tertiary         /* Tertiary background */
--bg-card            /* Card backgrounds */
--bg-hover           /* Hover states */

/* Text Colors */
--text-primary       /* Main text */
--text-secondary     /* Secondary text */
--text-tertiary      /* Tertiary text */
--text-muted         /* Muted/inactive text */
--text-on-gradient   /* Text on gradient backgrounds */

/* Border Colors */
--border-color       /* Default borders */
--border-color-hover /* Hover borders */
--border-color-focus /* Focus borders */

/* Status Colors */
--color-success      /* Success states */
--color-warning      /* Warning states */
--color-danger       /* Danger states */
--color-info         /* Information states */
--color-neutral      /* Neutral states */

/* Gradients */
--gradient-blue      /* Blue gradient */
--gradient-indigo     /* Indigo gradient */
--gradient-purple    /* Purple gradient */
/* ... and more gradients */

/* Spacing */
--spacing-xs         /* 0.5rem (8px) */
--spacing-sm         /* 0.75rem (12px) */
--spacing-md         /* 1rem (16px) */
--spacing-lg         /* 1.5rem (24px) */
--spacing-xl         /* 2rem (32px) */

/* Shadows */
--shadow-sm          /* Small shadows */
--shadow-md          /* Medium shadows */
--shadow-lg          /* Large shadows */
--shadow-xl          /* Extra large shadows */
```

## Accessibility

### Keyboard Navigation

The theme toggle supports full keyboard navigation:

- **Space**: Toggle theme
- **Enter**: Toggle theme  
- **Escape**: Close focus state
- **Tab**: Navigate through interactive elements

### Screen Reader Support

```vue
<ThemeToggle 
  :aria-label=\"`Switch to ${isDarkMode ? 'light' : 'dark'} mode`\" 
/>
```

### Focus Management

The toggle includes visible focus indicators and proper focus management for keyboard users.

### Reduced Motion Support

The system respects `prefers-reduced-motion` preferences and disables animations when requested:

```css
@media (prefers-reduced-motion: reduce) {
  .theme-toggle,
  .theme-toggle-icon,
  .theme-toggle-transition {
    transition: none;
  }
}
```

## Performance Optimizations

### Smooth Transitions

Theme transitions are optimized for performance:

- Uses CSS `transform` and `opacity` for GPU acceleration
- Implements hardware acceleration where possible
- Provides reduced motion support
- Minimizes reflow and repaint operations

### Lazy Initialization

The theme system lazy-initializes to avoid startup performance impact:

```typescript
// Theme initializes only when first used
onMounted(() => {
  initializeTheme()
})
```

### Efficient State Management

Uses Vue 3's reactivity system for efficient state updates and minimal re-renders.

## Testing

### Unit Testing

```typescript
import { useTheme } from '@/composables/useTheme'
import { mount } from '@vue/test-utils'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

describe('useTheme', () => {
  it('should default to light mode', () => {
    const { isDarkMode } = useTheme()
    expect(isDarkMode.value).toBe(false)
  })
  
  it('should toggle theme correctly', () => {
    const { isDarkMode, toggleTheme } = useTheme()
    toggleTheme()
    expect(isDarkMode.value).toBe(true)
  })
})
```

### Component Testing

```typescript
describe('ThemeToggle', () => {
  it('should render with correct icons', () => {
    const wrapper = mount(ThemeToggle)
    expect(wrapper.find('.moon-icon').exists()).toBe(true)
  })
  
  it('should handle click events', async () => {
    const wrapper = mount(ThemeToggle)
    await wrapper.find('button').trigger('click')
    // Verify theme was toggled
  })
})
```

### Integration Testing

```typescript
// Test theme persistence
describe('Theme Persistence', () => {
  it('should save theme preference', () => {
    const { setTheme } = useTheme()
    setTheme('dark')
    expect(localStorage.getItem('vuesip-theme')).toBe('dark')
  })
})
```

## Troubleshooting

### Common Issues

**Theme not applying**
```typescript
// Make sure to initialize theme on component mount
onMounted(() => {
  const { initializeTheme } = useTheme()
  initializeTheme()
})
```

**Smooth transitions not working**
```css
/* Ensure theme transition class is applied */
html.theme-transitioning * {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

**Accessibility issues**
```typescript
// Ensure proper ARIA labels
<ThemeToggle 
  :aria-label=\"`Switch to ${isDarkMode ? 'light' : 'dark'} mode`\" 
/>
```

### Performance Issues

If you experience performance problems during theme switching:

1. Check if you're using CSS properties that trigger layout recalculations
2. Consider using `transform` and `opacity` instead of `left`/`top` properties
3. Implement `will-change: transform` for animated elements

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support  
- **Safari**: Full support
- **Mobile**: Full support on iOS 13+ and Android 8+

## Contributing

When adding new theme features:

1. Follow the existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Ensure accessibility compliance
5. Test on multiple browsers

## Migration Guide

### From Basic Theme System

If you're upgrading from a basic theme system:

1. Replace manual theme state with `useTheme` composable
2. Use the provided `ThemeToggle` component instead of custom implementations
3. Update CSS to use the new theme variables
4. Add smooth transition classes to your components

```typescript
// Old way
const isDarkMode = ref(false)
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
}

// New way
const { isDarkMode, toggleTheme } = useTheme()
```

## License

This theme system is part of VueSIP and follows the same license terms.