export type MediaKind = 'audio' | 'video'

export interface CodecPreference {
  id: string
  priority: number
  fmtp?: Record<string, string | number | boolean>
}

export interface CodecPolicy {
  audio?: CodecPreference[]
  video?: CodecPreference[]
  preferTransceiverApi?: boolean
  allowLegacyFallbacks?: boolean
}

export interface CodecCapability {
  mimeType: string
  clockRate?: number
  channels?: number
  sdpFmtpLine?: string
}

export interface CodecCapabilities {
  audio: CodecCapability[]
  video: CodecCapability[]
}

export interface CodecMatch {
  kind: MediaKind
  preferred: CodecCapability[]
  unsupported: CodecCapability[]
}

export interface SdpTransformer {
  reorderCodecs(sdp: string, kind: MediaKind, preferredMimeTypes: string[]): string
}

export const DefaultCodecPolicy: CodecPolicy = {
  preferTransceiverApi: true,
  allowLegacyFallbacks: true,
  audio: [
    { id: 'opus', priority: 100 },
    { id: 'pcmu', priority: 50 },
    { id: 'pcma', priority: 45 },
  ],
  video: [
    { id: 'vp9', priority: 100 },
    { id: 'vp8', priority: 90 },
    { id: 'h264', priority: 70 },
  ],
}
