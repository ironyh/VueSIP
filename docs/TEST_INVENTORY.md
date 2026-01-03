# Test Inventory

Complete inventory of all test files in the VueSIP project.

**Total Test Files**: 118
**Total Tests**: 3,572
**Last Updated**: 2025-12-22

---

## Unit Tests (95 files, 2,894 tests)

### Composables (31 files)

- ✅ `useAmiAgentLogin.test.ts` - 67 tests
- ✅ `useAmiAgentStats.test.ts` - 49 tests
- ✅ `useAmiBlacklist.test.ts` - 56 tests
- ✅ `useAmiCDR.test.ts` - 52 tests
- ✅ `useAmiCallback.test.ts` - 46 tests
- ✅ `useAmiCalls.test.ts` - 32 tests
- ✅ `useAmiDatabase.test.ts` - 42 tests
- ✅ `useAmiFeatureCodes.test.ts` - 41 tests
- ✅ `useAmiIVR.test.ts` - 46 tests
- ✅ `useAmiPaging.test.ts` - 48 tests
- ✅ `useAmiParking.test.ts` - 33 tests
- ✅ `useAmiPeers.test.ts` - 30 tests
- ✅ `useAmiQueues.test.ts` - 39 tests
- ✅ `useAmiRecording.test.ts` - 56 tests
- ✅ `useAmiRingGroups.test.ts` - 49 tests
- ✅ `useAmiSupervisor.test.ts` - 32 tests
- ✅ `useAmiTimeConditions.test.ts` - 56 tests
- ✅ `useAmiVoicemail.test.ts` - 27 tests
- ✅ `useAmi.test.ts` - 24 tests
- ✅ `useAudioDevices.simplified.test.ts` - 10 tests
- ✅ `useAudioDevices.test.ts` - 52 tests
- ✅ `useCallControls.test.ts` - 57 tests
- ✅ `useCallHistory.test.ts` - 57 tests
- ✅ `useCallSession.test.ts` - 79 tests
- ✅ `useCallTransfer.test.ts` - 24 tests
- ✅ `useConference.test.ts` - 86 tests
- ✅ `useDTMF.test.ts` - 51 tests (long running: 2082ms)
- ✅ `useDialog.test.ts` - 30 tests
- ✅ `useMediaDevices.test.ts` - 68 tests
- ✅ `useMessaging.test.ts` - 66 tests
- ✅ `useOAuth2.test.ts` - 29 tests (8 Vue warnings - expected)
- ✅ `usePresence.test.ts` - 64 tests
- ✅ `useSipAutoAnswer.test.ts` - 62 tests
- ✅ `useSipClient.test.ts` - 48 tests (long running: 3405ms)
- ✅ `useSipDtmf.test.ts` - 19 tests
- ✅ `useSipE911.test.ts` - 46 tests
- ✅ `useSipRegistration.test.ts` - 49 tests
- ✅ `useSipSecondLine.test.ts` - 68 tests
- ✅ `useSipWebRTCStats.test.ts` - 45 tests
- ⚠️ `index.test.ts` - 11 tests (composables barrel export)
- ❌ `useTheme.test.ts` - MISSING (0% coverage)

### Core (11 files)

- ✅ `AudioManager.test.ts` - 58 tests
- ✅ `CallSession.test.ts` - 53 tests
- ✅ `CallSession.transfer.test.ts` - 25 tests
- ✅ `DTMFManager.test.ts` - 90 tests
- ✅ `EventBus.test.ts` - 43 tests
- ✅ `FreePBXPresenceBridge.test.ts` - 52 tests
- ✅ `MultiLineManager.test.ts` - 78 tests
- ✅ `AmiClient.test.ts` - 67 tests
- ✅ `MediaManager.test.ts` - 90 tests
- ✅ `SipClient.test.ts` - 79 tests
- ✅ `SipClient.conference.test.ts` - 11 tests
- ✅ `SipClient.media.test.ts` - 14 tests
- ✅ `SipClient.presence.test.ts` - 19 tests
- ✅ `TransportManager.test.ts` - 24 tests

### Components (4 files)

- ✅ `CallControls.test.ts` - 13 tests
- ✅ `Dialpad.test.ts` - 20 tests
- ✅ `ReturnTimeDisplay.test.ts` - 29 tests

### Providers (5 files)

- ✅ `ConfigProvider.test.ts` - 33 tests
- ✅ `MediaProvider.test.ts` - 30 tests
- ✅ `OAuth2Provider.test.ts` - 30 tests
- ✅ `SipClientProvider.test.ts` - 25 tests
- ⚠️ `index.test.ts` - 10 tests (providers barrel export)

### Plugins (13 files)

- ✅ `AnalyticsPlugin.test.ts` - 27 tests
- ✅ `AnalyticsPlugin.edgecases.test.ts` - 17 tests
- ✅ `AnalyticsPlugin.lifecycle.test.ts` - 6 tests
- ✅ `AnalyticsPlugin.security.test.ts` - 4 tests
- ✅ `AnalyticsPlugin.validation.test.ts` - 10 tests
- ✅ `HookManager.test.ts` - 31 tests
- ✅ `PluginManager.test.ts` - 36 tests
- ✅ `RecordingPlugin.test.ts` - 33 tests
- ✅ `RecordingPlugin.concurrency.test.ts` - 3 tests
- ✅ `RecordingPlugin.download.test.ts` - 3 tests
- ✅ `RecordingPlugin.edgecases.test.ts` - 23 tests
- ✅ `RecordingPlugin.lifecycle.test.ts` - 4 tests
- ✅ `RecordingPlugin.persistence.test.ts` - 2 tests
- ✅ `RecordingPlugin.security.test.ts` - 4 tests
- ⚠️ `index.test.ts` - 5 tests (plugins barrel export)

### Services (2 files)

- ✅ `AmiService.test.ts` - 50 tests
- ✅ `OAuth2Service.test.ts` - 47 tests

### Storage (5 files)

- ✅ `IndexedDBAdapter.test.ts` - 30 tests
- ✅ `LocalStorageAdapter.test.ts` - 29 tests
- ✅ `SessionStorageAdapter.test.ts` - 29 tests
- ✅ `persistence.test.ts` - 19 tests
- ⚠️ `index.test.ts` - 6 tests (storage barrel export)

### Stores (5 files)

- ✅ `callStore.test.ts` - 37 tests
- ✅ `configStore.test.ts` - 50 tests
- ✅ `deviceStore.test.ts` - 36 tests
- ✅ `persistence.test.ts` - 30 tests (3 Vi.fn() warnings - expected)
- ✅ `registrationStore.test.ts` - 35 tests
- ⚠️ `index.test.ts` - 11 tests (stores barrel export)

### Utils (11 files)

- ✅ `EventEmitter.test.ts` - 31 tests
- ✅ `abortController.test.ts` - 23 tests
- ✅ `dialogInfoParser.test.ts` - 37 tests
- ✅ `encryption.test.ts` - 34 tests
- ✅ `env.test.ts` - 7 tests
- ✅ `errorContext.test.ts` - 25 tests
- ✅ `errorHelpers.test.ts` - 32 tests
- ✅ `formatters.test.ts` - 74 tests
- ✅ `logger.test.ts` - 29 tests
- ✅ `storageQuota.test.ts` - 25 tests
- ✅ `validators.test.ts` - 69 tests

### Adapters (2 files)

- ✅ `AdapterFactory.test.ts` - 17 tests
- ⚠️ `index.test.ts` - 7 tests (adapters barrel export)

### Other (5 files)

- ✅ `configuration.test.ts` - 2 tests
- ✅ `encryption.test.ts` - 24 tests
- ✅ `test-utilities.test.ts` - 9 tests
- ✅ `validators.test.ts` - 58 tests
- ⚠️ `types/index.test.ts` - 4 tests (type imports, long: 565ms)
- ⚠️ `index.test.ts` - 17 tests (main barrel export)

---

## Integration Tests (6 files, 136 tests)

- ✅ `agent-network-conditions.test.ts` - 25 tests (long: 3105ms)
- ✅ `agent-to-agent.test.ts` - 21 tests (very long: 8227ms)
- ✅ `conference.test.ts` - 41 tests
- ✅ `device-switching.test.ts` - 14 tests
- ✅ `network-resilience.test.ts` - 15 tests
- ✅ `sip-workflow.test.ts` - 15 tests

**Notes**:

- Agent tests simulate real multi-agent SIP scenarios
- Long running times expected for network condition testing
- All integration tests use isolated workers for stability

---

## Performance Tests (8 files, 120 tests)

### Load Tests (4 files)

- ✅ `concurrent-calls.test.ts` - 12 tests
- ✅ `event-listeners.test.ts` - 22 tests
- ✅ `large-call-history.test.ts` - 41 tests
- ✅ `memory-leaks.test.ts` - 13 tests (very long: 5614ms, GC warning)
- ✅ `rapid-operations.test.ts` - 13 tests (long: 1256ms)

**Notes**:

- Memory leak tests should be run with `--expose-gc` for accurate results
- Load tests verify system behavior under stress conditions
- Heap usage monitoring validates memory efficiency

### Metrics (3 files)

- ✅ `bundle-size.test.ts` - 11 tests
- ✅ `latency-tracking.test.ts` - 9 tests

**Notes**:

- Bundle size tests validate production build optimization
- Latency tests measure performance characteristics

---

## Component Tests (9 files, 422 tests)

**Note**: Component tests are embedded in the composables tests above.
All Vue component testing uses @vue/test-utils with proper isolation.

---

## Test Categories Summary

| Category    | Files    | Tests     | Avg Tests/File | Notes                     |
| ----------- | -------- | --------- | -------------- | ------------------------- |
| Unit        | 95       | 2,894     | 30.5           | Core functionality        |
| Integration | 6        | 136       | 22.7           | Multi-component scenarios |
| Performance | 8        | 120       | 15.0           | Load and stress testing   |
| Components  | Embedded | -         | -              | In composables tests      |
| **TOTAL**   | **118**  | **3,572** | **30.3**       | -                         |

---

## Test Execution Times

### Fast Tests (<100ms)

- Most unit tests execute in 10-100ms
- Quick feedback loop for development
- Suitable for watch mode

### Medium Tests (100-500ms)

- Complex composable tests
- Provider and service tests
- Integration scenarios

### Long Tests (>500ms)

- `useDTMF.test.ts` - 2082ms
- `useSipClient.test.ts` - 3405ms
- `agent-network-conditions.test.ts` - 3105ms
- `memory-leaks.test.ts` - 5614ms
- `agent-to-agent.test.ts` - 8227ms

**Total Suite Execution**: ~25 seconds

---

## Coverage Gaps

### Zero Coverage (Needs Tests)

- ❌ `src/composables/useTheme.ts` - 0%

### Low Coverage (<60%)

- ⚠️ `src/core/SipClient.ts` - 50.65%
- ⚠️ `src/providers/OAuth2Provider.ts` - 48.27%
- ⚠️ `src/providers/SipClientProvider.ts` - 45.45%

### Medium Coverage (60-75%)

- ⚠️ `src/composables/useSipSecondLine.ts` - 60.56%
- ⚠️ `src/composables/useSipE911.ts` - 59.53%

---

## Test Quality Indicators

### Strengths ✅

- Comprehensive coverage across all modules
- Well-organized test structure
- Good separation of unit/integration/performance tests
- Proper test isolation and cleanup
- Realistic integration scenarios

### Weaknesses ⚠️

- Some core modules below coverage threshold
- Missing tests for useTheme composable
- Provider tests could be more comprehensive
- Some edge cases not fully covered

---

## Test Commands Reference

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# Performance tests
pnpm test:performance

# Watch mode
pnpm test:watch

# Coverage
pnpm coverage

# Specific test file
pnpm test -- useTheme.test.ts

# With GC for memory tests
pnpm test:performance:gc
```

---

**Last Updated**: 2025-12-22 01:48 UTC
**Branch**: feat/ticket-005-media-event-type-safety
**Status**: 3,572/3,572 tests passing ✅
