/**
 * PBX Compatibility Scoring Framework
 *
 * Provides a weighted scoring system that rates VueSIP compatibility
 * with different PBX platforms. Scores are derived from a JSON schema
 * with feature categories and criticality weights.
 *
 * @example
 * ```ts
 * import { scorePlatform, listPlatforms } from './compatibility';
 *
 * const result = scorePlatform('asterisk');
 * console.log(`${result.platform}: ${result.overallScore}% (${result.compatibilityLevel})`);
 * result.categories.forEach(cat => {
 *   console.log(`  ${cat.label}: ${cat.rawScore}%`);
 *   cat.gaps.forEach(g => console.log(`    ⚠ ${g.label}: ${g.score}/5 (${g.criticality})`));
 * });
 * ```
 *
 * @module pbx-adapters/compatibility
 */

export {
  scorePlatform,
  scoreCustomPlatform,
  listPlatforms,
  getSchema,
  gapReport,
  type Criticality,
  type FeatureDef,
  type CategoryDef,
  type PlatformDef,
  type FeatureResult,
  type CategoryResult,
  type CompatibilityResult,
} from './pbx-compatibility-scorer'

export {
  createSnapshot,
  trackResult,
  getRegressionHistory,
  getLatestSnapshots,
  getPlatformReports,
  compareVersions,
  exportHistoryJson,
  importHistoryJson,
  clearHistory,
  type RegressionSeverity,
  type ScoreSnapshot,
  type RegressionEntry,
  type RegressionReport,
  type RegressionHistory,
} from './pbx-regression-tracker'

export {
  generateFullReport,
  renderMarkdownReport,
  renderJsonReport,
  renderRegressionReport,
  exportFullArtifact,
  type ReportOptions,
  type FullReport,
  type ReportSummary,
} from './pbx-report-generator'
