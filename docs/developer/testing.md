# Testing Guide for Contributors

**Last Updated:** 2025-11-22
**Target Audience:** Contributors, Developers

A comprehensive guide to writing and running tests in the VueSIP project.

---

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Unit Tests](#writing-unit-tests)
5. [Writing Integration Tests](#writing-integration-tests)
6. [Writing E2E Tests](#writing-e2e-tests)
7. [Testing Patterns](#testing-patterns)
8. [Coverage Requirements](#coverage-requirements)
9. [Best Practices](#best-practices)

---

## Overview

VueSIP uses a comprehensive testing strategy with three testing levels:

- **Unit Tests**: Test individual functions and composables in isolation (Vitest)
- **Integration Tests**: Test component interactions and data flow (Vitest)
- **E2E Tests**: Test complete user workflows in a real browser (Playwright)

**Testing Stack:**
- [Vitest](https://vitest.dev/) - Unit and integration testing
- [Playwright](https://playwright.dev/) - End-to-end testing
- [@vue/test-utils](https://test-utils.vuejs.org/) - Vue component testing
- [jsdom](https://github.com/jsdom/jsdom) - DOM environment for unit tests

---

## Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── composables/   # Composable tests
│   ├── core/          # Core class tests
│   ├── stores/        # Store tests
│   ├── utils/         # Utility function tests
│   └── storage/       # Storage adapter tests
├── integration/       # Integration tests
│   ├── call-flow/     # Call workflow tests
│   └── media/         # Media integration tests
├── e2e/               # End-to-end tests
│   ├── specs/         # Test specifications
│   └── fixtures/      # Test fixtures
├── helpers/           # Test helpers and mocks
├── utils/             # Test utilities
└── setup.ts           # Global test setup
```

---

## Running Tests

### Quick Start

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch
```

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run unit tests in watch mode
pnpm test:unit:watch

# Run specific test file
pnpm vitest run tests/unit/composables/useDTMF.test.ts
```

### Integration Tests

```bash
# Run all integration tests
pnpm test:integration
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (recommended for debugging)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Run in debug mode
pnpm test:e2e:debug

# Run specific browser
pnpm test:e2e:chromium
pnpm test:e2e:firefox
pnpm test:e2e:webkit

# View test report
pnpm test:e2e:report
```

### Performance Tests

```bash
# Run performance tests
pnpm test:performance

# Run performance benchmarks
pnpm test:performance:bench

# Run with garbage collection profiling
pnpm test:performance:gc
```

### Coverage

```bash
# Generate coverage report
pnpm coverage

# Generate unit test coverage only
pnpm coverage:unit
```

---

## Writing Unit Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useDTMF } from '@/composables/useDTMF'

describe('useDTMF', () => {
  let mockSession: any

  beforeEach(() => {
    // Setup before each test
    mockSession = {
      id: 'test-session',
      sendDTMF: vi.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks()
  })

  it('should queue DTMF tones', () => {
    const sessionRef = ref(mockSession)
    const { queueTone, queuedTones } = useDTMF(sessionRef)

    queueTone('1')
    queueTone('2')

    expect(queuedTones.value).toEqual(['1', '2'])
  })
})
```

### Testing Composables

```typescript
import { ref } from 'vue'
import { useCallHistory } from '@/composables/useCallHistory'

describe('useCallHistory', () => {
  it('should track call history', async () => {
    const { calls, addCall, clearHistory } = useCallHistory()

    await addCall({
      id: 'call-1',
      direction: 'outbound',
      number: '1234',
      duration: 120,
      timestamp: new Date()
    })

    expect(calls.value).toHaveLength(1)
    expect(calls.value[0].number).toBe('1234')

    clearHistory()
    expect(calls.value).toHaveLength(0)
  })
})
```

### Mocking Dependencies

```typescript
// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock external library
vi.mock('jssip', () => ({
  UA: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    register: vi.fn(),
  })),
}))
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const { connect, isConnected } = useSipClient(config)

  const promise = connect()
  expect(isConnected.value).toBe(false)

  await promise
  expect(isConnected.value).toBe(true)
})
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  const mockSession = {
    sendDTMF: vi.fn().mockRejectedValue(new Error('Send failed')),
  }

  const sessionRef = ref(mockSession)
  const { sendTone, lastError } = useDTMF(sessionRef)

  await sendTone('1')

  expect(lastError.value).toBeInstanceOf(Error)
  expect(lastError.value?.message).toBe('Send failed')
})
```

---

## Writing Integration Tests

Integration tests verify that multiple components work together correctly.

### Example: Call Flow Integration

```typescript
import { describe, it, expect } from 'vitest'
import { useSipClient } from '@/composables/useSipClient'
import { useCallSession } from '@/composables/useCallSession'

describe('Call Flow Integration', () => {
  it('should complete outbound call workflow', async () => {
    // Setup SIP client
    const { connect, isConnected } = useSipClient(config)
    await connect()
    expect(isConnected.value).toBe(true)

    // Make call
    const { makeCall, currentCall } = useCallSession()
    await makeCall('1234')

    expect(currentCall.value).toBeDefined()
    expect(currentCall.value?.state).toBe('connecting')

    // Simulate call established
    // ... test continues
  })
})
```

---

## Writing E2E Tests

E2E tests use Playwright to test complete user workflows in a real browser.

### Basic E2E Test

```typescript
import { test, expect } from '@playwright/test'

test('user can make a call', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173')

  // Configure SIP settings
  await page.fill('[data-testid="sip-server"]', 'sip.example.com')
  await page.fill('[data-testid="sip-username"]', '1000')
  await page.fill('[data-testid="sip-password"]', 'secret')
  await page.click('[data-testid="connect-button"]')

  // Wait for connection
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected')

  // Make a call
  await page.fill('[data-testid="dialpad-input"]', '2000')
  await page.click('[data-testid="call-button"]')

  // Verify call state
  await expect(page.locator('[data-testid="call-status"]')).toContainText('Calling')
})
```

### Page Object Pattern

```typescript
// pages/dialpad.page.ts
export class DialpadPage {
  constructor(private page: Page) {}

  async dial(number: string) {
    await this.page.fill('[data-testid="dialpad-input"]', number)
    await this.page.click('[data-testid="call-button"]')
  }

  async getCallStatus() {
    return await this.page.locator('[data-testid="call-status"]').textContent()
  }
}

// test usage
test('user can make a call', async ({ page }) => {
  const dialpad = new DialpadPage(page)

  await dialpad.dial('2000')
  expect(await dialpad.getCallStatus()).toBe('Calling')
})
```

---

## Testing Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('should send DTMF tone', async () => {
  // Arrange
  const mockSession = { sendDTMF: vi.fn().mockResolvedValue(undefined) }
  const sessionRef = ref(mockSession)
  const { sendTone } = useDTMF(sessionRef)

  // Act
  await sendTone('1')

  // Assert
  expect(mockSession.sendDTMF).toHaveBeenCalledWith('1')
})
```

### Test Data Builders

```typescript
// tests/helpers/builders.ts
export function buildCallSession(overrides = {}) {
  return {
    id: 'test-session',
    state: 'active',
    direction: 'outbound',
    remoteNumber: '1234',
    ...overrides,
  }
}

// Usage
it('should handle active call', () => {
  const session = buildCallSession({ state: 'active' })
  expect(session.state).toBe('active')
})
```

### Fixture Reuse

```typescript
// tests/fixtures/sessions.ts
export const activeSessions = [
  { id: '1', state: 'active', number: '1234' },
  { id: '2', state: 'active', number: '5678' },
]

// Usage
import { activeSessions } from '../fixtures/sessions'

it('should list active sessions', () => {
  const { sessions } = useCallManagement()
  sessions.value = activeSessions

  expect(sessions.value).toHaveLength(2)
})
```

---

## Coverage Requirements

VueSIP maintains high code coverage standards:

- **Lines**: 80% minimum
- **Functions**: 80% minimum
- **Branches**: 75% minimum
- **Statements**: 80% minimum

### Viewing Coverage

```bash
# Generate coverage report
pnpm coverage

# Open HTML report
open coverage/index.html
```

### Coverage Tips

1. **Test Happy Paths**: Cover the main use cases first
2. **Test Error Cases**: Ensure error handling is tested
3. **Test Edge Cases**: Cover boundary conditions
4. **Test Integration Points**: Verify component interactions

---

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests.

```typescript
// ❌ Bad: Tests depend on execution order
let sharedState: any

it('test 1', () => {
  sharedState = { value: 1 }
})

it('test 2', () => {
  expect(sharedState.value).toBe(1) // Fails if test 1 doesn't run
})

// ✅ Good: Tests are isolated
it('test 1', () => {
  const state = { value: 1 }
  expect(state.value).toBe(1)
})

it('test 2', () => {
  const state = { value: 1 }
  expect(state.value).toBe(1)
})
```

### 2. Descriptive Test Names

```typescript
// ❌ Bad: Vague test name
it('works', () => { ... })

// ✅ Good: Descriptive test name
it('should queue DTMF tone when session is active', () => { ... })
```

### 3. One Assertion Concept Per Test

```typescript
// ❌ Bad: Testing multiple unrelated concepts
it('should handle calls', () => {
  expect(canMakeCall()).toBe(true)
  expect(canReceiveCall()).toBe(true)
  expect(canTransferCall()).toBe(true) // Unrelated
})

// ✅ Good: Focused tests
it('should allow making calls when connected', () => {
  expect(canMakeCall()).toBe(true)
})

it('should allow receiving calls when registered', () => {
  expect(canReceiveCall()).toBe(true)
})
```

### 4. Avoid Test Logic

```typescript
// ❌ Bad: Complex logic in test
it('should process all tones', () => {
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      queueTone(i.toString())
    }
  }
  expect(queuedTones.value.length).toBe(5)
})

// ✅ Good: Clear, straightforward test
it('should queue even number tones', () => {
  queueTone('0')
  queueTone('2')
  queueTone('4')
  queueTone('6')
  queueTone('8')

  expect(queuedTones.value).toEqual(['0', '2', '4', '6', '8'])
})
```

### 5. Use Test Utilities

```typescript
// Create reusable test utilities
// tests/helpers/test-utils.ts
export function waitForConnection(timeout = 5000) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (isConnected.value) {
        clearInterval(interval)
        resolve(true)
      }
    }, 100)

    setTimeout(() => {
      clearInterval(interval)
      resolve(false)
    }, timeout)
  })
}
```

### 6. Clean Up After Tests

```typescript
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

onUnmounted(() => {
  // Clean up subscriptions, timers, etc.
})
```

---

## Continuous Integration

Tests run automatically on every pull request:

1. **Lint Check**: ESLint validation
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Full unit test suite
4. **Integration Tests**: Integration test suite
5. **E2E Tests**: Critical user workflows (Chromium only)
6. **Coverage Check**: Enforce minimum coverage thresholds

---

## Debugging Tests

### Debug Unit Tests

```bash
# Run single test file in watch mode
pnpm vitest watch tests/unit/composables/useDTMF.test.ts

# Use debugger statements
it('should debug', () => {
  debugger // Will pause in Node debugger
  expect(true).toBe(true)
})
```

### Debug E2E Tests

```bash
# Run in debug mode
pnpm test:e2e:debug

# Run in headed mode to see browser
pnpm test:e2e:headed

# Use Playwright Inspector
PWDEBUG=1 pnpm test:e2e
```

---

## Common Issues

### Issue: Tests timing out

**Solution**: Increase timeout for slow tests

```typescript
it('slow test', async () => {
  // Test code
}, 10000) // 10 second timeout
```

### Issue: Flaky tests

**Solution**: Use proper waiting strategies

```typescript
// ❌ Bad: Hard-coded delay
await new Promise(resolve => setTimeout(resolve, 1000))

// ✅ Good: Wait for condition
await vi.waitFor(() => {
  expect(isConnected.value).toBe(true)
})
```

### Issue: Mock not working

**Solution**: Ensure mocks are set up before imports

```typescript
// Mocks must be at the top of the file
vi.mock('@/utils/logger')

import { useSipClient } from '@/composables/useSipClient'
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Vue Test Utils Guide](https://test-utils.vuejs.org/guide/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Questions or Issues?**

- Check existing tests in `tests/` for examples
- Review [Architecture Documentation](./architecture.md)
- Open a [GitHub Discussion](https://github.com/ironyh/VueSIP/discussions)
