/**
 * useSipSecondLine composable unit tests
 *
 * Tests multi-line SIP call management functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, ref } from 'vue'
import { useSipSecondLine } from '@/composables/useSipSecondLine'
import { callStore } from '@/stores/callStore'
import type { SipClient } from '@/core/SipClient'
import type { MediaManager } from '@/core/MediaManager'
import type { LineConfig } from '@/types/multiline.types'

// Helper to wrap composable in proper Vue context
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result: T
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    },
  })
  app.mount(document.createElement('div'))
  return { result: result!, unmount: () => app.unmount() }
}

// Mock callStore
vi.mock('@/stores/callStore', () => ({
  callStore: {
    addActiveCall: vi.fn(),
    removeActiveCall: vi.fn(),
    getCall: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useSipSecondLine', () => {
   
  let mockSipClient: any
   
  let mockMediaManager: any
   
  let mockSession: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock session
    mockSession = {
      id: 'call-123',
      state: 'active',
      direction: 'outgoing',
      remoteUri: { toString: () => 'sip:bob@example.com' },
      remoteDisplayName: 'Bob',
      isOnHold: false,
      isMuted: false,
      hasLocalVideo: false,
      hasRemoteVideo: false,
      terminationCause: null,
      on: vi.fn(),
      answer: vi.fn().mockResolvedValue(undefined),
      reject: vi.fn().mockResolvedValue(undefined),
      hangup: vi.fn().mockResolvedValue(undefined),
      hold: vi.fn().mockResolvedValue(undefined),
      unhold: vi.fn().mockResolvedValue(undefined),
      mute: vi.fn(),
      unmute: vi.fn(),
      sendDTMF: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({ rtt: 50 }),
    }

    // Create mock SipClient
    mockSipClient = {
      call: vi.fn().mockResolvedValue(mockSession),
      on: vi.fn(),
      off: vi.fn(),
    }

    // Create mock MediaManager
    const mockStream = {
      id: 'mock-stream',
      active: true,
      getTracks: vi.fn().mockReturnValue([]),
    }
    mockMediaManager = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    }

    // Configure callStore mock
    vi.mocked(callStore.getCall).mockReturnValue(mockSession)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default 2 lines', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      expect(result.lines.value).toHaveLength(2)
      expect(result.lines.value[0].lineNumber).toBe(1)
      expect(result.lines.value[1].lineNumber).toBe(2)
      expect(result.selectedLine.value).toBe(1)

      unmount()
    })

    it('should initialize with custom line count', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 4 })
      )

      expect(result.lines.value).toHaveLength(4)
      expect(result.lines.value[3].lineNumber).toBe(4)

      unmount()
    })

    it('should clamp line count to maximum 8', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 20 })
      )

      expect(result.lines.value).toHaveLength(8)

      unmount()
    })

    it('should clamp line count to minimum 1', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 0 })
      )

      expect(result.lines.value).toHaveLength(1)

      unmount()
    })

    it('should initialize all lines as idle', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      for (const line of result.lines.value) {
        expect(line.status).toBe('idle')
        expect(line.callId).toBeNull()
        expect(line.isOnHold).toBe(false)
        expect(line.isMuted).toBe(false)
      }

      unmount()
    })

    it('should apply custom line configurations', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const customConfigs: Partial<LineConfig>[] = [
        { label: 'Main Line', autoAnswer: true },
        { label: 'Secondary', defaultVideo: true },
      ]

      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineConfigs: customConfigs })
      )

      expect(result.lines.value[0].config.label).toBe('Main Line')
      expect(result.lines.value[0].config.autoAnswer).toBe(true)
      expect(result.lines.value[1].config.label).toBe('Secondary')
      expect(result.lines.value[1].config.defaultVideo).toBe(true)

      unmount()
    })
  })

  describe('computed properties', () => {
    it('should compute activeCallCount correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      expect(result.activeCallCount.value).toBe(0)

      // Simulate active call on line 1
      result.lines.value[0].status = 'active'
      expect(result.activeCallCount.value).toBe(1)

      // Simulate held call on line 2
      result.lines.value[1].status = 'held'
      expect(result.activeCallCount.value).toBe(2)

      unmount()
    })

    it('should compute incomingCallCount correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      expect(result.incomingCallCount.value).toBe(0)

      result.lines.value[0].status = 'ringing'
      expect(result.incomingCallCount.value).toBe(1)

      result.lines.value[1].status = 'ringing'
      expect(result.incomingCallCount.value).toBe(2)

      unmount()
    })

    it('should compute allLinesBusy correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 2 })
      )

      expect(result.allLinesBusy.value).toBe(false)

      result.lines.value[0].status = 'active'
      expect(result.allLinesBusy.value).toBe(false)

      result.lines.value[1].status = 'held'
      expect(result.allLinesBusy.value).toBe(true)

      unmount()
    })

    it('should compute availableLines correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      expect(result.availableLines.value).toHaveLength(3)

      result.lines.value[0].status = 'active'
      expect(result.availableLines.value).toHaveLength(2)

      result.lines.value[1].config.enabled = false
      expect(result.availableLines.value).toHaveLength(1)

      unmount()
    })

    it('should compute selectedLineState correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      expect(result.selectedLineState.value?.lineNumber).toBe(1)

      result.selectLine(2)
      expect(result.selectedLineState.value?.lineNumber).toBe(2)

      unmount()
    })

    it('should compute activeLines correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      expect(result.activeLines.value).toHaveLength(0)

      result.lines.value[0].status = 'active'
      result.lines.value[1].status = 'held'
      expect(result.activeLines.value).toHaveLength(1)
      expect(result.activeLines.value[0].lineNumber).toBe(1)

      unmount()
    })

    it('should compute ringingLines correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      expect(result.ringingLines.value).toHaveLength(0)

      result.lines.value[1].status = 'ringing'
      expect(result.ringingLines.value).toHaveLength(1)
      expect(result.ringingLines.value[0].lineNumber).toBe(2)

      unmount()
    })

    it('should compute heldLines correctly', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      expect(result.heldLines.value).toHaveLength(0)

      result.lines.value[0].status = 'held'
      result.lines.value[2].status = 'held'
      expect(result.heldLines.value).toHaveLength(2)

      unmount()
    })
  })

  describe('line selection', () => {
    it('should select a valid line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 4 })
      )

      result.selectLine(3)
      expect(result.selectedLine.value).toBe(3)

      unmount()
    })

    it('should not change line for invalid line number', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 2 })
      )

      result.selectLine(5)
      expect(result.selectedLine.value).toBe(1) // Still 1

      result.selectLine(0)
      expect(result.selectedLine.value).toBe(1)

      result.selectLine(-1)
      expect(result.selectedLine.value).toBe(1)

      unmount()
    })

    it('should select next available line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      result.lines.value[0].status = 'active'
      const available = result.selectNextAvailable()
      expect(available).toBe(2)
      expect(result.selectedLine.value).toBe(2)

      unmount()
    })

    it('should return null when no lines available', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 2 })
      )

      result.lines.value[0].status = 'active'
      result.lines.value[1].status = 'held'

      const available = result.selectNextAvailable()
      expect(available).toBeNull()

      unmount()
    })

    it('should select ringing line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      result.lines.value[1].status = 'ringing'
      const ringing = result.selectRingingLine()
      expect(ringing).toBe(2)
      expect(result.selectedLine.value).toBe(2)

      unmount()
    })

    it('should return null when no ringing lines', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      const ringing = result.selectRingingLine()
      expect(ringing).toBeNull()

      unmount()
    })

    it('should emit selection change event', () => {
      const onSelectionChange = vi.fn()
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { onSelectionChange })
      )

      result.selectLine(2)
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'selectionChange',
          previousLine: 1,
          newLine: 2,
        })
      )

      unmount()
    })
  })

  describe('makeCall', () => {
    it('should make call on auto-selected line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      const lineNum = await result.makeCall('sip:bob@example.com')

      expect(lineNum).toBe(1)
      expect(mockSipClient.call).toHaveBeenCalledWith('sip:bob@example.com', expect.any(Object))
      expect(callStore.addActiveCall).toHaveBeenCalled()

      unmount()
    })

    it('should make call on specified line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      const lineNum = await result.makeCall('sip:bob@example.com', { lineNumber: 2 })

      expect(lineNum).toBe(2)
      expect(result.selectedLine.value).toBe(2)

      unmount()
    })

    it('should throw error when no lines available', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 1 })
      )

      result.lines.value[0].status = 'active'

      await expect(result.makeCall('sip:bob@example.com')).rejects.toThrow('No available lines')

      unmount()
    })

    it('should throw error when line is not available', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'

      await expect(result.makeCall('sip:bob@example.com', { lineNumber: 1 })).rejects.toThrow(
        'Line 1 is not available'
      )

      unmount()
    })

    it('should throw error for invalid target', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.makeCall('<script>alert(1)</script>')).rejects.toThrow('Invalid target')

      unmount()
    })

    it('should throw error when sip client not connected', async () => {
      const sipClientRef = ref(null as SipClient | null)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.makeCall('sip:bob@example.com')).rejects.toThrow('SIP client not connected')

      unmount()
    })

    it('should throw error when max concurrent calls reached', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3, maxConcurrentCalls: 2 })
      )

      result.lines.value[0].status = 'active'
      result.lines.value[1].status = 'held'

      await expect(result.makeCall('sip:bob@example.com', { lineNumber: 3 })).rejects.toThrow(
        'Maximum concurrent calls (2) reached'
      )

      unmount()
    })

    it('should use media manager when provided', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const mediaManagerRef = ref(mockMediaManager as MediaManager)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, mediaManagerRef)
      )

      await result.makeCall('sip:bob@example.com', { audio: true, video: true })

      expect(mockMediaManager.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true })

      unmount()
    })
  })

  describe('answerCall', () => {
    it('should throw error for non-ringing line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.answerCall(1)).rejects.toThrow('Line 1 has no incoming call')

      unmount()
    })

    it('should throw error for invalid line number', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.answerCall(5)).rejects.toThrow('Invalid line number')

      unmount()
    })

    it('should throw error when sip client not connected', async () => {
      const sipClientRef = ref(null as SipClient | null)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'ringing'
      result.lines.value[0].callId = 'call-123'

      await expect(result.answerCall(1)).rejects.toThrow('SIP client not connected')

      unmount()
    })
  })

  describe('rejectCall', () => {
    it('should reject incoming call', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'ringing'
      result.lines.value[0].callId = 'call-123'

      await result.rejectCall(1, 486)

      expect(mockSession.reject).toHaveBeenCalledWith(486)
      expect(result.lines.value[0].status).toBe('idle')
      expect(result.lines.value[0].callId).toBeNull()

      unmount()
    })

    it('should throw error for non-ringing line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.rejectCall(1)).rejects.toThrow('Line 1 has no incoming call')

      unmount()
    })
  })

  describe('hangupCall', () => {
    it('should hangup active call', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await result.hangupCall(1)

      expect(mockSession.hangup).toHaveBeenCalled()
      expect(callStore.removeActiveCall).toHaveBeenCalledWith('call-123')
      expect(result.lines.value[0].status).toBe('idle')

      unmount()
    })

    it('should do nothing for idle line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await result.hangupCall(1)

      expect(mockSession.hangup).not.toHaveBeenCalled()

      unmount()
    })

    it('should throw error for invalid line number', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.hangupCall(10)).rejects.toThrow('Invalid line number')

      unmount()
    })
  })

  describe('hangupAll', () => {
    it('should hangup all active calls', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3 })
      )

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-1'
      result.lines.value[1].status = 'held'
      result.lines.value[1].callId = 'call-2'

      await result.hangupAll()

      expect(result.lines.value[0].status).toBe('idle')
      expect(result.lines.value[1].status).toBe('idle')
      expect(result.lines.value[2].status).toBe('idle')

      unmount()
    })
  })

  describe('hold/unhold', () => {
    it('should hold active line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await result.holdLine(1)

      expect(mockSession.hold).toHaveBeenCalled()
      expect(result.lines.value[0].status).toBe('held')
      expect(result.lines.value[0].isOnHold).toBe(true)

      unmount()
    })

    it('should unhold held line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'held'
      result.lines.value[0].isOnHold = true
      result.lines.value[0].callId = 'call-123'

      await result.unholdLine(1)

      expect(mockSession.unhold).toHaveBeenCalled()
      expect(result.lines.value[0].status).toBe('active')
      expect(result.lines.value[0].isOnHold).toBe(false)

      unmount()
    })

    it('should toggle hold state', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await result.toggleHoldLine(1)
      expect(result.lines.value[0].isOnHold).toBe(true)

      unmount()
    })

    it('should do nothing when holding non-active line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await result.holdLine(1)

      expect(mockSession.hold).not.toHaveBeenCalled()

      unmount()
    })
  })

  describe('mute/unmute', () => {
    it('should mute line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      result.muteLine(1)

      expect(mockSession.mute).toHaveBeenCalled()
      expect(result.lines.value[0].isMuted).toBe(true)

      unmount()
    })

    it('should unmute line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'
      result.lines.value[0].isMuted = true

      result.unmuteLine(1)

      expect(mockSession.unmute).toHaveBeenCalled()
      expect(result.lines.value[0].isMuted).toBe(false)

      unmount()
    })

    it('should toggle mute state', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      result.toggleMuteLine(1)
      expect(result.lines.value[0].isMuted).toBe(true)

      result.toggleMuteLine(1)
      expect(result.lines.value[0].isMuted).toBe(false)

      unmount()
    })
  })

  describe('sendDTMF', () => {
    it('should send DTMF tone', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await result.sendDTMF(1, '5')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5')

      unmount()
    })

    it('should throw error for inactive line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.sendDTMF(1, '5')).rejects.toThrow('No active call on line')

      unmount()
    })
  })

  describe('swapLines', () => {
    it('should swap active and held lines', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-1'
      result.lines.value[1].status = 'held'
      result.lines.value[1].isOnHold = true
      result.lines.value[1].callId = 'call-2'

      await result.swapLines(1, 2)

      expect(result.lines.value[0].status).toBe('held')
      expect(result.lines.value[1].status).toBe('active')
      expect(result.selectedLine.value).toBe(2)

      unmount()
    })

    it('should throw error for invalid line numbers', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.swapLines(10, 1)).rejects.toThrow('Invalid line numbers')

      unmount()
    })
  })

  describe('transferCall', () => {
    it('should transfer call to external target', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await result.transferCall({
        fromLine: 1,
        target: 'sip:transfer@example.com',
        attended: false,
      })

      // Transfer completes by hanging up source line
      expect(result.lines.value[0].status).toBe('idle')

      unmount()
    })

    it('should throw error for invalid source line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(
        result.transferCall({ fromLine: 10, target: 'sip:bob@example.com' })
      ).rejects.toThrow('Invalid source line')

      unmount()
    })

    it('should throw error for invalid target', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await expect(
        result.transferCall({ fromLine: 1, target: '<script>alert(1)</script>' })
      ).rejects.toThrow('Invalid transfer target')

      unmount()
    })
  })

  describe('mergeLines', () => {
    it('should throw not implemented error', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      await expect(result.mergeLines({ lines: [1, 2] })).rejects.toThrow(
        'Line merge/conference not implemented'
      )

      unmount()
    })
  })

  describe('parkCall', () => {
    it('should throw not implemented error', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      await expect(result.parkCall(1)).rejects.toThrow('Call parking not implemented')

      unmount()
    })
  })

  describe('utility methods', () => {
    it('should get line state by number', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      const lineState = result.getLineState(1)
      expect(lineState?.lineNumber).toBe(1)

      const invalidLine = result.getLineState(10)
      expect(invalidLine).toBeNull()

      unmount()
    })

    it('should check if line is available', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      expect(result.isLineAvailable(1)).toBe(true)

      result.lines.value[0].status = 'active'
      expect(result.isLineAvailable(1)).toBe(false)

      expect(result.isLineAvailable(10)).toBe(false)

      unmount()
    })

    it('should configure line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.configureLine(1, { label: 'VIP Line', autoAnswer: true })

      expect(result.lines.value[0].config.label).toBe('VIP Line')
      expect(result.lines.value[0].config.autoAnswer).toBe(true)
      expect(result.lines.value[0].config.lineNumber).toBe(1) // Preserved

      unmount()
    })

    it('should reset single line', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'
      result.lines.value[0].duration = 120

      result.resetLine(1)

      expect(result.lines.value[0].status).toBe('idle')
      expect(result.lines.value[0].callId).toBeNull()
      expect(result.lines.value[0].duration).toBe(0)

      unmount()
    })

    it('should reset all lines', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-1'
      result.lines.value[1].status = 'held'
      result.lines.value[1].callId = 'call-2'

      result.resetAllLines()

      expect(result.lines.value[0].status).toBe('idle')
      expect(result.lines.value[1].status).toBe('idle')
      expect(result.lines.value[0].callId).toBeNull()
      expect(result.lines.value[1].callId).toBeNull()

      unmount()
    })

    it('should get line stats', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      const stats = await result.getLineStats(1)
      expect(stats).toEqual({ rtt: 50 })

      unmount()
    })

    it('should return null stats for invalid line', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      const stats = await result.getLineStats(10)
      expect(stats).toBeNull()

      unmount()
    })
  })

  describe('event callbacks', () => {
    it('should call onLineStateChange callback', async () => {
      const onLineStateChange = vi.fn()
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { onLineStateChange })
      )

      // Trigger a state change by making a call
      await result.makeCall('sip:bob@example.com')

      expect(onLineStateChange).toHaveBeenCalled()
      expect(onLineStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'stateChange', lineNumber: 1 })
      )

      unmount()
    })
  })

  describe('auto-hold on new call', () => {
    it('should auto-hold other lines when making new call', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3, autoHoldOnNewCall: true })
      )

      // Set up line 1 as active
      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-1'

      // Make call on line 2
      await result.makeCall('sip:bob@example.com', { lineNumber: 2 })

      // Line 1 should be held
      expect(result.lines.value[0].status).toBe('held')
      expect(result.lines.value[0].isOnHold).toBe(true)

      unmount()
    })

    it('should not auto-hold when disabled', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() =>
        useSipSecondLine(sipClientRef, undefined, { lineCount: 3, autoHoldOnNewCall: false })
      )

      // Set up line 1 as active
      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-1'

      // Make call on line 2
      await result.makeCall('sip:bob@example.com', { lineNumber: 2 })

      // Line 1 should still be active (not auto-held)
      expect(result.lines.value[0].status).toBe('active')

      unmount()
    })
  })

  describe('input validation', () => {
    it('should reject non-integer line numbers', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.selectLine(1.5)
      expect(result.selectedLine.value).toBe(1) // Unchanged

      result.selectLine(NaN)
      expect(result.selectedLine.value).toBe(1) // Unchanged

      unmount()
    })

    it('should validate transfer target patterns', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      // Valid patterns
      const validTargets = ['sip:user@domain.com', 'user@domain', '+1234567890', 'extension123']

      for (const target of validTargets) {
        result.lines.value[0].status = 'active'
        result.lines.value[0].callId = 'call-123'
        await expect(result.transferCall({ fromLine: 1, target })).resolves.not.toThrow()
      }

      unmount()
    })

    it('should reject invalid transfer targets', async () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      const invalidTargets = ['', '<script>', 'a'.repeat(300)]

      for (const target of invalidTargets) {
        result.lines.value[0].status = 'active'
        result.lines.value[0].callId = 'call-123'
        await expect(result.transferCall({ fromLine: 1, target })).rejects.toThrow()
      }

      unmount()
    })
  })

  describe('cleanup on unmount', () => {
    it('should clean up timers and listeners on unmount', () => {
      const sipClientRef = ref(mockSipClient as SipClient)
      const { result, unmount } = withSetup(() => useSipSecondLine(sipClientRef))

      // Simulate active call with timer
      result.lines.value[0].status = 'active'
      result.lines.value[0].callId = 'call-123'

      unmount()

      // The unmount should clean up without errors
      // We can't directly test timer cleanup, but ensure no errors thrown
    })
  })
})
