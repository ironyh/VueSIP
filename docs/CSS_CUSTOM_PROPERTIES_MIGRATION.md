# CSS Custom Properties Migration Guide

**Purpose**: Complete reference for converting hard-coded hex colors to CSS custom properties for theme compatibility.

**Last Updated**: 2025-12-22

---

## Overview

All VueSIP demos must use CSS custom properties instead of hard-coded hex colors to support light/dark theme switching. This document provides patterns, examples, and fixes applied during Phase 3 migration.

---

## Available CSS Custom Properties

### Primary Theme Colors

```css
var(--primary)          /* Primary brand color */
var(--primary-hover)    /* Primary hover state */
var(--primary-emphasis) /* Primary emphasis */
```

### Semantic Colors

```css
var(--success)      /* Success/positive states (green) */
var(--warning)      /* Warning/caution states (amber/orange) */
var(--danger)       /* Error/danger states (red) */
var(--info)         /* Information states (blue) */
```

### Surface Colors

```css
var(--surface-0)    /* Base surface (white in light, dark in dark mode) */
var(--surface-50)   /* Very light surface */
var(--surface-100)  /* Light surface */
var(--surface-200)  /* Lighter surface */
var(--border-color) /* Standard border color */
```

### Text Colors

```css
var(--text-primary)     /* Primary text color */
var(--text-secondary)   /* Secondary/muted text */
var(--text-color)       /* Standard text color */
```

### VueSIP-Specific Colors

```css
var(--vuesip-info)      /* VueSIP info color */
var(--vuesip-info-dark) /* VueSIP info dark variant */
```

---

## Common Hex Color Mappings

### Green Shades

```css
/* ❌ WRONG */
color: #10b981; /* Tailwind green-500 */
color: #84cc16; /* Tailwind lime-500 */
color: #22c55e; /* Tailwind green-500 */

/* ✅ CORRECT */
color: var(--success);
```

### Orange/Amber Shades

```css
/* ❌ WRONG */
color: #f97316; /* Tailwind orange-500 */
color: #fbbf24; /* Tailwind amber-400 */
color: #fb923c; /* Tailwind orange-400 */

/* ✅ CORRECT */
color: var(--warning);
```

### Red Shades

```css
/* ❌ WRONG */
color: #ef4444; /* Tailwind red-500 */
color: #dc2626; /* Tailwind red-600 */
color: #991b1b; /* Tailwind red-800 */

/* ✅ CORRECT */
color: var(--danger);
```

### Purple/Indigo Shades

```css
/* ❌ WRONG */
color: #8b5cf6; /* Tailwind violet-500 */
color: #a78bfa; /* Tailwind violet-400 */
color: #7c3aed; /* Tailwind violet-600 */
color: #764ba2; /* Custom purple */
color: #4f46e5; /* Tailwind indigo-600 */

/* ✅ CORRECT */
color: var(--primary);
```

### Blue Shades

```css
/* ❌ WRONG */
color: #3b82f6; /* Tailwind blue-500 */
color: #60a5fa; /* Tailwind blue-400 */
color: #2563eb; /* Tailwind blue-600 */

/* ✅ CORRECT */
color: var(--primary); /* For primary actions */
color: var(--info); /* For informational elements */
```

### Gray Shades

```css
/* ❌ WRONG */
color: #6b7280; /* Tailwind gray-500 */
color: #9ca3af; /* Tailwind gray-400 */
color: #374151; /* Tailwind gray-700 */

/* ✅ CORRECT */
color: var(--text-secondary);
color: var(--surface-200);
```

---

## Real-World Fixes Applied

### Fix 1: NetworkSimulatorDemo.vue - Quality Indicators

**Context**: Network quality color coding
**Location**: Lines 395-402 and 543-548

**Before**:

```typescript
const networkQualityColor = computed(() => {
  const quality = currentMetrics.value.quality.toLowerCase()
  if (quality === 'excellent') return 'var(--success)'
  if (quality === 'good') return '#84cc16' // ❌ Hard-coded lime
  if (quality === 'fair') return 'var(--warning)'
  if (quality === 'poor') return 'var(--danger)'
  return 'var(--text-secondary)'
})

const getLatencyColor = (latency: number): string => {
  if (latency < 100) return 'var(--success)'
  if (latency < 200) return '#84cc16' // ❌ Hard-coded lime
  if (latency < 300) return 'var(--warning)'
  return 'var(--danger)'
}
```

**After**:

```typescript
const networkQualityColor = computed(() => {
  const quality = currentMetrics.value.quality.toLowerCase()
  if (quality === 'excellent') return 'var(--success)'
  if (quality === 'good') return 'var(--success)' // ✅ CSS variable
  if (quality === 'fair') return 'var(--warning)'
  if (quality === 'poor') return 'var(--danger)'
  return 'var(--text-secondary)'
})

const getLatencyColor = (latency: number): string => {
  if (latency < 100) return 'var(--success)'
  if (latency < 200) return 'var(--success)' // ✅ CSS variable
  if (latency < 300) return 'var(--warning)'
  return 'var(--danger)'
}
```

**Rationale**: Both "excellent" and "good" states use the same success color for consistency.

---

### Fix 2: ToolbarLayoutsDemo.vue - Status Object Colors

**Context**: Agent status definitions
**Location**: Lines 1262-1269 and 1289-1296

**Before**:

```typescript
{
  id: 'documenting',
  label: 'Documenting',
  description: 'Writing patient notes',
  color: '#8b5cf6',  // ❌ Hard-coded violet
  canReceiveCalls: true,
  statusMessage: 'Documenting - can still receive urgent calls',
  allowsReturnTime: true
},
{
  id: 'lunch',
  label: 'Lunch',
  description: 'On lunch break',
  color: '#f97316',  // ❌ Hard-coded orange
  canReceiveCalls: false,
  statusMessage: 'On lunch break',
  allowsReturnTime: true
}
```

**After**:

```typescript
{
  id: 'documenting',
  label: 'Documenting',
  description: 'Writing patient notes',
  color: 'var(--primary)',  // ✅ CSS variable
  canReceiveCalls: true,
  statusMessage: 'Documenting - can still receive urgent calls',
  allowsReturnTime: true
},
{
  id: 'lunch',
  label: 'Lunch',
  description: 'On lunch break',
  color: 'var(--warning)',  // ✅ CSS variable
  canReceiveCalls: false,
  statusMessage: 'On lunch break',
  allowsReturnTime: true
}
```

---

### Fix 3: ToolbarLayoutsDemo.vue - CSS Background

**Context**: Toolbar preview gradient background
**Location**: Line 1545

**Before**:

```css
.toolbar-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: 8px;
  background: linear-gradient(120deg, var(--primary) 0%, #764ba2 50%, #4f46e5 100%);
  /* ❌ Gradient with hard-coded purple colors */
  color: var(--surface-0);
  font-size: 0.875rem;
}
```

**After**:

```css
.toolbar-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: 8px;
  background: var(--primary); /* ✅ Simple solid color */
  color: var(--surface-0);
  font-size: 0.875rem;
}
```

**Rationale**: Gradients with hard-coded colors don't adapt to theme changes. Simplified to solid color.

---

### Fix 4: ToolbarLayoutsDemo.vue - Badge Colors

**Context**: State badge colors for call states
**Location**: Lines 1598-1603 and 1605-1609

**Before**:

```css
.state-badge.ringing {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24; /* ❌ Hard-coded amber */
  border: 1px solid rgba(251, 191, 36, 0.3);
  animation: pulse-ring 1.5s infinite;
}

.state-badge.hold {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa; /* ❌ Hard-coded violet */
  border: 1px solid rgba(139, 92, 246, 0.3);
}
```

**After**:

```css
.state-badge.ringing {
  background: rgba(251, 191, 36, 0.2);
  color: var(--warning); /* ✅ CSS variable */
  border: 1px solid rgba(251, 191, 36, 0.3);
  animation: pulse-ring 1.5s infinite;
}

.state-badge.hold {
  background: rgba(139, 92, 246, 0.2);
  color: var(--primary); /* ✅ CSS variable */
  border: 1px solid rgba(139, 92, 246, 0.3);
}
```

**Note**: Background rgba values kept for subtle transparency effect, but text color uses CSS variables.

---

## Migration Checklist

When converting hex colors to CSS custom properties:

### 1. Identify All Hex Colors

```bash
# Find hex colors in a file
grep -n "#[0-9a-fA-F]\{6\}" filename.vue
grep -n "#[0-9a-fA-F]\{3\}" filename.vue  # Short form
```

### 2. Classify Color Purpose

- **Green/Success**: Health indicators, success states, positive actions
- **Orange/Warning**: Caution states, warnings, moderate issues
- **Red/Danger**: Errors, critical issues, destructive actions
- **Purple/Primary**: Primary brand actions, main UI elements
- **Blue/Info**: Informational elements, secondary actions
- **Gray/Text**: Text colors, borders, subtle backgrounds

### 3. Replace with Appropriate Variable

```css
/* Match semantic meaning, not just color appearance */
color: #10b981; /* Green success indicator */
→ color: var(--success);

color: #8b5cf6; /* Purple primary action */
→ color: var(--primary);

color: #f97316; /* Orange warning */
→ color: var(--warning);
```

### 4. Test Both Themes

- ✅ View in light mode
- ✅ View in dark mode
- ✅ Verify color contrast meets accessibility standards
- ✅ Ensure semantic meaning preserved

### 5. Run ESLint

```bash
npm run lint -- path/to/file.vue
```

Look for:

```
❌ Hard-coded hex colors not allowed. Use CSS custom properties (e.g., var(--primary)) instead
```

---

## Special Cases

### Transparent/Alpha Colors

When transparency is needed:

```css
/* ✅ ACCEPTABLE: Background with alpha */
background: rgba(251, 191, 36, 0.2);
color: var(--warning); /* But text should use variable */
border: 1px solid rgba(251, 191, 36, 0.3);
```

### Gradients

Avoid gradients with hard-coded colors:

```css
/* ❌ WRONG */
background: linear-gradient(120deg, var(--primary) 0%, #764ba2 50%, #4f46e5 100%);

/* ✅ BETTER: Single color */
background: var(--primary);

/* ✅ ACCEPTABLE: All variables */
background: linear-gradient(120deg, var(--primary) 0%, var(--primary-emphasis) 100%);
```

### Component-Specific Colors

When a component needs a specific shade:

```css
/* If the color truly doesn't fit semantic categories, consider: */
/* 1. Is it really necessary? */
/* 2. Should it be a new CSS variable? */
/* 3. Can it use an existing variable with opacity? */

/* Example: Need a lighter version of primary */
background: var(--primary);
opacity: 0.7; /* Better than hard-coding a lighter shade */
```

---

## ESLint Configuration

The project uses a custom ESLint rule to enforce CSS custom properties:

```javascript
// eslint.config.ts
{
  'no-restricted-syntax': [
    'error',
    {
      selector: "Literal[value=/#[0-9a-fA-F]{6}/]",
      message: '❌ Hard-coded hex colors not allowed. Use CSS custom properties (e.g., var(--primary)) instead'
    },
    {
      selector: "Literal[value=/#[0-9a-fA-F]{3}/]",
      message: '❌ Hard-coded hex colors not allowed. Use CSS custom properties (e.g., var(--primary)) instead'
    }
  ]
}
```

---

## Summary of Fixes

| File                     | Location  | Color                 | Replacement      | Type       |
| ------------------------ | --------- | --------------------- | ---------------- | ---------- |
| NetworkSimulatorDemo.vue | Line 398  | `#84cc16`             | `var(--success)` | TypeScript |
| NetworkSimulatorDemo.vue | Line 545  | `#84cc16`             | `var(--success)` | TypeScript |
| ToolbarLayoutsDemo.vue   | Line 1265 | `#8b5cf6`             | `var(--primary)` | TypeScript |
| ToolbarLayoutsDemo.vue   | Line 1292 | `#f97316`             | `var(--warning)` | TypeScript |
| ToolbarLayoutsDemo.vue   | Line 1545 | `#764ba2` + `#4f46e5` | `var(--primary)` | CSS        |
| ToolbarLayoutsDemo.vue   | Line 1600 | `#fbbf24`             | `var(--warning)` | CSS        |
| ToolbarLayoutsDemo.vue   | Line 1607 | `#a78bfa`             | `var(--primary)` | CSS        |

**Total Fixes**: 7 hard-coded colors → CSS custom properties

---

## Best Practices

### DO ✅

- Use semantic color names (`--success`, `--warning`, `--danger`)
- Use CSS custom properties for all colors
- Test in both light and dark themes
- Match color to semantic meaning, not just appearance
- Run ESLint to catch violations

### DON'T ❌

- Hard-code hex colors anywhere
- Use hard-coded gradients with hex colors
- Choose colors based only on visual appearance
- Skip theme testing
- Ignore ESLint warnings about hex colors

---

## Resources

- [PrimeVue Theming Guide](https://primevue.org/theming/)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- Project: `/playground/demos/shared-components.ts` - Component reference
- Project: `/docs/PHASE_3_WEEK_1_COMPLETION_REPORT.md` - Migration details

---

**Document Version**: 1.0
**Last Updated**: 2025-12-22
**Status**: Complete
