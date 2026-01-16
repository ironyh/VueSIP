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
})
