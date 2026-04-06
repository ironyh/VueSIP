# ConfirmDialog Component

A modal confirmation dialog wrapping PrimeVue Dialog with the `useConfirm` composable for programmatic usage.

## Overview

`ConfirmDialog` provides a reusable confirmation modal (e.g., "Are you sure you want to end this call?"). It can be used in two modes:

1. **Composable mode** — Use `useConfirm()` to programmatically show the dialog from anywhere.
2. **Standalone mode** — Bind `visible` and `options` props directly.

## Features

- 🪟 Modal dialog (PrimeVue `Dialog`)
- 🎨 Variant-aware confirm button (primary, danger, warning, info)
- ✅ Cancel / Confirm actions
- 🔄 Syncs with `useConfirm` composable state
- 📱 Responsive width

## Basic Usage (Composable)

```vue
<template>
  <div>
    <button @click="askConfirm">Delete something</button>
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { confirm } = useConfirm()

const askConfirm = () => {
  confirm({
    title: 'Delete Item',
    message: 'This action cannot be undone. Continue?',
    variant: 'danger',
    confirmText: 'Delete',
    cancelText: 'Keep',
    onConfirm: () => {
      /* perform delete */
    },
    onCancel: () => {
      /* cancelled */
    },
  })
}
</script>
```

## Basic Usage (Standalone Props)

```vue
<template>
  <ConfirmDialog
    :visible="showDialog"
    :options="dialogOptions"
    @confirm="onConfirm"
    @cancel="onCancel"
    @update:visible="(v) => (showDialog = v)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { ConfirmOptions } from '@/composables/useConfirm'

const showDialog = ref(false)

const dialogOptions: ConfirmOptions = {
  title: 'End Call?',
  message: 'The call is still active. End it now?',
  variant: 'warning',
  confirmText: 'End Call',
  cancelText: 'Go Back',
}

const onConfirm = () => {
  /* end call */
}
const onCancel = () => {
  showDialog.value = false
}
</script>
```

## Props

| Prop      | Type             | Default | Description                            |
| --------- | ---------------- | ------- | -------------------------------------- |
| `visible` | `boolean`        | —       | Show/hide the dialog (standalone mode) |
| `options` | `ConfirmOptions` | —       | Dialog configuration (standalone mode) |

### ConfirmOptions Type

```typescript
interface ConfirmOptions {
  title?: string
  message?: string
  icon?: string
  variant?: 'primary' | 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  width?: string
  onConfirm?: () => void
  onCancel?: () => void
}
```

## Emits

| Event            | Payload   | Description               |
| ---------------- | --------- | ------------------------- |
| `confirm`        | —         | Confirm button clicked    |
| `cancel`         | —         | Cancel button clicked     |
| `update:visible` | `boolean` | Dialog visibility changed |

## Dependencies

- **PrimeVue** `Dialog` and `Button` components.
- **Composable**: `useConfirm` from `@/composables/useConfirm`.

## Testing

```typescript
import { mount } from '@vue/test-utils'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

it('renders dialog when visible', () => {
  const wrapper = mount(ConfirmDialog, {
    props: {
      visible: true,
      options: { title: 'Test', message: 'Sure?', variant: 'danger' },
    },
    global: { stubs: { Dialog: true, Button: true } },
  })
  expect(wrapper.text()).toContain('Sure?')
})
```

## Related Components

- [ActionButton](./ActionButton.md) — For non-modal action buttons
