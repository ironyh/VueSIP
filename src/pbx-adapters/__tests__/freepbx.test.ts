/**
 * Unit tests for FreePBX recording provider
 *
 * @module pbx-adapters/__tests__/freepbx.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  createFreePbxRecordingProvider,
  type FreePbxRecordingConfig,
  type FreePbxCdrRow,
} from '../freepbx'

// Test the public API of the FreePBX recording provider
describe('createFreePbxRecordingProvider', () => {
  const createProvider = (config: Partial<FreePbxRecordingConfig> = {}) => {
    return createFreePbxRecordingProvider({
      baseUrl: 'https://pbx.example.com',
      ...config,
    })
  }

  describe('capabilities', () => {
    it('should expose correct capabilities', () => {
      const provider = createProvider()
      expect(provider.capabilities).toEqual({
        listRecordings: true,
        getPlaybackInfo: true,
        downloadRecording: true,
        supportsDateFilter: true,
        supportsSearch: false,
        supportsDirectionFilter: false,
        maxPageSize: 500,
      })
    })
  })

  describe('getPlaybackInfo', () => {
    it('should return playback URL with correct format', async () => {
      const provider = createProvider()
      const result = await provider.getPlaybackInfo('12345.6789')

      expect(result).not.toBeNull()
      expect(result?.recordingId).toBe('12345.6789')
      expect(result?.playbackUrl).toContain('display=cdr')
      expect(result?.playbackUrl).toContain('action=download_audio')
      expect(result?.playbackUrl).toContain('cdr_file=12345.6789')
      expect(result?.requiresAuth).toBe(true)
      expect(result?.metadata?.source).toBe('freepbx')
    })

    it('should return null for empty recording ID', async () => {
      const provider = createProvider()
      const result = await provider.getPlaybackInfo('')

      expect(result).toBeNull()
    })

    it('should handle URL with /admin suffix', async () => {
      const provider = createProvider({ baseUrl: 'https://pbx.example.com/admin' })
      const result = await provider.getPlaybackInfo('abc123')

      expect(result?.playbackUrl).toContain('/admin/config.php')
    })

    it('should handle URL without /admin suffix', async () => {
      const provider = createProvider({ baseUrl: 'https://pbx.example.com' })
      const result = await provider.getPlaybackInfo('abc123')

      expect(result?.playbackUrl).toContain('/admin/config.php')
    })
  })

  describe('listRecordings', () => {
    it('should build correct GraphQL query with default params', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            fetchAllCdrs: {
              cdrs: [],
              totalCount: 0,
            },
          },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      await provider.listRecordings({})

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/admin/api/api/gql')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body as string)
      expect(body.query).toContain('query FetchAllCdrs')
      expect(body.variables.first).toBe(50) // default page size
      expect(body.variables.orderby).toBe('date')
    })

    it('should respect limit parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { fetchAllCdrs: { cdrs: [], totalCount: 0 } },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      await provider.listRecordings({ limit: 10 })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(body.variables.first).toBe(10)
    })

    it('should respect offset parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { fetchAllCdrs: { cdrs: [], totalCount: 0 } },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      await provider.listRecordings({ limit: 20, offset: 50 })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(body.variables.after).toBe(50)
    })

    it('should sort by duration when requested', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { fetchAllCdrs: { cdrs: [], totalCount: 0 } },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      await provider.listRecordings({ sortBy: 'duration' })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(body.variables.orderby).toBe('duration')
    })

    it('should include date filters when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { fetchAllCdrs: { cdrs: [], totalCount: 0 } },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      await provider.listRecordings({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(body.variables.startDate).toBe('2024-01-01')
      expect(body.variables.endDate).toBe('2024-01-31')
    })

    it('should map CDR rows to recording summaries correctly', async () => {
      const mockCdrs: FreePbxCdrRow[] = [
        {
          uniqueid: '12345.678',
          calldate: '2024-01-15 10:30:00',
          clid: '"John Doe" <1234567890>',
          src: '1234567890',
          dst: '0987654321',
          duration: 120,
          billsec: 100,
          dcontext: 'from-pstn',
          channel: 'PJSIP/alice-00001',
          dstchannel: 'PJSIP/bob-00001',
          disposition: 'ANSWERED',
          recordingfile: '20240115-103000_1234567890_0987654321.wav',
          linkedid: '12345.678',
        },
      ]

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            fetchAllCdrs: {
              cdrs: mockCdrs,
              totalCount: 1,
            },
          },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      const result = await provider.listRecordings({})

      expect(result.items).toHaveLength(1)
      expect(result.totalCount).toBe(1)
      expect(result.hasMore).toBe(false)

      const recording = result.items[0]
      expect(recording.id).toBe('12345.678')
      expect(recording.direction).toBe('inbound')
      expect(recording.callerId).toBe('1234567890')
      expect(recording.callee).toBe('0987654321')
      expect(recording.duration).toBe(120) // duration field from CDR
    })

    it('should handle empty CDR response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { fetchAllCdrs: { cdrs: [], totalCount: 0 } },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      const result = await provider.listRecordings({})

      expect(result.items).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle GraphQL errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Invalid query' }],
        }),
      })

      const provider = createProvider({ fetch: mockFetch })

      await expect(provider.listRecordings({})).rejects.toThrow('GraphQL errors: Invalid query')
    })

    it('should handle missing data', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const provider = createProvider({ fetch: mockFetch })

      await expect(provider.listRecordings({})).rejects.toThrow(
        'FreePBX fetchAllCdrs: missing data'
      )
    })

    it('should handle non-OK response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const provider = createProvider({ fetch: mockFetch })

      await expect(provider.listRecordings({})).rejects.toThrow(
        'FreePBX GraphQL request failed: 401 Unauthorized'
      )
    })

    it('should include auth headers when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { fetchAllCdrs: { cdrs: [], totalCount: 0 } },
        }),
      })

      const getAuthHeaders = vi.fn().mockResolvedValue({
        Authorization: 'Bearer test-token',
      })

      const provider = createProvider({ fetch: mockFetch, getAuthHeaders })
      await provider.listRecordings({})

      expect(getAuthHeaders).toHaveBeenCalled()
      const options = mockFetch.mock.calls[0][1]
      expect(options.headers).toHaveProperty('Authorization', 'Bearer test-token')
    })

    it('should calculate hasMore correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            fetchAllCdrs: {
              cdrs: new Array(25).fill({ uniqueid: 'test' }),
              totalCount: 100,
            },
          },
        }),
      })

      const provider = createProvider({ fetch: mockFetch })
      const result = await provider.listRecordings({ limit: 25 })

      expect(result.hasMore).toBe(true)
      expect(result.items).toHaveLength(25)
    })
  })
})
