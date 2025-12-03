# VueSIP Test Infrastructure - Priority Action Items

**Date**: 2025-12-03
**Status**: Tests Currently Passing (706/706)
**Priority**: Proactive Hardening

---

## 🔴 HIGH PRIORITY - Critical for Production Readiness

### 1. Make Integration Tests Blocking in CI
**Effort**: 30 minutes | **Risk**: Low | **Impact**: High

**Problem**: Integration tests have `continue-on-error: true`, allowing failures to pass silently.

**File**: `.github/workflows/test.yml` line 56

**Current**:
```yaml
- name: Run integration tests
  run: pnpm run test:integration
  continue-on-error: true
```

**Fix**:
```yaml
- name: Run integration tests
  run: pnpm run test:integration
```

**Verification**:
```bash
# Locally test integration tests pass
pnpm run test:integration

# Push to feature branch and verify CI fails on integration errors
git checkout -b test/verify-integration-blocking
# Make above change
git add .github/workflows/test.yml
git commit -m "fix(ci): make integration tests blocking"
git push
```

**Impact**: Catch integration issues immediately instead of discovering them later.

---

### 2. Make Performance Tests Blocking in CI
**Effort**: 1 hour | **Risk**: Medium | **Impact**: High

**Problem**: Performance metrics tests have `continue-on-error: true`, masking regressions.

**Files**: `.github/workflows/test.yml` lines 98, 102

**Current**:
```yaml
- name: Run performance load tests (with GC)
  run: node --expose-gc ./node_modules/vitest/vitest.mjs run tests/performance/load-tests
  continue-on-error: true

- name: Run performance metrics tests
  run: pnpm run test:performance:metrics
  continue-on-error: true
```

**Fix**:
```yaml
- name: Run performance load tests (with GC)
  run: node --expose-gc ./node_modules/vitest/vitest.mjs run tests/performance/load-tests

- name: Run performance metrics tests
  run: pnpm run test:performance:metrics
```

**Note**: Keep benchmarks (line 94) with `continue-on-error: true` as they're experimental.

**Verification**:
```bash
# Locally verify tests pass
pnpm run test:performance:metrics
node --expose-gc ./node_modules/vitest/vitest.mjs run tests/performance/load-tests

# Test in CI
git checkout -b test/verify-performance-blocking
# Make changes
git commit -am "fix(ci): make performance metrics tests blocking"
git push
```

**Impact**: Catch performance regressions in bundle size, memory leaks, and metrics.

---

### 3. Apply Memory-Saving Flags in All CI Environments
**Effort**: 30 minutes | **Risk**: Low | **Impact**: High

**Problem**: `--single-process` flag only applied when `CONTAINER` env var is set, which GitHub Actions doesn't set by default.

**File**: `playwright.config.ts` line 49

**Current**:
```typescript
// Only use single-process in strict CI containers to avoid memory exhaustion
...(process.env.CI && process.env.CONTAINER ? ['--single-process', '--no-zygote'] : []),
```

**Fix**:
```typescript
// Use single-process in all CI environments to prevent memory exhaustion
...(process.env.CI ? ['--single-process', '--no-zygote'] : []),
```

**Rationale**:
- GitHub Actions runners have 7GB RAM
- 4 parallel workers + Chromium instances can approach memory limits
- Single-process mode prevents OOM errors at minimal performance cost

**Verification**:
```bash
# Test locally with CI env var
CI=true pnpm exec playwright test --project=chromium

# Test in CI
git checkout -b test/verify-memory-flags
# Make changes
git commit -am "fix(e2e): apply memory-saving flags in all CI environments"
git push
```

**Impact**: Prevent potential out-of-memory failures in GitHub Actions.

---

## 🟡 MEDIUM PRIORITY - Performance & Coverage

### 4. Enable Test Sharding for Chromium
**Effort**: 2 hours | **Risk**: Low | **Impact**: Medium

**Problem**: Chromium tests (201 tests) run sequentially, taking ~2.5 minutes. Sharding could reduce to ~1.5 minutes.

**File**: `.github/workflows/e2e-tests.yml` lines 18-19

**Current**:
```yaml
# Optional: Add sharding for chromium (largest test suite)
# shard: ${{ matrix.browser == 'chromium' && [1, 2] || [1] }}
```

**Fix**:
```yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, firefox, webkit]
    shard: [1, 1]  # Default: no sharding
    include:
      # Add sharding for chromium only
      - browser: chromium
        shard: 1
      - browser: chromium
        shard: 2
    exclude:
      # Remove default chromium entry to avoid duplication
      - browser: chromium
        shard: 1

# Then update test command
- name: Run E2E tests
  run: |
    if [ "${{ matrix.browser }}" = "chromium" ]; then
      pnpm exec playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}/2
    else
      pnpm exec playwright test --project=${{ matrix.browser }}
    fi
```

**Alternative (Simpler)**:
```yaml
# Just add shard parameter to matrix
matrix:
  include:
    - browser: chromium
      shard: 1/2
    - browser: chromium
      shard: 2/2
    - browser: firefox
      shard: 1/1
    - browser: webkit
      shard: 1/1

# Update test command
- name: Run E2E tests
  run: pnpm exec playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}
```

**Verification**:
```bash
# Test sharding locally
pnpm exec playwright test --project=chromium --shard=1/2
pnpm exec playwright test --project=chromium --shard=2/2

# Verify both shards cover all tests
pnpm exec playwright test --project=chromium --list | wc -l
```

**Impact**: 40% faster CI runs (2.5 min → 1.5 min for Chromium tests).

---

### 5. Document Cross-Browser Coverage Gaps
**Effort**: 2 hours | **Risk**: None | **Impact**: Medium

**Problem**: 46% of Chromium tests are excluded from WebKit/mobile, but gaps aren't documented.

**Action**: Create coverage matrix showing:
- Which E2E features lack cross-browser testing
- Which tests are Chromium-only
- Rationale for each exclusion

**File**: Create `docs/TEST_COVERAGE_MATRIX.md`

**Template**:
```markdown
# E2E Test Coverage Matrix

| Test File | Chromium | Firefox | WebKit | Mobile |
|-----------|----------|---------|--------|--------|
| accessibility.spec.ts | ✅ 24 | ✅ 24 | ✅ 24 | ✅ 24 |
| app-functionality.spec.ts | ✅ 33 | ✅ 33 | ✅ 33 | ✅ 33 |
| basic-call-flow.spec.ts | ✅ 19 | ✅ 19 | ❌ 0 | ❌ 0 |
| incoming-call.spec.ts | ✅ 12 | ❌ 0 | ❌ 0 | ❌ 0 |
| multi-user.spec.ts | ✅ 12 | ❌ 0 | ❌ 0 | ❌ 0 |
| network-conditions.spec.ts | ✅ 18 | ✅ 18 | ✅ 18 | ✅ 18 |
| visual-regression.spec.ts | ✅ 17 | ❌ 0 | ❌ 0 | ❌ 0 |
| performance.spec.ts | ✅ 20 | ❌ 0 | ❌ 0 | ❌ 0 |

## Features Lacking Cross-Browser Coverage

### Call Handling (basic-call-flow.spec.ts)
- **Tests**: 19 tests (outbound calls, DTMF, hold, transfer)
- **Coverage**: Chromium only
- **Reason**: Mock WebSocket timing issues on WebKit/mobile
- **Risk**: Medium - core calling functionality
- **Mitigation**: Consider real SIP server integration tests

### Incoming Calls (incoming-call.spec.ts)
- **Tests**: 12 tests (inbound calls, call waiting)
- **Coverage**: Chromium, WebKit only
- **Reason**: Mock WebSocket timing issues on Firefox/mobile
- **Risk**: High - critical functionality
- **Mitigation**: High priority for real SIP testing
```

**Impact**: Clear understanding of test coverage limitations.

---

## 🟢 LOW PRIORITY - Nice to Have

### 6. Set Up Test Failure Alerting
**Effort**: 4 hours | **Risk**: None | **Impact**: Low

**Problem**: No automated notifications when tests fail in CI.

**Action**: Configure Slack/Discord webhook for test failures.

**Implementation**:

1. **Add webhook secret to GitHub**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add `SLACK_WEBHOOK_URL` or `DISCORD_WEBHOOK_URL`

2. **Update workflow to send notifications**:
```yaml
# In .github/workflows/e2e-tests.yml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "❌ E2E Tests Failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*E2E Tests Failed* on `${{ github.ref }}`\n*Commit*: ${{ github.event.head_commit.message }}\n*Author*: ${{ github.actor }}\n*Workflow*: ${{ github.workflow }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
            }
          }
        ]
      }'
```

3. **Test locally**:
```bash
# Export webhook URL (for testing only)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Simulate failure notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test notification from VueSIP"}'
```

**Note**: Custom reporter already has webhook support in code (line 252-274 of custom-reporter.ts), just needs webhook URL configured.

**Impact**: Faster response to test failures.

---

### 7. Optimize Slow Tests
**Effort**: 6-8 hours | **Risk**: Medium | **Impact**: Low

**Problem**: 50+ tests take >5 seconds (see TEST_INFRASTRUCTURE_ANALYSIS.md).

**Slowest Tests**:
1. "elevator scenario" - 8.6s (network simulation)
2. "debug registration flow" - 8.5s (extra logging)
3. "multiple incoming calls" - 7.1s (complex scenario)
4. "accessibility during active call" - 7.8s (axe-core)

**Optimization Strategies**:

**For network simulation tests**:
```typescript
// In fixtures.ts - reduce delays for non-critical tests
const FAST_MODE_DELAYS = {
  CONNECTION: 10,  // Reduced from 20ms
  REGISTER_200: 15,  // Reduced from 30ms
  INVITE_100: 10,  // Reduced from 20ms
  INVITE_180: 25,  // Reduced from 50ms
  INVITE_200: 25,  // Reduced from 50ms
}

// Apply in test setup
await mockSipServer({ fastMode: true })
```

**For accessibility tests**:
```typescript
// Run only critical accessibility rules
await checkA11y(page, {
  rules: {
    // Disable slower rules that aren't critical
    'color-contrast': { enabled: false },
    'image-alt': { enabled: true },
    'label': { enabled: true },
  }
})
```

**Impact**: Reduce test suite time from 2.5 min to ~2 min (20% improvement).

---

### 8. Implement Real SIP Server Integration Tests
**Effort**: 3-5 days | **Risk**: High | **Impact**: High (Long-term)

**Problem**: Mock WebSocket can't fully simulate real-world SIP scenarios, especially timing and codec negotiation.

**Action**: Implement real SIP server tests as documented in E2E_SKIPPED_TESTS_PLAN.md (CS-3).

**Options**:
1. **Obeject** - Open-source test SIP server
2. **Kamailio** - Production-grade SIP proxy
3. **FreeSWITCH** - Full-featured SIP server

**Implementation Plan**:

**Phase 1**: Docker Compose Setup (1 day)
```yaml
# docker-compose.test.yml
services:
  asterisk:
    image: andrius/asterisk
    ports:
      - "5060:5060/udp"
      - "10000-10099:10000-10099/udp"
    volumes:
      - ./tests/e2e/sip-config:/etc/asterisk
```

**Phase 2**: Test Configuration (1 day)
```typescript
// tests/e2e/real-sip.config.ts
export const REAL_SIP_CONFIG = {
  uri: 'sip:test@localhost',
  password: 'test123',
  server: 'ws://localhost:8088/ws',
  stunServers: ['stun:stun.l.google.com:19302'],
}
```

**Phase 3**: Integration Tests (2-3 days)
```typescript
// tests/e2e/real-sip.spec.ts
test.describe('Real SIP Integration', () => {
  test('should register with real Asterisk server', async ({ page }) => {
    // Test with real server
  })
})
```

**Benefits**:
- True end-to-end testing
- Real codec negotiation
- Actual network behavior
- Full cross-browser support

**Challenges**:
- CI environment setup complexity
- Longer test execution time
- Flakiness from real network

**Recommendation**: Start with docker-compose setup, run real SIP tests weekly (not on every commit).

---

## Implementation Timeline

### Week 1: Critical Items (HIGH Priority)
**Days 1-2**:
- [ ] Make integration tests blocking (30 min)
- [ ] Make performance tests blocking (1 hour)
- [ ] Apply memory-saving flags in CI (30 min)
- [ ] Test all changes in feature branch (2 hours)
- [ ] Merge to main

**Days 3-5**:
- [ ] Enable test sharding for Chromium (2 hours)
- [ ] Test sharding in CI (1 hour)
- [ ] Monitor for issues (ongoing)

### Week 2: Documentation & Monitoring (MEDIUM Priority)
**Days 1-2**:
- [ ] Document cross-browser coverage gaps (2 hours)
- [ ] Create coverage matrix (2 hours)
- [ ] Add to repository README

**Days 3-5**:
- [ ] Set up test failure alerting (4 hours)
- [ ] Configure webhooks (1 hour)
- [ ] Test notifications (1 hour)

### Week 3: Optimization (LOW Priority)
**Days 1-3**:
- [ ] Identify slow test optimization opportunities (4 hours)
- [ ] Implement optimizations (4 hours)
- [ ] Verify improvements (2 hours)

### Long-Term: Real SIP Integration (3-5 days)
**Future sprint**:
- [ ] Set up Docker Compose with Asterisk
- [ ] Configure test users and extensions
- [ ] Implement real SIP integration tests
- [ ] Add to CI pipeline (weekly runs)

---

## Success Criteria

### HIGH Priority Items (Required for Production)
- [ ] Integration tests fail CI on errors (no continue-on-error)
- [ ] Performance tests fail CI on regressions (no continue-on-error)
- [ ] Memory-saving flags applied in all CI environments
- [ ] Zero test failures in CI after changes
- [ ] No increase in flaky tests

### MEDIUM Priority Items (Quality Improvements)
- [ ] Test sharding reduces CI time by 30-40%
- [ ] Coverage matrix documents all exclusions
- [ ] Cross-browser coverage gaps identified

### LOW Priority Items (Nice to Have)
- [ ] Automated alerts working for test failures
- [ ] Slow tests optimized (avg duration <4s)
- [ ] Real SIP integration tests implemented

---

## Verification Commands

### Before Making Changes
```bash
# Verify all tests currently pass
pnpm run test:unit
pnpm run test:integration
pnpm run test:performance:metrics
pnpm exec playwright test

# Check current CI config
cat .github/workflows/test.yml | grep continue-on-error
cat playwright.config.ts | grep CONTAINER
```

### After Making Changes
```bash
# Test locally
pnpm run test:unit
pnpm run test:integration
pnpm run test:performance:metrics
pnpm exec playwright test --project=chromium

# Test with CI environment
CI=true pnpm exec playwright test --project=chromium

# Push to feature branch and monitor CI
git checkout -b test/infrastructure-hardening
git add .
git commit -m "fix(ci): harden test infrastructure"
git push origin test/infrastructure-hardening

# Check GitHub Actions results
gh run list --workflow=test.yml --limit=1
gh run list --workflow=e2e-tests.yml --limit=1
```

### Rollback Plan
```bash
# If issues arise, revert changes
git revert HEAD
git push

# Or force push previous commit
git reset --hard HEAD~1
git push --force
```

---

## Notes

### Why These Priorities?

**HIGH Priority** items address **silent failures** that could mask real issues:
- Integration tests failing silently = broken features shipped to production
- Performance tests failing silently = bundle size bloat, memory leaks undetected
- Memory issues in CI = flaky tests and mysterious failures

**MEDIUM Priority** items improve **efficiency and visibility**:
- Test sharding = faster feedback loop for developers
- Coverage documentation = informed decisions about test expansion

**LOW Priority** items are **nice to have**:
- Alerting = convenience (CI already shows failures)
- Optimization = marginal time savings (tests already fast)

### Current Infrastructure Health

**Overall Grade**: A (excellent)

**Why not A+?**
- Silent failures possible (continue-on-error)
- No test sharding (minor performance issue)
- Limited cross-browser E2E coverage (documented limitation)

**After HIGH priority items**: A+

---

## Contact & Support

For questions or issues with test infrastructure:
- Review: `/home/irony/code/VueSIP/claudedocs/TEST_INFRASTRUCTURE_ANALYSIS.md`
- Check: Latest test results in `/home/irony/code/VueSIP/test-results/`
- Reference: E2E_TEST_REMEDIATION_PLAN.md and E2E_SKIPPED_TESTS_PLAN.md

---

**Action Items Document End**
