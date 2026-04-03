# Dialpad Component

A touch-friendly numeric dial pad with DTMF keypad support for call entry functionality.

## Overview

The `Dialpad` component provides an accessible, mobile-first interface for numeric input, commonly used in softphone applications for dialing phone numbers. It includes support for both touch and keyboard input, with accessibility features and responsive design.

## Features

- 🎯 Touch-friendly 48px minimum tap targets
- 📞 Complete DTMF keypad (1-9, \*, 0, #)
- ⌨️ Keyboard navigation support
- ♿ Full accessibility with ARIA labels
- 📱 Responsive design for all screen sizes
- 🔢 Real-time input validation
- 🎨 Customizable styling themes
- 🔄 Backspace functionality

## Basic Usage

```vue
<template>
  <Dialpad :is-calling="isCalling" @digit="handleDigit" @call="handleCall" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Dialpad from '@/components/Dialpad.vue'

const isCalling = ref(false)
const currentNumber = ref('')

const handleDigit = (digit: string) => {
  currentNumber.value += digit
  console.log('Digit pressed:', digit)
}

const handleCall = (number: string) => {
  isCalling.value = true
  console.log('Calling:', number)
  // Make actual call
}
</script>
```

## Props

| Prop        | Type      | Default | Description                             |
| ----------- | --------- | ------- | --------------------------------------- |
| `isCalling` | `boolean` | `false` | Whether a call is currently in progress |

## Emits

| Event   | Payload          | Description                             |
| ------- | ---------------- | --------------------------------------- |
| `digit` | `digit: string`  | Emitted when a digit button is clicked  |
| `call`  | `number: string` | Emitted when the call button is clicked |

## Slots

None - This component is self-contained.

## Styling

### CSS Variables

The component uses CSS custom properties for theming:

```css
.dialpad {
  --dialpad-bg: #ffffff;
  --dialpad-border: #e5e7eb;
  --dialpad-button-bg: #ffffff;
  --dialpad-button-border: #e5e7eb;
  --dialpad-button-hover: #f3f4f6;
  --dialpad-button-active: #e5e7eb;
  --dialpad-input-bg: #ffffff;
  --dialpad-input-border: #e5e7eb;
  --dialpad-input-focus: #3b82f6;
  --dialpad-call-bg: #10b981;
  --dialpad-call-hover: #059669;
  --dialpad-backspace-color: #6b7280;
  --dialpad-backspace-hover: #ef4444;
}
```

### Button Layout

The dial pad follows the standard telephone keypad layout:

```
  1  2  3
  4  5  6
  7  8  9
  *  0  #
```

### Input Display

The input field displays the current number being dialed:

```html
<input
  v-model="number"
  type="tel"
  class="dialpad-input"
  placeholder="Enter number"
  aria-label="Phone number"
  autocomplete="tel"
/>
```

## Examples

### Basic Dialpad with Number Display

```vue
<template>
  <div class="call-interface">
    <div class="number-display">
      {{ currentNumber || 'Enter number' }}
    </div>

    <Dialpad @digit="handleDigit" @call="handleCall" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Dialpad from '@/components/Dialpad.vue'

const currentNumber = ref('')

const handleDigit = (digit: string) => {
  currentNumber.value += digit
}

const handleCall = (number: string) => {
  alert(`Calling: ${number}`)
  currentNumber.value = ''
}
</script>

<style scoped>
.call-interface {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.number-display {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 1rem;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

### Integrated with Call Controls

```vue
<template>
  <div class="softphone-interface">
    <Dialpad :is-calling="isCallActive" @digit="handleDigit" @call="makeCall" />

    <CallControls
      :current-call="currentCall"
      :incoming-call="incomingCall"
      :is-calling="isCalling"
      @answer="answerCall"
      @reject="rejectCall"
      @end="endCall"
      @mute="toggleMute"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Dialpad from '@/components/Dialpad.vue'
import CallControls from '@/components/CallControls.vue'
import type { CallSession } from '@/types'

const dialedNumber = ref('')
const isCallActive = ref(false)
const isCalling = ref(false)
const currentCall = ref<CallSession | null>(null)
const incomingCall = ref<CallSession | null>(null)

const handleDigit = (digit: string) => {
  dialedNumber.value += digit
}

const makeCall = (number: string) => {
  if (number) {
    isCalling.value = true
    // Implement actual call logic
  }
}

const answerCall = () => {
  if (incomingCall.value) {
    currentCall.value = incomingCall.value
    incomingCall.value = null
    isCallActive.value = true
  }
}

const rejectCall = () => {
  incomingCall.value = null
}

const endCall = () => {
  currentCall.value = null
  isCallActive.value = false
  isCalling.value = false
  dialedNumber.value = ''
}

const toggleMute = () => {
  // Implement mute logic
}
</script>
```

### Custom Theme Integration

```vue
<template>
  <Dialpad @digit="handleDigit" @call="handleCall" class="custom-dialpad" />
</template>

<script setup lang="ts">
import Dialpad from '@/components/Dialpad.vue'

const handleDigit = (digit: string) => {
  console.log('Digit:', digit)
}

const handleCall = (number: string) => {
  console.log('Call:', number)
}
</script>

<style>
.custom-dialpad {
  --dialpad-bg: #1e293b;
  --dialpad-border: #334155;
  --dialpad-button-bg: #334155;
  --dialpad-button-border: #475569;
  --dialpad-button-hover: #475569;
  --dialpad-button-active: #64748b;
  --dialpad-input-bg: #334155;
  --dialpad-input-border: #475569;
  --dialpad-input-focus: #3b82f6;
  --dialpad-call-bg: #dc2626;
  --dialpad-call-hover: #b91c1c;
  --dialpad-backspace-color: #94a3b8;
  --dialpad-backspace-hover: #ef4444;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .custom-dialpad {
    --dialpad-bg: #0f172a;
    --dialpad-border: #1e3a5f;
  }
}
</style>
```

## Accessibility

### ARIA Attributes

The component implements comprehensive ARIA support:

```html
<div class="dialpad" role="group" aria-label="Dial pad">
  <input
    v-model="number"
    type="tel"
    class="dialpad-input"
    data-testid="dialpad-input"
    placeholder="Enter number"
    aria-label="Phone number"
    autocomplete="tel"
  />

  <button
    v-for="button in buttons"
    :key="button.digit"
    class="dialpad-button"
    :data-testid="`dtmf-${button.digit}`"
    :aria-label="`${button.digit}${button.letters ? ' ' + button.letters : ''}`"
    @click="handleDigit(button.digit)"
  >
    <span class="digit" aria-hidden="true">{{ button.digit }}</span>
    <span class="letters" aria-hidden="true">{{ button.letters }}</span>
  </button>
</div>
```

### Keyboard Navigation

- **Number keys**: 0-9, \*, # - Input digits directly
- **Enter**: Triggers call action if number is entered
- **Backspace/Delete**: Removes last digit
- **Tab**: Navigates through buttons in order

### Screen Reader Support

- Each button has descriptive labels including associated letters
- Input field has proper autocomplete and label
- Group role for logical structure

## Keyboard Support

### Direct Input

Users can type directly using their keyboard:

```typescript
// The input field accepts direct keyboard input
const handleDigit = (digit: string) => {
  console.log('Digit entered:', digit)
}
```

### Keyboard Events

```typescript
// Available keyboard interactions:
// - Number keys: 0-9, *, #
// - Backspace: Remove last digit
// - Enter: Call action
// - Tab: Navigate buttons
```

## Performance Considerations

### Optimization Techniques

- **Virtual DOM**: Efficient re-rendering of only changed buttons
- **Event Delegation**: Single event handler for all buttons
- **CSS Transitions**: Hardware-accelerated animations
- **Minimal State**: Only maintains the current number state

### Usage Guidelines

1. **Batch Updates**: For multiple operations, update the number state efficiently
2. **Memory Management**: Clear number when call ends to prevent memory leaks
3. **Responsive Considerations**: Use appropriate viewport units for mobile devices

## Testing

### Unit Tests

```typescript
import { mount } from '@vue/test-utils'
import Dialpad from '@/components/Dialpad.vue'

describe('Dialpad', () => {
  it('renders all dial buttons correctly', () => {
    const wrapper = mount(Dialpad)

    const buttons = wrapper.findAll('.dialpad-button')
    expect(buttons.length).toBe(12) // 1-9, *, 0, #

    // Check specific buttons
    expect(buttons[0].text()).toBe('1')
    expect(buttons[9].text()).toBe('*')
    expect(buttons[10].text()).toBe('0')
  })

  it('emits digit event when button clicked', async () => {
    const wrapper = mount(Dialpad)
    const button = wrapper.find('[data-testid="dtmf-5"]')

    await button.trigger('click')

    expect(wrapper.emitted('digit')).toBeTruthy()
    expect(wrapper.emitted('digit')[0]).toEqual(['5'])
  })

  it('emits call event when call button clicked', async () => {
    const wrapper = mount(Dialpad, {
      props: {
        isCalling: false,
      },
    })

    const callButton = wrapper.find('[data-testid="call-button"]')
    await callButton.trigger('click')

    expect(wrapper.emitted('call')).toBeTruthy()
  })

  it('disables call button when no number entered', () => {
    const wrapper = mount(Dialpad)
    const callButton = wrapper.find('[data-testid="call-button"]')

    expect(callButton.attributes('disabled')).toBeDefined()
  })

  it('supports direct keyboard input', async () => {
    const wrapper = mount(Dialpad)
    const input = wrapper.find('.dialpad-input')

    await input.setValue('123')

    const emittedDigit = wrapper.emitted('digit')
    expect(emittedDigit.length).toBeGreaterThan(0)
  })
})
```

### Integration Tests

```typescript
describe('Dialpad Integration', () => {
  it('builds number sequence correctly', async () => {
    const wrapper = mount(Dialpad)
    const digits = ['1', '2', '3', '4', '5']

    for (const digit of digits) {
      const button = wrapper.find(`[data-testid="dtmf-${digit}"]`)
      await button.trigger('click')
    }

    const input = wrapper.find('.dialpad-input')
    expect(input.element.value).toBe('12345')
  })

  it('handles backspace correctly', async () => {
    const wrapper = mount(Dialpad)
    const input = wrapper.find('.dialpad-input')

    // Simulate typing and backspace
    await input.setValue('123')
    await input.setValue('12') // Backspace

    expect(input.element.value).toBe('12')
  })
})
```

## Common Issues and Solutions

### Issue: Call button not working

**Solution**: Ensure the number field has content and call button is enabled:

```typescript
// Check that number is not empty
const canCall = computed(() => dialedNumber.value.length > 0)

// In template:
<Dialpad
  :is-calling="isCalling"
  @call="handleCall"
/>
```

### Issue: Keyboard input not working

**Solution**: Verify the input field is properly configured:

```vue
<template>
  <input v-model="number" type="tel" autocomplete="tel" @input="handleInput" />
</template>
```

### Issue: Mobile responsiveness issues

**Solution**: Use appropriate viewport and touch targets:

```css
@media (max-width: 360px) {
  .dialpad-button {
    min-height: 44px;
    min-width: 44px;
  }
}

@media (min-width: 640px) {
  .dialpad {
    max-width: 360px;
  }
}
```

### Issue: Accessibility not working

**Solution**: Ensure ARIA attributes are properly configured:

```html
<button :aria-label="`${digit} ${letters || ''}`" aria-pressed="false" @click="handleDigit(digit)">
  {{ digit }}
</button>
```

## Related Components

- [CallControls](./CallControls.md) - For call management functionality
- [ActionButton](./ActionButton.md) - For consistent button styling
- [MobileNavigation](./MobileNavigation.md) - For mobile UI patterns

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile**: Full support with touch optimization

## Contributing

When contributing to this component:

1. Follow the existing TypeScript and Vue 3 patterns
2. Ensure all buttons have proper ARIA labels
3. Test with both touch and keyboard input
4. Verify responsive design on various screen sizes
5. Update this documentation with any changes

### Development Tips

- Use `setNumberForTest` method for testing purposes
- Test both single and multi-digit sequences
- Verify keyboard and mouse interactions
- Check accessibility with screen readers
