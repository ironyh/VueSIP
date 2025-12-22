/**
 * useAmiVoicemail composable unit tests
 *
 * Tests voicemail state management, MWI (Message Waiting Indicator) monitoring,
 * mailbox status queries, and real-time voicemail event handling.
 *
 * @module tests/unit/composables/useAmiVoicemail
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiVoicemail } from '@/composables/useAmiVoicemail'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  createAmiEvent,
  createAmiSuccessResponse,
  createAmiErrorResponse,
  type MockAmiClient,
} from '../utils/mockFactories'

// ============================================================================
// Test Fixtures - Centralized test data for consistency
// ============================================================================

const TEST_FIXTURES = {
  /** Mailbox identifiers */
  mailboxes: {
    standard: '1000',
    alternate: '1001',
    nonExistent: '9999',
    withContext: '1000@default',
    customContext: '1000@custom',
  },

  /** Voicemail contexts */
  contexts: {
    default: 'default',
    custom: 'custom',
  },

  /** MWI (Message Waiting Indicator) states */
  mwiStates: {
    noMessages: {
      Waiting: '0',
      NewMessages: '0',
      OldMessages: '0',
    },
    hasMessages: {
      Waiting: '1',
      NewMessages: '3',
      OldMessages: '5',
    },
    newOnly: {
      Waiting: '1',
      NewMessages: '2',
      OldMessages: '0',
    },
    oldOnly: {
      Waiting: '0',
      NewMessages: '0',
      OldMessages: '3',
    },
  },

  /** Voicemail user entries */
  users: {
    johnDoe: {
      VoiceMailbox: '1000',
      VMContext: 'default',
      NewMessageCount: '2',
      OldMessageCount: '5',
      UrgentMessageCount: '0',
      FullName: 'John Doe',
      Email: 'john@example.com',
    },
    testUser: {
      VoiceMailbox: '1000',
      VMContext: 'default',
      NewMessageCount: '0',
      OldMessageCount: '0',
      UrgentMessageCount: '0',
      FullName: 'Test User',
    },
  },

  /** Error messages */
  errors: {
    notConnected: 'Not connected to AMI',
    mailboxNotFound: 'Mailbox not found',
  },
} as const

// ============================================================================
// Factory Functions - Reduce duplication in test setup
// ============================================================================

/**
 * Factory: Create mock mailbox status response
 */
function createMailboxStatusResponse(
  waiting: string = '0',
  newMessages: string = '0',
  oldMessages: string = '0'
) {
  return createAmiSuccessResponse({
    Waiting: waiting,
    NewMessages: newMessages,
    OldMessages: oldMessages,
  })
}

/**
 * Factory: Create MessageWaiting event
 */
function createMessageWaitingEvent(
  mailbox: string,
  waiting: 'yes' | 'no' = 'yes',
  newCount: string = '1',
  oldCount: string = '0'
) {
  return createAmiEvent('MessageWaiting', {
    Mailbox: mailbox,
    Waiting: waiting,
    New: newCount,
    Old: oldCount,
  })
}

/**
 * Factory: Create VoicemailUserEntry event
 */
function createVoicemailUserEntry(actionId: string, userData: typeof TEST_FIXTURES.users.johnDoe) {
  return createAmiEvent('VoicemailUserEntry', {
    ActionID: actionId,
    ...userData,
  })
}

/**
 * Factory: Create VoicemailUserEntryComplete event
 */
function createVoicemailUserEntryComplete(actionId: string) {
  return createAmiEvent('VoicemailUserEntryComplete', {
    ActionID: actionId,
  })
}

/**
 * Helper: Setup mock client for getVoicemailUsers test
 * Configures sendAction to emit user entry events after a delay
 */
function setupVoicemailUsersResponse(
  mockClient: MockAmiClient,
  users: typeof TEST_FIXTURES.users.johnDoe[] = []
) {
  const actionId = `vuesip-vm-${Date.now()}`

  mockClient.sendAction = vi.fn().mockImplementation(() => {
    setTimeout(() => {
      // Emit user entry events
      users.forEach(user => {
        mockClient._triggerEvent('event', createVoicemailUserEntry(actionId, user))
      })
      // Emit complete event
      mockClient._triggerEvent('event', createVoicemailUserEntryComplete(actionId))
    }, 10)
    return Promise.resolve({ data: { Response: 'Success' } })
  })
}

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

  /**
   * Initial State Tests
   * Verify composable initializes with correct default state
   */
  describe('initial state', () => {
    describe.each([
      {
        property: 'mwiStates',
        expectedValue: 0,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.mwiStates.value.size,
        description: 'empty MWI states map',
      },
      {
        property: 'mailboxes',
        expectedValue: 0,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.mailboxes.value.size,
        description: 'empty mailboxes set',
      },
      {
        property: 'error',
        expectedValue: null,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.error.value,
        description: 'null error',
      },
      {
        property: 'isLoading',
        expectedValue: false,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.isLoading.value,
        description: 'not loading',
      },
      {
        property: 'totalNewMessages',
        expectedValue: 0,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.totalNewMessages.value,
        description: 'zero new messages',
      },
      {
        property: 'totalOldMessages',
        expectedValue: 0,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.totalOldMessages.value,
        description: 'zero old messages',
      },
      {
        property: 'hasWaitingMessages',
        expectedValue: false,
        getter: (api: ReturnType<typeof useAmiVoicemail>) => api.hasWaitingMessages.value,
        description: 'no waiting messages',
      },
    ])('$property', ({ property: _property, expectedValue, getter, description }) => {
      it(`should have ${description}`, () => {
        const api = useAmiVoicemail(clientRef)
        expect(getter(api)).toEqual(expectedValue)
      })
    })
  })

  /**
   * getMwiState Tests
   * Verify mailbox status querying and MWI state management
   */
  describe('getMwiState', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { getMwiState } = useAmiVoicemail(clientRef)

      await expect(getMwiState(TEST_FIXTURES.mailboxes.standard))
        .rejects.toThrow(TEST_FIXTURES.errors.notConnected)
    })

    describe.each([
      {
        description: 'mailbox with messages',
        mailbox: TEST_FIXTURES.mailboxes.standard,
        context: TEST_FIXTURES.contexts.default,
        mwiState: TEST_FIXTURES.mwiStates.hasMessages,
        expectedWaiting: true,
        expectedNew: 3,
        expectedOld: 5,
      },
      {
        description: 'mailbox with no messages',
        mailbox: TEST_FIXTURES.mailboxes.standard,
        context: TEST_FIXTURES.contexts.default,
        mwiState: TEST_FIXTURES.mwiStates.noMessages,
        expectedWaiting: false,
        expectedNew: 0,
        expectedOld: 0,
      },
      {
        description: 'mailbox with new messages only',
        mailbox: TEST_FIXTURES.mailboxes.alternate,
        context: TEST_FIXTURES.contexts.custom,
        mwiState: TEST_FIXTURES.mwiStates.newOnly,
        expectedWaiting: true,
        expectedNew: 2,
        expectedOld: 0,
      },
    ])('$description', ({ mailbox, context, mwiState, expectedWaiting, expectedNew, expectedOld }) => {
      it('should query and store mailbox status', async () => {
        mockClient.sendAction = vi.fn().mockResolvedValue(
          createMailboxStatusResponse(mwiState.Waiting, mwiState.NewMessages, mwiState.OldMessages)
        )

        const { getMwiState, mwiStates } = useAmiVoicemail(clientRef)
        const state = await getMwiState(mailbox, context)

        expect(mockClient.sendAction).toHaveBeenCalledWith({
          Action: 'MailboxStatus',
          Mailbox: `${mailbox}@${context}`,
        })

        expect(state.mailbox).toBe(`${mailbox}@${context}`)
        expect(state.waiting).toBe(expectedWaiting)
        expect(state.newMessages).toBe(expectedNew)
        expect(state.oldMessages).toBe(expectedOld)
        expect(mwiStates.value.get(`${mailbox}@${context}`)).toEqual(state)
      })
    })

    it('should use default context when not specified', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createMailboxStatusResponse()
      )

      const { getMwiState } = useAmiVoicemail(clientRef)
      await getMwiState(TEST_FIXTURES.mailboxes.standard)

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxStatus',
        Mailbox: TEST_FIXTURES.mailboxes.withContext,
      })
    })

    it('should handle failed response', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createAmiErrorResponse(TEST_FIXTURES.errors.mailboxNotFound)
      )

      const { getMwiState, error } = useAmiVoicemail(clientRef)

      await expect(getMwiState(TEST_FIXTURES.mailboxes.nonExistent))
        .rejects.toThrow(TEST_FIXTURES.errors.mailboxNotFound)
      expect(error.value).toBe(TEST_FIXTURES.errors.mailboxNotFound)
    })
  })

  /**
   * Mailbox Monitoring Tests
   * Verify mailbox monitoring setup, updates, and cleanup
   */
  describe('monitorMailbox / unmonitorMailbox', () => {
    it('should add mailbox to monitored set', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { monitorMailbox } = useAmiVoicemail(clientRef)
      monitorMailbox(TEST_FIXTURES.mailboxes.standard, TEST_FIXTURES.contexts.default)

      // Wait for async getMwiState call
      await vi.runAllTimersAsync()

      expect(mockClient.sendAction).toHaveBeenCalled()
    })

    it('should remove mailbox from monitored set and clear state', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createMailboxStatusResponse('1', '2', '0')
      )

      const { monitorMailbox, unmonitorMailbox, mwiStates } = useAmiVoicemail(clientRef)

      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      await vi.runAllTimersAsync()
      expect(mwiStates.value.has(TEST_FIXTURES.mailboxes.withContext)).toBe(true)

      unmonitorMailbox(TEST_FIXTURES.mailboxes.standard)
      expect(mwiStates.value.has(TEST_FIXTURES.mailboxes.withContext)).toBe(false)
    })

    it('should clear all monitoring', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { monitorMailbox, clearMonitoring, mwiStates, mailboxes } = useAmiVoicemail(clientRef)

      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      monitorMailbox(TEST_FIXTURES.mailboxes.alternate)
      await vi.runAllTimersAsync()

      clearMonitoring()
      expect(mwiStates.value.size).toBe(0)
      expect(mailboxes.value.size).toBe(0)
    })
  })

  /**
   * refreshMailbox Tests
   * Verify VoicemailRefresh action sends correctly
   */
  describe('refreshMailbox', () => {
    it('should send VoicemailRefresh action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { refreshMailbox } = useAmiVoicemail(clientRef)
      await refreshMailbox(
        TEST_FIXTURES.mailboxes.standard,
        TEST_FIXTURES.contexts.default
      )

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'VoicemailRefresh',
        Context: TEST_FIXTURES.contexts.default,
        Mailbox: TEST_FIXTURES.mailboxes.standard,
      })
    })

    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { refreshMailbox } = useAmiVoicemail(clientRef)

      await expect(refreshMailbox(TEST_FIXTURES.mailboxes.standard))
        .rejects.toThrow(TEST_FIXTURES.errors.notConnected)
    })
  })

  /**
   * MWI Event Handling Tests
   * Verify real-time MessageWaiting event processing and state updates
   */
  describe('MWI event handling', () => {
    it('should update MWI state on MessageWaiting event', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { monitorMailbox, mwiStates } = useAmiVoicemail(clientRef)

      // Monitor mailbox to start listening
      monitorMailbox(TEST_FIXTURES.mailboxes.standard, TEST_FIXTURES.contexts.default)
      await vi.runAllTimersAsync()

      // Simulate MWI event
      const event = createMessageWaitingEvent(
        TEST_FIXTURES.mailboxes.withContext,
        'yes',
        '5',
        '10'
      )

      mockClient._triggerEvent('event', event)
      await nextTick()

      const state = mwiStates.value.get(TEST_FIXTURES.mailboxes.withContext)
      expect(state?.waiting).toBe(true)
      expect(state?.newMessages).toBe(5)
      expect(state?.oldMessages).toBe(10)
    })

    it('should ignore events for non-monitored mailboxes', async () => {
      const { mwiStates } = useAmiVoicemail(clientRef)

      // Simulate MWI event for non-monitored mailbox
      const event = createMessageWaitingEvent(
        `${TEST_FIXTURES.mailboxes.nonExistent}@${TEST_FIXTURES.contexts.default}`,
        'yes',
        '1',
        '0'
      )

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(mwiStates.value.has(`${TEST_FIXTURES.mailboxes.nonExistent}@${TEST_FIXTURES.contexts.default}`)).toBe(false)
    })

    it('should call onNewMessage callback when new messages arrive', async () => {
      const onNewMessage = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { monitorMailbox } = useAmiVoicemail(clientRef, { onNewMessage })

      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      await vi.runAllTimersAsync()

      // Simulate MWI event with new messages
      const event = createMessageWaitingEvent(
        TEST_FIXTURES.mailboxes.withContext,
        'yes',
        '3',
        '0'
      )

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(onNewMessage).toHaveBeenCalledWith(TEST_FIXTURES.mailboxes.standard, 3)
    })
  })

  /**
   * onMwiChange Listener Tests
   * Verify MWI change listener registration and callback behavior
   */
  describe('onMwiChange listener', () => {
    it('should register and call listener on MWI change', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const listener = vi.fn()
      const { monitorMailbox, onMwiChange } = useAmiVoicemail(clientRef)

      const unsubscribe = onMwiChange(listener)
      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      await vi.runAllTimersAsync()

      // Simulate MWI event
      const event = createMessageWaitingEvent(
        TEST_FIXTURES.mailboxes.withContext,
        'yes',
        '2',
        '1'
      )

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

  /**
   * Computed Properties Tests
   * Verify reactive computed properties aggregate mailbox states correctly
   */
  describe('computed properties', () => {
    it('should calculate totalNewMessages across all mailboxes', async () => {
      mockClient.sendAction = vi.fn()
        .mockResolvedValueOnce(createMailboxStatusResponse('1', '3', '0'))
        .mockResolvedValueOnce(createMailboxStatusResponse('1', '5', '0'))

      const { monitorMailbox, totalNewMessages } = useAmiVoicemail(clientRef)

      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      monitorMailbox(TEST_FIXTURES.mailboxes.alternate)
      await vi.runAllTimersAsync()

      expect(totalNewMessages.value).toBe(8)
    })

    it('should calculate hasWaitingMessages correctly', async () => {
      mockClient.sendAction = vi.fn()
        .mockResolvedValueOnce(createMailboxStatusResponse('0', '0', '0'))
        .mockResolvedValueOnce(createMailboxStatusResponse('1', '1', '0'))

      const { monitorMailbox, hasWaitingMessages } = useAmiVoicemail(clientRef)

      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      await vi.runAllTimersAsync()
      expect(hasWaitingMessages.value).toBe(false)

      monitorMailbox(TEST_FIXTURES.mailboxes.alternate)
      await vi.runAllTimersAsync()
      expect(hasWaitingMessages.value).toBe(true)
    })
  })

  /**
   * Options Tests
   * Verify composable configuration options work correctly
   */
  describe('options', () => {
    it('should use custom defaultContext', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { getMwiState } = useAmiVoicemail(clientRef, {
        defaultContext: TEST_FIXTURES.contexts.custom
      })
      await getMwiState(TEST_FIXTURES.mailboxes.standard)

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'MailboxStatus',
        Mailbox: TEST_FIXTURES.mailboxes.customContext,
      })
    })

    it('should call onMwiChange callback from options', async () => {
      const onMwiChangeCallback = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createMailboxStatusResponse())

      const { monitorMailbox } = useAmiVoicemail(clientRef, {
        onMwiChange: onMwiChangeCallback,
      })

      monitorMailbox(TEST_FIXTURES.mailboxes.standard)
      await vi.runAllTimersAsync()

      // Simulate MWI event
      const event = createMessageWaitingEvent(
        TEST_FIXTURES.mailboxes.withContext,
        'yes',
        '1',
        '0'
      )

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(onMwiChangeCallback).toHaveBeenCalled()
    })
  })

  /**
   * getVoicemailUsers Tests
   * Verify voicemail user list retrieval and event collection
   */
  describe('getVoicemailUsers', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { getVoicemailUsers } = useAmiVoicemail(clientRef)

      await expect(getVoicemailUsers()).rejects.toThrow(TEST_FIXTURES.errors.notConnected)
    })

    it('should collect voicemail users from events', async () => {
      setupVoicemailUsersResponse(mockClient, [TEST_FIXTURES.users.johnDoe])

      const { getVoicemailUsers } = useAmiVoicemail(clientRef)

      const usersPromise = getVoicemailUsers()
      vi.advanceTimersByTime(100)
      const users = await usersPromise

      expect(users).toHaveLength(1)
      expect(users[0].mailbox).toBe(TEST_FIXTURES.users.johnDoe.VoiceMailbox)
      expect(users[0].fullName).toBe(TEST_FIXTURES.users.johnDoe.FullName)
    })
  })

  /**
   * getMailboxInfo Tests
   * Verify individual mailbox information retrieval from user list
   */
  describe('getMailboxInfo', () => {
    it('should find mailbox from voicemail users', async () => {
      setupVoicemailUsersResponse(mockClient, [TEST_FIXTURES.users.testUser])

      const { getMailboxInfo } = useAmiVoicemail(clientRef)

      const infoPromise = getMailboxInfo(TEST_FIXTURES.mailboxes.standard)
      vi.advanceTimersByTime(100)
      const info = await infoPromise

      expect(info?.mailbox).toBe(TEST_FIXTURES.users.testUser.VoiceMailbox)
      expect(info?.fullName).toBe(TEST_FIXTURES.users.testUser.FullName)
    })

    it('should return null for non-existent mailbox', async () => {
      setupVoicemailUsersResponse(mockClient, [])

      const { getMailboxInfo } = useAmiVoicemail(clientRef)

      const infoPromise = getMailboxInfo(TEST_FIXTURES.mailboxes.nonExistent)
      vi.advanceTimersByTime(100)
      const info = await infoPromise

      expect(info).toBeNull()
    })
  })
})
