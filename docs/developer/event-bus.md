## Event Flow & Typed Event Bus

This guide explains how VueSIP emits and consumes events using a type-safe EventBus, and how to subscribe from composables and apps.

### Concepts

- `EventBus` (runtime): Core bus in `src/core/EventBus.ts` providing `on/once/off/emit/emitSync` with buffering and priorities.
- `TypedEventBus` (types): Narrowed interface exposing `on/off/emit` with event name → payload mapping.
- `EventMap` (types): Central map of event names (e.g., `sip:connected`, `call:confirmed`) to payload types.

### Producing Events

- SipClient emits SIP lifecycle events:

```ts
eventBus.emitSync('sip:connected', { type: 'sip:connected', timestamp: new Date(), transport })
```

- CallSession emits call lifecycle and media events:

```ts
this.emitCallEvent('call:confirmed')
this.emitCallEvent('call:stream_added', { type: 'remote', stream })
```

### Consuming Events (Typed)

From useSipClient:

```ts
const { getEventBus } = useSipClient()
const bus = getEventBus() // TypedEventBus<EventMap>
const id = bus.on('sip:connected', () => {
  /* ... */
})
bus.off('sip:connected', id)
```

From useCallSession (typed bridge):

```ts
// Convert unknown emitter to typed facade
import { toEventBus } from '@/utils/eventBus'
type Bus = TypedEventBus<EventMap & CallSessionEventMap>
const bus = toEventBus<Bus>(session.eventBus)
const id = bus?.on('call:state_changed', (e) => {
  /* ... */
})
```

### Testing Patterns

- Unit tests simulate underlying JsSIP events and assert emitted events and flags (see `tests/unit/core/call-session-events.test.ts`).
- E2E test mode toggles via `window.__emitSipEvent` allows `SipClient` to emit `sip:connected` without a real UA.

### Tips

- Prefer `emitSync` for fire-and-forget UI updates.
- Use `once` for one-shot events (e.g., `call:confirmed`).
- Clean up with `off` IDs to prevent leaks; `EventBus.removeAllListeners()` is available for teardown.
