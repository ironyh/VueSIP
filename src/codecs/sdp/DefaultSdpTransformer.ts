import type { MediaKind, SdpTransformer } from '../types'

/**
 * Default SDP transformer that performs minimal, safe codec reordering.
 *
 * @experimental Part of the codecs preview API; may change in future releases.
 *
 * - Reorders payload types on the target m= line (audio/video) based on
 *   preferred mime types passed in (e.g., ['audio/opus', 'audio/pcmu']).
 * - Keeps all other payloads in their original relative order.
 * - Preserves telephone-event, CN, and any other non-preferred payloads.
 * - Idempotent when the order already matches preferences.
 */
export class DefaultSdpTransformer implements SdpTransformer {
  reorderCodecs(sdp: string, kind: MediaKind, preferredMimeTypes: string[]): string {
    try {
      if (!sdp || typeof sdp !== 'string') return sdp
      const lines = sdp.split(/\r?\n/)

      // Find the index of the first m=<kind> line
      let targetMediaIndex = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.startsWith(`m=${kind}`)) {
          targetMediaIndex = i
          break
        }
      }

      // If no target media section found, return original
      if (targetMediaIndex === -1) return sdp

      // Build map from payload type -> mime (e.g., 111 -> audio/opus)
      // Collect all rtpmap lines from the SDP - we need them to map payload types to codecs
      // (rtpmap lines can appear anywhere in the SDP after the m= lines)
      const ptToMime = new Map<string, string>()
      for (let i = targetMediaIndex; i < lines.length; i++) {
        const line = lines[i]

        // a=rtpmap:<pt> <codec>/<clock>[/channels]
        // Example: a=rtpmap:111 opus/48000/2
        const m = line?.match(/^a=rtpmap:(\d+)\s+([^\s/]+)/i)
        if (m && m[1] && m[2]) {
          const pt: string = m[1]
          const codec: string = m[2]
          ptToMime.set(pt, `${kind.toUpperCase()}/${codec.toUpperCase()}`)
        }
      }

      // If no payload types found, return original
      if (ptToMime.size === 0) return sdp

      // Normalize preferred mimes to upper-case for case-insensitive matching
      const preferredUpper = preferredMimeTypes.map((m) => m.toUpperCase())

      // Find and transform the target m= line
      for (let i = targetMediaIndex; i < lines.length; i++) {
        const line = lines[i]
        if (!line || !line.startsWith(`m=${kind}`)) continue

        // m=<kind> <port> <proto> <pt1> <pt2> ...
        const parts = line.split(/\s+/)
        if (parts.length < 4) return sdp // malformed, bail out

        const header = parts.slice(0, 3).join(' ')
        const payloads = parts.slice(3)

        // Sort payloads according to preferred mime order
        const scored = payloads.map((pt, idx) => {
          const mime = (ptToMime.get(pt) || '').toUpperCase()
          // Match by codec name (e.g., "AUDIO/OPUS" matches "OPUS" or "audio/opus")
          const score = preferredUpper.findIndex((p) => mime === p || mime.endsWith('/' + p))
          // Unknown or non-preferred mimes get large index to keep them at the end
          const rank = score === -1 ? Number.MAX_SAFE_INTEGER : score
          return { pt, idx, rank }
        })

        scored.sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank
          // Stable relative order for same-rank (non-preferred) payloads
          return a.idx - b.idx
        })

        const reordered = scored.map((s) => s.pt)
        lines[i] = `${header} ${reordered.join(' ')}`
        break // Only transform the first target m= section
      }

      return lines.join('\n')
    } catch (_e) {
      // On any parsing error, return original SDP unchanged
      return sdp
    }
  }
}

export default DefaultSdpTransformer
