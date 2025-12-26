# TICKET-004: Extract Magic Numbers to Named Constants

## Priority: LOW 🟢

**Estimated Effort**: 1 hour
**Impact**: Code readability, maintainability

## Problem Statement

MediaManager contains several hardcoded numeric values (magic numbers) that lack context and make the code harder to understand and maintain.

## Current Magic Numbers

### 1. Statistics Collection Interval

```typescript
// Line 1121
setInterval(() => {
  // Collect stats
}, 5000) // Magic number - what does 5000 mean?
```

### 2. Quality Check Interval

```typescript
// Line 1105
setInterval(() => {
  // Quality adjustment
}, 5000) // Same value but different purpose
```

### 3. Audio Level Sampling Duration

```typescript
// Line 1427
setTimeout(() => {
  // Sample audio level
}, 250) // Why 250?
```

### 4. DTMF Tone Parameters

```typescript
// Lines in DTMF methods
duration = 100 // Default tone duration
gap = 70 // Default gap between tones
```

### 5. Quality Thresholds

```typescript
// Line 1147
if (loss > 5) {
  // Why 5%?
  logger.warn('High audio packet loss')
}

// Line 1152
if (rtt > 200) {
  // Why 200ms?
  logger.warn('High RTT')
}
```

## Proposed Solution

### 1. Create Constants Section

```typescript
/**
 * MediaManager Configuration Constants
 */
const MEDIA_CONSTANTS = {
  // Statistics Collection
  STATS_COLLECTION_INTERVAL_MS: 5000,
  STATS_AUTO_START: true,

  // Quality Monitoring
  QUALITY_CHECK_INTERVAL_MS: 5000,
  PACKET_LOSS_THRESHOLD_PERCENT: 5,
  RTT_THRESHOLD_MS: 200,
  JITTER_THRESHOLD_MS: 30,

  // Audio Level Testing
  AUDIO_LEVEL_SAMPLE_DURATION_MS: 250,
  AUDIO_LEVEL_FREQUENCY_HZ: 440, // A4 note

  // DTMF Configuration
  DTMF_TONE_DURATION_MS: 100,
  DTMF_TONE_GAP_MS: 70,

  // Device Caching (from TICKET-003)
  DEVICE_CACHE_TTL_MS: 5000,

  // ICE Gathering
  ICE_GATHERING_TIMEOUT_MS: 5000,

  // Concurrency Protection
  GET_USER_MEDIA_TIMEOUT_MS: 30000,
} as const

// Type-safe access
type MediaConstants = typeof MEDIA_CONSTANTS
```

### 2. Update All References

```typescript
// Statistics collection
this.statsInterval = setInterval(() => {
  this.collectStatistics()
}, MEDIA_CONSTANTS.STATS_COLLECTION_INTERVAL_MS)

// Quality check
this.qualityAdjustmentInterval = setInterval(() => {
  this.checkQuality()
}, MEDIA_CONSTANTS.QUALITY_CHECK_INTERVAL_MS)

// Audio level sampling
setTimeout(() => {
  // Sample audio
}, MEDIA_CONSTANTS.AUDIO_LEVEL_SAMPLE_DURATION_MS)

// Quality thresholds
if (loss > MEDIA_CONSTANTS.PACKET_LOSS_THRESHOLD_PERCENT) {
  logger.warn('High audio packet loss', {
    loss: loss.toFixed(2) + '%',
    threshold: MEDIA_CONSTANTS.PACKET_LOSS_THRESHOLD_PERCENT + '%',
  })
}

if (rtt > MEDIA_CONSTANTS.RTT_THRESHOLD_MS) {
  logger.warn('High RTT', {
    rtt: rtt.toFixed(0) + 'ms',
    threshold: MEDIA_CONSTANTS.RTT_THRESHOLD_MS + 'ms',
  })
}
```

### 3. Make Constants Configurable (Optional)

```typescript
interface MediaManagerOptions {
  // Existing options...

  /**
   * Override default constants
   */
  constants?: Partial<MediaConstants>
}

// In constructor
private readonly constants: MediaConstants

constructor(options: MediaManagerOptions) {
  // Merge with defaults
  this.constants = {
    ...MEDIA_CONSTANTS,
    ...options.constants
  }
}
```

## Implementation Steps

1. [ ] Create `MEDIA_CONSTANTS` object at top of MediaManager.ts
2. [ ] Identify all magic numbers (grep for numeric literals)
3. [ ] Replace magic numbers with named constants
4. [ ] Add JSDoc comments explaining each constant
5. [ ] Update tests to use constants
6. [ ] Add configuration override support (optional)

## Files to Modify

- `src/core/MediaManager.ts`
  - Add constants section
  - Replace all magic numbers (~15-20 locations)

- `tests/unit/MediaManager.test.ts`
  - Update test expectations to use constants
  - Test constant overrides (if implemented)

## Magic Numbers to Extract

| Location  | Current Value | Proposed Constant                |
| --------- | ------------- | -------------------------------- |
| Line 1121 | 5000          | `STATS_COLLECTION_INTERVAL_MS`   |
| Line 1105 | 5000          | `QUALITY_CHECK_INTERVAL_MS`      |
| Line 1427 | 250           | `AUDIO_LEVEL_SAMPLE_DURATION_MS` |
| Line 1147 | 5             | `PACKET_LOSS_THRESHOLD_PERCENT`  |
| Line 1152 | 200           | `RTT_THRESHOLD_MS`               |
| DTMF      | 100           | `DTMF_TONE_DURATION_MS`          |
| DTMF      | 70            | `DTMF_TONE_GAP_MS`               |

## Testing Requirements

- [ ] All existing tests pass with constants
- [ ] Constants are correctly applied
- [ ] Override mechanism works (if implemented)
- [ ] Documentation updated

## Success Criteria

✅ Zero magic numbers in MediaManager
✅ All numeric literals have named constants
✅ Constants have explanatory comments
✅ Tests use same constants
✅ Existing behavior unchanged

## Benefits

1. **Readability**: Code is self-documenting
2. **Maintainability**: Single source of truth for values
3. **Configurability**: Easy to adjust thresholds
4. **Consistency**: Same values used throughout
5. **Testing**: Easier to test with known constants

## Example Before/After

### Before

```typescript
setInterval(() => {
  this.collectStatistics()
}, 5000)

if (loss > 5) {
  logger.warn('High packet loss')
}
```

### After

```typescript
setInterval(() => {
  this.collectStatistics()
}, MEDIA_CONSTANTS.STATS_COLLECTION_INTERVAL_MS)

if (loss > MEDIA_CONSTANTS.PACKET_LOSS_THRESHOLD_PERCENT) {
  logger.warn('High packet loss', {
    threshold: MEDIA_CONSTANTS.PACKET_LOSS_THRESHOLD_PERCENT + '%',
  })
}
```

## Risk Assessment

**Risk Level**: VERY LOW

- Pure refactoring (no behavior change)
- Easy to verify correctness
- Can be done incrementally
- Easy to revert if needed

## Dependencies

None - can be implemented independently

## Related Issues

- TICKET-003: Device Enumeration Caching (will add cache TTL constant)
