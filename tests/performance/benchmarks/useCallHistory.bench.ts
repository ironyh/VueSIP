/**
 * useCallHistory Performance Benchmarks
 *
 * Micro-benchmarks for getStatistics in useCallHistory composable.
 *
 * Run with: pnpm vitest bench tests/performance/benchmarks/useCallHistory.bench.ts
 */

import { describe, bench, vi, beforeEach } from 'vitest'
import { useCallHistory } from '../../../src/composables/useCallHistory'
import { CallDirection } from '../../../src/types/call.types'
import type { CallHistoryEntry } from '../../../src/types/history.types'

// Mock the logger
vi.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock call store
const mockCallHistory: CallHistoryEntry[] = []

vi.mock('../../../src/stores/callStore', () => ({
  callStore: {
    get callHistory() {
      return mockCallHistory
    },
    clearHistory: vi.fn(),
    deleteHistoryEntry: vi.fn(),
  },
}))

/**
 * Helper to create mock call history entries
 */
const createMockHistory = (count: number): void => {
  mockCallHistory.length = 0

  const baseTime = new Date('2024-01-01').getTime()
  const directions = [CallDirection.Incoming, CallDirection.Outgoing]
  const remoteUris = [
    'sip:alice@example.com',
    'sip:bob@example.com',
    'sip:charlie@example.com',
    'sip:david@example.com',
    'sip:eve@example.com',
  ]
  const displayNames = ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'David Lee', 'Eve Wilson']

  for (let i = 0; i < count; i++) {
    const direction = directions[i % 2]
    const remoteIndex = i % remoteUris.length
    const startTime = new Date(baseTime + i * 60000)
    const duration = Math.floor(Math.random() * 300) + 30
    const endTime = new Date(startTime.getTime() + duration * 1000)
    const wasAnswered = Math.random() > 0.2
    const wasMissed = !wasAnswered && direction === CallDirection.Incoming

    mockCallHistory.push({
      id: `call-${i}`,
      direction,
      remoteUri: remoteUris[remoteIndex],
      remoteDisplayName: displayNames[remoteIndex],
      localUri: 'sip:me@example.com',
      startTime,
      endTime,
      duration,
      finalState: wasAnswered ? 'completed' : 'missed',
      terminationCause: wasAnswered ? 'normal' : 'no-answer',
      wasAnswered,
      wasMissed,
      hasVideo: Math.random() > 0.8,
      tags: i % 10 === 0 ? ['important'] : undefined,
    })
  }
}

describe('useCallHistory.getStatistics Performance', () => {
  const { getStatistics } = useCallHistory()

  describe('100 entries', () => {
    beforeEach(() => {
      createMockHistory(100)
    })

    bench('getStatistics', () => {
      getStatistics()
    })
  })

  describe('1000 entries', () => {
    beforeEach(() => {
      createMockHistory(1000)
    })

    bench('getStatistics', () => {
      getStatistics()
    })
  })

  describe('5000 entries', () => {
    beforeEach(() => {
      createMockHistory(5000)
    })

    bench('getStatistics', () => {
      getStatistics()
    })
  })
})
