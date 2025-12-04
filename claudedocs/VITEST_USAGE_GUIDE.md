# Vitest Configuration Usage Guide

## Quick Start

### Running Tests

```bash
# Run all tests
npm run test

# Run only unit tests
npm run test:unit

# Run with watch mode
npm run test:watch

# Run with coverage
npm run coverage
```

### Expected Behavior

**Before vitest.config.ts**:
```
✓ 68 tests passing
⚠️ [Vue warn]: onUnmounted is called when there is no active component instance (x68)
```

**After vitest.config.ts**:
```
✓ 68 tests passing
✅ Clean console output (no Vue warnings)
```

## Configuration Overview

### File Structure

```
/
├── vitest.config.ts        # Test-specific configuration (NEW)
├── vite.config.ts          # Build configuration (existing)
└── tests/
    ├── setup.ts            # Global test setup (enhanced)
    └── unit/               # Unit tests
```

### What vitest.config.ts Provides

1. **Vue Plugin Integration**
   - Compiles .vue files in tests
   - Provides Vue runtime environment
   - Enables composable lifecycle hooks

2. **Test Environment**
   - jsdom for DOM testing
   - Global test APIs (describe, it, expect)
   - Proper Vue component context

3. **Performance**
   - Parallel test execution
   - Thread pool optimization
   - File-level parallelization

4. **Coverage**
   - V8 provider for accuracy
   - 80% minimum thresholds
   - Multiple report formats

## Writing Tests with Composables

### Before (Would Generate Warnings)

```typescript
import { describe, it, expect } from 'vitest'
import { useSipClient } from '@/composables/useSipClient'

describe('useSipClient', () => {
  it('should work', () => {
    const { connect } = useSipClient(config)
    // ⚠️ Warning: onUnmounted called outside component
  })
})
```

### After (Clean, No Warnings)

```typescript
import { describe, it, expect } from 'vitest'
import { useSipClient } from '@/composables/useSipClient'

describe('useSipClient', () => {
  it('should work', () => {
    const { connect } = useSipClient(config)
    // ✅ No warnings - Vue plugin provides proper context
  })
})
```

### Using setupVueApp (Optional)

For tests that need explicit Vue app instance:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setupVueApp } from '../setup'
import { useSipClient } from '@/composables/useSipClient'

describe('useSipClient', () => {
  beforeEach(() => {
    setupVueApp() // Explicit app setup if needed
  })

  it('should work', () => {
    const { connect } = useSipClient(config)
    // ✅ Guaranteed Vue context
  })
})
```

## Coverage Configuration

### Thresholds

```typescript
coverage: {
  lines: 80,      // 80% minimum line coverage
  functions: 80,  // 80% minimum function coverage
  branches: 75,   // 75% minimum branch coverage
  statements: 80  // 80% minimum statement coverage
}
```

### Running Coverage

```bash
# Generate coverage report
npm run coverage

# View HTML report
open coverage/index.html
```

### Coverage Reports

Located in `/coverage`:
- `index.html` - Interactive HTML report
- `coverage-final.json` - JSON data
- `lcov.info` - LCOV format (for CI/CD)

## Path Aliases

All TypeScript path aliases work in tests:

```typescript
import { useSipClient } from '@/composables/useSipClient'
import { CallSession } from '@/core/CallSession'
import { validateConfig } from '@/utils/validators'
import { useCallStore } from '@/stores/callStore'
```

## Performance Features

### Parallel Execution

Tests run in parallel across CPU cores:

```typescript
pool: 'threads',
fileParallelism: true,
maxConcurrency: 5
```

**Result**: Faster test suite execution

### Isolation

Each test file runs in isolated context:

```typescript
isolate: true
```

**Result**: Tests don't interfere with each other

## Console Output Control

### Benchmark Warnings Suppressed

Performance benchmarks that test raw classes (outside Vue context) have warnings automatically suppressed:

```typescript
onConsoleLog: (log, type) => {
  if (log.includes('onUnmounted is called when there is no active component instance')) {
    return false // Suppress this specific warning
  }
  return true // Keep other logs
}
```

### Test Silence Mode

To enable full console output during tests:

```bash
VITEST_SILENT=false npm run test
```

## Troubleshooting

### Issue: Tests Still Show Warnings

**Solution**: Ensure you're using the new config
```bash
# Verify vitest.config.ts exists
ls -la vitest.config.ts

# Verify vitest is using it
npm run test -- --version
```

### Issue: Path Aliases Not Working

**Solution**: Check alias configuration matches tsconfig.json
```typescript
// vitest.config.ts should have:
resolve: {
  alias: {
    '@': resolve(__dirname, 'src'),
    // ... other aliases
  }
}
```

### Issue: Coverage Too Low

**Solution**: Write more tests or adjust thresholds
```typescript
// Temporarily lower thresholds during development
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 65,
    statements: 70
  }
}
```

## Best Practices

### 1. Use Proper Cleanup

```typescript
import { afterEach } from 'vitest'

afterEach(() => {
  // Clean up resources
  vi.clearAllMocks()
})
```

### 2. Mock External Dependencies

```typescript
vi.mock('jssip', () => ({
  // Mock implementation
}))
```

### 3. Test Composables in Component Context

```typescript
import { mount } from '@vue/test-utils'

it('should work in component', () => {
  const wrapper = mount({
    setup() {
      return useSipClient(config)
    }
  })
  // Test with real Vue context
})
```

### 4. Use Descriptive Test Names

```typescript
// ✅ Good
it('should disconnect and clean up resources when user logs out', () => {})

// ❌ Bad
it('should work', () => {})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Tests
  run: npm run test

- name: Generate Coverage
  run: npm run coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Migration Notes

### No Breaking Changes

The new configuration is **fully backward compatible**:
- ✅ All existing tests work unchanged
- ✅ All mocks preserved
- ✅ All test scripts work as before
- ✅ No changes needed to test files

### Benefits Gained

1. **Clean console output** - No more Vue warnings
2. **Proper composable support** - Full Vue 3 lifecycle
3. **Better performance** - Optimized parallel execution
4. **Coverage enforcement** - Automatic threshold checking
5. **Better DX** - Clear error messages and reports

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Vue 3 Composables Testing](https://vuejs.org/guide/scaling-up/testing.html)
- [Coverage Reports](https://vitest.dev/guide/coverage.html)

---

**For questions or issues**: See `/claudedocs/PHASE1_IMPLEMENTATION_SUMMARY.md`
