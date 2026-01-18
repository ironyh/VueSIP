# SIP Mock

Mock SIP client for tutorials, tests, and demos without a real SIP server.

## Usage

```ts
import { useSipMock } from 'vuesip'

const mock = useSipMock({
  connectDelay: 300,
  autoAnswer: true,
  generateIncomingCalls: true,
  incomingCallInterval: 20000,
})

await mock.connect()

// Make or receive calls
await mock.call('5551234', 'Demo')
// ...
await mock.hangup()
```

## Options

- `autoAnswer`: automatically answer inbound calls.
- `generateIncomingCalls`: periodically simulate inbound calls.
- `incomingCallInterval`: ms interval for generated calls.
- `simulateQualityEvents`: periodically simulate call quality drops.

## API

- Connection: `connect`, `disconnect`.
- Calls: `call`, `answer`, `hangup`, `hold`, `unhold`, `sendDTMF`.
- Simulation: `simulateIncomingCall`, `simulateCallQualityDrop`, `simulateNetworkIssue`.
- Config: `configure(options)` to update behavior at runtime.
