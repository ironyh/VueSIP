# Integration Test Fix Implementation Plan

**Date**: 2025-12-14
**Status**: 🔄 Planning Complete - Ready for Implementation
**Affected Tests**: 51 tests across 2 files

---

## 📊 Overview

This plan details the step-by-step approach to fix the 51 skipped integration tests that are currently using an incorrect API.

**Current Status**:
```
✅ Tests passing: 3,577
⏭️ Tests skipped: 52 (51 need fixing + 1 pre-existing)
📂 Files affected: 2 integration test files
⏱️ Estimated time: 1.5-2 hours
```

---

## 🔍 Root Cause Analysis

### Incorrect API Usage

**Tests are using** (❌ WRONG):
```typescript
const { sipSettings, updateSipSettings } = useSettings();
const { audioSettings, updateAudioSettings } = useSettings();
const { networkSettings, updateNetworkSettings } = useSettings();
const { validateSipSettings } = useSettings();
const { saveSettings } = useSettings();
```

**Correct API is** (✅ RIGHT):
```typescript
const { settings, updateSettings, validate, save } = useSettings();
```

### Why This Happened

The tests were likely written before the settings API was refactored to use a unified `SettingsSchema` approach. The API evolved from having separate methods for each settings category to a single unified method.

---

## 🎯 Transformation Guide

### Pattern 1: Updating Settings

**OLD WAY** ❌:
```typescript
const { sipSettings, updateSipSettings } = useSettings();

updateSipSettings({
  server: 'sip.test.com',
  port: 5061
});

expect(sipSettings.value.server).toBe('sip.test.com');
```

**NEW WAY** ✅:
```typescript
const { settings, updateSettings } = useSettings();

updateSettings({
  sip: {
    ...settings.value.sip,
    server: 'sip.test.com',
    port: 5061
  }
});

expect(settings.value.sip.server).toBe('sip.test.com');
```

### Pattern 2: Reading Settings

**OLD WAY** ❌:
```typescript
const { sipSettings } = useSettings();
const server = sipSettings.value.server;
```

**NEW WAY** ✅:
```typescript
const { settings } = useSettings();
const server = settings.value.sip.server;
```

### Pattern 3: Validation

**OLD WAY** ❌:
```typescript
const { validateSipSettings } = useSettings();
const result = validateSipSettings();
```

**NEW WAY** ✅:
```typescript
const { validate } = useSettings();
const result = validate();
```

### Pattern 4: Saving Settings

**OLD WAY** ❌:
```typescript
const { saveSettings } = useSettings();
await saveSettings();
```

**NEW WAY** ✅:
```typescript
const { save } = useSettings();
await save();
```

---

## 📋 Settings Schema Structure

Understanding the structure is crucial for correct updates:

```typescript
interface SettingsSchema {
  // SIP settings
  sip: {
    server: string
    port: number
    transport: 'UDP' | 'TCP' | 'WSS'
    username: string
    password: string
    authorizationUser: string
    realm: string
    displayName: string
    registerExpires: number
    autoRegister: boolean
    enableIce: boolean
    enableStun: boolean
    stunServers: string[]
    enableTurn: boolean
    turnServers: Array<{
      urls: string
      username: string
      credential: string
    }>
  }

  // Audio settings
  audio: {
    inputDeviceId: string
    outputDeviceId: string
    inputVolume: number
    outputVolume: number
    echoCancellation: boolean
    noiseSuppression: boolean
    autoGainControl: boolean
    sampleRate: number
    channelCount: number
  }

  // Network settings
  network: {
    enableQos: boolean
    dscp: number
    maxBitrate: number
    minBitrate: number
    enableAdaptiveBitrate: boolean
    packetLossThreshold: number
  }

  // ... other settings
}
```

---

## 🗂️ Implementation Plan by File

### File 1: `tests/integration/settings-connection.test.ts`

**Total Tests**: 27 tests across 10 describe blocks

#### Phase 1: SIP Configuration Application (3 tests)
- ✏️ Fix: `should apply SIP settings to configStore`
- ✏️ Fix: `should apply authentication settings`
- ✏️ Fix: `should apply ICE/STUN/TURN settings`

**Transformation Example**:
```typescript
// BEFORE
const { sipSettings, updateSipSettings } = useSettings();
updateSipSettings({ server: 'sip.test.com' });

// AFTER
const { settings, updateSettings } = useSettings();
updateSettings({
  sip: {
    ...settings.value.sip,
    server: 'sip.test.com'
  }
});
```

#### Phase 2: Connection State Synchronization (3 tests)
- ✏️ Fix: `should update registration expiry from settings`
- ✏️ Fix: `should trigger re-registration on server change`
- ✏️ Fix: `should preserve registration state during settings update`

#### Phase 3: Auto-Register Behavior (3 tests)
- ✏️ Fix: `should auto-register when enabled in settings`
- ✏️ Fix: `should not auto-register when disabled`
- ✏️ Fix: `should update auto-register setting dynamically`

#### Phase 4: Transport Protocol Settings (3 tests)
- ✏️ Fix: `should apply UDP transport`
- ✏️ Fix: `should apply TCP transport`
- ✏️ Fix: `should apply WebSocket transport`

#### Phase 5: Network Settings Application (3 tests)
- ✏️ Fix: `should apply QoS settings`
- ✏️ Fix: `should apply bitrate limits`
- ✏️ Fix: `should apply adaptive bitrate settings`

**Transformation Example**:
```typescript
// BEFORE
const { networkSettings, updateNetworkSettings } = useSettings();
updateNetworkSettings({ enableQos: true });

// AFTER
const { settings, updateSettings } = useSettings();
updateSettings({
  network: {
    ...settings.value.network,
    enableQos: true
  }
});
```

#### Phase 6: Settings Validation Before Connection (3 tests)
- ✏️ Fix: `should validate SIP settings before connecting`
- ✏️ Fix: `should prevent connection with invalid settings`
- ✏️ Fix: `should provide validation errors`

**Transformation Example**:
```typescript
// BEFORE
const { validateSipSettings } = useSettings();
const result = validateSipSettings();

// AFTER
const { validate } = useSettings();
const result = validate();
```

#### Phase 7: Connection Error Handling (2 tests)
- ✏️ Fix: `should handle registration failure`
- ✏️ Fix: `should retry registration with updated settings`

#### Phase 8: Settings Persistence (2 tests)
- ✏️ Fix: `should save settings without affecting connection`
- ✏️ Fix: `should restore settings and connection state`

**Transformation Example**:
```typescript
// BEFORE
const { saveSettings } = useSettings();
await saveSettings();

// AFTER
const { save } = useSettings();
await save();
```

#### Phase 9: Real-time Settings Updates (2 tests)
- ✏️ Fix: `should apply settings changes while connected`
- ✏️ Fix: `should trigger reconnection for critical changes`

#### Phase 10: Multiple Profiles & Edge Cases (3 tests)
- ✏️ Fix: `should switch between SIP profiles`
- ✏️ Fix: `should handle empty server address`
- ✏️ Fix: `should handle invalid port numbers`
- ✏️ Fix: `should handle very long expiry times`

---

### File 2: `tests/integration/settings-audiodevices.test.ts`

**Total Tests**: 24 tests across 9 describe blocks

#### Phase 1: Device Selection Persistence (4 tests)
- ✏️ Fix: `should persist selected microphone to settings`
- ✏️ Fix: `should persist selected speaker to settings`
- ✏️ Fix: `should restore device selection from settings`
- ✏️ Fix: `should handle device not available`

**Transformation Example**:
```typescript
// BEFORE
const { audioSettings, updateAudioSettings } = useSettings();
updateAudioSettings({ inputDeviceId: 'mic-1' });
expect(audioSettings.value.inputDeviceId).toBe('mic-1');

// AFTER
const { settings, updateSettings } = useSettings();
updateSettings({
  audio: {
    ...settings.value.audio,
    inputDeviceId: 'mic-1'
  }
});
expect(settings.value.audio.inputDeviceId).toBe('mic-1');
```

#### Phase 2: Volume Settings Integration (2 tests)
- ✏️ Fix: `should apply volume from settings`
- ✏️ Fix: `should update settings when volume changes`

#### Phase 3: Audio Processing Settings (4 tests)
- ✏️ Fix: `should apply echo cancellation setting`
- ✏️ Fix: `should apply noise suppression setting`
- ✏️ Fix: `should apply auto gain control setting`
- ✏️ Fix: `should update all audio processing settings together`

#### Phase 4: Sample Rate and Channel Settings (2 tests)
- ✏️ Fix: `should apply sample rate from settings`
- ✏️ Fix: `should apply channel count from settings`

#### Phase 5: Permission Handling (2 tests)
- ✏️ Fix: `should request permissions when settings require devices`
- ✏️ Fix: `should handle permission denial gracefully`

#### Phase 6: Device Change Handling (2 tests)
- ✏️ Fix: `should update settings when device becomes unavailable`
- ✏️ Fix: `should refresh device list when new device detected`

#### Phase 7: Settings Save/Load with Devices (2 tests)
- ✏️ Fix: `should save device preferences with settings`
- ✏️ Fix: `should restore device selection on settings load`

**Transformation Example**:
```typescript
// BEFORE
const { audioSettings, updateAudioSettings, saveSettings } = useSettings();
updateAudioSettings({ inputDeviceId: 'mic-1' });
await saveSettings();

// AFTER
const { settings, updateSettings, save } = useSettings();
updateSettings({
  audio: {
    ...settings.value.audio,
    inputDeviceId: 'mic-1'
  }
});
await save();
```

#### Phase 8: Audio Constraints from Settings (2 tests)
- ✏️ Fix: `should build constraints from settings`
- ✏️ Fix: `should apply constraints to new streams`

#### Phase 9: Error Handling & Reactive Updates (4 tests)
- ✏️ Fix: `should handle device enumeration errors`
- ✏️ Fix: `should handle device selection errors`
- ✏️ Fix: `should reactively update when settings change`
- ✏️ Fix: `should reactively update when device changes`

---

## ⚙️ Implementation Steps

### Step 1: Setup and Analysis (15 min)
1. ✅ Read and understand the `SettingsSchema` structure
2. ✅ Create this implementation plan document
3. ✅ Set up todo list for tracking progress

### Step 2: Fix settings-connection.test.ts (45 min)
1. Remove `describe.skip()` from line 15
2. Transform all 27 tests following the patterns above
3. Run tests and fix any remaining issues
4. Verify all tests pass

### Step 3: Fix settings-audiodevices.test.ts (30 min)
1. Remove `describe.skip()` from line 34
2. Transform all 24 tests following the patterns above
3. Run tests and fix any remaining issues
4. Verify all tests pass

### Step 4: Validation and Documentation (15 min)
1. Run full test suite: `npm run test`
2. Verify all 51 tests now pass
3. Update `CI-CD-READINESS-REPORT.md`
4. Remove FIXME comments from test files
5. Commit changes with descriptive message

---

## 🎯 Success Criteria

- [ ] All 27 tests in `settings-connection.test.ts` pass
- [ ] All 24 tests in `settings-audiodevices.test.ts` pass
- [ ] Total passing tests: 3,629 (up from 3,577)
- [ ] Zero skipped tests (down from 52)
- [ ] CI/CD remains green
- [ ] No new errors or warnings
- [ ] Code follows existing test patterns

---

## 🔍 Testing Strategy

### During Implementation
```bash
# Test individual file
npm run test tests/integration/settings-connection.test.ts
npm run test tests/integration/settings-audiodevices.test.ts

# Test both files
npm run test tests/integration/settings-*.test.ts
```

### Final Validation
```bash
# Run full test suite
npm run test

# Expected output:
# ✅ Test Files: 104 passed (104)
# ✅ Tests: 3,629 passed (3,629)
# ✅ Duration: ~14s
```

---

## 📝 Common Pitfalls to Avoid

1. **Forgetting to spread existing values**
   ```typescript
   // ❌ WRONG - Overwrites entire sip object
   updateSettings({ sip: { server: 'new.com' } })

   // ✅ RIGHT - Preserves other sip properties
   updateSettings({
     sip: {
       ...settings.value.sip,
       server: 'new.com'
     }
   })
   ```

2. **Using wrong property paths**
   ```typescript
   // ❌ WRONG
   settings.value.server

   // ✅ RIGHT
   settings.value.sip.server
   ```

3. **Incorrect method names**
   ```typescript
   // ❌ WRONG
   validateSipSettings()
   saveSettings()

   // ✅ RIGHT
   validate()
   save()
   ```

---

## 📊 Progress Tracking

Track progress using the TodoWrite tool with these milestones:

- [ ] Phase 1: Analysis complete (15 min)
- [ ] Phase 2: settings-connection.test.ts fixed (45 min)
- [ ] Phase 3: settings-audiodevices.test.ts fixed (30 min)
- [ ] Phase 4: Validation complete (15 min)

**Total Estimated Time**: 1.5-2 hours

---

## 🚀 Ready to Start

This plan provides everything needed to systematically fix all 51 tests:

1. **Clear transformations** - Before/after examples for every pattern
2. **Structured approach** - Broken down into manageable phases
3. **Success criteria** - Clear definition of "done"
4. **Testing strategy** - How to validate changes
5. **Pitfall guide** - Common mistakes to avoid

**Next Step**: Begin with Step 2, Phase 1 of settings-connection.test.ts

---

**Document Version**: 1.0
**Created**: 2025-12-14
**Last Updated**: 2025-12-14
**Status**: ✅ Ready for Implementation
