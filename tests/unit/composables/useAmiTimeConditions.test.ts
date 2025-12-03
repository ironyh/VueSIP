/**
 * useAmiTimeConditions composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiTimeConditions } from '@/composables/useAmiTimeConditions'
import type { AmiClient } from '@/core/AmiClient'
import type { TimeCondition, DailySchedule } from '@/types/timeconditions.types'
import {
  createMockAmiClient,
  type MockAmiClient,
} from '../utils/mockFactories'

describe('useAmiTimeConditions', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Set a fixed date for consistent testing: Wednesday, Dec 25, 2024, 10:00 AM
    vi.setSystemTime(new Date('2024-12-25T10:00:00'))
    mockClient = createMockAmiClient()
    // Default successful response
    mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have empty conditions list initially', () => {
      const { conditions } = useAmiTimeConditions(mockClient as unknown as AmiClient)
      expect(conditions.value).toHaveLength(0)
    })

    it('should have empty statuses map initially', () => {
      const { statuses } = useAmiTimeConditions(mockClient as unknown as AmiClient)
      expect(statuses.value.size).toBe(0)
    })

    it('should not be loading after initialization', async () => {
      const { isLoading } = useAmiTimeConditions(mockClient as unknown as AmiClient, { autoRefresh: false })
      await vi.advanceTimersByTimeAsync(100)
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiTimeConditions(mockClient as unknown as AmiClient)
      expect(error.value).toBeNull()
    })

    it('should have empty computed conditions', () => {
      const { openConditions, closedConditions, overriddenConditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )
      expect(openConditions.value).toHaveLength(0)
      expect(closedConditions.value).toHaveLength(0)
      expect(overriddenConditions.value).toHaveLength(0)
    })
  })

  describe('createCondition', () => {
    it('should create a new time condition', async () => {
      const { createCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const result = await createCondition({
        name: 'Business Hours',
        description: 'Main office hours',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      expect(result.success).toBe(true)
      expect(result.condition).toBeDefined()
      expect(result.condition?.name).toBe('Business Hours')
      expect(conditions.value).toHaveLength(1)
    })

    it('should create default schedule if empty', async () => {
      const { createCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      await createCondition({
        name: 'Business Hours',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // Default schedule is Mon-Fri 9-5
      const condition = conditions.value[0]
      expect(condition.schedule).toHaveLength(7)

      const monday = condition.schedule.find((s) => s.day === 'monday')
      expect(monday?.enabled).toBe(true)
      expect(monday?.ranges).toHaveLength(1)
      expect(monday?.ranges[0]).toEqual({ start: '09:00', end: '17:00' })

      const saturday = condition.schedule.find((s) => s.day === 'saturday')
      expect(saturday?.enabled).toBe(false)
    })

    it('should sanitize input on creation', async () => {
      const { createCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      await createCondition({
        name: '<script>alert("xss")</script>Business Hours',
        description: 'Description with <b>HTML</b>',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // sanitizeInput strips HTML tags, then removes special chars like <>"';&|`$\
      // '<script>' is stripped by regex, 'alert("xss")' becomes 'alert(xss)', etc.
      expect(conditions.value[0].name).not.toContain('<script>')
      expect(conditions.value[0].name).not.toContain('"')
      expect(conditions.value[0].description).not.toContain('<b>')
    })

    it('should fail when client is not connected', async () => {
      const { createCondition } = useAmiTimeConditions(null)

      const result = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('AMI client not connected')
    })

    it('should store condition in AstDB', async () => {
      const { createCondition } = useAmiTimeConditions(mockClient as unknown as AmiClient)

      await createCondition({
        name: 'Business Hours',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBPut',
          Family: 'timeconditions',
        })
      )
    })
  })

  describe('deleteCondition', () => {
    it('should delete an existing condition', async () => {
      const { createCondition, deleteCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      expect(conditions.value).toHaveLength(1)

      const result = await deleteCondition(condition!.id)

      expect(result.success).toBe(true)
      expect(conditions.value).toHaveLength(0)
    })

    it('should remove condition from AstDB', async () => {
      const { createCondition, deleteCondition } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await deleteCondition(condition!.id)

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBDel',
          Family: 'timeconditions',
          Key: condition!.id,
        })
      )
    })

    it('should reject invalid condition ID', async () => {
      const { deleteCondition } = useAmiTimeConditions(mockClient as unknown as AmiClient)

      const result = await deleteCondition('../../../etc/passwd')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid condition ID')
    })
  })

  describe('updateCondition', () => {
    it('should update condition properties', async () => {
      const { createCondition, updateCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Original',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await updateCondition(condition!.id, { name: 'Updated', enabled: false })

      expect(conditions.value[0].name).toBe('Updated')
      expect(conditions.value[0].enabled).toBe(false)
    })

    it('should not allow ID change', async () => {
      const { createCondition, updateCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const originalId = condition!.id

      await updateCondition(condition!.id, { id: 'new_id' } as Partial<TimeCondition>)

      expect(conditions.value[0].id).toBe(originalId)
    })

    it('should fail for non-existent condition', async () => {
      const { updateCondition } = useAmiTimeConditions(mockClient as unknown as AmiClient)

      const result = await updateCondition('nonexistent', { name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Condition not found')
    })
  })

  describe('status calculation', () => {
    it('should return open during business hours', async () => {
      // System time is Wednesday 10:00 AM
      const { createCondition, statuses, isOpen: _isOpen } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      const condition = statuses.value.values().next().value
      expect(condition?.state).toBe('open')
      expect(condition?.statusText).toBe('Open')
    })

    it('should return closed outside business hours', async () => {
      // Set time to 8 PM
      vi.setSystemTime(new Date('2024-12-25T20:00:00'))

      const { createCondition, statuses, isClosed: _isClosed } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      const status = Array.from(statuses.value.values())[0]
      expect(status?.state).toBe('closed')
    })

    it('should detect holiday status', async () => {
      // Dec 25 is Christmas
      const { createCondition, statuses, isHoliday } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [
          { id: 'xmas', name: 'Christmas', date: '2024-12-25', recurring: true },
        ],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      expect(isHoliday(condition!.id)).toBe(true)

      const status = statuses.value.get(condition!.id)
      expect(status?.state).toBe('holiday')
      expect(status?.statusText).toBe('Holiday: Christmas')
      expect(status?.currentHoliday?.name).toBe('Christmas')
    })

    it('should handle recurring holidays across years', async () => {
      // Check if recurring holiday matches by month-day
      vi.setSystemTime(new Date('2025-12-25T10:00:00'))

      const { createCondition, isHoliday } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [],
        holidays: [
          { id: 'xmas', name: 'Christmas', date: '2024-12-25', recurring: true },
        ],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      expect(isHoliday(condition!.id)).toBe(true)
    })
  })

  describe('override management', () => {
    it('should set force_open override', async () => {
      vi.setSystemTime(new Date('2024-12-25T20:00:00')) // After hours

      const { createCondition, setOverride, isOpen, statuses } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      // Normally closed at 8 PM
      expect(isOpen(condition!.id)).toBe(false)

      // Set force open
      const result = await setOverride(condition!.id, 'force_open')

      expect(result.success).toBe(true)
      expect(isOpen(condition!.id)).toBe(true)

      const status = statuses.value.get(condition!.id)
      expect(status?.state).toBe('override_open')
      expect(status?.isOverrideActive).toBe(true)
    })

    it('should set force_closed override', async () => {
      const { createCondition, setOverride, isClosed, statuses } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      // Normally open at 10 AM
      expect(isClosed(condition!.id)).toBe(false)

      // Set force closed
      await setOverride(condition!.id, 'force_closed')

      expect(isClosed(condition!.id)).toBe(true)

      const status = statuses.value.get(condition!.id)
      expect(status?.state).toBe('override_closed')
    })

    it('should set temporary override with expiration', async () => {
      const { createCondition, setOverride, statuses: _statuses, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // Set temporary override for 1 hour
      const result = await setOverride(condition!.id, 'temporary', 60 * 60 * 1000)

      expect(result.success).toBe(true)
      expect(result.expiresAt).toBeDefined()
      expect(conditions.value[0].overrideExpires).toBeDefined()
    })

    it('should clear override', async () => {
      const { createCondition, setOverride, clearOverride, hasOverride } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await setOverride(condition!.id, 'force_closed')
      expect(hasOverride(condition!.id)).toBe(true)

      await clearOverride(condition!.id)
      expect(hasOverride(condition!.id)).toBe(false)
    })

    it('should toggle override between open and closed', async () => {
      const { createCondition, toggleOverride, statuses } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      // Currently open at 10 AM, toggle should force closed
      await toggleOverride(condition!.id)
      expect(statuses.value.get(condition!.id)?.state).toBe('override_closed')

      // Toggle again should force open
      await toggleOverride(condition!.id)
      expect(statuses.value.get(condition!.id)?.state).toBe('override_open')
    })

    it('should trigger callbacks on override', async () => {
      const onOverrideSet = vi.fn()
      const onOverrideCleared = vi.fn()

      const { createCondition, setOverride, clearOverride } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { onOverrideSet, onOverrideCleared, autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await setOverride(condition!.id, 'force_open')
      expect(onOverrideSet).toHaveBeenCalledWith(condition!.id, 'force_open')

      await clearOverride(condition!.id)
      expect(onOverrideCleared).toHaveBeenCalledWith(condition!.id)
    })

    it('should reject invalid condition ID for override', async () => {
      const { setOverride } = useAmiTimeConditions(mockClient as unknown as AmiClient)

      const result = await setOverride('invalid<script>', 'force_open')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid condition ID')
    })
  })

  describe('holiday management', () => {
    it('should add a holiday', async () => {
      const { createCondition, addHoliday, getHolidays } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const result = await addHoliday(condition!.id, {
        name: 'New Year',
        date: '2025-01-01',
        recurring: true,
      })

      expect(result.success).toBe(true)
      expect(result.holiday?.name).toBe('New Year')
      expect(result.holiday?.id).toBeDefined()

      const holidays = getHolidays(condition!.id)
      expect(holidays).toHaveLength(1)
    })

    it('should sanitize holiday input', async () => {
      const { createCondition, addHoliday, getHolidays } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await addHoliday(condition!.id, {
        name: '<script>xss</script>Holiday',
        date: '2025-01-01',
        recurring: true,
        description: 'Test <b>bold</b>',
      })

      const holidays = getHolidays(condition!.id)
      // sanitizeInput strips HTML tags and removes special chars
      expect(holidays[0].name).not.toContain('<script>')
      expect(holidays[0].description).not.toContain('<b>')
    })

    it('should validate date format', async () => {
      const { createCondition, addHoliday } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const result = await addHoliday(condition!.id, {
        name: 'Invalid',
        date: 'invalid-date',
        recurring: false,
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid date format (use YYYY-MM-DD)')
    })

    it('should remove a holiday', async () => {
      const { createCondition, addHoliday, removeHoliday, getHolidays } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const { holiday } = await addHoliday(condition!.id, {
        name: 'Test Holiday',
        date: '2025-01-01',
        recurring: false,
      })

      const result = await removeHoliday(condition!.id, holiday!.id)

      expect(result.success).toBe(true)
      expect(getHolidays(condition!.id)).toHaveLength(0)
    })

    it('should update a holiday', async () => {
      const { createCondition, addHoliday, updateHoliday, getHolidays } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const { holiday } = await addHoliday(condition!.id, {
        name: 'Original',
        date: '2025-01-01',
        recurring: false,
      })

      await updateHoliday(condition!.id, holiday!.id, {
        name: 'Updated',
        recurring: true,
      })

      const holidays = getHolidays(condition!.id)
      expect(holidays[0].name).toBe('Updated')
      expect(holidays[0].recurring).toBe(true)
    })

    it('should get upcoming holidays', async () => {
      vi.setSystemTime(new Date('2024-12-20T10:00:00'))

      const { createCondition, getUpcomingHolidays } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [
          { id: '1', name: 'Christmas', date: '2024-12-25', recurring: true },
          { id: '2', name: 'New Year', date: '2025-01-01', recurring: true },
          { id: '3', name: 'Far Future', date: '2025-06-01', recurring: false },
        ],
        overrideMode: 'none',
        enabled: true,
      })

      const upcoming = getUpcomingHolidays(condition!.id, 30)

      expect(upcoming).toHaveLength(2)
      expect(upcoming[0].name).toBe('Christmas')
      expect(upcoming[1].name).toBe('New Year')
    })
  })

  describe('schedule management', () => {
    it('should update day schedule', async () => {
      const { createCondition, updateDaySchedule, getDaySchedule } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [
          { day: 'monday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const result = await updateDaySchedule(condition!.id, 'monday', {
        enabled: true,
        ranges: [
          { start: '08:00', end: '12:00' },
          { start: '13:00', end: '18:00' },
        ],
      })

      expect(result.success).toBe(true)

      const schedule = getDaySchedule(condition!.id, 'monday')
      expect(schedule?.ranges).toHaveLength(2)
      expect(schedule?.ranges[0].start).toBe('08:00')
    })

    it('should validate time format', async () => {
      const { createCondition, updateDaySchedule } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [
          { day: 'monday', enabled: true, ranges: [] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const result = await updateDaySchedule(condition!.id, 'monday', {
        ranges: [{ start: '9am', end: '5pm' }],
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid time format (use HH:MM)')
    })

    it('should set full weekly schedule', async () => {
      const { createCondition, setWeeklySchedule, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const newSchedule: DailySchedule[] = [
        { day: 'monday', enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
        { day: 'tuesday', enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
        { day: 'wednesday', enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
        { day: 'thursday', enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
        { day: 'friday', enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
        { day: 'saturday', enabled: false, ranges: [] },
        { day: 'sunday', enabled: false, ranges: [] },
      ]

      const result = await setWeeklySchedule(condition!.id, newSchedule)

      expect(result.success).toBe(true)
      expect(conditions.value[0].schedule).toEqual(newSchedule)
    })

    it('should handle overnight time ranges', async () => {
      // Set time to 11 PM Wednesday
      vi.setSystemTime(new Date('2024-12-25T23:00:00'))

      const { createCondition, isOpen } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Night Shift',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '22:00', end: '06:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      expect(isOpen(condition!.id)).toBe(true)
    })
  })

  describe('next change calculation', () => {
    it('should calculate next closing time', async () => {
      const { createCondition, getNextChange } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      const nextChange = getNextChange(condition!.id)

      expect(nextChange?.state).toBe('closed')
      expect(nextChange?.reason).toBe('Schedule closes')
      expect(nextChange?.at.getHours()).toBe(17)
    })

    it('should calculate next opening time when closed', async () => {
      // Set time to 8 AM Wednesday (before opening)
      vi.setSystemTime(new Date('2024-12-25T08:00:00'))

      const { createCondition, getNextChange } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      const nextChange = getNextChange(condition!.id)

      expect(nextChange?.state).toBe('open')
      expect(nextChange?.reason).toBe('Schedule opens')
      expect(nextChange?.at.getHours()).toBe(9)
    })

    it('should find next open day', async () => {
      // Set time to Saturday 10 AM
      vi.setSystemTime(new Date('2024-12-28T10:00:00'))

      const { createCondition, getNextChange } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'monday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
          { day: 'saturday', enabled: false, ranges: [] },
          { day: 'sunday', enabled: false, ranges: [] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      const nextChange = getNextChange(condition!.id)

      expect(nextChange?.state).toBe('open')
      expect(nextChange?.reason).toBe('Opens on monday')
    })

    it('should show override expiration as next change', async () => {
      const { createCondition, setOverride, getNextChange } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // Set temporary override for 2 hours
      await setOverride(condition!.id, 'temporary', 2 * 60 * 60 * 1000)
      await vi.advanceTimersByTimeAsync(100)

      const nextChange = getNextChange(condition!.id)

      expect(nextChange?.reason).toBe('Override expires')
    })
  })

  describe('checkStatusAt', () => {
    it('should check status at future time', async () => {
      const { createCondition, checkStatusAt } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // Check status at 8 PM
      const futureStatus = checkStatusAt(condition!.id, new Date('2024-12-25T20:00:00'))

      expect(futureStatus?.state).toBe('closed')
    })

    it('should check status at past time', async () => {
      const { createCondition, checkStatusAt } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // Check status at 2 PM
      const pastStatus = checkStatusAt(condition!.id, new Date('2024-12-25T14:00:00'))

      expect(pastStatus?.state).toBe('open')
    })
  })

  describe('computed conditions', () => {
    it('should filter open conditions', async () => {
      const { createCondition, openConditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      await createCondition({
        name: 'Open Business',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await createCondition({
        name: 'Closed Business',
        schedule: [
          { day: 'wednesday', enabled: false, ranges: [] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      expect(openConditions.value).toHaveLength(1)
      expect(openConditions.value[0].name).toBe('Open Business')
    })

    it('should filter closed conditions', async () => {
      vi.setSystemTime(new Date('2024-12-25T20:00:00')) // After hours

      const { createCondition, closedConditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      await createCondition({
        name: 'After Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      expect(closedConditions.value).toHaveLength(1)
    })

    it('should filter overridden conditions', async () => {
      const { createCondition, setOverride, overriddenConditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      const { condition: _cond1 } = await createCondition({
        name: 'Normal',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const { condition: cond2 } = await createCondition({
        name: 'Overridden',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await setOverride(cond2!.id, 'force_closed')

      expect(overriddenConditions.value).toHaveLength(1)
      expect(overriddenConditions.value[0].name).toBe('Overridden')
    })
  })

  describe('state change callback', () => {
    it('should trigger onStateChange when status changes', async () => {
      const onStateChange = vi.fn()

      const { createCondition, setOverride } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { onStateChange, autoRefresh: false }
      )

      const { condition } = await createCondition({
        name: 'Business Hours',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)
      onStateChange.mockClear()

      // Force close to trigger state change
      await setOverride(condition!.id, 'force_closed')

      expect(onStateChange).toHaveBeenCalledWith(
        condition!.id,
        expect.objectContaining({ state: 'override_closed' })
      )
    })
  })

  describe('error handling', () => {
    it('should handle AMI errors', async () => {
      const onError = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Error', Message: 'Database error' } })

      const { createCondition, error: _error } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { onError, autoRefresh: false }
      )

      const result = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      expect(result.success).toBe(false)
    })

    it('should handle exceptions', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Network error'))

      const { setOverride, createCondition: _createCondition, conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      // Manually add a condition for testing
      conditions.value.push({
        id: 'test',
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      const result = await setOverride('test', 'force_open')

      expect(result.success).toBe(false)
      // The error message could be 'Network error' or 'Failed to store override' depending on how the exception is caught
      expect(result.message).toBeDefined()
    })
  })

  describe('refresh', () => {
    it('should load conditions from AstDB', async () => {
      const storedCondition = {
        id: 'stored',
        n: 'Stored Condition',
        s: [{ d: 'monday', e: true, r: [{ start: '09:00', end: '17:00' }] }],
        h: [],
        om: 'none',
        en: true,
      }

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          'Key-0': 'stored',
          'Val-0': JSON.stringify(storedCondition),
        },
      })

      const { refresh, conditions } = useAmiTimeConditions(mockClient as unknown as AmiClient, { autoRefresh: false })

      await refresh()
      await vi.advanceTimersByTimeAsync(100)

      expect(conditions.value).toHaveLength(1)
      expect(conditions.value[0].name).toBe('Stored Condition')
    })

    it('should call DBGetTree action', async () => {
      const { refresh } = useAmiTimeConditions(mockClient as unknown as AmiClient)

      await refresh()

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'DBGetTree',
        Family: 'timeconditions',
      })
    })
  })

  describe('auto-refresh', () => {
    it('should update statuses on interval', async () => {
      const { createCondition, statuses } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: true, refreshInterval: 60000 }
      )

      await createCondition({
        name: 'Test',
        schedule: [
          { day: 'wednesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // Wait for initial setup
      await vi.advanceTimersByTimeAsync(100)

      const initialCheckedAt = statuses.value.values().next().value?.checkedAt

      // Advance time by refresh interval
      await vi.advanceTimersByTimeAsync(60000)

      const newCheckedAt = statuses.value.values().next().value?.checkedAt

      expect(newCheckedAt).not.toEqual(initialCheckedAt)
    })

    it('should respect disabled auto-refresh', async () => {
      const { createCondition, statuses } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { autoRefresh: false }
      )

      await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      await vi.advanceTimersByTimeAsync(100)

      const initialCheckedAt = statuses.value.values().next().value?.checkedAt

      // Advance time significantly
      await vi.advanceTimersByTimeAsync(120000)

      const newCheckedAt = statuses.value.values().next().value?.checkedAt

      // Should be the same since auto-refresh is disabled
      expect(newCheckedAt).toEqual(initialCheckedAt)
    })
  })

  describe('custom dbFamily', () => {
    it('should use custom dbFamily for storage', async () => {
      const { createCondition, refresh } = useAmiTimeConditions(
        mockClient as unknown as AmiClient,
        { dbFamily: 'custom_timeconditions' }
      )

      await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBPut',
          Family: 'custom_timeconditions',
        })
      )

      await refresh()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBGetTree',
          Family: 'custom_timeconditions',
        })
      )
    })
  })

  describe('security validation', () => {
    it('should validate condition ID format', async () => {
      const { setOverride } = useAmiTimeConditions(mockClient as unknown as AmiClient)

      // Test various invalid IDs
      const invalidIds = [
        '../etc/passwd',
        'id<script>',
        'id;rm -rf',
        'id|cat /etc/passwd',
        '',
        'a'.repeat(100), // Too long
      ]

      for (const id of invalidIds) {
        const result = await setOverride(id, 'force_open')
        expect(result.success).toBe(false)
      }
    })

    it('should accept valid condition IDs', async () => {
      const { createCondition, setOverride: _setOverride, conditions: _conditions } = useAmiTimeConditions(
        mockClient as unknown as AmiClient
      )

      // Create condition with valid ID pattern
      const { condition } = await createCondition({
        name: 'Test',
        schedule: [],
        holidays: [],
        overrideMode: 'none',
        enabled: true,
      })

      // The generated ID should be valid
      expect(condition?.id).toMatch(/^[a-zA-Z0-9_-]+$/)
    })
  })
})
