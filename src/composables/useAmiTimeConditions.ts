/**
 * AMI Time Conditions Composable
 *
 * Vue composable for managing time-based routing and business hours via AstDB.
 * Supports schedule management, overrides, and holiday calendars.
 *
 * @module composables/useAmiTimeConditions
 */

import { ref, computed, onUnmounted } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  DayOfWeek,
  TimeConditionState,
  OverrideMode,
  TimeRange,
  DailySchedule,
  Holiday,
  TimeCondition,
  TimeConditionStatus,
  OverrideResult,
  HolidayResult,
  ScheduleResult,
  UseAmiTimeConditionsOptions,
  UseAmiTimeConditionsReturn,
} from '@/types/timeconditions.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiTimeConditions')

// Re-export types for convenience
export type {
  DayOfWeek,
  TimeConditionState,
  OverrideMode,
  TimeRange,
  DailySchedule,
  Holiday,
  TimeCondition,
  TimeConditionStatus,
  OverrideResult,
  HolidayResult,
  ScheduleResult,
  UseAmiTimeConditionsOptions,
  UseAmiTimeConditionsReturn,
}


const DAY_NAMES: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return false
  const parts = time.split(':').map(Number)
  const hours = parts[0] ?? -1
  const minutes = parts[1] ?? -1
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(date: string): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * Validate condition ID (alphanumeric and underscore)
 */
function isValidConditionId(id: string): boolean {
  if (!id || id.length < 1 || id.length > 64) return false
  return /^[a-zA-Z0-9_-]+$/.test(id)
}

/**
 * Sanitize string input
 */
function sanitizeInput(input: string): string {
  let sanitized = input.replace(/<[^>]*>/g, '')
  sanitized = sanitized.replace(/[<>'";&|`$\\]/g, '')
  return sanitized.trim().slice(0, 255)
}

/**
 * Generate unique ID using cryptographically secure random values when available
 */
function generateId(): string {
  // Use crypto.getRandomValues for better randomness when available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(2)
    crypto.getRandomValues(array)
    const part1 = array[0] ?? 0
    const part2 = array[1] ?? 0
    return `${Date.now()}_${part1.toString(36)}${part2.toString(36)}`
  }
  // Fallback for environments without crypto
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Parse time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  const hours = parts[0] ?? 0
  const minutes = parts[1] ?? 0
  return hours * 60 + minutes
}

/**
 * Check if current time is within a time range
 */
function isWithinTimeRange(now: Date, range: TimeRange): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = timeToMinutes(range.start)
  const endMinutes = timeToMinutes(range.end)

  // Handle overnight ranges (e.g., 22:00 - 06:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Create default weekly schedule (Mon-Fri 9-5)
 */
function createDefaultSchedule(): DailySchedule[] {
  return DAY_NAMES.map((day) => ({
    day,
    enabled: day !== 'saturday' && day !== 'sunday',
    ranges: day !== 'saturday' && day !== 'sunday'
      ? [{ start: '09:00', end: '17:00' }]
      : [],
  }))
}

/**
 * Serialize time condition for storage
 */
function serializeCondition(condition: TimeCondition): string {
  return JSON.stringify({
    id: condition.id,
    n: condition.name,
    d: condition.description,
    s: condition.schedule.map((ds) => ({
      d: ds.day,
      e: ds.enabled,
      r: ds.ranges,
    })),
    h: condition.holidays.map((h) => ({
      id: h.id,
      n: h.name,
      dt: h.date,
      r: h.recurring,
      ds: h.destination,
      de: h.description,
    })),
    om: condition.overrideMode,
    oe: condition.overrideExpires?.toISOString(),
    tz: condition.timezone,
    en: condition.enabled,
    od: condition.openDestination,
    cd: condition.closedDestination,
    hd: condition.holidayDestination,
  })
}

/**
 * Deserialize time condition from storage
 */
function deserializeCondition(id: string, data: string): TimeCondition | null {
  try {
    const parsed = JSON.parse(data)
    return {
      id: parsed.id || id,
      name: parsed.n || id,
      description: parsed.d,
      schedule: (parsed.s || []).map((ds: { d: DayOfWeek; e: boolean; r: TimeRange[] }) => ({
        day: ds.d,
        enabled: ds.e,
        ranges: ds.r || [],
      })),
      holidays: (parsed.h || []).map((h: { id: string; n: string; dt: string; r: boolean; ds?: string; de?: string }) => ({
        id: h.id,
        name: h.n,
        date: h.dt,
        recurring: h.r,
        destination: h.ds,
        description: h.de,
      })),
      overrideMode: parsed.om || 'none',
      overrideExpires: parsed.oe ? new Date(parsed.oe) : undefined,
      timezone: parsed.tz,
      enabled: parsed.en !== false,
      openDestination: parsed.od,
      closedDestination: parsed.cd,
      holidayDestination: parsed.hd,
    }
  } catch {
    return null
  }
}

/**
 * AMI Time Conditions Composable
 *
 * Provides reactive time-based routing management for Vue components.
 * Stores time conditions in AstDB for persistence.
 *
 * @param client - AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * await ami.connect({ url: 'ws://pbx.example.com:8080' })
 *
 * const {
 *   conditions,
 *   statuses,
 *   isOpen,
 *   setOverride,
 *   addHoliday,
 * } = useAmiTimeConditions(ami.getClient()!, {
 *   onStateChange: (id, status) => console.log(`${id} is now ${status.state}`),
 * })
 *
 * // Check if business is open
 * if (isOpen('main_hours')) {
 *   console.log('We are open!')
 * }
 *
 * // Force closed for the day
 * await setOverride('main_hours', 'force_closed')
 *
 * // Add a holiday
 * await addHoliday('main_hours', {
 *   name: 'Christmas Day',
 *   date: '2024-12-25',
 *   recurring: true,
 * })
 * ```
 */
export function useAmiTimeConditions(
  client: AmiClient | null,
  options: UseAmiTimeConditionsOptions = {}
): UseAmiTimeConditionsReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  const config = {
    dbFamily: options.dbFamily ?? 'timeconditions',
    timezone: options.timezone,
    refreshInterval: options.refreshInterval ?? 60000,
    autoRefresh: options.autoRefresh ?? true,
    onStateChange: options.onStateChange,
    onOverrideSet: options.onOverrideSet,
    onOverrideCleared: options.onOverrideCleared,
    onError: options.onError,
  }

  // ============================================================================
  // State
  // ============================================================================

  const conditions = ref<TimeCondition[]>([])
  const statuses = ref<Map<string, TimeConditionStatus>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const openConditions = computed(() =>
    conditions.value.filter((c) => {
      const status = statuses.value.get(c.id)
      return status?.state === 'open' || status?.state === 'override_open'
    })
  )

  const closedConditions = computed(() =>
    conditions.value.filter((c) => {
      const status = statuses.value.get(c.id)
      return status?.state === 'closed' || status?.state === 'override_closed' || status?.state === 'holiday'
    })
  )

  const overriddenConditions = computed(() =>
    conditions.value.filter((c) => c.overrideMode !== 'none')
  )

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Calculate status for a condition at a specific time
   */
  const calculateStatus = (condition: TimeCondition, at: Date = new Date()): TimeConditionStatus => {
    const dayName = DAY_NAMES[at.getDay()]
    const daySchedule = condition.schedule.find((s) => s.day === dayName)

    // Check for holiday
    const dateStr = at.toISOString().split('T')[0] ?? ''
    const monthDay = dateStr.slice(5) // MM-DD
    const currentHoliday = condition.holidays.find((h) => {
      if (h.recurring) {
        return h.date.slice(5) === monthDay
      }
      return h.date === dateStr
    })

    // Determine if scheduled open
    let isScheduledOpen = false
    if (daySchedule?.enabled && daySchedule.ranges.length > 0) {
      isScheduledOpen = daySchedule.ranges.some((range) => isWithinTimeRange(at, range))
    }

    // Check override expiration
    let effectiveOverride = condition.overrideMode
    if (effectiveOverride === 'temporary' && condition.overrideExpires) {
      if (at > condition.overrideExpires) {
        effectiveOverride = 'none'
      }
    }

    // Determine final state
    let state: TimeConditionState
    if (effectiveOverride === 'force_open') {
      state = 'override_open'
    } else if (effectiveOverride === 'force_closed' || effectiveOverride === 'temporary') {
      state = 'override_closed'
    } else if (currentHoliday) {
      state = 'holiday'
    } else {
      state = isScheduledOpen ? 'open' : 'closed'
    }

    // Generate status text
    let statusText: string
    switch (state) {
      case 'open':
        statusText = 'Open'
        break
      case 'closed':
        statusText = 'Closed'
        break
      case 'holiday':
        statusText = `Holiday: ${currentHoliday?.name}`
        break
      case 'override_open':
        statusText = 'Override: Forced Open'
        break
      case 'override_closed':
        statusText = effectiveOverride === 'temporary'
          ? `Override: Closed until ${condition.overrideExpires?.toLocaleTimeString()}`
          : 'Override: Forced Closed'
        break
    }

    // Calculate next change
    const nextChange = calculateNextChange(condition, at, state, isScheduledOpen)

    return {
      conditionId: condition.id,
      state,
      statusText,
      isScheduledOpen,
      isOverrideActive: effectiveOverride !== 'none',
      overrideMode: effectiveOverride,
      overrideExpires: effectiveOverride !== 'none' ? condition.overrideExpires : undefined,
      currentHoliday,
      nextChange,
      checkedAt: at,
    }
  }

  /**
   * Calculate next state change
   */
  const calculateNextChange = (
    condition: TimeCondition,
    at: Date,
    _currentState: TimeConditionState,
    isScheduledOpen: boolean
  ): { state: TimeConditionState; at: Date; reason: string } | undefined => {
    const dayName = DAY_NAMES[at.getDay()]
    const daySchedule = condition.schedule.find((s) => s.day === dayName)
    const currentMinutes = at.getHours() * 60 + at.getMinutes()

    // If override with expiration
    if (condition.overrideMode === 'temporary' && condition.overrideExpires) {
      return {
        state: isScheduledOpen ? 'open' : 'closed',
        at: condition.overrideExpires,
        reason: 'Override expires',
      }
    }

    // Find next schedule transition today
    if (daySchedule?.enabled && daySchedule.ranges.length > 0) {
      for (const range of daySchedule.ranges) {
        const startMinutes = timeToMinutes(range.start)
        const endMinutes = timeToMinutes(range.end)

        if (currentMinutes < startMinutes) {
          // Next opening
          const nextAt = new Date(at)
          nextAt.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
          return {
            state: 'open',
            at: nextAt,
            reason: 'Schedule opens',
          }
        } else if (currentMinutes < endMinutes) {
          // Next closing
          const nextAt = new Date(at)
          nextAt.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
          return {
            state: 'closed',
            at: nextAt,
            reason: 'Schedule closes',
          }
        }
      }
    }

    // Find next day with schedule
    for (let i = 1; i <= 7; i++) {
      const nextDay = new Date(at)
      nextDay.setDate(nextDay.getDate() + i)
      nextDay.setHours(0, 0, 0, 0)
      const nextDayName = DAY_NAMES[nextDay.getDay()]
      const nextDaySchedule = condition.schedule.find((s) => s.day === nextDayName)

      const firstRange = nextDaySchedule?.ranges[0]
      if (nextDaySchedule?.enabled && firstRange) {
        const startMinutes = timeToMinutes(firstRange.start)
        nextDay.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
        return {
          state: 'open',
          at: nextDay,
          reason: `Opens on ${nextDayName}`,
        }
      }
    }

    return undefined
  }

  /**
   * Update statuses for all conditions
   */
  const updateStatuses = () => {
    const now = new Date()
    const newStatuses = new Map<string, TimeConditionStatus>()

    for (const condition of conditions.value) {
      const oldStatus = statuses.value.get(condition.id)
      const newStatus = calculateStatus(condition, now)
      newStatuses.set(condition.id, newStatus)

      // Trigger callback if state changed
      if (oldStatus && oldStatus.state !== newStatus.state) {
        config.onStateChange?.(condition.id, newStatus)
      }
    }

    statuses.value = newStatuses
  }

  /**
   * Store condition in AstDB
   */
  const storeCondition = async (condition: TimeCondition): Promise<boolean> => {
    if (!client) return false

    try {
      const response = await client.sendAction({
        Action: 'DBPut',
        Family: config.dbFamily,
        Key: condition.id,
        Val: serializeCondition(condition),
      })

      return response?.data?.Response === 'Success'
    } catch (err) {
      logger.error('Failed to store time condition', { error: err, id: condition.id })
      return false
    }
  }

  /**
   * Remove condition from AstDB
   */
  const removeCondition = async (conditionId: string): Promise<boolean> => {
    if (!client) return false

    try {
      const response = await client.sendAction({
        Action: 'DBDel',
        Family: config.dbFamily,
        Key: conditionId,
      })

      return response?.data?.Response === 'Success'
    } catch (err) {
      logger.error('Failed to remove time condition', { error: err, id: conditionId })
      return false
    }
  }

  // ============================================================================
  // Public Methods - Status
  // ============================================================================

  const getStatus = (conditionId: string): TimeConditionStatus | undefined => {
    return statuses.value.get(conditionId)
  }

  const isOpen = (conditionId: string): boolean => {
    const status = statuses.value.get(conditionId)
    return status?.state === 'open' || status?.state === 'override_open'
  }

  const isClosed = (conditionId: string): boolean => {
    const status = statuses.value.get(conditionId)
    return status?.state === 'closed' || status?.state === 'override_closed'
  }

  const isHoliday = (conditionId: string): boolean => {
    const status = statuses.value.get(conditionId)
    return status?.state === 'holiday'
  }

  const hasOverride = (conditionId: string): boolean => {
    const condition = conditions.value.find((c) => c.id === conditionId)
    return condition?.overrideMode !== 'none'
  }

  // ============================================================================
  // Public Methods - Override
  // ============================================================================

  const setOverride = async (
    conditionId: string,
    mode: OverrideMode,
    expiresIn?: number
  ): Promise<OverrideResult> => {
    if (!client) {
      const err = 'AMI client not connected'
      error.value = err
      config.onError?.(err)
      return { success: false, conditionId, mode, message: err }
    }

    if (!isValidConditionId(conditionId)) {
      const err = 'Invalid condition ID'
      error.value = err
      config.onError?.(err)
      return { success: false, conditionId, mode, message: err }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, conditionId, mode, message: 'Condition not found' }
    }

    const updated: TimeCondition = {
      ...condition,
      overrideMode: mode,
      overrideExpires: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
    }

    isLoading.value = true
    error.value = null

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        const err = 'Failed to store override'
        error.value = err
        config.onError?.(err)
        return { success: false, conditionId, mode, message: err }
      }

      // Update local state
      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      if (mode === 'none') {
        config.onOverrideCleared?.(conditionId)
      } else {
        config.onOverrideSet?.(conditionId, mode)
      }

      logger.debug('Override set', { conditionId, mode })
      return { success: true, conditionId, mode, expiresAt: updated.overrideExpires }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to set override'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return { success: false, conditionId, mode, message: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  const clearOverride = async (conditionId: string): Promise<OverrideResult> => {
    return setOverride(conditionId, 'none')
  }

  const toggleOverride = async (conditionId: string): Promise<OverrideResult> => {
    const status = statuses.value.get(conditionId)
    if (!status) {
      return { success: false, conditionId, mode: 'none', message: 'Condition not found' }
    }

    // If currently open (including override_open), force closed
    // If currently closed (including override_closed, holiday), force open
    const newMode: OverrideMode = status.state === 'open' || status.state === 'override_open'
      ? 'force_closed'
      : 'force_open'

    return setOverride(conditionId, newMode)
  }

  // ============================================================================
  // Public Methods - Holidays
  // ============================================================================

  const addHoliday = async (
    conditionId: string,
    holiday: Omit<Holiday, 'id'>
  ): Promise<HolidayResult> => {
    if (!client) {
      const err = 'AMI client not connected'
      error.value = err
      config.onError?.(err)
      return { success: false, message: err }
    }

    if (!isValidConditionId(conditionId)) {
      return { success: false, message: 'Invalid condition ID' }
    }

    if (!isValidDate(holiday.date)) {
      return { success: false, message: 'Invalid date format (use YYYY-MM-DD)' }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, message: 'Condition not found' }
    }

    const newHoliday: Holiday = {
      id: generateId(),
      name: sanitizeInput(holiday.name),
      date: holiday.date,
      recurring: holiday.recurring,
      destination: holiday.destination ? sanitizeInput(holiday.destination) : undefined,
      description: holiday.description ? sanitizeInput(holiday.description) : undefined,
    }

    const updated: TimeCondition = {
      ...condition,
      holidays: [...condition.holidays, newHoliday],
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        const err = 'Failed to add holiday'
        error.value = err
        config.onError?.(err)
        return { success: false, message: err }
      }

      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      logger.debug('Holiday added', { conditionId, holiday: newHoliday })
      return { success: true, holiday: newHoliday }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add holiday'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return { success: false, message: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  const removeHoliday = async (conditionId: string, holidayId: string): Promise<HolidayResult> => {
    if (!client) {
      return { success: false, message: 'AMI client not connected' }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, message: 'Condition not found' }
    }

    const holiday = condition.holidays.find((h) => h.id === holidayId)
    if (!holiday) {
      return { success: false, message: 'Holiday not found' }
    }

    const updated: TimeCondition = {
      ...condition,
      holidays: condition.holidays.filter((h) => h.id !== holidayId),
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        return { success: false, message: 'Failed to remove holiday' }
      }

      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      logger.debug('Holiday removed', { conditionId, holidayId })
      return { success: true, holiday }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to remove holiday' }
    } finally {
      isLoading.value = false
    }
  }

  const updateHoliday = async (
    conditionId: string,
    holidayId: string,
    updates: Partial<Holiday>
  ): Promise<HolidayResult> => {
    if (!client) {
      return { success: false, message: 'AMI client not connected' }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, message: 'Condition not found' }
    }

    const holidayIdx = condition.holidays.findIndex((h) => h.id === holidayId)
    if (holidayIdx === -1) {
      return { success: false, message: 'Holiday not found' }
    }

    if (updates.date && !isValidDate(updates.date)) {
      return { success: false, message: 'Invalid date format' }
    }

    const existingHoliday = condition.holidays[holidayIdx]
    if (!existingHoliday) {
      return { success: false, message: 'Holiday not found' }
    }
    const updatedHoliday: Holiday = {
      ...existingHoliday,
      ...updates,
      name: updates.name ? sanitizeInput(updates.name) : existingHoliday.name,
      description: updates.description ? sanitizeInput(updates.description) : existingHoliday.description,
    }

    const updatedHolidays = [...condition.holidays]
    updatedHolidays[holidayIdx] = updatedHoliday

    const updated: TimeCondition = {
      ...condition,
      holidays: updatedHolidays,
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        return { success: false, message: 'Failed to update holiday' }
      }

      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      return { success: true, holiday: updatedHoliday }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update holiday' }
    } finally {
      isLoading.value = false
    }
  }

  const getHolidays = (conditionId: string): Holiday[] => {
    const condition = conditions.value.find((c) => c.id === conditionId)
    return condition?.holidays ?? []
  }

  const getUpcomingHolidays = (conditionId: string, days: number = 30): Holiday[] => {
    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) return []

    const now = new Date()
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const currentYear = now.getFullYear()

    return condition.holidays
      .map((h) => {
        if (h.recurring) {
          // Get this year's occurrence
          const thisYear = `${currentYear}-${h.date.slice(5)}`
          const date = new Date(thisYear)
          if (date < now) {
            // Use next year
            return { ...h, date: `${currentYear + 1}-${h.date.slice(5)}` }
          }
          return { ...h, date: thisYear }
        }
        return h
      })
      .filter((h) => {
        const date = new Date(h.date)
        return date >= now && date <= cutoff
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // ============================================================================
  // Public Methods - Schedule
  // ============================================================================

  const updateDaySchedule = async (
    conditionId: string,
    day: DayOfWeek,
    schedule: Partial<DailySchedule>
  ): Promise<ScheduleResult> => {
    if (!client) {
      return { success: false, conditionId, message: 'AMI client not connected' }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, conditionId, message: 'Condition not found' }
    }

    // Validate time ranges
    if (schedule.ranges) {
      for (const range of schedule.ranges) {
        if (!isValidTime(range.start) || !isValidTime(range.end)) {
          return { success: false, conditionId, message: 'Invalid time format (use HH:MM)' }
        }
      }
    }

    const updatedSchedule = condition.schedule.map((ds) =>
      ds.day === day ? { ...ds, ...schedule } : ds
    )

    const updated: TimeCondition = {
      ...condition,
      schedule: updatedSchedule,
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        return { success: false, conditionId, message: 'Failed to update schedule' }
      }

      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      logger.debug('Schedule updated', { conditionId, day })
      return { success: true, conditionId }
    } catch (err) {
      return { success: false, conditionId, message: err instanceof Error ? err.message : 'Failed to update schedule' }
    } finally {
      isLoading.value = false
    }
  }

  const setWeeklySchedule = async (
    conditionId: string,
    schedule: DailySchedule[]
  ): Promise<ScheduleResult> => {
    if (!client) {
      return { success: false, conditionId, message: 'AMI client not connected' }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, conditionId, message: 'Condition not found' }
    }

    // Validate all time ranges
    for (const ds of schedule) {
      for (const range of ds.ranges) {
        if (!isValidTime(range.start) || !isValidTime(range.end)) {
          return { success: false, conditionId, message: `Invalid time format for ${ds.day}` }
        }
      }
    }

    const updated: TimeCondition = {
      ...condition,
      schedule,
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        return { success: false, conditionId, message: 'Failed to set schedule' }
      }

      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      return { success: true, conditionId }
    } catch (err) {
      return { success: false, conditionId, message: err instanceof Error ? err.message : 'Failed to set schedule' }
    } finally {
      isLoading.value = false
    }
  }

  const getDaySchedule = (conditionId: string, day: DayOfWeek): DailySchedule | undefined => {
    const condition = conditions.value.find((c) => c.id === conditionId)
    return condition?.schedule.find((s) => s.day === day)
  }

  // ============================================================================
  // Public Methods - Condition Management
  // ============================================================================

  const createCondition = async (
    condition: Omit<TimeCondition, 'id'>
  ): Promise<{ success: boolean; condition?: TimeCondition; message?: string }> => {
    if (!client) {
      return { success: false, message: 'AMI client not connected' }
    }

    const id = generateId()
    const newCondition: TimeCondition = {
      ...condition,
      id,
      name: sanitizeInput(condition.name),
      description: condition.description ? sanitizeInput(condition.description) : undefined,
      schedule: condition.schedule.length > 0 ? condition.schedule : createDefaultSchedule(),
      holidays: condition.holidays ?? [],
      overrideMode: condition.overrideMode ?? 'none',
      enabled: condition.enabled !== false,
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(newCondition)
      if (!stored) {
        return { success: false, message: 'Failed to create condition' }
      }

      conditions.value.push(newCondition)
      updateStatuses()

      logger.debug('Condition created', { id })
      return { success: true, condition: newCondition }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to create condition' }
    } finally {
      isLoading.value = false
    }
  }

  const deleteCondition = async (conditionId: string): Promise<{ success: boolean; message?: string }> => {
    if (!client) {
      return { success: false, message: 'AMI client not connected' }
    }

    if (!isValidConditionId(conditionId)) {
      return { success: false, message: 'Invalid condition ID' }
    }

    isLoading.value = true

    try {
      const removed = await removeCondition(conditionId)
      if (!removed) {
        return { success: false, message: 'Failed to delete condition' }
      }

      conditions.value = conditions.value.filter((c) => c.id !== conditionId)
      statuses.value.delete(conditionId)

      logger.debug('Condition deleted', { conditionId })
      return { success: true }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to delete condition' }
    } finally {
      isLoading.value = false
    }
  }

  const updateCondition = async (
    conditionId: string,
    updates: Partial<TimeCondition>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!client) {
      return { success: false, message: 'AMI client not connected' }
    }

    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) {
      return { success: false, message: 'Condition not found' }
    }

    const updated: TimeCondition = {
      ...condition,
      ...updates,
      id: conditionId, // Prevent ID change
      name: updates.name ? sanitizeInput(updates.name) : condition.name,
      description: updates.description ? sanitizeInput(updates.description) : condition.description,
    }

    isLoading.value = true

    try {
      const stored = await storeCondition(updated)
      if (!stored) {
        return { success: false, message: 'Failed to update condition' }
      }

      const idx = conditions.value.findIndex((c) => c.id === conditionId)
      conditions.value[idx] = updated
      updateStatuses()

      return { success: true }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update condition' }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================================
  // Public Methods - Utility
  // ============================================================================

  const refresh = async (): Promise<void> => {
    if (!client) return

    isLoading.value = true
    error.value = null

    try {
      const response = await client.sendAction({
        Action: 'DBGetTree',
        Family: config.dbFamily,
      })

      if (response?.data?.Response === 'Success') {
        const loadedConditions: TimeCondition[] = []
        const data = response.data as Record<string, string>

        for (const [key, value] of Object.entries(data)) {
          if (key === 'Response' || key === 'Message' || key === 'EventList') continue

          if (key.startsWith('Key-')) {
            const idx = key.substring(4)
            const val = data[`Val-${idx}`]
            if (val) {
              const condition = deserializeCondition(value, val)
              if (condition) {
                loadedConditions.push(condition)
              }
            }
          }
        }

        conditions.value = loadedConditions
        updateStatuses()
        logger.debug('Time conditions refreshed', { count: loadedConditions.length })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh time conditions'
      error.value = errorMsg
      config.onError?.(errorMsg)
    } finally {
      isLoading.value = false
    }
  }

  const getNextChange = (conditionId: string): { state: TimeConditionState; at: Date; reason: string } | undefined => {
    return statuses.value.get(conditionId)?.nextChange
  }

  const checkStatusAt = (conditionId: string, date: Date): TimeConditionStatus | undefined => {
    const condition = conditions.value.find((c) => c.id === conditionId)
    if (!condition) return undefined
    return calculateStatus(condition, date)
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  if (client) {
    refresh()

    // Start auto-refresh timer
    if (config.autoRefresh && config.refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        updateStatuses()
      }, config.refreshInterval)
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive State
    conditions,
    statuses,
    isLoading,
    error,

    // Computed
    openConditions,
    closedConditions,
    overriddenConditions,

    // Status Methods
    getStatus,
    isOpen,
    isClosed,
    isHoliday,
    hasOverride,

    // Override Methods
    setOverride,
    clearOverride,
    toggleOverride,

    // Holiday Methods
    addHoliday,
    removeHoliday,
    updateHoliday,
    getHolidays,
    getUpcomingHolidays,

    // Schedule Methods
    updateDaySchedule,
    setWeeklySchedule,
    getDaySchedule,

    // Condition Management
    createCondition,
    deleteCondition,
    updateCondition,

    // Utility Methods
    refresh,
    getNextChange,
    checkStatusAt,
  }
}
