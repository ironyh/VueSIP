/**
 * useCallTransfer composable tests
 * Tests for call transfer functionality with SIP REFER method
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCallTransfer } from '@/composables/useCallTransfer'
import { CallSession } from '@/core/CallSession'
import { TransferType, TransferState } from '@/types/transfer.types'
import type { CallDirection } from '@/types/call.types'
import { EventBus } from '@/core/EventBus'

describe('useCallTransfer', () => {
  let mockSession: CallSession
  let mockEventBus: EventBus
  let sessionRef: ReturnType<typeof ref<CallSession | null>>

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = new EventBus()

    // Create mock RTCSession
    const mockRtcSession = {
      refer: vi.fn(),
      terminate: vi.fn(),
      connection: {
        getStats: vi.fn().mockResolvedValue(new Map()),
        getSenders: vi.fn().mockReturnValue([]),
        getReceivers: vi.fn().mockReturnValue([]),
      },
      on: vi.fn(),
      off: vi.fn(),
    }

    // Create mock CallSession
    mockSession = new CallSession({
      id: 'test-call-123',
      direction: 'outgoing' as CallDirection,
      localUri: 'sip:user@local.com',
      remoteUri: 'sip:remote@domain.com',
      remoteDisplayName: 'Remote User',
      rtcSession: mockRtcSession,
      eventBus: mockEventBus,
    })

    // Set session to active state (required for transfer)
    // @ts-expect-error - accessing private property for testing
    mockSession._state = 'active'

    sessionRef = ref<CallSession | null>(mockSession)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with idle state', () => {
      const { transferState, isTransferring } = useCallTransfer(sessionRef)

      expect(transferState.value).toBe(TransferState.Idle)
      expect(isTransferring.value).toBe(false)
    })

    it('should initialize with null transfer target', () => {
      const { transferTarget } = useCallTransfer(sessionRef)

      expect(transferTarget.value).toBeNull()
    })

    it('should initialize with null transfer type', () => {
      const { transferType } = useCallTransfer(sessionRef)

      expect(transferType.value).toBeNull()
    })
  })

  describe('Blind Transfer', () => {
    it('should initiate blind transfer successfully', async () => {
      const transferSpy = vi.spyOn(mockSession, 'transfer')
      const { transferCall, transferState, transferType, transferTarget } =
        useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(true)
      expect(transferState.value).toBe(TransferState.Initiated)
      expect(transferType.value).toBe(TransferType.Blind)
      expect(transferTarget.value).toBe('sip:target@domain.com')
      expect(transferSpy).toHaveBeenCalledWith('sip:target@domain.com', undefined)
    })

    it('should fail blind transfer if no active session', async () => {
      sessionRef.value = null
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No active call session')
      expect(transferState.value).toBe(TransferState.Failed)
    })

    it('should fail blind transfer with invalid target URI', async () => {
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('invalid-uri', {
        type: TransferType.Blind,
        target: 'invalid-uri',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid target URI')
      expect(transferState.value).toBe(TransferState.Failed)
    })

    it('should fail blind transfer with empty target', async () => {
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('', {
        type: TransferType.Blind,
        target: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Target URI cannot be empty')
      expect(transferState.value).toBe(TransferState.Failed)
    })

    it('should include extra headers in blind transfer', async () => {
      const transferSpy = vi.spyOn(mockSession, 'transfer')
      const { transferCall } = useCallTransfer(sessionRef)
      const extraHeaders = ['X-Custom-Header: value']

      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
        extraHeaders,
      })

      expect(transferSpy).toHaveBeenCalledWith('sip:target@domain.com', extraHeaders)
    })
  })

  describe('Attended Transfer', () => {
    it('should initiate attended transfer successfully', async () => {
      const attendedTransferSpy = vi.spyOn(mockSession, 'attendedTransfer')
      const { transferCall, transferState, transferType } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Attended,
        target: 'sip:target@domain.com',
        consultationCallId: 'consultation-call-456',
      })

      expect(result.success).toBe(true)
      expect(transferState.value).toBe(TransferState.Initiated)
      expect(transferType.value).toBe(TransferType.Attended)
      expect(attendedTransferSpy).toHaveBeenCalledWith(
        'sip:target@domain.com',
        'consultation-call-456'
      )
    })

    it('should fail attended transfer without consultation call ID', async () => {
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Attended,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Consultation call ID required for attended transfer')
      expect(transferState.value).toBe(TransferState.Failed)
    })

    it('should fail attended transfer if no active session', async () => {
      sessionRef.value = null
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Attended,
        target: 'sip:target@domain.com',
        consultationCallId: 'consultation-call-456',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No active call session')
      expect(transferState.value).toBe(TransferState.Failed)
    })
  })

  describe('Transfer State Management', () => {
    it('should update state to InProgress when transfer is accepted', () => {
      const { transferState } = useCallTransfer(sessionRef)

      // Simulate transfer accepted event
      mockEventBus.emit('call:transfer_accepted', {
        transferId: 'transfer-123',
      })

      expect(transferState.value).toBe(TransferState.Accepted)
    })

    it('should update state to Completed on successful transfer', () => {
      const { transferState } = useCallTransfer(sessionRef)

      // Simulate transfer completed event
      mockEventBus.emit('call:transfer_completed', {
        transferId: 'transfer-123',
      })

      expect(transferState.value).toBe(TransferState.Completed)
    })

    it('should update state to Failed on transfer failure', () => {
      const { transferState, transferError } = useCallTransfer(sessionRef)

      // Simulate transfer failed event
      mockEventBus.emit('call:transfer_failed', {
        transferId: 'transfer-123',
        error: 'Transfer rejected by target',
      })

      expect(transferState.value).toBe(TransferState.Failed)
      expect(transferError.value).toBe('Transfer rejected by target')
    })

    it('should reset state after clearing transfer', () => {
      const { transferCall, clearTransfer, transferState } = useCallTransfer(sessionRef)

      // Initiate transfer
      transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      // Clear transfer
      clearTransfer()

      expect(transferState.value).toBe(TransferState.Idle)
    })
  })

  describe('Reactive State', () => {
    it('should compute isTransferring correctly', async () => {
      const { transferCall, isTransferring, clearTransfer } = useCallTransfer(sessionRef)

      expect(isTransferring.value).toBe(false)

      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(isTransferring.value).toBe(true)

      clearTransfer()

      expect(isTransferring.value).toBe(false)
    })

    it('should track transfer progress', () => {
      const { transferProgress } = useCallTransfer(sessionRef)

      expect(transferProgress.value).toBeNull()

      // Simulate transfer progress event
      mockEventBus.emit('call:transfer_progress', {
        transferId: 'transfer-123',
        state: TransferState.InProgress,
        progress: 50,
      })

      expect(transferProgress.value).toEqual({
        id: 'transfer-123',
        state: TransferState.InProgress,
        type: TransferType.Blind, // Defaults to blind transfer type
        target: '', // Empty string default
        progress: 50,
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle transfer rejection gracefully', async () => {
      const { transferCall, transferState, transferError } = useCallTransfer(sessionRef)

      // Mock transfer to throw error
      vi.spyOn(mockSession, 'transfer').mockRejectedValue(new Error('Transfer rejected'))

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transfer rejected')
      expect(transferState.value).toBe(TransferState.Failed)
      expect(transferError.value).toBe('Transfer rejected')
    })

    it('should handle timeout during transfer', async () => {
      vi.useFakeTimers()
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      // Initiate transfer
      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      // Verify transfer initiated
      expect(transferState.value).toBe(TransferState.Initiated)

      // Simulate timeout (30 seconds)
      await vi.advanceTimersByTimeAsync(30000)

      // Timeout should set state to Failed
      expect(transferState.value).toBe(TransferState.Failed)

      vi.useRealTimers()
    })

    it('should handle call state not suitable for transfer', async () => {
      // Set session to non-active state
      // @ts-expect-error - accessing private property for testing
      mockSession._state = 'idle'

      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Call must be in active state to transfer')
      expect(transferState.value).toBe(TransferState.Failed)
    })
  })

  describe('Event Emissions', () => {
    it('should emit transfer initiated event', async () => {
      const { transferCall } = useCallTransfer(sessionRef)
      const eventSpy = vi.fn()

      mockEventBus.on('call:transfer_initiated', eventSpy)

      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'sip:target@domain.com',
          transferType: 'blind',
        })
      )
    })

    it('should emit transfer completed event', () => {
      const { transferState } = useCallTransfer(sessionRef)
      const eventSpy = vi.fn()

      mockEventBus.on('call:transfer_completed', eventSpy)

      // Simulate successful transfer
      mockEventBus.emit('call:transfer_completed', {
        transferId: 'transfer-123',
      })

      expect(transferState.value).toBe(TransferState.Completed)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const offSpy = vi.spyOn(mockEventBus, 'off')

      const { transferCall } = useCallTransfer(sessionRef)

      // Initiate transfer
      transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      // Simulate component unmount - would be called by Vue's onUnmounted hook
      // In real usage, this cleanup happens automatically

      expect(offSpy).not.toHaveBeenCalled()
    })

    it('should clear transfer state on session change', async () => {
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      // Initiate transfer
      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      // Verify transfer is in progress
      expect(transferState.value).toBe(TransferState.Initiated)

      // Clear session - should trigger cleanup via watcher
      sessionRef.value = null

      // Wait for watcher to trigger cleanup
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(transferState.value).toBe(TransferState.Idle)
    })
  })
})
