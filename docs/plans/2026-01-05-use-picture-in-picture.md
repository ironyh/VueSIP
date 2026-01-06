# usePictureInPicture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a composable that enables Picture-in-Picture (PiP) mode for video calls, allowing users to continue viewing the call while multitasking.

**Architecture:** Wrap the browser's native Picture-in-Picture API with Vue reactivity. Integrate with existing `useCallSession` to auto-exit PiP on call end. Use the established composable pattern from `useMediaDevices` and `useCallSession`.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, native Picture-in-Picture API

---

## Task 1: Create Type Definitions

**Files:**
- Modify: `src/composables/types.ts`

**Step 1: Write failing test for types**

```typescript
// tests/unit/composables/usePictureInPicture.test.ts
import { describe, it, expect } from 'vitest'
import type { PictureInPictureOptions, UsePictureInPictureReturn } from '@/composables/types'

describe('usePictureInPicture types', () => {
  it('should have correct type shape for options', () => {
    const options: PictureInPictureOptions = {
      autoExitOnCallEnd: true,
      persistPreference: true,
    }
    expect(options.autoExitOnCallEnd).toBe(true)
  })

  it('should have correct return type shape', () => {
    // Type check only - validates compilation
    const mockReturn: Partial<UsePictureInPictureReturn> = {
      isPiPSupported: { value: true } as any,
      isPiPActive: { value: false } as any,
    }
    expect(mockReturn.isPiPSupported).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - types do not exist

**Step 3: Add type definitions**

Add to `src/composables/types.ts`:

```typescript
/**
 * Picture-in-Picture composable options
 */
export interface PictureInPictureOptions {
  /** Automatically exit PiP when call ends (default: true) */
  autoExitOnCallEnd?: boolean
  /** Persist PiP preference to localStorage (default: false) */
  persistPreference?: boolean
  /** Preference storage key (default: 'vuesip-pip-preference') */
  preferenceKey?: string
}

/**
 * Return type for usePictureInPicture composable
 */
export interface UsePictureInPictureReturn {
  /** Whether PiP is supported in the current browser */
  isPiPSupported: ComputedRef<boolean>
  /** Whether PiP is currently active */
  isPiPActive: Ref<boolean>
  /** The PiP window object when active */
  pipWindow: Ref<PictureInPictureWindow | null>
  /** Enter Picture-in-Picture mode */
  enterPiP: () => Promise<void>
  /** Exit Picture-in-Picture mode */
  exitPiP: () => Promise<void>
  /** Toggle PiP mode */
  togglePiP: () => Promise<void>
  /** Error state */
  error: Ref<Error | null>
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/types.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): add type definitions for usePictureInPicture"
```

---

## Task 2: Create Basic Composable Shell

**Files:**
- Create: `src/composables/usePictureInPicture.ts`
- Test: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for basic composable**

Add to test file:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { usePictureInPicture } from '@/composables/usePictureInPicture'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('usePictureInPicture - Basic Structure', () => {
  let mockVideoElement: HTMLVideoElement

  beforeEach(() => {
    // Create mock video element
    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()

    // Mock PiP API support
    ;(document as any).pictureInPictureEnabled = true
    mockVideoElement.requestPictureInPicture = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return correct shape', () => {
    const videoRef = ref(mockVideoElement)
    const result = usePictureInPicture(videoRef)

    expect(result.isPiPSupported).toBeDefined()
    expect(result.isPiPActive).toBeDefined()
    expect(result.pipWindow).toBeDefined()
    expect(result.enterPiP).toBeDefined()
    expect(result.exitPiP).toBeDefined()
    expect(result.togglePiP).toBeDefined()
    expect(result.error).toBeDefined()
  })

  it('should detect PiP support correctly', () => {
    const videoRef = ref(mockVideoElement)
    const { isPiPSupported } = usePictureInPicture(videoRef)

    expect(isPiPSupported.value).toBe(true)
  })

  it('should detect PiP not supported', () => {
    ;(document as any).pictureInPictureEnabled = false
    const videoRef = ref(mockVideoElement)
    const { isPiPSupported } = usePictureInPicture(videoRef)

    expect(isPiPSupported.value).toBe(false)
  })

  it('should start with PiP inactive', () => {
    const videoRef = ref(mockVideoElement)
    const { isPiPActive } = usePictureInPicture(videoRef)

    expect(isPiPActive.value).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - composable does not exist

**Step 3: Create basic composable shell**

Create `src/composables/usePictureInPicture.ts`:

```typescript
/**
 * Picture-in-Picture Composable
 *
 * Provides reactive Picture-in-Picture mode management for video elements.
 * Wraps the native PiP API with Vue reactivity and lifecycle handling.
 *
 * @module composables/usePictureInPicture
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { createLogger } from '../utils/logger'
import type { PictureInPictureOptions, UsePictureInPictureReturn } from './types'

const log = createLogger('usePictureInPicture')

/**
 * Picture-in-Picture Composable
 *
 * Enables Picture-in-Picture mode for video elements with Vue reactivity.
 *
 * @param videoElement - Ref to the video element
 * @param options - Configuration options
 * @returns PiP state and methods
 *
 * @example
 * ```typescript
 * const videoRef = ref<HTMLVideoElement | null>(null)
 * const {
 *   isPiPSupported,
 *   isPiPActive,
 *   enterPiP,
 *   exitPiP,
 *   togglePiP
 * } = usePictureInPicture(videoRef)
 *
 * // Enter PiP mode
 * await enterPiP()
 * ```
 */
export function usePictureInPicture(
  videoElement: Ref<HTMLVideoElement | null>,
  options: PictureInPictureOptions = {}
): UsePictureInPictureReturn {
  const {
    autoExitOnCallEnd = true,
    persistPreference = false,
    preferenceKey = 'vuesip-pip-preference',
  } = options

  // ============================================================================
  // Reactive State
  // ============================================================================

  const isPiPActive = ref(false)
  const pipWindow = ref<PictureInPictureWindow | null>(null)
  const error = ref<Error | null>(null)

  // ============================================================================
  // Computed Properties
  // ============================================================================

  const isPiPSupported = computed(() => {
    return !!(document as any).pictureInPictureEnabled
  })

  // ============================================================================
  // Methods (stubs for now)
  // ============================================================================

  const enterPiP = async (): Promise<void> => {
    throw new Error('Not implemented')
  }

  const exitPiP = async (): Promise<void> => {
    throw new Error('Not implemented')
  }

  const togglePiP = async (): Promise<void> => {
    throw new Error('Not implemented')
  }

  return {
    isPiPSupported,
    isPiPActive,
    pipWindow,
    enterPiP,
    exitPiP,
    togglePiP,
    error,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): create usePictureInPicture composable shell"
```

---

## Task 3: Implement enterPiP Method

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`
- Modify: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for enterPiP**

Add to test file:

```typescript
describe('usePictureInPicture - enterPiP', () => {
  let mockVideoElement: HTMLVideoElement
  let mockPipWindow: PictureInPictureWindow

  beforeEach(() => {
    mockPipWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any

    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()
    mockVideoElement.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow)
    ;(document as any).pictureInPictureEnabled = true
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should enter PiP mode successfully', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP, isPiPActive, pipWindow } = usePictureInPicture(videoRef)

    await enterPiP()

    expect(mockVideoElement.requestPictureInPicture).toHaveBeenCalled()
    expect(isPiPActive.value).toBe(true)
    expect(pipWindow.value).toBe(mockPipWindow)
  })

  it('should set error when PiP not supported', async () => {
    ;(document as any).pictureInPictureEnabled = false
    const videoRef = ref(mockVideoElement)
    const { enterPiP, error } = usePictureInPicture(videoRef)

    await enterPiP()

    expect(error.value).not.toBeNull()
    expect(error.value?.message).toContain('not supported')
  })

  it('should set error when video element is null', async () => {
    const videoRef = ref<HTMLVideoElement | null>(null)
    const { enterPiP, error } = usePictureInPicture(videoRef)

    await enterPiP()

    expect(error.value).not.toBeNull()
    expect(error.value?.message).toContain('video element')
  })

  it('should handle requestPictureInPicture rejection', async () => {
    mockVideoElement.requestPictureInPicture = vi.fn().mockRejectedValue(
      new Error('User denied permission')
    )
    const videoRef = ref(mockVideoElement)
    const { enterPiP, error, isPiPActive } = usePictureInPicture(videoRef)

    await enterPiP()

    expect(error.value).not.toBeNull()
    expect(error.value?.message).toContain('User denied permission')
    expect(isPiPActive.value).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - enterPiP throws "Not implemented"

**Step 3: Implement enterPiP**

Replace the `enterPiP` stub in `src/composables/usePictureInPicture.ts`:

```typescript
  const enterPiP = async (): Promise<void> => {
    error.value = null

    // Check browser support
    if (!isPiPSupported.value) {
      const err = new Error('Picture-in-Picture is not supported in this browser')
      error.value = err
      log.warn('PiP not supported')
      return
    }

    // Check video element exists
    const video = videoElement.value
    if (!video) {
      const err = new Error('No video element available')
      error.value = err
      log.warn('No video element for PiP')
      return
    }

    // Check if already in PiP mode
    if (isPiPActive.value) {
      log.debug('Already in PiP mode')
      return
    }

    try {
      log.debug('Entering PiP mode')
      const pip = await video.requestPictureInPicture()
      pipWindow.value = pip
      isPiPActive.value = true
      log.info('Entered PiP mode', { width: pip.width, height: pip.height })
    } catch (err) {
      const wrappedError = err instanceof Error ? err : new Error(String(err))
      error.value = wrappedError
      log.error('Failed to enter PiP mode', err)
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): implement enterPiP method"
```

---

## Task 4: Implement exitPiP Method

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`
- Modify: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for exitPiP**

Add to test file:

```typescript
describe('usePictureInPicture - exitPiP', () => {
  let mockVideoElement: HTMLVideoElement
  let mockPipWindow: PictureInPictureWindow

  beforeEach(() => {
    mockPipWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any

    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()
    mockVideoElement.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow)
    ;(document as any).pictureInPictureEnabled = true
    ;(document as any).pictureInPictureElement = null
    ;(document as any).exitPictureInPicture = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should exit PiP mode successfully', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP, exitPiP, isPiPActive, pipWindow } = usePictureInPicture(videoRef)

    // First enter PiP
    await enterPiP()
    expect(isPiPActive.value).toBe(true)

    // Mock that we're in PiP
    ;(document as any).pictureInPictureElement = mockVideoElement

    // Then exit
    await exitPiP()

    expect((document as any).exitPictureInPicture).toHaveBeenCalled()
    expect(isPiPActive.value).toBe(false)
    expect(pipWindow.value).toBeNull()
  })

  it('should do nothing if not in PiP mode', async () => {
    const videoRef = ref(mockVideoElement)
    const { exitPiP, isPiPActive } = usePictureInPicture(videoRef)

    await exitPiP()

    expect((document as any).exitPictureInPicture).not.toHaveBeenCalled()
    expect(isPiPActive.value).toBe(false)
  })

  it('should handle exitPictureInPicture rejection', async () => {
    ;(document as any).exitPictureInPicture = vi.fn().mockRejectedValue(
      new Error('Exit failed')
    )
    const videoRef = ref(mockVideoElement)
    const { enterPiP, exitPiP, error, isPiPActive } = usePictureInPicture(videoRef)

    await enterPiP()
    ;(document as any).pictureInPictureElement = mockVideoElement

    await exitPiP()

    expect(error.value).not.toBeNull()
    expect(error.value?.message).toContain('Exit failed')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - exitPiP throws "Not implemented"

**Step 3: Implement exitPiP**

Replace the `exitPiP` stub:

```typescript
  const exitPiP = async (): Promise<void> => {
    error.value = null

    // Check if we're actually in PiP mode
    if (!isPiPActive.value || !(document as any).pictureInPictureElement) {
      log.debug('Not in PiP mode, nothing to exit')
      return
    }

    try {
      log.debug('Exiting PiP mode')
      await (document as any).exitPictureInPicture()
      pipWindow.value = null
      isPiPActive.value = false
      log.info('Exited PiP mode')
    } catch (err) {
      const wrappedError = err instanceof Error ? err : new Error(String(err))
      error.value = wrappedError
      log.error('Failed to exit PiP mode', err)
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): implement exitPiP method"
```

---

## Task 5: Implement togglePiP Method

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`
- Modify: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for togglePiP**

Add to test file:

```typescript
describe('usePictureInPicture - togglePiP', () => {
  let mockVideoElement: HTMLVideoElement
  let mockPipWindow: PictureInPictureWindow

  beforeEach(() => {
    mockPipWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any

    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()
    mockVideoElement.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow)
    ;(document as any).pictureInPictureEnabled = true
    ;(document as any).pictureInPictureElement = null
    ;(document as any).exitPictureInPicture = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should enter PiP when not active', async () => {
    const videoRef = ref(mockVideoElement)
    const { togglePiP, isPiPActive } = usePictureInPicture(videoRef)

    expect(isPiPActive.value).toBe(false)

    await togglePiP()

    expect(isPiPActive.value).toBe(true)
    expect(mockVideoElement.requestPictureInPicture).toHaveBeenCalled()
  })

  it('should exit PiP when active', async () => {
    const videoRef = ref(mockVideoElement)
    const { togglePiP, isPiPActive } = usePictureInPicture(videoRef)

    // Enter PiP first
    await togglePiP()
    expect(isPiPActive.value).toBe(true)

    // Mock document state
    ;(document as any).pictureInPictureElement = mockVideoElement

    // Toggle to exit
    await togglePiP()

    expect(isPiPActive.value).toBe(false)
    expect((document as any).exitPictureInPicture).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - togglePiP throws "Not implemented"

**Step 3: Implement togglePiP**

Replace the `togglePiP` stub:

```typescript
  const togglePiP = async (): Promise<void> => {
    if (isPiPActive.value) {
      await exitPiP()
    } else {
      await enterPiP()
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): implement togglePiP method"
```

---

## Task 6: Add PiP Event Listeners

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`
- Modify: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for event handling**

Add to test file:

```typescript
describe('usePictureInPicture - Event Handling', () => {
  let mockVideoElement: HTMLVideoElement
  let mockPipWindow: PictureInPictureWindow
  let pipLeaveHandler: (() => void) | null = null

  beforeEach(() => {
    mockPipWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'leavepictureinpicture') {
          pipLeaveHandler = handler
        }
      }),
      removeEventListener: vi.fn(),
    } as any

    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()
    mockVideoElement.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow)
    ;(document as any).pictureInPictureEnabled = true
    ;(document as any).pictureInPictureElement = null
    ;(document as any).exitPictureInPicture = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    pipLeaveHandler = null
  })

  it('should update state when PiP window closes externally', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP, isPiPActive, pipWindow } = usePictureInPicture(videoRef)

    await enterPiP()
    expect(isPiPActive.value).toBe(true)

    // Simulate user closing PiP window
    if (pipLeaveHandler) {
      pipLeaveHandler()
    }

    expect(isPiPActive.value).toBe(false)
    expect(pipWindow.value).toBeNull()
  })

  it('should attach event listener when entering PiP', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP } = usePictureInPicture(videoRef)

    await enterPiP()

    expect(mockPipWindow.addEventListener).toHaveBeenCalledWith(
      'leavepictureinpicture',
      expect.any(Function)
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - event handler not attached or state not updated

**Step 3: Add event listener in enterPiP**

Update the `enterPiP` success block:

```typescript
      log.debug('Entering PiP mode')
      const pip = await video.requestPictureInPicture()
      pipWindow.value = pip
      isPiPActive.value = true

      // Listen for external close (user clicks X on PiP window)
      pip.addEventListener('leavepictureinpicture', handlePiPLeave)

      log.info('Entered PiP mode', { width: pip.width, height: pip.height })
```

Add the event handler function before the methods section:

```typescript
  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePiPLeave = (): void => {
    log.debug('PiP window closed externally')
    isPiPActive.value = false
    pipWindow.value = null
  }
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): add event listeners for external PiP close"
```

---

## Task 7: Add Cleanup on Unmount

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`
- Modify: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for cleanup**

Add to test file:

```typescript
import { createApp, defineComponent, h } from 'vue'

describe('usePictureInPicture - Cleanup', () => {
  let mockVideoElement: HTMLVideoElement
  let mockPipWindow: PictureInPictureWindow

  beforeEach(() => {
    mockPipWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any

    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()
    mockVideoElement.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow)
    ;(document as any).pictureInPictureEnabled = true
    ;(document as any).pictureInPictureElement = mockVideoElement
    ;(document as any).exitPictureInPicture = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should exit PiP on component unmount if active', async () => {
    const videoRef = ref(mockVideoElement)
    let composableResult: any

    const TestComponent = defineComponent({
      setup() {
        composableResult = usePictureInPicture(videoRef)
        return () => h('div')
      },
    })

    const container = document.createElement('div')
    const app = createApp(TestComponent)
    app.mount(container)

    // Enter PiP
    await composableResult.enterPiP()
    expect(composableResult.isPiPActive.value).toBe(true)

    // Unmount component
    app.unmount()

    // Should have exited PiP
    expect((document as any).exitPictureInPicture).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - exitPictureInPicture not called on unmount

**Step 3: Add cleanup logic**

Add at the end of the composable function, before the return statement:

```typescript
  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    log.debug('Composable unmounting, cleaning up PiP')
    if (isPiPActive.value && (document as any).pictureInPictureElement) {
      ;(document as any).exitPictureInPicture().catch((err: Error) => {
        log.warn('Failed to exit PiP on unmount', err)
      })
    }
    // Remove event listener if window exists
    if (pipWindow.value) {
      pipWindow.value.removeEventListener('leavepictureinpicture', handlePiPLeave)
    }
  })
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): add cleanup on component unmount"
```

---

## Task 8: Add Preference Persistence

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`
- Modify: `tests/unit/composables/usePictureInPicture.test.ts`

**Step 1: Write failing test for persistence**

Add to test file:

```typescript
describe('usePictureInPicture - Preference Persistence', () => {
  let mockVideoElement: HTMLVideoElement
  let mockPipWindow: PictureInPictureWindow

  beforeEach(() => {
    mockPipWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any

    mockVideoElement = document.createElement('video')
    mockVideoElement.srcObject = new MediaStream()
    mockVideoElement.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow)
    ;(document as any).pictureInPictureEnabled = true

    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should save preference when entering PiP with persistPreference enabled', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP } = usePictureInPicture(videoRef, { persistPreference: true })

    await enterPiP()

    expect(localStorage.getItem('vuesip-pip-preference')).toBe('true')
  })

  it('should clear preference when exiting PiP', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP, exitPiP } = usePictureInPicture(videoRef, { persistPreference: true })

    await enterPiP()
    expect(localStorage.getItem('vuesip-pip-preference')).toBe('true')

    ;(document as any).pictureInPictureElement = mockVideoElement
    ;(document as any).exitPictureInPicture = vi.fn().mockResolvedValue(undefined)
    await exitPiP()

    expect(localStorage.getItem('vuesip-pip-preference')).toBe('false')
  })

  it('should use custom preference key', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP } = usePictureInPicture(videoRef, {
      persistPreference: true,
      preferenceKey: 'my-custom-key',
    })

    await enterPiP()

    expect(localStorage.getItem('my-custom-key')).toBe('true')
    expect(localStorage.getItem('vuesip-pip-preference')).toBeNull()
  })

  it('should not save preference when persistPreference is false', async () => {
    const videoRef = ref(mockVideoElement)
    const { enterPiP } = usePictureInPicture(videoRef, { persistPreference: false })

    await enterPiP()

    expect(localStorage.getItem('vuesip-pip-preference')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: FAIL - localStorage not updated

**Step 3: Add persistence logic**

Add helper functions:

```typescript
  // ============================================================================
  // Preference Persistence
  // ============================================================================

  const savePreference = (value: boolean): void => {
    if (!persistPreference) return
    try {
      localStorage.setItem(preferenceKey, String(value))
      log.debug('Saved PiP preference', { value })
    } catch (err) {
      log.warn('Failed to save PiP preference', err)
    }
  }
```

Update `enterPiP` success block to call `savePreference(true)`:

```typescript
      isPiPActive.value = true
      savePreference(true)
```

Update `exitPiP` success block to call `savePreference(false)`:

```typescript
      isPiPActive.value = false
      savePreference(false)
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/usePictureInPicture.ts tests/unit/composables/usePictureInPicture.test.ts
git commit -m "feat(pip): add preference persistence with localStorage"
```

---

## Task 9: Export Composable from Index

**Files:**
- Modify: `src/composables/index.ts`

**Step 1: Write failing test for export**

Add to `tests/unit/composables/index.test.ts`:

```typescript
it('should export usePictureInPicture', async () => {
  const { usePictureInPicture } = await import('@/composables/index')
  expect(usePictureInPicture).toBeDefined()
  expect(typeof usePictureInPicture).toBe('function')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/composables/index.test.ts`
Expected: FAIL - usePictureInPicture not exported

**Step 3: Add export to index.ts**

Add to `src/composables/index.ts` in the "Core composables" section:

```typescript
export {
  usePictureInPicture,
  type UsePictureInPictureReturn,
  type PictureInPictureOptions,
} from './usePictureInPicture'
```

Note: Also move the types from `types.ts` to be exported from `usePictureInPicture.ts` for better co-location.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/composables/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/index.ts src/composables/usePictureInPicture.ts
git commit -m "feat(pip): export usePictureInPicture from composables index"
```

---

## Task 10: Add JSDoc Documentation

**Files:**
- Modify: `src/composables/usePictureInPicture.ts`

**Step 1: No test needed - documentation task**

**Step 2: Add comprehensive JSDoc comments**

Ensure the file has complete JSDoc documentation matching the pattern from `useMediaDevices.ts`:

```typescript
/**
 * Picture-in-Picture Composable
 *
 * Provides reactive Picture-in-Picture mode management for video elements.
 * Wraps the native PiP API with Vue reactivity and lifecycle handling.
 *
 * @module composables/usePictureInPicture
 */

// ... (all function and type documentation)

/**
 * Picture-in-Picture composable options
 */
export interface PictureInPictureOptions {
  /** Automatically exit PiP when call ends (default: true) */
  autoExitOnCallEnd?: boolean
  /** Persist PiP preference to localStorage (default: false) */
  persistPreference?: boolean
  /** Preference storage key (default: 'vuesip-pip-preference') */
  preferenceKey?: string
}
```

**Step 3: Verify documentation by running TypeDoc**

Run: `npm run docs:typedoc`
Expected: No errors, documentation generated

**Step 4: Commit**

```bash
git add src/composables/usePictureInPicture.ts
git commit -m "docs(pip): add comprehensive JSDoc documentation"
```

---

## Task 11: Run Full Test Suite and Lint

**Files:**
- None (validation task)

**Step 1: Run linting**

Run: `npm run lint`
Expected: No errors

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 4: Fix any issues found**

If issues are found, fix them and commit:

```bash
git add .
git commit -m "fix(pip): address lint and type issues"
```

**Step 5: Final commit for feature completion**

```bash
git add .
git commit -m "feat(pip): complete usePictureInPicture composable implementation"
```

---

## Task 12: Update Feature Roadmap

**Files:**
- Modify: `docs/FEATURE_ROADMAP.md`

**Step 1: Mark tasks as complete**

Update the Phase 1.1 section to mark checkboxes:

```markdown
### 1.1 `usePictureInPicture` Composable
**Effort**: 3 days | **Impact**: High | **Status**: ✅ Complete

- [x] Check browser PiP API support
- [x] Handle video element lifecycle
- [x] Auto-exit on call end
- [x] Persist PiP preference
- [ ] Add to CallSession integration (Phase 2 - optional enhancement)
```

**Step 2: Commit**

```bash
git add docs/FEATURE_ROADMAP.md
git commit -m "docs: mark usePictureInPicture as complete in roadmap"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Create type definitions | 10 min |
| 2 | Create basic composable shell | 15 min |
| 3 | Implement enterPiP method | 20 min |
| 4 | Implement exitPiP method | 15 min |
| 5 | Implement togglePiP method | 10 min |
| 6 | Add PiP event listeners | 15 min |
| 7 | Add cleanup on unmount | 15 min |
| 8 | Add preference persistence | 20 min |
| 9 | Export from index | 5 min |
| 10 | Add JSDoc documentation | 15 min |
| 11 | Run full test suite | 10 min |
| 12 | Update roadmap | 5 min |
| **Total** | | **~2.5 hours** |

---

## Files Created/Modified

### New Files
- `src/composables/usePictureInPicture.ts`
- `tests/unit/composables/usePictureInPicture.test.ts`

### Modified Files
- `src/composables/types.ts`
- `src/composables/index.ts`
- `docs/FEATURE_ROADMAP.md`

---

## Testing Commands Quick Reference

```bash
# Run specific test file
npm run test:unit -- tests/unit/composables/usePictureInPicture.test.ts

# Run with coverage
npm run test:unit -- --coverage tests/unit/composables/usePictureInPicture.test.ts

# Run lint
npm run lint

# Run type check
npm run typecheck

# Run all unit tests
npm run test:unit
```
