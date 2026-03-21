/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useE911Compliance } from '@/composables/useE911Compliance'

describe('useE911Compliance', () => {
  let complianceLogging: ReturnType<typeof ref<boolean>>

  beforeEach(() => {
    complianceLogging = ref(true)
  })

  describe('addLog', () => {
    it('should add a log entry when complianceLogging is true', () => {
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Test emergency call started', 'info', 'call-123')

      expect(complianceLogs.value).toHaveLength(1)
      expect(complianceLogs.value[0].event).toBe('call_initiated')
      expect(complianceLogs.value[0].description).toBe('Test emergency call started')
      expect(complianceLogs.value[0].severity).toBe('info')
      expect(complianceLogs.value[0].callId).toBe('call-123')
      expect(complianceLogs.value[0].actor).toBe('system')
      expect(complianceLogs.value[0].id).toBeTruthy()
      expect(complianceLogs.value[0].timestamp).toBeInstanceOf(Date)
    })

    it('should not add log when complianceLogging is false', () => {
      complianceLogging.value = false
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Should not be added', 'info')

      expect(complianceLogs.value).toHaveLength(0)
    })

    it('should default severity to info when not specified', () => {
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      addLog('call_ended', 'Call ended')

      expect(complianceLogs.value[0].severity).toBe('info')
    })

    it('should accept custom severity levels', () => {
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      addLog('notification_failed', 'Failed to send notification', 'critical')

      expect(complianceLogs.value[0].severity).toBe('critical')
    })

    it('should accept optional details object', () => {
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      addLog('location_updated', 'Location updated', 'info', undefined, {
        locationId: 'loc-456',
        previousCity: 'Old City',
        newCity: 'New City',
      })

      expect(complianceLogs.value[0].details).toEqual({
        locationId: 'loc-456',
        previousCity: 'Old City',
        newCity: 'New City',
      })
    })

    it('should prepend new logs (newest first)', () => {
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'First call', 'info')
      addLog('call_ended', 'Second call', 'info')

      expect(complianceLogs.value).toHaveLength(2)
      expect(complianceLogs.value[0].description).toBe('Second call')
      expect(complianceLogs.value[1].description).toBe('First call')
    })

    it('should limit logs to MAX_LOGS (1000)', () => {
      const { complianceLogs, addLog } = useE911Compliance(complianceLogging)

      // Add more than MAX_LOGS
      for (let i = 0; i < 1005; i++) {
        addLog('call_initiated', `Call ${i}`, 'info')
      }

      expect(complianceLogs.value).toHaveLength(1000)
      // Most recent should be last added
      expect(complianceLogs.value[0].description).toBe('Call 1004')
    })
  })

  describe('getLogs', () => {
    it('should return all logs when no limit specified', () => {
      const { addLog, getLogs } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Call 1', 'info')
      addLog('call_ended', 'Call 2', 'info')

      const logs = getLogs()

      expect(logs).toHaveLength(2)
    })

    it('should return limited logs when limit specified', () => {
      const { addLog, getLogs } = useE911Compliance(complianceLogging)

      for (let i = 0; i < 10; i++) {
        addLog('call_initiated', `Call ${i}`, 'info')
      }

      const logs = getLogs(3)

      expect(logs).toHaveLength(3)
    })

    it('should return most recent logs first when limited', () => {
      const { addLog, getLogs } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'First', 'info')
      addLog('call_initiated', 'Second', 'info')
      addLog('call_initiated', 'Third', 'info')

      const logs = getLogs(2)

      expect(logs[0].description).toBe('Third')
      expect(logs[1].description).toBe('Second')
    })
  })

  describe('exportLogs', () => {
    it('should export logs as JSON', () => {
      const { addLog, exportLogs } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Test call', 'info', 'call-123')

      const json = exportLogs('json')
      const parsed = JSON.parse(json)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].event).toBe('call_initiated')
      expect(parsed[0].callId).toBe('call-123')
    })

    it('should export logs as CSV', () => {
      const { addLog, exportLogs } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Test call', 'info', 'call-123')

      const csv = exportLogs('csv')
      const lines = csv.split('\n')

      expect(lines[0]).toBe('id,callId,event,description,actor,timestamp,severity')
      expect(lines[1]).toContain('call_initiated')
      expect(lines[1]).toContain('Test call')
    })

    it('should handle empty logs in JSON export', () => {
      const { exportLogs } = useE911Compliance(complianceLogging)

      const json = exportLogs('json')

      expect(json).toBe('[]')
    })

    it('should handle empty logs in CSV export', () => {
      const { exportLogs } = useE911Compliance(complianceLogging)

      const csv = exportLogs('csv')

      expect(csv).toBe('id,callId,event,description,actor,timestamp,severity')
    })

    it('should escape CSV special characters', () => {
      const { addLog, exportLogs } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Test, with "special" \n chars', 'info')

      const csv = exportLogs('csv')
      const lines = csv.split('\n')

      // Should be quoted
      expect(lines[1]).toContain('"Test, with ""special""')
    })
  })

  describe('clearOldLogs', () => {
    it('should remove logs older than specified date', () => {
      const { addLog, clearOldLogs, complianceLogs } = useE911Compliance(complianceLogging)

      // Add log with old timestamp
      addLog('call_initiated', 'Old call', 'info')
      complianceLogs.value[0].timestamp = new Date('2020-01-01')

      addLog('call_initiated', 'New call', 'info')

      const removed = clearOldLogs(new Date('2025-01-01'))

      expect(removed).toBe(1)
      expect(complianceLogs.value).toHaveLength(1)
      expect(complianceLogs.value[0].description).toBe('New call')
    })

    it('should not remove logs newer than specified date', () => {
      const { addLog, clearOldLogs, complianceLogs } = useE911Compliance(complianceLogging)

      addLog('call_initiated', 'Recent call', 'info')
      complianceLogs.value[0].timestamp = new Date()

      const removed = clearOldLogs(new Date('2025-01-01'))

      expect(removed).toBe(0)
      expect(complianceLogs.value).toHaveLength(1)
    })

    it('should return 0 for empty logs', () => {
      const { clearOldLogs } = useE911Compliance(complianceLogging)

      const removed = clearOldLogs(new Date())

      expect(removed).toBe(0)
    })
  })

  describe('return values', () => {
    it('should return all required functions and refs', () => {
      const result = useE911Compliance(complianceLogging)

      expect(result.complianceLogs).toBeDefined()
      expect(result.addLog).toBeDefined()
      expect(result.getLogs).toBeDefined()
      expect(result.exportLogs).toBeDefined()
      expect(result.clearOldLogs).toBeDefined()
      expect(typeof result.addLog).toBe('function')
      expect(typeof result.getLogs).toBe('function')
      expect(typeof result.exportLogs).toBe('function')
      expect(typeof result.clearOldLogs).toBe('function')
    })
  })
})
