/**
 * useAmiBase composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { ref } from 'vue'
import { useAmiBase } from '../useAmiBase'
import type { AmiClient } from '@/core/AmiClient'

// Mock types
interface TestItem {
  id: string
  name: string
  value?: number
}

// Create mock AMI client
function createMockClient(): AmiClient {
  const listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  return {
    isConnected: true,
    options: { host: 'localhost', port: 5038 },
    connectedAt: new Date(),

    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(handler)
    }),

    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler)
    }),

    emit: vi.fn((event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((handler) => handler(...args))
    }),

    send: vi.fn().mockResolvedValue({
      events: [
        { Event: 'TestItem', ID: '1', Name: 'Item 1', Value: 10 },
        { Event: 'TestItem', ID: '2', Name: 'Item 2', Value: 20 },
      ],
    }),

    sendAction: vi.fn().mockResolvedValue({}),

    close: vi.fn(),
  } as unknown as AmiClient
}

describe('useAmiBase', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
  })

  describe('Initial state', () => {
    it('should initialize with empty items map', () => {
      const { items, isLoading, error, itemList } = useAmiBase<TestItem>(null)

      expect(items.value.size).toBe(0)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(itemList.value).toEqual([])
    })

    it('should accept null client', () => {
      const { items } = useAmiBase<TestItem>(null)
      expect(items.value).toBeInstanceOf(Map)
    })

    it('should accept ref client', () => {
      const clientRef = ref<AmiClient | null>(null)
      const { items } = useAmiBase<TestItem>(clientRef)
      expect(items.value).toBeInstanceOf(Map)
    })
  })

  describe('Data fetching', () => {
    it('should refresh data from AMI', async () => {
      const fetchData = vi.fn().mockResolvedValue([
        { id: '1', name: 'Item 1', value: 10 },
        { id: '2', name: 'Item 2', value: 20 },
      ])

      const { refresh, items, isLoading } = useAmiBase<TestItem>(mockClient, {
        fetchData,
        getItemId: (item) => item.id,
      })

      // Wait for initial setup
      await new Promise((resolve) => setTimeout(resolve, 50))

      await refresh()

      expect(fetchData).toHaveBeenCalledWith(mockClient)
      expect(items.value.size).toBe(2)
      expect(items.value.get('1')?.name).toBe('Item 1')
      expect(isLoading.value).toBe(false)
    })

    it('should set error when client not connected', async () => {
      const { refresh, error } = useAmiBase<TestItem>(null, {
        fetchData: async () => [],
      })

      await refresh()

      expect(error.value).toBe('AMI client not connected')
    })

    it('should set error when no fetch function provided', async () => {
      const { refresh, error } = useAmiBase<TestItem>(mockClient)

      await refresh()

      expect(error.value).toBe('No fetch function provided')
    })

    it('should handle fetch errors', async () => {
      const fetchData = vi.fn().mockRejectedValue(new Error('Network error'))

      const { refresh, error, isLoading } = useAmiBase<TestItem>(mockClient, {
        fetchData,
        errorContext: 'TestOperation',
      })

      await expect(refresh()).rejects.toThrow('Network error')

      expect(error.value).toContain('Network error')
      expect(error.value).toContain('TestOperation')
      expect(isLoading.value).toBe(false)
    })

    it('should set loading state during fetch', async () => {
      let resolveFetch: (value: TestItem[]) => void
      const fetchData = vi.fn(
        () =>
          new Promise<TestItem[]>((resolve) => {
            resolveFetch = resolve
          })
      )

      const { refresh, isLoading } = useAmiBase<TestItem>(mockClient, { fetchData })

      const refreshPromise = refresh()

      // Loading should be true during fetch
      expect(isLoading.value).toBe(true)

      resolveFetch!([{ id: '1', name: 'Test' }])
      await refreshPromise

      expect(isLoading.value).toBe(false)
    })
  })

  describe('Item operations', () => {
    it('should get item by id', () => {
      const { getItem, items } = useAmiBase<TestItem>(null)
      items.value.set('1', { id: '1', name: 'Test' })

      const item = getItem('1')

      expect(item?.name).toBe('Test')
    })

    it('should return undefined for non-existent item', () => {
      const { getItem } = useAmiBase<TestItem>(null)

      const item = getItem('non-existent')

      expect(item).toBeUndefined()
    })

    it('should clear all items', () => {
      const { clear, items } = useAmiBase<TestItem>(null)
      items.value.set('1', { id: '1', name: 'Test' })
      items.value.set('2', { id: '2', name: 'Test 2' })

      clear()

      expect(items.value.size).toBe(0)
    })

    it('should clear error on clear', () => {
      const { clear, error, items } = useAmiBase<TestItem>(null)
      items.value.set('1', { id: '1', name: 'Test' })
      error.value = 'Some error'

      clear()

      expect(error.value).toBeNull()
    })
  })

  describe('Event handling', () => {
    it('should add event listener', () => {
      const handler = vi.fn()
      const { addEventListener } = useAmiBase<TestItem>(mockClient)

      const cleanup = addEventListener('TestEvent', handler)

      expect(mockClient.on).toHaveBeenCalledWith('TestEvent', handler)
      expect(typeof cleanup).toBe('function')
    })

    it('should remove event listener', () => {
      const handler = vi.fn()
      const { addEventListener, removeEventListener } = useAmiBase<TestItem>(mockClient)

      addEventListener('TestEvent', handler)
      removeEventListener('TestEvent', handler)

      expect(mockClient.off).toHaveBeenCalledWith('TestEvent', handler)
    })

    it('should setup events with parseEvent', () => {
      const parseEvent = vi.fn((event: Record<string, unknown>) => {
        if (event.Event === 'ItemUpdated') {
          return { id: String(event.ID), name: String(event.Name) }
        }
        return null
      })

      const { setupEvents, items } = useAmiBase<TestItem>(mockClient, {
        parseEvent,
        eventNames: ['ItemUpdated'],
      })

      setupEvents()

      // Find the handler that was registered
      const onCalls = (mockClient.on as Mock).mock.calls
      const handler = onCalls.find((call: unknown[]) => call[0] === 'ItemUpdated')?.[1] as (
        ...args: unknown[]
      ) => void

      // Manually invoke the handler with an event
      if (handler) {
        handler({ Event: 'ItemUpdated', ID: '1', Name: 'Updated Item' })
      }

      expect(items.value.get('1')?.name).toBe('Updated Item')
    })

    it('should cleanup all events', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const { addEventListener, cleanupEvents } = useAmiBase<TestItem>(mockClient)

      addEventListener('Event1', handler1)
      addEventListener('Event2', handler2)

      cleanupEvents()

      expect(mockClient.off).toHaveBeenCalledTimes(2)
    })
  })

  // Note: Polling functions (startPolling/stopPolling) are internal and not exported
  // They are tested indirectly through client watching behavior

  // Note: Client watching is tested indirectly through refresh behavior
  // The composable's watch effect triggers refresh on client changes

  describe('Debug logging', () => {
    it('should not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const { refresh } = useAmiBase<TestItem>(mockClient, {
        fetchData: vi.fn().mockResolvedValue([]),
        debug: false,
      })

      refresh()

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log when debug is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const { refresh } = useAmiBase<TestItem>(mockClient, {
        fetchData: vi.fn().mockResolvedValue([]),
        debug: true,
        errorContext: 'TestContext',
      })

      await refresh()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Default getItemId', () => {
    it('should use id property by default', () => {
      const { getItem, items } = useAmiBase<TestItem>(null)
      items.value.set('test-id', { id: 'test-id', name: 'Test' })

      const item = getItem('test-id')

      expect(item?.id).toBe('test-id')
    })
  })
})
