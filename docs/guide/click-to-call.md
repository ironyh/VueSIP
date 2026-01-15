---
title: Click-to-Call
---

# Click-to-Call

Embed a compact, draggable calling widget in any page using `useClickToCall`. It supports mock mode for demos and a real SIP/WebRTC mode for production.

## Quick Start

```ts
import { useClickToCall } from '@/composables/useClickToCall'

const { isVisible, isConnected, callState, remoteNumber, callDuration, call, hangup, answer } =
  useClickToCall({
    // Use mock mode by default for demos
    mockMode: true,
    defaultNumber: '+15551234567',
    onCallStart: (num) => console.log('Calling', num),
    onCallEnd: (secs) => console.log('Ended after', secs, 'seconds'),
  })

// Start an outbound call
await call()
```

## Real SIP Mode

Enable real SIP/WebRTC with your SIP credentials. When `mockMode` is `false` and `sipConfig` is provided, the widget uses the production SIP stack internally.

```ts
const ctc = useClickToCall({
  mockMode: false,
  sipConfig: {
    wsUri: 'wss://sip.example.com',
    sipUri: 'sip:user@example.com',
    password: 'secret',
    displayName: 'Support Agent', // optional
  },
  defaultNumber: '+15551234567',
})

await ctc.call() // calls defaultNumber
```

Under the hood, the widget bridges `useSipClient` + `useCallSession`. The state it exposes remains stable across mock and real modes.

## State & Callbacks

- `isConnected`: read-only ref indicating SIP connectivity.
- `callState`: read-only ref, normalized values: `idle`, `calling`, `ringing`, `active`, `held`, `ended`.
- `remoteNumber`: the remote identity. In real SIP mode, inbound calls populate this from the session (display name if present, otherwise SIP URI) when the state becomes `ringing`.
- `callDuration`: seconds since answer while the call is active.
- `onCallStart(number)`: fired just before placing an outbound call.
- `onCallEnd(durationSeconds)`: fired when a call attempt ends (including missed/rejected/failed). Duration will be `0` if the call never reached active.

## Appearance & Position

```ts
const { cssVars, position, resetPosition } = useClickToCall({
  position: 'bottom-right', // or bottom-left | top-right | top-left
  offsetX: 20,
  offsetY: 20,
  size: 'medium', // small | medium | large
  theme: 'light', // light | dark | auto
  primaryColor: '#4CAF50',
  persistPosition: true,
})
```

Use `cssVars` to style your widget container. When `persistPosition` is enabled, the widget saves its position to `localStorage` and restores it across reloads.

## Error Handling

Pass `onError` to surface errors:

```ts
const { call } = useClickToCall({
  mockMode: false,
  sipConfig,
  onError: (err) => console.error('Click-to-Call error:', err.message),
})
```

If no number is supplied and `defaultNumber` is empty, `call()` throws with a descriptive error.

## Notes

- Real mode maps internal SIP states to stable widget states to keep UI logic simple.
- Unsupported controls such as hold/unhold/DTMF are available via other composables like `useCallSession` and `useCallControls`.
- For full examples, see the Examples section and the softphone templates.
