# Call Options Forwarding Issues

## Summary

**File**: `src/core/SipClient.ts`
**Method**: `call(target: string, options?: CallOptions)` (lines 2070-2400)
**Status**: **IMPLEMENTATION BUG** - requires code changes
**Impact**: Tests failing for custom SDP and RTCPeerConnection configuration

---

## Issue 1: sessionDescriptionHandlerOptions Not Forwarded

### Failing Tests (3 failures)

- `SipClient - Call Management > Call Options > should make call with custom SDP`

### Root Cause

**Location**: `src/core/SipClient.ts:2343-2363`

The `callOptions` object being passed to JsSIP's `ua.call()` method does NOT include `sessionDescriptionHandlerOptions`:

```typescript
// Build call options
const callOptions: any = {
  mediaConstraints: options?.mediaConstraints || {
    audio: options?.audio !== false,
    video: options?.video === true,
  },
  rtcConfiguration: options?.rtcConfiguration,
  extraHeaders: options?.extraHeaders || [],
  anonymous: options?.anonymous,
  sessionTimersExpires: options?.sessionTimersExpires || 90,
}

// ❌ MISSING: sessionDescriptionHandlerOptions is never set from options
```

### Expected Behavior

The method should forward `options.sessionDescriptionHandlerOptions` to JsSIP:

```typescript
const callOptions: any = {
  // ... existing options ...
  sessionDescriptionHandlerOptions: options?.sessionDescriptionHandlerOptions, // ✅ NEEDED
}
```

### Test Evidence

```typescript
// Test at lines 265-281 in SipClient.calls.test.ts
it('should make call with custom SDP', async () => {
  const callOptions = {
    sessionDescriptionHandlerOptions: {
      constraints: { video: false, audio: true },
    },
  }

  await sipClient.call('sip:2000@example.com', callOptions)

  expect(mockUA.call).toHaveBeenCalledWith(
    'sip:2000@example.com',
    expect.objectContaining({
      sessionDescriptionHandlerOptions: expect.any(Object), // ❌ FAILS - not found
    })
  )
})
```

**Actual vs Expected**:

```
Expected: ObjectContaining {
  "sessionDescriptionHandlerOptions": Any<Object>
}
Received: {
  "anonymous": undefined,
  "extraHeaders": [],
  "mediaConstraints": { "audio": true, "video": false },
  "rtcConfiguration": undefined,
  "sessionTimersExpires": 90
}
```

---

## Issue 2: pcConfig Not Forwarded

### Failing Tests (3 failures)

- `SipClient - Call Management > Call Options > should handle call with RTCPeerConnection configuration`

### Root Cause

**Location**: `src/core/SipClient.ts:2343-2363` (same location)

The `callOptions` object being passed to JsSIP's `ua.call()` method does NOT include `pcConfig`:

```typescript
// Build call options
const callOptions: any = {
  mediaConstraints: options?.mediaConstraints || {
    audio: options?.audio !== false,
    video: options?.video === true,
  },
  rtcConfiguration: options?.rtcConfiguration, // ✅ Has rtcConfiguration
  extraHeaders: options?.extraHeaders || [],
  anonymous: options?.anonymous,
  sessionTimersExpires: options?.sessionTimersExpires || 90,
}

// ❌ MISSING: pcConfig is never set from options
```

### Expected Behavior

The method should forward `options.pcConfig` to JsSIP:

```typescript
const callOptions: any = {
  // ... existing options ...
  pcConfig: options?.pcConfig, // ✅ NEEDED
}
```

### Test Evidence

```typescript
// Test at lines 283-300 in SipClient.calls.test.ts
it('should handle call with RTCPeerConnection configuration', async () => {
  const callOptions = {
    pcConfig: {
      iceServers: [{ urls: 'stun:stun.example.com:3478' }],
    },
  }

  await sipClient.call('sip:2000@example.com', callOptions)

  expect(mockUA.call).toHaveBeenCalledWith(
    'sip:2000@example.com',
    expect.objectContaining({
      pcConfig: { iceServers: [{ urls: 'stun:stun.example.com:3478' }] }, // ❌ FAILS - not found
    })
  )
})
```

**Actual vs Expected**:

```
Expected: ObjectContaining {
  "pcConfig": {
    "iceServers": [
      { "urls": "stun:stun.example.com:3478" }
    ]
  }
}
Received: {
  "anonymous": undefined,
  "extraHeaders": [],
  "mediaConstraints": { "audio": true, "video": false },
  "rtcConfiguration": undefined,
  "sessionTimersExpires": 90
}
```

---

## Recommended Fix

### Location

`src/core/SipClient.ts:2343-2363`

### Changes Needed

```typescript
// Build call options
const callOptions: any = {
  mediaConstraints: options?.mediaConstraints || {
    audio: options?.audio !== false,
    video: options?.video === true,
  },
  rtcConfiguration: options?.rtcConfiguration,
  extraHeaders: options?.extraHeaders || [],
  anonymous: options?.anonymous,
  sessionTimersExpires: options?.sessionTimersExpires || 90,

  // ✅ ADD THESE TWO LINES:
  sessionDescriptionHandlerOptions: options?.sessionDescriptionHandlerOptions,
  pcConfig: options?.pcConfig,
}
```

### Implementation Checklist

- [ ] Add `sessionDescriptionHandlerOptions` forwarding to `callOptions`
- [ ] Add `pcConfig` forwarding to `callOptions`
- [ ] Run failing tests to verify fix
- [ ] Verify no regression in other call option tests
- [ ] Check JsSIP documentation for any other missing call options
- [ ] Update TypeScript CallOptions interface if needed

---

## Related Types

**CallOptions Interface** (from `src/types/sip.types.ts` or similar):

Should include these properties:

```typescript
export interface CallOptions {
  audio?: boolean
  video?: boolean
  mediaConstraints?: MediaStreamConstraints
  rtcConfiguration?: RTCConfiguration
  extraHeaders?: string[]
  anonymous?: boolean
  sessionTimersExpires?: number
  sessionTimers?: boolean
  pcmaCodecOnly?: boolean

  // ✅ Should also include:
  sessionDescriptionHandlerOptions?: any // JsSIP-specific SDP handler options
  pcConfig?: RTCConfiguration // RTCPeerConnection configuration (different from rtcConfiguration)
}
```

---

## Impact Assessment

**Severity**: Medium - Feature incomplete but workarounds exist

**Affected Functionality**:

- Custom SDP offer/answer modifications
- Advanced WebRTC peer connection configuration
- TURN/STUN server customization via pcConfig
- Custom ICE candidate gathering policies

**Workarounds**:

- Use `rtcConfiguration` instead of `pcConfig` (may not support all options)
- Modify JsSIP defaults globally (not ideal for per-call configuration)

**Tests Blocked**: 6 total (3 custom SDP + 3 pcConfig tests)

---

## References

- **Source File**: `src/core/SipClient.ts:2343-2363`
- **Test File**: `tests/unit/SipClient.calls.test.ts:265-300`
- **JsSIP Documentation**: https://jssip.net/documentation/api/ua/#call
- **Related Issue**: Test failures indicating incomplete options forwarding
