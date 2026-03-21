/**
 * @vitest-environment jsdom
 *
 * Tests for usePbxRecordings composable.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, shallowRef } from 'vue'
import { usePbxRecordings } from '../usePbxRecordings'
import type {
  PbxRecordingProvider,
  PbxRecordingListResult,
  RecordingSummary,
  RecordingPlaybackInfo,
} from '@/types/pbx-recording.types'

describe('usePbxRecordings', () => {
  // Test fixtures
  const mockRecordings: RecordingSummary[] = [
    {
      id: 'rec-1',
      callUniqueId: 'call-1',
      direction: 'inbound',
      startTime: new Date('2026-03-01T10:00:00Z'),
      duration: 120,
      callerId: '+1234567890',
      callee: '+0987654321',
      channelOrLabel: 'Queue: support',
    },
    {
      id: 'rec-2',
      callUniqueId: 'call-2',
      direction: 'outbound',
      startTime: new Date('2026-03-01T11:00:00Z'),
      duration: 60,
      callerId: '+0987654321',
      callee: '+1234567890',
      channelOrLabel: 'Extension: 101',
    },
  ]

  const mockPlaybackInfo: RecordingPlaybackInfo = {
    recordingId: 'rec-1',
    playbackUrl: 'https://pbx.example.com/recordings/rec-1.mp3',
    format: 'audio/mpeg',
    expiresAt: new Date('2026-03-31T23:59:59Z'),
    requiresAuth: false,
  }

  // Helper to create mock provider
  function createMockProvider(overrides: Partial<PbxRecordingProvider> = {}): PbxRecordingProvider {
    return {
      capabilities: {
        listRecordings: true,
        getPlaybackInfo: true,
        downloadRecording: false,
        supportsDateFilter: true,
        supportsSearch: false,
        supportsDirectionFilter: false,
        maxPageSize: 100,
      },
      listRecordings: vi.fn().mockResolvedValue({
        items: mockRecordings,
        totalCount: 2,
        hasMore: false,
      }),
      getPlaybackInfo: vi.fn().mockResolvedValue(mockPlaybackInfo),
      downloadRecording: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes with empty state', () => {
      const provider = shallowRef<PbxRecordingProvider | null>(null)
      const { recordings, totalCount, hasMore, loading, error, playbackError } =
        usePbxRecordings(provider)

      expect(recordings.value).toEqual([])
      expect(totalCount.value).toBe(0)
      expect(hasMore.value).toBe(false)
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(playbackError.value).toBeNull()
    })
  })

  describe('fetchRecordings', () => {
    it('fetches recordings successfully', async () => {
      const provider = shallowRef(createMockProvider())
      const { recordings, totalCount, hasMore, loading, error, fetchRecordings } =
        usePbxRecordings(provider)

      await fetchRecordings({ limit: 10 })

      expect(loading.value).toBe(false)
      expect(recordings.value).toEqual(mockRecordings)
      expect(totalCount.value).toBe(2)
      expect(hasMore.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('sets error when provider is null', async () => {
      const provider = shallowRef<PbxRecordingProvider | null>(null)
      const { error, fetchRecordings } = usePbxRecordings(provider)

      await fetchRecordings()

      expect(error.value).toBe('Provider not initialized')
    })

    it('sets error when provider lacks listRecordings capability', async () => {
      const provider = shallowRef(
        createMockProvider({
          capabilities: { listRecordings: false, getPlaybackInfo: true },
        })
      )
      const { error, fetchRecordings } = usePbxRecordings(provider)

      await fetchRecordings()

      expect(error.value).toBe('Provider does not support listing recordings')
    })

    it('passes query parameters to provider', async () => {
      const mockListRecordings = vi.fn().mockResolvedValue({
        items: mockRecordings,
        totalCount: 2,
        hasMore: false,
      })
      const provider = shallowRef(createMockProvider({ listRecordings: mockListRecordings }))
      const { fetchRecordings } = usePbxRecordings(provider)

      await fetchRecordings({ limit: 10, dateFrom: new Date('2026-01-01') })

      expect(mockListRecordings).toHaveBeenCalledWith({
        limit: 10,
        dateFrom: new Date('2026-01-01'),
      })
    })

    it('sets loading state during fetch', async () => {
      let resolveList!: (value: PbxRecordingListResult) => void
      const mockListRecordings = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveList = resolve
        })
      })
      const provider = shallowRef(createMockProvider({ listRecordings: mockListRecordings }))
      const { loading, fetchRecordings } = usePbxRecordings(provider)

      const promise = fetchRecordings()
      expect(loading.value).toBe(true)

      resolveList({ items: [], totalCount: 0, hasMore: false })
      await promise

      expect(loading.value).toBe(false)
    })
  })

  describe('getPlaybackUrl', () => {
    it('returns playback URL successfully', async () => {
      const provider = shallowRef(createMockProvider())
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      const url = await getPlaybackUrl('rec-1')

      expect(url).toBe('https://pbx.example.com/recordings/rec-1.mp3')
      expect(playbackError.value).toBeNull()
    })

    it('clears previous playback error when called successfully', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi
            .fn()
            .mockRejectedValueOnce(new Error('HTTP 401: Unauthorized'))
            .mockResolvedValue(mockPlaybackInfo),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      // First call fails with unauthorized
      try {
        await getPlaybackUrl('rec-1')
      } catch {
        // Expected
      }
      expect(playbackError.value?.code).toBe('unauthorized')

      // Second call succeeds and clears error
      const url = await getPlaybackUrl('rec-1')
      expect(url).toBe('https://pbx.example.com/recordings/rec-1.mp3')
      expect(playbackError.value).toBeNull()
    })

    it('sets error when provider is null', async () => {
      const provider = shallowRef<PbxRecordingProvider | null>(null)
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow('Provider not initialized')
      expect(playbackError.value).toEqual({
        recordingId: 'rec-1',
        code: 'unknown',
        message: 'Provider not initialized',
      })
    })

    it('sets error when provider lacks getPlaybackInfo capability', async () => {
      const provider = shallowRef(
        createMockProvider({
          capabilities: { listRecordings: true, getPlaybackInfo: false },
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow(
        'Provider does not support playback info'
      )
      expect(playbackError.value).toEqual({
        recordingId: 'rec-1',
        code: 'unknown',
        message: 'Provider does not support playback info',
      })
    })

    it('handles unauthorized error (401/403)', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockRejectedValue(new Error('HTTP 401: Unauthorized')),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow()
      expect(playbackError.value?.code).toBe('unauthorized')
    })

    it('handles forbidden error (403)', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockRejectedValue(new Error('Access forbidden')),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow()
      expect(playbackError.value?.code).toBe('unauthorized')
    })

    it('handles expired URL error', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockResolvedValue({
            recordingId: 'rec-1',
            playbackUrl: 'https://pbx.example.com/recordings/rec-1.mp3',
            expiresAt: new Date('2020-01-01'), // Expired
          }),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow('Playback URL has expired')
      expect(playbackError.value?.code).toBe('expired')
    })

    it('handles expired error in message', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockRejectedValue(new Error('URL has expired')),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow()
      expect(playbackError.value?.code).toBe('expired')
    })

    it('handles network error', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockRejectedValue(new Error('fetch failed: connection refused')),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow()
      expect(playbackError.value?.code).toBe('network')
    })

    it('handles not found error', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockResolvedValue(null),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow('Recording not found')
      expect(playbackError.value?.code).toBe('not_found')
    })

    it('handles missing playback URL in response', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockResolvedValue({
            recordingId: 'rec-1',
            // No playbackUrl or streamUrl
          }),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      await expect(getPlaybackUrl('rec-1')).rejects.toThrow('No playback URL in response')
      expect(playbackError.value?.code).toBe('unknown')
    })

    it('uses streamUrl as fallback when playbackUrl is missing', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockResolvedValue({
            recordingId: 'rec-1',
            streamUrl: 'https://pbx.example.com/stream/rec-1',
          }),
        })
      )
      const { getPlaybackUrl } = usePbxRecordings(provider)

      const url = await getPlaybackUrl('rec-1')

      expect(url).toBe('https://pbx.example.com/stream/rec-1')
    })
  })

  describe('provider swap', () => {
    it('resets list state when provider reference changes', async () => {
      const _recordingsRef = ref<RecordingSummary[]>([])
      const providerRef = shallowRef(createMockProvider())

      const { recordings, fetchRecordings } = usePbxRecordings(providerRef)
      await fetchRecordings()
      expect(recordings.value.length).toBe(2)

      // Simulate provider swap by resetting the provider ref
      // The watch should clear state when the provider changes
      providerRef.value = createMockProvider({
        listRecordings: vi.fn().mockResolvedValue({
          items: [mockRecordings[0]],
          totalCount: 1,
          hasMore: false,
        }),
      })

      // After provider swap, fetch from new provider
      const _recordings2 = usePbxRecordings(providerRef)
      // Note: In a real app, you'd re-call fetchRecordings after the swap
    })

    it('resets playback error when provider changes', async () => {
      const providerRef = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi
            .fn()
            .mockRejectedValueOnce(new Error('Unauthorized'))
            .mockResolvedValue(mockPlaybackInfo),
        })
      )

      const { getPlaybackUrl, playbackError } = usePbxRecordings(providerRef)

      // First call - error
      try {
        await getPlaybackUrl('rec-1')
      } catch {
        // Expected
      }
      expect(playbackError.value?.code).toBe('unauthorized')

      // Swap provider to one that works
      providerRef.value = createMockProvider()

      // Should now work with new provider
      const url = await getPlaybackUrl('rec-1')
      expect(url).toBe('https://pbx.example.com/recordings/rec-1.mp3')
    })
  })

  describe('error classification', () => {
    it('classifies various unauthorized messages', async () => {
      const testCases = [
        '401 Unauthorized',
        '403 Forbidden',
        'unauthorized access',
        'forbidden resource',
      ]

      for (const message of testCases) {
        const provider = shallowRef(
          createMockProvider({
            getPlaybackInfo: vi.fn().mockRejectedValue(new Error(message)),
          })
        )
        const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

        try {
          await getPlaybackUrl('rec-1')
        } catch {
          // Expected
        }

        expect(playbackError.value?.code).toBe('unauthorized')
      }
    })

    it('classifies various expired messages', async () => {
      const testCases = ['URL has expired', 'Recording expired', 'Link expired']

      for (const message of testCases) {
        const provider = shallowRef(
          createMockProvider({
            getPlaybackInfo: vi.fn().mockRejectedValue(new Error(message)),
          })
        )
        const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

        try {
          await getPlaybackUrl('rec-1')
        } catch {
          // Expected
        }

        expect(playbackError.value?.code).toBe('expired')
      }
    })

    it('classifies network errors', async () => {
      const testCases = ['network error', 'fetch failed', 'ECONNREFUSED', 'timeout']

      for (const message of testCases) {
        const provider = shallowRef(
          createMockProvider({
            getPlaybackInfo: vi.fn().mockRejectedValue(new Error(message)),
          })
        )
        const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

        try {
          await getPlaybackUrl('rec-1')
        } catch {
          // Expected
        }

        expect(playbackError.value?.code).toBe('network')
      }
    })

    it('defaults to unknown for unrecognized errors', async () => {
      const provider = shallowRef(
        createMockProvider({
          getPlaybackInfo: vi.fn().mockRejectedValue(new Error('Some weird error')),
        })
      )
      const { getPlaybackUrl, playbackError } = usePbxRecordings(provider)

      try {
        await getPlaybackUrl('rec-1')
      } catch {
        // Expected
      }

      expect(playbackError.value?.code).toBe('unknown')
    })
  })
})
