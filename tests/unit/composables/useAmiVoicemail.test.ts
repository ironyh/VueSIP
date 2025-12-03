/**
 * useAmiVoicemail composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiVoicemail } from '@/composables/useAmiVoicemail'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  createAmiEvent,
  createAmiSuccessResponse,
  type MockAmiClient,
} from '../utils/mockFactories'

describe('useAmiVoicemail', () => {
  let mockClient: MockAmiClient
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
    clientRef = ref(mockClient as unknown as AmiClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have empty MWI states initially', () => {
      const { mwiStates } = useAmiVoicemail(clientRef)
      expect(mwiStates.value.size).toBe(0)
    })

    it('should have empty mailboxes initially', () => {
      const { mailboxes } = useAmiVoicemail(clientRef)
      expect(mailboxes.value.size).toBe(0)
    })

    it('should have no error initially', () => {
      const { error } = useAmiVoicemail(clientRef)
      expect(error.value).toBeNull()
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiVoicemail(clientRef)
      expect(isLoading.value).toBe(false)
    })

    it('should have zero total messages initially', () => {
      const { totalNewMessages, totalOldMessages } = useAmiVoicemail(clientRef)
      expect(totalNewMessages.value).toBe(0)
      expect(totalOldMessages.value).toBe(0)
    })

    it('should not have waiting messages initially', () => {
      const { hasWaitingMessages } = useAmiVoicemail(clientRef)
      expect(hasWaitingMessages.value).toBe(false)
    })
  })

  describe('getMwiState', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { getMwiState } = useAmiVoicemail(clientRef)

      await expect(getMwiState('1000')).rejects.toThrow('Not connected to AMI')
    })

    it('should query mailbox status', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Success',
          Waiting: '1',
          NewMessages: '3',
          OldMessages: '5',
        },
      })

      const { getMwiState, mwiStates } = useAmiVoicemail(clientRef)
      const state = await getMwiState('1000', 'default')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxStatus',
        Mailbox: '1000@default',
      })

      expect(state.mailbox).toBe('1000@default')
      expect(state.waiting).toBe(true)
      expect(state.newMessages).toBe(3)
      expect(state.oldMessages).toBe(5)
      expect(mwiStates.value.get('1000@default')).toEqual(state)
    })

    it('should use default context when not specified', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Success',
          Waiting: '0',
          NewMessages: '0',
          OldMessages: '0',
        },
      })

      const { getMwiState } = useAmiVoicemail(clientRef)
      await getMwiState('1000')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxStatus',
        Mailbox: '1000@default',
      })
    })

    it('should handle failed response', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Error',
          Message: 'Mailbox not found',
        },
      })

      const { getMwiState, error } = useAmiVoicemail(clientRef)

      await expect(getMwiState('9999')).rejects.toThrow('Mailbox not found')
      expect(error.value).toBe('Mailbox not found')
    })
  })

  describe('monitorMailbox / unmonitorMailbox', () => {
    it('should add mailbox to monitored set', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Success',
          Waiting: '0',
          NewMessages: '0',
          OldMessages: '0',
        },
      })

      const { monitorMailbox, mwiStates: _mwiStates } = useAmiVoicemail(clientRef)
      monitorMailbox('1000', 'default')

      // Wait for async getMwiState call
      await vi.runAllTimersAsync()

      expect(mockClient.sendAction).toHaveBeenCalled()
    })

    it('should remove mailbox from monitored set and clear state', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Success',
          Waiting: '1',
          NewMessages: '2',
          OldMessages: '0',
        },
      })

      const { monitorMailbox, unmonitorMailbox, mwiStates } = useAmiVoicemail(clientRef)

      monitorMailbox('1000')
      await vi.runAllTimersAsync()
      expect(mwiStates.value.has('1000@default')).toBe(true)

      unmonitorMailbox('1000')
      expect(mwiStates.value.has('1000@default')).toBe(false)
    })

    it('should clear all monitoring', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: { Response: 'Success', Waiting: '0', NewMessages: '0', OldMessages: '0' },
      })

      const { monitorMailbox, clearMonitoring, mwiStates, mailboxes } = useAmiVoicemail(clientRef)

      monitorMailbox('1000')
      monitorMailbox('1001')
      await vi.runAllTimersAsync()

      clearMonitoring()
      expect(mwiStates.value.size).toBe(0)
      expect(mailboxes.value.size).toBe(0)
    })
  })

  describe('refreshMailbox', () => {
    it('should send VoicemailRefresh action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: { Response: 'Success', Waiting: '0', NewMessages: '0', OldMessages: '0' },
      })

      const { refreshMailbox } = useAmiVoicemail(clientRef)
      await refreshMailbox('1000', 'default')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'VoicemailRefresh',
        Context: 'default',
        Mailbox: '1000',
      })
    })

    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { refreshMailbox } = useAmiVoicemail(clientRef)

      await expect(refreshMailbox('1000')).rejects.toThrow('Not connected to AMI')
    })
  })

  describe('MWI event handling', () => {
    it('should update MWI state on MessageWaiting event', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createAmiSuccessResponse({ Waiting: '0', NewMessages: '0', OldMessages: '0' })
      )

      const { monitorMailbox, mwiStates } = useAmiVoicemail(clientRef)

      // Monitor mailbox to start listening
      monitorMailbox('1000', 'default')
      await vi.runAllTimersAsync()

      // Simulate MWI event using helper
      const event = createAmiEvent('MessageWaiting', {
        Mailbox: '1000@default',
        Waiting: 'yes',
        New: '5',
        Old: '10',
      })

      mockClient._triggerEvent('event', event)
      await nextTick()

      const state = mwiStates.value.get('1000@default')
      expect(state?.waiting).toBe(true)
      expect(state?.newMessages).toBe(5)
      expect(state?.oldMessages).toBe(10)
    })

    it('should ignore events for non-monitored mailboxes', async () => {
      const { mwiStates } = useAmiVoicemail(clientRef)

      // Simulate MWI event for non-monitored mailbox using helper
      const event = createAmiEvent('MessageWaiting', {
        Mailbox: '9999@default',
        Waiting: 'yes',
        New: '1',
        Old: '0',
      })

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(mwiStates.value.has('9999@default')).toBe(false)
    })

    it('should call onNewMessage callback when new messages arrive', async () => {
      const onNewMessage = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createAmiSuccessResponse({ Waiting: '0', NewMessages: '0', OldMessages: '0' })
      )

      const { monitorMailbox } = useAmiVoicemail(clientRef, { onNewMessage })

      monitorMailbox('1000')
      await vi.runAllTimersAsync()

      // Simulate MWI event with new messages using helper
      const event = createAmiEvent('MessageWaiting', {
        Mailbox: '1000@default',
        Waiting: 'yes',
        New: '3',
        Old: '0',
      })

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(onNewMessage).toHaveBeenCalledWith('1000', 3)
    })
  })

  describe('onMwiChange listener', () => {
    it('should register and call listener on MWI change', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createAmiSuccessResponse({ Waiting: '0', NewMessages: '0', OldMessages: '0' })
      )

      const listener = vi.fn()
      const { monitorMailbox, onMwiChange } = useAmiVoicemail(clientRef)

      const unsubscribe = onMwiChange(listener)
      monitorMailbox('1000')
      await vi.runAllTimersAsync()

      // Simulate MWI event using helper
      const event = createAmiEvent('MessageWaiting', {
        Mailbox: '1000@default',
        Waiting: 'yes',
        New: '2',
        Old: '1',
      })

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(listener).toHaveBeenCalled()
      const mwi = listener.mock.calls[0][0]
      expect(mwi.newMessages).toBe(2)

      // Unsubscribe and verify listener is not called again
      unsubscribe()
      mockClient._triggerEvent('event', event)
      await nextTick()
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('computed properties', () => {
    it('should calculate totalNewMessages across all mailboxes', async () => {
      mockClient.sendAction = vi.fn()
        .mockResolvedValueOnce({
          server_id: 1,
          data: { Response: 'Success', Waiting: '1', NewMessages: '3', OldMessages: '0' },
        })
        .mockResolvedValueOnce({
          server_id: 1,
          data: { Response: 'Success', Waiting: '1', NewMessages: '5', OldMessages: '0' },
        })

      const { monitorMailbox, totalNewMessages } = useAmiVoicemail(clientRef)

      monitorMailbox('1000')
      monitorMailbox('1001')
      await vi.runAllTimersAsync()

      expect(totalNewMessages.value).toBe(8)
    })

    it('should calculate hasWaitingMessages correctly', async () => {
      mockClient.sendAction = vi.fn()
        .mockResolvedValueOnce({
          server_id: 1,
          data: { Response: 'Success', Waiting: '0', NewMessages: '0', OldMessages: '0' },
        })
        .mockResolvedValueOnce({
          server_id: 1,
          data: { Response: 'Success', Waiting: '1', NewMessages: '1', OldMessages: '0' },
        })

      const { monitorMailbox, hasWaitingMessages } = useAmiVoicemail(clientRef)

      monitorMailbox('1000')
      await vi.runAllTimersAsync()
      expect(hasWaitingMessages.value).toBe(false)

      monitorMailbox('1001')
      await vi.runAllTimersAsync()
      expect(hasWaitingMessages.value).toBe(true)
    })
  })

  describe('options', () => {
    it('should use custom defaultContext', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createAmiSuccessResponse({ Waiting: '0', NewMessages: '0', OldMessages: '0' })
      )

      const { getMwiState } = useAmiVoicemail(clientRef, { defaultContext: 'custom' })
      await getMwiState('1000')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxStatus',
        Mailbox: '1000@custom',
      })
    })

    it('should call onMwiChange callback from options', async () => {
      const onMwiChangeCallback = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createAmiSuccessResponse({ Waiting: '0', NewMessages: '0', OldMessages: '0' })
      )

      const { monitorMailbox } = useAmiVoicemail(clientRef, {
        onMwiChange: onMwiChangeCallback,
      })

      monitorMailbox('1000')
      await vi.runAllTimersAsync()

      // Simulate MWI event using helper
      const event = createAmiEvent('MessageWaiting', {
        Mailbox: '1000@default',
        Waiting: 'yes',
        New: '1',
        Old: '0',
      })

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(onMwiChangeCallback).toHaveBeenCalled()
    })
  })

  describe('getVoicemailUsers', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { getVoicemailUsers } = useAmiVoicemail(clientRef)

      await expect(getVoicemailUsers()).rejects.toThrow('Not connected to AMI')
    })

    it('should collect voicemail users from events', async () => {
      const actionId = `vuesip-vm-${Date.now()}`
      mockClient.sendAction = vi.fn().mockImplementation(() => {
        // Simulate events after a tick
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('VoicemailUserEntry', {
              ActionID: actionId,
              VoiceMailbox: '1000',
              VMContext: 'default',
              NewMessageCount: '2',
              OldMessageCount: '5',
              UrgentMessageCount: '0',
              FullName: 'John Doe',
              Email: 'john@example.com',
            })
          )
          mockClient._triggerEvent(
            'event',
            createAmiEvent('VoicemailUserEntryComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { getVoicemailUsers } = useAmiVoicemail(clientRef)

      const usersPromise = getVoicemailUsers()
      vi.advanceTimersByTime(100)
      const users = await usersPromise

      expect(users).toHaveLength(1)
      expect(users[0].mailbox).toBe('1000')
      expect(users[0].fullName).toBe('John Doe')
    })
  })

  describe('getMailboxInfo', () => {
    it('should find mailbox from voicemail users', async () => {
      const actionId = `vuesip-vm-${Date.now()}`
      mockClient.sendAction = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('VoicemailUserEntry', {
              ActionID: actionId,
              VoiceMailbox: '1000',
              VMContext: 'default',
              NewMessageCount: '0',
              OldMessageCount: '0',
              UrgentMessageCount: '0',
              FullName: 'Test User',
            })
          )
          mockClient._triggerEvent(
            'event',
            createAmiEvent('VoicemailUserEntryComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { getMailboxInfo } = useAmiVoicemail(clientRef)

      const infoPromise = getMailboxInfo('1000')
      vi.advanceTimersByTime(100)
      const info = await infoPromise

      expect(info?.mailbox).toBe('1000')
      expect(info?.fullName).toBe('Test User')
    })

    it('should return null for non-existent mailbox', async () => {
      const actionId = `vuesip-vm-${Date.now()}`
      mockClient.sendAction = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('VoicemailUserEntryComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { getMailboxInfo } = useAmiVoicemail(clientRef)

      const infoPromise = getMailboxInfo('9999')
      vi.advanceTimersByTime(100)
      const info = await infoPromise

      expect(info).toBeNull()
    })
  })
})
