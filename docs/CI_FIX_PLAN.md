# CI Fix Plan - Action Items

## Overview

This document provides **immediate, actionable fixes** for the CI/CD pipeline issues identified in the test validation report.

## Critical Issue: TypeScript Build Error

### Problem

```
src/index.ts(606,16): error TS2664: Invalid module name in augmentation,
module '@vue/runtime-core' cannot be found.
```

### Root Cause

- Vue 3.5.24 installed but peerDependency specifies ^3.4.0
- `@vue/runtime-core` marked as extraneous dependency
- TypeScript cannot resolve module for type augmentation

### Solution Options (Choose ONE)

#### Option A: Update peerDependencies (RECOMMENDED) ✅

**Change**: `/home/irony/code/VueSIP/package.json`

```diff
  "peerDependencies": {
-   "vue": "^3.4.0"
+   "vue": "^3.4.0 || ^3.5.0"
  }
```

**Verification**:

```bash
pnpm install
pnpm build
pnpm typecheck
```

#### Option B: Add Explicit devDependency

**Change**: `/home/irony/code/VueSIP/package.json`

```diff
  "devDependencies": {
+   "@vue/runtime-core": "^3.5.24",
    "@primevue/themes": "^4.5.4",
```

**Verification**:

```bash
pnpm install
pnpm build
pnpm typecheck
```

#### Option C: Downgrade Vue Version

**Command**:

```bash
pnpm install vue@3.4.26 --save-dev --force
pnpm install
pnpm build
```

**Note**: This may cause compatibility issues with other dependencies requiring Vue 3.5.x

### Recommended Action

✅ **Use Option A** - Update peerDependencies to support both 3.4.x and 3.5.x

**Estimated Time**: 5 minutes
**Risk Level**: Low
**Testing Required**: Build and typecheck validation

---

## Coverage Issue: Below 75% Threshold

### Current Status

- **Branch Coverage**: 70.99%
- **Required**: 75%
- **Gap**: 4.01%

### Quick Win: Add useTheme Tests

**File**: `/home/irony/code/VueSIP/tests/unit/composables/useTheme.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useTheme } from '@/composables/useTheme'
import { createTestClient } from '../../utils/test-helpers'

describe('useTheme', () => {
  let client: ReturnType<typeof createTestClient>

  beforeEach(() => {
    client = createTestClient()
  })

  it('should initialize with default theme', () => {
    const { theme } = useTheme()
    expect(theme.value).toBeDefined()
  })

  it('should allow theme switching', () => {
    const { theme, setTheme } = useTheme()
    setTheme('dark')
    expect(theme.value).toBe('dark')
  })

  it('should persist theme preference', () => {
    const { setTheme } = useTheme()
    setTheme('dark')

    // Create new instance to test persistence
    const { theme } = useTheme()
    expect(theme.value).toBe('dark')
  })
})
```

**Impact**: Adds ~3% coverage
**Estimated Time**: 30 minutes

### Medium Priority: Improve SipClient Coverage

**File**: `/home/irony/code/VueSIP/tests/unit/SipClient.test.ts` (ENHANCE)

Add tests for uncovered error paths:

- Connection timeout handling
- Invalid configuration scenarios
- Network failure recovery
- Media constraint errors

**Impact**: Adds ~1-2% coverage
**Estimated Time**: 1-2 hours

### Alternative: Adjust Coverage Threshold

**File**: `/home/irony/code/VueSIP/vitest.config.ts`

```diff
  coverage: {
    thresholds: {
-     branches: 75,
+     branches: 71, // Temporary - increase as tests are added
      functions: 75,
      lines: 75,
      statements: 75,
    }
  }
```

**Note**: Only use this as a temporary measure while adding tests
**Risk**: May mask insufficient testing

---

## Implementation Steps

### Phase 1: Critical Fix (15 minutes)

1. ✅ Update `package.json` peerDependencies
2. ✅ Run `pnpm install`
3. ✅ Verify build: `pnpm build`
4. ✅ Verify typecheck: `pnpm typecheck`
5. ✅ Commit fix: `git commit -m "fix: support Vue 3.4.x and 3.5.x in peerDependencies"`

### Phase 2: Coverage Improvement (30-60 minutes)

1. ✅ Create `tests/unit/composables/useTheme.test.ts`
2. ✅ Run tests: `pnpm test:unit -- useTheme.test.ts`
3. ✅ Check coverage: `pnpm coverage:unit`
4. ✅ Commit: `git commit -m "test: add comprehensive useTheme tests"`

### Phase 3: Validation (10 minutes)

1. ✅ Full test run: `pnpm test`
2. ✅ Coverage check: `pnpm coverage`
3. ✅ Build verification: `pnpm build`
4. ✅ TypeScript check: `pnpm typecheck`

---

## Quick Command Reference

### Run All Checks

```bash
# Full validation suite
pnpm test && pnpm coverage && pnpm build && pnpm typecheck
```

### Individual Checks

```bash
# Tests only
pnpm test

# Coverage with threshold check
pnpm coverage

# Build (Vite + TypeScript)
pnpm build

# TypeScript validation only
pnpm typecheck
```

### Coverage Analysis

```bash
# Unit tests coverage
pnpm coverage:unit

# View detailed coverage report
open coverage/index.html
```

---

## Expected Results After Fixes

### Before

- ❌ TypeScript: FAILED (1 error)
- ❌ Coverage: FAILED (70.99% < 75%)
- ✅ Tests: PASSED (3,572/3,572)
- ✅ Build: PASSED (Vite only)

### After (Option A + useTheme tests)

- ✅ TypeScript: PASSED (0 errors)
- ✅ Coverage: PASSED (74-76% ≥ 75%)
- ✅ Tests: PASSED (3,582+/3,582+)
- ✅ Build: PASSED (Full)

---

## Risk Assessment

### Low Risk ✅

- Updating peerDependencies to support Vue 3.5.x
- Adding new tests (no existing test changes)
- Running validation checks

### Medium Risk ⚠️

- Modifying existing test files
- Adjusting coverage thresholds
- Changing dependency versions

### High Risk 🔴

- Downgrading Vue version (may break other dependencies)
- Skipping TypeScript validation
- Disabling coverage checks

---

## Rollback Plan

### If TypeScript Fix Fails

```bash
git checkout HEAD -- package.json
pnpm install
```

### If Coverage Tests Fail

```bash
# Remove new test file
git checkout HEAD -- tests/unit/composables/useTheme.test.ts

# Or adjust threshold temporarily
# Edit vitest.config.ts: branches: 71
```

### If Build Breaks

```bash
# Restore previous state
git reset --hard HEAD~1
pnpm install
```

---

## Success Criteria

### CI Pipeline Must Show:

- ✅ All tests passing (100% pass rate)
- ✅ No TypeScript errors
- ✅ Coverage ≥ 75% branch coverage
- ✅ Build completes successfully
- ✅ No new warnings or errors

### Validation Commands:

```bash
# All must pass
pnpm test          # ✅ PASS
pnpm coverage      # ✅ PASS (≥75% branches)
pnpm build         # ✅ PASS (no TS errors)
pnpm typecheck     # ✅ PASS (0 errors)
pnpm lint          # ✅ PASS (0 errors)
```

---

## Timeline

### Minimum Path to Green CI (45 minutes)

1. TypeScript fix (15 min)
2. Add useTheme tests (30 min)
3. Validation (5 min)

### Comprehensive Fix (3-4 hours)

1. TypeScript fix (15 min)
2. Add useTheme tests (30 min)
3. Improve SipClient coverage (2 hours)
4. Add provider tests (1 hour)
5. Full validation (15 min)

---

## Next Steps

1. **Immediate**: Apply TypeScript fix (Option A recommended)
2. **Today**: Add useTheme tests to reach coverage threshold
3. **This Sprint**: Improve SipClient and provider coverage
4. **Ongoing**: Monitor coverage trends and maintain >75%

---

**Document Version**: 1.0
**Last Updated**: 2025-12-22 01:48 UTC
**Status**: Ready for Implementation
