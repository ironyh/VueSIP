# E2E Test Remediation Plan

## Executive Summary

The VueSIP project has a comprehensive E2E test suite using Playwright that has been failing since November 22, 2025. This plan outlines a systematic approach to fix all E2E tests, addressing root causes rather than symptoms.

**Current State**:
- 10 E2E spec files with ~150+ individual tests
- Tests target `playground/TestApp.vue` via `/?test=true` URL
- Mock infrastructure exists in `tests/e2e/fixtures.ts` (1174 lines)
- Tests run across 5 browser configurations (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)

**Failure Categories Identified**:
1. **Selector mismatches** - Tests expect elements that don't exist or have different test IDs
2. **Timing issues** - Race conditions and insufficient waits for async operations
3. **Mock infrastructure gaps** - WebSocket mocking incomplete for SIP protocol
4. **State management issues** - Tests don't properly reset or wait for app state
5. **Accessibility assertion failures** - axe-core violations in the UI

---

## Phase 1: Infrastructure Fixes (Priority: Critical)

### 1.1 Fix MockWebSocket Implementation

**Problem**: The mock WebSocket in `fixtures.ts` doesn't properly simulate SIP protocol messages.

**Files to modify**:
- `tests/e2e/fixtures.ts`

**Tasks**:
- [ ] Add proper SIP REGISTER/200 OK message simulation
- [ ] Implement INVITE/100 Trying/180 Ringing/200 OK flow
- [ ] Add BYE/200 OK for call termination
- [ ] Support OPTIONS keep-alive messages
- [ ] Add configurable delays for realistic timing

**Implementation**:
```typescript
// Add to MockWebSocket class
simulateRegistration(success: boolean = true) {
  if (success) {
    this.dispatchEvent('message', { data: 'SIP/2.0 200 OK\r\n...' })
  } else {
    this.dispatchEvent('message', { data: 'SIP/2.0 401 Unauthorized\r\n...' })
  }
}
```

### 1.2 Standardize Test Setup Fixtures

**Problem**: Tests have inconsistent setup patterns, some use mocks, some don't.

**Files to modify**:
- `tests/e2e/fixtures.ts`
- `tests/e2e/shared-setup.ts`

**Tasks**:
- [ ] Create standard `beforeAll` setup that initializes mocks
- [ ] Create `beforeEach` that resets app state between tests
- [ ] Ensure consistent mock initialization order
- [ ] Add health check before running tests

### 1.3 Fix waitFor Helper Functions

**Problem**: Custom wait functions timeout or use incorrect selectors.

**Files to modify**:
- `tests/e2e/fixtures.ts`

**Tasks**:
- [ ] Fix `waitForConnectionState` to use correct selector
- [ ] Fix `waitForRegistrationState` to match actual UI
- [ ] Add configurable timeout parameters
- [ ] Add retry logic with exponential backoff

---

## Phase 2: Test Stabilization (Priority: High)

### 2.1 Fix basic-call-flow.spec.ts

**File**: `tests/e2e/basic-call-flow.spec.ts`
**Tests**: 18 tests

**Issues**:
- Tests assume connected state without establishing connection first
- Missing mock SIP server responses
- Hardcoded selectors that don't match TestApp.vue

**Fixes**:
- [ ] Add proper connection setup in `beforeEach`
- [ ] Use `configureSip` fixture consistently
- [ ] Update selectors to match TestApp.vue data-testid attributes
- [ ] Add mock server responses for each test scenario

### 2.2 Fix error-scenarios.spec.ts

**File**: `tests/e2e/error-scenarios.spec.ts`
**Tests**: ~25 tests

**Issues**:
- Validation error expectations don't match actual UI messages
- Button state checks have timing issues

**Fixes**:
- [ ] Update expected error messages to match implementation
- [ ] Add proper waits for button state changes
- [ ] Use `toBeDisabled()` with timeout options

### 2.3 Fix accessibility.spec.ts

**File**: `tests/e2e/accessibility.spec.ts`
**Tests**: ~25 tests

**Issues**:
- axe-core violations need to be fixed in the UI
- Missing ARIA labels on some elements
- Color contrast issues

**Fixes**:
- [ ] Add missing `aria-label` attributes to TestApp.vue buttons
- [ ] Fix heading hierarchy (h1 > h2 > h3)
- [ ] Add `role` attributes where needed
- [ ] Add ARIA live regions for status announcements
- [ ] Fix color contrast violations

### 2.4 Fix incoming-call.spec.ts

**File**: `tests/e2e/incoming-call.spec.ts`
**Tests**: ~13 tests

**Issues**:
- No mechanism to simulate incoming SIP INVITE
- Mock WebSocket doesn't trigger incoming call UI

**Fixes**:
- [ ] Add `simulateIncomingCall` fixture function
- [ ] Implement INVITE message simulation in MockWebSocket
- [ ] Add proper session state tracking

### 2.5 Fix av-quality.spec.ts

**File**: `tests/e2e/av-quality.spec.ts`
**Tests**: ~20 tests

**Issues**:
- MediaStream API not properly mocked
- WebRTC stats not available in mock context

**Fixes**:
- [ ] Enhance mock MediaStream with getAudioTracks/getVideoTracks
- [ ] Add mock RTCPeerConnection with getStats support
- [ ] Simulate audio levels and video dimensions

### 2.6 Fix network-conditions.spec.ts

**File**: `tests/e2e/network-conditions.spec.ts`
**Tests**: ~15 tests

**Issues**:
- Network condition simulation incomplete
- Reconnection logic not properly tested

**Fixes**:
- [ ] Use Playwright's `page.context().setOffline()` correctly
- [ ] Add delays for reconnection attempts
- [ ] Verify WebSocket close/open events

### 2.7 Fix performance.spec.ts

**File**: `tests/e2e/performance.spec.ts`
**Tests**: ~20 tests

**Issues**:
- Performance API access issues in browser context
- Unrealistic thresholds for CI environment

**Fixes**:
- [ ] Use `page.evaluate()` to access performance metrics
- [ ] Adjust thresholds for CI (slower than local)
- [ ] Add retry logic for flaky performance tests
- [ ] Skip some performance tests in CI (`test.skip(process.env.CI)`)

### 2.8 Fix visual-regression.spec.ts

**File**: `tests/e2e/visual-regression.spec.ts`
**Tests**: ~20 tests

**Issues**:
- Baseline screenshots may not exist
- Font rendering differences across platforms

**Fixes**:
- [ ] Generate baseline screenshots in CI
- [ ] Add platform-specific screenshot comparisons
- [ ] Increase threshold for acceptable visual differences
- [ ] Focus on layout rather than pixel-perfect matching

### 2.9 Fix multi-user.spec.ts

**File**: `tests/e2e/multi-user.spec.ts`
**Tests**: ~12 tests

**Issues**:
- Multi-page coordination complex
- Mock server doesn't support multiple clients

**Fixes**:
- [ ] Implement shared mock state between browser contexts
- [ ] Add proper call routing simulation
- [ ] Use Playwright's `browser.newContext()` correctly

### 2.10 Fix app-functionality.spec.ts

**File**: `tests/e2e/app-functionality.spec.ts`
**Tests**: ~20 tests

**Issues**:
- General functionality tests with selector mismatches
- State management issues

**Fixes**:
- [ ] Audit all selectors against TestApp.vue
- [ ] Add proper state waits
- [ ] Split complex tests into smaller units

---

## Phase 3: UI Accessibility Fixes (Priority: High)

### 3.1 Fix TestApp.vue Accessibility

**File**: `playground/TestApp.vue`

**Tasks**:
- [ ] Add `aria-label` to all icon-only buttons
- [ ] Add `aria-live="polite"` regions for status updates
- [ ] Ensure form inputs have associated labels
- [ ] Add proper heading hierarchy
- [ ] Add `role="alert"` to error messages
- [ ] Add keyboard navigation support (Tab order, Enter/Space for buttons)

### 3.2 Add ARIA Live Regions

```vue
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {{ connectionStatus }} - {{ registrationStatus }}
</div>
```

### 3.3 Fix Error Message Accessibility

```vue
<div
  v-if="lastError"
  data-testid="error-message"
  role="alert"
  aria-live="assertive"
  class="error-message"
>
  {{ lastError }}
</div>
```

---

## Phase 4: Test Modernization (Priority: Medium)

### 4.1 Improve Test Organization

**Tasks**:
- [ ] Group related tests into test suites
- [ ] Use `test.describe.configure({ mode: 'serial' })` for dependent tests
- [ ] Add test tags for filtering (`@smoke`, `@regression`, `@accessibility`)

### 4.2 Add Test Retry Configuration

```typescript
// playwright.config.ts
retries: process.env.CI ? 3 : 1,
timeout: 60000, // Increase for CI
```

### 4.3 Implement Page Object Model

**New files**:
- `tests/e2e/pages/SipClientPage.ts`
- `tests/e2e/pages/SettingsPanel.ts`
- `tests/e2e/pages/CallControls.ts`

```typescript
// tests/e2e/pages/SipClientPage.ts
export class SipClientPage {
  constructor(private page: Page) {}

  async connect(config: SipConfig) {
    await this.openSettings()
    await this.fillConfig(config)
    await this.clickConnect()
    await this.waitForConnection()
  }

  async makeCall(destination: string) {
    await this.page.fill(SELECTORS.DIALPAD.NUMBER_INPUT, destination)
    await this.page.click(SELECTORS.DIALPAD.CALL_BUTTON)
    await this.waitForCallState('active')
  }
}
```

### 4.4 Add Comprehensive Test Documentation

**Update**: `tests/e2e/README.md`

**Tasks**:
- [ ] Document all fixtures and their usage
- [ ] Add troubleshooting guide for common failures
- [ ] Document mock server capabilities
- [ ] Add examples for each test category

---

## Implementation Priority Order

### Week 1: Critical Infrastructure
1. Fix MockWebSocket SIP protocol simulation
2. Fix waitFor helper functions
3. Fix basic-call-flow.spec.ts (core functionality)

### Week 2: Accessibility & Errors
4. Fix TestApp.vue accessibility issues
5. Fix accessibility.spec.ts
6. Fix error-scenarios.spec.ts

### Week 3: Call Scenarios
7. Fix incoming-call.spec.ts
8. Fix av-quality.spec.ts
9. Fix network-conditions.spec.ts

### Week 4: Advanced Tests
10. Fix performance.spec.ts
11. Fix visual-regression.spec.ts
12. Fix multi-user.spec.ts
13. Fix app-functionality.spec.ts

### Week 5: Polish & Documentation
14. Implement Page Object Model
15. Add test retry configuration
16. Update documentation

---

## Success Criteria

- [ ] All E2E tests pass on CI (Chromium)
- [ ] 90%+ tests pass on Firefox and WebKit
- [ ] 85%+ tests pass on Mobile Chrome and Mobile Safari
- [ ] No axe-core accessibility violations (WCAG 2.1 AA)
- [ ] Test execution time < 10 minutes on CI
- [ ] Zero flaky tests (pass/fail consistency)

---

## Quick Wins (Can Fix Today)

1. **Add missing aria-labels** to TestApp.vue buttons
2. **Fix selector mismatches** in error-scenarios.spec.ts
3. **Add proper timeouts** to wait functions in fixtures.ts
4. **Skip known flaky tests** with `test.skip()` until fixed

---

## Technical Debt to Address

1. **Mock Infrastructure**: The 1174-line fixtures.ts needs refactoring into smaller modules
2. **Test Data**: Move test data to separate files
3. **CI Optimization**: Add test sharding for faster execution
4. **Screenshot Management**: Implement proper baseline management

---

## Files Summary

| File | Tests | Priority | Estimated Effort |
|------|-------|----------|------------------|
| basic-call-flow.spec.ts | 18 | Critical | 4 hours |
| error-scenarios.spec.ts | 25 | High | 3 hours |
| accessibility.spec.ts | 25 | High | 6 hours (includes UI fixes) |
| incoming-call.spec.ts | 13 | High | 4 hours |
| av-quality.spec.ts | 20 | Medium | 4 hours |
| network-conditions.spec.ts | 15 | Medium | 3 hours |
| performance.spec.ts | 20 | Medium | 4 hours |
| visual-regression.spec.ts | 20 | Low | 3 hours |
| multi-user.spec.ts | 12 | Low | 4 hours |
| app-functionality.spec.ts | 20 | Medium | 4 hours |
| fixtures.ts (infrastructure) | - | Critical | 6 hours |
| TestApp.vue (accessibility) | - | High | 4 hours |

**Total Estimated Effort**: ~49 hours

---

## Next Steps

1. Review and approve this plan
2. Create GitHub issues for each phase
3. Begin Phase 1 infrastructure fixes
4. Run tests locally to verify fixes before pushing
