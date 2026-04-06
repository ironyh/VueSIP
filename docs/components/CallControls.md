# CallControls Component

Manages call state UI for incoming calls, active calls, and the calling-in-progress state.

## Overview

`CallControls` provides a unified interface for handling all call states: incoming call notification with answer/reject, active call with duration timer, mute, and hang-up, and a calling spinner while waiting for the remote party to answer.

## Features

- 📞 Incoming call notification (answer / reject)
- 📊 Live call duration timer
- 🔇 Mute toggle
- 📵 Hang-up button
- ⏳ Calling-in-progress spinner
- ♿ ARIA roles for alerts, timers, and status
- 📱 Responsive button layout

## Basic Usage

```vue
<template>
  <CallControls
    :current-call="currentCall"
    :incoming-call="incomingCall"
    :is-calling="isCalling"
    @answer="answerCall"
    @reject="rejectCall"
    @end="endCall"
    @mute="toggleMute"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CallControls from '@/components/CallControls.vue'
import type { CallSession } from '@/types'

const currentCall = ref<CallSession | null>(null)
const incomingCall = ref<CallSession | null>(null)
const isCalling = ref(false)

const answerCall = () => {
  /* accept incoming */
}
const rejectCall = () => {
  incomingCall.value = null
}
const endCall = () => {
  currentCall.value = null
  isCalling.value = false
}
const toggleMute = () => {
  /* toggle mute */
}
</script>
```

## Props

| Prop           | Type                  | Default | Description                             |
| -------------- | --------------------- | ------- | --------------------------------------- |
| `currentCall`  | `CallSession \| null` | —       | The currently active call session       |
| `incomingCall` | `CallSession \| null` | —       | An incoming (ringing) call session      |
| `isCalling`    | `boolean`             | —       | Whether an outgoing call is in progress |

### CallSession Type

```typescript
interface CallSession {
  remoteUri: string
  remoteDisplayName?: string
  timing?: {
    answerTime?: Date
    startTime?: Date
  }
}
```

## Emits

| Event    | Payload | Description                    |
| -------- | ------- | ------------------------------ |
| `answer` | —       | Answer the incoming call       |
| `reject` | —       | Reject the incoming call       |
| `end`    | —       | End the active call            |
| `mute`   | —       | Toggle mute on the active call |

## Display States

The component renders one of three mutually exclusive states:

1. **Incoming call** (`incomingCall` is set) — shows remote party name/URI with Answer and Reject buttons.
2. **Active call** (`currentCall` is set) — shows remote party, live duration timer, Mute and End Call buttons.
3. **Calling** (`isCalling` is true) — shows a spinner with "Waiting for response" text.
4. **Idle** (all props falsy) — renders an empty container.

## Styling

### CSS Variables

```css
.call-controls {
  --controls-bg: #f9fafb;
  --btn-success-bg: #10b981;
  --btn-danger-bg: #ef4444;
  --btn-secondary-bg: #6b7280;
  --spinner-color: #3b82f6;
  --duration-color: #111827;
}
```

### Responsive

- Buttons stack vertically on screens narrower than 280px.
- Minimum touch target: 48px height, 120px width per button.

## Examples

### Combined with Dialpad

```vue
<template>
  <div class="softphone">
    <Dialpad v-if="!currentCall && !incomingCall && !isCalling" @call="makeCall" />
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
```

### Custom Theme

```vue
<style>
.call-controls {
  --controls-bg: #1e293b;
  --btn-success-bg: #22c55e;
  --btn-danger-bg: #dc2626;
  --duration-color: #f1f5f9;
}
</style>
```

## Accessibility

| Element               | Role     | Label                    |
| --------------------- | -------- | ------------------------ |
| Incoming notification | `alert`  | "Incoming Call"          |
| Call duration         | `timer`  | "Call duration MM:SS"    |
| Calling spinner       | `status` | "Calling"                |
| All buttons           | —        | Descriptive `aria-label` |

Keyboard: All buttons are focusable and activatable via Enter / Space.

## Testing

```typescript
import { mount } from '@vue/test-utils'
import CallControls from '@/components/CallControls.vue'

it('shows incoming call UI', () => {
  const wrapper = mount(CallControls, {
    props: {
      currentCall: null,
      incomingCall: { remoteUri: 'sip:100@example.com', remoteDisplayName: 'Alice' },
      isCalling: false,
    },
  })
  expect(wrapper.text()).toContain('Incoming Call')
  expect(wrapper.find('[data-testid="answer-button"]').exists()).toBe(true)
})

it('shows active call with duration', async () => {
  vi.useFakeTimers()
  const wrapper = mount(CallControls, {
    props: {
      currentCall: { remoteUri: 'sip:100@example.com', timing: { answerTime: new Date() } },
      incomingCall: null,
      isCalling: false,
    },
  })
  vi.advanceTimersByTime(5000)
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-testid="call-status"]').text()).toMatch(/\d{2}:\d{2}/)
  vi.useRealTimers()
})
```

## Related Components

- [Dialpad](./Dialpad.md) — Numeric input for originating calls
- [ActionButton](./ActionButton.md) — Consistent button styling
