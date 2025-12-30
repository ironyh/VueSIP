# Icon Sizing Standards

## Overview

This document defines standardized icon sizing across the VueSIP Playground using PrimeFlex utility classes for consistency, maintainability, and accessibility.

## Icon Size Standards

### Size Categories

| Category        | PrimeFlex Class          | Size (rem)         | Use Case                                   |
| --------------- | ------------------------ | ------------------ | ------------------------------------------ |
| **Extra Small** | `text-xs`                | 0.75rem            | Very small decorative icons                |
| **Small**       | `text-sm` or `text-base` | 0.875rem - 1rem    | Inline icons with text, small badges       |
| **Medium**      | `text-lg` or `text-xl`   | 1.125rem - 1.25rem | Standard button icons, form icons          |
| **Large**       | `text-2xl`               | 1.5rem             | Primary action icons, important indicators |
| **Extra Large** | `text-4xl`               | 2.25rem            | Hero sections, loading states              |
| **Hero**        | `text-6xl`               | 4rem               | Incoming calls, empty states, major events |

## Context-Based Sizing Guidelines

### 1. Inline Icons (with Text)

Icons that appear alongside text should match or slightly smaller than the text size.

```vue
<!-- Small inline icons -->
<i class="pi pi-check text-base"></i>
Success
<i class="pi pi-phone text-base"></i>
Call

<!-- Medium inline with larger text -->
<div class="text-xl">
  <i class="pi pi-user text-lg"></i> Profile
</div>
```

**Standard:** `text-base` (1rem) or `text-lg` (1.125rem)

### 2. Button Icons

Icons within buttons should be sized appropriately for the button size.

```vue
<!-- Standard button -->
<Button icon="pi pi-phone" label="Call" />
<!-- Icon is automatically sized, but can be customized -->

<!-- Small button with icon -->
<Button icon="pi pi-trash" size="small" class="text-sm" />

<!-- Large button with icon -->
<Button icon="pi pi-phone" size="large" class="text-xl" />
```

**Standard:**

- Small buttons: `text-sm` to `text-base`
- Standard buttons: `text-lg` to `text-xl`
- Large buttons: `text-xl` to `text-2xl`

### 3. Form Input Icons

Icons in input groups and form fields.

```vue
<div class="p-inputgroup">
  <span class="p-inputgroup-addon">
    <i class="pi pi-user" aria-hidden="true"></i>
  </span>
  <InputText />
</div>

<!-- Search input -->
<span class="p-input-icon-left">
  <i class="pi pi-search" aria-hidden="true"></i>
  <InputText />
</span>
```

**Standard:** Default size (inherits from input), or `text-base` to `text-lg`

### 4. Dashboard Stat Icons

Icons in metric cards and statistics displays.

```vue
<div
  class="flex align-items-center justify-content-center bg-blue-100 border-round"
  style="width:2.5rem;height:2.5rem"
>
  <i class="pi pi-phone text-blue-500 text-xl" aria-hidden="true"></i>
</div>
```

**Standard:** `text-xl` (1.25rem) for stat card icons

### 5. Empty State Icons

Icons displayed when lists or sections are empty.

```vue
<div class="empty-state">
  <i class="pi pi-inbox text-4xl text-secondary mb-3"></i>
  <div class="text-xl">No items found</div>
</div>
```

**Standard:** `text-4xl` (2.25rem) or `text-6xl` (4rem) depending on prominence

### 6. Loading/Status Icons

Icons indicating loading or connection states.

```vue
<!-- Loading spinner -->
<i class="pi pi-spin pi-spinner text-4xl text-primary" role="img" aria-label="Loading"></i>

<!-- Incoming call animation -->
<i class="pi pi-phone text-6xl text-primary" aria-hidden="true"></i>
```

**Standard:**

- Loading indicators: `text-4xl` (2.25rem)
- Major events (incoming calls): `text-6xl` (4rem)

### 7. Icon-Only Buttons

Buttons with only an icon (no text label).

```vue
<Button
  icon="pi pi-pencil"
  rounded
  severity="secondary"
  size="small"
  v-tooltip="'Edit'"
  aria-label="Edit"
/>
```

**Standard:** Sized based on button size (small, medium, large)

## Migration Patterns

### Before (Inline Styles)

```vue
<!-- ❌ Avoid inline styles -->
<i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--red-500)"></i>
<i class="pi pi-phone" style="font-size: 1.25rem"></i>
```

### After (PrimeFlex Classes)

```vue
<!-- ✅ Use PrimeFlex utilities -->
<i class="pi pi-exclamation-triangle text-2xl text-red-500"></i>
<i class="pi pi-phone text-xl"></i>
```

## Accessibility Considerations

### ARIA Labels

All icons should include appropriate ARIA attributes:

```vue
<!-- Decorative icons (hidden from screen readers) -->
<i class="pi pi-check text-lg" aria-hidden="true"></i>

<!-- Semantic icons (meaningful without text) -->
<i class="pi pi-exclamation-triangle text-2xl" role="img" aria-label="Warning"></i>

<!-- Icons with visible text labels -->
<Button icon="pi pi-phone" label="Call" aria-label="Call contact" />
```

### Color Contrast

When using colored icons, ensure sufficient contrast:

```vue
<!-- Good contrast -->
<i class="pi pi-check text-green-600 text-xl"></i>

<!-- With color utility classes -->
<i class="pi pi-times text-red-500 text-2xl"></i>
```

## Common Icon Patterns

### Success/Error Indicators

```vue
<!-- Success -->
<i class="pi pi-check-circle text-green-500 text-xl"></i>

<!-- Error -->
<i class="pi pi-times-circle text-red-500 text-xl"></i>

<!-- Warning -->
<i class="pi pi-exclamation-triangle text-orange-500 text-xl"></i>

<!-- Info -->
<i class="pi pi-info-circle text-blue-500 text-xl"></i>
```

### Phone Call Icons

```vue
<!-- Incoming call -->
<i class="pi pi-phone text-6xl text-primary"></i>

<!-- Call button -->
<Button icon="pi pi-phone" class="text-xl" />

<!-- Hangup (rotated phone) -->
<i class="pi pi-phone text-xl text-red-500" style="transform: rotate(135deg)"></i>
```

### Navigation Icons

```vue
<!-- Back/Forward -->
<i class="pi pi-arrow-left text-base"></i>
<i class="pi pi-arrow-right text-base"></i>

<!-- Menu -->
<i class="pi pi-bars text-xl"></i>

<!-- Close -->
<i class="pi pi-times text-xl"></i>
```

## Best Practices

1. **Consistency:** Use the same size for similar UI elements across the application
2. **Hierarchy:** Larger icons should indicate more importance or prominence
3. **Spacing:** Add appropriate margin/padding classes (`mr-2`, `mb-3`, etc.)
4. **Color:** Use color utility classes for semantic meaning
5. **Accessibility:** Always include ARIA labels for non-decorative icons
6. **Avoid Inline Styles:** Use PrimeFlex classes instead of `style="font-size: ..."`

## Quick Reference Table

| Element Type     | Recommended Class        | Example                                                     |
| ---------------- | ------------------------ | ----------------------------------------------------------- |
| Inline with text | `text-base` or `text-lg` | `<i class="pi pi-check text-base"></i> Done`                |
| Standard button  | `text-xl`                | `<Button icon="pi pi-save" class="text-xl" />`              |
| Small button     | `text-sm`                | `<Button icon="pi pi-edit" size="small" class="text-sm" />` |
| Stat card icon   | `text-xl`                | Dashboard metrics                                           |
| Empty state      | `text-4xl` or `text-6xl` | No data placeholder                                         |
| Loading spinner  | `text-4xl`               | Connection status                                           |
| Incoming call    | `text-6xl`               | Call notification                                           |
| Form input icon  | default or `text-base`   | Input group addon                                           |
| Search icon      | default                  | Input icon left/right                                       |

## Validation Checklist

- [ ] All inline `font-size` styles converted to PrimeFlex classes
- [ ] Icon sizes appropriate for their context
- [ ] Consistent sizing across similar UI elements
- [ ] ARIA labels present on semantic icons
- [ ] Color contrast meets accessibility standards
- [ ] Icon spacing uses utility classes (not inline styles)

## Related Resources

- [PrimeFlex Text Utilities](https://primeflex.org/textalign)
- [PrimeIcons Reference](https://primevue.org/icons)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
