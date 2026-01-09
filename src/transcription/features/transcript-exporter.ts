/**
 * Transcript export module
 * @packageDocumentation
 */

import type { TranscriptEntry, ExportFormat, ExportOptions } from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('TranscriptExporter')

/**
 * Formats milliseconds as HH:MM:SS,mmm (SRT format)
 */
function formatTimeSRT(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Formats milliseconds as HH:MM:SS.mmm (VTT format)
 */
function formatTimeVTT(ms: number): string {
  return formatTimeSRT(ms).replace(',', '.')
}

/**
 * Formats milliseconds as [HH:MM:SS] (simple timestamp)
 */
function formatTimeSimple(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  if (hours > 0) {
    return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`
  }
  return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`
}

/**
 * Escapes text for CSV format
 */
function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Exports transcript entries to various formats
 *
 * @example
 * ```ts
 * const exporter = new TranscriptExporter()
 *
 * // Export as SRT subtitles
 * const srt = exporter.export(entries, 'srt')
 *
 * // Export as plain text with speakers
 * const txt = exporter.export(entries, 'txt', { includeSpeakers: true })
 * ```
 */
export class TranscriptExporter {
  /**
   * Export transcript entries to specified format
   * @param entries - Transcript entries to export
   * @param format - Export format
   * @param options - Export options
   * @returns Formatted string
   */
  export(entries: TranscriptEntry[], format: ExportFormat, options: ExportOptions = {}): string {
    // Filter entries
    let filtered = this.filterEntries(entries, options)

    logger.debug('Exporting transcript', {
      format,
      totalEntries: entries.length,
      filteredEntries: filtered.length,
    })

    switch (format) {
      case 'json':
        return this.exportJSON(filtered, options)
      case 'txt':
        return this.exportTXT(filtered, options)
      case 'srt':
        return this.exportSRT(filtered)
      case 'vtt':
        return this.exportVTT(filtered)
      case 'csv':
        return this.exportCSV(filtered, options)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Filter entries based on options
   */
  private filterEntries(entries: TranscriptEntry[], options: ExportOptions): TranscriptEntry[] {
    let filtered = entries

    // Filter by speaker
    if (options.speakerFilter) {
      filtered = filtered.filter((e) => e.speaker === options.speakerFilter)
    }

    // Filter by time range
    if (options.timeRange) {
      const { start, end } = options.timeRange
      filtered = filtered.filter((e) => e.timestamp >= start && e.timestamp <= end)
    }

    return filtered
  }

  /**
   * Export as JSON
   */
  private exportJSON(entries: TranscriptEntry[], options: ExportOptions): string {
    const data = entries.map((entry) => {
      const item: Record<string, unknown> = {
        timestamp: entry.timestamp,
        speaker: entry.participantName || entry.speaker,
        text: entry.text,
      }

      if (options.includeConfidence && entry.confidence !== undefined) {
        item.confidence = entry.confidence
      }

      return item
    })

    return JSON.stringify(data, null, 2)
  }

  /**
   * Export as plain text
   */
  private exportTXT(entries: TranscriptEntry[], options: ExportOptions): string {
    return entries
      .map((entry) => {
        let line = ''

        if (options.includeTimestamps) {
          line += formatTimeSimple(entry.timestamp) + ' '
        }

        if (options.includeSpeakers) {
          const speaker = entry.participantName || entry.speaker
          line += `${speaker}: `
        }

        line += entry.text

        return line
      })
      .join('\n')
  }

  /**
   * Export as SRT subtitles
   */
  private exportSRT(entries: TranscriptEntry[]): string {
    return entries
      .map((entry, index) => {
        const startTime = formatTimeSRT(entry.timestamp)
        // Estimate end time based on next entry or add 4 seconds
        const nextEntry = entries[index + 1]
        const endMs = nextEntry ? nextEntry.timestamp : entry.timestamp + 4000
        const endTime = formatTimeSRT(endMs)

        return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`
      })
      .join('\n')
  }

  /**
   * Export as WebVTT
   */
  private exportVTT(entries: TranscriptEntry[]): string {
    const cues = entries
      .map((entry, index) => {
        const startTime = formatTimeVTT(entry.timestamp)
        const nextEntry = entries[index + 1]
        const endMs = nextEntry ? nextEntry.timestamp : entry.timestamp + 4000
        const endTime = formatTimeVTT(endMs)

        return `${startTime} --> ${endTime}\n${entry.text}`
      })
      .join('\n\n')

    return `WEBVTT\n\n${cues}`
  }

  /**
   * Export as CSV
   */
  private exportCSV(entries: TranscriptEntry[], options: ExportOptions): string {
    const headers = ['timestamp', 'speaker', 'text']
    if (options.includeConfidence) {
      headers.push('confidence')
    }

    const rows = entries.map((entry) => {
      const row = [
        entry.timestamp.toString(),
        escapeCSV(entry.participantName || entry.speaker),
        escapeCSV(entry.text),
      ]
      if (options.includeConfidence) {
        row.push(entry.confidence?.toString() ?? '')
      }
      return row.join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }
}
