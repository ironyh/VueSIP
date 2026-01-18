/**
 * useAmiMWI Composable Tests
 *
 * Unit tests for MWI (Message Waiting Indicator) management via AMI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiMWI } from '@/composables/useAmiMWI'
import type { AmiClient } from '@/core/AmiClient'
import { withSetup } from '../../utils/test-helpers'

// Mock AmiClient
function createMockAmiClient() {
  const eventHandlers = new Map<string, Set<Function>>()

  return {
    send: vi.fn(),
    sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      eventHandlers.get(event)?.delete(handler)
    }),
    emit: (event: string, data: unknown) => {
      eventHandlers.get(event)?.forEach((handler) => handler(data))
    },
    getEventHandlers: () => eventHandlers,
  }
}

describe('useAmiMWI', () => {
  let mockClient: ReturnType<typeof createMockAmiClient>
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    mockClient = createMockAmiClient()
    clientRef = ref(mockClient as unknown as AmiClient)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with empty mailboxes map', () => {
      const { mailboxes } = useAmiMWI(clientRef)

      expect(mailboxes.value).toBeInstanceOf(Map)
      expect(mailboxes.value.size).toBe(0)
    })

    it('should initialize with isLoading as false', () => {
      const { isLoading } = useAmiMWI(clientRef)

      expect(isLoading.value).toBe(false)
    })

    it('should initialize with error as null', () => {
      const { error } = useAmiMWI(clientRef)

      expect(error.value).toBeNull()
    })

    it('should set up event listeners when client is provided', () => {
      useAmiMWI(clientRef, { useEvents: true })

      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should not set up event listeners when useEvents is false', () => {
      useAmiMWI(clientRef, { useEvents: false })

      expect(mockClient.on).not.toHaveBeenCalled()
    })
  })

  describe('getMailboxStatus', () => {
    it('should get mailbox message counts', async () => {
      mockClient.sendAction.mockResolvedValueOnce({
        data: {
          Response: 'Success',
          Mailbox: '1001@default',
          NewMessages: '3',
          OldMessages: '5',
          UrgentNew: '1',
          UrgentOld: '0',
        },
      })

      const { getMailboxStatus, mailboxes } = useAmiMWI(clientRef)

      const status = await getMailboxStatus('1001')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxCount',
        Mailbox: '1001@default',
      })
      expect(status.newMessages).toBe(3)
      expect(status.oldMessages).toBe(5)
      expect(status.urgentNew).toBe(1)
      expect(status.urgentOld).toBe(0)
      expect(status.indicatorOn).toBe(true)
      expect(mailboxes.value.get('1001@default')).toEqual(status)
    })

    it('should use custom context from options', async () => {
      mockClient.sendAction.mockResolvedValueOnce({
        data: {
          Response: 'Success',
          NewMessages: '0',
          OldMessages: '0',
        },
      })

      const { getMailboxStatus } = useAmiMWI(clientRef, { defaultContext: 'voicemail' })

      await getMailboxStatus('1001')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxCount',
        Mailbox: '1001@voicemail',
      })
    })

    it('should preserve context if already in mailbox string', async () => {
      mockClient.sendAction.mockResolvedValueOnce({
        data: {
          Response: 'Success',
          NewMessages: '0',
          OldMessages: '0',
        },
      })

      const { getMailboxStatus } = useAmiMWI(clientRef)

      await getMailboxStatus('1001@custom')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxCount',
        Mailbox: '1001@custom',
      })
    })

    it('should set isLoading during request', async () => {
      let resolvePromise: (value: unknown) => void
      mockClient.sendAction.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      const { getMailboxStatus, isLoading } = useAmiMWI(clientRef)

      const promise = getMailboxStatus('1001')
      await nextTick()

      expect(isLoading.value).toBe(true)

      resolvePromise!({ data: { NewMessages: '0', OldMessages: '0' } })
      await promise

      expect(isLoading.value).toBe(false)
    })

    it('should set error on failure', async () => {
      mockClient.sendAction.mockRejectedValueOnce(new Error('Mailbox not found'))

      const { getMailboxStatus, error } = useAmiMWI(clientRef)

      await expect(getMailboxStatus('invalid')).rejects.toThrow()
      expect(error.value).toBe('Mailbox not found')
    })

    it('should indicate no messages when count is 0', async () => {
      mockClient.sendAction.mockResolvedValueOnce({
        data: {
          Response: 'Success',
          NewMessages: '0',
          OldMessages: '2',
        },
      })

      const { getMailboxStatus } = useAmiMWI(clientRef)

      const status = await getMailboxStatus('1001')

      expect(status.indicatorOn).toBe(false) // Only new messages trigger indicator
    })
  })

  describe('updateMWI', () => {
    it('should update MWI indicator', async () => {
      mockClient.sendAction.mockResolvedValueOnce({ data: { Response: 'Success' } })

      const { updateMWI, mailboxes } = useAmiMWI(clientRef)

      const result = await updateMWI('1001', 5, 3)

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MWIUpdate',
        Mailbox: '1001@default',
        NewMessages: '5',
        OldMessages: '3',
      })
      expect(mailboxes.value.get('1001@default')?.newMessages).toBe(5)
      expect(mailboxes.value.get('1001@default')?.oldMessages).toBe(3)
      expect(mailboxes.value.get('1001@default')?.indicatorOn).toBe(true)
    })

    it('should default oldMessages to 0', async () => {
      mockClient.sendAction.mockResolvedValueOnce({ data: { Response: 'Success' } })

      const { updateMWI } = useAmiMWI(clientRef)

      await updateMWI('1001', 2)

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MWIUpdate',
        Mailbox: '1001@default',
        NewMessages: '2',
        OldMessages: '0',
      })
    })

    it('should call onMWIChange callback', async () => {
      mockClient.sendAction.mockResolvedValueOnce({ data: { Response: 'Success' } })
      const onMWIChange = vi.fn()

      const { updateMWI } = useAmiMWI(clientRef, { onMWIChange })

      await updateMWI('1001', 3)

      expect(onMWIChange).toHaveBeenCalledWith(
        '1001@default',
        expect.objectContaining({
          mailbox: '1001@default',
          newMessages: 3,
          indicatorOn: true,
        })
      )
    })

    it('should return false on failure', async () => {
      mockClient.sendAction.mockRejectedValueOnce(new Error('Update failed'))

      const { updateMWI, error } = useAmiMWI(clientRef)

      const result = await updateMWI('1001', 1)

      expect(result).toBe(false)
      expect(error.value).toBe('Update failed')
    })
  })

  describe('deleteMWI', () => {
    it('should delete MWI state', async () => {
      mockClient.sendAction.mockResolvedValueOnce({ data: { Response: 'Success' } })
      mockClient.sendAction.mockResolvedValueOnce({ data: { Response: 'Success' } })

      const { updateMWI, deleteMWI, mailboxes } = useAmiMWI(clientRef)

      await updateMWI('1001', 3)
      expect(mailboxes.value.has('1001@default')).toBe(true)

      const result = await deleteMWI('1001')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'MWIDelete',
        Mailbox: '1001@default',
      })
      expect(mailboxes.value.has('1001@default')).toBe(false)
    })

    it('should return false on failure', async () => {
      mockClient.sendAction.mockRejectedValueOnce(new Error('Delete failed'))

      const { deleteMWI, error } = useAmiMWI(clientRef)

      const result = await deleteMWI('1001')

      expect(result).toBe(false)
      expect(error.value).toBe('Delete failed')
    })
  })

  describe('refresh', () => {
    it('should refresh all tracked mailboxes', async () => {
      // Initial setup
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '1', OldMessages: '0' } })
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '2', OldMessages: '1' } })
      // Refresh calls
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '5', OldMessages: '2' } })
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '0', OldMessages: '3' } })

      const { getMailboxStatus, refresh, mailboxes } = useAmiMWI(clientRef)

      await getMailboxStatus('1001')
      await getMailboxStatus('1002')

      await refresh()

      expect(mockClient.sendAction).toHaveBeenCalledTimes(4)
      expect(mailboxes.value.get('1001@default')?.newMessages).toBe(5)
      expect(mailboxes.value.get('1002@default')?.newMessages).toBe(0)
    })

    it('should continue refreshing even if one mailbox fails', async () => {
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '1', OldMessages: '0' } })
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '2', OldMessages: '0' } })
      mockClient.sendAction.mockRejectedValueOnce(new Error('Failed'))
      mockClient.sendAction.mockResolvedValueOnce({ data: { NewMessages: '10', OldMessages: '0' } })

      const { getMailboxStatus, refresh, mailboxes } = useAmiMWI(clientRef)

      await getMailboxStatus('1001')
      await getMailboxStatus('1002')

      await refresh()

      // Should have called for both mailboxes during refresh
      expect(mockClient.sendAction).toHaveBeenCalledTimes(4)
      // 1002 should have been refreshed even though 1001 failed
      expect(mailboxes.value.get('1002@default')?.newMessages).toBe(10)
    })
  })

  describe('Utility Functions', () => {
    describe('getMailbox', () => {
      it('should return mailbox status from cache', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '3', OldMessages: '5' },
        })

        const { getMailboxStatus, getMailbox } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')

        const status = getMailbox('1001')
        expect(status?.newMessages).toBe(3)
        expect(status?.oldMessages).toBe(5)
      })

      it('should return undefined for unknown mailbox', () => {
        const { getMailbox } = useAmiMWI(clientRef)

        expect(getMailbox('unknown')).toBeUndefined()
      })
    })

    describe('hasMessages', () => {
      it('should return true when mailbox has new messages', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '3', OldMessages: '0' },
        })

        const { getMailboxStatus, hasMessages } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')

        expect(hasMessages('1001')).toBe(true)
      })

      it('should return true when mailbox has old messages', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '0', OldMessages: '5' },
        })

        const { getMailboxStatus, hasMessages } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')

        expect(hasMessages('1001')).toBe(true)
      })

      it('should return false when mailbox has no messages', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '0', OldMessages: '0' },
        })

        const { getMailboxStatus, hasMessages } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')

        expect(hasMessages('1001')).toBe(false)
      })

      it('should return false for unknown mailbox', () => {
        const { hasMessages } = useAmiMWI(clientRef)

        expect(hasMessages('unknown')).toBe(false)
      })
    })

    describe('trackMailbox', () => {
      it('should add mailbox to tracking', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '2', OldMessages: '1' },
        })

        const { trackMailbox, mailboxes } = useAmiMWI(clientRef)

        await trackMailbox('1001')

        expect(mailboxes.value.has('1001@default')).toBe(true)
      })
    })

    describe('untrackMailbox', () => {
      it('should remove mailbox from tracking', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '2', OldMessages: '1' },
        })

        const { trackMailbox, untrackMailbox, mailboxes } = useAmiMWI(clientRef)

        await trackMailbox('1001')
        expect(mailboxes.value.has('1001@default')).toBe(true)

        untrackMailbox('1001')
        expect(mailboxes.value.has('1001@default')).toBe(false)
      })
    })
  })

  describe('Computed Properties', () => {
    describe('mailboxList', () => {
      it('should return mailboxes as array', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '1', OldMessages: '0' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '2', OldMessages: '0' },
        })

        const { getMailboxStatus, mailboxList } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')
        await getMailboxStatus('1002')

        expect(mailboxList.value).toHaveLength(2)
        expect(mailboxList.value.map((m) => m.mailbox)).toContain('1001@default')
        expect(mailboxList.value.map((m) => m.mailbox)).toContain('1002@default')
      })
    })

    describe('mailboxesWithMessages', () => {
      it('should filter mailboxes with messages', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '5', OldMessages: '0' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '0', OldMessages: '0' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '0', OldMessages: '3' },
        })

        const { getMailboxStatus, mailboxesWithMessages } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')
        await getMailboxStatus('1002')
        await getMailboxStatus('1003')

        expect(mailboxesWithMessages.value).toHaveLength(2)
        expect(mailboxesWithMessages.value.map((m) => m.mailbox)).toContain('1001@default')
        expect(mailboxesWithMessages.value.map((m) => m.mailbox)).toContain('1003@default')
        expect(mailboxesWithMessages.value.map((m) => m.mailbox)).not.toContain('1002@default')
      })
    })

    describe('totalNewMessages', () => {
      it('should sum all new messages', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '3', OldMessages: '0' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '5', OldMessages: '0' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '2', OldMessages: '0' },
        })

        const { getMailboxStatus, totalNewMessages } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')
        await getMailboxStatus('1002')
        await getMailboxStatus('1003')

        expect(totalNewMessages.value).toBe(10)
      })
    })

    describe('indicatorOnCount', () => {
      it('should count mailboxes with indicator on', async () => {
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '3', OldMessages: '0' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '0', OldMessages: '5' },
        })
        mockClient.sendAction.mockResolvedValueOnce({
          data: { NewMessages: '1', OldMessages: '0' },
        })

        const { getMailboxStatus, indicatorOnCount } = useAmiMWI(clientRef)

        await getMailboxStatus('1001')
        await getMailboxStatus('1002')
        await getMailboxStatus('1003')

        // Only 1001 and 1003 have new messages, so indicator is on
        expect(indicatorOnCount.value).toBe(2)
      })
    })
  })

  describe('Event Handling', () => {
    it('should update mailbox on MessageWaiting event', async () => {
      const onMWIChange = vi.fn()
      const { mailboxes } = useAmiMWI(clientRef, { onMWIChange })

      mockClient.emit('event', {
        data: {
          Event: 'MessageWaiting',
          Mailbox: '1001@default',
          Waiting: 'Yes',
          New: '5',
          Old: '3',
        },
      })

      await nextTick()

      expect(mailboxes.value.get('1001@default')).toEqual(
        expect.objectContaining({
          mailbox: '1001@default',
          newMessages: 5,
          oldMessages: 3,
          indicatorOn: true,
        })
      )
      expect(onMWIChange).toHaveBeenCalledWith(
        '1001@default',
        expect.objectContaining({
          newMessages: 5,
          indicatorOn: true,
        })
      )
    })

    it('should handle Waiting=No', async () => {
      const { mailboxes } = useAmiMWI(clientRef)

      mockClient.emit('event', {
        data: {
          Event: 'MessageWaiting',
          Mailbox: '1001@default',
          Waiting: 'No',
          New: '0',
          Old: '0',
        },
      })

      await nextTick()

      expect(mailboxes.value.get('1001@default')?.indicatorOn).toBe(false)
    })

    it('should handle numeric Waiting values', async () => {
      const { mailboxes } = useAmiMWI(clientRef)

      mockClient.emit('event', {
        data: {
          Event: 'MessageWaiting',
          Mailbox: '1001@default',
          Waiting: '1',
          New: '2',
          Old: '0',
        },
      })

      await nextTick()

      expect(mailboxes.value.get('1001@default')?.indicatorOn).toBe(true)
    })
  })

  describe('Client Connection Changes', () => {
    it('should cleanup events when client changes', async () => {
      useAmiMWI(clientRef)

      expect(mockClient.on).toHaveBeenCalled()

      const newMockClient = createMockAmiClient()
      clientRef.value = newMockClient as unknown as AmiClient

      await nextTick()

      expect(mockClient.off).toHaveBeenCalled()
      expect(newMockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should throw error when client is null', async () => {
      clientRef.value = null
      const { getMailboxStatus } = useAmiMWI(clientRef)

      await expect(getMailboxStatus('1001')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('Cleanup on Unmount', () => {
    it('should clean up events and clear mailboxes on unmount', async () => {
      const localMockClient = createMockAmiClient()
      const localClientRef = ref(localMockClient as unknown as AmiClient)

      const { result, unmount } = withSetup(() => useAmiMWI(localClientRef))

      // Add some mailboxes to the state
      result.mailboxes.value.set('1001', {
        mailbox: '1001',
        context: 'default',
        newMessages: 5,
        oldMessages: 10,
      })

      expect(result.mailboxes.value.size).toBe(1)

      // Unmount should clean up events and clear mailboxes
      unmount()

      expect(result.mailboxes.value.size).toBe(0)
      expect(localMockClient.off).toHaveBeenCalled()
    })
  })
})
