# ReturnTimeDisplay Component

Displays the expected return time and countdown for nurse/staff members with visual indicators for overdue status.

## Overview

The `ReturnTimeDisplay` component provides a comprehensive interface for displaying and managing staff return times, including countdown timers, progress indicators, and status visualizations.

## Features

- 🕐 Real-time countdown display
- 📊 Progress bar visualization
- 🎨 Status-based color coding (away, soon, overdue)
- 📱 Responsive compact and full views
- ♿ Full accessibility support
- 🎯 Click-to-interaction
- 🗑️ Clear functionality

## Basic Usage

```vue
<template>
  <ReturnTimeDisplay
    :return-time="returnTimeData"
    :display-name="'Sarah Johnson'"
    :extension="'123'"
    :away-message="'Lunch break'"
    :compact="false"
    @click="onReturnTimeClick"
    @clear="onClearClick"
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

const onReturnTimeClick = () => {
  console.log('Return time clicked')
}

const onClearClick = () => {
  console.log('Return time cleared')
}
</script>
```

## Props

| Prop            | Type                     | Default | Description                      |
| --------------- | ------------------------ | ------- | -------------------------------- |
| `returnTime`    | `ReturnTimeSpec \| null` | `null`  | Return time specification object |
| `displayName`   | `string`                 | `''`    | Display name of the person       |
| `extension`     | `string`                 | `''`    | Extension number                 |
| `awayReason`    | `string`                 | `''`    | Away reason/message              |
| `compact`       | `boolean`                | `false` | Show compact view (time only)    |
| `showCountdown` | `boolean`                | `true`  | Show countdown timer             |
| `showProgress`  | `boolean`                | `true`  | Show progress bar                |

### ReturnTimeSpec Type

```typescript
interface ReturnTimeSpec {
  /** Formatted return time (e.g., "2:30 PM") */
  formattedTime: string
  /** Formatted remaining time (e.g., "15m" or "overdue") */
  formattedRemaining: string
  /** Total duration in minutes */
  durationMinutes: number
  /** Remaining time in milliseconds */
  remainingMs: number
  /** Whether the return time is overdue */
  isOverdue: boolean
}
```

## Emits

| Event   | Payload | Description                          |
| ------- | ------- | ------------------------------------ |
| `click` | -       | Emitted when component is clicked    |
| `clear` | -       | Emitted when clear button is clicked |

## Slots

None - This component is self-contained.

## Styling

### CSS Variables

The component uses CSS custom properties for theming:

```css
.return-time-display {
  --status-away-bg: #fef3c7 --status-away-border: #f59e0b --status-away-color: #92400e
    --status-soon-bg: #fed7aa --status-soon-border: #ea580c --status-soon-color: #9a3412
    --status-overdue-bg: #fecaca --status-overdue-border: #ef4444 --status-overdue-color: #991b1b;
}
```

### Status Classes

The component applies different classes based on status:

- `status-away` - Normal away state
- `status-soon` - Less than 5 minutes remaining
- `status-overdue` - Return time has passed
- `status-none` - No return time set
- `compact` - Compact view mode

## Examples

### Compact View

```vue
<template>
  <ReturnTimeDisplay :return-time="returnTimeData" :compact="true" @click="onClick" />
</template>
```

```html
<!-- Renders as: 🕐 15m -->
```

### Full View with Custom Styling

```vue
<template>
  <ReturnTimeDisplay
    :return-time="{
      formattedTime: '3:45 PM',
      formattedRemaining: '2h 15m',
      durationMinutes: 120,
      remainingMs: 4500000,
      isOverdue: false,
    }"
    :display-name="nurse.name"
    :extension="nurse.extension"
    :away-reason="nurse.status"
    :compact="false"
    class="custom-time-display"
    @click="openReturnTimeDialog"
    @clear="clearReturnTime"
  />
</template>

<style scoped>
.custom-time-display {
  --status-away-bg: #e0f2fe;
  --status-away-border: #0284c7;
  --status-away-color: #0369a1;

  --status-soon-bg: #fef3c7;
  --status-soon-border: #f59e0b;
  --status-soon-color: #d97706;

  --status-overdue-bg: #fee2e2;
  --status-overdue-border: #ef4444;
  --status-overdue-color: #dc2626;
}
</style>
```

### Integration with Presence System

```vue
<template>
  <div class="nurse-dashboard">
    <ReturnTimeDisplay
      v-for="nurse in nurses"
      :key="nurse.id"
      :return-time="nurse.returnTime"
      :display-name="nurse.displayName"
      :extension="nurse.extension"
      :away-reason="nurse.awayReason"
      @click="editReturnTime(nurse.id)"
      @clear="clearReturnTime(nurse.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ReturnTimeDisplay from '@/components/ReturnTimeDisplay.vue'

interface Nurse {
  id: string
  displayName: string
  extension: string
  awayReason: string
  returnTime: ReturnTimeSpec | null
}

const nurses = ref<Nurse[]>([
  {
    id: '1',
    displayName: 'Sarah Johnson',
    extension: '123',
    awayReason: 'Lunch break',
    returnTime: {
      formattedTime: '2:30 PM',
      formattedRemaining: '45m',
      durationMinutes: 60,
      remainingMs: 2700000,
      isOverdue: false,
    },
  },
])

const editReturnTime = (nurseId: string) => {
  // Open edit dialog
}

const clearReturnTime = (nurseId: string) => {
  // Clear return time for nurse
}
</script>
```

## Accessibility

### ARIA Attributes

The component includes comprehensive ARIA support:

```html
<div
  class="return-time-display"
  role="timer"
  aria-live="polite"
  aria-label="Expected return time: 2:30 PM, 45 minutes remaining"
>
  <!-- Content -->
</div>
```

### Keyboard Navigation

- Tab: Navigate through interactive elements
- Enter: Trigger click action
- Space: Trigger click action (when focused)
- Escape: Clear button functionality

### Screen Reader Support

The component provides contextual information for screen readers:

```typescript
// Component includes proper labels and descriptions
const statusClass = computed(() => {
  if (!hasReturnTime.value) return 'status-none'
  if (isOverdue.value) return 'status-overdue'
  if (props.returnTime && props.returnTime.remainingMs && props.returnTime.remainingMs < 300000) {
    return 'status-soon'
  }
  return 'status-away'
})
```

## Performance Considerations

### Optimization Techniques

- **Computed Properties**: Uses computed properties for derived values
- **Efficient Updates**: Minimal re-renders through proper dependency tracking
- **CSS Transitions**: Hardware-accelerated animations
- **Memoization**: Caches frequently accessed values

### Usage Guidelines

1. **Bulk Updates**: When updating multiple return times, batch the updates
2. **Virtual Scrolling**: Use with virtual scrolling for large lists
3. **Memory Management**: Clean up timers when component unmounts

## Testing

### Unit Tests

```typescript
import { mount } from '@vue/test-utils'
import ReturnTimeDisplay from '@/components/ReturnTimeDisplay.vue'

describe('ReturnTimeDisplay', () => {
  it('renders correctly with return time data', () => {
    const wrapper = mount(ReturnTimeDisplay, {
      props: {
        returnTime: {
          formattedTime: '2:30 PM',
          formattedRemaining: '15m',
          durationMinutes: 30,
          remainingMs: 900000,
          isOverdue: false,
        },
      },
    })

    expect(wrapper.text()).toContain('2:30 PM')
    expect(wrapper.text()).toContain('15m remaining')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(ReturnTimeDisplay)
    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('shows compact view when compact prop is true', () => {
    const wrapper = mount(ReturnTimeDisplay, {
      props: {
        returnTime: mockReturnTime,
        compact: true,
      },
    })

    expect(wrapper.classes()).toContain('compact')
  })
})
```

### Integration Tests

```typescript
describe('ReturnTimeDisplay Integration', () => {
  it('updates countdown in real-time', async () => {
    const wrapper = mount(ReturnTimeDisplay, {
      props: {
        returnTime: {
          formattedTime: '2:30 PM',
          formattedRemaining: '15m',
          durationMinutes: 15,
          remainingMs: 900000,
          isOverdue: false,
        },
      },
    })

    // Wait for countdown to update
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('14m')
    })
  })
})
```

## Common Issues and Solutions

### Issue: Component not updating countdown

**Solution**: Ensure the `returnTime` prop is reactive and contains the correct `remainingMs` value:

```typescript
// Correct reactive update
const returnTimeData = ref({
  formattedTime: '2:30 PM',
  formattedRemaining: '15m',
  durationMinutes: 30,
  remainingMs: 900000,
  isOverdue: false,
})

// Update when data changes
const updateReturnTime = () => {
  returnTimeData.value.remainingMs -= 60000
  returnTimeData.value.formattedRemaining = calculateRemainingTime(returnTimeData.value.remainingMs)
}
```

### Issue: Clear button not working

**Solution**: Make sure the clear event is properly handled:

```typescript
<template>
  <ReturnTimeDisplay
    :return-time="returnTimeData"
    @clear="handleClear"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ReturnTimeDisplay from '@/components/ReturnTimeDisplay.vue'

const returnTimeData = ref<ReturnTimeSpec | null>(null)

const handleClear = () => {
  returnTimeData.value = null
}
</script>
```

### Issue: Styling not applying

**Solution**: Ensure CSS is properly scoped and variables are defined:

```vue
<style scoped>
.return-time-display {
  /* Apply custom styles */
  --status-away-bg: #e0f2fe;

  /* Ensure proper specificity */
  &.status-away {
    background: var(--status-away-bg);
  }
}
</style>
```

## Related Components

- [MobileNavigation](./MobileNavigation.md) - For mobile navigation patterns
- [ActionButton](./ActionButton.md) - For consistent button styling
- [ResponsiveGrid](./ResponsiveGrid.md) - For responsive layouts

## Contributing

When contributing to this component:

1. Follow the existing TypeScript patterns
2. Ensure all props have proper JSDoc documentation
3. Test with both compact and full views
4. Verify accessibility compliance
5. Update this documentation with any changes
