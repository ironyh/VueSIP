# TICKET-003: Implement Device Enumeration Caching

## Priority: MEDIUM 🟡

**Estimated Effort**: 2-4 hours
**Impact**: Performance improvement, reduced API calls

## Problem Statement

MediaManager currently calls `navigator.mediaDevices.enumerateDevices()` on every request without caching. This results in:

1. **Unnecessary API calls** when device list hasn't changed
2. **Slower response times** for UI updates
3. **Potential performance impact** during rapid device queries

## Current Implementation

```typescript
// Lines 713-738
async enumerateDevices(): Promise<MediaDevice[]> {
  try {
    // Always calls native API - no caching
    const devices = await navigator.mediaDevices.enumerateDevices()

    // Processes and stores result
    this.devices = devices.map(device => ({
      deviceId: device.deviceId,
      groupId: device.groupId,
      kind: device.kind,
      label: device.label,
    }))

    return this.devices
  } catch (error: any) {
    logger.error('Failed to enumerate devices', { error })
    return []
  }
}
```

## Proposed Solution

### 1. Add Cache Management

```typescript
private deviceCache: {
  devices: MediaDevice[]
  timestamp: number
} | null = null

private readonly DEVICE_CACHE_TTL = 5000 // 5 seconds
```

### 2. Implement Cache-Aware Enumeration

```typescript
async enumerateDevices(forceRefresh: boolean = false): Promise<MediaDevice[]> {
  try {
    // Check cache validity
    const now = Date.now()
    const cacheValid = this.deviceCache &&
                       (now - this.deviceCache.timestamp < this.DEVICE_CACHE_TTL)

    if (!forceRefresh && cacheValid) {
      logger.debug('Returning cached devices')
      return this.deviceCache!.devices
    }

    // Cache miss or expired - refresh
    logger.debug('Enumerating devices from native API')
    const devices = await navigator.mediaDevices.enumerateDevices()

    this.devices = devices.map(device => ({
      deviceId: device.deviceId,
      groupId: device.groupId,
      kind: device.kind,
      label: device.label,
    }))

    // Update cache
    this.deviceCache = {
      devices: this.devices,
      timestamp: now
    }

    return this.devices
  } catch (error: unknown) {
    logger.error('Failed to enumerate devices', formatError(error))
    return []
  }
}
```

### 3. Invalidate Cache on Device Changes

```typescript
private handleDeviceChange = (): void => {
  logger.debug('Device change detected')

  // Invalidate cache
  this.deviceCache = null

  // Re-enumerate with fresh data
  this.enumerateDevices(true)
    .then((devices) => {
      this.eventBus.emitSync('media:device:changed', { devices })
    })
    .catch((error) => {
      logger.error('Failed to handle device change', formatError(error))
    })
}
```

## Implementation Steps

1. [ ] Add cache properties to MediaManager class
2. [ ] Add `forceRefresh` parameter to `enumerateDevices()`
3. [ ] Implement cache check and validation logic
4. [ ] Update `handleDeviceChange()` to invalidate cache
5. [ ] Add cache configuration to constructor options
6. [ ] Update tests to verify caching behavior
7. [ ] Add performance benchmarks

## Files to Modify

- `src/core/MediaManager.ts`
  - Add cache properties
  - Update `enumerateDevices()` method
  - Update `handleDeviceChange()` method
  - Update constructor options

- `src/types/index.ts`
  - Add `deviceCacheTTL?: number` to `MediaManagerOptions`

- `tests/unit/MediaManager.test.ts`
  - Add cache behavior tests
  - Test cache invalidation
  - Test force refresh

## Testing Requirements

### New Tests

```typescript
describe('Device Enumeration Caching', () => {
  it('should return cached devices on subsequent calls', async () => {
    const devices1 = await mediaManager.enumerateDevices()
    const devices2 = await mediaManager.enumerateDevices()

    expect(devices1).toBe(devices2) // Same instance
    expect(enumerateDevicesSpy).toHaveBeenCalledTimes(1)
  })

  it('should refresh cache when forceRefresh is true', async () => {
    await mediaManager.enumerateDevices()
    await mediaManager.enumerateDevices(true)

    expect(enumerateDevicesSpy).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache on device change', async () => {
    await mediaManager.enumerateDevices()

    // Simulate device change
    deviceChangeHandler()

    expect(deviceCache).toBeNull()
  })

  it('should respect cache TTL expiration', async () => {
    await mediaManager.enumerateDevices()

    // Fast-forward time beyond TTL
    jest.advanceTimersByTime(6000)

    await mediaManager.enumerateDevices()
    expect(enumerateDevicesSpy).toHaveBeenCalledTimes(2)
  })
})
```

### Performance Tests

```typescript
it('should improve enumeration performance with caching', async () => {
  const start1 = performance.now()
  await mediaManager.enumerateDevices()
  const time1 = performance.now() - start1

  const start2 = performance.now()
  await mediaManager.enumerateDevices() // Cached
  const time2 = performance.now() - start2

  expect(time2).toBeLessThan(time1 * 0.1) // 10x faster
})
```

## Configuration Options

```typescript
interface MediaManagerOptions {
  // Existing options...

  /**
   * Device enumeration cache TTL in milliseconds
   * @default 5000 (5 seconds)
   */
  deviceCacheTTL?: number

  /**
   * Enable device enumeration caching
   * @default true
   */
  enableDeviceCache?: boolean
}
```

## Success Criteria

✅ Device enumeration returns cached results within TTL
✅ Cache invalidated on `devicechange` events
✅ `forceRefresh` parameter bypasses cache
✅ Configurable cache TTL
✅ Performance improvement of 5-10x for cached calls
✅ All existing tests pass
✅ New cache tests added and passing

## Performance Impact

**Expected Improvements**:

- **Cached calls**: ~0.1ms (vs 10-50ms native API)
- **Reduced CPU**: 90%+ reduction for repeated calls
- **UI responsiveness**: Instant device list updates

**Trade-offs**:

- **Memory**: ~1KB for cached device list (negligible)
- **Staleness**: Max 5s delay for device changes (acceptable)

## Risk Assessment

**Risk Level**: LOW

- Opt-in feature (can be disabled)
- Cache auto-invalidates on device changes
- Existing behavior preserved with `forceRefresh`
- Comprehensive test coverage

## Migration Path

1. **Default behavior**: Caching enabled with 5s TTL
2. **Opt-out**: Set `enableDeviceCache: false` in options
3. **Custom TTL**: Adjust via `deviceCacheTTL` option

## Dependencies

None - can be implemented independently

## Related Issues

- TICKET-004: Extract Magic Numbers (will benefit from this)
