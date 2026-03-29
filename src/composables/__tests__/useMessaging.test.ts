/**
 * useMessaging Unit Tests
 *
 * @group composables
 * @group messaging
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useMessaging } from '../useMessaging'
import type { SipClient } from '../../core/SipClient'
import {
  MessageStatus,
  MessageDirection,
  MessageContentType,
  MessagingEvent,
} from '../../types/messaging.types'

// Mock the logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock validators
vi.mock('../../utils/validators', () => ({
  validateSipUri: vi.fn((uri: string) => ({
    valid: uri.includes('@') && uri.startsWith('sip:'),
    error: uri.includes('@') ? undefined : 'URI must contain @',
  })),
}))

function createMockSipClient() {
  const handlers = {
    incomingMessage: null as ((from: string, content: string, contentType?: string) => void) | null,
    composingIndicator: null as ((from: string, isComposing: boolean) => void) | null,
  }

  const mockClient = {
    getConfig: vi.fn(() => ({ uri: 'sip:test@domain.com' })),
    sendMessage: vi
      .fn<[string, string, string | undefined], Promise<void>>()
      .mockResolvedValue(undefined),
    onIncomingMessage: vi.fn(
      (handler: (from: string, content: string, contentType?: string) => void) => {
        handlers.incomingMessage = handler
      }
    ),
    onComposingIndicator: vi.fn((handler: (from: string, isComposing: boolean) => void) => {
      handlers.composingIndicator = handler
    }),
    _testHandlers: handlers,
  } as unknown as SipClient & {
    _testHandlers: typeof handlers
  }

  return mockClient
}

describe('useMessaging', () => {
  let mockSipClient: ReturnType<typeof createMockSipClient>

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockSipClient = createMockSipClient()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty messages array', () => {
      const { messages } = useMessaging(ref(null))
      expect(messages.value).toEqual([])
    })

    it('should initialize with zero unread count', () => {
      const { unreadCount } = useMessaging(ref(null))
      expect(unreadCount.value).toBe(0)
    })

    it('should initialize with empty composing indicators', () => {
      const { composingIndicators } = useMessaging(ref(null))
      expect(composingIndicators.value.size).toBe(0)
    })

    it('should return empty conversations when no messages', () => {
      const { conversations } = useMessaging(ref(null))
      expect(conversations.value.size).toBe(0)
    })
  })

  describe('sendMessage', () => {
    it('should throw when SIP client is not initialized', async () => {
      const { sendMessage } = useMessaging(ref(null))

      await expect(sendMessage('sip:alice@domain.com', 'Hello')).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should throw when message content is empty', async () => {
      const { sendMessage } = useMessaging(ref(mockSipClient))

      await expect(sendMessage('sip:alice@domain.com', '')).rejects.toThrow(
        'Message content cannot be empty'
      )
      await expect(sendMessage('sip:alice@domain.com', '   ')).rejects.toThrow(
        'Message content cannot be empty'
      )
    })

    it('should throw when recipient URI is invalid', async () => {
      const { sendMessage } = useMessaging(ref(mockSipClient))

      await expect(sendMessage('invalid-uri', 'Hello')).rejects.toThrow('Invalid recipient URI')
    })

    it('should send message and return message ID', async () => {
      const { sendMessage, messages } = useMessaging(ref(mockSipClient))

      const messageId = await sendMessage('sip:alice@domain.com', 'Hello there!')

      expect(typeof messageId).toBe('string')
      expect(messageId.startsWith('msg-')).toBe(true)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].content).toBe('Hello there!')
      expect(messages.value[0].direction).toBe(MessageDirection.Outgoing)
      expect(messages.value[0].status).toBe(MessageStatus.Sent)
    })

    it('should include correct from/to fields on sent message', async () => {
      const { sendMessage, messages } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'Hello')

      expect(messages.value[0].from).toBe('sip:test@domain.com')
      expect(messages.value[0].to).toBe('sip:alice@domain.com')
    })

    it('should add extra headers when requesting delivery notification', async () => {
      const { sendMessage } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'Hello', {
        requestDeliveryNotification: true,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:alice@domain.com',
        'Hello',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Disposition-Notification: delivery']),
        })
      )
    })

    it('should add extra headers when requesting read notification', async () => {
      const { sendMessage } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'Hello', {
        requestReadNotification: true,
      })

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:alice@domain.com',
        'Hello',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Disposition-Notification: display']),
        })
      )
    })

    it('should update message status to Failed when send throws', async () => {
      mockSipClient.sendMessage.mockRejectedValueOnce(new Error('Network error'))
      const { sendMessage, messages } = useMessaging(ref(mockSipClient))

      await expect(sendMessage('sip:alice@domain.com', 'Hello')).rejects.toThrow('Network error')
      expect(messages.value[0].status).toBe(MessageStatus.Failed)
    })

    it('should mark outgoing messages as read by default', async () => {
      const { sendMessage, messages } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'Hello')

      expect(messages.value[0].isRead).toBe(true)
    })

    it('should emit sent event on successful send', async () => {
      const { sendMessage, onMessagingEvent } = useMessaging(ref(mockSipClient))
      const receivedEvents: MessagingEvent[] = []
      onMessagingEvent((e) => receivedEvents.push(e))

      await sendMessage('sip:alice@domain.com', 'Hello')

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0].type).toBe('sent')
      expect(receivedEvents[0].message.content).toBe('Hello')
    })

    it('should emit failed event when send throws', async () => {
      mockSipClient.sendMessage.mockRejectedValueOnce(new Error('Network error'))
      const { sendMessage, onMessagingEvent } = useMessaging(ref(mockSipClient))
      const receivedEvents: MessagingEvent[] = []
      onMessagingEvent((e) => receivedEvents.push(e))

      await expect(sendMessage('sip:alice@domain.com', 'Hello')).rejects.toThrow()

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0].type).toBe('failed')
      expect(receivedEvents[0].error).toBe('Network error')
    })
  })

  describe('conversations computed', () => {
    it('should group messages by peer URI', async () => {
      const { sendMessage, conversations } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'Hello')
      await sendMessage('sip:bob@domain.com', 'Hi')
      await sendMessage('sip:alice@domain.com', 'How are you?')

      expect(conversations.value.size).toBe(2)
      expect(conversations.value.get('sip:alice@domain.com')?.messages).toHaveLength(2)
      expect(conversations.value.get('sip:bob@domain.com')?.messages).toHaveLength(1)
    })

    it('should sort messages by timestamp within conversation', async () => {
      const { sendMessage, conversations } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'First')
      await sendMessage('sip:alice@domain.com', 'Second')
      await sendMessage('sip:alice@domain.com', 'Third')

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const conv = conversations.value.get('sip:alice@domain.com')!
      expect(conv.messages[0].content).toBe('First')
      expect(conv.messages[1].content).toBe('Second')
      expect(conv.messages[2].content).toBe('Third')
    })

    it('should count unread messages per conversation', () => {
      const { messages, conversations } = useMessaging(ref(mockSipClient))

      // Add incoming unread message
      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      // Add read incoming message
      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Read already',
        contentType: MessageContentType.Text,
        status: MessageStatus.Read,
        timestamp: new Date(),
        isRead: true,
      })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const conv = conversations.value.get('sip:alice@domain.com')!
      expect(conv.unreadCount).toBe(1)
    })

    it('should track lastMessageAt per conversation', async () => {
      const { sendMessage, conversations } = useMessaging(ref(mockSipClient))

      await sendMessage('sip:alice@domain.com', 'First')

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const conv = conversations.value.get('sip:alice@domain.com')!
      expect(conv.lastMessageAt).toBeInstanceOf(Date)
    })
  })

  describe('unreadCount computed', () => {
    it('should count only incoming unread messages', () => {
      const { messages, unreadCount } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Unread',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Outgoing,
        from: 'sip:test@domain.com',
        to: 'sip:alice@domain.com',
        content: 'Outgoing',
        contentType: MessageContentType.Text,
        status: MessageStatus.Sent,
        timestamp: new Date(),
        isRead: true,
      })

      messages.value.push({
        id: 'msg-3',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Read',
        contentType: MessageContentType.Text,
        status: MessageStatus.Read,
        timestamp: new Date(),
        isRead: true,
      })

      expect(unreadCount.value).toBe(1)
    })
  })

  describe('markAsRead', () => {
    it('should mark message as read', () => {
      const { messages, markAsRead, unreadCount } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      expect(unreadCount.value).toBe(1)

      markAsRead('msg-1')

      expect(messages.value[0].isRead).toBe(true)
      expect(messages.value[0].status).toBe(MessageStatus.Read)
      expect(unreadCount.value).toBe(0)
    })

    it('should do nothing for unknown message ID', () => {
      const { messages, markAsRead } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      expect(() => markAsRead('unknown-id')).not.toThrow()
      expect(messages.value[0].isRead).toBe(false)
    })

    it('should do nothing if message already read', () => {
      const { messages, markAsRead } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Read,
        timestamp: new Date(),
        isRead: true,
      })

      markAsRead('msg-1')
      expect(messages.value[0].isRead).toBe(true)
    })

    it('should emit read event', () => {
      const { messages, markAsRead, onMessagingEvent } = useMessaging(ref(mockSipClient))
      const receivedEvents: MessagingEvent[] = []
      onMessagingEvent((e) => receivedEvents.push(e))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      markAsRead('msg-1')

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0].type).toBe('read')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all messages as read when no URI provided', () => {
      const { messages, markAllAsRead, unreadCount } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hi',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      markAllAsRead()

      expect(unreadCount.value).toBe(0)
      expect(messages.value.every((m) => m.isRead)).toBe(true)
    })

    it('should mark only messages from specific URI when URI provided', () => {
      const { messages, markAllAsRead } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hi',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      markAllAsRead('sip:alice@domain.com')

      expect(messages.value[0].isRead).toBe(true)
      expect(messages.value[1].isRead).toBe(false)
    })
  })

  describe('deleteMessage', () => {
    it('should remove message from messages array', () => {
      const { messages, deleteMessage } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      deleteMessage('msg-1')

      expect(messages.value).toHaveLength(0)
    })

    it('should do nothing for unknown message ID', () => {
      const { messages, deleteMessage } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      expect(() => deleteMessage('unknown-id')).not.toThrow()
      expect(messages.value).toHaveLength(1)
    })
  })

  describe('clearMessages', () => {
    it('should clear all messages when no URI provided', () => {
      const { messages, clearMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hi',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      clearMessages()

      expect(messages.value).toHaveLength(0)
    })

    it('should clear only messages from specific URI', () => {
      const { messages, clearMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hi',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      clearMessages('sip:alice@domain.com')

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].id).toBe('msg-2')
    })
  })

  describe('getMessagesForUri', () => {
    it('should return messages involving the URI', () => {
      const { messages, getMessagesForUri } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(1000),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Outgoing,
        from: 'sip:test@domain.com',
        to: 'sip:alice@domain.com',
        content: 'Hi back',
        contentType: MessageContentType.Text,
        status: MessageStatus.Sent,
        timestamp: new Date(2000),
        isRead: true,
      })

      messages.value.push({
        id: 'msg-3',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Bob here',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      const aliceMessages = getMessagesForUri('sip:alice@domain.com')
      expect(aliceMessages).toHaveLength(2)
      expect(aliceMessages[0].id).toBe('msg-1')
      expect(aliceMessages[1].id).toBe('msg-2')
    })

    it('should return messages sorted by timestamp', () => {
      const { messages, getMessagesForUri } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Outgoing,
        from: 'sip:test@domain.com',
        to: 'sip:alice@domain.com',
        content: 'Second',
        contentType: MessageContentType.Text,
        status: MessageStatus.Sent,
        timestamp: new Date(2000),
        isRead: true,
      })

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'First',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(1000),
        isRead: false,
      })

      const sorted = getMessagesForUri('sip:alice@domain.com')
      expect(sorted[0].content).toBe('First')
      expect(sorted[1].content).toBe('Second')
    })
  })

  describe('getFilteredMessages', () => {
    beforeEach(() => {
      vi.useRealTimers()
    })

    afterEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    it('should filter by URI', () => {
      const { messages, getFilteredMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:bob@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hi',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      const filtered = getFilteredMessages({ uri: 'sip:alice@domain.com' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('msg-1')
    })

    it('should filter by direction', () => {
      const { messages, getFilteredMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Outgoing,
        from: 'sip:test@domain.com',
        to: 'sip:alice@domain.com',
        content: 'Hi',
        contentType: MessageContentType.Text,
        status: MessageStatus.Sent,
        timestamp: new Date(),
        isRead: true,
      })

      const filtered = getFilteredMessages({ direction: MessageDirection.Incoming })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('msg-1')
    })

    it('should filter by status', () => {
      const { messages, getFilteredMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Failed',
        contentType: MessageContentType.Text,
        status: MessageStatus.Failed,
        timestamp: new Date(),
        isRead: false,
      })

      const filtered = getFilteredMessages({ status: MessageStatus.Failed })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('msg-2')
    })

    it('should filter by dateFrom', () => {
      const { messages, getFilteredMessages } = useMessaging(ref(mockSipClient))
      const now = new Date()

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Old',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(1000),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'New',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(now.getTime() + 10000),
        isRead: false,
      })

      const filtered = getFilteredMessages({ dateFrom: new Date(5000) })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('msg-2')
    })

    it('should filter by searchQuery', () => {
      const { messages, getFilteredMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello world',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Goodbye world',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      const filtered = getFilteredMessages({ searchQuery: 'Hello' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('msg-1')
    })

    it('should combine multiple filters', () => {
      const { messages, getFilteredMessages } = useMessaging(ref(mockSipClient))

      messages.value.push({
        id: 'msg-1',
        direction: MessageDirection.Incoming,
        from: 'sip:alice@domain.com',
        to: 'sip:test@domain.com',
        content: 'Hello',
        contentType: MessageContentType.Text,
        status: MessageStatus.Delivered,
        timestamp: new Date(),
        isRead: false,
      })

      messages.value.push({
        id: 'msg-2',
        direction: MessageDirection.Outgoing,
        from: 'sip:test@domain.com',
        to: 'sip:alice@domain.com',
        content: 'Hello back',
        contentType: MessageContentType.Text,
        status: MessageStatus.Sent,
        timestamp: new Date(),
        isRead: true,
      })

      const filtered = getFilteredMessages({
        uri: 'sip:alice@domain.com',
        direction: MessageDirection.Incoming,
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('msg-1')
    })
  })

  describe('sendComposingIndicator', () => {
    it('should throw when SIP client is not initialized', async () => {
      const { sendComposingIndicator } = useMessaging(ref(null))

      await expect(sendComposingIndicator('sip:alice@domain.com', true)).rejects.toThrow(
        'SIP client not initialized'
      )
    })

    it('should send composing content to peer', async () => {
      const { sendComposingIndicator } = useMessaging(ref(mockSipClient))

      await sendComposingIndicator('sip:alice@domain.com', true)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:alice@domain.com',
        'composing',
        expect.objectContaining({
          contentType: MessageContentType.Text,
        })
      )
    })

    it('should send idle content when isComposing is false', async () => {
      const { sendComposingIndicator } = useMessaging(ref(mockSipClient))

      await sendComposingIndicator('sip:alice@domain.com', false)

      expect(mockSipClient.sendMessage).toHaveBeenCalledWith(
        'sip:alice@domain.com',
        'idle',
        expect.any(Object)
      )
    })

    it('should not throw on invalid URI', async () => {
      const { sendComposingIndicator } = useMessaging(ref(mockSipClient))

      await expect(sendComposingIndicator('invalid', true)).resolves.toBeUndefined()
    })
  })

  describe('onMessagingEvent', () => {
    it('should register listener and return unsubscribe function', () => {
      const { onMessagingEvent } = useMessaging(ref(mockSipClient))
      const handler = vi.fn()

      const unsubscribe = onMessagingEvent(handler)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should call listener on event', async () => {
      const { sendMessage, onMessagingEvent } = useMessaging(ref(mockSipClient))
      const handler = vi.fn()
      onMessagingEvent(handler)

      await sendMessage('sip:alice@domain.com', 'Hello')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sent',
          message: expect.objectContaining({ content: 'Hello' }),
        })
      )
    })

    it('should not call unsubscribed listener', async () => {
      const { sendMessage, onMessagingEvent } = useMessaging(ref(mockSipClient))
      const handler = vi.fn()
      const unsubscribe = onMessagingEvent(handler)
      unsubscribe()

      await sendMessage('sip:alice@domain.com', 'Hello')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('incoming message handling', () => {
    it('should add incoming message to messages array', () => {
      const { messages } = useMessaging(ref(mockSipClient))

      // Simulate incoming message via the SIP client handler
      const handler = mockSipClient._testHandlers.incomingMessage
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('sip:alice@domain.com', 'Hello from Alice', 'text/plain')

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].direction).toBe(MessageDirection.Incoming)
      expect(messages.value[0].content).toBe('Hello from Alice')
      expect(messages.value[0].from).toBe('sip:alice@domain.com')
    })

    it('should mark incoming messages as unread', () => {
      const { messages } = useMessaging(ref(mockSipClient))

      const handler = mockSipClient._testHandlers.incomingMessage
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('sip:alice@domain.com', 'Test', 'text/plain')

      expect(messages.value[0].isRead).toBe(false)
    })

    it('should emit received event', () => {
      const { onMessagingEvent } = useMessaging(ref(mockSipClient))
      const receivedEvents: MessagingEvent[] = []
      onMessagingEvent((e) => receivedEvents.push(e))

      const handler = mockSipClient._testHandlers.incomingMessage
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('sip:alice@domain.com', 'Test', 'text/plain')

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0].type).toBe('received')
    })

    it('should skip invalid sender URI for incoming message', () => {
      const { messages } = useMessaging(ref(mockSipClient))

      // URI without @ is invalid per our mock
      const handler = mockSipClient._testHandlers.incomingMessage
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('invalid-uri', 'Test', 'text/plain')

      expect(messages.value).toHaveLength(0)
    })
  })

  describe('composing indicator handling', () => {
    it('should update composing indicators map', () => {
      const { composingIndicators } = useMessaging(ref(mockSipClient))

      const handler = mockSipClient._testHandlers.composingIndicator
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('sip:alice@domain.com', true)

      expect(composingIndicators.value.get('sip:alice@domain.com')?.isComposing).toBe(true)
    })

    it('should auto-clear composing after idle timeout', () => {
      const { composingIndicators } = useMessaging(ref(mockSipClient))

      const handler = mockSipClient._testHandlers.composingIndicator
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('sip:alice@domain.com', true)

      expect(composingIndicators.value.get('sip:alice@domain.com')?.isComposing).toBe(true)

      // Advance time past the idle timeout (10 seconds from MESSAGING_CONSTANTS)
      vi.advanceTimersByTime(11000)

      expect(composingIndicators.value.get('sip:alice@domain.com')?.isComposing).toBe(false)
    })

    it('should skip invalid sender URI for composing indicator', () => {
      const { composingIndicators } = useMessaging(ref(mockSipClient))

      const handler = mockSipClient._testHandlers.composingIndicator
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler!('invalid', true)

      expect(composingIndicators.value.size).toBe(0)
    })
  })
})
