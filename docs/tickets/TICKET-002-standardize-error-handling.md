# TICKET-002: Standardize Error Handling in MediaManager

## Priority: HIGH 🔴

**Estimated Effort**: 1-2 hours
**Impact**: Code quality, debugging, error reporting

## Problem Statement

MediaManager uses inconsistent error type handling with `catch (error: any)` in multiple locations. This prevents proper type narrowing and makes error handling less robust.

## Current Implementation

```typescript
// Lines 563-564, 942-943, and others
} catch (error: any) {
  logger.error('Failed to get user media', { error })
  throw error
}

} catch (error: any) {
  logger.error('Audio input test failed', { error })
  return { success: false }
}
```

## Issues

1. **No type safety** - `any` type bypasses TypeScript checking
2. **Inconsistent error logging** - different formats across methods
3. **Limited error context** - missing error names, codes, stack traces
4. **Difficult debugging** - can't distinguish error types

## Proposed Solution

### 1. Use `unknown` Type with Type Guards

```typescript
// Standard error handling pattern
} catch (error: unknown) {
  const errorMessage = error instanceof Error
    ? error.message
    : String(error)
  const errorName = error instanceof Error
    ? error.name
    : 'UnknownError'

  logger.error('Failed to get user media', {
    error: errorMessage,
    name: errorName,
    stack: error instanceof Error ? error.stack : undefined
  })
  throw error
}
```

### 2. Create Error Utility Helper

```typescript
// src/utils/errorHelpers.ts
export function formatError(error: unknown): {
  message: string
  name: string
  stack?: string
  code?: string
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as any).code // DOMException, etc.
    }
  }
  return {
    message: String(error),
    name: 'UnknownError'
  }
}

// Usage
} catch (error: unknown) {
  logger.error('Failed to get user media', formatError(error))
  throw error
}
```

### 3. Define Custom Error Types (Optional Enhancement)

```typescript
// src/types/errors.ts
export class MediaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'MediaError'
  }
}

export class DeviceError extends MediaError {
  constructor(
    message: string,
    public readonly deviceId?: string
  ) {
    super(message, 'DEVICE_ERROR')
    this.name = 'DeviceError'
  }
}

export class PermissionError extends MediaError {
  constructor(message: string) {
    super(message, 'PERMISSION_ERROR')
    this.name = 'PermissionError'
  }
}
```

## Implementation Steps

1. [ ] Create `formatError()` utility helper function
2. [ ] Replace all `catch (error: any)` with `catch (error: unknown)`
3. [ ] Update error logging to use `formatError()`
4. [ ] Add error name and code to log output
5. [ ] Ensure stack traces are preserved
6. [ ] Update tests to verify error handling

## Files to Modify

- `src/utils/errorHelpers.ts` (create)
- `src/core/MediaManager.ts` (update all catch blocks)
- `tests/unit/MediaManager.test.ts` (verify error handling)

## Affected Catch Blocks (Estimated ~15-20 locations)

- `getUserMedia()` - line 563
- `testAudioInput()` - line 942
- `enumerateDevices()` - error handling
- `createPeerConnection()` - error handling
- `setLocalDescription()` - error handling
- `setRemoteDescription()` - error handling
- All other async operations

## Testing Requirements

- [ ] All existing error tests pass
- [ ] Error messages preserve original information
- [ ] Stack traces are logged when available
- [ ] Error names correctly identified
- [ ] Custom error types work correctly (if implemented)

## Success Criteria

✅ Zero `error: any` declarations in MediaManager
✅ Consistent error logging format across all catch blocks
✅ Error names, messages, and stacks properly logged
✅ All tests pass without modification
✅ TypeScript strict mode compliance

## Phased Approach

### Phase 1 (Minimum, ~1 hour)

- Replace `any` with `unknown`
- Use type guards for Error checking
- Standardize logging format

### Phase 2 (Optional, ~2 hours)

- Create `formatError()` helper
- Define custom error types
- Enhanced error context

## Risk Assessment

**Risk Level**: LOW

- Non-breaking change
- Internal implementation only
- Existing error behavior preserved
- Improves debugging capabilities

## Dependencies

None - can be implemented independently

## Related Issues

- TICKET-001: Fix EventBus Type Safety (complementary improvement)
