# MobileNavigation Component

Accessible, mobile-first tabbed navigation with keyboard support and responsive side-rail layout.

## Overview

`MobileNavigation` implements a tab bar (bottom on mobile, side rail on tablet/desktop) following the WAI-ARIA Tabs pattern. It supports keyboard navigation (arrow keys, Home/End), touch-friendly 48px targets, notification badges, and named slot panels.

## Features

- 📱 Bottom tab bar on mobile, side rail on ≥768px
- ⌨️ Full keyboard navigation (Arrow, Home, End)
- 🔔 Notification badges
- ♿ WAI-ARIA Tabs pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`)
- 🎨 Dark mode and high-contrast support
- 🧩 Named slot panels for each tab

## Basic Usage

```vue
<template>
  <MobileNavigation v-model="activeTab" :items="navItems">
    <template #dialer><Dialpad @call="makeCall" /></template>
    <template #contacts><ContactList /></template>
    <template #history><CallHistory /></template>
  </MobileNavigation>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MobileNavigation from '@/components/ui/MobileNavigation.vue'
import type { NavItem } from '@/components/ui/MobileNavigation.vue'

const activeTab = ref('dialer')

const navItems: NavItem[] = [
  { id: 'dialer', label: 'Dialer', icon: '📞' },
  { id: 'contacts', label: 'Contacts', icon: '👥', badge: 3 },
  { id: 'history', label: 'History', icon: '🕐' },
]
</script>
```

## Types

```typescript
interface NavItem {
  id: string
  label: string
  icon: string // Emoji or HTML string
  badge?: number // Optional notification count
}
```

## Props

| Prop         | Type        | Default                 | Description                         |
| ------------ | ----------- | ----------------------- | ----------------------------------- |
| `items`      | `NavItem[]` | — _(required)_          | Array of navigation items           |
| `ariaLabel`  | `string`    | —                       | Accessible label for the nav region |
| `modelValue` | `string`    | — _(required, v-model)_ | ID of the active tab                |

## Emits

| Event               | Payload  | Description    |
| ------------------- | -------- | -------------- |
| `update:modelValue` | `string` | v-model update |
| `change`            | `string` | Tab changed    |

## Slots

| Slot        | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| `[item.id]` | One named slot per nav item. Rendered as the tab panel content. |

## Styling

### CSS Custom Properties

```css
.mobile-nav {
  --mobile-nav-bg: #ffffff;
  --mobile-nav-border: rgba(0, 0, 0, 0.08);
  --mobile-nav-color: #6b7280;
  --mobile-nav-color-active: #3b82f6;
  --mobile-nav-focus: #3b82f6;
  --mobile-nav-badge-bg: #ef4444;
}
```

### Responsive Breakpoints

- **<768px**: Bottom tab bar, grid-auto-flow column
- **≥768px**: Left side rail, 80px wide, grid-auto-flow row

## Accessibility

### ARIA Pattern

Follows the [WAI-ARIA Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) pattern:

- Container has `role="tablist"`
- Each tab has `role="tab"`, `aria-selected`, `aria-controls`
- Each panel has `role="tabpanel"`, `aria-labelledby`
- Only the active tab is in tab order (`tabindex`)

### Keyboard Navigation

| Key                    | Action               |
| ---------------------- | -------------------- |
| ArrowRight / ArrowDown | Next tab (wraps)     |
| ArrowLeft / ArrowUp    | Previous tab (wraps) |
| Home                   | First tab            |
| End                    | Last tab             |

## Testing

```typescript
import { mount } from '@vue/test-utils'
import MobileNavigation from '@/components/ui/MobileNavigation.vue'

const items = [
  { id: 'a', label: 'Tab A', icon: 'A' },
  { id: 'b', label: 'Tab B', icon: 'B' },
]

it('renders all tabs', () => {
  const wrapper = mount(MobileNavigation, {
    props: { items, modelValue: 'a' },
    slots: { a: 'Panel A', b: 'Panel B' },
  })
  expect(wrapper.findAll('.mobile-nav__tab')).toHaveLength(2)
})

it('switches tab on click', async () => {
  const wrapper = mount(MobileNavigation, {
    props: { items, modelValue: 'a' },
    slots: { a: 'Panel A', b: 'Panel B' },
  })
  await wrapper.findAll('.mobile-nav__tab')[1].trigger('click')
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b'])
})
```

## Related Components

- [ResponsiveGrid](./ResponsiveGrid.md) — Layout primitive
- [ActionButton](./ActionButton.md) — Button styling
