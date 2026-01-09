/**
 * Tests for TranscriptExporter
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TranscriptExporter } from '@/transcription/features/transcript-exporter'
import type { TranscriptEntry } from '@/types/transcription.types'

describe('TranscriptExporter', () => {
  let exporter: TranscriptExporter
  let entries: TranscriptEntry[]

  beforeEach(() => {
    exporter = new TranscriptExporter()

    // Create test entries with known timestamps
    const baseTime = 1704067200000 // 2024-01-01 00:00:00 UTC
    entries = [
      {
        id: 'entry-1',
        text: 'Hello, how can I help you?',
        speaker: 'local',
        participantName: 'Agent',
        timestamp: baseTime,
        isFinal: true,
      },
      {
        id: 'entry-2',
        text: 'I need help with my account.',
        speaker: 'remote',
        participantName: 'Customer',
        timestamp: baseTime + 3000, // 3 seconds later
        isFinal: true,
      },
      {
        id: 'entry-3',
        text: 'Sure, let me check that for you.',
        speaker: 'local',
        participantName: 'Agent',
        timestamp: baseTime + 6000, // 6 seconds later
        isFinal: true,
      },
    ]
  })

  describe('export to JSON', () => {
    it('should export as valid JSON', () => {
      const result = exporter.export(entries, 'json')
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(3)
      expect(parsed[0].text).toBe('Hello, how can I help you?')
    })

    it('should include timestamp, speaker, and text properties', () => {
      const result = exporter.export(entries, 'json')
      const parsed = JSON.parse(result)

      expect(parsed[0]).toHaveProperty('timestamp')
      expect(parsed[0]).toHaveProperty('speaker')
      expect(parsed[0]).toHaveProperty('text')
      // speaker field contains participantName when available
      expect(parsed[0].speaker).toBe('Agent')
    })

    it('should include confidence when includeConfidence option is true', () => {
      const entriesWithConfidence = entries.map((e, i) => ({
        ...e,
        confidence: 0.9 + i * 0.01,
      }))

      const result = exporter.export(entriesWithConfidence, 'json', {
        includeConfidence: true,
      })
      const parsed = JSON.parse(result)

      expect(parsed[0]).toHaveProperty('confidence')
      expect(parsed[0].confidence).toBe(0.9)
    })
  })

  describe('export to TXT', () => {
    it('should format as plain text when includeSpeakers is true', () => {
      const result = exporter.export(entries, 'txt', { includeSpeakers: true })
      const lines = result.trim().split('\n')

      expect(lines).toHaveLength(3)
      expect(lines[0]).toContain('Agent')
      expect(lines[0]).toContain('Hello, how can I help you?')
    })

    it('should use speaker type when no participant name', () => {
      const entriesWithoutNames: TranscriptEntry[] = [
        {
          id: 'entry-1',
          text: 'Test message',
          speaker: 'local',
          timestamp: Date.now(),
          isFinal: true,
        },
      ]

      const result = exporter.export(entriesWithoutNames, 'txt', { includeSpeakers: true })
      expect(result).toContain('local')
    })

    it('should include timestamps when includeTimestamps is true', () => {
      const result = exporter.export(entries, 'txt', { includeTimestamps: true })
      // Should have time format like [MM:SS] or [HH:MM:SS] depending on duration
      // With epoch timestamps, we get large hour values like [473352:00:00]
      expect(result).toMatch(/\[\d+:\d{2}(:\d{2})?\]/)
    })
  })

  describe('export to SRT', () => {
    it('should format as SRT subtitles', () => {
      const result = exporter.export(entries, 'srt')

      // SRT format: sequence number, timestamps, text, blank line
      expect(result).toContain('1\n')
      expect(result).toContain('2\n')
      expect(result).toContain('3\n')
      expect(result).toContain('-->')
      expect(result).toContain('Hello, how can I help you?')
    })

    it('should use comma for milliseconds in SRT format', () => {
      const result = exporter.export(entries, 'srt')

      // SRT uses comma for milliseconds: 00:00:00,000
      expect(result).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/)
    })
  })

  describe('export to VTT', () => {
    it('should include WEBVTT header', () => {
      const result = exporter.export(entries, 'vtt')

      expect(result).toMatch(/^WEBVTT/)
    })

    it('should use period for milliseconds in VTT format', () => {
      const result = exporter.export(entries, 'vtt')

      // VTT uses period for milliseconds: 00:00:00.000
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/)
    })
  })

  describe('export to CSV', () => {
    it('should include header row with timestamp, speaker, text', () => {
      const result = exporter.export(entries, 'csv')
      const lines = result.trim().split('\n')

      expect(lines[0]).toBe('timestamp,speaker,text')
    })

    it('should escape commas in text', () => {
      const entriesWithComma: TranscriptEntry[] = [
        {
          id: 'entry-1',
          text: 'Hello, world',
          speaker: 'local',
          timestamp: Date.now(),
          isFinal: true,
        },
      ]

      const result = exporter.export(entriesWithComma, 'csv')
      // Text with commas should be quoted
      expect(result).toContain('"Hello, world"')
    })

    it('should include confidence column when option is set', () => {
      const entriesWithConfidence = entries.map((e, i) => ({
        ...e,
        confidence: 0.9 + i * 0.01,
      }))

      const result = exporter.export(entriesWithConfidence, 'csv', {
        includeConfidence: true,
      })
      const lines = result.trim().split('\n')

      expect(lines[0]).toContain('confidence')
    })
  })

  describe('filtering options', () => {
    it('should filter by speaker', () => {
      const result = exporter.export(entries, 'json', {
        speakerFilter: 'local',
      })
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(2)
      // Note: speaker field in JSON contains participantName ('Agent') not speaker type
      parsed.forEach((entry: { speaker: string }) => {
        expect(entry.speaker).toBe('Agent')
      })
    })

    it('should filter by time range', () => {
      const baseTime = entries[0].timestamp

      const result = exporter.export(entries, 'json', {
        timeRange: {
          start: baseTime + 2000, // After first entry
          end: baseTime + 5000, // Before third entry
        },
      })
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].text).toBe('I need help with my account.')
    })
  })

  describe('empty transcript', () => {
    it('should handle empty entries array', () => {
      const jsonResult = exporter.export([], 'json')
      expect(JSON.parse(jsonResult)).toEqual([])

      const txtResult = exporter.export([], 'txt')
      expect(txtResult).toBe('')

      const srtResult = exporter.export([], 'srt')
      expect(srtResult).toBe('')

      const vttResult = exporter.export([], 'vtt')
      expect(vttResult).toBe('WEBVTT\n\n')

      const csvResult = exporter.export([], 'csv')
      expect(csvResult.trim()).toBe('timestamp,speaker,text')
    })
  })
})
