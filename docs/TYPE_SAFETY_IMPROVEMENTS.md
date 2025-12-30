# Type Safety Improvement Plan

## Overview

Address 262 TypeScript warnings across the codebase to improve type safety and code quality.

---

## Priority Files by Warning Count

### Tier 1: High Impact (70+ warnings)

1. **src/core/AudioManager.ts** - 23 warnings
2. **src/core/CallSession.ts** - 22 warnings
3. **src/composables/useSipClient.ts** - 20 warnings
4. **src/adapters/JsSIPAdapter.ts** - 18 warnings

### Tier 2: Medium Impact (10-20 warnings)

5. **src/plugins/RecordingPlugin.ts** - 12 warnings
6. **src/plugins/AnalyticsPlugin.ts** - 11 warnings
7. **tests/unit/core/CallSession.test.ts** - 10 warnings

### Tier 3: Low Impact (<10 warnings)

- Remaining files with <10 warnings each

---

## Common Patterns & Solutions

### Pattern 1: Explicit `any` in Event Handlers (238 instances)

#### ❌ Current Pattern

```typescript
private handleEvent(event: any): void {
  console.log(event.type)
}

private onMessage(message: any): void {
  this.processMessage(message)
}
```

#### ✅ Recommended Solution

```typescript
// Define proper event types
interface RTCSessionEvent {
  type: string
  session: RTCSession
  originator?: string
  request?: any // Keep specific anys documented
  cause?: string
}

interface RTCMessage {
  type: string
  body: string
  originator: string
  request: any
}

// Use proper types
private handleEvent(event: RTCSessionEvent): void {
  console.log(event.type)
}

private onMessage(message: RTCMessage): void {
  this.processMessage(message)
}
```

### Pattern 2: `any` in Catch Blocks (40+ instances)

#### ❌ Current Pattern

```typescript
try {
  await riskyOperation()
} catch (error: any) {
  console.error(error.message)
}
```

#### ✅ Recommended Solution

```typescript
try {
  await riskyOperation()
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error('Unknown error', error)
  }
}

// OR use error helper
import { formatError } from './utils/errorHelpers'

try {
  await riskyOperation()
} catch (error: unknown) {
  const formatted = formatError(error)
  console.error(formatted.message)
}
```

### Pattern 3: `Record<string, any>` (30+ instances)

#### ❌ Current Pattern

```typescript
params: Record<string, any>
options: Record<string, any>
metadata: Record<string, any>
```

#### ✅ Recommended Solution

```typescript
// Define specific interfaces
interface CallParams {
  uri: string
  extraHeaders?: string[]
  mediaConstraints?: MediaStreamConstraints
  rtcOfferConstraints?: RTCOfferOptions
}

interface AudioOptions {
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  sampleRate?: number
}

// Or use union types for flexible records
type MetadataValue = string | number | boolean | null
type Metadata = Record<string, MetadataValue>

// Or keep Record<string, any> but document it
/**
 * Flexible metadata storage
 * @remarks Using any here because metadata format is dynamic from server
 */
params: Record<string, any>
```

### Pattern 4: Non-Null Assertions (24 instances)

#### ❌ Current Pattern

```typescript
const session = this.sessions.get(sessionId)!
const element = document.getElementById('audio')!
const config = this.config!
```

#### ✅ Recommended Solution

```typescript
// Option 1: Throw error
const session = this.sessions.get(sessionId)
if (!session) {
  throw new Error(`Session ${sessionId} not found`)
}

// Option 2: Return early
const element = document.getElementById('audio')
if (!element) {
  console.warn('Audio element not found')
  return
}

// Option 3: Use optional chaining
const config = this.config
if (!config) {
  // Handle missing config
  return
}
```

---

## Implementation Phases

### Phase 1: Define Core Types (2 hours)

**Goal**: Create type definition files for common patterns

**Files to Create**:

```typescript
// src/types/events.types.ts
export interface RTCSessionEvent { ... }
export interface RTCMessageEvent { ... }
export interface RTCStreamEvent { ... }

// src/types/media.types.ts
export interface MediaDeviceInfo { ... }
export interface AudioConstraints { ... }
export interface VideoConstraints { ... }

// src/types/errors.types.ts
export type KnownError = Error | DOMException | RTCError
export interface FormattedError { ... }
```

**Deliverable**: 3-5 new type definition files

### Phase 2: Fix High-Impact Files (4 hours)

**Goal**: Fix Tier 1 files (70+ warnings)

**Files**:

1. `src/core/AudioManager.ts` - 23 warnings → 0 warnings
2. `src/core/CallSession.ts` - 22 warnings → 0 warnings
3. `src/composables/useSipClient.ts` - 20 warnings → 0 warnings
4. `src/adapters/JsSIPAdapter.ts` - 18 warnings → 0 warnings

**Approach**:

- Replace event handler `any` types
- Fix catch block error types
- Remove non-null assertions
- Document remaining `any` usage

**Deliverable**: 83 warnings fixed (32% reduction)

### Phase 3: Fix Medium-Impact Files (3 hours)

**Goal**: Fix Tier 2 files (10-20 warnings)

**Files**:

- `src/plugins/RecordingPlugin.ts` - 12 warnings
- `src/plugins/AnalyticsPlugin.ts` - 11 warnings
- `tests/unit/core/CallSession.test.ts` - 10 warnings

**Deliverable**: Additional 33 warnings fixed (12% reduction)

### Phase 4: Fix Remaining Files (4 hours)

**Goal**: Address all remaining warnings

**Approach**:

- Systematic file-by-file fixes
- Use helper functions for error handling
- Document any remaining `any` usage with JSDoc

**Deliverable**: All 262 warnings addressed

### Phase 5: Enable Strict Mode (2 hours)

**Goal**: Enable TypeScript strict mode

**Changes**:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Deliverable**: Zero TypeScript errors in strict mode

---

## Effort Estimation

| Phase                 | Time    | Impact         | Priority |
| --------------------- | ------- | -------------- | -------- |
| Phase 1: Core Types   | 2h      | Foundation     | HIGH     |
| Phase 2: Tier 1 Files | 4h      | 32% reduction  | HIGH     |
| Phase 3: Tier 2 Files | 3h      | 12% reduction  | MEDIUM   |
| Phase 4: Remaining    | 4h      | 56% reduction  | MEDIUM   |
| Phase 5: Strict Mode  | 2h      | Quality gate   | LOW      |
| **TOTAL**             | **15h** | **100% fixed** | -        |

---

## Success Metrics

### Current State

- **Total Warnings**: 262
- **Type Coverage**: ~85%
- **Strict Mode**: ❌ Disabled

### After Phase 1

- **Total Warnings**: 262 (no change, foundation work)
- **Type Coverage**: ~90%
- **Strict Mode**: ❌ Disabled

### After Phase 2

- **Total Warnings**: 179 (-83, -32%)
- **Type Coverage**: ~92%
- **Strict Mode**: ❌ Disabled

### After Phase 3

- **Total Warnings**: 146 (-33, -12%)
- **Type Coverage**: ~94%
- **Strict Mode**: ❌ Disabled

### After Phase 4

- **Total Warnings**: 0 (-146, -100%)
- **Type Coverage**: ~98%
- **Strict Mode**: ⚠️ Testing

### After Phase 5

- **Total Warnings**: 0
- **Type Coverage**: 100%
- **Strict Mode**: ✅ Enabled

---

## Recommended Approach

### Sprint 1 (This Sprint)

- ✅ Fix critical errors (already done)
- ✅ Create foundation types (Phase 1)
- ⚠️ Fix 2 high-impact files (partial Phase 2)

### Sprint 2

- Fix remaining Tier 1 files (complete Phase 2)
- Fix Tier 2 files (Phase 3)

### Sprint 3

- Fix all remaining warnings (Phase 4)
- Enable strict mode (Phase 5)

---

## Notes

1. **Backward Compatibility**: All changes maintain existing API contracts
2. **Testing**: Each phase includes verification that tests still pass
3. **Documentation**: Document any remaining `any` usage with clear JSDoc
4. **Review**: Each phase should be reviewed before proceeding to next
5. **Rollback**: Git commits after each file to allow easy rollback

## Example Pull Request Structure

```
feat(types): improve type safety across codebase

Phase 1: Add core type definitions
- Add event type definitions
- Add media type definitions
- Add error type definitions

Phase 2: Fix high-impact files (83 warnings)
- Fix AudioManager.ts (23 warnings)
- Fix CallSession.ts (22 warnings)
- Fix useSipClient.ts (20 warnings)
- Fix JsSIPAdapter.ts (18 warnings)

Impact:
- Warnings: 262 → 179 (-32%)
- Type coverage: 85% → 92%
- Build: ✅ PASS
- Tests: ✅ PASS (all 150+ tests)
```
