# CSS Variable Migration Pattern

This document outlines the pattern used to migrate from hardcoded colors to CSS variables in VueSIP playground.

## Migration Summary

**File**: `playground/PlaygroundApp.vue`

### Key Changes

1. **Created useTheme Composable** (`src/composables/useTheme.ts`)
   - Singleton state management for theme
   - Automatic initialization from localStorage or system preference
   - Smooth theme transitions
   - Persistent theme storage

2. **Updated Theme Toggle**
   - Removed local `isDarkMode` state
   - Removed manual `toggleTheme` and `applyTheme` functions
   - Integrated `useTheme` composable for centralized theme management

3. **CSS Variable Replacements**

## Color Mapping Reference

### Surface/Background Colors

| Before                      | After                    | Usage                     |
| --------------------------- | ------------------------ | ------------------------- |
| `#1a1a2e`                   | `var(--surface-900)`     | Header background         |
| `rgba(255, 255, 255, 0.12)` | `var(--surface-overlay)` | Theme toggle background   |
| `rgba(255, 255, 255, 0.25)` | `var(--surface-border)`  | Theme toggle border       |
| `#1f2937`                   | `var(--surface-800)`     | Code block backgrounds    |
| `#111827`                   | `var(--surface-900)`     | Code block gradient start |
| `#0b1220`                   | `var(--surface-950)`     | Code block gradient end   |

### Text Colors

| Before            | After                                          | Usage                          |
| ----------------- | ---------------------------------------------- | ------------------------------ |
| `white`           | `var(--surface-0)` / `var(--primary-contrast)` | Light text on dark backgrounds |
| `var(--gray-300)` | `var(--surface-300)`                           | Code button text               |
| `var(--gray-400)` | `var(--text-color-secondary)`                  | Placeholder text               |
| `var(--gray-500)` | `var(--text-color-secondary)`                  | Secondary text                 |
| `var(--gray-700)` | `var(--text-color)`                            | Primary text                   |
| `#e5e7eb`         | `var(--surface-100)`                           | Code text                      |

### Primary/Accent Colors

| Before                      | After                | Usage                    |
| --------------------------- | -------------------- | ------------------------ |
| `#4f46e5`                   | `var(--primary-600)` | Primary button gradients |
| `#6366f1`                   | `var(--primary-500)` | Primary color            |
| `rgba(99, 102, 241, 0.6)`   | `var(--primary-400)` | Active borders           |
| `rgba(102, 126, 234, 0.35)` | `var(--shadow-md)`   | Box shadows              |
| `rgba(102, 126, 234, 0.08)` | `var(--primary-100)` | Hover backgrounds        |

### Status Colors

| Before           | After               | Usage               |
| ---------------- | ------------------- | ------------------- |
| `var(--success)` | `var(--green-500)`  | Success states      |
| `var(--danger)`  | `var(--red-500)`    | Error/danger states |
| `#fef3c7`        | `var(--yellow-100)` | Highlight marks     |

### Semantic Shadow Variables

| Before                               | After               | Usage          |
| ------------------------------------ | ------------------- | -------------- |
| `0 8px 20px rgba(0, 0, 0, 0.15)`     | `var(--shadow-lg)`  | Large shadows  |
| `0 2px 8px rgba(...)`                | `var(--shadow-md)`  | Medium shadows |
| `0 0 0 3px rgba(102, 126, 234, 0.1)` | `var(--focus-ring)` | Focus states   |

## Implementation Pattern

### Step 1: Create useTheme Composable

```typescript
// src/composables/useTheme.ts
import { ref, watch, onMounted } from 'vue'

const isDarkMode = ref<boolean>(false)

export function useTheme() {
  onMounted(() => {
    // Initialize from localStorage or system preference
    const stored = localStorage.getItem('vuesip-theme')
    isDarkMode.value = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  watch(isDarkMode, (newValue) => {
    // Apply theme class and persist
    document.documentElement.classList.toggle('dark-mode', newValue)
    localStorage.setItem('vuesip-theme', newValue ? 'dark' : 'light')
  })

  return {
    isDarkMode,
    toggleTheme: () => {
      isDarkMode.value = !isDarkMode.value
    },
  }
}
```

### Step 2: Update Component

```typescript
// Remove local theme state
- const isDarkMode = ref(false)
- const toggleTheme = () => { ... }
- const applyTheme = (dark: boolean) => { ... }

// Add composable
+ import { useTheme } from '../src/composables/useTheme'
+ const { isDarkMode, toggleTheme } = useTheme()
```

### Step 3: Replace CSS Variables

```css
/* Before */
.element {
  background: #1a1a2e;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* After */
.element {
  background: var(--surface-900);
  color: var(--surface-0);
  border: 1px solid var(--surface-border);
}
```

## Benefits

1. **Centralized Theme Management**: Single source of truth for theme state
2. **Automatic Persistence**: Theme preference saved and restored
3. **System Preference Integration**: Respects user's OS theme preference
4. **Smooth Transitions**: All theme changes are animated
5. **Type Safety**: TypeScript support for theme values
6. **Reusability**: Composable can be used in any component

## Testing Checklist

- [x] Theme toggle button works
- [x] Theme persists across page reloads
- [x] Light mode displays correctly
- [x] Dark mode displays correctly
- [x] System preference detection works
- [x] All colors use CSS variables
- [x] Smooth transitions between themes

## Next Steps

Other files to migrate:

- `playground/components/CallToolbar.vue`
- `playground/components/ConnectionPanel.vue`
- Other playground components

Use this same pattern for consistency.
