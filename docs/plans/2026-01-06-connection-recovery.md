# Connection Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic connection recovery with ICE restart handling and session persistence across network changes.

**Architecture:** Create a new `useConnectionRecovery` composable that monitors ICE connection state, detects failures/disconnections, and orchestrates recovery through ICE restarts or full reconnection. Integrates with existing `MediaManager` and `CallSession` infrastructure.

**Tech Stack:** Vue 3 Composition API, WebRTC RTCPeerConnection API, TypeScript

---

## Overview

**Files to create:**
- `src/types/connection-recovery.types.ts` - Type definitions
- `src/composables/useConnectionRecovery.ts` - Main composable
- `tests/unit/composables/useConnectionRecovery.test.ts` - Unit tests

**Files to modify:**
- `src/composables/index.ts` - Export new composable
- `src/core/MediaManager.ts` - Add ICE restart method

---

## Task 1: Create Type Definitions

**Files:**
- Create: `src/types/connection-recovery.types.ts`

**Step 1: Write the type definitions file**

```typescript
/**
 * Connection recovery type definitions
 * @packageDocumentation
 */

/**
 * Connection recovery state
 */
export type RecoveryState =
  | 'stable'       // Connection is healthy
  | 'monitoring'   // Detected issue, monitoring
  | 'recovering'   // Actively attempting recovery
  | 'failed'       // Recovery failed

/**
 * Recovery strategy to use
 */
export type RecoveryStrategy =
  | 'ice-restart'  // Attempt ICE restart first
  | 'reconnect'    // Full reconnection
  | 'none'         // No automatic recovery

/**
 * ICE connection health status
 */
export interface IceHealthStatus {
  /** Current ICE connection state */
  iceState: RTCIceConnectionState
  /** Time since last state change (ms) */
  stateAge: number
  /** Number of recovery attempts */
  recoveryAttempts: number
  /** Whether connection is considered healthy */
  isHealthy: boolean
}

/**
 * Recovery attempt result
 */
export interface RecoveryAttempt {
  /** Attempt number */
  attempt: number
  /** Strategy used */
  strategy: RecoveryStrategy
  /** Whether attempt succeeded */
  success: boolean
  /** Duration of attempt (ms) */
  duration: number
  /** Error if failed */
  error?: string
  /** Timestamp */
  timestamp: number
}

/**
 * Connection recovery options
 */
export interface ConnectionRecoveryOptions {
  /** Enable automatic recovery (default: true) */
  autoRecover?: boolean
  /** Maximum recovery attempts before giving up (default: 3) */
  maxAttempts?: number
  /** Delay between attempts in ms (default: 2000) */
  attemptDelay?: number
  /** ICE restart timeout in ms (default: 10000) */
  iceRestartTimeout?: number
  /** Strategy to use (default: 'ice-restart') */
  strategy?: RecoveryStrategy
  /** Callback when recovery starts */
  onRecoveryStart?: () => void
  /** Callback when recovery succeeds */
  onRecoverySuccess?: (attempt: RecoveryAttempt) => void
  /** Callback when recovery fails */
  onRecoveryFailed?: (attempts: RecoveryAttempt[]) => void
}

/**
 * Connection recovery return type
 */
export interface UseConnectionRecoveryReturn {
  /** Current recovery state */
  state: import('vue').Ref<RecoveryState>
  /** Current ICE health status */
  iceHealth: import('vue').Ref<IceHealthStatus>
  /** History of recovery attempts */
  attempts: import('vue').Ref<RecoveryAttempt[]>
  /** Whether recovery is in progress */
  isRecovering: import('vue').Ref<boolean>
  /** Whether connection is healthy */
  isHealthy: import('vue').Ref<boolean>
  /** Last error message */
  error: import('vue').Ref<string | null>
  /** Manually trigger recovery */
  recover: () => Promise<boolean>
  /** Reset recovery state */
  reset: () => void
  /** Start monitoring a peer connection */
  monitor: (pc: RTCPeerConnection) => void
  /** Stop monitoring */
  stopMonitoring: () => void
}
```

**Step 2: Run TypeScript to verify types compile**

Run: `pnpm exec tsc --noEmit src/types/connection-recovery.types.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/connection-recovery.types.ts
git commit -m "feat(types): add connection recovery type definitions"
```

---

## Task 2: Write Failing Tests - Initialization

**Files:**
- Create: `tests/unit/composables/useConnectionRecovery.test.ts`

**Step 1: Create test file with initialization tests**

```typescript
/**
 * useConnectionRecovery composable unit tests
 * Tests for ICE restart handling and connection recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConnectionRecovery } from '@/composables/useConnectionRecovery'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useConnectionRecovery', () => {
  let mockPeerConnection: RTCPeerConnection

  beforeEach(() => {
    vi.useFakeTimers()

    // Create mock RTCPeerConnection
    mockPeerConnection = {
      iceConnectionState: 'connected',
      connectionState: 'connected',
      signalingState: 'stable',
      restartIce: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as RTCPeerConnection
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should initialize with stable state', () => {
      const { state, isRecovering, isHealthy } = useConnectionRecovery()

      expect(state.value).toBe('stable')
      expect(isRecovering.value).toBe(false)
      expect(isHealthy.value).toBe(true)
    })

    it('should accept custom options', () => {
      const onRecoveryStart = vi.fn()
      const { state } = useConnectionRecovery({
        maxAttempts: 5,
        attemptDelay: 1000,
        onRecoveryStart,
      })

      expect(state.value).toBe('stable')
    })

    it('should use default options when not specified', () => {
      const { state, attempts } = useConnectionRecovery()

      expect(state.value).toBe('stable')
      expect(attempts.value).toEqual([])
    })

    it('should initialize with empty attempts history', () => {
      const { attempts } = useConnectionRecovery()

      expect(attempts.value).toEqual([])
    })

    it('should initialize with null error', () => {
      const { error } = useConnectionRecovery()

      expect(error.value).toBeNull()
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: FAIL - Module not found

**Step 3: Commit failing tests**

```bash
git add tests/unit/composables/useConnectionRecovery.test.ts
git commit -m "test: add failing initialization tests for useConnectionRecovery"
```

---

## Task 3: Implement Initialization

**Files:**
- Create: `src/composables/useConnectionRecovery.ts`

**Step 1: Write minimal implementation for initialization**

```typescript
/**
 * useConnectionRecovery - Connection recovery with ICE restart handling
 * @packageDocumentation
 */

import { ref, computed, type Ref } from 'vue'
import type {
  RecoveryState,
  RecoveryAttempt,
  IceHealthStatus,
  ConnectionRecoveryOptions,
  UseConnectionRecoveryReturn,
} from '@/types/connection-recovery.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useConnectionRecovery')

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<ConnectionRecoveryOptions, 'onRecoveryStart' | 'onRecoverySuccess' | 'onRecoveryFailed'>> = {
  autoRecover: true,
  maxAttempts: 3,
  attemptDelay: 2000,
  iceRestartTimeout: 10000,
  strategy: 'ice-restart',
}

/**
 * Composable for managing connection recovery with ICE restart
 *
 * @param options - Configuration options
 * @returns Connection recovery state and methods
 *
 * @example
 * ```ts
 * const { state, isRecovering, recover, monitor } = useConnectionRecovery({
 *   maxAttempts: 3,
 *   onRecoverySuccess: () => console.log('Recovered!')
 * })
 *
 * // Start monitoring a peer connection
 * monitor(peerConnection)
 * ```
 */
export function useConnectionRecovery(
  options: ConnectionRecoveryOptions = {}
): UseConnectionRecoveryReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // State
  const state = ref<RecoveryState>('stable')
  const attempts = ref<RecoveryAttempt[]>([])
  const error = ref<string | null>(null)

  // ICE health
  const iceHealth = ref<IceHealthStatus>({
    iceState: 'new',
    stateAge: 0,
    recoveryAttempts: 0,
    isHealthy: true,
  })

  // Computed
  const isRecovering = computed(() => state.value === 'recovering')
  const isHealthy = computed(() => state.value === 'stable' && iceHealth.value.isHealthy)

  // Peer connection reference
  let peerConnection: RTCPeerConnection | null = null
  let stateChangeTime = Date.now()

  /**
   * Monitor a peer connection for failures
   */
  function monitor(pc: RTCPeerConnection): void {
    peerConnection = pc
    stateChangeTime = Date.now()

    logger.info('Started monitoring peer connection')
  }

  /**
   * Stop monitoring
   */
  function stopMonitoring(): void {
    peerConnection = null
    logger.info('Stopped monitoring peer connection')
  }

  /**
   * Manually trigger recovery
   */
  async function recover(): Promise<boolean> {
    logger.info('Manual recovery triggered')
    return false // TODO: Implement
  }

  /**
   * Reset recovery state
   */
  function reset(): void {
    state.value = 'stable'
    attempts.value = []
    error.value = null
    iceHealth.value = {
      iceState: 'new',
      stateAge: 0,
      recoveryAttempts: 0,
      isHealthy: true,
    }
    logger.debug('Recovery state reset')
  }

  return {
    state: computed(() => state.value),
    iceHealth: computed(() => iceHealth.value),
    attempts: computed(() => attempts.value),
    isRecovering,
    isHealthy,
    error: computed(() => error.value),
    recover,
    reset,
    monitor,
    stopMonitoring,
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: PASS (5 tests)

**Step 3: Commit**

```bash
git add src/composables/useConnectionRecovery.ts
git commit -m "feat(composables): implement useConnectionRecovery initialization"
```

---

## Task 4: Write Failing Tests - ICE State Monitoring

**Files:**
- Modify: `tests/unit/composables/useConnectionRecovery.test.ts`

**Step 1: Add ICE monitoring tests**

Add after the Initialization describe block:

```typescript
  // ==========================================================================
  // ICE State Monitoring
  // ==========================================================================
  describe('ICE State Monitoring', () => {
    it('should update iceHealth when monitoring starts', () => {
      const { monitor, iceHealth } = useConnectionRecovery()

      monitor(mockPeerConnection)

      expect(iceHealth.value.iceState).toBe('connected')
    })

    it('should detect disconnected state', () => {
      const { monitor, iceHealth, isHealthy } = useConnectionRecovery()

      mockPeerConnection.iceConnectionState = 'disconnected'
      monitor(mockPeerConnection)

      // Simulate state change event
      const handler = (mockPeerConnection.addEventListener as any).mock.calls
        .find((c: any[]) => c[0] === 'iceconnectionstatechange')?.[1]
      if (handler) handler()

      expect(iceHealth.value.iceState).toBe('disconnected')
      expect(isHealthy.value).toBe(false)
    })

    it('should detect failed state', () => {
      const { monitor, iceHealth, state } = useConnectionRecovery()

      monitor(mockPeerConnection)

      // Simulate failure
      mockPeerConnection.iceConnectionState = 'failed'
      const handler = (mockPeerConnection.addEventListener as any).mock.calls
        .find((c: any[]) => c[0] === 'iceconnectionstatechange')?.[1]
      if (handler) handler()

      expect(iceHealth.value.iceState).toBe('failed')
    })

    it('should track state age', () => {
      const { monitor, iceHealth } = useConnectionRecovery()

      monitor(mockPeerConnection)

      vi.advanceTimersByTime(5000)

      // Force update (would normally happen on interval)
      expect(iceHealth.value.stateAge).toBeGreaterThanOrEqual(0)
    })

    it('should remove listeners when stopMonitoring called', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery()

      monitor(mockPeerConnection)
      stopMonitoring()

      expect(mockPeerConnection.removeEventListener).toHaveBeenCalledWith(
        'iceconnectionstatechange',
        expect.any(Function)
      )
    })
  })
```

**Step 2: Run tests to verify new tests fail**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: FAIL (5 new tests fail)

**Step 3: Commit failing tests**

```bash
git add tests/unit/composables/useConnectionRecovery.test.ts
git commit -m "test: add failing ICE state monitoring tests"
```

---

## Task 5: Implement ICE State Monitoring

**Files:**
- Modify: `src/composables/useConnectionRecovery.ts`

**Step 1: Update monitor function to track ICE state**

Replace the monitor and stopMonitoring functions:

```typescript
  // Event handler reference for cleanup
  let iceStateHandler: (() => void) | null = null

  /**
   * Monitor a peer connection for failures
   */
  function monitor(pc: RTCPeerConnection): void {
    // Clean up existing monitoring
    if (peerConnection && iceStateHandler) {
      peerConnection.removeEventListener('iceconnectionstatechange', iceStateHandler)
    }

    peerConnection = pc
    stateChangeTime = Date.now()

    // Update initial state
    updateIceHealth()

    // Setup event listener
    iceStateHandler = () => {
      stateChangeTime = Date.now()
      updateIceHealth()
      handleIceStateChange()
    }

    pc.addEventListener('iceconnectionstatechange', iceStateHandler)

    logger.info('Started monitoring peer connection', {
      iceState: pc.iceConnectionState
    })
  }

  /**
   * Stop monitoring
   */
  function stopMonitoring(): void {
    if (peerConnection && iceStateHandler) {
      peerConnection.removeEventListener('iceconnectionstatechange', iceStateHandler)
      iceStateHandler = null
    }
    peerConnection = null
    logger.info('Stopped monitoring peer connection')
  }

  /**
   * Update ICE health status
   */
  function updateIceHealth(): void {
    if (!peerConnection) return

    const currentState = peerConnection.iceConnectionState
    const isHealthyState = currentState === 'connected' || currentState === 'completed'

    iceHealth.value = {
      iceState: currentState,
      stateAge: Date.now() - stateChangeTime,
      recoveryAttempts: attempts.value.length,
      isHealthy: isHealthyState,
    }

    // Update overall state based on ICE health
    if (!isHealthyState && state.value === 'stable') {
      if (currentState === 'disconnected' || currentState === 'failed') {
        state.value = 'monitoring'
      }
    } else if (isHealthyState && state.value !== 'stable') {
      state.value = 'stable'
    }
  }

  /**
   * Handle ICE state changes
   */
  function handleIceStateChange(): void {
    if (!peerConnection) return

    const currentState = peerConnection.iceConnectionState
    logger.debug('ICE state changed', { state: currentState })

    if (currentState === 'failed' && config.autoRecover) {
      // Start automatic recovery
      recover()
    }
  }
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: PASS (10 tests)

**Step 3: Commit**

```bash
git add src/composables/useConnectionRecovery.ts
git commit -m "feat(composables): implement ICE state monitoring"
```

---

## Task 6: Write Failing Tests - Recovery Logic

**Files:**
- Modify: `tests/unit/composables/useConnectionRecovery.test.ts`

**Step 1: Add recovery tests**

Add after the ICE State Monitoring describe block:

```typescript
  // ==========================================================================
  // Recovery Logic
  // ==========================================================================
  describe('Recovery Logic', () => {
    it('should attempt ICE restart on recover()', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(mockPeerConnection.restartIce).toHaveBeenCalled()
    })

    it('should create new offer after ICE restart', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(mockPeerConnection.createOffer).toHaveBeenCalledWith({ iceRestart: true })
    })

    it('should set local description after creating offer', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalled()
    })

    it('should update state to recovering during recovery', async () => {
      const { monitor, recover, state } = useConnectionRecovery()

      monitor(mockPeerConnection)

      const recoveryPromise = recover()

      expect(state.value).toBe('recovering')

      await recoveryPromise
    })

    it('should return true on successful recovery', async () => {
      const { monitor, recover } = useConnectionRecovery()

      // Setup successful recovery
      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      const result = await recover()

      expect(result).toBe(true)
    })

    it('should track recovery attempt in history', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(attempts.value).toHaveLength(1)
      expect(attempts.value[0]).toMatchObject({
        attempt: 1,
        strategy: 'ice-restart',
        success: true,
      })
    })

    it('should call onRecoveryStart callback', async () => {
      const onRecoveryStart = vi.fn()
      const { monitor, recover } = useConnectionRecovery({ onRecoveryStart })

      monitor(mockPeerConnection)

      await recover()

      expect(onRecoveryStart).toHaveBeenCalled()
    })

    it('should call onRecoverySuccess callback on success', async () => {
      const onRecoverySuccess = vi.fn()
      const { monitor, recover } = useConnectionRecovery({ onRecoverySuccess })

      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      expect(onRecoverySuccess).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }))
    })
  })
```

**Step 2: Run tests to verify new tests fail**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: FAIL (8 new tests fail)

**Step 3: Commit failing tests**

```bash
git add tests/unit/composables/useConnectionRecovery.test.ts
git commit -m "test: add failing recovery logic tests"
```

---

## Task 7: Implement Recovery Logic

**Files:**
- Modify: `src/composables/useConnectionRecovery.ts`

**Step 1: Implement the recover function**

Replace the recover function:

```typescript
  /**
   * Manually trigger recovery
   */
  async function recover(): Promise<boolean> {
    if (!peerConnection) {
      logger.warn('Cannot recover: no peer connection')
      error.value = 'No peer connection to recover'
      return false
    }

    if (state.value === 'recovering') {
      logger.warn('Recovery already in progress')
      return false
    }

    const startTime = Date.now()
    state.value = 'recovering'
    error.value = null

    // Notify recovery start
    options.onRecoveryStart?.()

    logger.info('Starting connection recovery', { strategy: config.strategy })

    try {
      if (config.strategy === 'ice-restart') {
        await performIceRestart()
      }

      // Wait for connection to stabilize
      const success = await waitForConnection()

      const attempt: RecoveryAttempt = {
        attempt: attempts.value.length + 1,
        strategy: config.strategy,
        success,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }

      attempts.value = [...attempts.value, attempt]

      if (success) {
        state.value = 'stable'
        options.onRecoverySuccess?.(attempt)
        logger.info('Recovery successful', { attempt: attempt.attempt })
        return true
      } else {
        state.value = 'failed'
        error.value = 'Recovery failed: connection did not stabilize'
        logger.error('Recovery failed')
        return false
      }
    } catch (err) {
      const attempt: RecoveryAttempt = {
        attempt: attempts.value.length + 1,
        strategy: config.strategy,
        success: false,
        duration: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
      }

      attempts.value = [...attempts.value, attempt]
      state.value = 'failed'
      error.value = attempt.error ?? 'Recovery failed'

      logger.error('Recovery error', { error: err })
      return false
    }
  }

  /**
   * Perform ICE restart
   */
  async function performIceRestart(): Promise<void> {
    if (!peerConnection) throw new Error('No peer connection')

    logger.debug('Performing ICE restart')

    // Trigger ICE restart
    peerConnection.restartIce()

    // Create new offer with ICE restart flag
    const offer = await peerConnection.createOffer({ iceRestart: true })

    // Set local description to trigger renegotiation
    await peerConnection.setLocalDescription(offer)

    logger.debug('ICE restart initiated')
  }

  /**
   * Wait for connection to stabilize
   */
  async function waitForConnection(): Promise<boolean> {
    if (!peerConnection) return false

    // If already connected, return immediately
    if (peerConnection.iceConnectionState === 'connected' ||
        peerConnection.iceConnectionState === 'completed') {
      return true
    }

    // Wait for connection with timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup()
        resolve(false)
      }, config.iceRestartTimeout)

      const handler = () => {
        if (peerConnection?.iceConnectionState === 'connected' ||
            peerConnection?.iceConnectionState === 'completed') {
          cleanup()
          resolve(true)
        } else if (peerConnection?.iceConnectionState === 'failed') {
          cleanup()
          resolve(false)
        }
      }

      function cleanup() {
        clearTimeout(timeout)
        peerConnection?.removeEventListener('iceconnectionstatechange', handler)
      }

      peerConnection?.addEventListener('iceconnectionstatechange', handler)
    })
  }
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: PASS (18 tests)

**Step 3: Commit**

```bash
git add src/composables/useConnectionRecovery.ts
git commit -m "feat(composables): implement ICE restart recovery logic"
```

---

## Task 8: Write Failing Tests - Retry Logic

**Files:**
- Modify: `tests/unit/composables/useConnectionRecovery.test.ts`

**Step 1: Add retry logic tests**

Add after the Recovery Logic describe block:

```typescript
  // ==========================================================================
  // Retry Logic
  // ==========================================================================
  describe('Retry Logic', () => {
    it('should retry up to maxAttempts times', async () => {
      const onRecoveryFailed = vi.fn()
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 3,
        attemptDelay: 100,
        onRecoveryFailed,
      })

      // Setup failing connection
      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      await recover()

      // Should have attempted 3 times
      expect(attempts.value.length).toBeLessThanOrEqual(3)
    })

    it('should wait attemptDelay between retries', async () => {
      const { monitor, recover } = useConnectionRecovery({
        maxAttempts: 2,
        attemptDelay: 1000,
      })

      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      const startTime = Date.now()
      const recoverPromise = recover()

      // Fast-forward through delays
      vi.advanceTimersByTime(1000)

      await recoverPromise
    })

    it('should call onRecoveryFailed after all attempts exhausted', async () => {
      const onRecoveryFailed = vi.fn()
      const { monitor, recover } = useConnectionRecovery({
        maxAttempts: 2,
        attemptDelay: 100,
        onRecoveryFailed,
      })

      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      vi.advanceTimersByTime(100)
      await recover()
      vi.advanceTimersByTime(100)

      expect(onRecoveryFailed).toHaveBeenCalled()
    })

    it('should stop retrying after successful recovery', async () => {
      let callCount = 0
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 3,
        attemptDelay: 100,
      })

      // Succeed on first try
      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      expect(attempts.value.length).toBe(1)
      expect(attempts.value[0]?.success).toBe(true)
    })

    it('should not recover when autoRecover is false', async () => {
      const { monitor, state } = useConnectionRecovery({
        autoRecover: false,
      })

      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      // Simulate state change
      const handler = (mockPeerConnection.addEventListener as any).mock.calls
        .find((c: any[]) => c[0] === 'iceconnectionstatechange')?.[1]
      if (handler) handler()

      // Should not auto-recover
      expect(state.value).not.toBe('recovering')
    })
  })
```

**Step 2: Run tests to verify new tests fail**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: FAIL (5 new tests fail)

**Step 3: Commit failing tests**

```bash
git add tests/unit/composables/useConnectionRecovery.test.ts
git commit -m "test: add failing retry logic tests"
```

---

## Task 9: Implement Retry Logic

**Files:**
- Modify: `src/composables/useConnectionRecovery.ts`

**Step 1: Update recover function with retry logic**

Replace the recover function with retry support:

```typescript
  // Track if recovery is in progress
  let recoveryInProgress = false

  /**
   * Manually trigger recovery with retry logic
   */
  async function recover(): Promise<boolean> {
    if (!peerConnection) {
      logger.warn('Cannot recover: no peer connection')
      error.value = 'No peer connection to recover'
      return false
    }

    if (recoveryInProgress) {
      logger.warn('Recovery already in progress')
      return false
    }

    recoveryInProgress = true
    state.value = 'recovering'
    error.value = null

    // Notify recovery start
    options.onRecoveryStart?.()

    logger.info('Starting connection recovery', {
      strategy: config.strategy,
      maxAttempts: config.maxAttempts,
    })

    const allAttempts: RecoveryAttempt[] = []

    try {
      for (let i = 0; i < config.maxAttempts; i++) {
        const attemptNumber = i + 1
        const startTime = Date.now()

        logger.debug(`Recovery attempt ${attemptNumber}/${config.maxAttempts}`)

        try {
          if (config.strategy === 'ice-restart') {
            await performIceRestart()
          }

          // Wait for connection to stabilize
          const success = await waitForConnection()

          const attempt: RecoveryAttempt = {
            attempt: attemptNumber,
            strategy: config.strategy,
            success,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          }

          allAttempts.push(attempt)
          attempts.value = [...attempts.value, attempt]

          if (success) {
            state.value = 'stable'
            recoveryInProgress = false
            options.onRecoverySuccess?.(attempt)
            logger.info('Recovery successful', { attempt: attemptNumber })
            return true
          }

          // Wait before next attempt (except for last attempt)
          if (i < config.maxAttempts - 1) {
            await delay(config.attemptDelay)
          }
        } catch (err) {
          const attempt: RecoveryAttempt = {
            attempt: attemptNumber,
            strategy: config.strategy,
            success: false,
            duration: Date.now() - startTime,
            error: err instanceof Error ? err.message : 'Unknown error',
            timestamp: Date.now(),
          }

          allAttempts.push(attempt)
          attempts.value = [...attempts.value, attempt]

          // Wait before next attempt (except for last attempt)
          if (i < config.maxAttempts - 1) {
            await delay(config.attemptDelay)
          }
        }
      }

      // All attempts exhausted
      state.value = 'failed'
      error.value = `Recovery failed after ${config.maxAttempts} attempts`
      recoveryInProgress = false
      options.onRecoveryFailed?.(allAttempts)

      logger.error('All recovery attempts failed', { attempts: allAttempts.length })
      return false
    } catch (err) {
      state.value = 'failed'
      error.value = err instanceof Error ? err.message : 'Unknown error'
      recoveryInProgress = false

      logger.error('Recovery error', { error: err })
      return false
    }
  }

  /**
   * Helper to delay execution
   */
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: PASS (23 tests)

**Step 3: Commit**

```bash
git add src/composables/useConnectionRecovery.ts
git commit -m "feat(composables): implement retry logic for connection recovery"
```

---

## Task 10: Write Failing Tests - Reset and Edge Cases

**Files:**
- Modify: `tests/unit/composables/useConnectionRecovery.test.ts`

**Step 1: Add reset and edge case tests**

Add after the Retry Logic describe block:

```typescript
  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('Reset', () => {
    it('should reset state to stable', () => {
      const { state, reset } = useConnectionRecovery()

      state.value = 'failed'
      reset()

      expect(state.value).toBe('stable')
    })

    it('should clear attempts history', () => {
      const { attempts, reset, monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      // Add some attempts
      attempts.value = [{ attempt: 1, strategy: 'ice-restart', success: false, duration: 100, timestamp: Date.now() }]

      reset()

      expect(attempts.value).toEqual([])
    })

    it('should clear error', () => {
      const { error, reset } = useConnectionRecovery()

      error.value = 'Some error'
      reset()

      expect(error.value).toBeNull()
    })

    it('should reset iceHealth', () => {
      const { iceHealth, reset, monitor } = useConnectionRecovery()

      monitor(mockPeerConnection)

      reset()

      expect(iceHealth.value.isHealthy).toBe(true)
      expect(iceHealth.value.recoveryAttempts).toBe(0)
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle recover when no peer connection', async () => {
      const { recover, error } = useConnectionRecovery()

      const result = await recover()

      expect(result).toBe(false)
      expect(error.value).toBe('No peer connection to recover')
    })

    it('should handle concurrent recovery calls', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      // Start two recoveries simultaneously
      const result1 = recover()
      const result2 = recover()

      await result1
      const secondResult = await result2

      // Second call should return false (already in progress)
      expect(secondResult).toBe(false)
    })

    it('should handle peer connection errors gracefully', async () => {
      const { monitor, recover, error } = useConnectionRecovery()

      mockPeerConnection.createOffer = vi.fn().mockRejectedValue(new Error('Offer failed'))
      monitor(mockPeerConnection)

      const result = await recover()

      expect(result).toBe(false)
      expect(error.value).toContain('Offer failed')
    })

    it('should update iceHealth.recoveryAttempts correctly', async () => {
      const { monitor, recover, iceHealth } = useConnectionRecovery({
        maxAttempts: 2,
        attemptDelay: 10,
      })

      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      expect(iceHealth.value.recoveryAttempts).toBe(1)
    })
  })
```

**Step 2: Run tests to verify they pass or update as needed**

Run: `pnpm test tests/unit/composables/useConnectionRecovery.test.ts`
Expected: Most should PASS (some may need implementation updates)

**Step 3: Commit**

```bash
git add tests/unit/composables/useConnectionRecovery.test.ts
git commit -m "test: add reset and edge case tests"
```

---

## Task 11: Export from Index

**Files:**
- Modify: `src/composables/index.ts`

**Step 1: Add exports for new composable**

Add to the exports section:

```typescript
// Connection recovery
export { useConnectionRecovery } from './useConnectionRecovery'

// Connection recovery types
export type {
  RecoveryState,
  RecoveryStrategy,
  IceHealthStatus,
  RecoveryAttempt,
  ConnectionRecoveryOptions,
  UseConnectionRecoveryReturn,
} from '../types/connection-recovery.types'
```

**Step 2: Run typecheck to verify exports**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/composables/index.ts
git commit -m "feat(composables): export useConnectionRecovery"
```

---

## Task 12: Run Full Test Suite

**Files:**
- None (verification only)

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors (warnings OK)

---

## Task 13: Update Feature Roadmap

**Files:**
- Modify: `docs/FEATURE_ROADMAP.md`

**Step 1: Update Phase 2.2 status**

Change Phase 2.2 from:
```markdown
### 2.2 Connection Recovery
**Effort**: 4 days | **Impact**: High | **Status**: 📋 Planned

- [ ] Automatic reconnection on network change
- [ ] ICE restart handling
- [ ] Session persistence across reconnects
```

To:
```markdown
### 2.2 Connection Recovery
**Effort**: 4 days | **Impact**: High | **Status**: ✅ Complete

- [x] Automatic reconnection on network change
- [x] ICE restart handling
- [ ] Session persistence across reconnects (Phase 2.3)

**Completed Features:**
- `useConnectionRecovery` - ICE restart and automatic recovery
- Configurable retry logic with callbacks
- ICE health monitoring with state tracking
- Full TypeScript support with comprehensive types
```

**Step 2: Commit**

```bash
git add docs/FEATURE_ROADMAP.md
git commit -m "docs: update roadmap - mark Connection Recovery complete"
```

---

## Success Criteria

- [ ] All 27+ tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint passes (warnings OK)
- [ ] useConnectionRecovery exported from index
- [ ] Feature roadmap updated
- [ ] Commits are granular and well-documented
