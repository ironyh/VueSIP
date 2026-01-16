import type { MediaKind, SdpTransformer } from '../types'

/**
 * Minimal SDP transformer that reorders payload types in m= lines according to preferred mime types.
 * NOTE: Conservative and idempotent; does not change fmtp params.
 */
export class DefaultSdpTransformer implements SdpTransformer {
  reorderCodecs(sdp: string, kind: MediaKind, preferredMimeTypes: string[]): string {
    try {
      const lines = sdp.split(/\r?\n/)
      const mimeToPt: Record<string, string[]> = {}
      const rtpmapRe = /^a=rtpmap:(\d+)\s+([^/]+)\//i
      for (const line of lines) {
        const m = line.match(rtpmapRe)
        if (m) {
          const pt = m[1]
          const codec = m[2].toLowerCase()
          const mime = `${kind}/${codec}`.toLowerCase()
          mimeToPt[mime] = mimeToPt[mime] || []
          mimeToPt[mime].push(pt)
        }
      }

      const mIndex = lines.findIndex((l) => l.startsWith(`m=${kind}`))
      if (mIndex === -1) return sdp
      const parts = lines[mIndex].split(' ')
      const header = parts.slice(0, 3) // m=<kind> <port> <proto>
      const pts = parts.slice(3)

      const preferredPts: string[] = []
      for (const mime of preferredMimeTypes.map((m) => m.toLowerCase())) {
        const ptsFor = mimeToPt[mime]
        if (ptsFor) {
          for (const pt of ptsFor) {
            if (pts.includes(pt) && !preferredPts.includes(pt)) preferredPts.push(pt)
          }
        }
      }

      const remaining = pts.filter((pt) => !preferredPts.includes(pt))
      const reordered = [...header, ...preferredPts, ...remaining].join(' ')
      const newLines = [...lines]
      newLines[mIndex] = reordered
      return newLines.join('\n')
    } catch {
      return sdp
    }
  }
}
