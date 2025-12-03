/**
 * Time Conditions Types
 *
 * Type definitions for time-based routing and business hours management.
 * Supports schedule overrides, holiday calendars, and time condition status.
 *
 * @packageDocumentation
 */

/**
 * Days of the week
 */
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

/**
 * Time condition state
 */
export type TimeConditionState = 'open' | 'closed' | 'holiday' | 'override_open' | 'override_closed'

/**
 * Override mode
 */
export type OverrideMode = 'none' | 'force_open' | 'force_closed' | 'temporary'

/**
 * Time range for business hours
 */
export interface TimeRange {
  /** Start time in HH:MM format (24-hour) */
  start: string
  /** End time in HH:MM format (24-hour) */
  end: string
}

/**
 * Daily schedule
 */
export interface DailySchedule {
  /** Day of the week */
  day: DayOfWeek
  /** Whether business is open on this day */
  enabled: boolean
  /** Time ranges when business is open */
  ranges: TimeRange[]
}

/**
 * Holiday entry
 */
export interface Holiday {
  /** Unique identifier */
  id: string
  /** Holiday name */
  name: string
  /** Date in YYYY-MM-DD format */
  date: string
  /** Whether this is a recurring annual holiday */
  recurring: boolean
  /** Optional alternative message or destination */
  destination?: string
  /** Optional description */
  description?: string
}

/**
 * Time condition definition
 */
export interface TimeCondition {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description */
  description?: string
  /** Weekly schedule */
  schedule: DailySchedule[]
  /** Holiday list */
  holidays: Holiday[]
  /** Current override mode */
  overrideMode: OverrideMode
  /** Override expiration (for temporary overrides) */
  overrideExpires?: Date
  /** Timezone (e.g., 'America/New_York') */
  timezone?: string
  /** Whether this time condition is active */
  enabled: boolean
  /** Optional open destination (dialplan context/extension) */
  openDestination?: string
  /** Optional closed destination */
  closedDestination?: string
  /** Optional holiday destination */
  holidayDestination?: string
}

/**
 * Time condition status at a point in time
 */
export interface TimeConditionStatus {
  /** Time condition ID */
  conditionId: string
  /** Current state */
  state: TimeConditionState
  /** Human-readable status */
  statusText: string
  /** Whether currently in scheduled hours */
  isScheduledOpen: boolean
  /** Whether override is active */
  isOverrideActive: boolean
  /** Current override mode */
  overrideMode: OverrideMode
  /** Override expiration if temporary */
  overrideExpires?: Date
  /** Today's holiday if any */
  currentHoliday?: Holiday
  /** Next state change */
  nextChange?: {
    state: TimeConditionState
    at: Date
    reason: string
  }
  /** Checked at timestamp */
  checkedAt: Date
}

/**
 * Override result
 */
export interface OverrideResult {
  success: boolean
  conditionId: string
  mode: OverrideMode
  message?: string
  expiresAt?: Date
}

/**
 * Holiday management result
 */
export interface HolidayResult {
  success: boolean
  holiday?: Holiday
  message?: string
}

/**
 * Schedule update result
 */
export interface ScheduleResult {
  success: boolean
  conditionId: string
  message?: string
}

/**
 * Configuration options for useAmiTimeConditions
 */
export interface UseAmiTimeConditionsOptions {
  /** AstDB family for time condition storage (default: 'timeconditions') */
  dbFamily?: string
  /** Default timezone (default: system timezone) */
  timezone?: string
  /** Auto-refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean
  /** Callback when state changes */
  onStateChange?: (conditionId: string, status: TimeConditionStatus) => void
  /** Callback when override is set */
  onOverrideSet?: (conditionId: string, mode: OverrideMode) => void
  /** Callback when override is cleared */
  onOverrideCleared?: (conditionId: string) => void
  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Return type for useAmiTimeConditions composable
 */
export interface UseAmiTimeConditionsReturn {
  // Reactive State
  /** All time conditions */
  conditions: import('vue').Ref<TimeCondition[]>
  /** Status for each condition */
  statuses: import('vue').Ref<Map<string, TimeConditionStatus>>
  /** Loading state */
  isLoading: import('vue').Ref<boolean>
  /** Error state */
  error: import('vue').Ref<string | null>

  // Computed
  /** All conditions that are currently open */
  openConditions: import('vue').ComputedRef<TimeCondition[]>
  /** All conditions that are currently closed */
  closedConditions: import('vue').ComputedRef<TimeCondition[]>
  /** All conditions with active overrides */
  overriddenConditions: import('vue').ComputedRef<TimeCondition[]>

  // Status Methods
  /** Get status for a specific condition */
  getStatus: (conditionId: string) => TimeConditionStatus | undefined
  /** Check if a condition is currently open */
  isOpen: (conditionId: string) => boolean
  /** Check if a condition is currently closed */
  isClosed: (conditionId: string) => boolean
  /** Check if today is a holiday for a condition */
  isHoliday: (conditionId: string) => boolean
  /** Check if override is active for a condition */
  hasOverride: (conditionId: string) => boolean

  // Override Methods
  /** Set override mode for a condition */
  setOverride: (conditionId: string, mode: OverrideMode, expiresIn?: number) => Promise<OverrideResult>
  /** Clear override for a condition */
  clearOverride: (conditionId: string) => Promise<OverrideResult>
  /** Toggle between force_open and force_closed */
  toggleOverride: (conditionId: string) => Promise<OverrideResult>

  // Holiday Methods
  /** Add a holiday */
  addHoliday: (conditionId: string, holiday: Omit<Holiday, 'id'>) => Promise<HolidayResult>
  /** Remove a holiday */
  removeHoliday: (conditionId: string, holidayId: string) => Promise<HolidayResult>
  /** Update a holiday */
  updateHoliday: (conditionId: string, holidayId: string, updates: Partial<Holiday>) => Promise<HolidayResult>
  /** Get holidays for a condition */
  getHolidays: (conditionId: string) => Holiday[]
  /** Get upcoming holidays */
  getUpcomingHolidays: (conditionId: string, days?: number) => Holiday[]

  // Schedule Methods
  /** Update schedule for a day */
  updateDaySchedule: (conditionId: string, day: DayOfWeek, schedule: Partial<DailySchedule>) => Promise<ScheduleResult>
  /** Set full weekly schedule */
  setWeeklySchedule: (conditionId: string, schedule: DailySchedule[]) => Promise<ScheduleResult>
  /** Get schedule for a day */
  getDaySchedule: (conditionId: string, day: DayOfWeek) => DailySchedule | undefined

  // Condition Management
  /** Create a new time condition */
  createCondition: (condition: Omit<TimeCondition, 'id'>) => Promise<{ success: boolean; condition?: TimeCondition; message?: string }>
  /** Delete a time condition */
  deleteCondition: (conditionId: string) => Promise<{ success: boolean; message?: string }>
  /** Update a time condition */
  updateCondition: (conditionId: string, updates: Partial<TimeCondition>) => Promise<{ success: boolean; message?: string }>

  // Utility Methods
  /** Refresh all conditions from storage */
  refresh: () => Promise<void>
  /** Get next state change for a condition */
  getNextChange: (conditionId: string) => { state: TimeConditionState; at: Date; reason: string } | undefined
  /** Check status at a specific time */
  checkStatusAt: (conditionId: string, date: Date) => TimeConditionStatus | undefined
}
