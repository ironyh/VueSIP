/**
 * @vitest-environment jsdom
 *
 * Unit tests for usePbxRecordings: contract delegation, loading/error states,
 * provider swap, unauthorized and expired URL edge cases.
 * DoD: tests in tests/unit/composables/, all pass, no skipped.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, shallowRef, nextTick } from 'vue'
import { usePbxRecordings } from '@/composables/usePbxRecordings'
import { setLogHandler } from '@/utils/logger'
import type {
  PbxRecordingProvider,
  PbxRecordingListQuery,
  PbxRecordingListResult,
  RecordingSummary,
  RecordingPlaybackInfo,
  PbxRecordingProviderCapabilities,
} from '@/types/pbx-recording.types'

const defaultCapabilities: PbxRecordingProviderCapabilities = {
  listRecordings: true,
  getPlaybackInfo: true,
}

function createMockProvider(
  overrides: {
    listRecordings?: (query: PbxRecordingListQuery) => Promise<PbxRecordingListResult>
    getPlaybackInfo?: (id: string) => Promise<RecordingPlaybackInfo | null>
    capabilities?: Partial<PbxRecordingProviderCapabilities>
  } = {}
): PbxRecordingProvider {
  return {
    capabilities: { ...defaultCapabilities, ...overrides.capabilities },
    listRecordings:
      overrides.listRecordings ??
      vi.fn().mockResolvedValue({
        items: [
          {
            id: 'rec-1',
            startTime: new Date('2025-01-15T10:00:00Z'),
            duration: 120,
            callerId: '101',
            callee: '102',
          },
        ] as RecordingSummary[],
        totalCount: 1,
        hasMore: false,
      }),
    getPlaybackInfo:
      overrides.getPlaybackInfo ??
      vi.fn().mockResolvedValue({
        recordingId: 'rec-1',
        playbackUrl: 'https://example.com/play/rec-1',
        format: 'audio/wav',
      } as RecordingPlaybackInfo),
  }
}

describe('usePbxRecordings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('contract delegation', () => {
    it('fetchRecordings delegates to provider.listRecordings with query', async () => {
      const listRecordings = vi.fn().mockResolvedValue({
        items: [] as RecordingSummary[],
        totalCount: 0,
        hasMore: false,
      })
      const provider = createMockProvider({ listRecordings })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await result.fetchRecordings({ limit: 20, offset: 0 })

      expect(listRecordings).toHaveBeenCalledWith({ limit: 20, offset: 0 })
    })

    it('getPlaybackUrl delegates to provider.getPlaybackInfo and returns URL', async () => {
      const getPlaybackInfo = vi.fn().mockResolvedValue({
        recordingId: 'rec-1',
        playbackUrl: 'https://example.com/audio/rec-1',
      } as RecordingPlaybackInfo)
      const provider = createMockProvider({ getPlaybackInfo })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      const url = await result.getPlaybackUrl('rec-1')

      expect(getPlaybackInfo).toHaveBeenCalledWith('rec-1')
      expect(url).toBe('https://example.com/audio/rec-1')
    })
  })

  describe('success', () => {
    it('fetchRecordings loads items and sets totalCount and hasMore', async () => {
      const provider = createMockProvider({
        listRecordings: vi.fn().mockResolvedValue({
          items: [
            { id: 'a', startTime: new Date(), duration: 60 } as RecordingSummary,
            { id: 'b', startTime: new Date(), duration: 90 } as RecordingSummary,
          ],
          totalCount: 2,
          hasMore: false,
        }),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()

      expect(result).not.toBeNull()
      if (!result) return
      expect(result.recordings.value).toEqual([])

      await result.fetchRecordings({ limit: 10 })

      expect(result.recordings.value).toHaveLength(2)
      expect(result.totalCount.value).toBe(2)
      expect(result.hasMore.value).toBe(false)
      expect(result.error.value).toBeNull()
      expect(result.loading.value).toBe(false)
    })

    it('getPlaybackUrl returns URL and clears playbackError', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockResolvedValue({
          recordingId: 'rec-1',
          playbackUrl: 'https://example.com/audio/rec-1',
        } as RecordingPlaybackInfo),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()

      if (!result) throw new Error('result is null')
      expect(result.playbackError.value).toBeNull()

      const url = await result.getPlaybackUrl('rec-1')
      expect(url).toBe('https://example.com/audio/rec-1')
      expect(result.playbackError.value).toBeNull()
    })

    it('getPlaybackUrl uses streamUrl when playbackUrl is absent', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockResolvedValue({
          recordingId: 'rec-1',
          streamUrl: 'https://example.com/stream/rec-1',
          format: 'audio/wav',
        } as RecordingPlaybackInfo),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      const url = await result.getPlaybackUrl('rec-1')
      expect(url).toBe('https://example.com/stream/rec-1')
    })
  })

  describe('loading and error states', () => {
    it('loading is true while fetchRecordings is in flight', async () => {
      let resolveList: (v: PbxRecordingListResult) => void = () => {}
      const listPromise = new Promise<PbxRecordingListResult>((r) => {
        resolveList = r
      })
      const provider = createMockProvider({
        listRecordings: vi.fn().mockReturnValue(listPromise),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      const p = result.fetchRecordings()
      await nextTick()
      expect(result.loading.value).toBe(true)

      resolveList({ items: [], totalCount: 0, hasMore: false })
      await p
      expect(result.loading.value).toBe(false)
    })

    it('fetchRecordings sets error when provider.listRecordings rejects', async () => {
      const provider = createMockProvider({
        listRecordings: vi.fn().mockRejectedValue(new Error('Network error')),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await result.fetchRecordings()
      expect(result.error.value).toBe('Network error')
      expect(result.recordings.value).toEqual([])
      expect(result.loading.value).toBe(false)
    })

    it('fetchRecordings sets error when provider does not support listRecordings', async () => {
      const provider = createMockProvider({
        capabilities: { listRecordings: false, getPlaybackInfo: true },
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await result.fetchRecordings()
      expect(result.error.value).toBe('Provider does not support listing recordings')
    })
  })

  describe('provider swap', () => {
    it('resets recordings, error, and playbackError when providerRef changes', async () => {
      const provider1 = createMockProvider({
        listRecordings: vi.fn().mockResolvedValue({
          items: [{ id: 'x', startTime: new Date(), duration: 30 }] as RecordingSummary[],
          totalCount: 1,
          hasMore: false,
        }),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider1)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await result.fetchRecordings()
      expect(result.recordings.value).toHaveLength(1)

      providerRef.value = null
      await nextTick()

      expect(result.recordings.value).toEqual([])
      expect(result.totalCount.value).toBe(0)
      expect(result.error.value).toBeNull()
      expect(result.playbackError.value).toBeNull()
    })
  })

  describe('unauthorized', () => {
    it('sets playbackError to unauthorized when getPlaybackInfo rejects with 401', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow('401')
      expect(result.playbackError.value).not.toBeNull()
      expect(result.playbackError.value?.code).toBe('unauthorized')
      expect(result.playbackError.value?.recordingId).toBe('rec-1')
    })

    it('sets playbackError to unauthorized when message contains "forbidden"', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockRejectedValue(new Error('403 Forbidden')),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow('403')
      expect(result.playbackError.value?.code).toBe('unauthorized')
    })
  })

  describe('expired URL', () => {
    it('sets playbackError to expired when playbackInfo.expiresAt is in the past', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockResolvedValue({
          recordingId: 'rec-1',
          playbackUrl: 'https://example.com/audio/rec-1',
          expiresAt: new Date(Date.now() - 60_000),
        } as RecordingPlaybackInfo),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow('expired')
      expect(result.playbackError.value).not.toBeNull()
      expect(result.playbackError.value?.code).toBe('expired')
      expect(result.playbackError.value?.recordingId).toBe('rec-1')
    })

    it('sets playbackError to expired when getPlaybackInfo rejects with "expired" message', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockRejectedValue(new Error('Playback link expired')),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow('expired')
      expect(result.playbackError.value?.code).toBe('expired')
    })
  })

  describe('not_found', () => {
    it('sets playbackError to not_found when getPlaybackInfo returns null', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockResolvedValue(null),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-missing')).rejects.toThrow('not found')
      expect(result.playbackError.value?.code).toBe('not_found')
      expect(result.playbackError.value?.recordingId).toBe('rec-missing')
    })
  })

  describe('no provider', () => {
    it('fetchRecordings sets error when providerRef is null', async () => {
      const providerRef = ref<PbxRecordingProvider | null>(null)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await result.fetchRecordings()
      expect(result.error.value).toBe('Provider not initialized')
      expect(result.recordings.value).toEqual([])
    })

    it('getPlaybackUrl sets playbackError when providerRef is null', async () => {
      const providerRef = ref<PbxRecordingProvider | null>(null)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow()
      expect(result.playbackError.value?.code).toBe('unknown')
      expect(result.playbackError.value?.message).toContain('Provider not initialized')
    })
  })

  describe('getPlaybackUrl when provider has no getPlaybackInfo capability', () => {
    it('sets playbackError and throws when capabilities.getPlaybackInfo is false', async () => {
      const provider = createMockProvider({
        capabilities: { listRecordings: true, getPlaybackInfo: false },
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow('does not support playback info')
      expect(result.playbackError.value?.code).toBe('unknown')
      expect(result.playbackError.value?.message).toContain('does not support playback info')
    })
  })

  describe('deterministic URL retrieval', () => {
    it('getPlaybackUrl throws when playbackInfo has neither playbackUrl nor streamUrl', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockResolvedValue({
          recordingId: 'rec-1',
          format: 'audio/wav',
        } as RecordingPlaybackInfo),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow('No playback URL')
      expect(result.playbackError.value?.code).toBe('unknown')
    })
  })

  describe('no sensitive logging', () => {
    const SENSITIVE_URL = 'https://example.com/play?token=sensitive-token-xyz'
    const SENSITIVE_ERROR = 'https://internal.pbx/secret=leak-me-not'

    let logCalls: Array<{ level: string; namespace: string; message: string; args: unknown[] }>

    beforeEach(() => {
      logCalls = []
      setLogHandler((level, namespace, message, ...args) => {
        logCalls.push({ level, namespace, message, args })
      })
    })

    afterEach(() => {
      setLogHandler(undefined)
    })

    it('does not log playback URLs or tokens on success', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockResolvedValue({
          recordingId: 'rec-1',
          playbackUrl: SENSITIVE_URL,
        } as RecordingPlaybackInfo),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await result.getPlaybackUrl('rec-1')

      const logged = logCalls.map((c) => [c.message, ...c.args].join(' '))
      expect(
        logged.some((s) => s.includes('sensitive-token-xyz') || s.includes(SENSITIVE_URL))
      ).toBe(false)
    })

    it('does not log error message content that may contain URLs or tokens on failure', async () => {
      const provider = createMockProvider({
        getPlaybackInfo: vi.fn().mockRejectedValue(new Error(SENSITIVE_ERROR)),
      })
      const providerRef = shallowRef<PbxRecordingProvider | null>(provider)

      let result: ReturnType<typeof usePbxRecordings> | null = null
      const TestComp = defineComponent({
        setup() {
          result = usePbxRecordings(providerRef)
          return { ...result }
        },
        template: '<div/>',
      })
      mount(TestComp)
      await nextTick()
      if (!result) throw new Error('result is null')

      await expect(result.getPlaybackUrl('rec-1')).rejects.toThrow()

      const logged = logCalls.map((c) => [c.message, ...c.args].join(' '))
      expect(logged.some((s) => s.includes('leak-me-not') || s.includes('secret='))).toBe(false)
    })
  })
})
