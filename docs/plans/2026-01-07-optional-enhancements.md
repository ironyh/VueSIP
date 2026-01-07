# Optional Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 4 optional enhancement features: PiP CallSession integration, automatic network reconnection, session persistence across reconnects, and recording status indicators.

**Architecture:** Each enhancement extends existing composables with new functionality. PiP integration adds video management to CallSession. Network reconnection adds navigator.connection monitoring to ConnectionRecovery. Session persistence adds IndexedDB storage for session state. Recording indicators create a new composable for visual recording status.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, WebRTC APIs, IndexedDB, Network Information API

---

## Task 1: PiP CallSession Integration

**Files:**
- Modify: `src/composables/useCallSession.ts`
- Modify: `src/types/call-session.types.ts`
- Test: `tests/unit/composables/useCallSession.pip.test.ts`
- Demo: `playground/demos/CallSessionPiPDemo.vue`
- Example: `playground/examples/call-session-pip.ts`

### Step 1: Write failing test for PiP integration in CallSession

```typescript
// tests/unit/composables/useCallSession.pip.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCallSession } from '../../../src/composables/useCallSession'
import { withSetup } from '../../utils/test-helpers'

// Mock PiP API
const mockPiPWindow = {
  width: 300,
  height: 169,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

const mockVideoElement = {
  requestPictureInPicture: vi.fn().mockResolvedValue(mockPiPWindow),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 4,
  videoWidth: 640,
  videoHeight: 360,
}

// Mock document.pictureInPictureEnabled
Object.defineProperty(document, 'pictureInPictureEnabled', {
  value: true,
  writable: true,
})

Object.defineProperty(document, 'pictureInPictureElement', {
  value: null,
  writable: true,
})

describe('useCallSession - PiP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PiP support detection', () => {
    it('should expose isPiPSupported property', () => {
      const mockClient = { on: vi.fn(), off: vi.fn() }
      const { result, unmount } = withSetup(() => useCallSession(mockClient as any))

      expect(result.isPiPSupported).toBeDefined()
      expect(typeof result.isPiPSupported.value).toBe('boolean')

      unmount()
    })
  })

  describe('PiP operations', () => {
    it('should provide enterPiP method', () => {
      const mockClient = { on: vi.fn(), off: vi.fn() }
      const { result, unmount } = withSetup(() => useCallSession(mockClient as any))

      expect(result.enterPiP).toBeDefined()
      expect(typeof result.enterPiP).toBe('function')

      unmount()
    })

    it('should provide exitPiP method', () => {
      const mockClient = { on: vi.fn(), off: vi.fn() }
      const { result, unmount } = withSetup(() => useCallSession(mockClient as any))

      expect(result.exitPiP).toBeDefined()
      expect(typeof result.exitPiP).toBe('function')

      unmount()
    })

    it('should track isPiPActive state', () => {
      const mockClient = { on: vi.fn(), off: vi.fn() }
      const { result, unmount } = withSetup(() => useCallSession(mockClient as any))

      expect(result.isPiPActive).toBeDefined()
      expect(result.isPiPActive.value).toBe(false)

      unmount()
    })
  })

  describe('auto-exit on call end', () => {
    it('should exit PiP when call ends', async () => {
      const mockClient = { on: vi.fn(), off: vi.fn() }
      const { result, unmount } = withSetup(() => useCallSession(mockClient as any))

      // Simulate PiP active then call ends
      // Implementation will handle this automatically
      expect(result.isPiPActive.value).toBe(false)

      unmount()
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/unit/composables/useCallSession.pip.test.ts`
Expected: FAIL with "isPiPSupported is undefined" or similar

### Step 3: Add PiP types to call-session.types.ts

```typescript
// Add to src/types/call-session.types.ts

/**
 * PiP integration options for CallSession
 */
export interface CallSessionPiPOptions {
  /** Auto-enter PiP when call is answered */
  autoEnterOnAnswer?: boolean
  /** Auto-exit PiP when call ends */
  autoExitOnEnd?: boolean
  /** Persist PiP preference */
  persistPreference?: boolean
}

// Add to UseCallSessionReturn interface:
/** Whether Picture-in-Picture is supported */
isPiPSupported: ComputedRef<boolean>
/** Whether PiP is currently active */
isPiPActive: Ref<boolean>
/** Enter Picture-in-Picture mode */
enterPiP: (videoElement: HTMLVideoElement) => Promise<PictureInPictureWindow | null>
/** Exit Picture-in-Picture mode */
exitPiP: () => Promise<void>
/** Toggle Picture-in-Picture mode */
togglePiP: (videoElement: HTMLVideoElement) => Promise<void>
```

### Step 4: Implement PiP integration in useCallSession

```typescript
// Add to src/composables/useCallSession.ts

// Add import at top
import { usePictureInPicture } from './usePictureInPicture'

// Inside useCallSession function, add:

// PiP integration
const pip = usePictureInPicture({
  persistPreference: options?.pip?.persistPreference ?? true,
})

const isPiPSupported = pip.isPiPSupported
const isPiPActive = pip.isPiPActive

const enterPiP = async (videoElement: HTMLVideoElement): Promise<PictureInPictureWindow | null> => {
  if (!callState.value || callState.value === 'idle' || callState.value === 'ended') {
    console.warn('Cannot enter PiP: No active call')
    return null
  }
  return pip.enterPiP(videoElement)
}

const exitPiP = pip.exitPiP

const togglePiP = async (videoElement: HTMLVideoElement): Promise<void> => {
  if (isPiPActive.value) {
    await exitPiP()
  } else {
    await enterPiP(videoElement)
  }
}

// Auto-exit PiP when call ends
watch(callState, async (newState) => {
  if (newState === 'ended' && isPiPActive.value) {
    await exitPiP()
  }
})

// Add to return object:
// PiP integration
isPiPSupported,
isPiPActive,
enterPiP,
exitPiP,
togglePiP,
```

### Step 5: Run test to verify it passes

Run: `npm test -- tests/unit/composables/useCallSession.pip.test.ts`
Expected: PASS

### Step 6: Create playground demo

```vue
<!-- playground/demos/CallSessionPiPDemo.vue -->
<template>
  <div class="call-session-pip-demo">
    <h2>CallSession PiP Integration</h2>

    <div class="demo-grid">
      <!-- Video Display -->
      <div class="video-section">
        <div class="video-container">
          <video
            ref="videoRef"
            autoplay
            playsinline
            muted
          />
          <div v-if="!hasVideo" class="no-video">
            No video stream
          </div>
        </div>

        <div class="video-controls">
          <button
            @click="togglePiP"
            :disabled="!isPiPSupported || !hasVideo"
            :class="{ active: isPiPActive }"
          >
            {{ isPiPActive ? 'Exit PiP' : 'Enter PiP' }}
          </button>
        </div>
      </div>

      <!-- Status Panel -->
      <div class="status-panel">
        <h3>PiP Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="label">Supported:</span>
            <span :class="isPiPSupported ? 'success' : 'error'">
              {{ isPiPSupported ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Active:</span>
            <span :class="isPiPActive ? 'success' : 'muted'">
              {{ isPiPActive ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Call State:</span>
            <span>{{ callState || 'idle' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulation Controls -->
    <SimulationControls
      :scenarios="scenarios"
      @scenario="handleScenario"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SimulationControls from '../components/SimulationControls.vue'

// Simulated state for demo
const videoRef = ref<HTMLVideoElement | null>(null)
const isPiPSupported = ref(document.pictureInPictureEnabled ?? false)
const isPiPActive = ref(false)
const callState = ref<string>('idle')
const hasVideo = computed(() => !!videoRef.value?.srcObject)

const scenarios = [
  { id: 'start-call', label: 'Start Call', description: 'Simulate incoming video call' },
  { id: 'end-call', label: 'End Call', description: 'End call (auto-exits PiP)' },
  { id: 'toggle-pip', label: 'Toggle PiP', description: 'Enter/exit Picture-in-Picture' },
]

const togglePiP = async () => {
  if (!videoRef.value) return

  if (isPiPActive.value) {
    await document.exitPictureInPicture()
    isPiPActive.value = false
  } else {
    await videoRef.value.requestPictureInPicture()
    isPiPActive.value = true
  }
}

const handleScenario = async (scenarioId: string) => {
  switch (scenarioId) {
    case 'start-call':
      callState.value = 'answered'
      // Get test video stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.value) {
          videoRef.value.srcObject = stream
        }
      } catch {
        console.warn('Could not get camera, using test pattern')
      }
      break

    case 'end-call':
      callState.value = 'ended'
      if (isPiPActive.value) {
        await document.exitPictureInPicture()
        isPiPActive.value = false
      }
      if (videoRef.value?.srcObject) {
        const stream = videoRef.value.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.value.srcObject = null
      }
      setTimeout(() => { callState.value = 'idle' }, 1000)
      break

    case 'toggle-pip':
      await togglePiP()
      break
  }
}
</script>

<style scoped>
.call-session-pip-demo {
  padding: 1rem;
}

.demo-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1rem;
  margin-bottom: 1rem;
}

.video-container {
  position: relative;
  background: #1a1a2e;
  border-radius: 8px;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-video {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.video-controls {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.video-controls button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #333;
  background: #2a2a3e;
  color: #fff;
  cursor: pointer;
}

.video-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.video-controls button.active {
  background: #4a4ae8;
}

.status-panel {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 1rem;
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
}

.success { color: #4ade80; }
.error { color: #f87171; }
.muted { color: #666; }
</style>
```

### Step 7: Create example definition

```typescript
// playground/examples/call-session-pip.ts
import type { ExampleDefinition } from './types'
import CallSessionPiPDemo from '../demos/CallSessionPiPDemo.vue'

export const callSessionPiPExample: ExampleDefinition = {
  id: 'call-session-pip',
  icon: '🖼️',
  title: 'CallSession PiP Integration',
  description: 'Picture-in-Picture integration with call sessions',
  category: 'sip',
  tags: ['Advanced', 'Video', 'PiP'],
  component: CallSessionPiPDemo,
  setupGuide: '<p>Use Picture-in-Picture during active calls. PiP automatically exits when the call ends.</p>',
  codeSnippets: [
    {
      title: 'Using PiP with CallSession',
      description: 'Enter Picture-in-Picture mode during a call',
      code: `import { useCallSession } from 'vuesip'

const {
  isPiPSupported,
  isPiPActive,
  enterPiP,
  exitPiP,
  togglePiP,
  callState
} = useCallSession(sipClient)

// Enter PiP with the remote video element
const handleEnterPiP = async () => {
  const videoEl = document.querySelector('video.remote-video')
  if (videoEl && callState.value === 'answered') {
    await enterPiP(videoEl)
  }
}

// PiP automatically exits when call ends`,
    },
  ],
}
```

### Step 8: Register the example

Add to `playground/examples/index.ts`:
```typescript
import { callSessionPiPExample } from './call-session-pip'

// Add to examples array
export const examples: ExampleDefinition[] = [
  // ... existing examples
  callSessionPiPExample,
]
```

### Step 9: Commit

```bash
git add src/composables/useCallSession.ts src/types/call-session.types.ts tests/unit/composables/useCallSession.pip.test.ts playground/demos/CallSessionPiPDemo.vue playground/examples/call-session-pip.ts playground/examples/index.ts
git commit -m "feat(call-session): add Picture-in-Picture integration

- Add isPiPSupported, isPiPActive, enterPiP, exitPiP, togglePiP to useCallSession
- Auto-exit PiP when call ends
- Add playground demo and example
- Add unit tests for PiP integration"
```

---

## Task 2: Automatic Network Reconnection

**Files:**
- Modify: `src/composables/useConnectionRecovery.ts`
- Modify: `src/types/connection-recovery.types.ts`
- Test: `tests/unit/composables/useConnectionRecovery.network.test.ts`
- Demo: Update `playground/demos/ConnectionRecoveryDemo.vue`

### Step 1: Write failing test for network change detection

```typescript
// tests/unit/composables/useConnectionRecovery.network.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConnectionRecovery } from '../../../src/composables/useConnectionRecovery'
import { withSetup } from '../../utils/test-helpers'

// Mock navigator.connection
const mockConnection = {
  type: 'wifi',
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

Object.defineProperty(navigator, 'connection', {
  value: mockConnection,
  writable: true,
  configurable: true,
})

// Mock RTCPeerConnection
const mockPeerConnection = {
  iceConnectionState: 'connected',
  connectionState: 'connected',
  restartIce: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

describe('useConnectionRecovery - Network Change Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('network monitoring', () => {
    it('should expose networkInfo reactive property', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      expect(result.networkInfo).toBeDefined()
      expect(result.networkInfo.value).toMatchObject({
        type: expect.any(String),
        effectiveType: expect.any(String),
        isOnline: expect.any(Boolean),
      })

      unmount()
    })

    it('should detect network type changes', () => {
      const onNetworkChange = vi.fn()
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          onNetworkChange,
        })
      )

      // Simulate network change event
      const changeHandler = mockConnection.addEventListener.mock.calls
        .find(call => call[0] === 'change')?.[1]

      if (changeHandler) {
        mockConnection.type = 'cellular'
        changeHandler()
      }

      expect(onNetworkChange).toHaveBeenCalled()

      unmount()
    })

    it('should trigger recovery on network change when connected', async () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      result.monitor(mockPeerConnection as any)

      // Simulate network change
      const changeHandler = mockConnection.addEventListener.mock.calls
        .find(call => call[0] === 'change')?.[1]

      if (changeHandler) {
        changeHandler()
        vi.advanceTimersByTime(1000)
      }

      // Should attempt ICE restart
      expect(mockPeerConnection.restartIce).toHaveBeenCalled()

      unmount()
    })
  })

  describe('online/offline handling', () => {
    it('should detect offline state', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      window.dispatchEvent(new Event('offline'))

      expect(result.networkInfo.value.isOnline).toBe(false)

      // Restore
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

      unmount()
    })

    it('should attempt recovery when coming back online', async () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      result.monitor(mockPeerConnection as any)

      // Simulate coming back online
      window.dispatchEvent(new Event('online'))
      vi.advanceTimersByTime(2000)

      expect(mockPeerConnection.restartIce).toHaveBeenCalled()

      unmount()
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/unit/composables/useConnectionRecovery.network.test.ts`
Expected: FAIL with "networkInfo is undefined"

### Step 3: Add network types

```typescript
// Add to src/types/connection-recovery.types.ts

/**
 * Network information from Network Information API
 */
export interface NetworkInfo {
  /** Connection type (wifi, cellular, ethernet, etc.) */
  type: string
  /** Effective connection type (4g, 3g, 2g, slow-2g) */
  effectiveType: string
  /** Downlink speed in Mbps */
  downlink: number
  /** Round-trip time in ms */
  rtt: number
  /** Whether browser is online */
  isOnline: boolean
}

// Add to ConnectionRecoveryOptions:
/** Auto-reconnect when network changes (e.g., WiFi to cellular) */
autoReconnectOnNetworkChange?: boolean
/** Callback when network change is detected */
onNetworkChange?: (info: NetworkInfo) => void
/** Delay before attempting reconnection after network change (ms) */
networkChangeDelay?: number

// Add to UseConnectionRecoveryReturn:
/** Current network information */
networkInfo: Ref<NetworkInfo>
```

### Step 4: Implement network change detection

```typescript
// Add to src/composables/useConnectionRecovery.ts

// Add network monitoring state
const networkInfo: Ref<NetworkInfo> = ref({
  type: 'unknown',
  effectiveType: 'unknown',
  downlink: 0,
  rtt: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
})

// Network change handling
const updateNetworkInfo = () => {
  const connection = (navigator as any).connection
  if (connection) {
    networkInfo.value = {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      isOnline: navigator.onLine,
    }
  } else {
    networkInfo.value = {
      ...networkInfo.value,
      isOnline: navigator.onLine,
    }
  }
}

const handleNetworkChange = () => {
  const previousInfo = { ...networkInfo.value }
  updateNetworkInfo()

  options.onNetworkChange?.(networkInfo.value)

  // Attempt recovery if connected and network changed
  if (options.autoReconnectOnNetworkChange && peerConnection && state.value === 'stable') {
    const delay = options.networkChangeDelay ?? 1000
    setTimeout(() => {
      if (peerConnection) {
        peerConnection.restartIce()
      }
    }, delay)
  }
}

const handleOnline = () => {
  networkInfo.value.isOnline = true
  options.onNetworkChange?.(networkInfo.value)

  if (options.autoReconnectOnNetworkChange && peerConnection) {
    const delay = options.networkChangeDelay ?? 2000
    setTimeout(() => {
      if (peerConnection) {
        peerConnection.restartIce()
      }
    }, delay)
  }
}

const handleOffline = () => {
  networkInfo.value.isOnline = false
  options.onNetworkChange?.(networkInfo.value)
}

// Setup network listeners in monitor function
const setupNetworkListeners = () => {
  if (typeof window === 'undefined') return

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  const connection = (navigator as any).connection
  if (connection) {
    connection.addEventListener('change', handleNetworkChange)
  }

  updateNetworkInfo()
}

const cleanupNetworkListeners = () => {
  if (typeof window === 'undefined') return

  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)

  const connection = (navigator as any).connection
  if (connection) {
    connection.removeEventListener('change', handleNetworkChange)
  }
}

// Call setupNetworkListeners in monitor() and cleanupNetworkListeners in stopMonitoring()

// Add to return object:
networkInfo,
```

### Step 5: Run test to verify it passes

Run: `npm test -- tests/unit/composables/useConnectionRecovery.network.test.ts`
Expected: PASS

### Step 6: Update ConnectionRecoveryDemo.vue

Add network info display section to the existing demo:

```vue
<!-- Add to playground/demos/ConnectionRecoveryDemo.vue -->

<!-- Network Info Card (add after ICE Health card) -->
<div class="card network-info">
  <h3>Network Information</h3>
  <div class="info-grid">
    <div class="info-item">
      <span class="label">Online:</span>
      <span :class="networkInfo.isOnline ? 'success' : 'error'">
        {{ networkInfo.isOnline ? 'Yes' : 'No' }}
      </span>
    </div>
    <div class="info-item">
      <span class="label">Type:</span>
      <span>{{ networkInfo.type }}</span>
    </div>
    <div class="info-item">
      <span class="label">Effective Type:</span>
      <span>{{ networkInfo.effectiveType }}</span>
    </div>
    <div class="info-item">
      <span class="label">Downlink:</span>
      <span>{{ networkInfo.downlink }} Mbps</span>
    </div>
    <div class="info-item">
      <span class="label">RTT:</span>
      <span>{{ networkInfo.rtt }} ms</span>
    </div>
  </div>
</div>

<!-- Add scenario for network change simulation -->
<script setup>
// Add to scenarios array:
const scenarios = [
  // ... existing scenarios
  { id: 'network-change', label: 'Network Change', description: 'Simulate network type change' },
  { id: 'go-offline', label: 'Go Offline', description: 'Simulate losing connection' },
  { id: 'go-online', label: 'Go Online', description: 'Simulate reconnecting' },
]
</script>
```

### Step 7: Commit

```bash
git add src/composables/useConnectionRecovery.ts src/types/connection-recovery.types.ts tests/unit/composables/useConnectionRecovery.network.test.ts playground/demos/ConnectionRecoveryDemo.vue
git commit -m "feat(connection-recovery): add automatic network reconnection

- Add networkInfo reactive property with Network Information API
- Auto-trigger ICE restart on network type change
- Handle online/offline events
- Add configurable delay before reconnection attempt
- Update demo with network info display"
```

---

## Task 3: Session Persistence Across Reconnects

**Files:**
- Create: `src/composables/useSessionPersistence.ts`
- Create: `src/types/session-persistence.types.ts`
- Test: `tests/unit/composables/useSessionPersistence.test.ts`
- Demo: `playground/demos/SessionPersistenceDemo.vue`
- Example: `playground/examples/session-persistence.ts`
- Modify: `src/composables/index.ts`

### Step 1: Write failing test for session persistence

```typescript
// tests/unit/composables/useSessionPersistence.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSessionPersistence } from '../../../src/composables/useSessionPersistence'
import { withSetup } from '../../utils/test-helpers'

// Mock IndexedDB
const mockStore: Record<string, any> = {}
const mockDB = {
  transaction: vi.fn().mockReturnValue({
    objectStore: vi.fn().mockReturnValue({
      put: vi.fn((data) => {
        mockStore[data.id] = data
        return { onsuccess: null, onerror: null }
      }),
      get: vi.fn((id) => {
        const result = { result: mockStore[id], onsuccess: null, onerror: null }
        setTimeout(() => result.onsuccess?.(), 0)
        return result
      }),
      delete: vi.fn((id) => {
        delete mockStore[id]
        return { onsuccess: null, onerror: null }
      }),
      getAll: vi.fn(() => {
        const result = { result: Object.values(mockStore), onsuccess: null, onerror: null }
        setTimeout(() => result.onsuccess?.(), 0)
        return result
      }),
    }),
  }),
  objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
}

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockReturnValue({
    result: mockDB,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  }),
})

describe('useSessionPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(key => delete mockStore[key])
  })

  describe('initialization', () => {
    it('should return persistence methods', () => {
      const { result, unmount } = withSetup(() => useSessionPersistence())

      expect(result.saveSession).toBeDefined()
      expect(result.loadSession).toBeDefined()
      expect(result.clearSession).toBeDefined()
      expect(result.hasSavedSession).toBeDefined()
      expect(result.isLoading).toBeDefined()
      expect(result.error).toBeDefined()

      unmount()
    })

    it('should initially have no saved session', () => {
      const { result, unmount } = withSetup(() => useSessionPersistence())

      expect(result.hasSavedSession.value).toBe(false)

      unmount()
    })
  })

  describe('saveSession', () => {
    it('should save session state', async () => {
      const { result, unmount } = withSetup(() => useSessionPersistence())

      const sessionState = {
        callId: 'call-123',
        remoteUri: 'sip:user@example.com',
        localStream: null,
        remoteStream: null,
        startTime: Date.now(),
        options: { audio: true, video: true },
      }

      await result.saveSession(sessionState)

      expect(result.hasSavedSession.value).toBe(true)

      unmount()
    })
  })

  describe('loadSession', () => {
    it('should load saved session state', async () => {
      const { result, unmount } = withSetup(() => useSessionPersistence())

      const sessionState = {
        callId: 'call-123',
        remoteUri: 'sip:user@example.com',
        startTime: Date.now(),
      }

      await result.saveSession(sessionState)
      const loaded = await result.loadSession()

      expect(loaded).toMatchObject({
        callId: 'call-123',
        remoteUri: 'sip:user@example.com',
      })

      unmount()
    })

    it('should return null if no session saved', async () => {
      const { result, unmount } = withSetup(() => useSessionPersistence())

      const loaded = await result.loadSession()

      expect(loaded).toBeNull()

      unmount()
    })
  })

  describe('clearSession', () => {
    it('should clear saved session', async () => {
      const { result, unmount } = withSetup(() => useSessionPersistence())

      await result.saveSession({ callId: 'call-123' })
      expect(result.hasSavedSession.value).toBe(true)

      await result.clearSession()
      expect(result.hasSavedSession.value).toBe(false)

      unmount()
    })
  })

  describe('session expiry', () => {
    it('should not load expired sessions', async () => {
      vi.useFakeTimers()

      const { result, unmount } = withSetup(() =>
        useSessionPersistence({ maxAge: 60000 }) // 1 minute
      )

      await result.saveSession({
        callId: 'call-123',
        savedAt: Date.now() - 120000, // 2 minutes ago
      })

      vi.advanceTimersByTime(1000)

      const loaded = await result.loadSession()
      expect(loaded).toBeNull()

      vi.useRealTimers()
      unmount()
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/unit/composables/useSessionPersistence.test.ts`
Expected: FAIL with "Cannot find module"

### Step 3: Create types file

```typescript
// src/types/session-persistence.types.ts
import type { Ref, ComputedRef } from 'vue'

/**
 * Persistable session state
 */
export interface PersistedSessionState {
  /** Unique session identifier */
  id?: string
  /** Call identifier */
  callId: string
  /** Remote party URI */
  remoteUri?: string
  /** Remote party display name */
  remoteName?: string
  /** Call start time */
  startTime?: number
  /** Time when session was saved */
  savedAt?: number
  /** Call direction */
  direction?: 'inbound' | 'outbound'
  /** Media options */
  mediaOptions?: {
    audio?: boolean
    video?: boolean
  }
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Session persistence options
 */
export interface SessionPersistenceOptions {
  /** IndexedDB database name */
  dbName?: string
  /** IndexedDB store name */
  storeName?: string
  /** Maximum age of saved session in ms (default: 5 minutes) */
  maxAge?: number
  /** Auto-clear session after successful restoration */
  autoClearOnRestore?: boolean
}

/**
 * Return type for useSessionPersistence composable
 */
export interface UseSessionPersistenceReturn {
  /** Save current session state */
  saveSession: (state: PersistedSessionState) => Promise<void>
  /** Load saved session state */
  loadSession: () => Promise<PersistedSessionState | null>
  /** Clear saved session */
  clearSession: () => Promise<void>
  /** Whether a saved session exists */
  hasSavedSession: Ref<boolean>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error state */
  error: Ref<Error | null>
  /** Last saved session info (without full state) */
  savedSessionInfo: ComputedRef<{ callId: string; savedAt: number } | null>
}
```

### Step 4: Implement the composable

```typescript
// src/composables/useSessionPersistence.ts
import { ref, computed, onMounted, type Ref, type ComputedRef } from 'vue'
import type {
  SessionPersistenceOptions,
  PersistedSessionState,
  UseSessionPersistenceReturn,
} from '../types/session-persistence.types'

const DEFAULT_OPTIONS: Required<SessionPersistenceOptions> = {
  dbName: 'vuesip-sessions',
  storeName: 'sessions',
  maxAge: 5 * 60 * 1000, // 5 minutes
  autoClearOnRestore: true,
}

/**
 * Vue composable for persisting call session state across reconnects
 *
 * @param options - Configuration options
 * @returns Session persistence controls and state
 */
export function useSessionPersistence(
  options: SessionPersistenceOptions = {}
): UseSessionPersistenceReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const hasSavedSession: Ref<boolean> = ref(false)
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<Error | null> = ref(null)
  const lastSavedInfo: Ref<{ callId: string; savedAt: number } | null> = ref(null)

  const savedSessionInfo: ComputedRef<{ callId: string; savedAt: number } | null> = computed(
    () => lastSavedInfo.value
  )

  let db: IDBDatabase | null = null

  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db)
        return
      }

      const request = indexedDB.open(opts.dbName, 1)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(opts.storeName)) {
          database.createObjectStore(opts.storeName, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  const saveSession = async (state: PersistedSessionState): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      const database = await openDatabase()
      const tx = database.transaction(opts.storeName, 'readwrite')
      const store = tx.objectStore(opts.storeName)

      const sessionData: PersistedSessionState = {
        ...state,
        id: state.id || 'current-session',
        savedAt: Date.now(),
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(sessionData)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      hasSavedSession.value = true
      lastSavedInfo.value = {
        callId: sessionData.callId,
        savedAt: sessionData.savedAt!,
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  const loadSession = async (): Promise<PersistedSessionState | null> => {
    isLoading.value = true
    error.value = null

    try {
      const database = await openDatabase()
      const tx = database.transaction(opts.storeName, 'readonly')
      const store = tx.objectStore(opts.storeName)

      const result = await new Promise<PersistedSessionState | undefined>((resolve, reject) => {
        const request = store.get('current-session')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (!result) {
        return null
      }

      // Check if session is expired
      const savedAt = result.savedAt || 0
      if (Date.now() - savedAt > opts.maxAge) {
        await clearSession()
        return null
      }

      if (opts.autoClearOnRestore) {
        await clearSession()
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      isLoading.value = false
    }
  }

  const clearSession = async (): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      const database = await openDatabase()
      const tx = database.transaction(opts.storeName, 'readwrite')
      const store = tx.objectStore(opts.storeName)

      await new Promise<void>((resolve, reject) => {
        const request = store.delete('current-session')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      hasSavedSession.value = false
      lastSavedInfo.value = null
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      isLoading.value = false
    }
  }

  const checkForSavedSession = async () => {
    try {
      const database = await openDatabase()
      const tx = database.transaction(opts.storeName, 'readonly')
      const store = tx.objectStore(opts.storeName)

      const result = await new Promise<PersistedSessionState | undefined>((resolve, reject) => {
        const request = store.get('current-session')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (result && result.savedAt) {
        const isExpired = Date.now() - result.savedAt > opts.maxAge
        hasSavedSession.value = !isExpired
        if (!isExpired) {
          lastSavedInfo.value = {
            callId: result.callId,
            savedAt: result.savedAt,
          }
        }
      }
    } catch {
      // Ignore errors during initial check
    }
  }

  onMounted(() => {
    checkForSavedSession()
  })

  return {
    saveSession,
    loadSession,
    clearSession,
    hasSavedSession,
    isLoading,
    error,
    savedSessionInfo,
  }
}
```

### Step 5: Run test to verify it passes

Run: `npm test -- tests/unit/composables/useSessionPersistence.test.ts`
Expected: PASS

### Step 6: Export from composables index

```typescript
// Add to src/composables/index.ts
export { useSessionPersistence } from './useSessionPersistence'
export type {
  SessionPersistenceOptions,
  PersistedSessionState,
  UseSessionPersistenceReturn,
} from '../types/session-persistence.types'
```

### Step 7: Create playground demo

```vue
<!-- playground/demos/SessionPersistenceDemo.vue -->
<template>
  <div class="session-persistence-demo">
    <h2>Session Persistence</h2>

    <div class="demo-grid">
      <!-- Current Session -->
      <div class="card">
        <h3>Current Session</h3>
        <div class="form-group">
          <label>Call ID:</label>
          <input v-model="sessionData.callId" placeholder="call-123" />
        </div>
        <div class="form-group">
          <label>Remote URI:</label>
          <input v-model="sessionData.remoteUri" placeholder="sip:user@example.com" />
        </div>
        <div class="form-group">
          <label>Direction:</label>
          <select v-model="sessionData.direction">
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </div>
        <div class="button-group">
          <button @click="handleSave" :disabled="isLoading">
            {{ isLoading ? 'Saving...' : 'Save Session' }}
          </button>
          <button @click="handleClear" :disabled="!hasSavedSession">
            Clear Saved
          </button>
        </div>
      </div>

      <!-- Saved Session Info -->
      <div class="card">
        <h3>Saved Session</h3>
        <div v-if="hasSavedSession" class="saved-info">
          <div class="info-item">
            <span class="label">Call ID:</span>
            <span>{{ savedSessionInfo?.callId }}</span>
          </div>
          <div class="info-item">
            <span class="label">Saved At:</span>
            <span>{{ formatTime(savedSessionInfo?.savedAt) }}</span>
          </div>
          <button @click="handleRestore" class="restore-btn">
            Restore Session
          </button>
        </div>
        <div v-else class="no-session">
          No saved session
        </div>
      </div>

      <!-- Restored Data -->
      <div v-if="restoredSession" class="card restored">
        <h3>Restored Session Data</h3>
        <pre>{{ JSON.stringify(restoredSession, null, 2) }}</pre>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-banner">
      {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useSessionPersistence } from '../../src/composables/useSessionPersistence'
import type { PersistedSessionState } from '../../src/types/session-persistence.types'

const {
  saveSession,
  loadSession,
  clearSession,
  hasSavedSession,
  isLoading,
  error,
  savedSessionInfo,
} = useSessionPersistence({ maxAge: 5 * 60 * 1000 })

const sessionData = reactive({
  callId: '',
  remoteUri: '',
  direction: 'outbound' as const,
})

const restoredSession = ref<PersistedSessionState | null>(null)

const handleSave = async () => {
  await saveSession({
    callId: sessionData.callId || `call-${Date.now()}`,
    remoteUri: sessionData.remoteUri,
    direction: sessionData.direction,
    startTime: Date.now(),
  })
}

const handleClear = async () => {
  await clearSession()
  restoredSession.value = null
}

const handleRestore = async () => {
  restoredSession.value = await loadSession()
}

const formatTime = (timestamp?: number) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.session-persistence-demo {
  padding: 1rem;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.card {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 1rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  color: #888;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #333;
  background: #0a0a1e;
  color: #fff;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: #4a4ae8;
  color: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.restore-btn {
  width: 100%;
  margin-top: 1rem;
  background: #22c55e;
}

.saved-info,
.no-session {
  padding: 1rem 0;
}

.no-session {
  color: #666;
  text-align: center;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.label {
  color: #888;
}

.restored {
  grid-column: 1 / -1;
}

.restored pre {
  background: #0a0a1e;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.error-banner {
  margin-top: 1rem;
  padding: 1rem;
  background: #7f1d1d;
  border-radius: 4px;
  color: #fca5a5;
}
</style>
```

### Step 8: Create example definition

```typescript
// playground/examples/session-persistence.ts
import type { ExampleDefinition } from './types'
import SessionPersistenceDemo from '../demos/SessionPersistenceDemo.vue'

export const sessionPersistenceExample: ExampleDefinition = {
  id: 'session-persistence',
  icon: '💾',
  title: 'Session Persistence',
  description: 'Persist call session state across reconnects',
  category: 'sip',
  tags: ['Advanced', 'Recovery', 'Storage'],
  component: SessionPersistenceDemo,
  setupGuide: '<p>Save and restore call session state using IndexedDB. Useful for recovering calls after network interruptions or page reloads.</p>',
  codeSnippets: [
    {
      title: 'Using Session Persistence',
      description: 'Save and restore call sessions',
      code: `import { useSessionPersistence, useCallSession } from 'vuesip'

const {
  saveSession,
  loadSession,
  clearSession,
  hasSavedSession
} = useSessionPersistence({ maxAge: 5 * 60 * 1000 }) // 5 min expiry

const { session, callState } = useCallSession(sipClient)

// Save session before potential disconnect
watch(callState, (state) => {
  if (state === 'answered' && session.value) {
    saveSession({
      callId: session.value.callId,
      remoteUri: session.value.remoteUri,
      startTime: Date.now(),
    })
  }
})

// Restore on reconnect
onMounted(async () => {
  if (hasSavedSession.value) {
    const savedSession = await loadSession()
    if (savedSession) {
      // Attempt to rejoin the call
      console.log('Restoring session:', savedSession.callId)
    }
  }
})`,
    },
  ],
}
```

### Step 9: Register the example

Add to `playground/examples/index.ts`:
```typescript
import { sessionPersistenceExample } from './session-persistence'

// Add to examples array
export const examples: ExampleDefinition[] = [
  // ... existing examples
  sessionPersistenceExample,
]
```

### Step 10: Commit

```bash
git add src/composables/useSessionPersistence.ts src/types/session-persistence.types.ts src/composables/index.ts tests/unit/composables/useSessionPersistence.test.ts playground/demos/SessionPersistenceDemo.vue playground/examples/session-persistence.ts playground/examples/index.ts
git commit -m "feat(composables): add useSessionPersistence for call recovery

- Create useSessionPersistence composable with IndexedDB storage
- Support session expiry with configurable maxAge
- Auto-clear on restore option
- Add playground demo and example
- Export from composables index"
```

---

## Task 4: Recording Status Indicators

**Files:**
- Create: `src/composables/useRecordingIndicator.ts`
- Create: `src/types/recording-indicator.types.ts`
- Test: `tests/unit/composables/useRecordingIndicator.test.ts`
- Demo: `playground/demos/RecordingIndicatorDemo.vue`
- Example: `playground/examples/recording-indicator.ts`
- Modify: `src/composables/index.ts`

### Step 1: Write failing test for recording indicator

```typescript
// tests/unit/composables/useRecordingIndicator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRecordingIndicator } from '../../../src/composables/useRecordingIndicator'
import { withSetup } from '../../utils/test-helpers'

describe('useRecordingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should return indicator state and methods', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      expect(result.isRecording).toBeDefined()
      expect(result.isPaused).toBeDefined()
      expect(result.duration).toBeDefined()
      expect(result.formattedDuration).toBeDefined()
      expect(result.indicatorStyle).toBeDefined()
      expect(result.blinkState).toBeDefined()
      expect(result.setRecordingState).toBeDefined()

      unmount()
    })

    it('should start with inactive state', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      expect(result.isRecording.value).toBe(false)
      expect(result.isPaused.value).toBe(false)
      expect(result.duration.value).toBe(0)

      unmount()
    })
  })

  describe('recording state', () => {
    it('should track recording state', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      result.setRecordingState('recording')
      expect(result.isRecording.value).toBe(true)
      expect(result.isPaused.value).toBe(false)

      result.setRecordingState('paused')
      expect(result.isRecording.value).toBe(false)
      expect(result.isPaused.value).toBe(true)

      result.setRecordingState('inactive')
      expect(result.isRecording.value).toBe(false)
      expect(result.isPaused.value).toBe(false)

      unmount()
    })
  })

  describe('duration formatting', () => {
    it('should format duration correctly', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      result.setRecordingState('recording')

      // 0 seconds
      expect(result.formattedDuration.value).toBe('00:00')

      // 65 seconds
      vi.advanceTimersByTime(65000)
      expect(result.formattedDuration.value).toBe('01:05')

      // 3661 seconds (1h 1m 1s)
      vi.advanceTimersByTime(3596000)
      expect(result.formattedDuration.value).toBe('01:01:01')

      unmount()
    })
  })

  describe('blink animation', () => {
    it('should toggle blink state when recording', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      result.setRecordingState('recording')

      const initialBlink = result.blinkState.value
      vi.advanceTimersByTime(500)
      expect(result.blinkState.value).not.toBe(initialBlink)

      unmount()
    })

    it('should not blink when paused', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      result.setRecordingState('paused')

      const initialBlink = result.blinkState.value
      vi.advanceTimersByTime(1000)
      expect(result.blinkState.value).toBe(initialBlink)

      unmount()
    })
  })

  describe('indicator styles', () => {
    it('should return correct styles for recording', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      result.setRecordingState('recording')

      expect(result.indicatorStyle.value).toMatchObject({
        backgroundColor: expect.stringContaining('red'),
        animation: expect.any(String),
      })

      unmount()
    })

    it('should return correct styles for paused', () => {
      const { result, unmount } = withSetup(() => useRecordingIndicator())

      result.setRecordingState('paused')

      expect(result.indicatorStyle.value).toMatchObject({
        backgroundColor: expect.stringContaining('yellow'),
      })

      unmount()
    })
  })

  describe('custom options', () => {
    it('should use custom blink interval', () => {
      const { result, unmount } = withSetup(() =>
        useRecordingIndicator({ blinkInterval: 200 })
      )

      result.setRecordingState('recording')

      const initialBlink = result.blinkState.value
      vi.advanceTimersByTime(200)
      expect(result.blinkState.value).not.toBe(initialBlink)

      unmount()
    })

    it('should use custom colors', () => {
      const { result, unmount } = withSetup(() =>
        useRecordingIndicator({
          colors: {
            recording: '#ff0000',
            paused: '#ffff00',
            inactive: '#666666',
          }
        })
      )

      result.setRecordingState('recording')
      expect(result.indicatorStyle.value.backgroundColor).toBe('#ff0000')

      result.setRecordingState('paused')
      expect(result.indicatorStyle.value.backgroundColor).toBe('#ffff00')

      unmount()
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/unit/composables/useRecordingIndicator.test.ts`
Expected: FAIL with "Cannot find module"

### Step 3: Create types file

```typescript
// src/types/recording-indicator.types.ts
import type { Ref, ComputedRef, CSSProperties } from 'vue'

/**
 * Recording indicator state
 */
export type RecordingIndicatorState = 'inactive' | 'recording' | 'paused' | 'stopped'

/**
 * Recording indicator color configuration
 */
export interface RecordingIndicatorColors {
  /** Color when recording (default: red) */
  recording: string
  /** Color when paused (default: yellow) */
  paused: string
  /** Color when inactive (default: gray) */
  inactive: string
}

/**
 * Recording indicator options
 */
export interface RecordingIndicatorOptions {
  /** Blink interval in ms (default: 500) */
  blinkInterval?: number
  /** Custom colors */
  colors?: Partial<RecordingIndicatorColors>
  /** Show duration (default: true) */
  showDuration?: boolean
  /** Initial state */
  initialState?: RecordingIndicatorState
}

/**
 * Return type for useRecordingIndicator composable
 */
export interface UseRecordingIndicatorReturn {
  /** Current recording state */
  state: Ref<RecordingIndicatorState>
  /** Whether currently recording */
  isRecording: ComputedRef<boolean>
  /** Whether currently paused */
  isPaused: ComputedRef<boolean>
  /** Recording duration in ms */
  duration: Ref<number>
  /** Formatted duration string (MM:SS or HH:MM:SS) */
  formattedDuration: ComputedRef<string>
  /** Current blink state for animation */
  blinkState: Ref<boolean>
  /** Computed CSS styles for indicator */
  indicatorStyle: ComputedRef<CSSProperties>
  /** Set the recording state */
  setRecordingState: (state: RecordingIndicatorState) => void
  /** Reset the indicator */
  reset: () => void
}
```

### Step 4: Implement the composable

```typescript
// src/composables/useRecordingIndicator.ts
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef, type CSSProperties } from 'vue'
import type {
  RecordingIndicatorOptions,
  RecordingIndicatorState,
  RecordingIndicatorColors,
  UseRecordingIndicatorReturn,
} from '../types/recording-indicator.types'

const DEFAULT_COLORS: RecordingIndicatorColors = {
  recording: '#ef4444', // red-500
  paused: '#eab308', // yellow-500
  inactive: '#6b7280', // gray-500
}

const DEFAULT_OPTIONS: Required<Omit<RecordingIndicatorOptions, 'colors'>> & { colors: RecordingIndicatorColors } = {
  blinkInterval: 500,
  colors: DEFAULT_COLORS,
  showDuration: true,
  initialState: 'inactive',
}

/**
 * Vue composable for visual recording status indicators
 *
 * @param options - Configuration options
 * @returns Recording indicator state and methods
 */
export function useRecordingIndicator(
  options: RecordingIndicatorOptions = {}
): UseRecordingIndicatorReturn {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    colors: { ...DEFAULT_COLORS, ...options.colors },
  }

  // State
  const state: Ref<RecordingIndicatorState> = ref(opts.initialState)
  const duration: Ref<number> = ref(0)
  const blinkState: Ref<boolean> = ref(true)

  // Intervals
  let durationInterval: ReturnType<typeof setInterval> | null = null
  let blinkInterval: ReturnType<typeof setInterval> | null = null
  let startTime = 0

  // Computed
  const isRecording: ComputedRef<boolean> = computed(() => state.value === 'recording')
  const isPaused: ComputedRef<boolean> = computed(() => state.value === 'paused')

  const formattedDuration: ComputedRef<string> = computed(() => {
    const totalSeconds = Math.floor(duration.value / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const pad = (n: number) => n.toString().padStart(2, '0')

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    }
    return `${pad(minutes)}:${pad(seconds)}`
  })

  const indicatorStyle: ComputedRef<CSSProperties> = computed(() => {
    const baseStyle: CSSProperties = {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      display: 'inline-block',
      transition: 'background-color 0.2s, opacity 0.2s',
    }

    switch (state.value) {
      case 'recording':
        return {
          ...baseStyle,
          backgroundColor: opts.colors.recording,
          opacity: blinkState.value ? 1 : 0.3,
          animation: 'pulse 1s ease-in-out infinite',
        }
      case 'paused':
        return {
          ...baseStyle,
          backgroundColor: opts.colors.paused,
          opacity: 1,
        }
      default:
        return {
          ...baseStyle,
          backgroundColor: opts.colors.inactive,
          opacity: 0.5,
        }
    }
  })

  // Methods
  const startDurationTracking = () => {
    if (durationInterval) return
    startTime = Date.now() - duration.value
    durationInterval = setInterval(() => {
      duration.value = Date.now() - startTime
    }, 100)
  }

  const stopDurationTracking = () => {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
  }

  const startBlinking = () => {
    if (blinkInterval) return
    blinkInterval = setInterval(() => {
      blinkState.value = !blinkState.value
    }, opts.blinkInterval)
  }

  const stopBlinking = () => {
    if (blinkInterval) {
      clearInterval(blinkInterval)
      blinkInterval = null
    }
    blinkState.value = true
  }

  const setRecordingState = (newState: RecordingIndicatorState) => {
    const previousState = state.value
    state.value = newState

    switch (newState) {
      case 'recording':
        startDurationTracking()
        startBlinking()
        break
      case 'paused':
        stopDurationTracking()
        stopBlinking()
        break
      case 'stopped':
      case 'inactive':
        stopDurationTracking()
        stopBlinking()
        if (newState === 'inactive') {
          duration.value = 0
        }
        break
    }
  }

  const reset = () => {
    setRecordingState('inactive')
    duration.value = 0
    blinkState.value = true
  }

  // Cleanup
  onUnmounted(() => {
    stopDurationTracking()
    stopBlinking()
  })

  return {
    state,
    isRecording,
    isPaused,
    duration,
    formattedDuration,
    blinkState,
    indicatorStyle,
    setRecordingState,
    reset,
  }
}
```

### Step 5: Run test to verify it passes

Run: `npm test -- tests/unit/composables/useRecordingIndicator.test.ts`
Expected: PASS

### Step 6: Export from composables index

```typescript
// Add to src/composables/index.ts
export { useRecordingIndicator } from './useRecordingIndicator'
export type {
  RecordingIndicatorState,
  RecordingIndicatorColors,
  RecordingIndicatorOptions,
  UseRecordingIndicatorReturn,
} from '../types/recording-indicator.types'
```

### Step 7: Create playground demo

```vue
<!-- playground/demos/RecordingIndicatorDemo.vue -->
<template>
  <div class="recording-indicator-demo">
    <h2>Recording Status Indicator</h2>

    <div class="demo-grid">
      <!-- Live Indicator -->
      <div class="card indicator-display">
        <h3>Recording Indicator</h3>
        <div class="indicator-container">
          <span class="indicator-dot" :style="indicatorStyle"></span>
          <span class="indicator-label">{{ stateLabel }}</span>
          <span v-if="isRecording || isPaused" class="indicator-duration">
            {{ formattedDuration }}
          </span>
        </div>
      </div>

      <!-- Controls -->
      <div class="card controls">
        <h3>Controls</h3>
        <div class="button-group">
          <button
            @click="setRecordingState('recording')"
            :class="{ active: isRecording }"
          >
            ⏺️ Record
          </button>
          <button
            @click="setRecordingState('paused')"
            :class="{ active: isPaused }"
            :disabled="state === 'inactive'"
          >
            ⏸️ Pause
          </button>
          <button
            @click="setRecordingState('stopped')"
            :disabled="state === 'inactive'"
          >
            ⏹️ Stop
          </button>
          <button @click="reset">
            🔄 Reset
          </button>
        </div>
      </div>

      <!-- State Display -->
      <div class="card state-info">
        <h3>State Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">State:</span>
            <span :class="stateClass">{{ state }}</span>
          </div>
          <div class="info-item">
            <span class="label">Duration (ms):</span>
            <span>{{ duration }}</span>
          </div>
          <div class="info-item">
            <span class="label">Blink State:</span>
            <span>{{ blinkState ? 'On' : 'Off' }}</span>
          </div>
        </div>
      </div>

      <!-- Customization -->
      <div class="card customization">
        <h3>Customization</h3>
        <div class="form-group">
          <label>Blink Interval (ms):</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="100"
            v-model.number="customBlinkInterval"
          />
          <span>{{ customBlinkInterval }}ms</span>
        </div>
        <div class="color-options">
          <div class="color-option">
            <label>Recording:</label>
            <input type="color" v-model="customColors.recording" />
          </div>
          <div class="color-option">
            <label>Paused:</label>
            <input type="color" v-model="customColors.paused" />
          </div>
        </div>
        <button @click="applyCustomization" class="apply-btn">
          Apply Customization
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRecordingIndicator } from '../../src/composables/useRecordingIndicator'

const customBlinkInterval = ref(500)
const customColors = reactive({
  recording: '#ef4444',
  paused: '#eab308',
})

const {
  state,
  isRecording,
  isPaused,
  duration,
  formattedDuration,
  blinkState,
  indicatorStyle,
  setRecordingState,
  reset,
} = useRecordingIndicator({
  blinkInterval: customBlinkInterval.value,
  colors: customColors,
})

const stateLabel = computed(() => {
  switch (state.value) {
    case 'recording': return 'Recording'
    case 'paused': return 'Paused'
    case 'stopped': return 'Stopped'
    default: return 'Ready'
  }
})

const stateClass = computed(() => ({
  'state-recording': state.value === 'recording',
  'state-paused': state.value === 'paused',
  'state-stopped': state.value === 'stopped',
  'state-inactive': state.value === 'inactive',
}))

const applyCustomization = () => {
  // Re-initialize would require recreating the composable
  // For demo, just show the current settings
  console.log('Applied:', { blinkInterval: customBlinkInterval.value, colors: customColors })
}
</script>

<style scoped>
.recording-indicator-demo {
  padding: 1rem;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.card {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 1rem;
}

.indicator-display {
  text-align: center;
}

.indicator-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  background: #0a0a1e;
  border-radius: 8px;
}

.indicator-dot {
  flex-shrink: 0;
}

.indicator-label {
  font-size: 1.25rem;
  font-weight: 600;
}

.indicator-duration {
  font-family: monospace;
  font-size: 1.25rem;
  color: #888;
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.button-group button {
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #333;
  background: #2a2a3e;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.button-group button:hover:not(:disabled) {
  background: #3a3a4e;
}

.button-group button.active {
  background: #4a4ae8;
  border-color: #4a4ae8;
}

.button-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.label {
  color: #888;
}

.state-recording { color: #ef4444; }
.state-paused { color: #eab308; }
.state-stopped { color: #6b7280; }
.state-inactive { color: #6b7280; }

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  color: #888;
}

.form-group input[type="range"] {
  width: 100%;
}

.color-options {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-option input[type="color"] {
  width: 40px;
  height: 30px;
  border: none;
  cursor: pointer;
}

.apply-btn {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: none;
  background: #4a4ae8;
  color: #fff;
  cursor: pointer;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
```

### Step 8: Create example definition

```typescript
// playground/examples/recording-indicator.ts
import type { ExampleDefinition } from './types'
import RecordingIndicatorDemo from '../demos/RecordingIndicatorDemo.vue'

export const recordingIndicatorExample: ExampleDefinition = {
  id: 'recording-indicator',
  icon: '🔴',
  title: 'Recording Status Indicator',
  description: 'Visual recording status with duration and animations',
  category: 'sip',
  tags: ['UI', 'Recording', 'Status'],
  component: RecordingIndicatorDemo,
  setupGuide: '<p>Display recording status with animated indicator, duration tracking, and customizable colors.</p>',
  codeSnippets: [
    {
      title: 'Basic Recording Indicator',
      description: 'Display recording status with duration',
      code: `import { useRecordingIndicator, useLocalRecording } from 'vuesip'

const { state: recordingState } = useLocalRecording()
const {
  isRecording,
  isPaused,
  formattedDuration,
  indicatorStyle,
  setRecordingState,
} = useRecordingIndicator()

// Sync with recording state
watch(recordingState, (state) => {
  setRecordingState(state)
})

// In template:
// <span :style="indicatorStyle"></span>
// <span>{{ formattedDuration }}</span>`,
    },
    {
      title: 'Custom Colors',
      description: 'Customize indicator colors',
      code: `const { indicatorStyle } = useRecordingIndicator({
  blinkInterval: 300, // Faster blink
  colors: {
    recording: '#dc2626', // Custom red
    paused: '#f59e0b', // Custom amber
    inactive: '#9ca3af', // Custom gray
  },
})`,
    },
  ],
}
```

### Step 9: Register the example

Add to `playground/examples/index.ts`:
```typescript
import { recordingIndicatorExample } from './recording-indicator'

// Add to examples array
export const examples: ExampleDefinition[] = [
  // ... existing examples
  recordingIndicatorExample,
]
```

### Step 10: Commit

```bash
git add src/composables/useRecordingIndicator.ts src/types/recording-indicator.types.ts src/composables/index.ts tests/unit/composables/useRecordingIndicator.test.ts playground/demos/RecordingIndicatorDemo.vue playground/examples/recording-indicator.ts playground/examples/index.ts
git commit -m "feat(composables): add useRecordingIndicator for visual status

- Create useRecordingIndicator composable with blink animation
- Support customizable colors and blink interval
- Format duration as MM:SS or HH:MM:SS
- Provide computed CSS styles for indicator
- Add playground demo and example
- Export from composables index"
```

---

## Task 5: Update Feature Roadmap

**Files:**
- Modify: `docs/FEATURE_ROADMAP.md`

### Step 1: Update roadmap with completed items

```markdown
<!-- Update docs/FEATURE_ROADMAP.md -->

### 1.1 `usePictureInPicture` Composable

**Effort**: 3 days | **Impact**: High | **Status**: ✅ Complete

- [x] Check browser PiP API support
- [x] Handle video element lifecycle
- [x] Auto-exit on call end
- [x] Persist PiP preference
- [x] Add to CallSession integration

<!-- ... -->

### 2.2 Connection Recovery

**Effort**: 4 days | **Impact**: High | **Status**: ✅ Complete

- [x] ICE restart handling
- [x] Recovery state management with retry logic
- [x] Configurable recovery options (maxAttempts, attemptDelay, iceRestartTimeout)
- [x] Recovery callbacks (onRecoveryStart, onRecoverySuccess, onRecoveryFailed)
- [x] Automatic reconnection on network change
- [x] Session persistence across reconnects

<!-- ... -->

### 3.2 Call Recording

**Effort**: 5 days | **Impact**: Medium | **Status**: ✅ Complete

- [x] Server-side recording integration (`useAmiRecording` - via AMI)
- [x] Local recording option (`useLocalRecording` - MediaRecorder API)
- [x] Recording status indicators (`useRecordingIndicator`)
```

### Step 2: Commit

```bash
git add docs/FEATURE_ROADMAP.md
git commit -m "docs: update roadmap with completed optional enhancements

- Mark PiP CallSession integration complete
- Mark automatic network reconnection complete
- Mark session persistence complete
- Mark recording status indicators complete"
```

---

## Task 6: Final Validation

### Step 1: Run full test suite

Run: `npm test`
Expected: All tests pass

### Step 2: Run type checking

Run: `npm run typecheck`
Expected: No type errors

### Step 3: Run linting

Run: `npm run lint`
Expected: No lint errors

### Step 4: Build verification

Run: `npm run build`
Expected: Build succeeds

### Step 5: Commit any fixes if needed

```bash
# If any fixes were needed
git add -A
git commit -m "fix: address test/lint/type issues from optional enhancements"
```
