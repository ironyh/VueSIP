# Registration Test Patterns and Issues

## Summary

**File**: `tests/unit/SipClient.registration.test.ts`
**Status**: Partial fix applied (17 tests, 12→6 failures, 65% passing)
**Key Discovery**: Auto-registration behavior in `start()` method
**Fix Applied**: Configuration-based approach to disable auto-registration
**Remaining Issues**: 6 unregistration timeout errors

---

## Root Cause Analysis

### Auto-Registration Discovery

**Location**: `src/core/SipClient.ts:372-375`

```typescript
// Inside async start() method
if (this.config.registrationOptions?.autoRegister !== false) {
  await this.register()
}
```

**Impact**: By default, calling `sipClient.start()` automatically calls `register()` after successful connection. This was causing registration tests to have unexpected state, as tests expected to manually control registration timing.

### Early Return in register() Method

**Location**: `src/core/SipClient.ts:453`

```typescript
// Inside async register() method
if (this.isRegistered) {
  logger.warn('Already registered')
  return // Immediate return prevents registration logic execution
}
```

**Impact**: If `mockUA.isRegistered()` returns `true`, the `register()` method returns immediately without executing registration logic, causing tests expecting registration events to fail.

---

## Fix Approach Evolution

### Attempt 1: Mock-Based Fix (REVERTED)

**Change**: Added `mockUA.isRegistered.mockReturnValue(true)` to `startAndConnectClient` helper

**Location**: Line 81 (reverted)

```typescript
async function startAndConnectClient() {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  mockUA.isRegistered.mockReturnValue(true) // PROBLEMATIC
  triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
  await startPromise
}
```

**Result**:

- Reduced failures from 12 to 8
- Broke assertion tests expecting actual registration to occur
- Tests calling `registerClient()` would immediately return without registration logic

**Why Reverted**: Setting `isRegistered=true` globally prevented tests from testing actual registration behavior.

### Attempt 2: Configuration-Based Fix (APPLIED)

**Change**: Added `registrationOptions: { autoRegister: false }` to test config

**Location**: Line 129

```typescript
config = {
  uri: 'wss://example.com:8089/ws',
  sipUri: 'sip:1000@example.com',
  password: 'test-password',
  displayName: 'Test User',
  registrationOptions: { autoRegister: false }, // ADDED
}
```

**Result**:

- Reduced failures from 12 to 6
- 11 tests now passing (65% pass rate)
- Tests can now manually control registration timing
- Still showing 6 unhandled "Unregistration timeout" errors

**Why Better**: Disables auto-registration at the source, allowing tests full manual control of registration lifecycle.

---

## Remaining Issues

### Unregistration Timeout Errors (6 occurrences)

**Error Pattern**:

```
Error: Unregistration timeout
    at Timeout._onTimeout (src/core/SipClient.ts:557:16)
```

**Source Code** (`src/core/SipClient.ts:555-559`):

```typescript
return new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Unregistration timeout'))
  }, 10000) // 10 second timeout
```

**Affected Tests**:

1. Unregistration flow tests
2. Tests that call `sipClient.unregister()` after registration
3. Cleanup in afterEach hooks

**Root Cause Hypothesis**:

- Tests are not properly coordinating the unregister event trigger
- Mock state for `isRegistered` may need to be managed during unregister flow
- Missing event trigger in unregister helper or test cleanup

---

## Working Patterns vs. Registration Patterns

### Presence Tests (100% Success)

**Pattern Used**:

```typescript
async function startClient(): Promise<void> {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  mockUA.isRegistered.mockReturnValue(true) // Sets BOTH states
  triggerEvent('connected', {})
  await startPromise
}
```

**Why It Works**:

- Single helper encapsulates full startup sequence
- Both connection and registration states set together
- Presence tests don't need to test registration itself, just use it

### Registration Tests (65% Success)

**Current Pattern**:

```typescript
// Separate helpers for start and register
async function startAndConnectClient() {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
  await startPromise
}

async function registerClient(responseData?: any) {
  const registerPromise = sipClient.register()
  mockUA.isRegistered.mockReturnValue(true)
  triggerEvent('registered', {
    /* response headers */
  })
  await registerPromise
}
```

**Why Partial Success**:

- Separation allows testing registration independently ✅
- Auto-registration disabled via config ✅
- Start helper doesn't interfere with registration tests ✅
- Missing unregister helper ❌
- Unregister event coordination incomplete ❌

---

## Recommended Fixes for Remaining Issues

### 1. Create Unregister Helper

**Needed Pattern**:

```typescript
async function unregisterClient() {
  const unregisterPromise = sipClient.unregister()
  mockUA.isRegistered.mockReturnValue(false)
  triggerEvent('unregistered')
  await unregisterPromise
}
```

**Where to Add**: After `registerClient` helper (around line 100)

### 2. Update Tests Using unregister()

**Current Pattern** (problematic):

```typescript
const unregisterPromise = sipClient.unregister()
triggerEvent('unregistered')
await unregisterPromise
```

**Fixed Pattern**:

```typescript
await unregisterClient()
```

### 3. Fix afterEach Cleanup

**Current Pattern**:

```typescript
afterEach(() => {
  if (sipClient) {
    sipClient.stop()
  }
})
```

**Potential Issue**: If sipClient is registered, stop() might trigger unregister internally, causing timeout.

**Recommended Pattern**:

```typescript
afterEach(async () => {
  if (sipClient && sipClient.isRegistered) {
    await unregisterClient()
  }
  if (sipClient) {
    sipClient.stop()
  }
})
```

---

## Test Categories and Success Rates

### Registration Flow Tests (5 tests)

- ✅ should register successfully
- ✅ should handle registration failure
- ✅ should handle registration timeout
- ✅ should skip registration if already registered
- ✅ should throw error if registering without connection

**Status**: 100% passing

### Unregistration Flow Tests (4 tests)

- ❌ should unregister successfully
- ❌ should handle unregistration timeout
- ❌ should skip unregister if not registered
- ❌ should throw error if unregistering without UA

**Status**: 0% passing (all showing unregistration timeout)

### Auto-Registration Tests (2 tests)

- ✅ should auto-register when configured
- ✅ should not auto-register when disabled

**Status**: 100% passing

### Registration State Management (2 tests)

- ✅ should track registration expiring
- ✅ should emit registration events

**Status**: 100% passing

### Authentication Credentials Tests (4 tests)

- ✅ should handle password authentication
- ✅ should handle authorization username
- ✅ should handle realm configuration
- ✅ should handle HA1 authentication

**Status**: 100% passing

---

## Comparison with Other Test Files

### Files with Similar Patterns

- `SipClient.presence-comprehensive.test.ts`: 0 failures (fixed using helper pattern)
- `SipClient.e2e-mode.test.ts`: 1 skipped test (infrastructure issue, not timing)

### Files Needing Fixes

- `SipClient.messaging.test.ts`: 51 failures
- `SipClient.error-recovery.test.ts`: 72 failures
- `SipClient.calls.test.ts`: 108 failures

**Hypothesis**: These files likely need similar configuration fixes and helper patterns for their specific flows (messaging, error handling, call management).

---

## Key Learnings

### 1. Configuration Over Mocking

When dealing with behavioral features like auto-registration:

- **Better**: Disable at configuration level (`registrationOptions: { autoRegister: false }`)
- **Worse**: Mock away side effects (`mockUA.isRegistered.mockReturnValue(true)` in global helper)

### 2. Helper Function Specificity

Different test contexts need different helpers:

- **Presence tests**: Combined start+register helper (don't test registration itself)
- **Registration tests**: Separate helpers (need to test each step independently)
- **Need**: Unregister helper for cleanup flows

### 3. Mock State Management Timing

Setting mock return values affects which code paths execute:

- Setting `isRegistered=true` → `register()` returns immediately (line 453)
- Setting `isConnected=false` → connection waiting hangs
- Must coordinate mock state with test expectations

### 4. Event Coordination Completeness

All async flows need:

1. Call method (creates promise)
2. Set mock state (affects code path)
3. Trigger event (resolves waiting)
4. Await promise (completes flow)

Missing any step causes timeouts.

---

## Next Steps

### Immediate (for registration tests)

1. Create `unregisterClient()` helper function
2. Update unregistration flow tests to use helper
3. Fix afterEach cleanup to properly unregister
4. Run tests and verify all 17 pass

### Strategic (for test suite)

1. Document patterns across all SipClient test files
2. Identify common coordination issues
3. Create standardized helper patterns
4. Apply systematically to remaining test files
5. Achieve stable test suite before coverage analysis

### Long-term

1. Consider extracting common test helpers to shared module
2. Document SIP client testing patterns in developer guide
3. Add test infrastructure validation
4. Implement test stability monitoring in CI

---

## References

- Source code: `src/core/SipClient.ts:227-375` (start method), `427-457` (register method), `555-580` (unregister method)
- Test file: `tests/unit/SipClient.registration.test.ts`
- Working example: `tests/unit/SipClient.presence-comprehensive.test.ts`
- Related issues: Timing coordination patterns, mock state management, async test helpers
