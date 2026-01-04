# VueSIP Test Suite - Quick Reference Card

**Last Updated:** 2025-12-03
**Status:** ✅ Production Ready

---

## Quick Test Commands

### Run All Tests
```bash
# Full test suite (unit + integration)
pnpm test:unit && pnpm test:integration

# With coverage
pnpm run coverage:unit
```

### Run Specific Tests
```bash
# Single test file
pnpm test:unit tests/unit/composables/useSipClient.test.ts

# Watch mode
pnpm run test:unit:watch

# Integration tests only
pnpm test:integration
```

### E2E Tests
```bash
# Smoke tests (fast)
pnpm run test:e2e:smoke

# Full E2E suite
pnpm run test:e2e

# With UI
pnpm run test:e2e:ui

# Debug mode
pnpm run test:e2e:debug
```

---

## Quick Status Check

### Current Metrics (2025-12-03)
```
✅ Unit Tests:        2,797/2,797 passed (100%)
✅ Integration Tests: 178/178 passed (100%)
✅ Code Coverage:     80.55% (target: 80%)
✅ Flakiness:         0% (target: <1%)
✅ Execution Time:    45.5s (target: <60s)
```

### CI Workflows
```
✅ test.yml:          Unit + Integration + Coverage
✅ e2e-tests.yml:     E2E across 5 browsers
✅ docs.yml:          Documentation build
```

---

## Before Committing

### Checklist
- [ ] Run `pnpm test:unit`
- [ ] Run `pnpm test:integration`
- [ ] Run `pnpm run lint`
- [ ] Run `pnpm run typecheck`
- [ ] Check coverage hasn't decreased

### One-Liner
```bash
pnpm run build && pnpm test:unit && pnpm test:integration && pnpm run lint && pnpm run typecheck
```

---

## Debugging Failed Tests

### Local Debugging
```bash
# Run single test with output
pnpm test:unit tests/unit/path/to/test.ts

# Run with watch mode for rapid iteration
pnpm run test:unit:watch

# Run E2E in headed mode (see browser)
pnpm run test:e2e:headed

# Run E2E with debugger
pnpm run test:e2e:debug
```

### CI Debugging
1. Check GitHub Actions logs
2. Download test artifacts (screenshots, videos)
3. Review coverage reports
4. Check test timing data

---

## Common Issues

### Issue: Tests pass locally but fail in CI
**Solution:**
- Check for timing dependencies (use `vi.useFakeTimers()`)
- Verify no global state pollution
- Check for race conditions

### Issue: Flaky test
**Solution:**
```typescript
// ❌ Bad: Race condition
test('updates state', () => {
  updateState()
  expect(state.value).toBe('updated')
})

// ✅ Good: Proper async
test('updates state', async () => {
  await updateState()
  await waitFor(() => expect(state.value).toBe('updated'))
})
```

### Issue: Slow test
**Solution:**
```typescript
// ❌ Bad: Real timers
await new Promise(resolve => setTimeout(resolve, 1000))

// ✅ Good: Fake timers
vi.useFakeTimers()
vi.advanceTimersByTime(1000)
vi.useRealTimers()
```

---

## Coverage Targets

### Current Coverage
```
Lines:       80.55% ✅
Branches:    68.47% ⚠️  (target: 75%)
Functions:   84.29% ✅
Statements:  81.45% ✅
```

### By Category
```
Composables: 86.18% ✅
Plugins:     90.66% ✅
Stores:      91.56% ✅
Utils:       92.68% ✅
Core:        54.59% ⚠️  (acceptable - covered by integration)
```

---

## Test File Organization

```
tests/
├── unit/              # Fast, isolated unit tests (~32s)
│   ├── composables/   # Vue composables
│   ├── core/          # Core classes
│   ├── stores/        # State management
│   ├── plugins/       # Plugin system
│   └── utils/         # Utilities
├── integration/       # Multi-component tests (~13s)
│   ├── sip-workflow/  # SIP call flows
│   ├── conference/    # Conference scenarios
│   └── network/       # Network resilience
└── e2e/              # Browser tests (~5-10min)
    ├── basic-flow/    # Core user journeys
    ├── advanced/      # Complex scenarios
    └── regression/    # Bug prevention
__mocks__/
└── jssip.ts          # Shared JsSIP mock for all SipClient tests
```

---

## JsSIP Mock Pattern

### Using the Shared Mock
All SipClient tests should use the shared mock at `__mocks__/jssip.ts`:

```typescript
// 1. Enable automatic mocking
vi.mock('jssip')

// 2. Import helpers you need
import { mockUA, resetMockJsSip, triggerEvent } from 'jssip'

describe('SipClient', () => {
  beforeEach(() => {
    resetMockJsSip()  // Always reset between tests
  })
})
```

### Available Exports
```typescript
// Core mocks
mockUA                  // Mock User Agent
mockSession             // Mock RTC Session
mockWebSocketInterface  // Mock WebSocket

// Event handlers (for accessing registered callbacks)
eventHandlers           // Regular event handlers
onceHandlers            // One-time event handlers
sessionHandlers         // Session event handlers

// Utilities
resetMockJsSip()        // Reset all mocks and handlers
triggerEvent(name, data) // Trigger UA event
triggerSessionEvent(name, data) // Trigger session event
simulateConnect()       // Simulate successful connection
terminateSessions()     // Clean up active sessions
```

### Common Patterns

#### Simulate Connection
```typescript
beforeEach(() => {
  resetMockJsSip()
  mockUA.isConnected.mockReturnValue(true)
})

// In test
await startClient()
triggerEvent('connected', { socket: { url: 'wss://...' } })
```

#### Mock sendRequest (PUBLISH/SUBSCRIBE)
```typescript
mockUA.sendRequest.mockImplementation((method, uri, options) => {
  setTimeout(() => {
    options.eventHandlers.onSuccessResponse({ status_code: 200 })
  }, 10)
})
```

#### Simulate Incoming Call
```typescript
const mockIncomingSession = { /* session config */ }
triggerEvent('newRTCSession', {
  originator: 'remote',
  session: mockIncomingSession
})
```

### Migration Checklist
When migrating tests to use the shared mock:
- [ ] Replace `vi.mock('jssip', () => { ... })` with `vi.mock('jssip')`
- [ ] Remove `vi.hoisted()` blocks
- [ ] Add imports from `'jssip'` for needed helpers
- [ ] Use `resetMockJsSip()` in `beforeEach`
- [ ] Remove redundant mock definitions

---

## Test Writing Guidelines

### Good Test Example
```typescript
describe('useSipClient', () => {
  beforeEach(() => {
    // Minimal setup - only what this test needs
  })

  it('should connect to SIP server with valid credentials', async () => {
    // Arrange: Set up test data
    const { connect, isConnected } = useSipClient()

    // Act: Perform action
    await connect({ uri: 'sip:user@domain.com', password: 'pass' })

    // Assert: Verify result
    expect(isConnected.value).toBe(true)
  })

  afterEach(() => {
    // Clean up resources
    vi.clearAllMocks()
  })
})
```

### Test Naming Convention
```typescript
// Format: should [expected behavior] when [condition]
it('should connect successfully when credentials are valid')
it('should throw error when credentials are invalid')
it('should reconnect automatically when connection drops')
```

---

## CI/CD Pipeline

### Workflow Triggers
```yaml
test.yml:       push (main/develop/claude/**), PR
e2e-tests.yml:  push, PR, manual
docs.yml:       push (main), manual
```

### Expected CI Times
```
Build:            ~2 minutes
Unit Tests:       ~1 minute
Integration:      ~30 seconds
E2E (Chromium):   ~5-10 minutes
E2E (All):        ~15-20 minutes (parallel)
Total:            ~3-5 minutes (unit + integration)
```

---

## Getting Help

### Documentation
- **Full Report:** TEST_VALIDATION_REPORT.md
- **Best Practices:** FINAL_RECOMMENDATIONS.md
- **This Guide:** TEST_QUICK_REFERENCE.md

### Common Commands Reference
```bash
# Test commands
pnpm test                        # All tests
pnpm test:unit                   # Unit tests only
pnpm test:integration           # Integration tests only
pnpm test:e2e                   # E2E tests
pnpm run test:watch             # Watch mode

# Coverage
pnpm run coverage               # Full coverage
pnpm run coverage:unit          # Unit test coverage

# Quality checks
pnpm run lint                   # ESLint
pnpm run typecheck              # TypeScript
pnpm run build                  # Build package

# E2E specific
pnpm run test:e2e:smoke         # Fast smoke tests
pnpm run test:e2e:ui            # With UI
pnpm run test:e2e:debug         # Debug mode
pnpm run test:e2e:headed        # See browser
```

---

## Key Files

### Configuration
- `vite.config.ts` - Vitest configuration (test section)
- `playwright.config.ts` - Playwright E2E configuration
- `tests/setup.ts` - Global test setup
- `.github/workflows/*.yml` - CI workflows

### Test Utilities
- `tests/unit/test-utilities.test.ts` - Helper functions
- `tests/unit/utils/mockFactories.ts` - Mock data factories
- `tests/e2e/reporters/custom-reporter.ts` - Custom reporter

---

## Performance Tips

### Speed Up Tests
1. **Mock External Deps:** Don't make real API calls
2. **Use Fake Timers:** Avoid real setTimeout/setInterval
3. **Parallel Execution:** Enabled by default in config
4. **Minimal Setup:** Only set up what's needed
5. **Efficient Assertions:** Use specific matchers

### Current Performance
```
Unit Tests:        32.5s  (86 tests/second)
Integration Tests: 13.0s  (13.7 tests/second)
Total:            45.5s  (65.4 tests/second)
```

---

## Status Legend

- ✅ **Passing:** All tests pass, meets targets
- ⚠️ **Warning:** Passing but close to threshold
- ❌ **Failing:** Tests fail or below threshold
- 🔄 **In Progress:** Work in progress
- 📋 **Planned:** Future enhancement

---

## Quick Links

### Reports
- [Validation Report](./TEST_VALIDATION_REPORT.md) - Complete validation
- [Recommendations](./FINAL_RECOMMENDATIONS.md) - Best practices
- [Summary](./VALIDATION_SUMMARY.md) - Executive summary

### Coverage Reports
- HTML: `coverage/index.html`
- JSON: `coverage/coverage-final.json`

### CI Workflows
- [test.yml](../.github/workflows/test.yml)
- [e2e-tests.yml](../.github/workflows/e2e-tests.yml)

---

**Quick Status:** ✅ All systems operational
**Last Validated:** 2025-12-03
**Next Review:** As needed

---
