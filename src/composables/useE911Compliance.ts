/**
 * Internal E911 compliance logging composable.
 * Used by useSipE911; not part of the public API.
 *
 * @internal
 */

import { ref, type Ref } from 'vue'
import type { E911ComplianceLog } from '@/types/e911.types'
import { generateE911Id } from '@/utils/e911'

const MAX_LOGS = 1000

export interface UseE911ComplianceReturn {
  complianceLogs: Ref<E911ComplianceLog[]>
  addLog: (
    event: E911ComplianceLog['event'],
    description: string,
    severity?: E911ComplianceLog['severity'],
    callId?: string,
    details?: Record<string, unknown>
  ) => void
  getLogs: (limit?: number) => E911ComplianceLog[]
  exportLogs: (format: 'json' | 'csv') => string
  /** Remove logs older than date; returns count removed. Caller may addLog. */
  clearOldLogs: (olderThan: Date) => number
}

/**
 * Compliance log state and export. addLog only appends when complianceLogging is true.
 */
export function useE911Compliance(complianceLogging: Ref<boolean>): UseE911ComplianceReturn {
  const complianceLogs = ref<E911ComplianceLog[]>([])

  function addLog(
    event: E911ComplianceLog['event'],
    description: string,
    severity: E911ComplianceLog['severity'] = 'info',
    callId?: string,
    details?: Record<string, unknown>
  ): void {
    if (!complianceLogging.value) return

    const log: E911ComplianceLog = {
      id: generateE911Id(),
      callId,
      event,
      description,
      actor: 'system',
      timestamp: new Date(),
      details,
      severity,
    }
    complianceLogs.value.unshift(log)
    if (complianceLogs.value.length > MAX_LOGS) {
      complianceLogs.value = complianceLogs.value.slice(0, MAX_LOGS)
    }
  }

  function getLogs(limit?: number): E911ComplianceLog[] {
    if (limit != null) return complianceLogs.value.slice(0, limit)
    return complianceLogs.value
  }

  function exportLogs(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(complianceLogs.value, null, 2)
    }
    const headers = ['id', 'callId', 'event', 'description', 'actor', 'timestamp', 'severity']
    const escapeCSV = (value: string): string => {
      if (
        value.includes(',') ||
        value.includes('\n') ||
        value.includes('\r') ||
        value.includes('"')
      ) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }
    const rows = complianceLogs.value.map((log) => [
      escapeCSV(log.id),
      escapeCSV(log.callId || ''),
      escapeCSV(log.event),
      escapeCSV(log.description),
      escapeCSV(log.actor),
      escapeCSV(log.timestamp.toISOString()),
      escapeCSV(log.severity),
    ])
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  }

  function clearOldLogs(olderThan: Date): number {
    const cutoff = olderThan.getTime()
    const before = complianceLogs.value.length
    complianceLogs.value = complianceLogs.value.filter((log) => log.timestamp.getTime() > cutoff)
    return before - complianceLogs.value.length
  }

  return {
    complianceLogs,
    addLog,
    getLogs,
    exportLogs,
    clearOldLogs,
  }
}
