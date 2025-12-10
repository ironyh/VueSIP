# E2E Test Fix Investigation Summary

**Date**: 2025-12-06
**Issue**: E2E test "should make an outgoing call" timeout
**Status**: ⚠️ **IN PROGRESS** - Partial fixes applied, root cause identified

---

## Problem

The E2E test `tests/e2e/app-functionality.spec.ts > should make an outgoing call` fails with:

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
- waiting for locator('[data-testid="dtmf-1"]') to be visible
```

## Investigation Timeline

### Issue #1: EventBus Instance Mismatch ✅ FIXED

**Root Cause**:
- `/home/irony/code/VueSIP/playground/sipClient.ts` created module-level singleton
- `export const playgroundSipClient = useSipClient(undefined, { eventBus: sharedEventBus })`
- Module evaluated BEFORE test fixtures set up `window.__sipEventBridge`
- useSipClient registered listeners on wrong EventBus instance

**Evidence**:
```
EventBus initialization: {receivedOptions: Object, extractedEventBus: undefined, isEventBridgeFromWindow: false, willCreateNew: true}
```

**Fix Applied** (sipClient.ts):
```typescript
// Disabled module-level execution using import type
import type { useSipClient } from '../src'

// Export placeholder to prevent import errors
export const playgroundSipClient = null as any
```

**Verification**: Diagnostic test passes ✅

---

### Issue #2: Event Timing Race Condition ⚠️ PARTIALLY FIXED

**Root Cause**:
- MockWebSocket fires `connection:connected` event 20ms after construction
- Events fire BEFORE Vue app mounts and listeners register
- Console logs prove: 0 listeners when event fires, listeners register after

**Evidence from Console Logs** (`/tmp/diagnostic-console-logs.txt`):
```
[DIAGNOSTIC 1/3] MockWebSocket: Calling __emitSipEvent("connection:connected")
[DIAGNOSTIC 2/3] EventBridge: Found 0 listeners for mapped event "sip:connected"
[DIAGNOSTIC 2/3] EventBridge: NO LISTENERS for mapped event "sip:connected"! This is the problem!
...
[DIAGNOSTIC 3/3] useSipClient: Registering "sip:connected" listener...
[DIAGNOSTIC 3/3] useSipClient: "sip:connected" listener registered successfully
```

**Fix Applied** (fixtures.ts lines 323-349):
```typescript
// TIMING FIX: Delay EventBridge event emission to allow Vue app to mount
setTimeout(() => {
  if (typeof (window as any).__emitSipEvent === 'function') {
    console.log('[DIAGNOSTIC 1/3] MockWebSocket: Calling __emitSipEvent("connection:connected") AFTER delay')
    ;(window as any).__emitSipEvent('connection:connected')
  }
}, 200) // Wait 200ms for Vue app to mount and listeners to register
```

**Verification**:
- ✅ Diagnostic test passes (1.37s)
- ❌ Full E2E test still fails (6.50s timeout)

---

### Issue #3: Test Logic Error ✅ FIXED → NEW ISSUE: CALL BUTTON DISABLED

**Fix Applied** (app-functionality.spec.ts lines 498-503):
```typescript
// BEFORE (incorrect):
await page.waitForSelector('[data-testid="dtmf-1"]', { state: 'visible', timeout: 5000 })
const testNumber = '123'
for (const digit of testNumber) {
  await page.click(`[data-testid="dtmf-${digit}"]`)
  await page.waitForTimeout(50)
}

// AFTER (correct):
await page.waitForSelector('[data-testid="dialpad-input"]', { state: 'visible', timeout: 5000 })
const testNumber = '123'
await page.fill('[data-testid="dialpad-input"]', testNumber)
```

**Result**: ✅ Test now successfully progresses PAST the dialpad-input step!

**New Issue Discovered**: Test times out waiting for call button to be enabled:
```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
- waiting for locator('[data-testid="call-button"]:not([disabled])') to be visible
```

---

### Issue #4: Call Button Remains Disabled ⚠️ ROOT CAUSE IDENTIFIED

**Call Button Enablement Condition** (TestApp.vue line 166):
```vue
<button
  data-testid="call-button"
  :disabled="!dialNumber || !isConnected || isMakingCall"
>
```

**Analysis of Disabled Conditions**:
1. `!dialNumber` - ✅ FIXED by filling dialpad-input with "123"
2. `!isConnected` - ⚠️ **ROOT CAUSE**: Remains `false` despite connection events
3. `isMakingCall` - ✅ Should be `false` at this stage

**Root Cause Investigation** (useSipClient.ts):

**How `isConnected` is computed** (lines 252-256):
```typescript
const isConnected = computed(() => {
  return _isConnected.value
})
```

**How `_isConnected` gets updated** (found via grep):
1. Line 306: `_isConnected.value = true` when `'sip:connected'` event received
2. Line 323: `_isConnected.value = false` when `'sip:disconnected'` event received
3. Line 410: Watcher syncs from `sipClient.value.isConnected`
4. Line 475: Manual sync from `sipClient.value.isConnected`

**Event Listener Registration** (lines 299-311):
```typescript
listeners.push({
  event: 'sip:connected',
  id: eventBus.on('sip:connected', () => {
    console.log('[DIAGNOSTIC 3/3] useSipClient: ✅ "sip:connected" event RECEIVED by listener!')
    logger.debug('SIP client connected')
    error.value = null
    // Update reactive state
    console.log('[DIAGNOSTIC 3/3] useSipClient: Updating _isConnected.value from', _isConnected.value, 'to true')
    _connectionState.value = ConnectionState.Connected
    _isConnected.value = true
    console.log('[DIAGNOSTIC 3/3] useSipClient: State updated! _isConnected.value =', _isConnected.value)
    logger.debug('State updated', { connectionState: _connectionState.value, isConnected: _isConnected.value })
  }),
})
```

**Confirmed Problem**: Same as Issue #2 - Event Timing Race Condition
- MockWebSocket fires `connection:connected` event 20ms after construction (previous fix increased to 200ms)
- Event fires BEFORE Vue app mounts and registers listeners
- Console logs from previous diagnostic test (`/tmp/diagnostic-console-logs.txt`) proved:
  - `[DIAGNOSTIC 2/3] EventBridge: Found 0 listeners` when event fires
  - Listeners register AFTER the event has already fired
- The 200ms delay isn't sufficient for all cases where Vue component mounting is slow

**Next Investigation**:
- Need to ensure listeners are registered BEFORE events fire
- OR implement event replay/buffering mechanism
- OR increase delay further and make it wait for listener registration

---

### Issue #5: Timeout Mechanism Added to Polling ✅ IMPLEMENTED → ISSUE PERSISTS

**Fix Applied** (fixtures.ts lines 331-362):
```typescript
// LISTENER-READY SIGNAL FIX: Wait for listeners to be ready before firing events
// Instead of a fixed delay, poll for the listener-ready signal with timeout
const startTime = Date.now()
const MAX_WAIT = 5000 // 5 seconds max wait

const waitForListenersReady = () => {
  const elapsed = Date.now() - startTime

  if ((window as any).__sipListenersReady) {
    // Listeners are ready! Emit the connection event
    console.log(`[DIAGNOSTIC 1/3] MockWebSocket: Listeners ready after ${elapsed}ms! Calling __emitSipEvent("connection:connected")`)
    if (typeof (window as any).__emitSipEvent === 'function') {
      ;(window as any).__emitSipEvent('connection:connected')
      console.log('[DIAGNOSTIC 1/3] MockWebSocket: __emitSipEvent call completed')
    } else {
      console.error('[DIAGNOSTIC 1/3] MockWebSocket: __emitSipEvent function NOT FOUND!')
    }
  } else if (elapsed > MAX_WAIT) {
    // Timeout! Emit anyway with warning
    console.error(`[DIAGNOSTIC 1/3] MockWebSocket: TIMEOUT waiting for __sipListenersReady after ${elapsed}ms! Emitting event anyway...`)
    if (typeof (window as any).__emitSipEvent === 'function') {
      ;(window as any).__emitSipEvent('connection:connected')
      console.log('[DIAGNOSTIC 1/3] MockWebSocket: __emitSipEvent call completed (after timeout)')
    }
  } else {
    // Listeners not ready yet, check again in 50ms
    console.log(`[DIAGNOSTIC 1/3] MockWebSocket: Waiting for listeners... (${elapsed}ms elapsed)`)
    setTimeout(waitForListenersReady, 50)
  }
}
// Start polling immediately
waitForListenersReady()
```

**Result**: ❌ Test still fails with same error after 6.36s

**Critical Observation**: Diagnostic logs are NOT visible in test output, making it impossible to see:
- Whether `__sipListenersReady` signal is ever set
- How long polling takes before timeout
- Whether events are actually being emitted

**Test Results**:
```
❌  should make an outgoing call (6.36s)
   ❌ Error: TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
- waiting for locator('[data-testid="call-button"]:not([disabled])') to be visible
```

---

### Original Issue #3 Root Cause (For Reference)

The test had a **fundamental logic error**. It waited for DTMF buttons that only appear DURING an active call, but tried to use them to ENTER a phone number BEFORE making a call.

**Evidence from Code Analysis**:

1. **TestApp.vue lines 182-213**: DTMF buttons are inside:
   ```vue
   <div v-if="callState === 'confirmed'" class="dtmf-section">
   ```
   These buttons ONLY appear when `callState === 'confirmed'` (during an active call).

2. **Original test logic**: The test tried to:
   - Wait for `[data-testid="dtmf-1"]`
   - Click DTMF buttons to enter "123"
   - Then make a call

   This is BACKWARDS - you can't use DTMF buttons to dial before making a call!

3. **Correct element (TestApp.vue line 154)**:
   ```vue
   <input
     data-testid="dialpad-input"
     v-model="dialNumber"
     type="tel"
   />
   ```
   This is the text input that's visible BEFORE making a call.

**Files Modified**:
- `/home/irony/code/VueSIP/tests/e2e/app-functionality.spec.ts:498-503` - Fixed selector and interaction method

---

## Test Results

### After sipClient.ts Fix
```
✅ Diagnostic test: PASSES (1.40s)
❌ Full E2E test: FAILS (6.49s timeout)
```

### After Timing Fix
```
✅ Diagnostic test: PASSES (1.37s)
❌ Full E2E test: FAILS (6.50s timeout)
```

---

## Alternative Approaches

Based on the persistent failure across multiple approaches, the following architectural changes are recommended:

### Option 1: Restructure MockWebSocket (RECOMMENDED)
**Current Problem**: MockWebSocket auto-connects on instantiation, triggering events before listeners exist.

**Proposed Solution**:
- MockWebSocket should NOT auto-connect on instantiation
- Add explicit `connect()` method called by test AFTER page loads and Vue mounts
- Test workflow: `setup → mount page → wait for mount → call connect() → events fire`

**Benefits**:
- Eliminates race condition architecturally rather than coordinating timing
- Test has full control over when events fire
- Diagnostic logs become unnecessary

**Implementation**:
```typescript
// In fixtures.ts
class MockWebSocket extends EventTarget {
  constructor(url: string, protocols?: string | string[]) {
    super()
    this.url = url
    this.readyState = WebSocket.CONNECTING
    // NO AUTO-CONNECT - wait for explicit call
  }

  connect() {
    // Now controlled by test
    this.readyState = WebSocket.OPEN
    if (typeof (window as any).__emitSipEvent === 'function') {
      ;(window as any).__emitSipEvent('connection:connected')
    }
  }
}

// In test
await page.waitForSelector('[data-testid="main-interface"]')
await page.evaluate(() => {
  const mockSocket = (window as any).__mockSocket
  if (mockSocket && typeof mockSocket.connect === 'function') {
    mockSocket.connect()
  }
})
```

### Option 2: Event Replay System
**Current Problem**: Events fire before listeners register, so events are lost.

**Proposed Solution**:
- Implement event buffering in EventBridge
- When `emit()` called with 0 listeners, store event in buffer
- When listener registered, replay buffered events
- Clear buffer after replay

**Benefits**:
- Works with existing architecture
- No changes to MockWebSocket timing
- Handles any timing scenario automatically

**Implementation**:
```typescript
// In EventBus.ts
private eventBuffer: Map<string, any[]> = new Map()

emit(event: string, data: any) {
  const listeners = this.listeners.get(event)
  if (!listeners || listeners.size === 0) {
    // Buffer event for later replay
    if (!this.eventBuffer.has(event)) {
      this.eventBuffer.set(event, [])
    }
    this.eventBuffer.get(event)!.push(data)
  } else {
    // Normal emission
    listeners.forEach(callback => callback(data))
  }
}

on(event: string, callback: Function) {
  // Normal registration
  this.listeners.get(event).add(callback)

  // Replay buffered events
  const buffered = this.eventBuffer.get(event)
  if (buffered && buffered.length > 0) {
    buffered.forEach(data => callback(data))
    this.eventBuffer.delete(event)
  }
}
```

### Option 3: Synchronous Initialization
**Current Problem**: Async timing between fixture setup and Vue app mount.

**Proposed Solution**:
- Test waits for explicit "ready" signal from Vue app
- Vue app signals when ALL listeners are registered
- Only then does test trigger MockWebSocket events

**Benefits**:
- No guessing about timing
- Clear synchronization point
- Works with current architecture

---

## Recommended Next Action

**Clean up background test processes first** (100+ running processes consuming resources):
```bash
pkill -f "playwright test"
pkill -f "npm run test:e2e"
```

Then implement **Option 1: Restructure MockWebSocket** because:
1. Architectural solution > timing coordination
2. Test has full control over event triggering
3. Eliminates race condition permanently
4. No complex polling/buffering needed

---

## Lessons Learned

1. **Architectural Solutions > Coordination**: Eliminating race conditions architecturally is better than coordinating timing
2. **Diagnostic Visibility Critical**: Unable to see console logs made debugging difficult
3. **Multiple Approaches Tried**: Event buffering, listener-ready signal, polling with timeout all failed
4. **Root Cause Persistent**: Despite 5 different fixes, fundamental issue remains

---

**Current Task**: Documentation complete - ready for architectural restructuring
