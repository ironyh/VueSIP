# SuggesterPanel Component

Container panel for displaying triage follow-up question suggestions as a keyboard-navigable chip list.

## Overview

`SuggesterPanel` renders a panel of `SuggesterChip` components with a header, keyboard navigation (arrow keys, Enter, Escape), and focus management. It is designed for the nurse triage suggester system — showing follow-up questions the nurse can pick.

## Features

- ⌨️ Arrow key navigation through chips
- ✅ Enter / Space to select, Escape to dismiss
- 🎯 Focus index tracking (v-model via `update:focusedIndex`)
- 🗑️ Dismiss button
- ♿ `role="listbox"` with keyboard support

## Basic Usage

```vue
<template>
  <SuggesterPanel
    :suggestions="suggestions"
    :focused-index="focusedIdx"
    :picked-id="pickedId"
    @pick="onPick"
    @dismiss="onDismiss"
    @update:focused-index="(idx) => (focusedIdx = idx)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SuggesterPanel from '@/components/SuggesterPanel.vue'
import type { Suggestion } from '@/composables/useSuggester'

const suggestions: Suggestion[] = [
  { id: '1', text: 'How long have you had this symptom?', matchedKeyword: 'duration' },
  { id: '2', text: 'Are you experiencing chest pain?', matchedKeyword: 'chest' },
  { id: '3', text: 'Do you have a fever?', matchedKeyword: 'fever' },
]
const focusedIdx = ref(0)
const pickedId = ref<string | null>(null)

const onPick = (s: Suggestion) => {
  pickedId.value = s.id
}
const onDismiss = () => {
  /* hide panel */
}
</script>
```

## Props

| Prop           | Type             | Default        | Description                            |
| -------------- | ---------------- | -------------- | -------------------------------------- |
| `suggestions`  | `Suggestion[]`   | — _(required)_ | Array of suggestions to display        |
| `focusedIndex` | `number`         | — _(required)_ | Index of the currently focused chip    |
| `pickedId`     | `string \| null` | `null`         | ID of the picked (selected) suggestion |

## Emits

| Event                 | Payload      | Description                                |
| --------------------- | ------------ | ------------------------------------------ |
| `pick`                | `Suggestion` | A chip was selected                        |
| `dismiss`             | —            | Panel dismissed (Escape or ✕ button)       |
| `update:focusedIndex` | `number`     | Focus index changed (arrow key navigation) |

## Keyboard

| Key                    | Action                      |
| ---------------------- | --------------------------- |
| ArrowDown / ArrowRight | Next suggestion (wraps)     |
| ArrowUp / ArrowLeft    | Previous suggestion (wraps) |
| Enter / Space          | Pick focused suggestion     |
| Escape                 | Dismiss panel               |

## Conditional Rendering

The panel only renders when `suggestions.length > 0`. Wrap or use `v-if` externally if needed.

## Related Components

- [SuggesterChip](./SuggesterChip.md) — The individual chip button rendered inside this panel
