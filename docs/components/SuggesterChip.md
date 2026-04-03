# SuggesterChip Component

A single suggestion chip button used within the triage suggester system. Displays suggestion text with optional keyword badge, supporting focused and picked (selected) states.

## Overview

`SuggesterChip` renders an inline chip-style button that can be focused (keyboard highlight) or picked (selected). It communicates user selection upward via the `pick` event. Designed for use inside `SuggesterPanel`.

## Basic Usage

```vue
<template>
  <SuggesterChip :suggestion="suggestion" :is-focused="false" :is-picked="false" @pick="onPick" />
</template>

<script setup lang="ts">
import SuggesterChip from '@/components/SuggesterChip.vue'
import type { Suggestion } from '@/composables/useSuggester'

const suggestion: Suggestion = {
  id: '1',
  text: 'Are you experiencing chest pain?',
  matchedKeyword: 'chest',
}
const onPick = (s: Suggestion) => console.log('Picked:', s.text)
</script>
```

## Props

| Prop          | Type         | Default        | Description                                          |
| ------------- | ------------ | -------------- | ---------------------------------------------------- |
| `suggestion`  | `Suggestion` | — _(required)_ | The suggestion object                                |
| `isFocused`   | `boolean`    | `false`        | Whether this chip is currently focused (highlighted) |
| `isPicked`    | `boolean`    | `false`        | Whether this chip has been picked (selected)         |
| `showKeyword` | `boolean`    | `false`        | Show the `#matchedKeyword` badge                     |

### Suggestion Type

```typescript
interface Suggestion {
  id: string
  text: string
  matchedKeyword?: string
}
```

## Emits

| Event  | Payload      | Description                                                |
| ------ | ------------ | ---------------------------------------------------------- |
| `pick` | `Suggestion` | Emitted when the chip is clicked or activated via keyboard |

## Keyboard

- **Enter** / **Space**: Triggers `pick` event.

## Visual States

| State     | Description                                   |
| --------- | --------------------------------------------- |
| Default   | Dark slate background, slate border           |
| `focused` | Blue border, blue background, slight scale-up |
| `picked`  | Green border, dark green background           |

## Related Components

- [SuggesterPanel](./SuggesterPanel.md) — Container that manages focus and keyboard nav for multiple chips
