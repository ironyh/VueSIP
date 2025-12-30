# PrimeVue Dark Theme Implementation

## Overview

VueSIP Playground now supports dynamic dark theme switching using PrimeVue's Aura theme preset with modern theming API.

## Implementation Details

### 1. Package Installation

Added `@primevue/themes` package to enable modern PrimeVue theming system:

```bash
pnpm add -w @primevue/themes
```

### 2. Main Application Configuration (`playground/main.ts`)

The application now:

- Imports Aura theme preset from `@primevue/themes/aura`
- Detects initial theme from localStorage or system preference
- Applies appropriate CSS classes to document root
- Configures PrimeVue with dark mode selector

```typescript
import Aura from '@primevue/themes/aura'

const getInitialTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('vuesip-theme')
  if (stored === 'dark' || stored === 'light') return stored

  // Fallback to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-theme',
      cssLayer: {
        name: 'primevue',
        order: 'tailwind-base, primevue, tailwind-utilities',
      },
    },
  },
})
```

### 3. CSS Theme Classes (`playground/style.css`)

Updated dark theme selector to support both classes:

- `.dark-mode` - Application-level dark theme class
- `.dark-theme` - PrimeVue-specific dark mode selector

Both classes trigger the same dark theme CSS variables:

```css
:root.dark-mode,
:root.dark-theme {
  --primary: #818cf8;
  --surface-ground: var(--bg-secondary);
  --text-color: var(--text-primary);
  /* ... additional dark theme tokens ... */
}
```

## Theme Switching

### Setting Theme

To switch themes, update both localStorage and document classes:

```javascript
function setTheme(theme: 'light' | 'dark') {
  localStorage.setItem('vuesip-theme', theme)

  if (theme === 'dark') {
    document.documentElement.classList.add('dark-mode', 'dark-theme')
  } else {
    document.documentElement.classList.remove('dark-mode', 'dark-theme')
  }
}
```

### Reading Current Theme

```javascript
const currentTheme = localStorage.getItem('vuesip-theme') || 'light'
```

## Component Integration

All PrimeVue components automatically respond to the `.dark-theme` class:

- Buttons
- Input fields
- Dropdowns
- Dialogs
- Tooltips
- Data tables
- And all other PrimeVue components

## Custom CSS Variables

The implementation preserves all existing custom CSS variables while integrating with PrimeVue's theming system:

### Light Theme

- Background: `--bg-primary: #ffffff`
- Text: `--text-primary: #0f172a`
- Border: `--border-color: #e5e7eb`

### Dark Theme

- Background: `--bg-primary: #111827`
- Text: `--text-primary: #f9fafb`
- Border: `--border-color: #374151`

## Testing

To test theme switching:

1. Open browser DevTools console
2. Run: `document.documentElement.classList.toggle('dark-theme')`
3. Observe all PrimeVue components updating to dark theme
4. Toggle back: `document.documentElement.classList.toggle('dark-theme')`

## Browser Compatibility

- Modern browsers with CSS Custom Properties support
- localStorage support
- `prefers-color-scheme` media query support (fallback)

## Future Enhancements

- [ ] Add theme toggle component in UI
- [ ] Implement smooth theme transitions
- [ ] Add theme preview in settings
- [ ] Support custom color schemes beyond light/dark
- [ ] Persist theme preference across sessions (already implemented via localStorage)

## Technical Notes

- The `@ts-ignore` comment is used for Aura import due to missing TypeScript definitions
- Both `.dark-mode` and `.dark-theme` classes are applied for compatibility
- CSS transitions ensure smooth theme changes
- System preference detection provides sensible defaults

## Related Files

- `/playground/main.ts` - Theme initialization and PrimeVue configuration
- `/playground/style.css` - CSS custom properties and dark theme variables
- `/package.json` - Dependencies including `@primevue/themes`
