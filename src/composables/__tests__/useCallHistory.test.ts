/**
 * useCallHistory composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCallHistory } from '../useCallHistory'
import { callStore } from '@/stores/callStore'
import { CallDirection, CallState, TerminationCause } from '@/types/call.types'
import type { CallHistoryEntry } from '@/types/history.types'

// Mock the callStore
vi.mock('@/stores/callStore', () => ({
  callStore: {
    callHistory: [],
    clearHistory: vi.fn(),
    deleteHistoryEntry: vi.fn(),
  },
}))

describe('useCallHistory', () => {
  let mockHistory: CallHistoryEntry[]

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock call history entries
    mockHistory = [
      {
        id: 'call-1',
        direction: CallDirection.Incoming,
        remoteUri: '+1234567890',
        remoteDisplayName: 'John Doe',
        localUri: '100@example.com',
        startTime: new Date('2026-03-10T10:00:00Z'),
        answerTime: new Date('2026-03-10T10:00:05Z'),
        endTime: new Date('2026-03-10T10:05:00Z'),
        duration: 300,
        ringDuration: 5,
        finalState: CallState.Confirmed,
        terminationCause: TerminationCause.CallCompletedElsewhere,
        wasAnswered: true,
        wasMissed: false,
        hasVideo: false,
        tags: ['work'],
      },
      {
        id: 'call-2',
        direction: CallDirection.Outgoing,
        remoteUri: '+0987654321',
        remoteDisplayName: 'Jane Smith',
        localUri: '100@example.com',
        startTime: new Date('2026-03-11T14:00:00Z'),
        answerTime: new Date('2026-03-11T14:00:03Z'),
        endTime: new Date('2026-03-11T14:10:00Z'),
        duration: 597,
        ringDuration: 3,
        finalState: CallState.Confirmed,
        terminationCause: TerminationCause.CallCompletedNormally,
        wasAnswered: true,
        wasMissed: false,
        hasVideo: true,
        tags: ['personal'],
      },
      {
        id: 'call-3',
        direction: CallDirection.Incoming,
        remoteUri: '+1122334455',
        remoteDisplayName: 'Unknown Caller',
        localUri: '100@example.com',
        startTime: new Date('2026-03-12T09:00:00Z'),
        endTime: new Date('2026-03-12T09:00:15Z'),
        duration: 0,
        ringDuration: 15,
        finalState: CallState.Canceled,
        terminationCause: TerminationCause.BusyHere,
        wasAnswered: false,
        wasMissed: true,
        hasVideo: false,
        tags: [],
      },
    ]

    // @ts-expect-error - mock assignment
    callStore.callHistory = mockHistory
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('initial state', () => {
    it('should return empty filtered history when no filter is set', () => {
      const { filteredHistory } = useCallHistory()
      expect(filteredHistory.value).toHaveLength(3)
    })

    it('should return correct total calls count', () => {
      const { totalCalls } = useCallHistory()
      expect(totalCalls.value).toBe(3)
    })

    it('should return correct missed calls count', () => {
      const { missedCallsCount } = useCallHistory()
      expect(missedCallsCount.value).toBe(1)
    })
  })

  describe('getHistory', () => {
    it('should return all history when no filter is provided', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory()
      expect(result.entries).toHaveLength(3)
      expect(result.totalCount).toBe(3)
      expect(result.hasMore).toBe(false)
    })

    it('should filter by direction', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ direction: CallDirection.Incoming })
      expect(result.entries).toHaveLength(2)
      expect(result.entries.every((e) => e.direction === CallDirection.Incoming)).toBe(true)
    })

    it('should filter by remote URI', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ remoteUri: '+123' })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-1')
    })

    it('should filter by wasAnswered', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ wasAnswered: true })
      expect(result.entries).toHaveLength(2)
      expect(result.entries.every((e) => e.wasAnswered)).toBe(true)
    })

    it('should filter by wasMissed', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ wasMissed: true })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-3')
    })

    it('should filter by hasVideo', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ hasVideo: true })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-2')
    })

    it('should filter by date range', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({
        dateFrom: new Date('2026-03-11T00:00:00Z'),
        dateTo: new Date('2026-03-11T23:59:59Z'),
      })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-2')
    })

    it('should filter by tags', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ tags: ['work'] })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-1')
    })

    it('should support pagination with limit and offset', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ limit: 1, offset: 1 })
      expect(result.entries).toHaveLength(1)
      expect(result.totalCount).toBe(3)
      expect(result.hasMore).toBe(true)
    })

    it('should sort by startTime ascending', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ sortBy: 'startTime', sortOrder: 'asc' })
      expect(result.entries[0].id).toBe('call-1')
      expect(result.entries[2].id).toBe('call-3')
    })

    it('should sort by startTime descending', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ sortBy: 'startTime', sortOrder: 'desc' })
      expect(result.entries[0].id).toBe('call-3')
      expect(result.entries[2].id).toBe('call-1')
    })

    it('should sort by duration', () => {
      const { getHistory } = useCallHistory()
      const result = getHistory({ sortBy: 'duration', sortOrder: 'desc' })
      expect(result.entries[0].id).toBe('call-2') // 597 seconds
      expect(result.entries[2].id).toBe('call-3') // 0 seconds
    })
  })

  describe('searchHistory', () => {
    it('should search by remote URI', () => {
      const { searchHistory } = useCallHistory()
      const result = searchHistory('+1234567890')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-1')
    })

    it('should search by remote display name', () => {
      const { searchHistory } = useCallHistory()
      const result = searchHistory('john')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-1')
    })

    it('should be case insensitive', () => {
      const { searchHistory } = useCallHistory()
      const result = searchHistory('JANE')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-2')
    })

    it('should combine search with other filters', () => {
      const { searchHistory } = useCallHistory()
      // call-2 remoteUri is '+0987654321', direction is Outgoing
      const result = searchHistory('+0987', { direction: CallDirection.Outgoing })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('call-2')
    })
  })

  describe('setFilter', () => {
    it('should set current filter and update filteredHistory', () => {
      const { setFilter, filteredHistory, currentFilter } = useCallHistory()
      setFilter({ direction: CallDirection.Incoming })
      expect(currentFilter.value).toEqual({ direction: CallDirection.Incoming })
      expect(filteredHistory.value).toHaveLength(2)
    })

    it('should clear filter when set to null', () => {
      const { setFilter, filteredHistory, currentFilter } = useCallHistory()
      setFilter({ direction: CallDirection.Incoming })
      expect(filteredHistory.value).toHaveLength(2)
      setFilter(null)
      expect(currentFilter.value).toBeNull()
      expect(filteredHistory.value).toHaveLength(3)
    })
  })

  describe('clearHistory', () => {
    it('should call callStore.clearHistory', async () => {
      const { clearHistory } = useCallHistory()
      await clearHistory()
      expect(callStore.clearHistory).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteEntry', () => {
    it('should call callStore.deleteHistoryEntry with entry id', async () => {
      const { deleteEntry } = useCallHistory()
      await deleteEntry('call-1')
      expect(callStore.deleteHistoryEntry).toHaveBeenCalledWith('call-1')
    })
  })

  describe('getMissedCalls', () => {
    it('should return only missed calls', () => {
      const { getMissedCalls } = useCallHistory()
      const missedCalls = getMissedCalls()
      expect(missedCalls).toHaveLength(1)
      expect(missedCalls[0].id).toBe('call-3')
    })
  })

  describe('getRecentCalls', () => {
    it('should return default limit of 10 calls', () => {
      const { getRecentCalls } = useCallHistory()
      const recentCalls = getRecentCalls()
      expect(recentCalls).toHaveLength(3) // Only 3 in our mock
    })

    it('should respect custom limit', () => {
      const { getRecentCalls } = useCallHistory()
      const recentCalls = getRecentCalls(2)
      expect(recentCalls).toHaveLength(2)
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics for all history', () => {
      const { getStatistics } = useCallHistory()
      const stats = getStatistics()

      expect(stats.totalCalls).toBe(3)
      expect(stats.incomingCalls).toBe(2)
      expect(stats.outgoingCalls).toBe(1)
      expect(stats.answeredCalls).toBe(2)
      expect(stats.missedCalls).toBe(1)
      expect(stats.videoCalls).toBe(1)
      expect(stats.totalDuration).toBe(897) // 300 + 597 + 0
      expect(stats.averageDuration).toBe(299) // 897 / 3
    })

    it('should return correct statistics with filter', () => {
      const { getStatistics } = useCallHistory()
      const stats = getStatistics({ direction: CallDirection.Incoming })

      expect(stats.totalCalls).toBe(2)
      expect(stats.incomingCalls).toBe(2)
      expect(stats.outgoingCalls).toBe(0)
    })

    it('should identify frequent contacts', () => {
      const { getStatistics } = useCallHistory()
      const stats = getStatistics()

      expect(stats.frequentContacts).toHaveLength(3)
      // Should be sorted by count descending
      expect(stats.frequentContacts[0].count).toBeGreaterThanOrEqual(
        stats.frequentContacts[1].count
      )
    })
  })
})
