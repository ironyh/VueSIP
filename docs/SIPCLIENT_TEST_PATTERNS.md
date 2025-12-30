# SipClient Test Coordination Patterns

Comprehensive guide for fixing timing and coordination issues across all SipClient test files.

---

## Overview

**Total SipClient Test Files**: 12
**Successfully Fixed**: 3 (e2e-mode, presence-comprehensive, config-utilities)
**Partially Fixed**: 1 (registration: 17 tests, 6 failures)
**Pending Fixes**: 8 files

**Root Cause**: Mock async coordination timing issues with JsSIP event-driven architecture
**Solution Pattern**: Helper functions that coordinate: 1) Call method, 2) Set mock state, 3) Trigger event, 4) Await promise

---

## Core Testing Principles

### 1. Promise Constructor Synchrony

```typescript
// Promise constructor runs IMMEDIATELY when function is called
async function someMethod() {
  return new Promise((resolve, reject) => {
    // This code runs RIGHT NOW, synchronously
    if (this.someState) {
      // Checks state immediately!
      resolve()
      return
    }
    // Event listener setup also runs right now
    this.on('event', () => resolve())
  })
}
```

**Critical Implication**: Event listeners are registered immediately when async methods are called, so the timing of `mockUA.isConnected()`, `mockUA.isRegistered()` calls is crucial.

### 2. Mock State Timing Pattern

**The Golden Rule**:

```typescript
// ✅ CORRECT: Set mock state AFTER calling method, BEFORE triggering event
const promise = sipClient.method() // 1. Calls method (registers listeners synchronously)
mockUA.someState.mockReturnValue(true) // 2. Sets mock state
triggerEvent('event', data) // 3. Triggers event (listeners execute with new state)
await promise // 4. Awaits completion

// ❌ WRONG: Setting mock state too early
mockUA.someState.mockReturnValue(true) // State set too early
const promise = sipClient.method() // Method might early-return!
triggerEvent('event', data)
await promise
```

### 3. Event Trigger Coordination

**Event Trigger Requirements**:

- Must match the exact event name SipClient listens for
- Must provide expected data structure
- Must trigger AFTER mock state is set
- Must trigger BEFORE awaiting the promise

### 4. Configuration Over Mocking

**When to Use Configuration**:

```typescript
// ✅ PREFERRED: Disable behaviors via configuration
const config = {
  ...baseConfig,
  registrationOptions: { autoRegister: false },
  presenceOptions: { autoPublish: false },
}

// ❌ AVOID: Mocking away behavioral side effects globally
// This can prevent actual code paths from executing in tests
```

---

## File-by-File Analysis

### 1. ✅ SipClient.e2e-mode.test.ts (FIXED)

**Status**: 1 skipped test (infrastructure issue, not timing)
**Pattern Used**: E2E mode detection with window globals
**Key Success**: Tests detect E2E mode and skip JsSIP interactions

### 2. ✅ SipClient.presence-comprehensive.test.ts (FIXED - with 6 assertion failures)

**Status**: 0 timeouts, 6 assertion failures (implementation bugs, not test issues)
**Tests**: 32 total
**Pattern Used**: Combined start helper

**Helper Function**:

```typescript
async function startClient(): Promise<void> {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  mockUA.isRegistered.mockReturnValue(true) // Both states set together
  triggerEvent('connected', {})
  await startPromise
}
```

**Why It Works**:

- Single helper encapsulates full startup
- Both connection and registration set together
- Presence tests don't test registration logic, just use it as prerequisite

**Remaining Issues** (implementation, not test):

- 6 PIDF XML generation assertion failures (src/core/SipClient.ts implementation bugs)

### 3. ⚠️ SipClient.registration.test.ts (PARTIAL FIX)

**Status**: 17 tests, 11 passing (65%), 6 failing
**Pattern Used**: Separate helpers for start and register
**Configuration Fix**: Added `registrationOptions: { autoRegister: false }`

**Helper Functions**:

```typescript
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
    response: {
      getHeader: (name: string) => {
        if (responseData?.getHeader) return responseData.getHeader(name)
        if (name === 'Contact') return '<sip:1000@example.com;transport=ws>'
        if (name === 'Expires') return '3600'
        return null
      },
    },
  })
  await registerPromise
}
```

**Why Partial Success**:

- Separation allows independent testing ✅
- Auto-registration disabled via config ✅
- Missing unregister helper ❌
- Unregister cleanup incomplete ❌

**Remaining Issues**:

- 6 "Unregistration timeout" errors at src/core/SipClient.ts:557
- Need `unregisterClient()` helper following same pattern

**Recommended Fix**:

```typescript
async function unregisterClient() {
  const unregisterPromise = sipClient.unregister()
  mockUA.isRegistered.mockReturnValue(false)
  triggerEvent('unregistered')
  await unregisterPromise
}
```

### 4. ❌ SipClient.test.ts (Main Test File)

**Estimated Issues**: Core lifecycle tests likely timing-sensitive
**Expected Pattern**: Combined patterns from registration and presence tests
**Priority**: Medium - after fixing larger failure sets

### 5. ❌ SipClient.calls.test.ts (HIGH PRIORITY)

**Status**: 108 failures (largest failure set)
**Complexity**: Call lifecycle (outgoing, incoming, hold, transfer, termination)
**Expected Issues**:

- Call setup timing
- Media stream coordination
- Call state transitions
- DTMF coordination

**Recommended Pattern**:

```typescript
async function makeCall(target: string) {
  const callPromise = sipClient.call(target)
  mockUA.isConnected.mockReturnValue(true)
  mockUA.isRegistered.mockReturnValue(true)

  // Trigger newRTCSession for outgoing call
  const mockSession = {
    id: 'test-session-id',
    connection: { addEventListener: vi.fn() },
    on: vi.fn(),
    answer: vi.fn(),
    terminate: vi.fn(),
  }
  triggerEvent('newRTCSession', {
    originator: 'local',
    session: mockSession,
  })

  const call = await callPromise
  return { call, mockSession }
}

async function acceptIncomingCall() {
  // Setup similar to makeCall but for incoming
  const mockSession = {
    id: 'incoming-session',
    remote_identity: { uri: { user: '2000', host: 'example.com' } },
    connection: { addEventListener: vi.fn() },
    on: vi.fn(),
    answer: vi.fn(),
    terminate: vi.fn(),
  }

  triggerEvent('newRTCSession', {
    originator: 'remote',
    session: mockSession,
  })

  // Return session for test manipulation
  return mockSession
}
```

### 6. ❌ SipClient.messaging.test.ts (MEDIUM PRIORITY)

**Status**: 51 failures
**Complexity**: Message send/receive, typing indicators, read receipts
**Expected Issues**: Message delivery confirmation timing

**Recommended Pattern**:

```typescript
async function sendMessage(target: string, message: string) {
  const messagePromise = sipClient.sendMessage(target, message)

  // Mock successful send
  mockUA.sendMessage.mockImplementation((target, message, options) => {
    // Simulate async send confirmation
    Promise.resolve().then(() => {
      if (options?.eventHandlers?.succeeded) {
        options.eventHandlers.succeeded({
          /* response data */
        })
      }
    })
  })

  await messagePromise
}
```

### 7. ❌ SipClient.error-recovery.test.ts (HIGH PRIORITY)

**Status**: 72 failures
**Complexity**: Network failures, reconnection, state recovery
**Expected Issues**: Error event timing, recovery coordination

**Recommended Pattern**:

```typescript
async function simulateConnectionFailure() {
  mockUA.isConnected.mockReturnValue(false)
  triggerEvent('disconnected', {
    error: true,
    code: 1006,
    reason: 'Connection lost',
  })
  // Wait for internal state update
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function simulateReconnection() {
  const reconnectPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
  await reconnectPromise
}
```

### 8. ❌ SipClient.media.test.ts

**Expected Issues**: Media stream timing, device selection
**Complexity**: Browser media APIs coordination
**Priority**: Low - media handling less critical than core functionality

### 9. ❌ SipClient.conference.test.ts

**Expected Issues**: Multi-party call coordination
**Complexity**: Conference setup, participant management
**Priority**: Low - depends on calls.test patterns

### 10. ❌ SipClient.presence.test.ts (Legacy)

**Note**: May be superseded by presence-comprehensive.test.ts
**Action**: Review if still needed, possibly deprecated

### 11. ✅ providers/SipClientProvider.test.ts

**Status**: Likely passing (provider layer, not core logic)
**Pattern**: Vue component testing patterns

---

## Common Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Mock State Too Early

```typescript
// WRONG: State set before method call
mockUA.isConnected.mockReturnValue(true)
const promise = sipClient.start()
triggerEvent('connected')
await promise
// Problem: If start() checks isConnected immediately, it might early-return
```

### ❌ Anti-Pattern 2: Trigger Event Before Mock State

```typescript
// WRONG: Event triggered before mock state set
const promise = sipClient.start()
triggerEvent('connected') // Event fires before mock state ready!
mockUA.isConnected.mockReturnValue(true)
await promise
```

### ❌ Anti-Pattern 3: Missing Event Trigger

```typescript
// WRONG: Promise never resolves
const promise = sipClient.register()
mockUA.isRegistered.mockReturnValue(true)
// Missing: triggerEvent('registered')
await promise // Hangs forever!
```

### ❌ Anti-Pattern 4: Global Mock State in Helpers

```typescript
// PROBLEMATIC: Setting state that affects all tests
async function startClient() {
  mockUA.isRegistered.mockReturnValue(true) // Affects subsequent tests!
  // ...
}
```

### ❌ Anti-Pattern 5: Incorrect Event Data Structure

```typescript
// WRONG: Missing required data fields
triggerEvent('registered', {}) // Missing response.getHeader function!

// CORRECT:
triggerEvent('registered', {
  response: {
    getHeader: (name: string) => {
      if (name === 'Contact') return '<sip:user@example.com>'
      return null
    },
  },
})
```

---

## Recommended Helper Patterns

### Pattern 1: Connection Helper

```typescript
async function connectClient() {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', {
    socket: { url: 'wss://example.com:8089/ws' },
  })
  await startPromise
}
```

### Pattern 2: Registration Helper

```typescript
async function registerClient() {
  const registerPromise = sipClient.register()
  mockUA.isRegistered.mockReturnValue(true)
  triggerEvent('registered', {
    response: {
      getHeader: (name: string) => {
        if (name === 'Contact') return '<sip:1000@example.com;transport=ws>'
        if (name === 'Expires') return '3600'
        return null
      },
    },
  })
  await registerPromise
}
```

### Pattern 3: Unregistration Helper

```typescript
async function unregisterClient() {
  const unregisterPromise = sipClient.unregister()
  mockUA.isRegistered.mockReturnValue(false)
  triggerEvent('unregistered')
  await unregisterPromise
}
```

### Pattern 4: Full Startup Helper (Combined)

```typescript
async function startFullClient() {
  const startPromise = sipClient.start()
  mockUA.isConnected.mockReturnValue(true)
  mockUA.isRegistered.mockReturnValue(true)
  triggerEvent('connected', {
    socket: { url: 'wss://example.com:8089/ws' },
  })
  await startPromise
  // Auto-registration will complete via config
}
```

### Pattern 5: Call Setup Helper

```typescript
async function setupOutgoingCall(target: string) {
  const callPromise = sipClient.call(target)

  const mockSession = {
    id: `session-${Date.now()}`,
    connection: { addEventListener: vi.fn() },
    on: vi.fn(),
    answer: vi.fn(),
    terminate: vi.fn(),
    isInProgress: vi.fn().mockReturnValue(true),
    isEstablished: vi.fn().mockReturnValue(false),
  }

  triggerEvent('newRTCSession', {
    originator: 'local',
    session: mockSession,
  })

  const call = await callPromise
  return { call, mockSession }
}
```

---

## Configuration Patterns

### Disable Auto-Features for Testing

```typescript
const config: SipClientConfig = {
  uri: 'wss://example.com:8089/ws',
  sipUri: 'sip:1000@example.com',
  password: 'test-password',
  registrationOptions: {
    autoRegister: false, // Disable auto-registration
  },
  presenceOptions: {
    autoPublish: false, // Disable auto-presence
  },
}
```

### Enable Specific Features When Needed

```typescript
const configWithAutoReg = {
  ...baseConfig,
  registrationOptions: {
    autoRegister: true, // Enable for auto-registration tests
  },
}
```

---

## Mock Setup Best Practices

### beforeEach Pattern

```typescript
beforeEach(() => {
  vi.clearAllMocks()

  // Clear event handlers
  Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
  Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])

  // Restore default mock implementations
  mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler)
  })
  mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
    if (!onceHandlers[event]) onceHandlers[event] = []
    onceHandlers[event].push(handler)
  })

  // Reset mock return values
  mockUA.isConnected.mockReturnValue(false)
  mockUA.isRegistered.mockReturnValue(false)

  eventBus = createEventBus()
  sipClient = new SipClient(config, eventBus)
})
```

### afterEach Cleanup Pattern

```typescript
afterEach(async () => {
  // Proper cleanup sequence
  if (sipClient && sipClient.isRegistered) {
    await unregisterClient()
  }
  if (sipClient) {
    sipClient.stop()
  }
})
```

---

## Debugging Test Timeouts

### Step 1: Identify Missing Trigger

```typescript
// Add debug logging
const registerPromise = sipClient.register()
console.log('Waiting for registered event...')
mockUA.isRegistered.mockReturnValue(true)
triggerEvent('registered', {
  /* data */
})
console.log('Event triggered')
await registerPromise
console.log('Promise resolved')
```

### Step 2: Verify Event Handler Registration

```typescript
// Check event handlers were registered
console.log('Event handlers:', Object.keys(eventHandlers))
console.log('Once handlers:', Object.keys(onceHandlers))
```

### Step 3: Check Mock State Timing

```typescript
// Verify mock state is checked at right time
const registerPromise = sipClient.register()
console.log('isRegistered before mock:', mockUA.isRegistered())
mockUA.isRegistered.mockReturnValue(true)
console.log('isRegistered after mock:', mockUA.isRegistered())
```

### Step 4: Verify Event Data Structure

```typescript
// Ensure event data matches expectations
const eventData = {
  response: {
    getHeader: (name: string) => {
      console.log('getHeader called with:', name)
      return null
    },
  },
}
triggerEvent('registered', eventData)
```

---

## Priority Fixing Order

### Phase 1: High-Impact Files (108 + 72 = 180 failures)

1. `SipClient.calls.test.ts` (108 failures) - Core functionality
2. `SipClient.error-recovery.test.ts` (72 failures) - Stability critical

### Phase 2: Medium-Impact Files (51 + 6 = 57 failures)

3. `SipClient.messaging.test.ts` (51 failures) - Feature completeness
4. `SipClient.registration.test.ts` (6 remaining) - Finish cleanup

### Phase 3: Lower-Impact Files

5. `SipClient.test.ts` - Core lifecycle tests
6. `SipClient.media.test.ts` - Media handling
7. `SipClient.conference.test.ts` - Advanced features
8. `SipClient.presence.test.ts` - Review if still needed

---

## Success Metrics

### Per-File Goals

- ✅ All tests passing (0 timeouts, 0 failures)
- ✅ Helper functions following standard patterns
- ✅ Configuration-based feature control where applicable
- ✅ Proper cleanup in afterEach hooks

### Overall Goals

- Target: 100% tests passing across all SipClient test files
- Target: <1 second average test execution time
- Target: Clear, maintainable helper patterns
- Target: Comprehensive coverage of edge cases

---

## Next Steps

1. **Apply registration unregister fix** - Complete the partial fix with unregister helper
2. **Fix calls.test.ts** - Highest failure count, core functionality
3. **Fix error-recovery.test.ts** - Second highest, stability critical
4. **Fix messaging.test.ts** - Feature completeness
5. **Review and cleanup** - Remaining smaller files
6. **Coverage analysis** - Once tests stable, analyze gaps
7. **Implementation fixes** - Address 6 presence PIDF XML failures

---

## References

- Working example: `tests/unit/SipClient.presence-comprehensive.test.ts`
- Partial fix example: `tests/unit/SipClient.registration.test.ts`
- Fixed example: `tests/unit/SipClient.e2e-mode.test.ts`
- Source code: `src/core/SipClient.ts` (check actual implementation for timing behavior)
- Related documentation: `docs/REGISTRATION_TEST_PATTERNS.md`
