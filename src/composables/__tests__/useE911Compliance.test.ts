/**
 * useE911Compliance composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useE911Compliance } from '../useE911Compliance'

describe('useE911Compliance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should return empty compliance logs array when compliance logging is disabled', () => {
      const complianceLogging = ref(false)
      const { complianceLogs } = useE911Compliance(complianceLogging)

      expect(Array.isArray(complianceLogs.value)).toBe(true)
      expect(complianceLogs.value.length).toBe(0)
    })

    it('should return empty array when compliance logging is enabled', () => {
      const complianceLogging = ref(true)
      const { complianceLogs } = useE911Compliance(complianceLogging)

      expect(Array.isArray(complianceLogs.value)).toBe(true)
      expect(complianceLogs.value.length).toBe(0)
    })
  })

  describe('addLog', () => {
    it('should not add log when compliance logging is disabled', () => {
      const complianceLogging = ref(false)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_started', 'Test call started')

      expect(complianceLogs.value.length).toBe(0)
    })

    it('should add log when compliance logging is enabled', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_started', 'Test call started')

      expect(complianceLogs.value.length).toBe(1)
      expect(complianceLogs.value[0].event).toBe('call_started')
      expect(complianceLogs.value[0].description).toBe('Test call started')
    })

    it('should add log with default severity info', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_ended', 'Test call ended')

      expect(complianceLogs.value[0].severity).toBe('info')
    })

    it('should add log with custom severity', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('location_updated', 'Location changed', 'warning')

      expect(complianceLogs.value[0].severity).toBe('warning')
    })

    it('should add log with callId', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_started', 'Test call', 'info', 'call-123')

      expect(complianceLogs.value[0].callId).toBe('call-123')
    })

    it('should add log with details', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('location_updated', 'Location updated', 'info', undefined, {
        city: 'Uppsala',
        country: 'SE',
      })

      expect(complianceLogs.value[0].details).toEqual({ city: 'Uppsala', country: 'SE' })
    })

    it('should prepend new logs (newest first)', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_1', 'First call')
      addLog('call_2', 'Second call')

      expect(complianceLogs.value[0].event).toBe('call_2')
      expect(complianceLogs.value[1].event).toBe('call_1')
    })

    it('should generate unique IDs for each log', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_1', 'First call')
      addLog('call_2', 'Second call')

      expect(complianceLogs.value[0].id).not.toBe(complianceLogs.value[1].id)
    })

    it('should set actor to system by default', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_started', 'Test call')

      expect(complianceLogs.value[0].actor).toBe('system')
    })
  })

  describe('getLogs', () => {
    it('should return all logs when no limit specified', () => {
      const complianceLogging = ref(true)
      const { addLog, getLogs } = useE911Compliance(complianceLogging)

      addLog('call_1', 'First')
      addLog('call_2', 'Second')
      addLog('call_3', 'Third')

      const logs = getLogs()

      expect(logs.length).toBe(3)
    })

    it('should return limited logs', () => {
      const complianceLogging = ref(true)
      const { addLog, getLogs } = useE911Compliance(complianceLogging)

      addLog('call_1', 'First')
      addLog('call_2', 'Second')
      addLog('call_3', 'Third')

      const logs = getLogs(2)

      expect(logs.length).toBe(2)
    })
  })

  describe('exportLogs', () => {
    it('should export logs as JSON', () => {
      const complianceLogging = ref(true)
      const { addLog, exportLogs } = useE911Compliance(complianceLogging)

      addLog('call_started', 'Test call', 'info', 'call-123')

      const json = exportLogs('json')
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].event).toBe('call_started')
    })

    it('should export logs as CSV', () => {
      const complianceLogging = ref(true)
      const { addLog, exportLogs } = useE911Compliance(complianceLogging)

      addLog('call_started', 'Test call', 'info', 'call-123')

      const csv = exportLogs('csv')

      expect(csv).toContain('id,callId,event,description,actor,timestamp,severity')
      expect(csv).toContain('call_started')
    })
  })

  describe('clearOldLogs', () => {
    it('should not remove logs newer than date', () => {
      const complianceLogging = ref(true)
      const { addLog, clearOldLogs, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_1', 'Recent call')

      vi.setSystemTime(new Date('2026-01-01'))
      const removed = clearOldLogs(new Date('2025-01-01'))

      expect(removed).toBe(0)
      expect(complianceLogs.value.length).toBe(1)
    })

    it('should remove logs older than date', () => {
      const complianceLogging = ref(true)
      const { addLog, clearOldLogs, complianceLogs } = useE911Compliance(complianceLogging)

      // Add logs at different times would require more complex mocking
      // This tests the basic functionality
      addLog('call_1', 'Old call')

      vi.setSystemTime(new Date('2027-01-01'))
      const removed = clearOldLogs(new Date('2026-06-01'))

      expect(removed).toBe(1)
      expect(complianceLogs.value.length).toBe(0)
    })
  })

  describe('MAX_LOGS limit', () => {
    it('should cap logs at MAX_LOGS (1000)', () => {
      const complianceLogging = ref(true)
      const { addLog, complianceLogs } = useE911Compliance(complianceLogging)

      // Add 1005 logs (more than MAX_LOGS of 1000)
      for (let i = 0; i < 1005; i++) {
        addLog(`call_${i}`, `Call ${i}`)
      }

      expect(complianceLogs.value.length).toBe(1000)
      // Newest should be first
      expect(complianceLogs.value[0].event).toBe('call_1004')
    })
  })
})
