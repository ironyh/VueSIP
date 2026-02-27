import { ref } from 'vue'
import type {
  CodecPolicy,
  CodecCapabilities,
  MediaKind,
  CodecCapability,
  SdpTransformer,
} from './types'
import { DefaultCodecPolicy } from './types'

function getCapabilities(kind: MediaKind): CodecCapability[] {
  const sender = (globalThis as any).RTCRtpSender
  if (sender && typeof sender.getCapabilities === 'function') {
    const caps = sender.getCapabilities(kind as any)
    return (caps?.codecs ?? []) as CodecCapability[]
  }
  return []
}

function sortByPolicy(
  kind: MediaKind,
  caps: CodecCapability[],
  policy: CodecPolicy
): CodecCapability[] {
  const prefs = (policy[kind] ?? []).map((p) => ({ id: p.id.toLowerCase(), priority: p.priority }))
  const score = (c: CodecCapability) => {
    const short = c.mimeType.split('/')[1]?.toLowerCase() ?? ''
    return prefs.find((p) => short.includes(p.id))?.priority ?? 0
  }
  return [...caps].sort((a, b) => score(b) - score(a))
}

/**
 * Composable for codec capability inspection and preference (audio/video).
 *
 * @experimental This API is preview and may change in future releases.
 * @param initialPolicy - Optional codec policy (e.g. prefer Opus/VP8).
 * @param transformer - Optional SDP transformer for fallback when transceiver API is unavailable.
 */
export function useCodecs(initialPolicy?: CodecPolicy, transformer?: SdpTransformer) {
  const policy = ref<CodecPolicy>(initialPolicy ?? DefaultCodecPolicy)

  function getLocalCapabilities(): CodecCapabilities {
    return {
      audio: getCapabilities('audio'),
      video: getCapabilities('video'),
    }
  }

  function negotiate(local: CodecCapabilities, remote?: CodecCapabilities) {
    // If remote unknown, just order by local policy
    const audio = sortByPolicy('audio', local.audio, policy.value)
    const video = sortByPolicy('video', local.video, policy.value)

    if (!remote) return { audio, video }

    const filterMutual = (kind: MediaKind, ordered: CodecCapability[]) => {
      const remoteMime = new Set((remote[kind] ?? []).map((c) => c.mimeType.toLowerCase()))
      return ordered.filter((c) => remoteMime.has(c.mimeType.toLowerCase()))
    }
    return {
      audio: filterMutual('audio', audio),
      video: filterMutual('video', video),
    }
  }

  function applyToTransceiver(transceiver: RTCRtpTransceiver, kind: MediaKind) {
    const caps = getCapabilities(kind)
    const ordered = sortByPolicy(kind, caps, policy.value)
    const setPrefs = (transceiver as any).setCodecPreferences
    if (typeof setPrefs === 'function') {
      setPrefs.call(transceiver, ordered)
    }
  }

  function transformSdp(sdp: string, kind: MediaKind): string {
    if (!transformer) return sdp
    const caps = getCapabilities(kind)
    const ordered = sortByPolicy(kind, caps, policy.value)
    const preferred = ordered.map((c) => c.mimeType)
    return transformer.reorderCodecs(sdp, kind, preferred)
  }

  return {
    policy,
    getLocalCapabilities,
    negotiate,
    applyToTransceiver,
    transformSdp,
  }
}
