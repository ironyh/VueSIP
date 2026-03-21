/**
 * useCallTransfer composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCallTransfer } from '../useCallTransfer'
import { TransferType, TransferState } from '@/types/transfer.types'
import type { CallSession } from '@/core/CallSession'
import { EventEmitter } from '@/utils/EventEmitter'

describe('useCallTransfer', () => {
  let mockSession: CallSession
  let mockEventBus: EventEmitter

  beforeEach(() => {
    mockEventBus = new EventEmitter()
    mockSession = {
      id: 'test-session-123',
      state: 'active',
      eventBus: mockEventBus,
      transfer: vi.fn().mockResolvedValue({ success: true }),
      attendedTransfer: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as CallSession
  })

  afterEach(() => {
    mockEventBus.removeAllListeners()
  })

  describe('initial state', () => {
    it('should return initial transfer state as Idle', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { transferState } = useCallTransfer(sessionRef)

      expect(transferState.value).toBe(TransferState.Idle)
    })

    it('should return null transfer type initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { transferType } = useCallTransfer(sessionRef)

      expect(transferType.value).toBe(null)
    })

    it('should return null transfer target initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { transferTarget } = useCallTransfer(sessionRef)

      expect(transferTarget.value).toBe(null)
    })

    it('should return null transfer error initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { transferError } = useCallTransfer(sessionRef)

      expect(transferError.value).toBe(null)
    })

    it('should return null transfer progress initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { transferProgress } = useCallTransfer(sessionRef)

      expect(transferProgress.value).toBe(null)
    })

    it('should return isTransferring as false initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isTransferring } = useCallTransfer(sessionRef)

      expect(isTransferring.value).toBe(false)
    })
  })

  describe('with active session', () => {
    it('should set transferState to Initiated after blind transfer', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(true)
      expect(transferState.value).toBe(TransferState.Initiated)
      expect(mockSession.transfer).toHaveBeenCalledWith('sip:target@domain.com', undefined)
    })

    it('should set transferState to Initiated after attended transfer', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall, transferState } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Attended,
        target: 'sip:target@domain.com',
        consultationCallId: 'call-123',
      })

      expect(result.success).toBe(true)
      expect(transferState.value).toBe(TransferState.Initiated)
      expect(mockSession.attendedTransfer).toHaveBeenCalledWith('sip:target@domain.com', 'call-123')
    })

    it('should set transferTarget after initiating transfer', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall, transferTarget } = useCallTransfer(sessionRef)

      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(transferTarget.value).toBe('sip:target@domain.com')
    })

    it('should set transferType after initiating transfer', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall, transferType } = useCallTransfer(sessionRef)

      await transferCall('sip:target@domain.com', {
        type: TransferType.Attended,
        target: 'sip:target@domain.com',
        consultationCallId: 'call-123',
      })

      expect(transferType.value).toBe(TransferType.Attended)
    })

    it('should return failed result when no session exists', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { transferCall } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No active call session')
    })

    it('should return failed result for empty target URI', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall } = useCallTransfer(sessionRef)

      const result = await transferCall('', {
        type: TransferType.Blind,
        target: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Target URI cannot be empty')
    })

    it('should return failed result for invalid SIP URI', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall } = useCallTransfer(sessionRef)

      const result = await transferCall('not-a-valid-sip-uri', {
        type: TransferType.Blind,
        target: 'not-a-valid-sip-uri',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid target URI')
    })

    it('should return failed result when call is not active', async () => {
      const inactiveSession = {
        ...mockSession,
        state: 'terminated',
      } as unknown as CallSession
      const sessionRef = ref<CallSession | null>(inactiveSession)
      const { transferCall } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Call must be in active state')
    })

    it('should return failed result for attended transfer without consultation call ID', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Attended,
        target: 'sip:target@domain.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Consultation call ID required')
    })

    it('should return transfer ID on successful transfer', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferCall } = useCallTransfer(sessionRef)

      const result = await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      expect(result.transferId).toBeDefined()
      expect(result.transferId).toMatch(/^transfer-/)
    })
  })

  describe('acceptTransfer', () => {
    it('should accept incoming transfer request', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { acceptTransfer, transferState } = useCallTransfer(sessionRef)

      await acceptTransfer()

      expect(transferState.value).toBe(TransferState.Accepted)
    })

    it('should throw error when no session exists', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { acceptTransfer } = useCallTransfer(sessionRef)

      await expect(acceptTransfer()).rejects.toThrow('No active call session')
    })

    it('should emit transfer accepted event', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { acceptTransfer } = useCallTransfer(sessionRef)

      const emitSpy = vi.spyOn(mockEventBus, 'emit')

      await acceptTransfer()

      expect(emitSpy).toHaveBeenCalledWith(
        'call:transfer_accepted',
        expect.objectContaining({
          type: 'call:transfer_accepted',
        })
      )
    })
  })

  describe('rejectTransfer', () => {
    it('should reject incoming transfer request', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { rejectTransfer, transferState, transferError } = useCallTransfer(sessionRef)

      await rejectTransfer('User declined')

      expect(transferState.value).toBe(TransferState.Failed)
      expect(transferError.value).toBe('User declined')
    })

    it('should throw error when no session exists', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { rejectTransfer } = useCallTransfer(sessionRef)

      await expect(rejectTransfer()).rejects.toThrow('No active call session')
    })

    it('should emit transfer failed event with reason', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { rejectTransfer } = useCallTransfer(sessionRef)

      const emitSpy = vi.spyOn(mockEventBus, 'emit')

      await rejectTransfer('Not now')

      expect(emitSpy).toHaveBeenCalledWith(
        'call:transfer_failed',
        expect.objectContaining({
          type: 'call:transfer_failed',
          error: 'Not now',
        })
      )
    })
  })

  describe('clearTransfer', () => {
    it('should clear all transfer state', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const {
        transferCall,
        clearTransfer,
        transferState,
        transferType,
        transferTarget,
        transferError,
        transferProgress,
      } = useCallTransfer(sessionRef)

      // First initiate a transfer
      await transferCall('sip:target@domain.com', {
        type: TransferType.Blind,
        target: 'sip:target@domain.com',
      })

      // Then clear it
      clearTransfer()

      expect(transferState.value).toBe(TransferState.Idle)
      expect(transferType.value).toBe(null)
      expect(transferTarget.value).toBe(null)
      expect(transferError.value).toBe(null)
      expect(transferProgress.value).toBe(null)
    })
  })

  describe('event handling', () => {
    it('should update state on transfer_initiated event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferState } = useCallTransfer(sessionRef)

      mockEventBus.emit('call:transfer_initiated', {
        type: 'call:transfer_initiated',
        target: 'sip:target@domain.com',
        transferType: 'blind',
      })

      expect(transferState.value).toBe(TransferState.Initiated)
    })

    it('should update state on transfer_accepted event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferState } = useCallTransfer(sessionRef)

      mockEventBus.emit('call:transfer_accepted', {
        type: 'call:transfer_accepted',
        target: 'sip:target@domain.com',
      })

      expect(transferState.value).toBe(TransferState.Accepted)
    })

    it('should update state on transfer_completed event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferState } = useCallTransfer(sessionRef)

      mockEventBus.emit('call:transfer_completed', {
        type: 'call:transfer_completed',
      })

      expect(transferState.value).toBe(TransferState.Completed)
    })

    it('should update state and error on transfer_failed event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferState, transferError } = useCallTransfer(sessionRef)

      mockEventBus.emit('call:transfer_failed', {
        type: 'call:transfer_failed',
        error: 'Transfer failed',
      })

      expect(transferState.value).toBe(TransferState.Failed)
      expect(transferError.value).toBe('Transfer failed')
    })

    it('should update state on transfer_canceled event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferState } = useCallTransfer(sessionRef)

      mockEventBus.emit('call:transfer_canceled', {
        type: 'call:transfer_canceled',
      })

      expect(transferState.value).toBe(TransferState.Canceled)
    })

    it('should update progress on transfer_progress event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { transferProgress } = useCallTransfer(sessionRef)

      mockEventBus.emit('call:transfer_progress', {
        type: 'call:transfer_progress',
        transferId: 'transfer-123',
        state: 'in_progress',
        progress: 50,
        target: 'sip:target@domain.com',
      })

      expect(transferProgress.value).toEqual(
        expect.objectContaining({
          id: 'transfer-123',
          progress: 50,
        })
      )
    })
  })

  describe('isTransferring computed', () => {
    it('should return true when state is Initiated', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { isTransferring, transferState } = useCallTransfer(sessionRef)

      transferState.value = TransferState.Initiated

      expect(isTransferring.value).toBe(true)
    })

    it('should return true when state is InProgress', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { isTransferring, transferState } = useCallTransfer(sessionRef)

      transferState.value = TransferState.InProgress

      expect(isTransferring.value).toBe(true)
    })

    it('should return true when state is Accepted', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { isTransferring, transferState } = useCallTransfer(sessionRef)

      transferState.value = TransferState.Accepted

      expect(isTransferring.value).toBe(true)
    })

    it('should return false when state is Completed', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { isTransferring, transferState } = useCallTransfer(sessionRef)

      transferState.value = TransferState.Completed

      expect(isTransferring.value).toBe(false)
    })

    it('should return false when state is Failed', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { isTransferring, transferState } = useCallTransfer(sessionRef)

      transferState.value = TransferState.Failed

      expect(isTransferring.value).toBe(false)
    })
  })
})
