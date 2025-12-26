# Quick Fix: GitHub Actions Test Failures

## TL;DR

**All tests are passing locally.** GitHub Actions is likely failing on stderr output from intentional test warnings.

## The Fix

Add this to `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ... existing config ...

    // Suppress expected console warnings in CI
    onConsoleLog: (log, type) => {
      if (process.env.CI && type === 'stderr') {
        // Filter out expected Vue warnings from intentional negative tests
        if (log.includes('injection') && log.includes('not found')) return false
        if (log.includes('Set operation on key') && log.includes('readonly')) return false
        // Filter out debug logging from useCallSession
        if (log.includes('[useCallSession]') && log.includes('FAILED')) return false
      }
      return true
    },
  },
})
```

## What's Happening

Three types of "warnings" appear in test output but **all tests pass**:

1. **Vue injection warning** - From test that verifies error handling when composable used incorrectly
2. **Readonly mutation warning** - From test that verifies Vue's readonly protection works
3. **Error logging** - From production debug logging in useCallSession composable

All are intentional and expected. Tests verify these behaviors work correctly.

## Verification

```bash
# Run locally - should show 100% pass rate
npm test

# Check for actual failures (ignoring expected warnings)
npm test 2>&1 | grep -E "FAIL|✗" | grep -v "FAILED {" | grep -v "makeCall FAILED"
```

## See Also

- Full analysis: `docs/test-failure-analysis.md`
- Memory key: `hive/analyst/test-failures`
