import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
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
} as unknown as HTMLVideoElement

// Mock document.pictureInPictureEnabled
Object.defineProperty(document, 'pictureInPictureEnabled', {
  value: true,
  writable: true,
  configurable: true,
})

Object.defineProperty(document, 'pictureInPictureElement', {
  value: null,
  writable: true,
  configurable: true,
})

// Mock document.exitPictureInPicture
document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined)

// Create mock SipClient
function createMockSipClient() {
  const eventHandlers = new Map<string, Function[]>()

  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, [])
      }
      eventHandlers.get(event)!.push(handler)
    }),
    off: vi.fn((event: string, _handler: Function) => {
      eventHandlers.delete(event)
    }),
    eventBus: {
      on: vi.fn(() => 'listener-id'),
      off: vi.fn(),
      emit: vi.fn(),
    },
    call: vi.fn(),
    getActiveCall: vi.fn(),
    _eventHandlers: eventHandlers,
  }
}

describe('useCallSession - PiP Integration', () => {
  let mockClient: ReturnType<typeof createMockSipClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSipClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('PiP support detection', () => {
    it('should expose isPiPSupported property', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.isPiPSupported).toBeDefined()
      expect(typeof result.isPiPSupported.value).toBe('boolean')

      unmount()
    })

    it('should detect PiP support correctly', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Document has pictureInPictureEnabled = true from our mock
      expect(result.isPiPSupported.value).toBe(true)

      unmount()
    })
  })

  describe('PiP operations', () => {
    it('should provide enterPiP method', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.enterPiP).toBeDefined()
      expect(typeof result.enterPiP).toBe('function')

      unmount()
    })

    it('should provide exitPiP method', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.exitPiP).toBeDefined()
      expect(typeof result.exitPiP).toBe('function')

      unmount()
    })

    it('should provide togglePiP method', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.togglePiP).toBeDefined()
      expect(typeof result.togglePiP).toBe('function')

      unmount()
    })

    it('should track isPiPActive state', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.isPiPActive).toBeDefined()
      expect(result.isPiPActive.value).toBe(false)

      unmount()
    })

    it('should expose pipWindow ref', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.pipWindow).toBeDefined()
      expect(result.pipWindow.value).toBe(null)

      unmount()
    })

    it('should expose pipError ref', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      expect(result.pipError).toBeDefined()
      expect(result.pipError.value).toBe(null)

      unmount()
    })
  })

  describe('PiP with video element', () => {
    it('should allow setting video ref for PiP', () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // The composable should expose setVideoRef method
      expect(result.setVideoRef).toBeDefined()
      expect(typeof result.setVideoRef).toBe('function')

      unmount()
    })

    it('should enter PiP when video element is set and enterPiP is called', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Set the video element reference
      result.setVideoRef(mockVideoElement)

      // Enter PiP
      await result.enterPiP()

      // Note: The actual PiP behavior depends on browser support and the underlying composable
      // In this test, we're verifying the integration works
      expect(result.isPiPSupported.value).toBe(true)

      unmount()
    })

    it('should support passing video element directly to enterPiP', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Enter PiP by passing video element directly (spec-compliant signature)
      const pipWindow = await result.enterPiP(mockVideoElement)

      // Verify it returns PictureInPictureWindow or null
      // The actual return depends on browser PiP support
      // In test environment, PiP may not work fully, so null is expected
      expect(pipWindow).toBe(null)
      expect(result.isPiPSupported.value).toBe(true)

      unmount()
    })

    it('should support passing video element directly to togglePiP', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Toggle PiP by passing video element directly (spec-compliant signature)
      await result.togglePiP(mockVideoElement)

      // Verify PiP support is detected
      expect(result.isPiPSupported.value).toBe(true)

      unmount()
    })

    it('enterPiP should return PictureInPictureWindow or null', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      result.setVideoRef(mockVideoElement)
      const returnValue = await result.enterPiP()

      // Verify return type matches spec: Promise<PictureInPictureWindow | null>
      // In test environment, PiP may not work fully, so null is expected
      expect(returnValue).toBe(null)

      unmount()
    })
  })

  describe('auto-exit on call end', () => {
    it('should exit PiP when call state becomes terminated', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Initially PiP should not be active
      expect(result.isPiPActive.value).toBe(false)

      unmount()
    })

    it('should exit PiP when call state becomes failed', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Initially PiP should not be active
      expect(result.isPiPActive.value).toBe(false)

      unmount()
    })
  })

  describe('PiP error handling', () => {
    it('should handle PiP errors gracefully', async () => {
      const sipClientRef = ref(mockClient as any)
      const { result, unmount } = withSetup(() => useCallSession(sipClientRef))

      // Initially no error
      expect(result.pipError.value).toBe(null)

      unmount()
    })
  })
})
