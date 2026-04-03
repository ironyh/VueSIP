/**
 * PBX Compatibility Scoring Engine
 *
 * Reads the JSON scoring framework and computes weighted compatibility scores
 * for any PBX platform. Produces per-category and overall scores with gap analysis.
 *
 * @module pbx-adapters/compatibility
 */

import scoringData from './pbx-compatibility-scoring.json'

// ── Types ──────────────────────────────────────────────────────────────────

export type Criticality = 'critical' | 'high' | 'medium' | 'low'

export interface FeatureDef {
  label: string
  weight: number
  criticality: Criticality
  description: string
}

export interface CategoryDef {
  label: string
  weight: number
  criticality: Criticality
  description: string
  features: Record<string, FeatureDef>
}

export interface PlatformDef {
  name: string
  versions: string[]
  scores: Record<string, Record<string, number>>
  knownLimitations: string[]
  configurationComplexity: string
  documentation: string
}

export interface ThresholdDef {
  min: number
  max: number
  label: string
  color: string
}

export interface FeatureResult {
  key: string
  label: string
  criticality: Criticality
  score: number
  maxScore: number
  weightedScore: number
  gap: boolean
}

export interface CategoryResult {
  key: string
  label: string
  criticality: Criticality
  weight: number
  rawScore: number
  weightedScore: number
  maxWeightedScore: number
  features: FeatureResult[]
  gaps: FeatureResult[]
}

export interface CompatibilityResult {
  platform: string
  versions: string[]
  overallScore: number
  compatibilityLevel: string
  compatibilityColor: string
  categories: CategoryResult[]
  criticalGaps: FeatureResult[]
  knownLimitations: string[]
  configurationComplexity: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const GAP_THRESHOLD = 3 // score < 3 is considered a gap

function getThreshold(score: number): ThresholdDef {
  const thresholds = scoringData.scoring.thresholds as Record<string, ThresholdDef>
  for (const t of Object.values(thresholds)) {
    if (score >= t.min && score <= t.max) return t
  }
  return thresholds['poor']!
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Score a platform from the built-in dataset.
 */
export function scorePlatform(platformKey: string): CompatibilityResult {
  const platform = (scoringData.platforms as Record<string, PlatformDef>)[platformKey]
  if (!platform) {
    throw new Error(
      `Unknown platform: "${platformKey}". Available: ${Object.keys(scoringData.platforms).join(', ')}`
    )
  }
  return computeScore(platformKey, platform)
}

/**
 * Score an arbitrary platform by providing raw feature scores.
 *
 * `rawScores` mirrors the structure: `{ categoryKey: { featureKey: 0-5 } }`.
 */
export function scoreCustomPlatform(
  name: string,
  rawScores: Record<string, Record<string, number>>,
  knownLimitations: string[] = [],
  configurationComplexity = 'unknown'
): CompatibilityResult {
  return computeScore(name, {
    name,
    versions: [],
    scores: rawScores,
    knownLimitations,
    configurationComplexity,
    documentation: '',
  })
}

/**
 * List all built-in platform keys.
 */
export function listPlatforms(): string[] {
  return Object.keys(scoringData.platforms)
}

/**
 * Get the full category/feature schema (useful for building UI or validation).
 */
export function getSchema() {
  return scoringData.categories as Record<string, CategoryDef>
}

/**
 * Compute a gap-only report for a platform (features scoring below threshold).
 */
export function gapReport(platformKey: string): FeatureResult[] {
  const result = scorePlatform(platformKey)
  return result.criticalGaps
}

// ── Internal ───────────────────────────────────────────────────────────────

function computeScore(platformKey: string, platform: PlatformDef): CompatibilityResult {
  const categories = scoringData.categories as Record<string, CategoryDef>
  const categoryResults: CategoryResult[] = []
  const allGaps: FeatureResult[] = []
  let totalWeighted = 0
  let totalMaxWeighted = 0

  for (const [catKey, catDef] of Object.entries(categories)) {
    const platformCatScores = platform.scores[catKey] ?? {}
    const featureResults: FeatureResult[] = []
    const catGaps: FeatureResult[] = []
    let catWeighted = 0
    let catMaxWeighted = 0

    for (const [featKey, featDef] of Object.entries(catDef.features)) {
      const raw = platformCatScores[featKey] ?? 0
      const normalized = raw / 5 // 0..1
      const featWeighted = normalized * featDef.weight
      const featMaxWeighted = featDef.weight
      const isGap = raw < GAP_THRESHOLD

      const fr: FeatureResult = {
        key: featKey,
        label: featDef.label,
        criticality: featDef.criticality,
        score: raw,
        maxScore: 5,
        weightedScore: Math.round(featWeighted * 1000) / 1000,
        gap: isGap,
      }

      featureResults.push(fr)
      catWeighted += featWeighted
      catMaxWeighted += featMaxWeighted
      if (isGap) {
        catGaps.push(fr)
        if (featDef.criticality === 'critical' || featDef.criticality === 'high') {
          allGaps.push(fr)
        }
      }
    }

    const rawCatScore = catMaxWeighted > 0 ? (catWeighted / catMaxWeighted) * 100 : 0
    const catWeightedScore = catWeighted * catDef.weight
    const catMaxWeightedScore = catMaxWeighted * catDef.weight

    categoryResults.push({
      key: catKey,
      label: catDef.label,
      criticality: catDef.criticality,
      weight: catDef.weight,
      rawScore: Math.round(rawCatScore * 10) / 10,
      weightedScore: Math.round(catWeightedScore * 1000) / 1000,
      maxWeightedScore: Math.round(catMaxWeightedScore * 1000) / 1000,
      features: featureResults,
      gaps: catGaps,
    })

    totalWeighted += catWeightedScore
    totalMaxWeighted += catMaxWeightedScore
  }

  const overallScore =
    totalMaxWeighted > 0 ? Math.round((totalWeighted / totalMaxWeighted) * 100 * 10) / 10 : 0

  const threshold = getThreshold(overallScore)

  return {
    platform: platformKey,
    versions: platform.versions,
    overallScore,
    compatibilityLevel: threshold.label,
    compatibilityColor: threshold.color,
    categories: categoryResults,
    criticalGaps: allGaps,
    knownLimitations: platform.knownLimitations,
    configurationComplexity: platform.configurationComplexity,
  }
}
