/**
 * Common Type Patterns for AMI Features
 *
 * Shared type patterns used across multiple AMI composables to ensure
 * consistency and reduce duplication.
 *
 * @module types/common
 */

import type { Ref, ComputedRef } from 'vue'

// ============================================================================
// Result Types
// ============================================================================

/**
 * Standard result type for AMI operations
 *
 * @template T - The data type on success
 *
 * @example
 * ```typescript
 * const result: AmiResult<Queue> = await getQueue(queueName)
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export interface AmiResult<T> {
  /** Whether the operation succeeded */
  success: boolean
  /** Result data if successful */
  data?: T
  /** Error message if failed */
  error?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Standard async operation result
 *
 * @template T - The data type on success
 */
export type AmiAsyncResult<T> = Promise<AmiResult<T>>

// ============================================================================
// Filter & Query Types
// ============================================================================

/**
 * Standard pagination options
 *
 * @example
 * ```typescript
 * const options: PaginationOptions = {
 *   limit: 25,
 *   offset: 50
 * }
 * ```
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  limit?: number
  /** Number of items to skip */
  offset?: number
}

/**
 * Standard sorting options
 *
 * @template T - The type being sorted
 *
 * @example
 * ```typescript
 * const options: SortOptions<CdrRecord> = {
 *   sortBy: 'startedAt',
 *   sortOrder: 'desc'
 * }
 * ```
 */
export interface SortOptions<T> {
  /** Field to sort by */
  sortBy?: keyof T
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Standard filter options
 *
 * @template T - The type being filtered
 *
 * @example
 * ```typescript
 * const options: FilterOptions<Queue> = {
 *   filter: (queue) => queue.callers > 0,
 *   sortBy: 'name',
 *   sortOrder: 'asc'
 * }
 * ```
 */
export interface FilterOptions<T> extends SortOptions<T> {
  /** Custom filter predicate */
  filter?: (item: T) => boolean
}

/**
 * Standard date range filter
 *
 * @example
 * ```typescript
 * const filter: DateRangeFilter = {
 *   startedAt: new Date('2024-01-01'),
 *   endedAt: new Date()
 * }
 * ```
 */
export interface DateRangeFilter {
  /** Start date (inclusive) */
  startedAt?: Date
  /** End date (inclusive) */
  endedAt?: Date
}

/**
 * Combined query options with pagination, sorting, and filtering
 *
 * @template T - The type being queried
 */
export interface QueryOptions<T>
  extends PaginationOptions,
    FilterOptions<T>,
    Partial<DateRangeFilter> {}

// ============================================================================
// Event & Callback Types
// ============================================================================

/**
 * Event listener cleanup function
 *
 * Call this function to remove the event listener and free resources.
 *
 * @example
 * ```typescript
 * const cleanup: EventCleanup = client.on('event', handler)
 * // Later...
 * cleanup() // Remove listener
 * ```
 */
export type EventCleanup = () => void

/**
 * Event callback function
 *
 * @template T - The event data type
 */
export type EventCallback<T> = (data: T) => void

/**
 * Standard event subscription options
 */
export interface EventSubscriptionOptions {
  /** Whether to fire callback immediately with current state */
  immediate?: boolean
  /** Whether to fire callback only once */
  once?: boolean
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * Standard loading state
 *
 * @example
 * ```typescript
 * const state: LoadingState = {
 *   isLoading: true,
 *   error: null,
 *   lastUpdatedAt: new Date()
 * }
 * ```
 */
export interface LoadingState {
  /** Whether currently loading */
  isLoading: boolean
  /** Error message if failed */
  error: string | null
  /** When last updated */
  lastUpdatedAt?: Date
}

/**
 * Standard connection state
 */
export interface ConnectionState extends LoadingState {
  /** Whether connected */
  isConnected: boolean
  /** Connection attempt count */
  attempts?: number
  /** Next retry time */
  nextRetryAt?: Date
}

// ============================================================================
// AMI-Specific Common Types
// ============================================================================

/**
 * Common AMI composable options
 *
 * Base options that all AMI feature composables should support.
 *
 * @example
 * ```typescript
 * const options: BaseAmiOptions = {
 *   useEvents: true,
 *   pollingInterval: 30000,
 *   autoRefresh: true
 * }
 * ```
 */
export interface BaseAmiOptions {
  /**
   * Enable real-time event updates
   * @default true
   */
  useEvents?: boolean

  /**
   * Polling interval in milliseconds (fallback when events unavailable)
   * @default 30000
   */
  pollingInterval?: number

  /**
   * Auto-refresh on connection
   * @default true
   */
  autoRefresh?: boolean

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * Common AMI composable return interface
 *
 * Base interface that all AMI feature composables should extend.
 *
 * @template T - The item type
 */
export interface BaseAmiReturn<T> {
  /** Reactive map of items by ID */
  items: Ref<Map<string, T>>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message */
  error: Ref<string | null>

  /** Array view of items */
  itemList: ComputedRef<T[]>

  /** Refresh data from AMI */
  refresh: () => Promise<void>

  /** Get item by ID */
  getItem: (id: string) => T | undefined

  /** Clear all data */
  clear: () => void
}

// ============================================================================
// Statistics & Metrics Types
// ============================================================================

/**
 * Time period for statistics aggregation
 */
export type StatsPeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'

/**
 * Common statistics interface
 *
 * @example
 * ```typescript
 * const stats: BaseStats = {
 *   total: 100,
 *   period: 'day',
 *   calculatedAt: new Date()
 * }
 * ```
 */
export interface BaseStats {
  /** Total count */
  total: number
  /** Time period */
  period?: StatsPeriod
  /** When calculated */
  calculatedAt?: Date
}

/**
 * Percentage metric
 */
export interface PercentageMetric {
  /** Percentage value (0-100) */
  percentage: number
  /** Numerator (e.g., successful calls) */
  numerator: number
  /** Denominator (e.g., total calls) */
  denominator: number
}

/**
 * Duration metric in seconds
 */
export interface DurationMetric {
  /** Duration in seconds */
  seconds: number
  /** Formatted duration string (e.g., "1h 23m 45s") */
  formatted?: string
}

/**
 * Rate metric (per time unit)
 */
export interface RateMetric {
  /** Rate value */
  rate: number
  /** Time unit */
  unit: 'second' | 'minute' | 'hour' | 'day'
}

// ============================================================================
// Validation & Transform Types
// ============================================================================

/**
 * Validation result
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   isValid: false,
 *   errors: ['Invalid extension format']
 * }
 * ```
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean
  /** Error messages if failed */
  errors?: string[]
  /** Warning messages */
  warnings?: string[]
}

/**
 * Data transform function
 *
 * @template TInput - Input type
 * @template TOutput - Output type
 */
export type TransformFunction<TInput, TOutput> = (input: TInput) => TOutput

/**
 * Validator function
 *
 * @template T - Type being validated
 */
export type ValidatorFunction<T> = (value: T) => ValidationResult

// ============================================================================
// Timestamp Standards
// ============================================================================

/**
 * Standard timestamp fields
 *
 * Use these consistent names across all AMI types:
 * - Use past tense with 'At' suffix
 * - Always use Date type (not number/string)
 *
 * @example
 * ```typescript
 * interface MyRecord extends TimestampFields {
 *   id: string
 *   // Automatically has createdAt, updatedAt
 * }
 * ```
 */
export interface TimestampFields {
  /** When the record was created */
  createdAt?: Date
  /** When the record was last updated */
  updatedAt?: Date
}

/**
 * Call-specific timestamp fields
 */
export interface CallTimestamps {
  /** When call started (dialing began) */
  startedAt: Date
  /** When call was answered */
  answeredAt?: Date | null
  /** When call ended */
  endedAt: Date
}

/**
 * Session timestamp fields
 */
export interface SessionTimestamps {
  /** When session started */
  startedAt: Date
  /** When session ended */
  endedAt?: Date | null
  /** Last activity timestamp */
  lastActivityAt?: Date
}

// ============================================================================
// Export Collections
// ============================================================================

/**
 * All result types
 */
export type AmiResultTypes = AmiResult<unknown> | AmiAsyncResult<unknown>

/**
 * All filter/query types
 */
export type AmiQueryTypes =
  | PaginationOptions
  | SortOptions<unknown>
  | FilterOptions<unknown>
  | QueryOptions<unknown>
  | DateRangeFilter

/**
 * All state types
 */
export type AmiStateTypes = LoadingState | ConnectionState

/**
 * All metric types
 */
export type AmiMetricTypes =
  | PercentageMetric
  | DurationMetric
  | RateMetric
  | BaseStats

/**
 * All timestamp types
 */
export type AmiTimestampTypes =
  | TimestampFields
  | CallTimestamps
  | SessionTimestamps
