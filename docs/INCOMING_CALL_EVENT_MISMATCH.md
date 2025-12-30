# Incoming Call Event Name Mismatch

## Summary

**Status**: Test bug - listening for wrong event name
**Impact**: 3 incoming call tests failing
**Solution**: Update test to use correct event name

---

## Root Cause

The SipClient emits `'sip:new_session'` for all new RTC sessions (both incoming and outgoing), but the test is listening for `'sip:newRTCSession'`.

### Event Emission (SipClient.ts:743)

```typescript
this.ua.on('newRTCSession', (e: any) => {
  logger.debug('New RTC session:', e)

  const rtcSession = e.session
  const callId = rtcSession.id || this.generateCallId()

  // Track incoming calls
  if (e.originator === 'remote') {
    logger.info('Incoming call', { callId })
    // ... create CallSession for incoming call ...
  }

  this.eventBus.emitSync('sip:new_session', {
    // ✅ Event name: sip:new_session
    type: 'sip:new_session',
    timestamp: new Date(),
    session: e.session,
    originator: e.originator, // ✅ Includes originator to distinguish incoming/outgoing
    request: e.request,
    callId,
  } satisfies SipNewSessionEvent)
})
```

### Test Subscription (SipClient.calls.test.ts:299)

```typescript
it('should handle incoming call', () => {
  const incomingEvents: any[] = []
  eventBus.on('sip:newRTCSession', (e) => incomingEvents.push(e)) // ❌ Wrong event name

  triggerEvent('newRTCSession', {
    originator: 'remote',
    session: mockSession,
  })

  expect(incomingEvents).toHaveLength(1) // ❌ FAILS: expected 1, got 0
  expect(incomingEvents[0].direction).toBe(CallDirection.Incoming)
  expect(incomingEvents[0].session).toBeDefined()
})
```

---

## Fix

### Location

`tests/unit/SipClient.calls.test.ts:296-309`

### Change Event Name

**From**:

```typescript
eventBus.on('sip:newRTCSession', (e) => incomingEvents.push(e))
```

**To**:

```typescript
eventBus.on('sip:new_session', (e) => incomingEvents.push(e))
```

### Updated Test

```typescript
it('should handle incoming call', () => {
  const incomingEvents: any[] = []
  eventBus.on('sip:new_session', (e) => incomingEvents.push(e)) // ✅ Correct event name

  triggerEvent('newRTCSession', {
    originator: 'remote',
    session: mockSession,
  })

  expect(incomingEvents).toHaveLength(1)
  expect(incomingEvents[0].originator).toBe('remote') // ✅ Check originator field
  expect(incomingEvents[0].session).toBeDefined()
})
```

### Note on Event Structure

The `'sip:new_session'` event includes:

- `type`: Event type string
- `timestamp`: Event timestamp
- `session`: JsSIP RTCSession object
- `originator`: `'local'` for outgoing, `'remote'` for incoming
- `request`: SIP request object
- `callId`: Call identifier

The test should check `originator === 'remote'` instead of looking for a `direction` field which doesn't exist in the event payload.

---

## All Affected Tests

1. **Line 297**: `should handle incoming call` - expects `sip:newRTCSession`, needs `sip:new_session`
2. **Line 312**: `should not emit event for outgoing call` - also uses wrong event name
3. **Line 321**: (if exists) any other incoming call tests

---

## Implementation Notes

The SipClient design emits a **single event** (`sip:new_session`) for both incoming and outgoing calls, with the `originator` field to distinguish:

- `originator: 'remote'` → Incoming call
- `originator: 'local'` → Outgoing call (initiated by us)

This is cleaner than having separate event types for incoming vs outgoing.
