import { describe, it, expect } from 'vitest'
import { DefaultSdpTransformer } from '@/codecs/sdp/DefaultSdpTransformer'

const baseSdp = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 RTP/SAVPF 111 0 8',
  'a=rtpmap:111 opus/48000/2',
  'a=rtpmap:0 PCMU/8000',
  'a=rtpmap:8 PCMA/8000',
].join('\n')

describe('DefaultSdpTransformer', () => {
  it('reorders m= payload types according to preferred mime order', () => {
    const t = new DefaultSdpTransformer()
    const out = t.reorderCodecs(baseSdp, 'audio', ['audio/PCMU', 'audio/opus'])
    const mLine = out.split(/\r?\n/).find((l) => l.startsWith('m=audio'))!
    // PCMU (0) should come before opus (111), then remaining (8)
    expect(mLine).toBe('m=audio 9 RTP/SAVPF 0 111 8')
  })

  it('is idempotent when preferred order matches current order', () => {
    const t = new DefaultSdpTransformer()
    const out = t.reorderCodecs(baseSdp, 'audio', ['audio/opus', 'audio/pcmu', 'audio/pcma'])
    const mLine = out.split(/\r?\n/).find((l) => l.startsWith('m=audio'))!
    expect(mLine).toBe('m=audio 9 RTP/SAVPF 111 0 8')
  })

  it('returns original sdp if m= line not found', () => {
    const t = new DefaultSdpTransformer()
    const sdp = ['v=0', 's=-', 'a=rtpmap:111 opus/48000/2'].join('\n')
    const out = t.reorderCodecs(sdp, 'audio', ['audio/opus'])
    expect(out).toBe(sdp)
  })

  it('returns original sdp on parsing errors', () => {
    const t = new DefaultSdpTransformer()
    // Pass a bad value to trigger runtime failure inside transformer
    const out = t.reorderCodecs(undefined as unknown as string, 'audio', ['audio/opus'])
    expect(out).toBe(undefined as unknown as string)
  })
})
