/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TranscriptExporter } from '../transcript-exporter'
import type { TranscriptEntry, ExportFormat } from '@/types/transcription.types'

describe('TranscriptExporter', () => {
  let exporter: TranscriptExporter

  const createEntry = (overrides: Partial<TranscriptEntry> = {}): TranscriptEntry => ({
    id: '1',
    participantId: 'p1',
    participantName: 'John Doe',
    speaker: 'local',
    text: 'Hello world',
    timestamp: 0,
    isFinal: true,
    ...overrides,
  })

  const entries: TranscriptEntry[] = [
    createEntry({ id: '1', timestamp: 0, text: 'Hello world', participantName: 'John' }),
    createEntry({ id: '2', timestamp: 5000, text: 'How are you?', participantName: 'John' }),
    createEntry({ id: '3', timestamp: 10000, text: 'I am fine', participantName: 'Jane' }),
  ]

  beforeEach(() => {
    exporter = new TranscriptExporter()
  })

  describe('export', () => {
    it('should export to JSON format', () => {
      const result = exporter.export(entries, 'json')
      expect(result).toContain('"timestamp": 0')
      expect(result).toContain('Hello world')
    })

    it('should export to TXT format', () => {
      const result = exporter.export(entries, 'txt')
      expect(result).toContain('Hello world')
      expect(result).toContain('How are you?')
    })

    it('should export to SRT format', () => {
      const result = exporter.export(entries, 'srt')
      expect(result).toContain('00:00:00,000 --> 00:00:05,000')
      expect(result).toContain('Hello world')
    })

    it('should export to VTT format', () => {
      const result = exporter.export(entries, 'vtt')
      expect(result).toContain('WEBVTT')
      expect(result).toContain('00:00:00.000 --> 00:00:05.000')
    })

    it('should export to CSV format', () => {
      const result = exporter.export(entries, 'csv')
      expect(result).toContain('timestamp,speaker,text')
      expect(result).toContain('Hello world')
    })

    it('should throw for unsupported format', () => {
      expect(() => exporter.export(entries, 'invalid' as ExportFormat)).toThrow(
        'Unsupported export format: invalid'
      )
    })
  })

  describe('export JSON with options', () => {
    it('should include confidence when option is set', () => {
      const entriesWithConfidence = [createEntry({ timestamp: 0, text: 'Test', confidence: 0.95 })]
      const result = exporter.export(entriesWithConfidence, 'json', {
        includeConfidence: true,
      })
      expect(result).toContain('"confidence": 0.95')
    })

    it('should not include confidence when option is not set', () => {
      const entriesWithConfidence = [createEntry({ timestamp: 0, text: 'Test', confidence: 0.95 })]
      const result = exporter.export(entriesWithConfidence, 'json', {
        includeConfidence: false,
      })
      expect(result).not.toContain('confidence')
    })
  })

  describe('export TXT with options', () => {
    it('should include timestamps when option is set', () => {
      const result = exporter.export(entries, 'txt', { includeTimestamps: true })
      expect(result).toContain('[00:00]')
    })

    it('should not include timestamps when option is not set', () => {
      const result = exporter.export(entries, 'txt', { includeTimestamps: false })
      expect(result).not.toContain('[00:00]')
    })

    it('should include speakers when option is set', () => {
      const result = exporter.export(entries, 'txt', { includeSpeakers: true })
      expect(result).toContain('John:')
      expect(result).toContain('Jane:')
    })

    it('should not include speakers when option is not set', () => {
      const result = exporter.export(entries, 'txt', { includeSpeakers: false })
      expect(result).not.toContain('John:')
    })

    it('should use participantName over speaker id', () => {
      const result = exporter.export(entries, 'txt', { includeSpeakers: true })
      expect(result).toContain('John:')
    })
  })

  describe('filtering', () => {
    it('should filter by speaker', () => {
      const result = exporter.export(entries, 'txt', { speakerFilter: 'local' })
      const lines = result.split('\n')
      // All entries have speaker: 'local'
      expect(lines.length).toBe(3)
    })

    it('should filter by time range', () => {
      const result = exporter.export(entries, 'json', {
        timeRange: { start: 0, end: 6000 },
      })
      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(2) // First two entries (0 and 5000)
    })

    it('should filter by time range with single entry', () => {
      const result = exporter.export(entries, 'json', {
        timeRange: { start: 9000, end: 11000 },
      })
      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(1)
    })
  })

  describe('CSV export', () => {
    it('should include confidence column when option is set', () => {
      const entriesWithConfidence = [createEntry({ timestamp: 0, text: 'Test', confidence: 0.85 })]
      const result = exporter.export(entriesWithConfidence, 'csv', {
        includeConfidence: true,
      })
      expect(result).toContain('confidence')
      expect(result).toContain('0.85')
    })

    it('should escape text with commas', () => {
      const entriesWithComma = [createEntry({ text: 'Hello, world' })]
      const result = exporter.export(entriesWithComma, 'csv')
      expect(result).toContain('"Hello, world"')
    })

    it('should escape text with quotes', () => {
      const entriesWithQuotes = [createEntry({ text: 'He said "hello"' })]
      const result = exporter.export(entriesWithQuotes, 'csv')
      expect(result).toContain('He said ""hello""')
    })

    it('should escape text with newlines', () => {
      const entriesWithNewlines = [createEntry({ text: 'Hello\nworld' })]
      const result = exporter.export(entriesWithNewlines, 'csv')
      expect(result).toContain('"Hello\nworld"')
    })
  })

  describe('SRT export', () => {
    it('should use sequential index starting from 1', () => {
      const result = exporter.export(entries, 'srt')
      const sections = result.split('\n\n')
      expect(sections[0]).toMatch(/^1\n/)
      expect(sections[1]).toMatch(/^2\n/)
    })

    it('should estimate end time from next entry', () => {
      const result = exporter.export(entries, 'srt')
      expect(result).toContain('00:00:00,000 --> 00:00:05,000')
      expect(result).toContain('00:00:05,000 --> 00:00:10,000')
    })

    it('should add 4 seconds for last entry', () => {
      const result = exporter.export(entries, 'srt')
      // Last entry at 10000ms, so end should be 14000ms
      expect(result).toContain('00:00:10,000 --> 00:00:14,000')
    })
  })

  describe('VTT export', () => {
    it('should start with WEBVTT header', () => {
      const result = exporter.export(entries, 'vtt')
      expect(result.startsWith('WEBVTT')).toBe(true)
    })

    it('should use dot separator for milliseconds', () => {
      const result = exporter.export(entries, 'vtt')
      expect(result).toContain('00:00:00.000 --> 00:00:05.000')
    })

    it('should separate cues with blank lines', () => {
      const result = exporter.export(entries, 'vtt')
      // VTT uses single newlines between cues (unlike double newlines in SRT)
      expect(result).toContain('00:00:00.000 --> 00:00:05.000\nHello world\n\n00:00:05.000')
    })
  })

  describe('empty entries', () => {
    it('should handle empty array for JSON', () => {
      const result = exporter.export([], 'json')
      expect(result).toBe('[]')
    })

    it('should handle empty array for TXT', () => {
      const result = exporter.export([], 'txt')
      expect(result).toBe('')
    })

    it('should handle empty array for CSV', () => {
      const result = exporter.export([], 'csv')
      expect(result).toBe('timestamp,speaker,text')
    })
  })

  describe('single entry', () => {
    it('should handle single entry for all formats', () => {
      const single = [createEntry({ timestamp: 12345, text: 'Single entry' })]

      expect(() => exporter.export(single, 'json')).not.toThrow()
      expect(() => exporter.export(single, 'txt')).not.toThrow()
      expect(() => exporter.export(single, 'srt')).not.toThrow()
      expect(() => exporter.export(single, 'vtt')).not.toThrow()
      expect(() => exporter.export(single, 'csv')).not.toThrow()
    })
  })

  describe('timestamp formatting', () => {
    it('should format hours correctly in SRT', () => {
      const longEntry = [createEntry({ timestamp: 3661000, text: 'Long timestamp' })] // 1h 1m 1s
      const result = exporter.export(longEntry, 'srt')
      expect(result).toContain('01:01:01,000')
    })

    it('should format hours correctly in VTT', () => {
      const longEntry = [createEntry({ timestamp: 3661000, text: 'Long timestamp' })]
      const result = exporter.export(longEntry, 'vtt')
      expect(result).toContain('01:01:01.000')
    })

    it('should format timestamps in TXT without hours when not needed', () => {
      const entry = [createEntry({ timestamp: 125000, text: 'Test' })] // 2m 5s
      const result = exporter.export(entry, 'txt', { includeTimestamps: true })
      expect(result).toContain('[02:05]')
      expect(result).not.toContain('[00:02:05]')
    })

    it('should include hours in TXT when timestamp exceeds one hour', () => {
      const entry = [createEntry({ timestamp: 3665000, text: 'Test' })] // 1h 1m 5s
      const result = exporter.export(entry, 'txt', { includeTimestamps: true })
      expect(result).toContain('[01:01:05]')
    })
  })
})
