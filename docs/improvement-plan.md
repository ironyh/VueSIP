# VueSIP Improvement Plan

**Generated**: 2026-01-04
**Branch**: feat/sip-library-adapters
**Method**: Multi-agent orchestrated analysis with ralph-loop execution

---

## Executive Summary

Three specialist agents analyzed the codebase and identified **17 improvement tasks** across:
- **Test Stability**: 8 tasks (timing, mocks, CI monitoring)
- **Benchmark Quality**: 5 tasks (async handling, baselines, CI)
- **Mock Architecture**: 4 tasks (consolidation, patterns)

**Total Estimated Effort**: 40-55 hours
**Expected Outcomes**:
- CI stability improvement from 80% → 95%+
- 750+ lines of mock code reduction
- Automated benchmark regression detection

---

## Ralph-Loop Execution Plan

### Iteration Structure

Each iteration follows: `analyze → implement → test → commit`

Completion criteria: All tests pass + changes committed

---

## Phase 1: Test Timing Stability (P0)

### Iteration 1.1: SipClient Fake Timers Refactor

**Objective**: Eliminate timing-dependent flakiness in SipClient tests

**Files**:
- `tests/unit/SipClient.test.ts` (lines 198-210, 414-434)

**Tasks**:
1. Create isolated `describe('timeout scenarios')` block
2. Move fake timer setup to beforeEach for timeout tests
3. Replace `setTimeout(() => triggerEvent(...), 10)` with synchronous mock triggers
4. Use `vi.advanceTimersByTimeAsync()` for async timer advancement
5. Ensure `vi.useRealTimers()` in afterEach

**Validation**:
```bash
pnpm test:unit tests/unit/SipClient.test.ts
# Must pass 3 consecutive runs without failure
```

**Completion Promise**: Tests pass 3x consecutively

---

### Iteration 1.2: AmiClient Fake Timers Refactor

**Objective**: Fix 6 timeout tests using real-time waits (50-100ms)

**Files**:
- `tests/unit/AmiClient.test.ts` (lines 275-290, 1021-1026, 1104-1108, 1229-1233, 1351-1355, 1405-1409)

**Tasks**:
1. Establish WebSocket connection BEFORE enabling fake timers
2. Create `describe('timeout scenarios')` with isolated timer management
3. Replace 50ms/100ms real waits with fake timer advancement
4. Remove 10000ms test timeout limits (no longer needed)

**Validation**:
```bash
pnpm test:unit tests/unit/AmiClient.test.ts
# Focus on timeout tests - must pass 3x
```

**Completion Promise**: All 6 timeout tests pass 3x consecutively

---

## Phase 2: Test Infrastructure (P1)

### Iteration 2.1: waitForCondition Consolidation

**Objective**: Single canonical async helper, eliminate arbitrary setTimeout patterns

**Files**:
- `tests/helpers/testUtils.ts` (extend existing)
- `tests/utils/test-helpers.ts` (add re-export)

**Tasks**:
1. Enhance `waitForCondition()` with description parameter
2. Add re-export from test-helpers.ts for backward compatibility
3. Replace `await new Promise(r => setTimeout(r, 50))` patterns in SipClient.test.ts

**Pattern**:
```typescript
// Before: await new Promise(r => setTimeout(r, 50))
// After:  await waitForCondition(() => handler.mock.calls.length > 0)
```

**Validation**:
```bash
pnpm test:unit
```

**Completion Promise**: No arbitrary setTimeout patterns in test assertions

---

### Iteration 2.2: JsSIP Mock Factory

**Objective**: Unified mock with event management, eliminate duplicate implementations

**Files to Create**:
- `tests/helpers/mocks/MockJsSipUA.ts`

**Files to Update**:
- `tests/unit/SipClient.test.ts`
- `tests/unit/SipClient.calls.test.ts`
- `tests/helpers/MockSipServer.ts`

**Tasks**:
1. Create MockJsSipUA class with:
   - Private handlers Map for event management
   - `trigger(event, data)` helper method
   - `simulateConnect()`, `simulateRegister()` convenience methods
   - `reset()` for cleanup
2. Create `createMockJsSipUA()` factory function
3. Update SipClient.test.ts to use factory (remove 60-line hoisted mock)
4. Update SipClient.calls.test.ts similarly

**Validation**:
```bash
pnpm test:unit tests/unit/SipClient*.test.ts
```

**Completion Promise**: All SipClient tests pass with new factory

---

### Iteration 2.3: Benchmark CI Integration

**Objective**: Run benchmarks in CI with JSON output

**Files**:
- `.github/workflows/test.yml` (performance-tests job)
- `package.json` (add script)

**Tasks**:
1. Add vitest bench JSON reporter configuration
2. Add `pnpm bench:ci` script
3. Update CI to run benchmarks with `--reporter=json`
4. Upload benchmark results as artifact

**Validation**:
```bash
pnpm bench:ci
# Verify JSON output generated
```

**Completion Promise**: CI workflow runs benchmarks and uploads results

---

### Iteration 2.4: Benchmark Baseline System

**Objective**: Detect performance regressions automatically

**Files to Create**:
- `scripts/benchmark-baseline.ts`
- `tests/performance/baselines/.gitkeep`

**Files to Update**:
- `package.json` (add scripts)
- `.github/workflows/test.yml`

**Tasks**:
1. Create baseline storage directory
2. Implement `benchmark-baseline.ts` with save/compare/update commands
3. Add npm scripts: `bench:save-baseline`, `bench:compare`
4. Add CI step to compare against baseline
5. Add PR comment with benchmark results (optional)

**Validation**:
```bash
pnpm bench:ci && node scripts/benchmark-baseline.ts save
node scripts/benchmark-baseline.ts compare
```

**Completion Promise**: Baseline comparison detects 10%+ regressions

---

## Phase 3: Mock Consolidation (P2)

### Iteration 3.1: WebRTC Mocks Consolidation

**Objective**: Single source for RTCPeerConnection, MediaStream, MediaStreamTrack mocks

**Files to Create**:
- `tests/helpers/mocks/webrtc-mocks.ts`

**Files to Update**:
- `tests/unit/CallSession.test.ts`
- `tests/unit/MediaManager.test.ts`

**Tasks**:
1. Create factory functions for all WebRTC primitives
2. Include `setupMediaDevicesMock()` helper
3. Update CallSession.test.ts to use shared mocks
4. Update MediaManager.test.ts to use shared mocks

**Completion Promise**: All WebRTC-related tests pass with shared mocks

---

### Iteration 3.2: WebSocket Mock Extraction

**Objective**: Reusable MockWebSocket class

**Files to Create**:
- `tests/helpers/mocks/MockWebSocket.ts`

**Files to Update**:
- `tests/unit/AmiClient.test.ts`

**Tasks**:
1. Extract MockWebSocket class from AmiClient.test.ts
2. Export factory function
3. Update AmiClient.test.ts to import from helpers

**Completion Promise**: AmiClient tests pass with extracted mock

---

### Iteration 3.3: Async Benchmark Handling

**Objective**: Fix benchmarks showing 0 results for async operations

**Files to Create**:
- `tests/helpers/async-mock-utils.ts`

**Files to Update**:
- `tests/performance/benchmarks/sipClient.bench.ts`
- `tests/performance/benchmarks/mediaDevices.bench.ts`

**Tasks**:
1. Create `createDeferred()` utility for controlled Promise resolution
2. Add `scheduleMockEvent()` wrapper using queueMicrotask
3. Refactor async benchmarks to use controlled resolution
4. Verify benchmarks produce non-zero results

**Completion Promise**: All async benchmarks show >0 ops/sec

---

### Iteration 3.4: Benchmark Mock Improvements

**Objective**: Realistic mediaDevices mocking with latency simulation

**Files to Create**:
- `tests/helpers/mocks/MockMediaDevices.ts`

**Files to Update**:
- `tests/performance/benchmarks/mediaDevices.bench.ts`
- `tests/setup.ts`

**Tasks**:
1. Create configurable MockMediaDevices factory
2. Add latency modes: fast (0ms), realistic (10-50ms), slow (100-500ms)
3. Implement complete MediaStream interface (clone, getTrackById, EventTarget)
4. Update benchmarks to use enhanced mocks

**Completion Promise**: MediaDevices benchmarks show realistic timing

---

## Phase 4: Documentation & Monitoring (P2)

### Iteration 4.1: Test Duration Monitoring

**Objective**: Proactive flakiness detection in CI

**Files to Create**:
- `scripts/analyze-test-results.js`

**Files to Update**:
- `vitest.config.ts` (add JSON reporter)
- `.github/workflows/test.yml`

**Tasks**:
1. Add JSON reporter to vitest config
2. Create analysis script to detect:
   - Tests >5s (timeout candidates)
   - Tests with retries (flaky tests)
3. Add CI step to run analysis
4. Fail build if flaky tests detected

**Completion Promise**: CI reports slow/flaky tests

---

### Iteration 4.2: Testing Guidelines Documentation

**Objective**: Prevent future timing issues

**Files to Create**:
- `docs/testing-guidelines.md`

**Tasks**:
1. Document fake timer best practices (DO/DON'T)
2. Include pattern examples from refactored tests
3. Document mock factory usage
4. Add section on async testing patterns

**Completion Promise**: Documentation created and reviewed

---

## Phase 5: Lower Priority (P3)

### Iteration 5.1: Helpers Index & Cleanup

**Files to Create**:
- `tests/helpers/index.ts`
- `tests/helpers/mocks/index.ts`

**Tasks**:
1. Create clean export structure
2. Add deprecation notices to old locations
3. Update imports across test files

---

### Iteration 5.2: Vue Test Utils Integration (Benchmarks)

**Files to Create**:
- `tests/helpers/composable-bench-harness.ts`

**Files to Update**:
- `tests/performance/benchmarks/conference.bench.ts`

**Tasks**:
1. Create `withVueContext()` harness for composable benchmarks
2. Alternative: Use `effectScope` for lightweight tests
3. Suppress expected lifecycle warnings in benchmark context

---

### Iteration 5.3: Stryker Mutation Testing Evaluation

**Files to Create**:
- `stryker.config.json`

**Tasks**:
1. Install Stryker packages
2. Configure for vitest runner
3. Run on subset (src/core/SipClient.ts)
4. Document findings and test gaps

---

## Dependency Graph

```
Phase 1 (P0)
  1.1 SipClient timers ──┐
  1.2 AmiClient timers ──┴──→ Phase 2 (P1)
                               2.1 waitForCondition ──┐
                               2.2 JsSIP mock factory ├──→ Phase 3 (P2)
                               2.3 Benchmark CI ──────┤     3.1 WebRTC mocks
                               2.4 Baseline system ───┘     3.2 WebSocket mock
                                                            3.3 Async benchmarks
                                                            3.4 Benchmark mocks
                                                            │
                                                            └──→ Phase 4 (P2)
                                                                  4.1 Test monitoring
                                                                  4.2 Documentation
                                                                  │
                                                                  └──→ Phase 5 (P3)
```

---

## Progress Tracking

| Iteration | Status | Tests Pass | Committed |
|-----------|--------|------------|-----------|
| 1.1 SipClient timers | ✅ Complete | ✅ | ✅ |
| 1.2 AmiClient timers | ✅ Complete | ✅ | ✅ |
| 2.1 waitForCondition | ⏳ Pending | ❌ | ❌ |
| 2.2 JsSIP mock factory | ⏳ Pending | ❌ | ❌ |
| 2.3 Benchmark CI | ⏳ Pending | ❌ | ❌ |
| 2.4 Baseline system | ⏳ Pending | ❌ | ❌ |
| 3.1 WebRTC mocks | ⏳ Pending | ❌ | ❌ |
| 3.2 WebSocket mock | ⏳ Pending | ❌ | ❌ |
| 3.3 Async benchmarks | ⏳ Pending | ❌ | ❌ |
| 3.4 Benchmark mocks | ⏳ Pending | ❌ | ❌ |
| 4.1 Test monitoring | ⏳ Pending | ❌ | ❌ |
| 4.2 Documentation | ⏳ Pending | ❌ | ❌ |
| 5.1 Helpers cleanup | ⏳ Pending | ❌ | ❌ |
| 5.2 Vue bench harness | ⏳ Pending | ❌ | ❌ |
| 5.3 Stryker eval | ⏳ Pending | ❌ | ❌ |

---

## Ralph-Loop Execution Commands

```bash
# Start improvement loop
/ralph-wiggum:ralph-loop --plan docs/improvement-plan.md --start 1.1

# Resume from checkpoint
/ralph-wiggum:ralph-loop --plan docs/improvement-plan.md --resume

# Execute specific iteration
/ralph-wiggum:ralph-loop --plan docs/improvement-plan.md --iteration 2.1
```

---

## Notes

- Each iteration is designed to be completable in 1-4 hours
- State persists via git commits - each iteration should commit changes
- Tests must pass before marking iteration complete
- Use `pnpm test:unit` for quick validation, `pnpm test` for full suite
