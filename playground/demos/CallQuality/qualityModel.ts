export interface QualitySnapshot {
  jitter: number
  loss: number
  rtt: number
}

export type QualityTier = 'ok' | 'warn' | 'bad'

export const metricTier = (
  value: number,
  warn: number,
  bad: number
): QualityTier => (value >= bad ? 'bad' : value >= warn ? 'warn' : 'ok')

export const calculateMos = ({ jitter, loss, rtt }: QualitySnapshot): number => {
  const raw = 4.5 - loss * 0.2 - jitter * 0.008 - rtt * 0.0025
  return Math.max(1, Math.min(4.5, raw))
}

export const getQualityVerdict = (
  mos: number
): { tier: QualityTier; label: 'Excellent' | 'Acceptable' | 'Degraded' } => {
  if (mos >= 4) return { tier: 'ok', label: 'Excellent' }
  if (mos >= 3.4) return { tier: 'warn', label: 'Acceptable' }
  return { tier: 'bad', label: 'Degraded' }
}

export const getNetworkBanner = (
  snapshot: QualitySnapshot
): { severity: QualityTier; title: string; detail: string } => {
  if (snapshot.loss >= 3 || snapshot.rtt >= 300 || snapshot.jitter >= 60) {
    return {
      severity: 'bad',
      title: 'Audio may drop out',
      detail: 'Show a persistent danger banner, freeze non-essential animations, and offer audio-only fallback.',
    }
  }

  if (snapshot.loss >= 1 || snapshot.rtt >= 150 || snapshot.jitter >= 30) {
    return {
      severity: 'warn',
      title: 'Network is unstable',
      detail: 'Warn the user early, keep controls visible, and suggest moving to a stronger connection before speech becomes robotic.',
    }
  }

  return {
    severity: 'ok',
    title: 'Stable connection',
    detail: 'Keep the UI quiet. Quality indicators can stay compact until the signal worsens.',
  }
}
