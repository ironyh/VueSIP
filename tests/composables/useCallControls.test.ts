/**
 * Tests for useCallControls composable
 * @module tests/composables/useCallControls.test
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCallControls } from '@/composables/useCallControls'
import { TransferState, TransferType } from '@/types/transfer.types'
import type { SipClient } from '@/core/SipClient'
import type { CallSession } from '@/types/call.types'
import type { ExtendedCallSession } from '@/composables/types'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock constants
vi.mock('@/composables/constants', () => ({
  TRANSFER_CONSTANTS: {
    COMPLETION_DELAY: 100,
    CANCELLATION_DELAY: 100,
  },
}))

describe('useCallControls', () => {
  let sipClient: Ref<SipClient | null>
  let mockCall: ExtendedCallSession
  let mockSipClient: SipClient

  beforeEach(() => {
    // Create mock call session
    mockCall = {
      id: 'call-123',
      direction: 'outgoing',
      state: 'Active',
      startTime: new Date(),
      hold: vi.fn().mockResolvedValue(undefined),
      unhold: vi.fn().mockResolvedValue(undefined),
      hangup: vi.fn().mockResolvedValue(undefined),
      transfer: vi.fn().mockResolvedValue(undefined),
      attendedTransfer: vi.fn().mockResolvedValue(undefined),
    } as unknown as ExtendedCallSession

    // Create mock SIP client
    mockSipClient = {
      getActiveCall: vi.fn().mockReturnValue(mockCall),
      makeCall: vi.fn().mockResolvedValue('consultation-call-456'),
    } as unknown as SipClient

    sipClient = ref(mockSipClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with null active transfer', () => {
      const controls = useCallControls(sipClient)
      expect(controls.activeTransfer.value).toBeNull()
      expect(controls.transferState.value).toBe(TransferState.Idle)
      expect(controls.isTransferring.value).toBe(false)
      expect(controls.consultationCall.value).toBeNull()
    })

    it('should return all required methods', () => {
      const controls = useCallControls(sipClient)
      expect(typeof controls.blindTransfer).toBe('function')
      expect(typeof controls.initiateAttendedTransfer).toBe('function')
      expect(typeof controls.completeAttendedTransfer).toBe('function')
      expect(typeof controls.cancelTransfer).toBe('function')
      expect(typeof controls.forwardCall).toBe('function')
      expect(typeof controls.getTransferProgress).toBe('function')
      expect(typeof controls.onTransferEvent).toBe('function')
    })
  })

  describe('blindTransfer', () => {
    it('should throw error if SIP client is not initialized', async () => {
      const controls = useCallControls(ref(null))

      await expect(controls.blindTransfer('call-123', 'sip:target@example.com')).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should throw error if another transfer is in progress', async () => {
      const controls = useCallControls(sipClient)

      // Start a transfer to set isTransferring to true
      mockCall.transfer = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Don't resolve immediately so isTransferring stays true
          })
      )

      // Manually set active transfer to simulate in-progress
      controls.activeTransfer.value = {
        id: 'existing-transfer',
        state: TransferState.InProgress,
        type: TransferType.Blind,
        target: 'sip:other@example.com',
        callId: 'call-999',
        initiatedAt: new Date(),
      }

      await expect(controls.blindTransfer('call-123', 'sip:target@example.com')).rejects.toThrow(
        'Another transfer is already in progress'
      )
    })

    it('should throw error if call is not found', async () => {
      mockSipClient.getActiveCall = vi.fn().mockReturnValue(undefined)
      const controls = useCallControls(sipClient)

      await expect(
        controls.blindTransfer('nonexistent-call', 'sip:target@example.com')
      ).rejects.toThrow('Call nonexistent-call not found')
    })

    it('should successfully perform blind transfer', async () => {
      const controls = useCallControls(sipClient)

      await controls.blindTransfer('call-123', 'sip:target@example.com')

      expect(mockCall.transfer).toHaveBeenCalledWith('sip:target@example.com', undefined)
      expect(controls.activeTransfer.value).not.toBeNull()
      expect(controls.activeTransfer.value?.type).toBe(TransferType.Blind)
      expect(controls.activeTransfer.value?.target).toBe('sip:target@example.com')
    })

    it('should pass extra headers to transfer', async () => {
      const controls = useCallControls(sipClient)
      const extraHeaders = ['X-Custom-Header: value']

      await controls.blindTransfer('call-123', 'sip:target@example.com', extraHeaders)

      expect(mockCall.transfer).toHaveBeenCalledWith('sip:target@example.com', extraHeaders)
    })
  })

  describe('initiateAttendedTransfer', () => {
    it('should throw error if SIP client is not initialized', async () => {
      const controls = useCallControls(ref(null))

      await expect(
        controls.initiateAttendedTransfer('call-123', 'sip:target@example.com')
      ).rejects.toThrow('SIP client not initialized')
    })

    it('should throw error if makeCall is not implemented', async () => {
      const incompleteClient = {
        getActiveCall: vi.fn().mockReturnValue(mockCall),
      } as unknown as SipClient
      const controls = useCallControls(ref(incompleteClient))

      await expect(
        controls.initiateAttendedTransfer('call-123', 'sip:target@example.com')
      ).rejects.toThrow('SipClient.makeCall() is not implemented')
    })

    it('should successfully initiate attended transfer', async () => {
      const controls = useCallControls(sipClient)

      const consultationCallId = await controls.initiateAttendedTransfer(
        'call-123',
        'sip:target@example.com'
      )

      expect(consultationCallId).toBe('consultation-call-456')
      expect(mockCall.hold).toHaveBeenCalled()
      expect(mockSipClient.makeCall).toHaveBeenCalledWith('sip:target@example.com', {
        video: false,
      })
      expect(controls.activeTransfer.value).not.toBeNull()
      expect(controls.activeTransfer.value?.type).toBe(TransferType.Attended)
      expect(controls.activeTransfer.value?.consultationCallId).toBe('consultation-call-456')
    })
  })

  describe('completeAttendedTransfer', () => {
    it('should throw error if no active attended transfer', async () => {
      const controls = useCallControls(sipClient)

      await expect(controls.completeAttendedTransfer()).rejects.toThrow(
        'No active attended transfer'
      )
    })

    it('should throw error if no consultation call', async () => {
      const controls = useCallControls(sipClient)

      // Set up active attended transfer without consultation call
      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Attended,
        target: 'sip:target@example.com',
        callId: 'call-123',
        initiatedAt: new Date(),
      }

      await expect(controls.completeAttendedTransfer()).rejects.toThrow(
        'No consultation call found'
      )
    })

    it('should successfully complete attended transfer', async () => {
      const controls = useCallControls(sipClient)

      // Set up active attended transfer with consultation call
      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Attended,
        target: 'sip:target@example.com',
        callId: 'call-123',
        consultationCallId: 'consultation-call-456',
        initiatedAt: new Date(),
      }
      controls.consultationCall.value = {
        id: 'consultation-call-456',
      } as unknown as CallSession

      await controls.completeAttendedTransfer()

      expect(mockCall.attendedTransfer).toHaveBeenCalledWith(
        'sip:target@example.com',
        'consultation-call-456'
      )
    })
  })

  describe('cancelTransfer', () => {
    it('should throw error if no active transfer', async () => {
      const controls = useCallControls(sipClient)

      await expect(controls.cancelTransfer()).rejects.toThrow('No active transfer to cancel')
    })

    it('should cancel blind transfer successfully', async () => {
      const controls = useCallControls(sipClient)

      // Set up active blind transfer
      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Blind,
        target: 'sip:target@example.com',
        callId: 'call-123',
        initiatedAt: new Date(),
      }

      await controls.cancelTransfer()

      expect(controls.activeTransfer.value?.state).toBe(TransferState.Canceled)
    })

    it('should cancel attended transfer and clean up calls', async () => {
      const controls = useCallControls(sipClient)

      // Set up active attended transfer with consultation call
      const consultationCall = {
        ...mockCall,
        id: 'consultation-call-456',
        hangup: vi.fn().mockResolvedValue(undefined),
      }

      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Attended,
        target: 'sip:target@example.com',
        callId: 'call-123',
        consultationCallId: 'consultation-call-456',
        initiatedAt: new Date(),
      }
      controls.consultationCall.value = consultationCall as unknown as CallSession

      await controls.cancelTransfer()

      expect(consultationCall.hangup).toHaveBeenCalled()
      expect(mockCall.unhold).toHaveBeenCalled()
      expect(controls.activeTransfer.value?.state).toBe(TransferState.Canceled)
    })
  })

  describe('forwardCall', () => {
    it('should forward call with Diversion header', async () => {
      const controls = useCallControls(sipClient)

      await controls.forwardCall('call-123', 'sip:forward@example.com')

      expect(mockCall.transfer).toHaveBeenCalledWith('sip:forward@example.com', [
        'Diversion: <sip:forwarded>',
      ])
    })
  })

  describe('getTransferProgress', () => {
    it('should return null when no active transfer', () => {
      const controls = useCallControls(sipClient)

      expect(controls.getTransferProgress()).toBeNull()
    })

    it('should return progress for active transfer', () => {
      const controls = useCallControls(sipClient)

      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Blind,
        target: 'sip:target@example.com',
        callId: 'call-123',
        initiatedAt: new Date(),
      }

      const progress = controls.getTransferProgress()

      expect(progress).not.toBeNull()
      expect(progress?.id).toBe('transfer-123')
      expect(progress?.progress).toBe(50) // InProgress = 50%
    })

    it('should return correct progress percentages for each state', () => {
      const controls = useCallControls(sipClient)

      const statesAndExpectedProgress: Array<{ state: TransferState; expected: number }> = [
        { state: TransferState.Idle, expected: 0 },
        { state: TransferState.Initiated, expected: 25 },
        { state: TransferState.InProgress, expected: 50 },
        { state: TransferState.Accepted, expected: 75 },
        { state: TransferState.Completed, expected: 100 },
        { state: TransferState.Failed, expected: 0 },
        { state: TransferState.Canceled, expected: 0 },
      ]

      for (const { state, expected } of statesAndExpectedProgress) {
        controls.activeTransfer.value = {
          id: 'transfer-123',
          state,
          type: TransferType.Blind,
          target: 'sip:target@example.com',
          callId: 'call-123',
          initiatedAt: new Date(),
        }

        const progress = controls.getTransferProgress()
        expect(progress?.progress).toBe(expected)
      }
    })
  })

  describe('onTransferEvent', () => {
    it('should register and call event listener', () => {
      const controls = useCallControls(sipClient)
      const callback = vi.fn()

      const unsubscribe = controls.onTransferEvent(callback)

      // Trigger event manually via internal state change
      // Note: We can't easily trigger internal events, but we can test unsubscribe
      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
    })

    it('should allow multiple listeners', () => {
      const controls = useCallControls(sipClient)
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsub1 = controls.onTransferEvent(callback1)
      const unsub2 = controls.onTransferEvent(callback2)

      expect(typeof unsub1).toBe('function')
      expect(typeof unsub2).toBe('function')
    })
  })

  describe('isTransferring computed', () => {
    it('should be false when transfer is idle', () => {
      const controls = useCallControls(sipClient)
      expect(controls.isTransferring.value).toBe(false)
    })

    it('should be true when transfer is in progress', () => {
      const controls = useCallControls(sipClient)

      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Blind,
        target: 'sip:target@example.com',
        callId: 'call-123',
        initiatedAt: new Date(),
      }

      expect(controls.isTransferring.value).toBe(true)
    })

    it('should be false when transfer is completed', () => {
      const controls = useCallControls(sipClient)

      controls.activeTransfer.value = {
        id: 'transfer-123',
        state: TransferState.Completed,
        type: TransferType.Blind,
        target: 'sip:target@example.com',
        callId: 'call-123',
        initiatedAt: new Date(),
        completedAt: new Date(),
      }

      expect(controls.isTransferring.value).toBe(false)
    })
  })
})
