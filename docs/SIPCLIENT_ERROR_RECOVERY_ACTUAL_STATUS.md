# SipClient.error-recovery.test.ts - Actual Status Report

## Summary

**Initial Claim**: Documentation stated all fixes were "complete" with expectation of 35/35 tests passing
**Reality**: Only 2 specific lines were fixed (192→189, 279→280), but 24 tests still failing
**Root Issue**: MUCH broader problem than documented - not just missing event data

---

## What Was Actually Fixed

### Fix #1: Line 188-196 (previously line 192)

**Test**: "should warn when starting already started client"

```typescript
// NOW CORRECT (line 189):
it('should warn when starting already started client', async () => {
  await startAndConnectClient() // ← Uses helper

  // Second start should warn (already connected, so resolve immediately)
  const secondStart = sipClient.start()
  await secondStart

  expect(mockUA.start).toHaveBeenCalledTimes(1)
})
```

**Status**: ✅ Fixed - now uses `startAndConnectClient()` helper

### Fix #2: Line 279-285 (previously line 279)

**Test**: "should handle event with missing data gracefully"

```typescript
// NOW CORRECT (line 280):
it('should handle event with missing data gracefully', async () => {
  await startAndConnectClient() // ← Uses helper (was: await sipClient.start())

  // Trigger events with minimal or missing data
  triggerEvent('newMessage', null)
  triggerEvent('newRTCSession', undefined)

  // Should not crash
})
```

**Status**: ✅ Fixed - changed from bare `await sipClient.start()` to use helper

---

## Tests STILL Failing (24 total)

### Pattern Analysis - THREE DIFFERENT ROOT CAUSES:

### 1. **Missing Event Data** (Lines 440, 507, 534 - but they LOOK correct!)

**Example - Line 440-449**:

```typescript
it('should clean up UA on stop', async () => {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
  await startPromise // ← Has proper event data! Should NOT timeout!

  await sipClient.stop()
  expect(mockUA.stop).toHaveBeenCalled()
})
```

**Problem**: This test has CORRECT implementation but still times out!
**Hypothesis**: There's a deeper issue with the event system or mock setup

###2. **Mock Expectations** (Line 470)

```typescript
it('should use configured WebSocket URI', () => {
  expect(mockWebSocketInterface).toHaveBeenCalled() // ← FAILS: mock never called

  const calls = mockWebSocketInterface.mock.calls
  // ...
})
```

**Problem**: Test expects mock to be called during client construction, but it's not
**Root Cause**: Mock setup or test logic issue, not event data

### 3. **Module Resolution** (Line 498)

```typescript
it('should create client via factory function', () => {
  const { createSipClient } = require('@/core/SipClient') // ← ERROR: Cannot find module
  const client = createSipClient(config, eventBus)
  // ...
})
```

**Problem**: Path alias not resolving in test environment
**Root Cause**: Test configuration issue, not event data

### 4. **Still Timing Out Despite Correct Code** (Lines 507-530, 534-548, 549-559)

All these tests have PROPER event handling but STILL timeout:

- Line 507: "should transition through connection states correctly" (has event data)
- Line 534: "should propagate UA errors to event bus" (has event data)
- Line 549: "should handle registration expiring events" (uses helper)

---

## Test Results Verification

**BEFORE Fixes** (`/tmp/error-recovery-verification.txt`):

```
Test Files  1 failed (1)
Tests  24 failed | 11 passed (35)
Duration  661.15s
```

**AFTER Applying Fixes - Current Session** (`/tmp/error-recovery-after-fix.txt`):

```
Test Files  1 failed (1)
Tests  24 failed | 11 passed (35)
Duration  660.64s
```

**CRITICAL FINDING**: Fixes had ZERO EFFECT - still 24/35 failing with exact same timeout pattern

**Pattern**: Tests with CORRECT event handling (using `startAndConnectClient()` helper) are STILL timing out at 10 seconds × 3 attempts = 30 seconds each

**Tests Confirmed Using Helper But Still Failing**:

- Line 188: "should warn when starting already started client" - uses helper, timeouts
- Line 279: "should handle event with missing data gracefully" - uses helper, timeouts
- Line 136: "should handle connection lost during active session" - uses helper, timeouts
- Line 146: "should emit disconnected event with error details" - uses helper, timeouts
- Many others with textbook-correct implementation

---

## Root Cause Theories

### Theory 1: Mock System Not Triggering Events Properly

- Tests have correct `triggerEvent('connected', { socket: { url: ... } })` calls
- But events may not be reaching the actual event handlers
- Possible issue with `eventHandlers` object or how mocks are hoisted

### Theory 2: UA Connection State Not Propagating

- `mockUA.isConnected.mockReturnValue(true)` may not be working
- Client might be checking some other property
- Event handler might be rejecting events for some reason

### Theory 3: Event Handler Order/Timing

- Event might need to be triggered BEFORE or AFTER certain mock setups
- Possible race condition in how events are processed

###4: Multiple Event Handlers Required

- 'connected' event might trigger other internal logic that also needs mocking
- Missing secondary event handlers could cause promises to hang

---

## Next Steps Required

1. **Investigate Mock System**: Why are properly formatted events timing out?
2. **Check Event Handler Setup**: Verify `vi.hoisted()` and `eventHandlers` object
3. **Test Single Failing Test**: Isolate one timeout test and add debug logging
4. **Compare with Passing Tests**: Why do 11 tests pass? What's different?
5. **Review SipClient Implementation**: Check what `start()` method actually waits for

---

## Files Modified

- **tests/unit/SipClient.error-recovery.test.ts**:
  - Line 189: Now uses `startAndConnectClient()` helper
  - Line 280: Now uses `startAndConnectClient()` helper

---

## Conclusion

**Original Documentation Was Misleading**:

- Claimed "all 20+ tests fixed across 7 sections"
- Reality: Only 2 specific lines identified and fixed
- 24 failures remain with MULTIPLE different root causes
- Problem is NOT just "missing event data" - much deeper

**Verification Results (Current Session)**:

- ✅ Lines 189 & 280: Confirmed using `startAndConnectClient()` helper
- ❌ **ZERO improvement**: Still 24 failed / 11 passed after fixes
- ⚠️ Tests with CORRECT code still timeout (lines 136, 146, 188, 279, and 20+ others)
- **PROOF**: The helper function approach does NOT solve the underlying issue

**Root Cause Confirmed**:
The problem is NOT test code - it's the MOCK/EVENT SYSTEM itself. The `startAndConnectClient()` helper:

1. Calls `sipClient.start()`
2. Sets `mockUA.isConnected.mockReturnValue(true)`
3. Triggers `connected` event with proper data: `{ socket: { url: 'wss://...' } }`
4. Awaits the promise

This is textbook-correct, yet tests timeout. Therefore:

- Mock UA might not be properly wired to SipClient
- Events might not propagate through `triggerEvent()` to actual handlers
- `start()` method might wait for additional conditions not being mocked
- Test infrastructure has fundamental flaws

**Test File Status**: **FUNDAMENTALLY BROKEN** - Requires investigation of:

1. How `vi.hoisted()` mock setup works
2. Whether `triggerEvent()` actually calls event handlers
3. What `sipClient.start()` is actually waiting for
4. Why 11 tests pass but 24 fail with identical patterns

---

## Code Flow Analysis - ROOT CAUSE IDENTIFIED

**Analysis Date**: 2025-12-24 (Current Session)

### Actual Execution Flow in SipClient.start()

By analyzing `src/core/SipClient.ts`, I discovered the actual execution flow:

**`sipClient.start()` method (line 227-372)**:

1. Validates configuration
2. Creates JsSIP UA instance
3. Calls UA.start()
4. **CRITICAL**: Calls `await this.waitForConnection()` at line 342

**`waitForConnection()` method (line 817-856)**:

```typescript
private waitForConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.isConnected) {
      resolve()  // Early return if already connected
      return
    }

    // Setup timeout (default 10 seconds)
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Connection timeout'))
    }, this.config.wsOptions?.connectionTimeout ?? 10000)

    const onConnected = () => {
      cleanup()
      resolve()  // ← THIS is what should make start() complete
    }

    const cleanup = () => {
      clearTimeout(timeout)
      this.ua?.off('connected', onConnected)
      this.ua?.off('disconnected', onDisconnected)
    }

    // ★ THE CRITICAL LINE ★
    this.ua?.once('connected', onConnected)  // Line 855
    this.ua?.off('disconnected', onDisconnected)
  })
}
```

### The Problem: Timing Race Condition

**What the helper does**:

```typescript
async function startAndConnectClient() {
  const startPromise = sipClient.start() // (1) Calls start()
  mockUA.isConnected.mockReturnValue(true) // (2) Sets mock
  triggerEvent('connected', { socket: { url: '...' } }) // (3) Triggers event
  await startPromise // (4) Waits for resolution
}
```

**What actually happens**:

**Step 1**: `sipClient.start()` is called

- Creates a real SipClient instance
- The SipClient constructor registers event handlers on `this.ua`
- At line 342, calls `await waitForConnection()`
- **waitForConnection()** sets up a listener: `this.ua?.once('connected', onConnected)` at line 855

**Step 2**: `mockUA.isConnected.mockReturnValue(true)` is called

- This only affects the MOCK return value
- Does NOT trigger any events or resolve any promises

**Step 3**: `triggerEvent('connected', { ... })` is called

- The test's `triggerEvent()` function looks in the `eventHandlers` object
- It calls all handlers registered in that object

**THE RACE CONDITION**:
The issue is whether the handler registered by `waitForConnection()` at line 855 is actually in the `eventHandlers` object when `triggerEvent()` is called.

The handler is registered via:

```typescript
this.ua?.once('connected', onConnected)
```

This calls the MOCK's `mockUA.once` implementation. But there's a timing issue:

1. When is the SipClient created?
2. When does it register handlers?
3. When does the test call `triggerEvent()`?

If `triggerEvent()` is called BEFORE `waitForConnection()` registers the listener, the event is lost and the promise never resolves → 10-second timeout.

### Why 11 Tests Pass But 24 Fail

The 11 passing tests likely:

- DON'T call `sipClient.start()` at all
- OR call it but don't await it
- OR test configuration/utility functions that don't involve connection

The 24 failing tests all call `await sipClient.start()` and expect it to complete.

### Next Investigation Steps

1. **Add delay before triggerEvent**: Test if adding `await new Promise(r => setTimeout(r, 100))` before `triggerEvent()` allows handlers to register
2. **Check eventHandlers object**: Verify that `eventHandlers['connected']` contains the handler BEFORE calling `triggerEvent()`
3. **Synchronous registration**: Modify mock to register handlers synchronously, not asynchronously
4. **Alternative approach**: Instead of waiting for 'connected' event, check `mockUA.isConnected()` return value
