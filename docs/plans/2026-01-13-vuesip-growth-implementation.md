# VueSIP Growth Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform VueSIP into the most adopted Vue.js SIP library through developer-first growth strategy

**Architecture:** Phased implementation following critical path: Mock Mode → Tutorial → Templates → Power Features → AI → Enterprise. Each phase builds on previous. TDD approach with comprehensive test coverage.

**Tech Stack:** Vue 3, TypeScript, Vitest, VitePress, Web Speech API, Transformers.js, RNNoise WASM

---

## Phase 0.5: Developer Experience Foundation

**Timeline:** Month 1
**Critical Path:** This blocks everything else. Without mock mode, tutorial fails. Without tutorial, devs bounce.

---

### Task 1: Create `useSipMock` Composable - Core Structure

**Files:**

- Create: `src/composables/useSipMock.ts`
- Create: `tests/unit/composables/useSipMock.test.ts`
- Modify: `src/composables/index.ts`

**Step 1: Write the failing test for basic mock structure**

```typescript
// tests/unit/composables/useSipMock.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useSipMock } from '@/composables/useSipMock'

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useSipMock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should return mock SIP interface', () => {
      const mock = useSipMock()

      expect(mock.isConnected).toBeDefined()
      expect(mock.isRegistered).toBeDefined()
      expect(mock.callState).toBeDefined()
      expect(mock.connect).toBeDefined()
      expect(mock.disconnect).toBeDefined()
      expect(mock.call).toBeDefined()
      expect(mock.hangup).toBeDefined()
      expect(mock.answer).toBeDefined()
    })

    it('should start in disconnected state', () => {
      const mock = useSipMock()

      expect(mock.isConnected.value).toBe(false)
      expect(mock.isRegistered.value).toBe(false)
      expect(mock.callState.value).toBe('idle')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/unit/composables/useSipMock.test.ts`
Expected: FAIL with "Cannot find module '@/composables/useSipMock'"

**Step 3: Write minimal implementation**

````typescript
// src/composables/useSipMock.ts
/**
 * Mock SIP Composable
 *
 * Provides a simulated SIP client for testing and tutorials.
 * No real server connection required.
 *
 * @module composables/useSipMock
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useSipMock')

/**
 * Call state for mock calls
 */
export type MockCallState = 'idle' | 'calling' | 'ringing' | 'active' | 'held' | 'ended'

/**
 * Mock call information
 */
export interface MockCall {
  id: string
  direction: 'inbound' | 'outbound'
  remoteNumber: string
  remoteDisplayName: string
  state: MockCallState
  startTime: Date | null
  answerTime: Date | null
  endTime: Date | null
  duration: number
}

/**
 * Options for useSipMock
 */
export interface UseSipMockOptions {
  /** Delay before "connecting" (ms) */
  connectDelay?: number
  /** Delay before "registering" (ms) */
  registerDelay?: number
  /** Delay for ring time before auto-answer (ms) */
  ringDelay?: number
  /** Delay before call connects (ms) */
  connectCallDelay?: number
  /** Auto-answer incoming calls */
  autoAnswer?: boolean
  /** Simulate call quality events */
  simulateQualityEvents?: boolean
  /** Generate fake incoming calls */
  generateIncomingCalls?: boolean
  /** Interval for incoming calls (ms) */
  incomingCallInterval?: number
}

/**
 * Return type for useSipMock
 */
export interface UseSipMockReturn {
  // State
  isConnected: Ref<boolean>
  isRegistered: Ref<boolean>
  callState: ComputedRef<MockCallState>
  activeCall: Ref<MockCall | null>
  callHistory: Ref<MockCall[]>
  error: Ref<string | null>

  // Connection
  connect: () => Promise<void>
  disconnect: () => Promise<void>

  // Call operations
  call: (number: string, displayName?: string) => Promise<string>
  hangup: () => Promise<void>
  answer: () => Promise<void>
  hold: () => Promise<void>
  unhold: () => Promise<void>
  sendDTMF: (digit: string) => void

  // Event simulation
  simulateIncomingCall: (number: string, displayName?: string) => void
  simulateCallQualityDrop: () => void
  simulateNetworkIssue: () => void

  // Configuration
  configure: (options: Partial<UseSipMockOptions>) => void
}

/**
 * Mock SIP Composable
 *
 * @param options - Configuration options
 * @returns Mock SIP interface
 *
 * @example
 * ```typescript
 * import { useSipMock } from 'vuesip'
 *
 * const sip = useSipMock({
 *   ringDelay: 2000,
 *   autoAnswer: false
 * })
 *
 * await sip.connect()
 * await sip.call('555-1234')
 * ```
 */
export function useSipMock(options: UseSipMockOptions = {}): UseSipMockReturn {
  // Configuration with defaults
  const config = ref<UseSipMockOptions>({
    connectDelay: options.connectDelay ?? 500,
    registerDelay: options.registerDelay ?? 300,
    ringDelay: options.ringDelay ?? 3000,
    connectCallDelay: options.connectCallDelay ?? 1000,
    autoAnswer: options.autoAnswer ?? false,
    simulateQualityEvents: options.simulateQualityEvents ?? false,
    generateIncomingCalls: options.generateIncomingCalls ?? false,
    incomingCallInterval: options.incomingCallInterval ?? 30000,
  })

  // State
  const isConnected = ref(false)
  const isRegistered = ref(false)
  const activeCall = ref<MockCall | null>(null)
  const callHistory = ref<MockCall[]>([])
  const error = ref<string | null>(null)

  // Computed
  const callState = computed<MockCallState>(() => {
    return activeCall.value?.state ?? 'idle'
  })

  // Generate unique call ID
  function generateCallId(): string {
    return `mock-call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  // Connection methods
  async function connect(): Promise<void> {
    logger.info('Connecting to mock SIP server...')
    error.value = null

    await new Promise((resolve) => setTimeout(resolve, config.value.connectDelay))
    isConnected.value = true
    logger.info('Connected to mock SIP server')

    await new Promise((resolve) => setTimeout(resolve, config.value.registerDelay))
    isRegistered.value = true
    logger.info('Registered with mock SIP server')
  }

  async function disconnect(): Promise<void> {
    logger.info('Disconnecting from mock SIP server...')

    if (activeCall.value) {
      await hangup()
    }

    isRegistered.value = false
    isConnected.value = false
    logger.info('Disconnected from mock SIP server')
  }

  // Call methods
  async function call(number: string, displayName?: string): Promise<string> {
    if (!isRegistered.value) {
      throw new Error('Not registered - call connect() first')
    }

    if (activeCall.value) {
      throw new Error('Call already in progress')
    }

    const callId = generateCallId()
    logger.info(`Initiating mock call to ${number}`)

    activeCall.value = {
      id: callId,
      direction: 'outbound',
      remoteNumber: number,
      remoteDisplayName: displayName ?? `Mock User ${number.slice(-4)}`,
      state: 'calling',
      startTime: new Date(),
      answerTime: null,
      endTime: null,
      duration: 0,
    }

    // Simulate ringing
    await new Promise((resolve) => setTimeout(resolve, config.value.ringDelay))

    if (activeCall.value?.id === callId) {
      activeCall.value.state = 'ringing'

      // Simulate answer
      await new Promise((resolve) => setTimeout(resolve, config.value.connectCallDelay))

      if (activeCall.value?.id === callId) {
        activeCall.value.state = 'active'
        activeCall.value.answerTime = new Date()
        logger.info(`Mock call ${callId} connected`)
      }
    }

    return callId
  }

  async function hangup(): Promise<void> {
    if (!activeCall.value) {
      logger.warn('No active call to hang up')
      return
    }

    logger.info(`Hanging up mock call ${activeCall.value.id}`)

    activeCall.value.state = 'ended'
    activeCall.value.endTime = new Date()

    if (activeCall.value.answerTime) {
      activeCall.value.duration = Math.floor(
        (activeCall.value.endTime.getTime() - activeCall.value.answerTime.getTime()) / 1000
      )
    }

    // Add to history
    callHistory.value.unshift({ ...activeCall.value })
    activeCall.value = null
  }

  async function answer(): Promise<void> {
    if (!activeCall.value) {
      throw new Error('No incoming call to answer')
    }

    if (activeCall.value.direction !== 'inbound') {
      throw new Error('Can only answer incoming calls')
    }

    if (activeCall.value.state !== 'ringing') {
      throw new Error('Call is not ringing')
    }

    logger.info(`Answering mock call ${activeCall.value.id}`)
    activeCall.value.state = 'active'
    activeCall.value.answerTime = new Date()
  }

  async function hold(): Promise<void> {
    if (!activeCall.value || activeCall.value.state !== 'active') {
      throw new Error('No active call to hold')
    }

    logger.info(`Holding mock call ${activeCall.value.id}`)
    activeCall.value.state = 'held'
  }

  async function unhold(): Promise<void> {
    if (!activeCall.value || activeCall.value.state !== 'held') {
      throw new Error('No held call to unhold')
    }

    logger.info(`Unholding mock call ${activeCall.value.id}`)
    activeCall.value.state = 'active'
  }

  function sendDTMF(digit: string): void {
    if (!activeCall.value || activeCall.value.state !== 'active') {
      logger.warn('Cannot send DTMF - no active call')
      return
    }

    logger.info(`Sending mock DTMF: ${digit}`)
  }

  // Event simulation
  function simulateIncomingCall(number: string, displayName?: string): void {
    if (!isRegistered.value) {
      logger.warn('Cannot simulate incoming call - not registered')
      return
    }

    if (activeCall.value) {
      logger.warn('Cannot simulate incoming call - call already active')
      return
    }

    const callId = generateCallId()
    logger.info(`Simulating incoming call from ${number}`)

    activeCall.value = {
      id: callId,
      direction: 'inbound',
      remoteNumber: number,
      remoteDisplayName: displayName ?? `Caller ${number.slice(-4)}`,
      state: 'ringing',
      startTime: new Date(),
      answerTime: null,
      endTime: null,
      duration: 0,
    }

    // Auto-answer if configured
    if (config.value.autoAnswer) {
      setTimeout(() => {
        if (activeCall.value?.id === callId && activeCall.value.state === 'ringing') {
          answer()
        }
      }, config.value.ringDelay)
    }
  }

  function simulateCallQualityDrop(): void {
    logger.info('Simulating call quality drop')
    // This would emit events for quality monitoring composables
  }

  function simulateNetworkIssue(): void {
    logger.info('Simulating network issue')
    error.value = 'Network connectivity issue detected'
  }

  function configure(newOptions: Partial<UseSipMockOptions>): void {
    config.value = { ...config.value, ...newOptions }
  }

  return {
    // State
    isConnected,
    isRegistered,
    callState,
    activeCall,
    callHistory,
    error,

    // Connection
    connect,
    disconnect,

    // Call operations
    call,
    hangup,
    answer,
    hold,
    unhold,
    sendDTMF,

    // Event simulation
    simulateIncomingCall,
    simulateCallQualityDrop,
    simulateNetworkIssue,

    // Configuration
    configure,
  }
}
````

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/unit/composables/useSipMock.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/useSipMock.ts tests/unit/composables/useSipMock.test.ts
git commit -m "feat(mock): add useSipMock composable core structure"
```

---

### Task 2: Add `useSipMock` Connection Tests

**Files:**

- Modify: `tests/unit/composables/useSipMock.test.ts`

**Step 1: Write failing tests for connect/disconnect**

```typescript
// Add to tests/unit/composables/useSipMock.test.ts after initialization tests

describe('connect() method', () => {
  it('should connect and register after delays', async () => {
    const mock = useSipMock({
      connectDelay: 100,
      registerDelay: 100,
    })

    const connectPromise = mock.connect()

    expect(mock.isConnected.value).toBe(false)
    expect(mock.isRegistered.value).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    expect(mock.isConnected.value).toBe(true)
    expect(mock.isRegistered.value).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    expect(mock.isRegistered.value).toBe(true)

    await connectPromise
  })

  it('should clear errors on connect', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0 })
    mock.simulateNetworkIssue()
    expect(mock.error.value).not.toBeNull()

    await mock.connect()
    expect(mock.error.value).toBeNull()
  })
})

describe('disconnect() method', () => {
  it('should disconnect and unregister', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0 })
    await mock.connect()

    await mock.disconnect()

    expect(mock.isConnected.value).toBe(false)
    expect(mock.isRegistered.value).toBe(false)
  })

  it('should hang up active call on disconnect', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 0,
      connectCallDelay: 0,
    })
    await mock.connect()
    await mock.call('555-1234')

    expect(mock.activeCall.value).not.toBeNull()

    await mock.disconnect()

    expect(mock.activeCall.value).toBeNull()
    expect(mock.callHistory.value.length).toBe(1)
  })
})
```

**Step 2: Run test to verify it passes**

Run: `pnpm test:unit tests/unit/composables/useSipMock.test.ts`
Expected: PASS (implementation already handles these cases)

**Step 3: Commit**

```bash
git add tests/unit/composables/useSipMock.test.ts
git commit -m "test(mock): add connection and disconnect tests"
```

---

### Task 3: Add `useSipMock` Call Tests

**Files:**

- Modify: `tests/unit/composables/useSipMock.test.ts`

**Step 1: Write failing tests for call operations**

```typescript
// Add to tests/unit/composables/useSipMock.test.ts

describe('call() method', () => {
  it('should throw if not registered', async () => {
    const mock = useSipMock()

    await expect(mock.call('555-1234')).rejects.toThrow('Not registered')
  })

  it('should throw if call already in progress', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 1000,
      connectCallDelay: 1000,
    })
    await mock.connect()

    // Start a call but don't await it
    mock.call('555-1234')

    // Try to start another call
    await expect(mock.call('555-5678')).rejects.toThrow('Call already in progress')
  })

  it('should progress through call states', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 100,
      connectCallDelay: 100,
    })
    await mock.connect()

    const callPromise = mock.call('555-1234')

    expect(mock.callState.value).toBe('calling')

    await vi.advanceTimersByTimeAsync(100)
    expect(mock.callState.value).toBe('ringing')

    await vi.advanceTimersByTimeAsync(100)
    expect(mock.callState.value).toBe('active')

    await callPromise
  })

  it('should return call ID', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 0,
      connectCallDelay: 0,
    })
    await mock.connect()

    const callId = await mock.call('555-1234')

    expect(callId).toMatch(/^mock-call-/)
    expect(mock.activeCall.value?.id).toBe(callId)
  })
})

describe('hangup() method', () => {
  it('should end call and add to history', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 0,
      connectCallDelay: 0,
    })
    await mock.connect()
    await mock.call('555-1234')

    await mock.hangup()

    expect(mock.activeCall.value).toBeNull()
    expect(mock.callState.value).toBe('idle')
    expect(mock.callHistory.value.length).toBe(1)
    expect(mock.callHistory.value[0].remoteNumber).toBe('555-1234')
  })

  it('should calculate duration', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 0,
      connectCallDelay: 0,
    })
    await mock.connect()
    await mock.call('555-1234')

    // Advance time by 5 seconds
    await vi.advanceTimersByTimeAsync(5000)

    await mock.hangup()

    expect(mock.callHistory.value[0].duration).toBeGreaterThanOrEqual(5)
  })
})

describe('hold/unhold methods', () => {
  it('should hold and unhold active call', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 0,
      connectCallDelay: 0,
    })
    await mock.connect()
    await mock.call('555-1234')

    await mock.hold()
    expect(mock.callState.value).toBe('held')

    await mock.unhold()
    expect(mock.callState.value).toBe('active')
  })

  it('should throw if no active call', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0 })
    await mock.connect()

    await expect(mock.hold()).rejects.toThrow('No active call')
  })
})

describe('simulateIncomingCall() method', () => {
  it('should create incoming call in ringing state', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0 })
    await mock.connect()

    mock.simulateIncomingCall('555-9999', 'Test Caller')

    expect(mock.activeCall.value).not.toBeNull()
    expect(mock.activeCall.value?.direction).toBe('inbound')
    expect(mock.activeCall.value?.state).toBe('ringing')
    expect(mock.activeCall.value?.remoteNumber).toBe('555-9999')
  })

  it('should auto-answer if configured', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      autoAnswer: true,
      ringDelay: 100,
    })
    await mock.connect()

    mock.simulateIncomingCall('555-9999')

    expect(mock.callState.value).toBe('ringing')

    await vi.advanceTimersByTimeAsync(100)

    expect(mock.callState.value).toBe('active')
  })
})

describe('answer() method', () => {
  it('should answer incoming call', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0, autoAnswer: false })
    await mock.connect()
    mock.simulateIncomingCall('555-9999')

    await mock.answer()

    expect(mock.callState.value).toBe('active')
    expect(mock.activeCall.value?.answerTime).not.toBeNull()
  })

  it('should throw if no incoming call', async () => {
    const mock = useSipMock({ connectDelay: 0, registerDelay: 0 })
    await mock.connect()

    await expect(mock.answer()).rejects.toThrow('No incoming call')
  })

  it('should throw if call is outbound', async () => {
    const mock = useSipMock({
      connectDelay: 0,
      registerDelay: 0,
      ringDelay: 1000,
      connectCallDelay: 1000,
    })
    await mock.connect()
    mock.call('555-1234') // Don't await

    await expect(mock.answer()).rejects.toThrow('Can only answer incoming calls')
  })
})
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test:unit tests/unit/composables/useSipMock.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/unit/composables/useSipMock.test.ts
git commit -m "test(mock): add comprehensive call operation tests"
```

---

### Task 4: Export `useSipMock` from Index

**Files:**

- Modify: `src/composables/index.ts`

**Step 1: Add export to index**

Add after the existing exports (around line 90):

```typescript
// Mock mode (no server needed)
export {
  useSipMock,
  type UseSipMockReturn,
  type UseSipMockOptions,
  type MockCall,
  type MockCallState,
} from './useSipMock'
```

**Step 2: Run build to verify exports work**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/composables/index.ts
git commit -m "feat(mock): export useSipMock from composables index"
```

---

### Task 5: Create Tutorial Part 1 - "Hello VueSIP"

**Files:**

- Create: `docs/tutorial/index.md`
- Create: `docs/tutorial/part-1-hello-vuesip.md`
- Modify: `docs/.vitepress/config.ts`

**Step 1: Create tutorial index**

````markdown
## <!-- docs/tutorial/index.md -->

title: VueSIP Tutorial
description: Learn VueSIP from scratch in under an hour

---

# VueSIP Tutorial

Welcome! This tutorial will take you from zero to building production-ready SIP applications with Vue.js.

## Prerequisites

- Basic Vue.js knowledge (components, refs, computed)
- Node.js 18+ installed
- 30-60 minutes of time

## Tutorial Parts

| Part                                              | Duration | What You'll Build                   |
| ------------------------------------------------- | -------- | ----------------------------------- |
| [1. Hello VueSIP](./part-1-hello-vuesip)          | 5 min    | Your first call (no server needed!) |
| [2. Building a Softphone](./part-2-softphone-ui)  | 15 min   | Call controls, status display, DTMF |
| [3. Real Server Connection](./part-3-real-server) | 10 min   | Connect to a real SIP provider      |
| [4. Advanced Features](./part-4-advanced)         | 20 min   | Transfers, conferencing, recording  |

## Quick Start

Don't have time for the full tutorial? Here's the fastest path to a working softphone:

```bash
# Create new Vue project
npm create vue@latest my-softphone -- --template vue-ts
cd my-softphone

# Install VueSIP
npm install vuesip

# Copy our basic-softphone template
npx degit vuesip/vuesip/templates/basic-softphone src/
```
````

Ready? Let's start with [Part 1: Hello VueSIP](./part-1-hello-vuesip).

````

**Step 2: Create Part 1**

```markdown
<!-- docs/tutorial/part-1-hello-vuesip.md -->
---
title: "Part 1: Hello VueSIP"
description: Make your first call with VueSIP in under 5 minutes
---

# Part 1: Hello VueSIP

In this part, you'll make your first SIP call - without needing a real SIP server.

**Time:** ~5 minutes

## What You'll Learn

- How to install VueSIP
- Using mock mode for development
- Basic call flow: connect → call → hangup

## Step 1: Create a Vue Project

```bash
npm create vue@latest vuesip-tutorial -- --template vue-ts
cd vuesip-tutorial
npm install
````

## Step 2: Install VueSIP

```bash
npm install vuesip
```

## Step 3: Your First Call

Replace `src/App.vue` with:

```vue
<script setup lang="ts">
import { useSipMock } from 'vuesip'

// Create mock SIP client - no server needed!
const sip = useSipMock()

async function makeCall() {
  // Connect to "server" (simulated)
  await sip.connect()

  // Make a call (simulated)
  await sip.call('555-1234')
}

async function endCall() {
  await sip.hangup()
}
</script>

<template>
  <div class="app">
    <h1>My First Softphone</h1>

    <div class="status">
      <p>Connected: {{ sip.isConnected.value ? 'Yes' : 'No' }}</p>
      <p>Call Status: {{ sip.callState.value }}</p>
    </div>

    <div v-if="sip.activeCall.value" class="call-info">
      <p>Calling: {{ sip.activeCall.value.remoteNumber }}</p>
    </div>

    <div class="controls">
      <button @click="makeCall" :disabled="sip.callState.value !== 'idle'">Call 555-1234</button>

      <button @click="endCall" :disabled="sip.callState.value === 'idle'">Hang Up</button>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: system-ui;
}

.status {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.call-info {
  background: #e3f2fd;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.controls {
  display: flex;
  gap: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:first-child {
  background: #4caf50;
  color: white;
}

button:last-child {
  background: #f44336;
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## Step 4: Run It

```bash
npm run dev
```

Open http://localhost:5173 and click "Call 555-1234". You'll see:

1. Status changes to "Connected: Yes"
2. Call state goes: `idle` → `calling` → `ringing` → `active`
3. Click "Hang Up" to end the call

## What Just Happened?

You used **mock mode** - VueSIP simulated the entire SIP flow:

- `useSipMock()` creates a fake SIP client
- `connect()` pretends to connect to a server
- `call()` simulates the outbound call flow
- No real network traffic, no SIP server needed!

This is perfect for:

- Learning VueSIP without server setup
- Writing tests
- Prototyping UI before infrastructure is ready

## Common Mistakes

::: warning Don't forget await
`connect()` and `call()` are async. If you forget `await`, the call might start before connection is ready.
:::

::: tip Mock vs Real
In production, you'll use `useSipClient()` instead of `useSipMock()`. The API is nearly identical!
:::

## What You Learned

- `useSipMock()` - Creates a simulated SIP client
- `sip.connect()` - Establishes connection
- `sip.call(number)` - Initiates outbound call
- `sip.hangup()` - Ends active call
- `sip.callState` - Reactive call state
- `sip.activeCall` - Current call information

## Next Steps

Ready to build a real softphone UI? Continue to [Part 2: Building a Softphone](./part-2-softphone-ui).

---

**Related API Reference:**

- [useSipMock](/api/composables#usesipmock)
- [useSipClient](/api/composables#usesipclient)

````

**Step 3: Update VitePress config sidebar**

Add to `docs/.vitepress/config.ts` in the sidebar section:

```typescript
// Add new tutorial section to sidebar configuration
'/tutorial/': [
  {
    text: 'VueSIP Tutorial',
    items: [
      { text: 'Overview', link: '/tutorial/' },
      { text: 'Part 1: Hello VueSIP', link: '/tutorial/part-1-hello-vuesip' },
      { text: 'Part 2: Building a Softphone', link: '/tutorial/part-2-softphone-ui' },
      { text: 'Part 3: Real Server Connection', link: '/tutorial/part-3-real-server' },
      { text: 'Part 4: Advanced Features', link: '/tutorial/part-4-advanced' },
    ],
  },
],
````

Also add to nav:

```typescript
// In themeConfig.nav array, add:
{ text: 'Tutorial', link: '/tutorial/', activeMatch: '/tutorial/' },
```

**Step 4: Build docs to verify**

Run: `pnpm docs:build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add docs/tutorial/ docs/.vitepress/config.ts
git commit -m "docs(tutorial): add Part 1 - Hello VueSIP with mock mode"
```

---

### Task 6: Create Tutorial Part 2 - "Building a Softphone UI"

**Files:**

- Create: `docs/tutorial/part-2-softphone-ui.md`

**Step 1: Create Part 2 content**

```markdown
## <!-- docs/tutorial/part-2-softphone-ui.md -->

title: "Part 2: Building a Softphone UI"
description: Build call controls, status displays, and a DTMF dialpad

---

# Part 2: Building a Softphone UI

Now let's build a proper softphone interface with dialpad, call controls, and status display.

**Time:** ~15 minutes

## What You'll Build

A complete softphone with:

- Number input with dialpad
- Call/Answer/Hangup buttons
- Hold/Mute controls
- Call duration timer
- Call history

## Step 1: Project Structure

Create these files:
```

src/
├── App.vue
├── components/
│ ├── Dialpad.vue
│ ├── CallControls.vue
│ └── CallStatus.vue
└── composables/
└── useCallTimer.ts

````

## Step 2: Call Timer Composable

```typescript
// src/composables/useCallTimer.ts
import { ref, onUnmounted } from 'vue'

export function useCallTimer() {
  const duration = ref(0)
  const isRunning = ref(false)
  let interval: ReturnType<typeof setInterval> | null = null

  function start() {
    if (isRunning.value) return

    duration.value = 0
    isRunning.value = true
    interval = setInterval(() => {
      duration.value++
    }, 1000)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    isRunning.value = false
  }

  function reset() {
    stop()
    duration.value = 0
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  onUnmounted(() => stop())

  return {
    duration,
    isRunning,
    formattedDuration: () => formatDuration(duration.value),
    start,
    stop,
    reset,
  }
}
````

## Step 3: Dialpad Component

```vue
<!-- src/components/Dialpad.vue -->
<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  digit: [digit: string]
}>()

const digits = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

function press(digit: string) {
  emit('digit', digit)
}
</script>

<template>
  <div class="dialpad">
    <div v-for="row in digits" :key="row.join('')" class="row">
      <button v-for="digit in row" :key="digit" :disabled="disabled" @click="press(digit)">
        {{ digit }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dialpad {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

button {
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 50%;
  background: #e0e0e0;
  font-size: 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #bdbdbd;
}

button:active:not(:disabled) {
  background: #9e9e9e;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## Step 4: Call Controls Component

```vue
<!-- src/components/CallControls.vue -->
<script setup lang="ts">
import type { MockCallState } from 'vuesip'

const props = defineProps<{
  callState: MockCallState
  isHeld: boolean
  isMuted: boolean
}>()

const emit = defineEmits<{
  call: []
  hangup: []
  answer: []
  hold: []
  mute: []
}>()
</script>

<template>
  <div class="controls">
    <!-- Idle state: Show call button -->
    <button v-if="callState === 'idle'" class="call-btn" @click="emit('call')">📞 Call</button>

    <!-- Ringing inbound: Show answer -->
    <button v-if="callState === 'ringing'" class="answer-btn" @click="emit('answer')">
      📞 Answer
    </button>

    <!-- Active call controls -->
    <template v-if="callState === 'active' || callState === 'held'">
      <button :class="['hold-btn', { active: isHeld }]" @click="emit('hold')">
        {{ isHeld ? '▶️ Resume' : '⏸️ Hold' }}
      </button>

      <button :class="['mute-btn', { active: isMuted }]" @click="emit('mute')">
        {{ isMuted ? '🔊 Unmute' : '🔇 Mute' }}
      </button>
    </template>

    <!-- Any active state: Show hangup -->
    <button v-if="callState !== 'idle'" class="hangup-btn" @click="emit('hangup')">
      📴 Hang Up
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition:
    transform 0.1s,
    opacity 0.2s;
}

button:active {
  transform: scale(0.95);
}

.call-btn,
.answer-btn {
  background: #4caf50;
  color: white;
}

.hangup-btn {
  background: #f44336;
  color: white;
}

.hold-btn,
.mute-btn {
  background: #2196f3;
  color: white;
}

.hold-btn.active,
.mute-btn.active {
  background: #ff9800;
}
</style>
```

## Step 5: Call Status Component

```vue
<!-- src/components/CallStatus.vue -->
<script setup lang="ts">
import type { MockCall, MockCallState } from 'vuesip'

defineProps<{
  callState: MockCallState
  activeCall: MockCall | null
  duration: string
}>()

const stateLabels: Record<MockCallState, string> = {
  idle: 'Ready',
  calling: 'Calling...',
  ringing: 'Incoming Call',
  active: 'In Call',
  held: 'On Hold',
  ended: 'Call Ended',
}
</script>

<template>
  <div :class="['status', callState]">
    <div class="state">{{ stateLabels[callState] }}</div>

    <template v-if="activeCall">
      <div class="remote">
        <span class="name">{{ activeCall.remoteDisplayName }}</span>
        <span class="number">{{ activeCall.remoteNumber }}</span>
      </div>

      <div v-if="callState === 'active' || callState === 'held'" class="duration">
        {{ duration }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.status {
  text-align: center;
  padding: 20px;
  border-radius: 12px;
  background: #f5f5f5;
  transition: background 0.3s;
}

.status.ringing {
  background: #fff3e0;
  animation: pulse 1s infinite;
}

.status.active {
  background: #e8f5e9;
}

.status.held {
  background: #fff8e1;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.state {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.remote {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-size: 1.1rem;
}

.number {
  color: #666;
  font-family: monospace;
}

.duration {
  margin-top: 12px;
  font-size: 2rem;
  font-family: monospace;
  font-weight: 300;
}
</style>
```

## Step 6: Complete App

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSipMock } from 'vuesip'
import Dialpad from './components/Dialpad.vue'
import CallControls from './components/CallControls.vue'
import CallStatus from './components/CallStatus.vue'
import { useCallTimer } from './composables/useCallTimer'

// Mock SIP client
const sip = useSipMock()

// Call timer
const timer = useCallTimer()

// Local state
const phoneNumber = ref('')
const isMuted = ref(false)

// Watch call state for timer
watch(
  () => sip.callState.value,
  (state) => {
    if (state === 'active') {
      timer.start()
    } else if (state === 'idle' || state === 'ended') {
      timer.stop()
    }
  }
)

// Connect on mount
sip.connect()

// Handlers
function handleDigit(digit: string) {
  phoneNumber.value += digit

  // If in call, send as DTMF
  if (sip.callState.value === 'active') {
    sip.sendDTMF(digit)
  }
}

async function handleCall() {
  if (!phoneNumber.value) return
  await sip.call(phoneNumber.value)
}

async function handleAnswer() {
  await sip.answer()
}

async function handleHangup() {
  await sip.hangup()
  timer.reset()
  isMuted.value = false
}

async function handleHold() {
  if (sip.activeCall.value?.state === 'held') {
    await sip.unhold()
  } else {
    await sip.hold()
  }
}

function handleMute() {
  isMuted.value = !isMuted.value
  // In real implementation, this would mute the microphone
}

// Simulate incoming call (for testing)
function simulateIncoming() {
  sip.simulateIncomingCall('+1-555-CALLER', 'John Doe')
}
</script>

<template>
  <div class="softphone">
    <h1>VueSIP Softphone</h1>

    <CallStatus
      :call-state="sip.callState.value"
      :active-call="sip.activeCall.value"
      :duration="timer.formattedDuration()"
    />

    <div class="input-section">
      <input
        v-model="phoneNumber"
        type="tel"
        placeholder="Enter number"
        :disabled="sip.callState.value !== 'idle'"
      />
    </div>

    <Dialpad
      :disabled="sip.callState.value !== 'idle' && sip.callState.value !== 'active'"
      @digit="handleDigit"
    />

    <CallControls
      :call-state="sip.callState.value"
      :is-held="sip.activeCall.value?.state === 'held'"
      :is-muted="isMuted"
      @call="handleCall"
      @answer="handleAnswer"
      @hangup="handleHangup"
      @hold="handleHold"
      @mute="handleMute"
    />

    <!-- Testing helper -->
    <button v-if="sip.callState.value === 'idle'" class="test-btn" @click="simulateIncoming">
      Simulate Incoming Call
    </button>
  </div>
</template>

<style scoped>
.softphone {
  max-width: 360px;
  margin: 2rem auto;
  padding: 20px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  font-size: 1.25rem;
  margin-bottom: 20px;
  color: #333;
}

.input-section {
  margin: 20px 0;
}

input {
  width: 100%;
  padding: 12px;
  font-size: 1.25rem;
  text-align: center;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-family: monospace;
}

input:focus {
  outline: none;
  border-color: #2196f3;
}

input:disabled {
  background: #f5f5f5;
}

.test-btn {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 10px;
  background: #9c27b0;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
```

## Try It Out

```bash
npm run dev
```

You now have a fully functional softphone UI! Test:

1. Type a number using the dialpad
2. Click "Call" to start an outbound call
3. Use Hold/Mute controls during the call
4. Click "Simulate Incoming Call" to test inbound calls

## What You Learned

- `useCallTimer()` - Custom composable for call duration
- Component composition - Breaking UI into reusable pieces
- DTMF handling - Sending tones during active calls
- State-driven UI - Different controls for different call states

## Common Mistakes

::: warning Timer cleanup
Always stop timers in `onUnmounted` to prevent memory leaks.
:::

::: tip State machines
Call states form a state machine. Design your UI to handle each state explicitly.
:::

## Next Steps

Ready to connect to a real SIP server? Continue to [Part 3: Real Server Connection](./part-3-real-server).

````

**Step 2: Commit**

```bash
git add docs/tutorial/part-2-softphone-ui.md
git commit -m "docs(tutorial): add Part 2 - Building a Softphone UI"
````

---

### Task 7: Create Tutorial Part 3 - "Real Server Connection"

**Files:**

- Create: `docs/tutorial/part-3-real-server.md`

**Step 1: Create Part 3 content**

````markdown
## <!-- docs/tutorial/part-3-real-server.md -->

title: "Part 3: Real Server Connection"
description: Connect your softphone to a real SIP provider

---

# Part 3: Real Server Connection

Time to connect to a real SIP server and make actual calls!

**Time:** ~10 minutes

## What You'll Learn

- Choosing a SIP provider
- Getting credentials
- Switching from mock to real client
- Handling real connection states

## Choosing a Provider

VueSIP works with any SIP-over-WebSocket provider. Here are some options:

| Provider                     | Free Tier     | Best For       |
| ---------------------------- | ------------- | -------------- |
| [Telnyx](https://telnyx.com) | $2 credit     | Production use |
| [46elks](https://46elks.com) | Free sandbox  | EU-based apps  |
| [VoIP.ms](https://voip.ms)   | Pay-as-you-go | Low volume     |
| Your own Asterisk/FreeSWITCH | Free          | Full control   |

For this tutorial, we'll use **Telnyx** (easiest setup).

## Step 1: Get Telnyx Credentials

1. Sign up at [telnyx.com](https://telnyx.com)
2. Go to **Voice** → **SIP Connections**
3. Create a new SIP Connection
4. Note your:
   - **SIP URI** (e.g., `sip:username@sip.telnyx.com`)
   - **Password**
   - **WebSocket URL**: `wss://sip.telnyx.com`

## Step 2: Switch to Real Client

Replace `useSipMock` with `useSipClient`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient } from 'vuesip'

// Environment variables (create .env.local)
const config = {
  uri: import.meta.env.VITE_SIP_URI, // sip:user@sip.telnyx.com
  password: import.meta.env.VITE_SIP_PASSWORD,
  wsUri: import.meta.env.VITE_WS_URI || 'wss://sip.telnyx.com',
  displayName: import.meta.env.VITE_DISPLAY_NAME || 'VueSIP User',
}

// Real SIP client
const {
  isConnected,
  isRegistered,
  callState,
  activeCall,
  error,
  connect,
  disconnect,
  call,
  hangup,
  answer,
  hold,
  unhold,
  sendDTMF,
} = useSipClient({
  uri: config.uri,
  password: config.password,
  wsServers: [config.wsUri],
  displayName: config.displayName,
  // Enable logging for debugging
  logLevel: 'debug',
})

// Connection state
const connectionState = computed(() => {
  if (error.value) return 'error'
  if (isRegistered.value) return 'ready'
  if (isConnected.value) return 'connecting'
  return 'disconnected'
})

// Phone number input
const phoneNumber = ref('')

async function handleConnect() {
  try {
    await connect()
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

async function handleCall() {
  if (!phoneNumber.value) return

  // Format number (E.164 recommended)
  const number = phoneNumber.value.startsWith('+') ? phoneNumber.value : `+1${phoneNumber.value}` // Assumes US

  await call(number)
}
</script>

<template>
  <div class="app">
    <h1>Real Softphone</h1>

    <!-- Connection Status -->
    <div :class="['status', connectionState]">
      <template v-if="connectionState === 'disconnected'">
        <p>Not connected</p>
        <button @click="handleConnect">Connect</button>
      </template>

      <template v-else-if="connectionState === 'connecting'">
        <p>Connecting...</p>
      </template>

      <template v-else-if="connectionState === 'ready'">
        <p>✅ Ready to make calls</p>
      </template>

      <template v-else-if="connectionState === 'error'">
        <p>❌ {{ error }}</p>
        <button @click="handleConnect">Retry</button>
      </template>
    </div>

    <!-- Call Interface (only when ready) -->
    <template v-if="connectionState === 'ready'">
      <input
        v-model="phoneNumber"
        type="tel"
        placeholder="+1 555 123 4567"
        :disabled="callState !== 'idle'"
      />

      <div class="controls">
        <button v-if="callState === 'idle'" @click="handleCall" :disabled="!phoneNumber">
          📞 Call
        </button>

        <button
          v-if="callState === 'ringing' && activeCall?.direction === 'inbound'"
          @click="answer"
        >
          ✅ Answer
        </button>

        <button v-if="callState !== 'idle'" @click="hangup">📴 Hang Up</button>
      </div>

      <div v-if="activeCall" class="call-info">
        <p>{{ callState }}: {{ activeCall.remoteNumber }}</p>
      </div>
    </template>

    <!-- Disconnect button -->
    <button v-if="isConnected" class="disconnect" @click="disconnect">Disconnect</button>
  </div>
</template>
```
````

## Step 3: Create Environment File

Create `.env.local` (never commit this!):

```bash
VITE_SIP_URI=sip:your-username@sip.telnyx.com
VITE_SIP_PASSWORD=your-password
VITE_WS_URI=wss://sip.telnyx.com
VITE_DISPLAY_NAME=My Softphone
```

## Step 4: Test Your Connection

```bash
npm run dev
```

1. Click "Connect" - should show "Ready to make calls"
2. Enter a real phone number (your mobile)
3. Click "Call" - your phone should ring!
4. Answer and verify two-way audio

## Handling Errors

Real connections fail. Handle these gracefully:

```typescript
const {
  error,
  connectionState,
  // ...
} = useSipClient({
  /* ... */
})

// Watch for errors
watch(error, (err) => {
  if (err) {
    console.error('SIP Error:', err)

    // Show user-friendly message
    if (err.includes('401')) {
      userMessage.value = 'Invalid credentials'
    } else if (err.includes('timeout')) {
      userMessage.value = 'Connection timed out'
    } else {
      userMessage.value = 'Connection failed'
    }
  }
})

// Auto-reconnect on disconnect
watch(connectionState, (state) => {
  if (state === 'disconnected' && shouldReconnect.value) {
    setTimeout(() => connect(), 5000)
  }
})
```

## Common Issues

### "403 Forbidden"

Your IP may not be whitelisted. Check your provider's security settings.

### "408 Request Timeout"

Firewall blocking WebSocket. Try from a different network.

### No Audio

Check browser permissions. WebRTC requires HTTPS in production.

### Echo or Feedback

Use headphones for testing, or enable echo cancellation:

```typescript
const {
  /* ... */
} = useSipClient({
  // ...
  mediaConstraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
})
```

## What You Learned

- `useSipClient()` - Real SIP client (vs mock)
- Environment variables - Secure credential storage
- Connection states - disconnected → connecting → ready
- Error handling - Graceful failure recovery
- E.164 format - International phone number standard

## Security Checklist

- [ ] Never commit `.env.local`
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Add authentication to your app
- [ ] Monitor for abuse

## Next Steps

Ready for advanced features? Continue to [Part 4: Advanced Features](./part-4-advanced).

````

**Step 2: Commit**

```bash
git add docs/tutorial/part-3-real-server.md
git commit -m "docs(tutorial): add Part 3 - Real Server Connection"
````

---

### Task 8: Create Tutorial Part 4 - "Advanced Features"

**Files:**

- Create: `docs/tutorial/part-4-advanced.md`

**Step 1: Create Part 4 content**

````markdown
## <!-- docs/tutorial/part-4-advanced.md -->

title: "Part 4: Advanced Features"
description: Transfers, conferencing, recording, and transcription

---

# Part 4: Advanced Features

Let's add professional features: call transfers, conferencing, and real-time transcription.

**Time:** ~20 minutes

## What You'll Learn

- Blind and attended transfers
- Multi-party conferencing
- Call recording (with consent)
- Live transcription

## Call Transfers

### Blind Transfer

Transfer call immediately without consultation:

```typescript
import { useSipClient, useCallControls } from 'vuesip'

const sipClient = useSipClient({
  /* config */
})
const { blindTransfer, isTransferring } = useCallControls(sipClient)

async function transferTo(extension: string) {
  if (!sipClient.activeCall.value) return

  await blindTransfer(sipClient.activeCall.value.id, `sip:${extension}@your-pbx.com`)

  // Call is now transferred - our leg disconnects
}
```
````

### Attended Transfer

Consult with transfer target first:

```typescript
const { initiateAttendedTransfer, completeAttendedTransfer, cancelTransfer, consultationCall } =
  useCallControls(sipClient)

async function startAttendedTransfer(extension: string) {
  // Put original call on hold and call the target
  await initiateAttendedTransfer(sipClient.activeCall.value.id, `sip:${extension}@your-pbx.com`)

  // Now we're talking to the transfer target
  // consultationCall.value has the new call
}

async function finishTransfer() {
  // Connect original caller to transfer target
  await completeAttendedTransfer()
}

async function abortTransfer() {
  // Cancel and return to original caller
  await cancelTransfer()
}
```

## Conferencing

Create multi-party calls:

```typescript
import { useConference } from 'vuesip'

const {
  participants,
  isConferenceActive,
  startConference,
  addParticipant,
  removeParticipant,
  muteParticipant,
  endConference,
} = useConference(sipClient)

// Start a conference with current call
async function startThreeWay() {
  await startConference()

  // Add another participant
  await addParticipant('sip:colleague@pbx.com')
}

// In template
// <div v-for="p in participants" :key="p.id">
//   {{ p.displayName }}
//   <button @click="muteParticipant(p.id)">Mute</button>
//   <button @click="removeParticipant(p.id)">Remove</button>
// </div>
```

## Call Recording

Record calls (requires server support and consent!):

```typescript
import { useAmiRecording } from 'vuesip'

// Connect to AMI (Asterisk only)
const ami = useAmi()
await ami.connect('ws://your-pbx:8088/ws', 'admin', 'password')

const { isRecording, startRecording, stopRecording, pauseRecording, resumeRecording } =
  useAmiRecording(ami)

async function toggleRecording(channelId: string) {
  if (isRecording.value) {
    await stopRecording(channelId)
  } else {
    // Always get consent first!
    await startRecording(channelId, {
      format: 'wav',
      filename: `call-${Date.now()}`,
    })
  }
}
```

::: warning Legal Requirements
Many jurisdictions require consent from ALL parties before recording.
Always announce: "This call may be recorded for quality purposes."
:::

## Real-Time Transcription

Live speech-to-text during calls:

```typescript
import { useTranscription } from 'vuesip'

const { isTranscribing, transcript, currentUtterance, start, stop, exportTranscript } =
  useTranscription({
    provider: 'web-speech', // Free, browser-based
    language: 'en-US',
    localEnabled: true, // Transcribe our speech
    remoteEnabled: true, // Transcribe caller's speech
  })

// Start transcription when call connects
watch(
  () => sipClient.callState.value,
  (state) => {
    if (state === 'active') {
      start()
    } else if (state === 'idle') {
      stop()
    }
  }
)

// Display transcript in UI
// <div v-for="entry in transcript" :key="entry.id">
//   <strong>{{ entry.speaker }}:</strong> {{ entry.text }}
// </div>

// Export after call
async function saveTranscript() {
  const srt = exportTranscript('srt') // SubRip format
  const txt = exportTranscript('text') // Plain text
  const json = exportTranscript('json') // Structured data

  // Save to your backend
  await api.saveCallTranscript(callId, { srt, txt, json })
}
```

### Keyword Detection

Trigger actions on specific phrases:

```typescript
const {
  /* ... */
} = useTranscription({
  // ...
  keywords: [
    { phrase: 'cancel', action: 'show-retention-offer' },
    { phrase: 'supervisor', action: 'escalate' },
    { phrase: 'credit card', action: 'pause-recording' },
  ],
  onKeywordDetected: (match) => {
    console.log(`Detected "${match.matchedText}" - Action: ${match.rule.action}`)

    switch (match.rule.action) {
      case 'show-retention-offer':
        showRetentionModal()
        break
      case 'escalate':
        requestSupervisor()
        break
      case 'pause-recording':
        pauseRecording()
        break
    }
  },
})
```

## Complete Advanced Softphone

Here's a full example combining all features:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSipClient, useCallControls, useConference, useTranscription } from 'vuesip'

// Core SIP
const sip = useSipClient({
  /* config */
})

// Advanced features
const transfer = useCallControls(sip)
const conference = useConference(sip)
const transcription = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
})

// UI state
const transferTarget = ref('')
const showTransferDialog = ref(false)

// Auto-start transcription
watch(
  () => sip.callState.value,
  (state) => {
    if (state === 'active') transcription.start()
    else if (state === 'idle') transcription.stop()
  }
)
</script>

<template>
  <div class="softphone">
    <!-- Basic call UI from Part 2 -->

    <!-- Transfer controls -->
    <div v-if="sip.callState.value === 'active'" class="advanced-controls">
      <button @click="showTransferDialog = true">Transfer</button>
      <button @click="conference.startConference()">Add Party</button>
    </div>

    <!-- Transfer dialog -->
    <dialog :open="showTransferDialog">
      <h3>Transfer Call</h3>
      <input v-model="transferTarget" placeholder="Extension" />
      <button @click="transfer.blindTransfer(sip.activeCall.value?.id, transferTarget)">
        Blind Transfer
      </button>
      <button @click="transfer.initiateAttendedTransfer(sip.activeCall.value?.id, transferTarget)">
        Attended Transfer
      </button>
      <button @click="showTransferDialog = false">Cancel</button>
    </dialog>

    <!-- Live transcript -->
    <div v-if="transcription.isTranscribing.value" class="transcript">
      <h4>Live Transcript</h4>
      <div v-for="entry in transcription.transcript.value" :key="entry.id">
        <strong>{{ entry.speaker }}:</strong> {{ entry.text }}
      </div>
      <div v-if="transcription.currentUtterance.value" class="current">
        {{ transcription.currentUtterance.value }}...
      </div>
    </div>

    <!-- Conference participants -->
    <div v-if="conference.isConferenceActive.value" class="participants">
      <h4>Conference ({{ conference.participants.value.length }})</h4>
      <div v-for="p in conference.participants.value" :key="p.id">
        {{ p.displayName }}
        <button @click="conference.muteParticipant(p.id)">
          {{ p.isMuted ? 'Unmute' : 'Mute' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

## What You Learned

- `useCallControls()` - Transfer operations
- `useConference()` - Multi-party calls
- `useAmiRecording()` - Call recording (Asterisk)
- `useTranscription()` - Real-time speech-to-text
- Keyword detection - Trigger actions on phrases

## Next Steps

Congratulations! You've completed the VueSIP tutorial. Here's where to go next:

- **[API Reference](/api/)** - Full documentation for all composables
- **[Templates](/guide/templates)** - Production-ready starter projects
- **[Examples](/examples/)** - More complex real-world examples

## Get Help

- **GitHub Issues**: [Report bugs](https://github.com/vuesip/vuesip/issues)
- **Discord**: Join our community (coming soon)
- **Stack Overflow**: Tag `vuesip`

````

**Step 2: Commit**

```bash
git add docs/tutorial/part-4-advanced.md
git commit -m "docs(tutorial): add Part 4 - Advanced Features"
````

---

### Task 9: Update Landing Page

**Files:**

- Modify: `docs/index.md`

**Step 1: Update the landing page hero and quick start**

Read the current landing page first, then update the hero section and add a quick demo section.

Update `docs/index.md` to include:

1. Hero: "SIP calling for Vue.js - works in 5 minutes"
2. Quick code sample using `useSipMock`
3. Clear CTA to tutorial
4. Feature highlights

**Step 2: Build and verify**

Run: `pnpm docs:build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add docs/index.md
git commit -m "docs: update landing page with mock mode quick start"
```

---

## Phase 0.5 Complete Checklist

- [ ] Task 1: Create `useSipMock` core structure
- [ ] Task 2: Add connection tests
- [ ] Task 3: Add call operation tests
- [ ] Task 4: Export from index
- [ ] Task 5: Tutorial Part 1
- [ ] Task 6: Tutorial Part 2
- [ ] Task 7: Tutorial Part 3
- [ ] Task 8: Tutorial Part 4
- [ ] Task 9: Update landing page

---

## Phase 1: Quick Wins & Templates

**Timeline:** Months 2-3

---

### Task 10: Create `useClickToCall` Composable

**Files:**

- Create: `src/composables/useClickToCall.ts`
- Create: `tests/unit/composables/useClickToCall.test.ts`
- Modify: `src/composables/index.ts`

**Step 1: Write failing test**

```typescript
// tests/unit/composables/useClickToCall.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClickToCall } from '@/composables/useClickToCall'

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useClickToCall', () => {
  it('should return widget interface', () => {
    const widget = useClickToCall()

    expect(widget.isVisible).toBeDefined()
    expect(widget.isMinimized).toBeDefined()
    expect(widget.position).toBeDefined()
    expect(widget.show).toBeDefined()
    expect(widget.hide).toBeDefined()
    expect(widget.minimize).toBeDefined()
    expect(widget.call).toBeDefined()
  })

  it('should start hidden by default', () => {
    const widget = useClickToCall()
    expect(widget.isVisible.value).toBe(false)
  })

  it('should show widget', () => {
    const widget = useClickToCall()
    widget.show()
    expect(widget.isVisible.value).toBe(true)
  })

  it('should persist position to localStorage', () => {
    const widget = useClickToCall({
      position: 'bottom-right',
      persistPosition: true,
    })

    widget.setPosition('top-left')

    expect(localStorage.getItem('vuesip-widget-position')).toBe('top-left')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/unit/composables/useClickToCall.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/composables/useClickToCall.ts
/**
 * Click-to-Call Widget Composable
 *
 * Provides an embeddable calling widget for any website.
 *
 * @module composables/useClickToCall
 */

import { ref, computed, onMounted, type Ref, type ComputedRef } from 'vue'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useClickToCall')

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface UseClickToCallOptions {
  /** Initial position */
  position?: WidgetPosition
  /** Default phone number */
  defaultNumber?: string
  /** Persist position in localStorage */
  persistPosition?: boolean
  /** Allow dragging */
  draggable?: boolean
  /** Custom CSS class */
  customClass?: string
  /** Brand color */
  brandColor?: string
}

export interface UseClickToCallReturn {
  // State
  isVisible: Ref<boolean>
  isMinimized: Ref<boolean>
  position: Ref<WidgetPosition>
  phoneNumber: Ref<string>
  callState: Ref<string>

  // Actions
  show: () => void
  hide: () => void
  minimize: () => void
  maximize: () => void
  setPosition: (pos: WidgetPosition) => void
  call: (number?: string) => Promise<void>
  hangup: () => Promise<void>

  // Configuration
  configure: (options: Partial<UseClickToCallOptions>) => void
}

const STORAGE_KEY = 'vuesip-widget-position'

export function useClickToCall(options: UseClickToCallOptions = {}): UseClickToCallReturn {
  // Configuration
  const config = ref({
    position: options.position ?? 'bottom-right',
    defaultNumber: options.defaultNumber ?? '',
    persistPosition: options.persistPosition ?? true,
    draggable: options.draggable ?? true,
    customClass: options.customClass ?? '',
    brandColor: options.brandColor ?? '#4caf50',
  })

  // State
  const isVisible = ref(false)
  const isMinimized = ref(false)
  const position = ref<WidgetPosition>(config.value.position)
  const phoneNumber = ref(config.value.defaultNumber)
  const callState = ref('idle')

  // Load persisted position
  onMounted(() => {
    if (config.value.persistPosition && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(saved)) {
        position.value = saved as WidgetPosition
      }
    }
  })

  // Actions
  function show() {
    logger.info('Showing click-to-call widget')
    isVisible.value = true
    isMinimized.value = false
  }

  function hide() {
    logger.info('Hiding click-to-call widget')
    isVisible.value = false
  }

  function minimize() {
    isMinimized.value = true
  }

  function maximize() {
    isMinimized.value = false
  }

  function setPosition(pos: WidgetPosition) {
    position.value = pos
    if (config.value.persistPosition && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, pos)
    }
  }

  async function call(number?: string) {
    const target = number ?? phoneNumber.value
    if (!target) {
      logger.warn('No phone number provided')
      return
    }

    logger.info(`Initiating click-to-call to ${target}`)
    callState.value = 'calling'

    // In real implementation, this would use useSipClient
    // For now, simulate
    await new Promise((resolve) => setTimeout(resolve, 1000))
    callState.value = 'active'
  }

  async function hangup() {
    logger.info('Ending click-to-call')
    callState.value = 'idle'
  }

  function configure(newOptions: Partial<UseClickToCallOptions>) {
    Object.assign(config.value, newOptions)
  }

  return {
    isVisible,
    isMinimized,
    position,
    phoneNumber,
    callState,
    show,
    hide,
    minimize,
    maximize,
    setPosition,
    call,
    hangup,
    configure,
  }
}
```

**Step 4: Run tests**

Run: `pnpm test:unit tests/unit/composables/useClickToCall.test.ts`
Expected: PASS

**Step 5: Export and commit**

Add to `src/composables/index.ts`:

```typescript
export {
  useClickToCall,
  type UseClickToCallReturn,
  type UseClickToCallOptions,
} from './useClickToCall'
```

```bash
git add src/composables/useClickToCall.ts tests/unit/composables/useClickToCall.test.ts src/composables/index.ts
git commit -m "feat: add useClickToCall widget composable"
```

---

### Task 11: Create PWA Softphone Template

**Files:**

- Create: `templates/pwa-softphone/` directory structure
- Create: `templates/pwa-softphone/package.json`
- Create: `templates/pwa-softphone/vite.config.ts`
- Create: `templates/pwa-softphone/src/App.vue`
- Create: `templates/pwa-softphone/src/sw.ts`

This task creates a complete PWA template with:

- Vite PWA plugin configuration
- Service worker for background notifications
- Installable manifest
- Offline-capable UI

**Step 1: Create package.json**

```json
{
  "name": "@vuesip/pwa-softphone-template",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vuesip": "latest"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "vue-tsc": "^1.8.0"
  }
}
```

**Step 2: Create vite.config.ts with PWA**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'VueSIP Softphone',
        short_name: 'Softphone',
        description: 'Progressive Web App Softphone powered by VueSIP',
        theme_color: '#4caf50',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
```

(Continue with full template implementation...)

**Step 3: Commit**

```bash
git add templates/pwa-softphone/
git commit -m "feat(templates): add PWA softphone template with service worker"
```

---

### Task 12: Create Video Room Template

**Files:**

- Create: `templates/video-room/` directory structure

Creates a template for multi-party video calls using `useConference`.

---

### Task 13: Create IVR Tester Template

**Files:**

- Create: `templates/ivr-tester/` directory structure

Creates a template for testing IVR flows using `useAmiIVR` and `useDTMF`.

---

## Phase 2: Core Power Features

**Timeline:** Months 3-5

---

### Task 14: Create `useAmiOriginate` Composable

**Files:**

- Create: `src/composables/useAmiOriginate.ts`
- Create: `tests/unit/composables/useAmiOriginate.test.ts`

Click-to-call from CRM systems via AMI.

---

### Task 15: Create `useAmiSpy` Composable

**Files:**

- Create: `src/composables/useAmiSpy.ts`
- Create: `tests/unit/composables/useAmiSpy.test.ts`

Supervisor monitor/whisper/barge functionality.

---

### Task 16: Create `useAudioProcessing` Composable

**Files:**

- Create: `src/composables/useAudioProcessing.ts`
- Create: `tests/unit/composables/useAudioProcessing.test.ts`

RNNoise WASM integration for noise suppression.

---

### Task 17: Create Provider Abstraction Layer

**Files:**

- Create: `src/providers/ProviderInterface.ts`
- Create: `src/providers/TelnyxProvider.ts`
- Create: `src/providers/TwilioProvider.ts`

Multi-provider support with consistent API.

---

## Phase 3: AI Differentiators

**Timeline:** Months 5-7

---

### Task 18: Create `useSentiment` Composable

**Files:**

- Create: `src/composables/useSentiment.ts`
- Create: `tests/unit/composables/useSentiment.test.ts`

Real-time sentiment analysis using Transformers.js.

---

### Task 19: Create `useSmartRouting` Composable

**Files:**

- Create: `src/composables/useSmartRouting.ts`
- Create: `tests/unit/composables/useSmartRouting.test.ts`

Intelligent call routing hooks.

---

### Task 20: Create `useCallSummary` Composable

**Files:**

- Create: `src/composables/useCallSummary.ts`
- Create: `tests/unit/composables/useCallSummary.test.ts`

AI-generated call summaries.

---

## Phase 4: Enterprise Features

**Timeline:** Months 7-10

---

### Task 21: Create Enterprise Package Structure

**Files:**

- Create: `packages/enterprise/package.json`
- Create: `packages/enterprise/src/index.ts`

Monorepo structure for `@vuesip/enterprise`.

---

### Task 22: Create CRM Adapter Interface

**Files:**

- Create: `packages/enterprise/src/adapters/CRMAdapter.ts`
- Create: `packages/enterprise/src/adapters/SalesforceAdapter.ts`
- Create: `packages/enterprise/src/adapters/HubSpotAdapter.ts`

---

### Task 23: Create Compliance Suite

**Files:**

- Create: `packages/enterprise/src/compliance/useCompliance.ts`
- Create: `packages/enterprise/src/compliance/PCIMode.ts`
- Create: `packages/enterprise/src/compliance/ConsentManager.ts`

---

### Task 24: Create Analytics Dashboard Components

**Files:**

- Create: `packages/enterprise/src/components/VueSipCallVolume.vue`
- Create: `packages/enterprise/src/components/VueSipAgentPerformance.vue`
- Create: `packages/enterprise/src/components/VueSipSentimentTrends.vue`
- Create: `packages/enterprise/src/components/VueSipQueueHealth.vue`

---

## Verification & Completion

### Final Verification Steps

**Step 1: Run full test suite**

```bash
pnpm test:unit
```

Expected: All tests pass

**Step 2: Build library**

```bash
pnpm build
```

Expected: Build succeeds with no errors

**Step 3: Build documentation**

```bash
pnpm docs:build
```

Expected: Documentation builds successfully

**Step 4: Type check**

```bash
pnpm typecheck
```

Expected: No type errors

**Step 5: Lint**

```bash
pnpm lint
```

Expected: No lint errors

---

## Files Created/Modified Summary

| Phase     | Files Created | Files Modified |
| --------- | ------------- | -------------- |
| 0.5       | 7             | 2              |
| 1         | 15            | 1              |
| 2         | 8             | 1              |
| 3         | 6             | 1              |
| 4         | 12            | 0              |
| **Total** | **48**        | **5**          |

---

## Success Metrics

| Phase | Metric                    | Target              |
| ----- | ------------------------- | ------------------- |
| 0.5   | Tutorial completion rate  | >60% finish Part 1  |
| 0.5   | Time to first call (mock) | <5 minutes          |
| 1     | Template downloads        | 500/month           |
| 1     | GitHub stars              | 500                 |
| 2     | npm weekly downloads      | 1,000               |
| 2     | Production deployments    | 50                  |
| 3     | AI feature usage          | 30% of active users |
| 4     | Pro tier conversions      | 10 paying customers |

---

_This plan prioritizes developer adoption over feature completeness. Revenue comes from enterprises who need compliance - not from gating basic functionality._
