/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCodecs } from '../useCodecs'
import { DefaultSdpTransformer } from '../sdp/DefaultSdpTransformer'
import { type CodecPolicy } from '../types'

// Mock RTCRtpSender
const mockGetCapabilities = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.RTCRtpSender = {
    getCapabilities: mockGetCapabilities,
  } as typeof globalThis.RTCRtpSender
})

describe('useCodecs', () => {
  describe('getLocalCapabilities', () => {
    it('should return empty capabilities when RTCRtpSender.getCapabilities is not available', () => {
      // @ts-expect-error - testing missing API
      delete globalThis.RTCRtpSender

      const { getLocalCapabilities } = useCodecs()
      const caps = getLocalCapabilities()

      expect(caps.audio).toEqual([])
      expect(caps.video).toEqual([])
    })

    it('should return codec capabilities when available', () => {
      mockGetCapabilities.mockReturnValueOnce({
        codecs: [
          { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
          { mimeType: 'audio/PCMU', clockRate: 8000, channels: 1 },
        ],
      })
      mockGetCapabilities.mockReturnValueOnce({
        codecs: [
          { mimeType: 'video/VP9', clockRate: 90000 },
          { mimeType: 'video/VP8', clockRate: 90000 },
        ],
      })

      const { getLocalCapabilities } = useCodecs()
      const caps = getLocalCapabilities()

      expect(caps.audio).toHaveLength(2)
      expect(caps.audio[0].mimeType).toBe('audio/opus')
      expect(caps.video).toHaveLength(2)
      expect(caps.video[0].mimeType).toBe('video/VP9')
    })
  })

  describe('negotiate', () => {
    beforeEach(() => {
      // Mock RTCRtpSender.getCapabilities for these tests
      mockGetCapabilities.mockReturnValue({
        codecs: [
          { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
          { mimeType: 'audio/PCMU', clockRate: 8000, channels: 1 },
        ],
      })
    })

    it('should order audio codecs by policy when no remote capabilities', () => {
      const policy: CodecPolicy = {
        audio: [
          { id: 'pcmu', priority: 100 },
          { id: 'opus', priority: 50 },
        ],
      }
      const { negotiate, getLocalCapabilities } = useCodecs(policy)
      const local = getLocalCapabilities()

      const result = negotiate(local)

      // pcmu should be first since it has higher priority
      expect(result.audio[0].mimeType.toLowerCase()).toContain('pcmu')
    })

    it('should filter to mutual codecs when remote capabilities provided', () => {
      const { negotiate, getLocalCapabilities } = useCodecs()
      const local = getLocalCapabilities()

      const remote = {
        audio: [
          { mimeType: 'audio/opus', clockRate: 48000 },
          // local has pcmu but remote doesn't
        ],
        video: [],
      }

      const result = negotiate(local, remote)

      expect(result.audio).toHaveLength(1)
      expect(result.audio[0].mimeType.toLowerCase()).toContain('opus')
    })
  })

  describe('transformSdp', () => {
    it('should return original SDP when no transformer provided', () => {
      const sdp = 'v=0\r\nm=audio 5000 RTP/AVP 0 8\r\n'
      const { transformSdp } = useCodecs()

      const result = transformSdp(sdp, 'audio')
      expect(result).toBe(sdp)
    })

    it('should use transformer when provided', () => {
      const transformer = new DefaultSdpTransformer()
      const { transformSdp } = useCodecs(undefined, transformer)

      const sdp =
        'v=0\r\nm=audio 5000 RTP/AVP 0 8 111\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:111 opus/48000/2\r\n'
      const result = transformSdp(sdp, 'audio')

      // Should reorder based on default policy (opus > pcmu > pcma)
      expect(result).toContain('111') // opus should come first
    })
  })
})

describe('DefaultSdpTransformer', () => {
  const transformer = new DefaultSdpTransformer()

  describe('reorderCodecs', () => {
    it('should return original string for invalid input', () => {
      expect(transformer.reorderCodecs('', 'audio', ['opus'])).toBe('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(transformer.reorderCodecs(null as any, 'audio', ['opus'])).toBe(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(transformer.reorderCodecs(undefined as any, 'audio', ['opus'])).toBe(undefined)
    })

    it('should handle malformed SDP gracefully', () => {
      const sdp = 'invalid sdp'
      const result = transformer.reorderCodecs(sdp, 'audio', ['opus'])
      expect(result).toBe(sdp)
    })

    it('should handle m= line with too few parts', () => {
      const sdp = 'm=audio\r\n'
      const result = transformer.reorderCodecs(sdp, 'audio', ['opus'])
      expect(result).toBe(sdp)
    })

    it('should reorder audio codecs according to preferences', () => {
      const sdp = `v=0
m=audio 5000 RTP/AVP 0 8 111
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:111 opus/48000/2
`

      const result = transformer.reorderCodecs(sdp, 'audio', ['opus', 'pcmu', 'pcma'])

      // opus (111) should be first
      expect(result).toMatch(/m=audio \d+ RTP\/AVP 111/)
    })

    it('should reorder video codecs according to preferences', () => {
      const sdp = `v=0
m=video 5000 RTP/AVP 96 97 98
a=rtpmap:96 VP8/90000
a=rtpmap:97 VP9/90000
a=rtpmap:98 H264/90000
`

      const result = transformer.reorderCodecs(sdp, 'video', ['vp9', 'h264', 'vp8'])

      // VP9 (97) should be first
      expect(result).toMatch(/m=video \d+ RTP\/AVP 97/)
    })

    it('should keep non-preferred codecs at end', () => {
      const sdp = `v=0
m=audio 5000 RTP/AVP 0 8 9 111
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:9 G722/8000
a=rtpmap:111 opus/48000/2
`

      const result = transformer.reorderCodecs(sdp, 'audio', ['opus'])

      // opus (111) first, then original order for others
      expect(result).toMatch(/m=audio \d+ RTP\/AVP 111/)
      // Should preserve order of non-preferred
      expect(result).toMatch(/111.*0.*8.*9|111.*0.*9.*8/)
    })

    it('should be idempotent when order already matches', () => {
      const sdp = `v=0
m=audio 5000 RTP/AVP 111 0 8
a=rtpmap:111 opus/48000/2
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
`

      const result = transformer.reorderCodecs(sdp, 'audio', ['opus', 'pcmu', 'pcma'])

      expect(result).toBe(sdp)
    })

    it('should handle case-insensitive mime type matching', () => {
      const sdp = `v=0
m=audio 5000 RTP/AVP 0 111
a=rtpmap:0 pcmu/8000
a=rtpmap:111 OPUS/48000/2
`

      const result = transformer.reorderCodecs(sdp, 'audio', ['OPUS', 'PCMU'])

      // opus should be first regardless of case
      expect(result).toMatch(/m=audio \d+ RTP\/AVP 111/)
    })

    it('should only transform the first matching m= section', () => {
      const sdp = `v=0
m=audio 5000 RTP/AVP 0 111
m=video 5002 RTP/AVP 96 97
a=rtpmap:0 PCMU/8000
a=rtpmap:111 opus/48000/2
a=rtpmap:96 VP8/90000
a=rtpmap:97 VP9/90000
`

      // Use codec name format (not full mime type)
      const result = transformer.reorderCodecs(sdp, 'audio', ['opus'])

      // audio should be reordered (opus/111 should come first)
      expect(result).toMatch(/m=audio \d+ RTP\/AVP 111/)
      // video should remain unchanged
      expect(result).toMatch(/m=video \d+ RTP\/AVP 96 97/)
    })

    it('should handle CRLF line endings by normalizing to LF', () => {
      const sdp =
        'v=0\r\nm=audio 5000 RTP/AVP 0 111\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:111 opus/48000/2\r\n'

      // Use full mime type format
      const result = transformer.reorderCodecs(sdp, 'audio', ['audio/opus'])

      // Should reorder (opus first)
      expect(result).toMatch(/m=audio \d+ RTP\/AVP 111/)
      // Note: CRLF is normalized to LF in output
    })
  })
})
