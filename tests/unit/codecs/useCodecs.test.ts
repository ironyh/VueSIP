import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCodecs } from '../../../src/codecs/useCodecs.ts'
import { DefaultCodecPolicy } from '../../../src/codecs/types.ts'

declare global {
  var RTCRtpSender: any
}

describe('useCodecs', () => {
  beforeEach(() => {
    global.RTCRtpSender = {
      getCapabilities: (kind: 'audio' | 'video') => {
        if (kind === 'audio') {
          return {
            codecs: [
              { mimeType: 'audio/PCMU' },
              { mimeType: 'audio/OPUS' },
              { mimeType: 'audio/PCMA' },
            ],
          }
        }
        return { codecs: [{ mimeType: 'video/H264' }, { mimeType: 'video/VP8' }] }
      },
    }
  })

  it('orders codecs by policy preference', () => {
    const { getLocalCapabilities, negotiate } = useCodecs(DefaultCodecPolicy)
    const local = getLocalCapabilities()
    const ordered = negotiate(local)
    expect(ordered.audio[0].mimeType.toLowerCase()).toContain('opus')
    expect(ordered.video[0].mimeType.toLowerCase()).toContain('vp8')
  })

  it('applies preferences to transceiver when available', () => {
    const { applyToTransceiver } = useCodecs(DefaultCodecPolicy)
    const setCodecPreferences = vi.fn()
    const transceiver = { setCodecPreferences } as unknown as RTCRtpTransceiver
    applyToTransceiver(transceiver, 'audio')
    expect(setCodecPreferences).toHaveBeenCalledTimes(1)
  })

  it('respects custom policy override', () => {
    const custom = {
      ...DefaultCodecPolicy,
      audio: [
        { id: 'pcmu', priority: 100 },
        { id: 'opus', priority: 50 },
      ],
      video: [{ id: 'h264', priority: 100 }],
    }
    const { getLocalCapabilities, negotiate } = useCodecs(custom)
    const ordered = negotiate(getLocalCapabilities())
    expect(ordered.audio[0].mimeType.toLowerCase()).toContain('pcmu')
  })

  describe('transformSdp', () => {
    it('returns SDP unchanged when no transformer provided', () => {
      const { transformSdp } = useCodecs(DefaultCodecPolicy)
      const sdp = 'v=0\r\nm=audio 8000 RTP/AVP 0 8 101\r\n'
      const result = transformSdp(sdp, 'audio')
      expect(result).toBe(sdp)
    })

    it('calls transformer with reordered codec preferences', () => {
      const mockTransformer = {
        reorderCodecs: vi.fn((sdp: string, kind: string, preferred: string[]) => {
          return sdp + '<!-- reordered: ' + preferred.join(',') + ' -->'
        }),
      }
      const { transformSdp } = useCodecs(DefaultCodecPolicy, mockTransformer)
      const sdp = 'v=0\r\nm=audio 8000 RTP/AVP 0 8 101\r\n'
      const result = transformSdp(sdp, 'audio')
      expect(mockTransformer.reorderCodecs).toHaveBeenCalledWith(
        sdp,
        'audio',
        expect.arrayContaining(['audio/OPUS', 'audio/PCMU', 'audio/PCMA'])
      )
      expect(result).toContain('reordered')
    })

    it('transforms video SDP with video codec preferences', () => {
      const mockTransformer = {
        reorderCodecs: vi.fn((sdp: string, kind: string, preferred: string[]) => {
          return sdp + '<!-- video: ' + preferred[0] + ' -->'
        }),
      }
      const { transformSdp } = useCodecs(DefaultCodecPolicy, mockTransformer)
      const sdp = 'v=0\r\nm=video 8000 RTP/AVP 96 97\r\n'
      const result = transformSdp(sdp, 'video')
      // Mock provides H264 and VP8, ordered by policy priority (vp9 > vp8 > h264)
      // But only H264 and VP8 are available in mock, so VP8 should be first
      expect(mockTransformer.reorderCodecs).toHaveBeenCalledWith(
        sdp,
        'video',
        expect.arrayContaining(['video/VP8', 'video/H264'])
      )
      expect(result).toContain('video: video/VP8')
    })

    it('uses custom policy when transforming', () => {
      const custom = {
        ...DefaultCodecPolicy,
        audio: [{ id: 'pcma', priority: 100 }],
        video: [{ id: 'h264', priority: 100 }],
      }
      const mockTransformer = {
        reorderCodecs: vi.fn((sdp: string, kind: string, preferred: string[]) => {
          return sdp + '<!-- ' + preferred[0] + ' -->'
        }),
      }
      const { transformSdp } = useCodecs(custom, mockTransformer)
      const sdp = 'v=0\r\nm=audio 8000 RTP/AVP 0 8\r\n'
      transformSdp(sdp, 'audio')
      expect(mockTransformer.reorderCodecs).toHaveBeenCalledWith(
        sdp,
        'audio',
        expect.arrayContaining(['audio/PCMA'])
      )
    })
  })
})
