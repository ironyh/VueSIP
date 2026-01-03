# CSS Variables Reference

## Overview

Enhanced CSS variables system with 265+ semantic tokens for comprehensive theme coverage.

## Variable Categories (Light Theme)

### 1. Brand Colors (17 variables)

- Primary: `--primary`, `--primary-hover`, `--primary-active`, `--primary-light`, `--primary-dark`
- Secondary: `--secondary`, `--secondary-hover`, `--secondary-active`, `--secondary-dark`

### 2. Status Colors (20 variables)

- Success: `--success`, `--success-hover`, `--success-active`, `--success-light`, `--success-dark`
- Danger: `--danger`, `--danger-hover`, `--danger-active`, `--danger-light`, `--danger-dark`
- Warning: `--warning`, `--warning-hover`, `--warning-active`, `--warning-light`, `--warning-dark`
- Info: `--info`, `--info-hover`, `--info-active`, `--info-light`, `--info-dark`

### 3. Gray Scale (10 variables)

- `--gray-50` through `--gray-900` (10 shades)

### 4. Surface System (15 variables)

- Surface: `--surface-ground`, `--surface-section`, `--surface-card`, `--surface-overlay`
- States: `--surface-hover`, `--surface-active`, `--surface-border`, `--surface-disabled`
- Semantic: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`, `--bg-active`, `--bg-disabled`, `--bg-overlay`

### 5. Text System (12 variables)

- Basic: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`, `--text-emphasis`, `--text-inverse`
- Links: `--text-link`, `--text-link-hover`
- Status: `--text-success`, `--text-danger`, `--text-warning`, `--text-info`

### 6. Border System (8 variables)

- Colors: `--border-color`, `--border-color-light`, `--border-color-dark`
- States: `--border-hover`, `--border-focus`, `--border-disabled`
- Width: `--border-width`, `--border-width-thick`

### 7. Border Radius (5 variables)

- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`

### 8. Shadow System (7 variables)

- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-2xl`, `--shadow-inner`, `--shadow-focus`

### 9. Interactive States (4 variables)

- `--interactive-hover`, `--interactive-active`, `--interactive-focus`, `--interactive-disabled`

### 10. Component-Specific Tokens (40 variables)

#### Buttons (7 variables)

- `--btn-bg`, `--btn-bg-hover`, `--btn-bg-active`, `--btn-text`, `--btn-border`, `--btn-shadow`, `--btn-shadow-hover`

#### Input Fields (8 variables)

- `--input-bg`, `--input-bg-disabled`, `--input-text`, `--input-placeholder`
- `--input-border`, `--input-border-hover`, `--input-border-focus`, `--input-shadow-focus`

#### Cards (4 variables)

- `--card-bg`, `--card-border`, `--card-shadow`, `--card-shadow-hover`

#### Panels (3 variables)

- `--panel-bg`, `--panel-header-bg`, `--panel-border`

#### Dropdowns (5 variables)

- `--dropdown-bg`, `--dropdown-border`, `--dropdown-shadow`, `--dropdown-item-hover`, `--dropdown-item-active`

#### Tooltips (3 variables)

- `--tooltip-bg`, `--tooltip-text`, `--tooltip-shadow`

#### Modals (3 variables)

- `--modal-bg`, `--modal-overlay`, `--modal-shadow`

#### Tables (4 variables)

- `--table-header-bg`, `--table-row-hover`, `--table-row-stripe`, `--table-border`

### 11. Spacing System (7 variables)

- `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl`, `--spacing-2xl`, `--spacing-3xl`

### 12. Z-Index System (7 variables)

- `--z-dropdown`, `--z-sticky`, `--z-fixed`, `--z-modal-backdrop`, `--z-modal`, `--z-popover`, `--z-tooltip`

## Dark Theme Overrides

All variables have dark theme equivalents under `:root.dark-mode` and `:root.dark-theme` selectors.

### Key Dark Theme Changes:

- **Surfaces**: Dark slate backgrounds (#0f172a, #1e293b, #334155)
- **Text**: Light text on dark backgrounds (#f1f5f9, #cbd5e1)
- **Borders**: Lighter borders for contrast (#334155, #475569)
- **Shadows**: Deeper, more pronounced shadows
- **Interactive States**: White overlay effects instead of black
- **Gray Scale**: Inverted (50 is darkest, 900 is lightest)

## Usage Examples

```css
/* Button with theme-aware colors */
.custom-button {
  background: var(--btn-bg);
  color: var(--btn-text);
  border: 1px solid var(--btn-border);
  box-shadow: var(--btn-shadow);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
}

.custom-button:hover {
  background: var(--btn-bg-hover);
  box-shadow: var(--btn-shadow-hover);
}

/* Card component */
.custom-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  padding: var(--spacing-lg);
}

.custom-card:hover {
  box-shadow: var(--card-shadow-hover);
}

/* Input field */
.custom-input {
  background: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
}

.custom-input:hover {
  border-color: var(--input-border-hover);
}

.custom-input:focus {
  border-color: var(--input-border-focus);
  box-shadow: var(--input-shadow-focus);
  outline: none;
}

/* Status indicators */
.status-success {
  color: var(--text-success);
  background: var(--success-light);
  border: 1px solid var(--success);
}

.status-danger {
  color: var(--text-danger);
  background: var(--danger-light);
  border: 1px solid var(--danger);
}
```

## PrimeVue Integration

The following PrimeVue-specific tokens are also available in dark mode:

- `--text-color`
- `--text-color-secondary`
- `--primary-color`
- `--primary-color-text`

## Transition System

All color and shadow changes have smooth 0.3s ease transitions applied automatically for seamless theme switching.

## Best Practices

1. **Use semantic tokens**: Prefer `--text-primary` over `--gray-900` for better theme compatibility
2. **Component tokens**: Use component-specific tokens (e.g., `--btn-bg`) for consistency
3. **State variants**: Use hover/active/focus variants for interactive elements
4. **Status colors**: Use status color variants for user feedback
5. **Spacing scale**: Use spacing tokens for consistent layout rhythm
6. **Shadow hierarchy**: Use shadow tokens to establish visual depth
7. **Z-index system**: Use z-index tokens for consistent layering

## Variable Count Summary

- **Total Variables**: 265+
- **Light Theme Base**: 130+ unique variables
- **Dark Theme Overrides**: 130+ mirrored variables
- **Component-Specific**: 40+ component tokens
- **System Tokens**: 95+ foundation tokens
