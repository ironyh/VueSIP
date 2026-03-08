/**
 * Fixture-based contract tests for FreePBX PBX recording adapter.
 *
 * Verifies stable mapping from GraphQL/CDR payloads to RecordingSummary,
 * deterministic playback URL building, and graceful handling of missing/partial
 * metadata. Uses fixtures in tests/fixtures/freepbx/.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createFreePbxRecordingProvider } from '@/pbx-adapters/freepbx'
import type { RecordingSummary, RecordingPlaybackInfo } from '@/types/pbx-recording.types'

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'freepbx')

function loadFixture(name: string): unknown {
  const raw = readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf-8')
  return JSON.parse(raw) as unknown
}

function createMockFetch(responseBody: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(responseBody),
    text: () => Promise.resolve(JSON.stringify(responseBody)),
  } as Response)
}

describe('FreePBX adapter contract (fixture-based)', () => {
  const baseUrl = 'https://pbx.example.com'

  describe('listRecordings mapping', () => {
    it('maps nominal fixture to RecordingSummary with full metadata', async () => {
      const body = loadFixture('nominal')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      const result = await provider.listRecordings({ limit: 50 })

      expect(result.items).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.hasMore).toBe(false)

      const first = result.items[0] as RecordingSummary
      expect(first.id).toBe('1709123456.42')
      expect(first.callUniqueId).toBe('1709123456.42')
      expect(first.direction).toBe('internal')
      expect(first.startTime).toBeInstanceOf(Date)
      expect(first.startTime.toISOString()).toContain('2025-02-28')
      expect(first.duration).toBe(120)
      expect(first.callerId).toBe('101')
      expect(first.callee).toBe('102')
      expect(first.channelOrLabel).toContain('PJSIP/101')
      expect(first.metadata).toMatchObject({
        recordingfile: expect.any(String),
        linkedid: '1709123456.41',
        disposition: 'ANSWERED',
      })

      const second = result.items[1] as RecordingSummary
      expect(second.id).toBe('1709123789.43')
      expect(second.direction).toBe('outbound')
      expect(second.callee).toBe('8005551234')
    })

    it('handles missing recordingfile in CDR (graceful)', async () => {
      const body = loadFixture('missing-recordingfile')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      const result = await provider.listRecordings({ limit: 50 })

      expect(result.items).toHaveLength(1)
      const item = result.items[0] as RecordingSummary
      expect(item.id).toBe('1709123999.44')
      expect(item.duration).toBe(30)
      expect(item.metadata).toBeDefined()
      expect((item.metadata as Record<string, unknown>)?.recordingfile).toBeUndefined()
    })

    it('returns empty list for empty CDR list fixture', async () => {
      const body = loadFixture('empty-cdr-list')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      const result = await provider.listRecordings({ limit: 50 })

      expect(result.items).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('handles partial metadata (minimal and sparse fields)', async () => {
      const body = loadFixture('partial-metadata')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      const result = await provider.listRecordings({ limit: 50 })

      expect(result.items).toHaveLength(3)
      expect(result.totalCount).toBe(3)

      const minimal = result.items[0] as RecordingSummary
      expect(minimal.id).toBe('1709124100.45')
      expect(minimal.duration).toBe(0)
      expect(minimal.direction).toBe('unknown')
      expect(minimal.startTime).toBeInstanceOf(Date)

      const withDate = result.items[1] as RecordingSummary
      expect(withDate.id).toBe('1709124101.46')
      expect(withDate.duration).toBe(0)

      const unknownCtx = result.items[2] as RecordingSummary
      expect(unknownCtx.id).toBe('1709124102.47')
      expect(unknownCtx.direction).toBe('unknown')
    })

    it('passes through pagination and filter options to GraphQL variables', async () => {
      const body = loadFixture('empty-cdr-list')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      const dateFrom = new Date('2025-02-01')
      const dateTo = new Date('2025-02-28')
      await provider.listRecordings({
        limit: 20,
        offset: 10,
        sortBy: 'duration',
        dateFrom,
        dateTo,
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const call = mockFetch.mock.calls[0]
      const reqBody = JSON.parse((call[1] as RequestInit).body as string)
      expect(reqBody.variables).toMatchObject({
        first: 20,
        after: 10,
        orderby: 'duration',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      })
    })

    it('uses date sort when sortBy is startTime or unspecified', async () => {
      const body = loadFixture('empty-cdr-list')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      await provider.listRecordings({ limit: 5, sortBy: 'startTime' })
      let reqBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(reqBody.variables.orderby).toBe('date')

      mockFetch.mockClear()
      await provider.listRecordings({ limit: 5 })
      reqBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(reqBody.variables.orderby).toBe('date')
    })
  })

  describe('getPlaybackInfo URL building', () => {
    it('builds deterministic playback URL for recording ID', async () => {
      const provider = createFreePbxRecordingProvider({ baseUrl })

      const info1 = await provider.getPlaybackInfo('1709123456.42')
      const info2 = await provider.getPlaybackInfo('1709123456.42')

      expect(info1).not.toBeNull()
      expect(info2).not.toBeNull()
      const url1 = (info1 as RecordingPlaybackInfo).playbackUrl
      const url2 = (info2 as RecordingPlaybackInfo).playbackUrl
      expect(url1).toBe(url2)
      expect(url1).toContain('config.php')
      expect(url1).toContain('display=cdr')
      expect(url1).toContain('action=download_audio')
      expect(url1).toContain('cdr_file=1709123456.42')
      expect((info1 as RecordingPlaybackInfo).recordingId).toBe('1709123456.42')
      expect((info1 as RecordingPlaybackInfo).requiresAuth).toBe(true)
    })

    it('builds correct URL for baseUrl with and without /admin', async () => {
      const providerNoAdmin = createFreePbxRecordingProvider({ baseUrl: 'https://pbx.example.com' })
      const providerWithAdmin = createFreePbxRecordingProvider({
        baseUrl: 'https://pbx.example.com/admin',
      })

      const infoNoAdmin = await providerNoAdmin.getPlaybackInfo('abc.123')
      const infoWithAdmin = await providerWithAdmin.getPlaybackInfo('abc.123')

      expect((infoNoAdmin as RecordingPlaybackInfo).playbackUrl).toBe(
        'https://pbx.example.com/admin/config.php?display=cdr&action=download_audio&cdr_file=abc.123'
      )
      expect((infoWithAdmin as RecordingPlaybackInfo).playbackUrl).toBe(
        'https://pbx.example.com/admin/config.php?display=cdr&action=download_audio&cdr_file=abc.123'
      )
    })

    it('returns null for empty recordingId', async () => {
      const provider = createFreePbxRecordingProvider({ baseUrl })
      expect(await provider.getPlaybackInfo('')).toBeNull()
    })

    it('expired-url-scenario: playback URL is built (may expire server-side)', async () => {
      const body = loadFixture('expired-url-scenario')
      const mockFetch = createMockFetch(body)
      const provider = createFreePbxRecordingProvider({ baseUrl, fetch: mockFetch })

      const list = await provider.listRecordings({ limit: 10 })
      expect(list.items).toHaveLength(1)
      const recordingId = list.items[0].id

      const info = await provider.getPlaybackInfo(recordingId)
      expect(info).not.toBeNull()
      expect((info as RecordingPlaybackInfo).playbackUrl).toContain('cdr_file=1709000000.99')
      expect((info as RecordingPlaybackInfo).metadata?.source).toBe('freepbx')
    })
  })

  describe('capabilities', () => {
    it('exposes listRecordings and getPlaybackInfo capabilities', () => {
      const provider = createFreePbxRecordingProvider({ baseUrl })
      expect(provider.capabilities.listRecordings).toBe(true)
      expect(provider.capabilities.getPlaybackInfo).toBe(true)
      expect(provider.capabilities.downloadRecording).toBe(true)
      expect(provider.capabilities.supportsDateFilter).toBe(true)
      expect(provider.capabilities.maxPageSize).toBe(500)
    })
  })
})
