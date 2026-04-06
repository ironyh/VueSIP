# ActionButton Component

Touch-friendly accessible button with multiple visual variants, loading state, and full ARIA support.

## Overview

`ActionButton` is the standard button primitive for the VueSIP softphone UI. It enforces a minimum 48px touch target, supports loading spinner, and offers variants (primary, success, danger, secondary, ghost) suitable for call controls and general actions.

## Features

- 🎨 5 variants: primary, secondary, success, danger, ghost
- 📏 3 sizes: sm (40px), md (48px), lg (56px)
- ⏳ Loading spinner state
- ♿ Full ARIA support (`aria-label`, `aria-busy`)
- 🌙 Dark mode via CSS custom properties
- 🖱️ Touch-device hover suppression
- ♿ Reduced-motion and high-contrast support

## Basic Usage

```vue
<template>
  <ActionButton label="Answer" icon="📞" variant="success" @click="answerCall" />
  <ActionButton
    label="End Call"
    icon="📵"
    variant="danger"
    :loading="isHangingUp"
    @click="hangup"
  />
</template>

<script setup lang="ts">
import ActionButton from '@/components/ui/ActionButton.vue'

const answerCall = () => {
  /* ... */
}
const hangup = () => {
  /* ... */
}
const isHangingUp = ref(false)
</script>
```

## Props

| Prop        | Type                                                           | Default                 | Description                |
| ----------- | -------------------------------------------------------------- | ----------------------- | -------------------------- |
| `label`     | `string`                                                       | —                       | Visible button label       |
| `ariaLabel` | `string`                                                       | (falls back to `label`) | Accessible label           |
| `icon`      | `string`                                                       | —                       | Emoji or HTML icon string  |
| `variant`   | `'primary' \| 'secondary' \| 'success' \| 'danger' \| 'ghost'` | `'primary'`             | Visual variant             |
| `size`      | `'sm' \| 'md' \| 'lg'`                                         | `'md'`                  | Size preset                |
| `disabled`  | `boolean`                                                      | `false`                 | Disabled state             |
| `loading`   | `boolean`                                                      | `false`                 | Show spinner, hide icon    |
| `fullWidth` | `boolean`                                                      | `false`                 | Stretch to full width      |
| `htmlType`  | `'button' \| 'submit' \| 'reset'`                              | `'button'`              | HTML button type attribute |

## Emits

| Event   | Payload      | Description  |
| ------- | ------------ | ------------ |
| `click` | `MouseEvent` | Button click |

## Styling

### CSS Custom Properties

All colors can be overridden per variant:

```css
.action-btn {
  --action-btn-primary-bg: #3b82f6;
  --action-btn-primary-hover: #2563eb;
  --action-btn-primary-color: #ffffff;
  --action-btn-secondary-bg: #6b7280;
  --action-btn-secondary-hover: #4b5563;
  --action-btn-success-bg: #10b981;
  --action-btn-success-hover: #059669;
  --action-btn-danger-bg: #ef4444;
  --action-btn-danger-hover: #dc2626;
  --action-btn-ghost-color: #374151;
  --action-btn-ghost-hover: rgba(0, 0, 0, 0.06);
  --action-btn-focus: #3b82f6;
}
```

Dark mode values are provided via `prefers-color-scheme: dark`.

## Examples

### Icon-Only Button

```vue
<ActionButton icon="✕" variant="ghost" size="sm" aria-label="Close" @click="close" />
```

### Full-Width Submit

```vue
<ActionButton label="Save" variant="primary" html-type="submit" full-width />
```

### Loading State

```vue
<ActionButton label="Connecting..." variant="primary" :loading="true" disabled />
```

## Accessibility

- `aria-label` defaults to `label` prop.
- `aria-busy` is set when `loading` is true.
- `:focus-visible` outline for keyboard users.
- `prefers-reduced-motion: reduce` disables transitions.
- `prefers-contrast: high` adds a border for visibility.

## Testing

```typescript
import { mount } from '@vue/test-utils'
import ActionButton from '@/components/ui/ActionButton.vue'

it('renders label and emits click', async () => {
  const wrapper = mount(ActionButton, { props: { label: 'Call' } })
  expect(wrapper.text()).toContain('Call')
  await wrapper.trigger('click')
  expect(wrapper.emitted('click')).toHaveLength(1)
})

it('shows spinner when loading', () => {
  const wrapper = mount(ActionButton, { props: { label: 'X', loading: true } })
  expect(wrapper.find('.action-btn__spinner').exists()).toBe(true)
})

it('is disabled when disabled prop is true', () => {
  const wrapper = mount(ActionButton, { props: { label: 'X', disabled: true } })
  expect(wrapper.find('button').attributes('disabled')).toBeDefined()
})
```

## Related Components

- [CallControls](./CallControls.md) — Uses ActionButton internally for call actions
- [Dialpad](./Dialpad.md) — Uses similar button styling
