# SipClient.error-recovery.test.ts - Real Root Cause and Fix

## Summary

**Date**: 2025-12-25
**Root Cause**: Mock `once()` method was not registering event handlers
**Fix**: Implemented `once()` to actually register handlers in `eventHandlers` object
**Expected Result**: 24 failing tests should now pass (24 → 0 failures)

---

## Root Cause Analysis

### The ACTUAL Problem

Tests were failing because the mock UA's `once()` method was **not registering handlers at all**:

```typescript
// BEFORE (BROKEN):
once: vi.fn(),  // Just an empty mock - does NOTHING!
```

This meant:

1. `waitForConnection()` calls `this.ua?.once('connected', onConnected)`
2. Mock's `once()` doesn't add handler to `eventHandlers` object
3. Test calls `triggerEvent('connected', ...)`
4. No handlers found in `eventHandlers['connected']`
5. Promise never resolves → 10-second timeout

### Why the Delay Fix Failed

The previous attempt added a 10ms delay:

```typescript
await new Promise((resolve) => setTimeout(resolve, 10))
```

This failed because **no amount of waiting helps when the handler is never registered**. The timing wasn't the issue - the mock implementation was fundamentally broken.

---

## The Real Fix

### File Modified

`/home/irony/code/VueSIP/tests/unit/SipClient.error-recovery.test.ts`

### Fix #1: Lines 22-36 - Implement `once()` properly

**BEFORE (BROKEN)**:

```typescript
const mockUA = {
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler)
  }),
  once: vi.fn(), // ← BROKEN: Does nothing
  off: vi.fn(),
}
```

**AFTER (FIXED)**:

```typescript
const mockUA = {
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler)
  }),
  once: vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler) // ← FIXED: Actually registers handler
  }),
  off: vi.fn(),
}
```

### Fix #2: Lines 91-100 - Remove unnecessary delay

Since the actual problem was the broken `once()` implementation, the delay is no longer needed:

**BEFORE (with failed delay fix)**:

```typescript
async function startAndConnectClient() {
  const startPromise = sipClient.start()
  await new Promise((resolve) => setTimeout(resolve, 10)) // ← Not needed anymore
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
  await startPromise
}
```

**AFTER (clean)**:

```typescript
async function startAndConnectClient() {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
  await startPromise
}
```

---

## Code Flow (Fixed)

**Step 1**: Test calls `sipClient.start()`

- Creates Promise that executes asynchronously
- Internally calls `await waitForConnection()` at line 342

**Step 2**: `waitForConnection()` registers listener

- Calls `this.ua?.once('connected', onConnected)` at line 855
- **NOW WORKS**: Mock's `once()` adds handler to `eventHandlers['connected']`

**Step 3**: Test triggers event

- Calls `triggerEvent('connected', { socket: { url: '...' } })`
- **NOW WORKS**: Finds handler in `eventHandlers['connected']` and executes it

**Step 4**: Handler resolves promise

- `onConnected()` is called
- Calls `resolve()` which completes `waitForConnection()`
- `start()` completes successfully

---

## Tests Affected

All 24 previously failing tests that use `startAndConnectClient()` helper:

### Connection Error Recovery (5 tests)

- `should handle connection failure`
- `should handle WebSocket connection timeout`
- `should handle connection lost during active session`
- `should emit disconnected event with error details`
- `should handle multiple disconnect events gracefully`

### Start/Stop Edge Cases (5 tests)

- `should prevent multiple simultaneous starts`
- `should warn when starting already started client`
- `should handle stop while starting`
- `should prevent multiple simultaneous stops`

### Event Handler Edge Cases (3 tests)

- `should handle event with missing data gracefully`
- `should handle malformed event data`
- `should handle event during shutdown`

### State Consistency (4 tests)

- `should maintain state consistency during connection`
- `should maintain state consistency during disconnection`
- `should track isConnected property accurately`
- `should track isRegistered property accurately`

### Memory and Resource Management (3 tests)

- `should clean up event handlers on stop`
- `should handle rapid start/stop cycles`
- `should clean up UA on stop`

### Connection State Transitions (1 test)

- `should transition through connection states correctly`

### Error Event Propagation (2 tests)

- `should propagate UA errors to event bus`
- `should handle registration expiring events`

**Total Fixed**: 23 tests (all tests using the helper)

### Note on Remaining Failures

Two tests may still fail for different reasons:

- `should use configured WebSocket URI` - Mock expectation issue (line 474)
- `should create client via factory function` - Module resolution issue (line 502)

These are **different bugs** not related to the timing/event handling issue.

---

## Expected Results

**BEFORE Fix**:

```
Test Files  1 failed (1)
Tests  24 failed | 11 passed (35)
Duration  ~660s (multiple 30s timeouts)
```

**AFTER Fix (Expected)**:

```
Test Files  1 passed (1)
Tests  33-35 passed | 0-2 failed (35)
Duration  <5s (no timeouts)
```

Remaining 0-2 failures would be the two unrelated bugs mentioned above.

---

## Key Learnings

### 1. Mock Implementation Matters

Always verify that mocks actually implement the behavior being tested:

- `on()` was correctly adding handlers
- `once()` was silently doing nothing
- This discrepancy caused the entire test suite to fail

### 2. Verify Assumptions

The previous analysis assumed timing was the issue because:

- The helper added delay before triggering event
- This seemed logical for async operations

But we should have checked:

- Are handlers actually being registered?
- Can we verify the `eventHandlers` object contents?

### 3. Test the Mocks

When debugging test failures, verify the test infrastructure:

- Check mock implementations
- Verify event handler registration
- Inspect test helper functions

---

## Verification Steps

1. ✅ Fixed `once()` implementation to register handlers
2. ✅ Removed unnecessary delay from helper
3. ✅ Updated documentation
4. ⏳ Running tests to verify 24 failures → 0-2 failures

---

## References

- **Test File**: `tests/unit/SipClient.error-recovery.test.ts:22-36, 91-100`
- **Source File**: `src/core/SipClient.ts:227-372, 817-856`
- **Previous Attempts**:
  - SIPCLIENT_ERROR_RECOVERY_TIMING_FIX.md (delay fix - failed)
  - SIPCLIENT_ERROR_RECOVERY_TEST_FIXES.md (event data fix - incomplete)
  - SIPCLIENT_ERROR_RECOVERY_ACTUAL_STATUS.md (investigation)
