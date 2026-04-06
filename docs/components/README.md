# VueSIP Components Documentation

This documentation provides comprehensive information about all Vue components in the VueSIP project, including both Options API and Composition API examples, SFC patterns, and best practices.

## Components Overview

| Component                                   | Category            | Status        |
| ------------------------------------------- | ------------------- | ------------- |
| [ReturnTimeDisplay](./ReturnTimeDisplay.md) | Status/Presence     | ✅ Documented |
| [Dialpad](./Dialpad.md)                     | Input/Communication | ✅ Documented |
| [CallControls](./CallControls.md)           | Call Management     | ✅ Documented |
| [ResponsiveGrid](./ResponsiveGrid.md)       | Layout/UI           | ✅ Documented |
| [ActionButton](./ActionButton.md)           | UI/Interactive      | ✅ Documented |
| [MobileNavigation](./MobileNavigation.md)   | Navigation          | ✅ Documented |
| [SuggesterChip](./SuggesterChip.md)         | Input/Autocomplete  | ✅ Documented |
| [SuggesterPanel](./SuggesterPanel.md)       | Input/Suggestions   | ✅ Documented |
| [ConfirmDialog](./ConfirmDialog.md)         | UI/Modal            | ✅ Documented |

## Quick Start

### Installation

All components are part of the VueSIP package and can be imported directly:

```typescript
import { ReturnTimeDisplay } from '@/components/ReturnTimeDisplay.vue'
import Dialpad from '@/components/Dialpad.vue'
import CallControls from '@/components/CallControls.vue'
// ... other components
```

### Usage Pattern

```vue
<template>
  <ReturnTimeDisplay
    :return-time="returnTimeData"
    :display-name="nurseName"
    @click="onReturnTimeClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ReturnTimeDisplay from '@/components/ReturnTimeDisplay.vue'

const returnTimeData = ref({
  formattedTime: '2:30 PM',
  formattedRemaining: '15m',
  durationMinutes: 30,
  remainingMs: 900000,
  isOverdue: false,
})

const nurseName = ref('Sarah Johnson')

const onReturnTimeClick = () => {
  console.log('Return time clicked')
}
</script>
```

## Component Patterns

### 1. Script Setup (Composition API)

All components use Vue 3's `<script setup>` syntax with TypeScript:

```vue
<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'

const props = defineProps<{
  message: string
  count?: number
}>()

const emit = defineEmits<{
  update: [value: string]
  action: []
}>()

const localState = ref('default')
</script>
```

### 2. Props and Emits

Components follow consistent patterns for props and emits:

```typescript
// Props with validation
const props = defineProps<{
  requiredProp: string
  optionalProp?: number
  complexProp: {
    id: string
    name: string
  }
}>()

// Emits with typing
const emit = defineEmits<{
  'update:modelValue': [value: string]
  action: [payload: CustomEvent]
}>()
```

### 3. Accessibility

All components include proper ARIA attributes and keyboard navigation:

```vue
<template>
  <button
    :aria-label="ariaLabel"
    :aria-busy="loading"
    @click="handleClick"
    @keydown.enter="handleEnter"
  >
    {{ label }}
  </button>
</template>
```

### 4. Responsive Design

Components use CSS custom properties for theming and responsive breakpoints:

```css
.component {
  --primary-color: #3b82f6;
  --component-gap: 12px;
}

@media (max-width: 640px) {
  .component {
    --component-gap: 8px;
  }
}
```

## Best Practices

### 1. Performance

- Use `v-once` for static content
- Implement proper memoization with `computed` properties
- Use `shallowRef` for large objects when appropriate
- Implement virtual scrolling for long lists

### 2. Accessibility

- Provide proper ARIA labels and roles
- Support keyboard navigation
- Ensure sufficient color contrast
- Implement focus management for modals

### 3. Mobile Optimization

- Use touch-friendly tap targets (minimum 48px)
- Implement proper hover states for touch devices
- Use viewport meta tags and responsive units
- Test on actual mobile devices

### 4. TypeScript

- Use strict type definitions
- Leverage Vue's built-in types
- Document complex prop types with JSDoc
- Use interfaces for complex objects

## Component Testing

Each component includes unit tests and accessibility validation:

```typescript
// Example test structure
describe('ReturnTimeDisplay', () => {
  it('renders formatted time correctly', () => {
    // Test implementation
  })

  it('emits click event when clicked', () => {
    // Test implementation
  })

  it('supports keyboard navigation', () => {
    // Test implementation
  })
})
```

## Migration Guide

### From Options API to Composition API

```typescript
// Options API (legacy)
export default {
  props: ['message'],
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}

// Composition API (current)
<script setup lang="ts">
const props = defineProps<{ message: string }>()
const count = ref(0)

const increment = () => count.value++
</script>
```

### From Vue 2 to Vue 3

- Use `<script setup>` instead of `export default`
- Replace `v-model` with `v-model` (updated syntax)
- Use `emits` instead of `this.$emit`
- Leverage Composition API for state management

## Support and Contributing

For issues, questions, or contributions:

1. Check the [main documentation](../README.md)
2. Review [contributing guidelines](../CONTRIBUTING.md)
3. Create issues with minimal reproducible examples
4. Include browser and Vue version information

## Related Documentation

- [VueSIP Architecture](../README.md#architecture)
- [Composables Documentation](../docs/composables-documented.md)
- [TypeScript Configuration](../tsconfig.json)
- [Testing Guidelines](../docs/testing/README.md)
