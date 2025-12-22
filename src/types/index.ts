/**
 * Type definitions index
 * Export all type definitions from a single entry point
 * @packageDocumentation
 */

// Config types
export * from './config.types'

// SIP types
export * from './sip.types'

// Call types
export * from './call.types'

// Media types
export * from './media.types'

// Event types
export * from './events.types'

// Transfer types
export * from './transfer.types'

// Presence types
export * from './presence.types'

// Messaging types
export * from './messaging.types'

// Conference types
export * from './conference.types'

// History types
export * from './history.types'

// Storage types
export * from './storage.types'

// Provider types
export * from './provider.types'

// Plugin types
export * from './plugin.types'

// OAuth2 types
export * from './oauth.types'

// Common AMI patterns and shared types
// Common AMI patterns and shared types
// Export named types to avoid conflicts with core types
export type {
  AmiResult,
  AmiAsyncResult,
  PaginationOptions,
  SortOptions,
  FilterOptions,
  DateRangeFilter,
  QueryOptions,
  EventCleanup,
  EventCallback,
  EventSubscriptionOptions,
  LoadingState,
  // ConnectionState (conflict with sip.types),
  BaseAmiOptions,
  BaseAmiReturn,
  StatsPeriod,
  BaseStats,
  PercentageMetric,
  DurationMetric,
  RateMetric,
  // ValidationResult (conflict with config.types),
  TransformFunction,
  ValidatorFunction,
  TimestampFields,
  CallTimestamps,
  SessionTimestamps,
  AmiResultTypes,
  AmiQueryTypes,
  AmiStateTypes,
  AmiMetricTypes,
  AmiTimestampTypes,
} from './common'

// Re-export conflicting types with aliases if needed for AMI usage
export type {
  ConnectionState as AmiCommonConnectionState,
  ValidationResult as AmiValidationResult,
} from './common'
