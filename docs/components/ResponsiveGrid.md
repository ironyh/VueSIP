# ResponsiveGrid Component

Mobile-first CSS Grid / Flexbox layout component with configurable columns, gaps, and responsive breakpoints.

## Overview

`ResponsiveGrid` provides a reusable layout primitive that automatically adapts from single-column (mobile) to multi-column (tablet/desktop) using CSS Grid `auto-fill` or Flexbox wrap.

## Features

- 📐 CSS Grid or Flexbox layout modes
- 📱 Auto single-column on mobile (<480px)
- 🔧 Configurable minimum column width, max columns, and gap
- ♿ Proper `role="group"` and `aria-label`
- 🧩 Slot-based — renders whatever children you provide

## Basic Usage

```vue
<template>
  <ResponsiveGrid :min-col-width="280" :gap="16">
    <CallCard v-for="call in calls" :key="call.id" :call="call" />
  </ResponsiveGrid>
</template>

<script setup lang="ts">
import ResponsiveGrid from '@/components/ui/ResponsiveGrid.vue'
</script>
```

## Props

| Prop          | Type               | Default          | Description                                                             |
| ------------- | ------------------ | ---------------- | ----------------------------------------------------------------------- |
| `layout`      | `'grid' \| 'flex'` | `'grid'`         | Layout mode                                                             |
| `minColWidth` | `number`           | `280`            | Minimum column width in px (grid mode). Columns auto-fit to fill space. |
| `maxCols`     | `number`           | `4`              | Maximum number of columns                                               |
| `gap`         | `number`           | `12`             | Gap between items in px                                                 |
| `wrap`        | `boolean`          | `true`           | Flex wrap (flex mode only)                                              |
| `ariaLabel`   | `string`           | `'Content grid'` | Accessible label                                                        |

## Emits

None.

## Slots

| Slot      | Description                                      |
| --------- | ------------------------------------------------ |
| `default` | Content to render inside the grid/flex container |

## Styling

### How It Works

**Grid mode** (default): Uses `grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr))`. On screens narrower than 480px, forces a single column via media query.

**Flex mode**: Sets `display: flex; flex-wrap: wrap` with configurable gap.

### Custom CSS Variables

The component has no exposed CSS variables — override via class or inline style as needed.

## Examples

### Flex Wrap Layout for Chips

```vue
<template>
  <ResponsiveGrid layout="flex" :gap="8" wrap>
    <SuggesterChip v-for="s in suggestions" :key="s.id" :suggestion="s" @pick="onPick" />
  </ResponsiveGrid>
</template>
```

### Constrained Max Columns

```vue
<template>
  <!-- Even on wide screens, never more than 3 columns -->
  <ResponsiveGrid :min-col-width="320" :max-cols="3" :gap="20">
    <NurseCard v-for="nurse in team" :key="nurse.id" :nurse="nurse" />
  </ResponsiveGrid>
</template>
```

## Accessibility

- Container has `role="group"` and configurable `aria-label`.
- Children inherit standard document flow.

## Related Components

- [ActionButton](./ActionButton.md)
- [MobileNavigation](./MobileNavigation.md)
