# E2E Test Optimization - Quick Reference

## What Changed?

### 🚀 Performance Improvements
- **4x faster CI execution** (parallel workers instead of sequential)
- **60-65% fewer test runs** (selective browser testing)
- **100-200ms saved per test** (optimized SIP delays)

### 📊 Test Distribution

| Browser | Test Count | What's Included |
|---------|------------|-----------------|
| **Chromium** | ~170 tests | Full suite (all tests) |
| **Firefox** | ~130 tests | Core + smoke tests |
| **WebKit** | ~130 tests | Core + smoke tests |
| **Mobile Chrome** | ~120 tests | Core tests only |
| **Mobile Safari** | ~120 tests | Core tests only |

### ⚙️ Configuration Changes

**Parallel Execution** (`playwright.config.ts`)
```typescript
workers: process.env.CI ? 4 : undefined  // Was: 1
```

**SIP Delays** (`tests/e2e/fixtures.ts`)
- Reduced by 50-70% while maintaining realism
- CONNECTION: 50ms → 20ms
- REGISTER: 80ms → 30ms
- INVITE: 150ms → 50ms

**Browser Selection** (`playwright.config.ts`)
- Chromium: Full suite
- Firefox/WebKit: Excludes visual + performance
- Mobile: Excludes visual + performance + advanced

## Running Tests

### Local Development
```bash
# All tests (parallel, all browsers)
pnpm run test:e2e

# Specific browser
pnpm run test:e2e:chromium
pnpm run test:e2e:firefox

# Specific test file
npx playwright test app-functionality.spec.ts
```

### CI/CD
- Automatically uses optimized configuration
- Runs in parallel (4 workers)
- Selective browser testing enabled
- Timeouts: 30min (desktop), 20min (mobile)

## Expected Results

### Before
- CI Time: ~45-60 minutes
- Test Runs: ~850 total

### After
- CI Time: ~8-12 minutes ⚡
- Test Runs: ~250-300 total

## Monitoring

Watch for:
- ✅ Test execution time (should be 4-5x faster)
- ✅ Flaky test rate (should remain stable)
- ✅ CI failure rate (should remain same/improve)

## Rollback

If needed, revert:
1. `playwright.config.ts`: Set `workers: 1`
2. `fixtures.ts`: Restore original SIP delays
3. `playwright.config.ts`: Remove `testIgnore` from projects

## Documentation

- **Full Plan**: `E2E_OPTIMIZATION_PLAN.md`
- **Implementation Details**: `E2E_OPTIMIZATIONS_IMPLEMENTED.md`
- **This Quick Reference**: `E2E_OPTIMIZATION_QUICK_REFERENCE.md`

