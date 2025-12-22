/**
 * AMI Helper Utilities
 *
 * Shared utility functions for AMI data processing, validation, and formatting.
 * These helpers reduce duplication across AMI composables and ensure consistency.
 *
 * @module utils/ami-helpers
 */

import type {
  ValidationResult,
  PercentageMetric,
  DurationMetric,
  RateMetric,
  DateRangeFilter,
} from '@/types/common'

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate phone number format for AMI operations
 *
 * Accepts standard phone numbers with optional country codes, extensions,
 * and various formatting styles (spaces, hyphens, parentheses, periods).
 * More permissive than E.164 validation to support Asterisk dialplan formats.
 *
 * **Security**: Prevents injection attacks by strictly validating format.
 *
 * @param number - Phone number to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateAmiPhoneNumber('555-1234')
 * if (!result.isValid) {
 *   console.error(result.errors) // undefined (valid)
 * }
 *
 * const invalid = validateAmiPhoneNumber('555;DROP TABLE--')
 * // { isValid: false, errors: ['Invalid phone number format'] }
 * ```
 */
export function validateAmiPhoneNumber(number: string): ValidationResult {
  const errors: string[] = []

  if (!number) {
    errors.push('Phone number is required')
  } else if (number.length < 3 || number.length > 32) {
    errors.push('Phone number must be 3-32 characters')
  } else if (!/^[\d\s+\-().]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i.test(number)) {
    errors.push('Invalid phone number format')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate extension format
 *
 * Supports alphanumeric extensions with slashes, hyphens, underscores, and periods.
 * Common for SIP/PJSIP endpoints (e.g., "SIP/1001", "PJSIP/user").
 *
 * @param extension - Extension to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateExtension('1001')
 * if (!result.isValid) {
 *   console.error(result.errors)
 * }
 *
 * validateExtension('SIP/user')   // { isValid: true }
 * validateExtension('user;DROP')  // { isValid: false, errors: [...] }
 * ```
 */
export function validateExtension(extension: string): ValidationResult {
  const errors: string[] = []

  if (!extension) {
    errors.push('Extension is required')
  } else if (extension.length === 0 || extension.length > 32) {
    errors.push('Extension must be 1-32 characters')
  } else if (!/^[a-zA-Z0-9_.\/-]+$/.test(extension)) {
    errors.push('Extension contains invalid characters')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate queue name format
 *
 * @param queueName - Queue name to validate
 * @returns Validation result
 */
export function validateQueueName(queueName: string): ValidationResult {
  const errors: string[] = []

  if (!queueName) {
    errors.push('Queue name is required')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(queueName)) {
    errors.push('Queue name must contain only letters, numbers, underscores, or hyphens')
  } else if (queueName.length < 1 || queueName.length > 128) {
    errors.push('Queue name must be 1-128 characters')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate channel name format
 *
 * Channels are Asterisk's internal call identifiers (e.g., "SIP/1001-00000001").
 *
 * **Security**: Prevents injection attacks through strict channel validation.
 *
 * @param channel - Channel name to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateChannel('SIP/1001-00000001')    // { isValid: true }
 * validateChannel('PJSIP/user@domain')    // { isValid: true }
 * validateChannel('invalid;DROP')         // { isValid: false }
 * ```
 */
export function validateChannel(channel: string): ValidationResult {
  const errors: string[] = []

  if (!channel) {
    errors.push('Channel is required')
  } else if (channel.length === 0 || channel.length > 128) {
    errors.push('Channel must be 1-128 characters')
  } else if (!/^[a-zA-Z0-9_.\/@-]+$/.test(channel)) {
    errors.push('Channel contains invalid characters')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate context name format (Asterisk dialplan context)
 *
 * **Security**: Prevents injection through dialplan context manipulation.
 *
 * @param context - Context name to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateContext('from-internal')  // { isValid: true }
 * validateContext('custom-context') // { isValid: true }
 * validateContext('ctx;DROP')       // { isValid: false }
 * ```
 */
export function validateContext(context: string): ValidationResult {
  const errors: string[] = []

  if (!context) {
    errors.push('Context is required')
  } else if (context.length === 0 || context.length > 64) {
    errors.push('Context must be 1-64 characters')
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(context)) {
    errors.push('Context contains invalid characters')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate SIP/PJSIP interface format
 *
 * @param interfaceName - Interface name (e.g., "PJSIP/1001")
 * @returns Validation result
 */
export function validateInterface(interfaceName: string): ValidationResult {
  const errors: string[] = []

  if (!interfaceName) {
    errors.push('Interface is required')
  } else if (!/^(SIP|PJSIP|IAX2|DAHDI)\/[a-zA-Z0-9_-]+$/.test(interfaceName)) {
    errors.push(
      'Interface must be in format: PROTOCOL/ENDPOINT (e.g., PJSIP/1001)'
    )
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate WebSocket URL for AMI connection
 *
 * @param url - WebSocket URL to validate
 * @returns Validation result
 */
export function validateAmiWebSocketUrl(url: string): ValidationResult {
  const errors: string[] = []

  if (!url) {
    errors.push('WebSocket URL is required')
  } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    errors.push('URL must start with ws:// or wss://')
  } else {
    try {
      new URL(url)
    } catch {
      errors.push('Invalid URL format')
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// ============================================================================
// Calculation Helpers
// ============================================================================

/**
 * Calculate percentage metric
 *
 * @param numerator - Numerator value
 * @param denominator - Denominator value
 * @returns Percentage metric with percentage, numerator, and denominator
 *
 * @example
 * ```typescript
 * const metric = calculatePercentage(45, 50)
 * // { percentage: 90, numerator: 45, denominator: 50 }
 * ```
 */
export function calculatePercentage(
  numerator: number,
  denominator: number
): PercentageMetric {
  if (denominator === 0) {
    return { percentage: 0, numerator, denominator }
  }

  return {
    percentage: Math.round((numerator / denominator) * 100 * 100) / 100,
    numerator,
    denominator,
  }
}

/**
 * Calculate average from array of numbers
 *
 * @param values - Array of numbers
 * @returns Average value, or 0 if array is empty
 *
 * @example
 * ```typescript
 * const avg = calculateAverage([10, 20, 30]) // 20
 * ```
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / values.length) * 100) / 100
}

/**
 * Calculate rate per time unit
 *
 * @param count - Event count
 * @param durationSeconds - Duration in seconds
 * @param unit - Target time unit
 * @returns Rate metric
 *
 * @example
 * ```typescript
 * const rate = calculateRate(120, 3600, 'hour')
 * // { rate: 120, unit: 'hour' }
 * ```
 */
export function calculateRate(
  count: number,
  durationSeconds: number,
  unit: 'second' | 'minute' | 'hour' | 'day'
): RateMetric {
  const divisors = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
  }

  const rate =
    durationSeconds > 0
      ? Math.round((count / durationSeconds) * divisors[unit] * 100) / 100
      : 0

  return { rate, unit }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format duration in seconds to human-readable string with flexible formatting
 *
 * @param seconds - Duration in seconds
 * @param format - Format style ('short' | 'long')
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatAmiDuration(3665, 'short') // "1h 1m 5s"
 * formatAmiDuration(3665, 'long')  // "1 hour, 1 minute, 5 seconds"
 * ```
 */
export function formatAmiDuration(
  seconds: number,
  format: 'short' | 'long' = 'short'
): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (format === 'short') {
    const parts: string[] = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
    return parts.join(' ')
  } else {
    const parts: string[] = []
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
    if (minutes > 0)
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
    if (secs > 0 || parts.length === 0)
      parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`)
    return parts.join(', ')
  }
}

/**
 * Create duration metric from seconds
 *
 * @param seconds - Duration in seconds
 * @param format - Format style for string representation
 * @returns Duration metric
 */
export function createDurationMetric(
  seconds: number,
  format: 'short' | 'long' = 'short'
): DurationMetric {
  return {
    seconds,
    formatted: formatAmiDuration(seconds, format),
  }
}

/**
 * Format phone number for display in AMI contexts
 *
 * @param number - Phone number
 * @param format - Format style
 * @returns Formatted phone number
 *
 * @example
 * ```typescript
 * formatAmiPhoneNumber('5551234567', 'us') // "(555) 123-4567"
 * formatAmiPhoneNumber('5551234567', 'international') // "+1 555-123-4567"
 * ```
 */
export function formatAmiPhoneNumber(
  number: string,
  format: 'us' | 'international' | 'raw' = 'us'
): string {
  // Remove non-digits
  const cleaned = number.replace(/\D/g, '')

  if (format === 'raw') {
    return cleaned
  }

  // US format: (555) 123-4567
  if (format === 'us' && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // International format: +1 555-123-4567
  if (format === 'international' && cleaned.length === 11) {
    return `+${cleaned[0]} ${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }

  // Return original if format doesn't match
  return number
}

/**
 * Format timestamp to locale string
 *
 * @param date - Date object
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatTimestamp(new Date(), true) // "12/13/2025, 10:30:45 PM"
 * formatTimestamp(new Date(), false) // "12/13/2025"
 * ```
 */
export function formatTimestamp(date: Date, includeTime = true): string {
  if (includeTime) {
    return date.toLocaleString()
  } else {
    return date.toLocaleDateString()
  }
}

// ============================================================================
// Filtering & Sorting Helpers
// ============================================================================

/**
 * Check if date is within range
 *
 * @param date - Date to check
 * @param range - Date range filter
 * @returns Whether date is within range
 *
 * @example
 * ```typescript
 * const inRange = isDateInRange(
 *   new Date('2025-06-15'),
 *   { startedAt: new Date('2025-01-01'), endedAt: new Date('2025-12-31') }
 * ) // true
 * ```
 */
export function isDateInRange(date: Date, range: DateRangeFilter): boolean {
  if (range.startedAt && date < range.startedAt) return false
  if (range.endedAt && date > range.endedAt) return false
  return true
}

/**
 * Sort items by field
 *
 * @param items - Array to sort
 * @param field - Field to sort by
 * @param order - Sort order
 * @returns Sorted array (new array, does not mutate)
 *
 * @example
 * ```typescript
 * const sorted = sortByField(queues, 'name', 'asc')
 * ```
 */
export function sortByField<T>(
  items: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field]
    const bVal = b[field]

    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Create standard error message
 *
 * @param error - Error object or string
 * @param context - Error context (operation name)
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * const message = createErrorMessage(err, 'Failed to connect to AMI')
 * // "Failed to connect to AMI: Connection refused"
 * ```
 */
export function createErrorMessage(
  error: unknown,
  context?: string
): string {
  const message = error instanceof Error ? error.message : String(error)
  return context ? `${context}: ${message}` : message
}

/**
 * Check if error is a network error
 *
 * @param error - Error object
 * @returns Whether error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('refused') ||
    message.includes('unreachable')
  )
}

/**
 * Check if error is a timeout error
 *
 * @param error - Error object
 * @returns Whether error is timeout-related
 */
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.toLowerCase().includes('timeout')
}

// ============================================================================
// Data Transformation Helpers
// ============================================================================

/**
 * Parse Unix timestamp to Date
 *
 * @param timestamp - Unix timestamp (seconds)
 * @returns Date object
 *
 * @example
 * ```typescript
 * const date = parseUnixTimestamp(1702483200) // Date object
 * ```
 */
export function parseUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000)
}

/**
 * Convert Date to Unix timestamp
 *
 * @param date - Date object
 * @returns Unix timestamp in seconds
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

/**
 * Parse AMI boolean value
 *
 * AMI returns "yes"/"no", "true"/"false", "1"/"0"
 *
 * @param value - String value from AMI
 * @returns Boolean value
 *
 * @example
 * ```typescript
 * parseAmiBoolean('yes')   // true
 * parseAmiBoolean('no')    // false
 * parseAmiBoolean('1')     // true
 * parseAmiBoolean('false') // false
 * ```
 */
export function parseAmiBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim()
  return normalized === 'yes' || normalized === 'true' || normalized === '1'
}

/**
 * Safe number parsing with fallback
 *
 * @param value - String or number to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed number or fallback
 *
 * @example
 * ```typescript
 * safeParseNumber('123', 0)     // 123
 * safeParseNumber('invalid', 0) // 0
 * safeParseNumber(undefined, 0) // 0
 * ```
 */
export function safeParseNumber(
  value: string | number | undefined,
  fallback = 0
): number {
  if (typeof value === 'number') return value
  if (!value) return fallback

  const parsed = Number(value)
  return isNaN(parsed) ? fallback : parsed
}

// ============================================================================
// Collection Helpers
// ============================================================================

/**
 * Group items by field value
 *
 * @param items - Array to group
 * @param field - Field to group by
 * @returns Map of field value to items
 *
 * @example
 * ```typescript
 * const byQueue = groupBy(members, 'queue')
 * // Map { 'support' => [...], 'sales' => [...] }
 * ```
 */
export function groupBy<T>(items: T[], field: keyof T): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const key = String(item[field])
    const group = groups.get(key) || []
    group.push(item)
    groups.set(key, group)
  }

  return groups
}

/**
 * Create lookup map from array
 *
 * @param items - Array to map
 * @param keyField - Field to use as key
 * @returns Map of key to item
 *
 * @example
 * ```typescript
 * const queueMap = createLookupMap(queues, 'name')
 * const supportQueue = queueMap.get('support')
 * ```
 */
export function createLookupMap<T>(
  items: T[],
  keyField: keyof T
): Map<string, T> {
  const map = new Map<string, T>()

  for (const item of items) {
    const key = String(item[keyField])
    map.set(key, item)
  }

  return map
}

/**
 * Deduplicate array by field
 *
 * @param items - Array with potential duplicates
 * @param field - Field to check for uniqueness
 * @returns Array with duplicates removed (keeps first occurrence)
 *
 * @example
 * ```typescript
 * const unique = deduplicateBy(calls, 'uniqueId')
 * ```
 */
export function deduplicateBy<T>(items: T[], field: keyof T): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = String(item[field])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ============================================================================
// Security & Sanitization Helpers
// ============================================================================

/**
 * Sanitize phone number by removing potentially dangerous characters
 *
 * **Security**: Prevents injection attacks while allowing valid phone formatting.
 * Removes anything that isn't a digit, space, +, -, (, ), ., or x/ext.
 * Also removes dangerous sequences like "--" that could be SQL comments.
 *
 * @param number - Phone number to sanitize
 * @returns Sanitized phone number
 *
 * @example
 * ```typescript
 * sanitizePhoneNumber('555-1234')           // "555-1234"
 * sanitizePhoneNumber('+1 (555) 123-4567')  // "+1 (555) 123-4567"
 * sanitizePhoneNumber('555;DROP TABLE--')   // "555"
 * ```
 */
export function sanitizePhoneNumber(number: string): string {
  // Remove any character that isn't a digit, space, +, -, (, ), ., or x/ext
  let sanitized = number.replace(/[^\d\s+\-().x]/gi, '')
  // Remove SQL comment patterns (--) and multiple consecutive hyphens
  sanitized = sanitized.replace(/--+/g, '')
  return sanitized.trim()
}

/**
 * Sanitize extension by removing invalid characters
 *
 * **Security**: Removes characters that could be used for injection attacks.
 *
 * @param extension - Extension to sanitize
 * @returns Sanitized extension
 *
 * @example
 * ```typescript
 * sanitizeExtension('1234')        // "1234"
 * sanitizeExtension('SIP/user')    // "SIP/user"
 * sanitizeExtension('user;DROP')   // "userDROP"
 * ```
 */
export function sanitizeExtension(extension: string): string {
  // Remove any character that isn't alphanumeric, hyphen, underscore, period, or slash
  return extension.replace(/[^a-zA-Z0-9_.\/-]/g, '').trim()
}

/**
 * Normalize phone number by removing all formatting
 *
 * Useful for comparing phone numbers or storing in databases.
 *
 * @param number - Phone number to normalize
 * @returns Normalized phone number (digits only)
 *
 * @example
 * ```typescript
 * normalizePhoneNumber('+1 (555) 123-4567')  // "15551234567"
 * normalizePhoneNumber('555-1234')           // "5551234"
 * ```
 */
export function normalizePhoneNumber(number: string): string {
  return number.replace(/\D/g, '')
}

/**
 * Compare two phone numbers for equality (ignoring formatting)
 *
 * @param number1 - First phone number
 * @param number2 - Second phone number
 * @returns true if numbers are equivalent
 *
 * @example
 * ```typescript
 * comparePhoneNumbers('555-1234', '5551234')              // true
 * comparePhoneNumbers('+1-555-1234', '1 (555) 1234')     // true
 * comparePhoneNumbers('555-1234', '555-5678')            // false
 * ```
 */
export function comparePhoneNumbers(number1: string, number2: string): boolean {
  return normalizePhoneNumber(number1) === normalizePhoneNumber(number2)
}

// ============================================================================
// AMI-Specific Helpers
// ============================================================================

/**
 * Validate timeout value (must be positive integer)
 *
 * @param timeout - Timeout in milliseconds
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateTimeout(5000)   // { isValid: true }
 * validateTimeout(0)      // { isValid: false, errors: [...] }
 * validateTimeout(-100)   // { isValid: false, errors: [...] }
 * ```
 */
export function validateTimeout(timeout: number): ValidationResult {
  const errors: string[] = []

  if (isNaN(timeout)) {
    errors.push('Timeout must be a number')
  } else if (timeout <= 0) {
    errors.push('Timeout must be positive')
  } else if (!Number.isInteger(timeout)) {
    errors.push('Timeout must be an integer')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate priority value (typically 1-99 in Asterisk)
 *
 * @param priority - Priority value
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validatePriority(1)    // { isValid: true }
 * validatePriority(50)   // { isValid: true }
 * validatePriority(0)    // { isValid: false, errors: [...] }
 * validatePriority(100)  // { isValid: false, errors: [...] }
 * ```
 */
export function validatePriority(priority: number): ValidationResult {
  const errors: string[] = []

  if (isNaN(priority)) {
    errors.push('Priority must be a number')
  } else if (priority < 1 || priority > 99) {
    errors.push('Priority must be between 1 and 99')
  } else if (!Number.isInteger(priority)) {
    errors.push('Priority must be an integer')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Create standard AMI error object
 *
 * Provides consistent error structure across all AMI composables.
 *
 * @param operation - Operation that failed (e.g., "addToQueue", "parkCall")
 * @param message - Human-readable error message
 * @param details - Optional additional error context
 * @returns Error object
 *
 * @example
 * ```typescript
 * const error = createAmiError('addToQueue', 'Invalid queue name', { queue: 'invalid!!' })
 * // { operation: 'addToQueue', message: 'Invalid queue name', details: { queue: 'invalid!!' } }
 * ```
 */
export function createAmiError(
  operation: string,
  message: string,
  details?: Record<string, unknown>
): { operation: string; message: string; details?: Record<string, unknown> } {
  return {
    operation,
    message,
    ...(details && { details })
  }
}
