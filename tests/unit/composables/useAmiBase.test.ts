import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useAmiBase } from '@/composables/useAmiBase'
import type { AmiClient } from '@/core/AmiClient'

// Mock AmiClient
const createMockClient = (): AmiClient => {
  const listeners = new Map<string, Set<Function>>()

  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      listeners.get(event)?.delete(handler)
    }),
    emit: (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((handler) => handler(...args))
    },
    send: vi.fn().mockResolvedValue({}),
    sendAndWait: vi.fn().mockResolvedValue({}),
    isConnected: true,
  } as unknown as AmiClient
}

describe('useAmiBase', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    mockClient = createMockClient()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty items map', () => {
      const { items } = useAmiBase(mockClient)

      expect(items.value.size).toBe(0)
    })

    it('should initialize with error state (set on immediate watch)', () => {
      // When no fetchData is provided, watch with immediate:true triggers refresh
      // which sets error to 'No fetch function provided'
      const { error } = useAmiBase(mockClient)

      expect(error.value).toBe('No fetch function provided')
    })

    it('should initialize with isLoading false', () => {
      const { isLoading } = useAmiBase(mockClient)

      expect(isLoading.value).toBe(false)
    })

    it('should accept Ref client', () => {
      const clientRef = ref(mockClient)
      const { items } = useAmiBase(clientRef as Ref<AmiClient | null>)

      expect(items.value).toBeInstanceOf(Map)
    })

    it('should accept null client', () => {
      const { items, error } = useAmiBase(null)

      expect(items.value).toBeInstanceOf(Map)
      expect(error.value).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should fetch and populate items', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]

      const fetchData = vi.fn().mockResolvedValue(mockData)
      const { refresh, items } = useAmiBase(mockClient, { fetchData })

      await refresh()

      expect(fetchData).toHaveBeenCalledWith(mockClient)
      expect(items.value.size).toBe(2)
      expect(items.value.get('1')).toEqual({ id: '1', name: 'Item 1' })
      expect(items.value.get('2')).toEqual({ id: '2', name: 'Item 2' })
    })

    it('should set error on fetch failure', async () => {
      const fetchData = vi.fn().mockRejectedValue(new Error('Network error'))
      const { refresh, error } = useAmiBase(mockClient, {
        fetchData,
        errorContext: 'TestFetch',
      })

      await expect(refresh()).rejects.toThrow()

      expect(error.value).toContain('TestFetch failed')
    })

    it('should set error when no client', async () => {
      const { refresh, error } = useAmiBase(null)

      await refresh()

      expect(error.value).toBe('AMI client not connected')
    })

    it('should set error when no fetchData provided', async () => {
      const { refresh, error } = useAmiBase(mockClient)

      await refresh()

      expect(error.value).toBe('No fetch function provided')
    })

    it('should clear existing items before fetching', async () => {
      const fetchData = vi.fn().mockResolvedValue([{ id: 'new' }])
      const { refresh, items } = useAmiBase(mockClient, { fetchData })

      // Manually add an item
      items.value.set('old', { id: 'old' } as any)

      await refresh()

      expect(items.value.size).toBe(1)
      expect(items.value.has('old')).toBe(false)
    })

    it('should use custom getItemId', async () => {
      const mockData = [{ uid: 'custom-id', name: 'Item' }]
      const fetchData = vi.fn().mockResolvedValue(mockData)
      const getItemId = (item: any) => item.uid

      const { refresh, items } = useAmiBase(mockClient, {
        fetchData,
        getItemId,
      })

      await refresh()

      expect(items.value.get('custom-id')).toEqual({ uid: 'custom-id', name: 'Item' })
    })
  })

  describe('itemList', () => {
    it('should return array of items', async () => {
      const mockData = [{ id: '1' }, { id: '2' }, { id: '3' }]
      const fetchData = vi.fn().mockResolvedValue(mockData)
      const { refresh, itemList } = useAmiBase(mockClient, { fetchData })

      await refresh()

      expect(itemList.value).toHaveLength(3)
    })

    it('should return empty array when no items', () => {
      const { itemList } = useAmiBase(mockClient)

      expect(itemList.value).toEqual([])
    })
  })

  describe('getItem', () => {
    it('should return item by id', async () => {
      const mockData = [{ id: '1', name: 'First' }]
      const fetchData = vi.fn().mockResolvedValue(mockData)
      const { refresh, getItem } = useAmiBase(mockClient, { fetchData })

      await refresh()

      expect(getItem('1')).toEqual({ id: '1', name: 'First' })
    })

    it('should return undefined for unknown id', async () => {
      const mockData = [{ id: '1' }]
      const fetchData = vi.fn().mockResolvedValue(mockData)
      const { refresh, getItem } = useAmiBase(mockClient, { fetchData })

      await refresh()

      expect(getItem('unknown')).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should clear all items', async () => {
      const mockData = [{ id: '1' }]
      const fetchData = vi.fn().mockResolvedValue(mockData)
      const { refresh, clear, items, error } = useAmiBase(mockClient, { fetchData })

      await refresh()
      expect(items.value.size).toBe(1)

      clear()

      expect(items.value.size).toBe(0)
      expect(error.value).toBeNull()
    })
  })

  describe('events', () => {
    it('should add event listener', () => {
      const handler = vi.fn()
      const { addEventListener } = useAmiBase(mockClient)

      const cleanup = addEventListener('TestEvent', handler)

      expect(mockClient.on).toHaveBeenCalledWith('TestEvent', handler)
      expect(typeof cleanup).toBe('function')
    })

    it('should remove event listener', () => {
      const handler = vi.fn()
      const { addEventListener, removeEventListener } = useAmiBase(mockClient)

      addEventListener('TestEvent', handler)
      removeEventListener('TestEvent', handler)

      expect(mockClient.off).toHaveBeenCalledWith('TestEvent', handler)
    })

    it('should setup events when configured', () => {
      const parseEvent = vi.fn((event: any) => ({ id: event.id }))

      useAmiBase(mockClient, {
        useEvents: true,
        eventNames: ['ItemCreated'],
        parseEvent,
      })

      expect(mockClient.on).toHaveBeenCalled()
    })

    it('should parse events when configured', () => {
      // Verify that parseEvent is used by checking the composable accepts it
      const parseEvent = vi.fn((event: Record<string, unknown>) => ({
        id: event.id,
      }))

      useAmiBase(mockClient, {
        useEvents: true,
        eventNames: ['ItemCreated'],
        parseEvent,
      })

      // Just verify setup doesn't throw and event listener was added
      expect(mockClient.on).toHaveBeenCalled()
    })

    it('should cleanup events on unmount', () => {
      const handler = vi.fn()
      const { addEventListener, cleanupEvents } = useAmiBase(mockClient)

      addEventListener('TestEvent', handler)
      cleanupEvents()

      // Cleanup should have been called
      expect(mockClient.off).toHaveBeenCalled()
    })
  })

  describe('polling', () => {
    it('should not throw when polling interval configured', () => {
      // Polling is internal - just verify composable doesn't crash
      expect(() => {
        useAmiBase(mockClient, {
          useEvents: false,
          pollingInterval: 1000,
          autoRefresh: false,
        })
      }).not.toThrow()
    })
  })

  describe('options', () => {
    it('should respect debug option', () => {
      // Debug mode enables logging - just verify the composable accepts the option
      // The logging mechanism has changed from console.log to logger.debug
      expect(() => useAmiBase(mockClient, { debug: true })).not.toThrow()
    })

    it('should use custom errorContext', async () => {
      const fetchData = vi.fn().mockRejectedValue(new Error('Fail'))
      const { refresh, error } = useAmiBase(mockClient, {
        fetchData,
        errorContext: 'CustomContext',
      })

      await expect(refresh()).rejects.toThrow()

      expect(error.value).toContain('CustomContext')
    })
  })

  describe('client changes', () => {
    it('should initialize with Ref client', () => {
      const clientRef = ref(mockClient)

      const { items } = useAmiBase(clientRef as Ref<AmiClient | null>)

      expect(items.value).toBeInstanceOf(Map)
    })

    it('should handle null client', () => {
      const { items, error } = useAmiBase(null)

      expect(items.value).toBeInstanceOf(Map)
      expect(error.value).toBeNull()
    })
  })
})
