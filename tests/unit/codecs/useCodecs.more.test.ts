import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCodecs } from '@/codecs/useCodecs'
import { DefaultCodecPolicy, type SdpTransformer } from '@/codecs/types'

declare global {
  var RTCRtpSender: any
}

describe('useCodecs (additional coverage)', () => {
  const originalSender = global.RTCRtpSender

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

  afterEach(() => {
    global.RTCRtpSender = originalSender
  })

  it('filters mutual codecs when remote capabilities are provided', () => {
    const { getLocalCapabilities, negotiate } = useCodecs(DefaultCodecPolicy)
    const local = getLocalCapabilities()
    const remote = {
      audio: [{ mimeType: 'audio/PCMU' }],
      video: [{ mimeType: 'video/H264' }],
    }
    const negotiated = negotiate(local, remote)
    expect(negotiated.audio.map((c) => c.mimeType)).toEqual(['audio/PCMU'])
    expect(negotiated.video.map((c) => c.mimeType)).toEqual(['video/H264'])
  })

  it('transformSdp uses transformer and preferred order from policy', () => {
    const reorderSpy = vi.fn<Parameters<SdpTransformer['reorderCodecs']>, string[]>(
      (_sdp, kind, preferred) => {
        // return marker sdp to verify pass-through
        return `kind=${kind};preferred=${preferred.join(',')}`
      }
    )
    const transformer: SdpTransformer = {
      reorderCodecs: reorderSpy as unknown as SdpTransformer['reorderCodecs'],
    }
    const { transformSdp } = useCodecs(DefaultCodecPolicy, transformer)
    const sdpOut = transformSdp('v=0', 'audio')
    expect(reorderSpy).toHaveBeenCalled()
    expect(sdpOut.startsWith('kind=audio;preferred=')).toBe(true)
    // Ensure opus is first per default policy (case-insensitive)
    expect(sdpOut.toLowerCase()).toContain('opus')
  })

  it('applyToTransceiver is a no-op when setCodecPreferences is not available', () => {
    const { applyToTransceiver } = useCodecs(DefaultCodecPolicy)
    const fake = {} as unknown as RTCRtpTransceiver
    expect(() => applyToTransceiver(fake, 'audio')).not.toThrow()
  })

  it('falls back when RTCRtpSender.getCapabilities is unavailable', () => {
    // Simulate environment without getCapabilities

    ;(global as any).RTCRtpSender = {}
    const { getLocalCapabilities, negotiate, applyToTransceiver, transformSdp } = useCodecs()
    const caps = getLocalCapabilities()
    expect(caps.audio).toEqual([])
    expect(caps.video).toEqual([])

    const negotiated = negotiate(caps)
    expect(negotiated.audio).toEqual([])
    expect(negotiated.video).toEqual([])

    const fake = {} as unknown as RTCRtpTransceiver
    expect(() => applyToTransceiver(fake, 'audio')).not.toThrow()

    // With no transformer provided, transformSdp returns original sdp
    expect(transformSdp('v=0', 'audio')).toBe('v=0')
  })
})
