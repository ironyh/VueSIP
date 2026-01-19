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

  it('preserves telephone-event and CN payloads while reordering preferred ones', () => {
    const sdp = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'm=audio 9 RTP/SAVPF 111 0 8 101 13',
      'a=rtpmap:111 opus/48000/2',
      'a=rtpmap:0 PCMU/8000',
      'a=rtpmap:8 PCMA/8000',
      'a=rtpmap:101 telephone-event/8000',
      'a=rtpmap:13 CN/8000',
    ].join('\n')
    const t = new DefaultSdpTransformer()
    const out = t.reorderCodecs(sdp, 'audio', ['audio/PCMU', 'audio/opus'])
    const mLine = out.split(/\r?\n/).find((l) => l.startsWith('m=audio'))!
    // Ensure 0 & 111 are ordered per preference, 8 stays before 101 and 13 to preserve relative order of non-preferred
    expect(mLine).toBe('m=audio 9 RTP/SAVPF 0 111 8 101 13')
  })

  it('leaves unknown payloads (without rtpmap) in relative order at the end', () => {
    const sdp = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'm=audio 9 RTP/SAVPF 111 126 0 8',
      'a=rtpmap:111 opus/48000/2',
      // 126 has no rtpmap mapping, should be treated as non-preferred and keep relative order among non-preferred
      'a=rtpmap:0 PCMU/8000',
      'a=rtpmap:8 PCMA/8000',
    ].join('\n')
    const t = new DefaultSdpTransformer()
    const out = t.reorderCodecs(sdp, 'audio', ['audio/PCMU', 'audio/opus'])
    const mLine = out.split(/\r?\n/).find((l) => l.startsWith('m=audio'))!
    // 0 then 111 (preferred), then keep 126 before 8 as in original among non-preferred
    expect(mLine).toBe('m=audio 9 RTP/SAVPF 0 111 126 8')
  })

  it('reorders video m= line using preferred mime types', () => {
    const sdp = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'm=video 9 RTP/SAVPF 96 97',
      'a=rtpmap:96 VP8/90000',
      'a=rtpmap:97 H264/90000',
    ].join('\n')
    const t = new DefaultSdpTransformer()
    // Prefer H264 over VP8
    const out = t.reorderCodecs(sdp, 'video', ['video/H264', 'video/VP8'])
    const mLine = out.split(/\r?\n/).find((l) => l.startsWith('m=video'))!
    expect(mLine).toBe('m=video 9 RTP/SAVPF 97 96')
  })

  it('only transforms the first matching m= section for the given kind', () => {
    const sdp = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'm=audio 9 RTP/SAVPF 111 0 8',
      'a=rtpmap:111 opus/48000/2',
      'a=rtpmap:0 PCMU/8000',
      'a=rtpmap:8 PCMA/8000',
      'm=audio 9 RTP/SAVPF 0 8 111',
      'a=rtpmap:111 OPUS/48000/2',
      'a=rtpmap:0 PCMU/8000',
      'a=rtpmap:8 PCMA/8000',
    ].join('\n')
    const t = new DefaultSdpTransformer()
    const out = t.reorderCodecs(sdp, 'audio', ['audio/PCMU', 'audio/opus'])
    const lines = out.split(/\r?\n/)
    const firstM = lines.find((l) => l.startsWith('m=audio'))!
    const secondM = lines.filter((l) => l.startsWith('m=audio'))[1]!
    expect(firstM).toBe('m=audio 9 RTP/SAVPF 0 111 8')
    // Second m=audio should remain unchanged
    expect(secondM).toBe('m=audio 9 RTP/SAVPF 0 8 111')
  })
})
