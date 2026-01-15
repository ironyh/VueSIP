# Click-to-Call (Example)

This example shows how to embed the `useClickToCall` widget in your app. It supports both mock mode (no SIP required) and real SIP/WebRTC.

## Mock Mode (No SIP Required)

```ts
import { useClickToCall } from 'vuesip'

const { isVisible, callState, callDuration, remoteNumber, call, hangup, answer } = useClickToCall({
  mockMode: true,
  defaultNumber: '+15551234567',
  onCallStart: (n) => console.log('Calling', n),
  onCallEnd: (secs) => console.log('Ended after', secs, 'seconds'),
})

// Start a call to defaultNumber
await call()
```

## Real SIP/WebRTC

```ts
import { useClickToCall } from 'vuesip'

const sipConfig = {
  wsUri: 'wss://sip.example.com',
  sipUri: 'sip:user@example.com',
  password: 'secret',
  displayName: 'Agent',
}

const ctc = useClickToCall({
  mockMode: false,
  sipConfig,
  defaultNumber: '+15551234567',
  onError: (e) => console.error('Click-to-Call error:', e.message),
})

// Connects as needed and makes the call
await ctc.call()
```

## UI Integration

Bind `cssVars` to your container and use the widget state to show controls.

```vue
<template>
  <div class="ctc" :style="cssVars">
    <div v-if="callState === 'idle'">
      <button @click="call()">Call</button>
    </div>
    <div v-else>
      <div>{{ remoteNumber || 'Unknown' }}</div>
      <div v-if="callState === 'active'">{{ callDuration }}s</div>
      <button v-if="callState === 'ringing'" @click="answer()">Answer</button>
      <button @click="hangup()">Hang up</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClickToCall } from 'vuesip'
const { cssVars, callState, callDuration, remoteNumber, call, answer, hangup } = useClickToCall({
  mockMode: true,
})
</script>
```

See also: the full [Click-to-Call Guide](/guide/click-to-call) for options, callbacks, and styling.

## Live Widget Mount (Playground/StackBlitz)

Drop-in Vue SFC you can paste into a playground for a quick demo.

```vue
<!-- ClickToCallWidget.vue -->
<template>
  <div class="ctc" :style="cssVars">
    <header class="ctc__header">Click to Call</header>

    <div class="ctc__status">
      <strong>Status:</strong> {{ callState }}
      <span v-if="callState === 'active'">• {{ callDuration }}s</span>
    </div>

    <div class="ctc__remote" v-if="remoteNumber"><strong>Remote:</strong> {{ remoteNumber }}</div>

    <div class="ctc__controls">
      <button v-if="callState === 'idle'" @click="call()">Call</button>
      <button v-else-if="callState === 'ringing'" @click="answer()">Answer</button>
      <button v-else @click="hangup()">Hang up</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClickToCall } from 'vuesip'
const { cssVars, callState, callDuration, remoteNumber, call, answer, hangup } = useClickToCall({
  mockMode: true,
  defaultNumber: '+15551234567',
})
</script>

<style scoped>
.ctc {
  width: 320px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: var(--ctc-shadow);
  background: var(--ctc-bg);
  color: var(--ctc-text);
}
.ctc__header {
  font-weight: 600;
  margin-bottom: 8px;
}
.ctc__status {
  margin-bottom: 8px;
  color: var(--ctc-text-secondary);
}
.ctc__controls button {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ctc-primary);
  color: #fff;
  border: none;
  cursor: pointer;
}
.ctc__controls button:hover {
  background: var(--ctc-primary-hover);
}
</style>
```

Mount it as your root for a quick demo:

```ts
// main.ts
import { createApp } from 'vue'
import ClickToCallWidget from './ClickToCallWidget.vue'

createApp(ClickToCallWidget).mount('#app')
```

In a real app, import `useClickToCall` into your components and adapt the UI as needed.
