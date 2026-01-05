# ESLint Remediation Plan for Production Readiness

## Current Status

- **Total Warnings**: 129
- **Warning Types**:
  - `@typescript-eslint/no-explicit-any`: 110 warnings
  - `@typescript-eslint/no-non-null-assertion`: 19 warnings
- **Tests**: 3096/3096 passing

## Warning Distribution by File

| Priority | File | Warnings | Category |
|----------|------|----------|----------|
| P1 | `core/SipClient.ts` | 37 | Core async flows |
| P2 | `types/events.types.ts` | 12 | Type definitions |
| P2 | `core/MediaManager.ts` | 12 | Media handling |
| P2 | `stores/deviceStore.ts` | 10 | Device management |
| P3 | `composables/useSipE911.ts` | 8 | Emergency calling |
| P3 | `composables/useDialog.ts` | 7 | Dialog handling |
| P3 | `types/config.types.ts` | 6 | Configuration types |
| P4 | `stores/persistence.ts` | 5 | Storage handling |
| P4 | `utils/EventEmitter.ts` | 4 | Event utilities |
| P4 | `types/conference.types.ts` | 4 | Conference types |
| P5 | Remaining files | 24 | Various utilities |

## Remediation Strategy

### Phase 1: Core Async Flow Safety (P1) - SipClient.ts

**Goal**: Fix 37 warnings in the critical SIP client

**Approach**:
1. **Non-null assertions (9)**: Convert to defensive guards with early returns
2. **Any types in JsSIP callbacks (28)**: Add eslint-disable with justification comments

**Rationale**: JsSIP library types are not well-defined in TypeScript. Using `any` with proper documentation is acceptable for external library integration.

**Pattern**:
```typescript
// Before
this.ua!.start()

// After
if (!this.ua) {
  throw new Error('UA not initialized')
}
this.ua.start()
```

### Phase 2: Type Definitions (P2) - events.types.ts, config.types.ts

**Goal**: Fix 18 warnings in type definition files

**Approach**:
1. **Generic event payloads**: Use `unknown` instead of `any` where possible
2. **Config extensibility**: Add eslint-disable with justification for necessary flexibility
3. **Index signatures**: Properly type or document why `any` is needed

**Pattern**:
```typescript
// Before
[key: string]: any

// After (option 1 - constrain)
[key: string]: string | number | boolean | object

// After (option 2 - document)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Plugin configs require flexible types
[key: string]: any
```

### Phase 3: Media & Device Handling (P2) - MediaManager.ts, deviceStore.ts

**Goal**: Fix 22 warnings in media/device code

**Approach**:
1. **WebRTC API types**: Browser APIs often return `any` - add eslint-disable with justification
2. **Media stream handling**: Use proper MediaStream/MediaStreamTrack types where available
3. **Device enumeration**: Type device info objects properly

**Pattern**:
```typescript
// Before
const stream: any = await navigator.mediaDevices.getUserMedia(constraints)

// After
const stream: MediaStream = await navigator.mediaDevices.getUserMedia(constraints)
```

### Phase 4: Composables & Utilities (P3) - useDialog.ts, useSipE911.ts

**Goal**: Fix 15 warnings in Vue composables

**Approach**:
1. **SIP message parsing**: Add specific types for parsed dialog/presence info
2. **Error handling**: Use `unknown` instead of `any` for caught errors
3. **Event callbacks**: Define proper callback signatures

### Phase 5: Remaining Files (P4-P5)

**Goal**: Fix remaining 24 warnings

**Approach**:
1. **Persistence layer**: Type storage operations properly
2. **Event emitter**: Use generics instead of `any`
3. **Conference types**: Define proper participant/media types

## Implementation Order

### Wave 1: Quick Wins (Est. 30 warnings)
Files with simple fixes using const extraction or null guards:
- `core/CallSession.ts` (2)
- `core/TransportManager.ts` (1 non-null)
- `core/AmiClient.ts` (3 non-null)
- `utils/dialogInfoParser.ts` (2)
- `utils/EventEmitter.ts` (1 non-null)
- Small utility files (5-8)

### Wave 2: Type Definitions (Est. 35 warnings)
Add eslint-disable comments with proper justification:
- `types/events.types.ts` (12)
- `types/config.types.ts` (6)
- `types/conference.types.ts` (4)
- Other type files (8)

### Wave 3: Core Files (Est. 50 warnings)
Careful refactoring with thorough testing:
- `core/SipClient.ts` (37)
- `core/MediaManager.ts` (12)

### Wave 4: Stores & Composables (Est. 15 warnings)
- `stores/deviceStore.ts` (10)
- `stores/persistence.ts` (5)

## Success Criteria

1. **Zero ESLint Errors**: No errors, warnings acceptable with justification
2. **All Tests Pass**: 3096/3096 tests must remain passing
3. **Type Coverage**: All `any` types must have eslint-disable with justification
4. **Non-null Safety**: All `!` assertions replaced with proper guards or documented

## Risk Mitigation

1. **Run tests after each file change**
2. **Use incremental commits for easy rollback**
3. **Prioritize core functionality over warning count**
4. **Document decisions for future maintainers**

## Acceptance Criteria for Production

| Metric | Target | Current |
|--------|--------|---------|
| ESLint Errors | 0 | 0 |
| ESLint Warnings | <50 (justified) | 129 |
| Test Pass Rate | 100% | 100% |
| Type Coverage | >95% | ~90% |
| Non-null Guards | All critical paths | Partial |

## Timeline Estimate

- **Wave 1**: 1-2 hours
- **Wave 2**: 2-3 hours
- **Wave 3**: 3-4 hours (requires careful testing)
- **Wave 4**: 1-2 hours

**Total**: ~8-11 hours of focused work
