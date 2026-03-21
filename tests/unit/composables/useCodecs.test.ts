import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCodecs } from '../../../src/codecs/useCodecs'
import type { CodecPolicy, CodecCapabilities } from '../../../src/codecs/types'

// Mock RTCRtpSender
const mockGetCapabilities = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Mock global RTCRtpSender
  globalThis.RTCRtpSender = class MockRTCRtpSender {
    static getCapabilities = mockGetCapabilities
  } as any
})

describe('useCodecs', () => {
  describe('getLocalCapabilities', () => {
    it('should return empty array when RTCRtpSender.getCapabilities is not available', () => {
      // Remove the mock to simulate unavailable API
      delete (globalThis as any).RTCRtpSender

      const { getLocalCapabilities } = useCodecs()
      const caps = getLocalCapabilities()

      expect(caps.audio).toEqual([])
      expect(caps.video).toEqual([])
    })

    it('should return codec capabilities when available', () => {
      mockGetCapabilities.mockReturnValue({
        codecs: [
          { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
          { mimeType: 'audio/PCMU', clockRate: 8000 },
        ],
      })

      const { getLocalCapabilities } = useCodecs()
      const caps = getLocalCapabilities()

      expect(caps.audio).toHaveLength(2)
      expect(caps.audio[0].mimeType).toBe('audio/opus')
      expect(mockGetCapabilities).toHaveBeenCalledWith('audio')
    })

    it('should return video capabilities', () => {
      mockGetCapabilities.mockReturnValue({
        codecs: [{ mimeType: 'video/VP8' }, { mimeType: 'video/VP9' }],
      })

      const { getLocalCapabilities } = useCodecs()
      const caps = getLocalCapabilities()

      expect(caps.video).toHaveLength(2)
      expect(mockGetCapabilities).toHaveBeenCalledWith('video')
    })

    it('should handle null capabilities gracefully', () => {
      mockGetCapabilities.mockReturnValue(null)

      const { getLocalCapabilities } = useCodecs()
      const caps = getLocalCapabilities()

      expect(caps.audio).toEqual([])
      expect(caps.video).toEqual([])
    })
  })

  describe('negotiate', () => {
    it('should order audio codecs by policy priority', () => {
      const policy: CodecPolicy = {
        audio: [
          { id: 'pcmu', priority: 100 },
          { id: 'opus', priority: 50 },
        ],
      }

      const local: CodecCapabilities = {
        audio: [
          { mimeType: 'audio/opus', clockRate: 48000 },
          { mimeType: 'audio/PCMU', clockRate: 8000 },
        ],
        video: [],
      }

      const { negotiate } = useCodecs(policy)
      const result = negotiate(local)

      // PCMU should be first due to higher priority
      expect(result.audio[0].mimeType).toBe('audio/PCMU')
      expect(result.audio[1].mimeType).toBe('audio/opus')
    })

    it('should order video codecs by policy priority', () => {
      const policy: CodecPolicy = {
        video: [
          { id: 'vp8', priority: 100 },
          { id: 'vp9', priority: 50 },
        ],
      }

      const local: CodecCapabilities = {
        audio: [],
        video: [{ mimeType: 'video/VP9' }, { mimeType: 'video/VP8' }],
      }

      const { negotiate } = useCodecs(policy)
      const result = negotiate(local)

      // VP8 should be first due to higher priority
      expect(result.video[0].mimeType).toBe('video/VP8')
      expect(result.video[1].mimeType).toBe('video/VP9')
    })

    it('should filter to mutual codecs when remote is provided', () => {
      const policy: CodecPolicy = {
        audio: [
          { id: 'opus', priority: 100 },
          { id: 'pcmu', priority: 50 },
        ],
      }

      const local: CodecCapabilities = {
        audio: [
          { mimeType: 'audio/opus' },
          { mimeType: 'audio/PCMU' },
          { mimeType: 'audio/G722' }, // Not in remote
        ],
        video: [],
      }

      const remote: CodecCapabilities = {
        audio: [{ mimeType: 'audio/opus' }, { mimeType: 'audio/PCMU' }],
        video: [],
      }

      const { negotiate } = useCodecs(policy)
      const result = negotiate(local, remote)

      // Should only contain mutual codecs
      expect(result.audio).toHaveLength(2)
      expect(result.audio.map((c) => c.mimeType)).toContain('audio/opus')
      expect(result.audio.map((c) => c.mimeType)).toContain('audio/PCMU')
    })

    it('should be case-insensitive when matching mime types', () => {
      const policy: CodecPolicy = {
        audio: [{ id: 'opus', priority: 100 }],
      }

      const local: CodecCapabilities = {
        audio: [
          { mimeType: 'audio/OPUS' }, // uppercase
        ],
        video: [],
      }

      const remote: CodecCapabilities = {
        audio: [
          { mimeType: 'audio/opus' }, // lowercase
        ],
        video: [],
      }

      const { negotiate } = useCodecs(policy)
      const result = negotiate(local, remote)

      expect(result.audio).toHaveLength(1)
    })
  })

  describe('policy', () => {
    it('should use default policy when none provided', () => {
      const { policy } = useCodecs()

      expect(policy.value).toBeDefined()
      expect(policy.value.audio).toBeDefined()
      expect(policy.value.video).toBeDefined()
    })

    it('should use provided initial policy', () => {
      const customPolicy: CodecPolicy = {
        audio: [{ id: 'pcmu', priority: 100 }],
      }

      const { policy } = useCodecs(customPolicy)

      expect(policy.value.audio).toEqual([{ id: 'pcmu', priority: 100 }])
    })
  })

  describe('applyToTransceiver', () => {
    it('should call setCodecPreferences when available', () => {
      const mockSetCodecPreferences = vi.fn()
      const mockTransceiver = {
        setCodecPreferences: mockSetCodecPreferences,
      } as any

      mockGetCapabilities.mockReturnValue({
        codecs: [{ mimeType: 'audio/opus' }, { mimeType: 'audio/PCMU' }],
      })

      const policy: CodecPolicy = {
        audio: [{ id: 'pcmu', priority: 100 }],
      }

      const { applyToTransceiver } = useCodecs(policy)
      applyToTransceiver(mockTransceiver, 'audio')

      expect(mockSetCodecPreferences).toHaveBeenCalled()
    })

    it('should not fail when setCodecPreferences is not available', () => {
      const mockTransceiver = {} as RTCRtpTransceiver

      mockGetCapabilities.mockReturnValue({
        codecs: [{ mimeType: 'audio/opus' }],
      })

      const { applyToTransceiver } = useCodecs()

      // Should not throw
      expect(() => applyToTransceiver(mockTransceiver, 'audio')).not.toThrow()
    })
  })

  describe('transformSdp', () => {
    it('should return original SDP when no transformer provided', () => {
      const { transformSdp } = useCodecs()
      const sdp = 'v=0\r\ns=Test\r\n'

      const result = transformSdp(sdp, 'audio')

      expect(result).toBe(sdp)
    })

    it('should call transformer when provided', () => {
      const mockTransformer = {
        reorderCodecs: vi.fn().mockReturnValue('transformed SDP'),
      }

      mockGetCapabilities.mockReturnValue({
        codecs: [{ mimeType: 'audio/opus' }],
      })

      const { transformSdp } = useCodecs(undefined, mockTransformer)
      const result = transformSdp('original SDP', 'audio')

      expect(mockTransformer.reorderCodecs).toHaveBeenCalledWith('original SDP', 'audio', [
        'audio/opus',
      ])
      expect(result).toBe('transformed SDP')
    })
  })
})
