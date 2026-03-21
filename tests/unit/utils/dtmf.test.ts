/**
 * DTMF utilities tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendDtmfTone } from '@/utils/dtmf'

// Mock RTCPeerConnection
const createMockSender = (hasAudioTrack = true, hasDTMF = true) => {
  const mockSender = {
    track: hasAudioTrack ? { kind: 'audio' } : null,
    dtmf: hasDTMF
      ? {
          insertDTMF: vi.fn(),
        }
      : null,
  }
  return mockSender
}

describe('dtmf', () => {
  let mockPc: RTCPeerConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockPc = {
      getSenders: vi.fn(),
    } as unknown as RTCPeerConnection
  })

  describe('sendDtmfTone', () => {
    it('should send DTMF tone with valid digit', () => {
      const mockSender = createMockSender()
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([mockSender])

      sendDtmfTone(mockPc, '5')

      expect(mockSender.dtmf?.insertDTMF).toHaveBeenCalledWith('5', 160, 70)
    })

    it('should send DTMF tone with custom duration and gap', () => {
      const mockSender = createMockSender()
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([mockSender])

      sendDtmfTone(mockPc, '*', 100, 50)

      expect(mockSender.dtmf?.insertDTMF).toHaveBeenCalledWith('*', 100, 50)
    })

    it('should handle all valid DTMF digits', () => {
      const validDigits = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '*',
        '#',
        'A',
        'B',
        'C',
        'D',
      ]
      const mockSender = createMockSender()
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([mockSender])

      validDigits.forEach((digit) => {
        expect(() => sendDtmfTone(mockPc, digit)).not.toThrow()
      })
    })

    it('should throw error for invalid digit', () => {
      const mockSender = createMockSender()
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([mockSender])

      expect(() => sendDtmfTone(mockPc, 'E')).toThrow('Invalid DTMF digit: E')
      expect(() => sendDtmfTone(mockPc, '')).toThrow('Invalid DTMF digit: ')
      expect(() => sendDtmfTone(mockPc, '12')).toThrow('Invalid DTMF digit: 12')
    })

    it('should throw error when no audio sender found', () => {
      const mockSender = createMockSender(false)
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([mockSender])

      expect(() => sendDtmfTone(mockPc, '5')).toThrow(
        'No DTMF-capable audio sender on peer connection'
      )
    })

    it('should throw error when sender has no DTMF', () => {
      const mockSender = createMockSender(true, false)
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([mockSender])

      expect(() => sendDtmfTone(mockPc, '5')).toThrow('DTMF sender not available')
    })

    it('should find audio sender among multiple senders', () => {
      const videoSender = { track: { kind: 'video' }, dtmf: null }
      const audioSender = createMockSender()
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([videoSender, audioSender])

      sendDtmfTone(mockPc, '9')

      expect(audioSender.dtmf?.insertDTMF).toHaveBeenCalledWith('9', 160, 70)
    })

    it('should throw error when no senders exist', () => {
      ;(mockPc.getSenders as ReturnType<typeof vi.fn>).mockReturnValue([])

      expect(() => sendDtmfTone(mockPc, '5')).toThrow(
        'No DTMF-capable audio sender on peer connection'
      )
    })
  })
})
