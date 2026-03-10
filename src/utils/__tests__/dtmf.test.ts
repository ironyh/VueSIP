/**
 * DTMF Utilities Unit Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendDtmfTone } from '../dtmf'

describe('dtmf', () => {
  let mockPc: RTCPeerConnection

  const createMockSender = (hasDtmf: boolean = true): RTCRtpSender => {
    const sender = {
      track: { kind: 'audio' },
    } as unknown as RTCRtpSender

    if (hasDtmf) {
      ;(sender as RTCRtpSender & { dtmf: RTCDTMFSender }).dtmf = {
        insertDTMF: vi.fn(),
        toneBuffer: '',
        duration: 160,
        interToneGap: 70,
      } as unknown as RTCDTMFSender
    }

    return sender
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockPc = {
      getSenders: vi.fn(),
    } as unknown as RTCPeerConnection
  })

  describe('sendDtmfTone', () => {
    it('should throw for invalid digits', () => {
      const invalidDigits = ['E', 'f', '!', '', '12']

      for (const digit of invalidDigits) {
        expect(() => sendDtmfTone(mockPc, digit)).toThrow(`Invalid DTMF digit: ${digit}`)
      }
    })

    it('should accept valid DTMF digits 0-9', () => {
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

      for (const digit of digits) {
        const mockSender = createMockSender()
        ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

        expect(() => sendDtmfTone(mockPc, digit)).not.toThrow()
      }
    })

    it('should accept star and hash digits', () => {
      const digits = ['*', '#']

      for (const digit of digits) {
        const mockSender = createMockSender()
        ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

        expect(() => sendDtmfTone(mockPc, digit)).not.toThrow()
      }
    })

    it('should accept ABCD digits', () => {
      const digits = ['A', 'B', 'C', 'D']

      for (const digit of digits) {
        const mockSender = createMockSender()
        ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

        expect(() => sendDtmfTone(mockPc, digit)).not.toThrow()
      }
    })

    it('should throw when no audio sender found', () => {
      ;(mockPc.getSenders as vi.fn).mockReturnValue([])

      expect(() => sendDtmfTone(mockPc, '5')).toThrow(
        'No DTMF-capable audio sender on peer connection'
      )
    })

    it('should throw when sender has no dtmf property', () => {
      const mockSender = {
        track: { kind: 'audio' },
        // No dtmf property
      } as unknown as RTCRtpSender
      ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

      expect(() => sendDtmfTone(mockPc, '5')).toThrow(
        'No DTMF-capable audio sender on peer connection'
      )
    })

    it('should throw when dtmf sender is not available', () => {
      const mockSender = {
        track: { kind: 'audio' },
        dtmf: null,
      } as unknown as RTCRtpSender
      ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

      expect(() => sendDtmfTone(mockPc, '5')).toThrow('DTMF sender not available')
    })

    it('should call insertDTMF with correct parameters', () => {
      const mockDtmfSender = {
        insertDTMF: vi.fn(),
        toneBuffer: '',
        duration: 0,
        interToneGap: 0,
      }
      const mockSender = {
        track: { kind: 'audio' },
        dtmf: mockDtmfSender,
      } as unknown as RTCRtpSender
      ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

      sendDtmfTone(mockPc, '5', 200, 100)

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('5', 200, 100)
    })

    it('should use default duration and gap when not provided', () => {
      const mockDtmfSender = {
        insertDTMF: vi.fn(),
        toneBuffer: '',
        duration: 0,
        interToneGap: 0,
      }
      const mockSender = {
        track: { kind: 'audio' },
        dtmf: mockDtmfSender,
      } as unknown as RTCRtpSender
      ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

      sendDtmfTone(mockPc, '9')

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('9', 160, 70)
    })

    it('should find audio sender among multiple senders', () => {
      const mockDtmfSender = {
        insertDTMF: vi.fn(),
        toneBuffer: '',
        duration: 0,
        interToneGap: 0,
      }
      const videoSender = {
        track: { kind: 'video' },
      } as unknown as RTCRtpSender
      const audioSender = {
        track: { kind: 'audio' },
        dtmf: mockDtmfSender,
      } as unknown as RTCRtpSender
      ;(mockPc.getSenders as vi.fn).mockReturnValue([videoSender, audioSender])

      sendDtmfTone(mockPc, '#')

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('#', 160, 70)
    })

    it('should handle non-audio track kinds gracefully', () => {
      const mockSender = {
        track: { kind: 'video' },
      } as unknown as RTCRtpSender
      ;(mockPc.getSenders as vi.fn).mockReturnValue([mockSender])

      expect(() => sendDtmfTone(mockPc, '1')).toThrow(
        'No DTMF-capable audio sender on peer connection'
      )
    })
  })
})
