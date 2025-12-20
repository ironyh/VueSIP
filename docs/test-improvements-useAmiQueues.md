# Test Improvements: useAmiQueues.test.ts

## Summary

Applied test improvement patterns from `useAmiBase.test.ts` and `ami-helpers.test.ts` to enhance the useAmiQueues test suite. All 42 tests pass with 100% coverage maintained.

## Improvements Applied

### 1. Test Fixtures (TEST_FIXTURES)

Added comprehensive test data object for consistency:

```typescript
const TEST_FIXTURES = {
  queues: {
    sales: 'sales-queue',
    support: 'support-queue',
    internal: 'internal-queue',
  },
  members: {
    sip1000: 'SIP/1000',
    sip2000: 'SIP/2000',
    sip3000: 'SIP/3000',
    local1000: 'Local/1000@context',
  },
  pauseReasons: {
    default: ['Break', 'Lunch', 'Meeting', 'Training'],
    custom: ['Coffee', 'Meeting', 'Training'],
  },
  errors: {
    clientNotConnected: 'AMI client not connected',
    networkError: 'Network error',
  },
  serverId: 1,
} as const
```

**Benefits:**
- Centralized test data management
- Eliminates magic strings/numbers
- Easy to update and maintain
- Type-safe with `as const`

### 2. Enhanced Factory Functions

Added JSDoc documentation to all factory functions:

#### createMockClient()
```typescript
/**
 * Factory function: Create mock AMI client with queue-specific methods
 *
 * Provides:
 * - Queue status retrieval
 * - Queue summary statistics
 * - Member management (pause, add, remove, penalty)
 * - Event subscription tracking
 *
 * @returns Mock AmiClient instance
 */
```

#### createMockQueue()
```typescript
/**
 * Factory function: Create mock queue with sensible defaults
 *
 * @param name - Queue name
 * @param overrides - Optional property overrides
 * @returns QueueInfo object
 */
```

#### createMockMember()
```typescript
/**
 * Factory function: Create mock queue member with sensible defaults
 *
 * @param iface - Member interface (e.g., SIP/1000)
 * @param overrides - Optional property overrides
 * @returns QueueMember object
 */
```

#### createMockEntry() (NEW)
```typescript
/**
 * Factory function: Create mock queue entry (caller waiting in queue)
 *
 * @param uniqueId - Unique identifier for the caller
 * @param overrides - Optional property overrides
 * @returns QueueEntry object
 */
```

### 3. Parameterized Test Blocks

Converted repetitive tests to `describe.each` blocks:

#### Initialization Tests
```typescript
describe.each([
  {
    description: 'valid client',
    client: () => createMockClient(),
    expectedQueues: 0,
    expectedLoading: false,
    expectedError: null,
  },
  {
    description: 'null client',
    client: null,
    expectedQueues: 0,
    expectedLoading: false,
    expectedError: null,
  },
])('with $description', ({ client, expectedQueues, expectedLoading, expectedError }) => {
  // Single test covers both cases
})
```

**Before:** 4 separate test functions
**After:** 1 parameterized test block

#### Data Fetching Tests
```typescript
describe.each([
  {
    description: 'empty results',
    mockQueues: [],
    expectedSize: 0,
    expectedLoading: false,
  },
  {
    description: '2 queues',
    mockQueues: [
      { name: TEST_FIXTURES.queues.sales, calls: 5 },
      { name: TEST_FIXTURES.queues.support, calls: 3 },
    ],
    expectedSize: 2,
    expectedLoading: false,
  },
])('successful fetch with $description', ({ mockQueues, expectedSize, expectedLoading }) => {
  // Covers multiple scenarios
})
```

#### Error Handling Tests
```typescript
describe.each([
  {
    description: 'null client',
    setupError: (client: any) => null,
    expectedError: TEST_FIXTURES.errors.clientNotConnected,
  },
  {
    description: 'network error',
    setupError: (client: any) => {
      ;(client.getQueueStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error(TEST_FIXTURES.errors.networkError)
      )
      return client
    },
    expectedError: TEST_FIXTURES.errors.networkError,
  },
])('$description', ({ setupError, expectedError }) => {
  // Unified error handling tests
})
```

#### Member Management Tests
```typescript
describe.each([
  {
    operation: 'pauseMember',
    description: 'pause member',
    initialState: { paused: false, pausedReason: '' },
    action: (composable: any) => composable.pauseMember('test-queue', TEST_FIXTURES.members.sip1000, 'Lunch'),
    expectedCall: ['test-queue', TEST_FIXTURES.members.sip1000, true, 'Lunch'],
    expectedState: { paused: true, pausedReason: 'Lunch' },
  },
  {
    operation: 'unpauseMember',
    description: 'unpause member',
    initialState: { paused: true, pausedReason: 'Lunch' },
    action: (composable: any) => composable.unpauseMember('test-queue', TEST_FIXTURES.members.sip1000),
    expectedCall: ['test-queue', TEST_FIXTURES.members.sip1000, false],
    expectedState: { paused: false, pausedReason: '' },
  },
])('$description', ({ operation, initialState, action, expectedCall, expectedState }) => {
  // Tests both pause and unpause with same structure
})
```

#### Status Label Tests
```typescript
describe.each([
  {
    status: QueueMemberStatus.NotInUse,
    expectedLabel: 'Available',
    description: 'NotInUse status',
  },
  {
    status: QueueMemberStatus.InUse,
    expectedLabel: 'In Use',
    description: 'InUse status',
  },
  {
    status: QueueMemberStatus.Busy,
    expectedLabel: 'Busy',
    description: 'Busy status',
  },
  {
    status: QueueMemberStatus.Ringing,
    expectedLabel: 'Ringing',
    description: 'Ringing status',
  },
])('$description', ({ status, expectedLabel }) => {
  // Tests all status labels systematically
})
```

### 4. JSDoc Comments for Test Groups

Added comprehensive documentation for major test sections:

```typescript
/**
 * Initialization Tests
 * Verify composable starts with correct initial state
 */
describe('Initialization', () => { ... })

/**
 * Data Fetching Tests
 * Verify queue data refresh, loading states, and error handling
 *
 * Loading states:
 * - false initially
 * - true during fetch
 * - false after completion (success or error)
 */
describe('Data Fetching', () => { ... })

/**
 * Member Management Tests
 * Verify pause/unpause, add/remove, and penalty management
 *
 * Member operations:
 * - Pause with optional reason
 * - Unpause and clear reason
 * - Add with configuration
 * - Remove from queue
 * - Set penalty value
 */
describe('Member Management', () => { ... })

/**
 * Computed Properties Tests
 * Verify aggregated statistics across all queues
 */
describe('computed properties', () => { ... })

/**
 * Status Label Tests
 * Verify correct mapping of queue member status codes to human-readable labels
 */
describe('getStatusLabel', () => { ... })
```

## Benefits of Improvements

### Code Quality
- **DRY Principle:** Eliminated duplicate test data and logic
- **Readability:** Clear test intent with descriptive names
- **Maintainability:** Easy to add new test cases to parameterized blocks

### Test Organization
- **Logical Grouping:** Related tests grouped with JSDoc headers
- **Consistent Structure:** All test blocks follow same pattern
- **Self-Documenting:** Tests explain what they're testing and why

### Developer Experience
- **Easier Debugging:** Clear test descriptions in output
- **Faster Test Writing:** Add new cases by extending arrays
- **Better Coverage:** Systematic testing prevents gaps

## Test Results

```
✓ tests/unit/composables/useAmiQueues.test.ts (42 tests)
  ✓ useAmiQueues
    ✓ Initialization (2 tests)
    ✓ Data Fetching (9 tests)
    ✓ refreshQueue (2 tests)
    ✓ getSummary (2 tests)
    ✓ Member Management (11 tests)
    ✓ computed properties (6 tests)
    ✓ event handling (4 tests)
    ✓ getPauseReasons (2 tests)
    ✓ getStatusLabel (5 tests)

Test Files  1 passed (1)
Tests       42 passed (42)
Duration    487ms
```

## Patterns Applied From

- **useAmiBase.test.ts:** Test fixtures, factory functions, JSDoc documentation
- **ami-helpers.test.ts:** Parameterized test blocks with `describe.each`
- **test-helpers.ts:** Shared utility integration (createMockAmiClient pattern)

## Next Steps

These patterns can be applied to other test files:
- `useAmiEvents.test.ts`
- `useAmiPeers.test.ts`
- Other composable tests that need similar improvements
