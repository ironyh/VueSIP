/**
 * Tests for useAmiCalls composable
 *
 * Call management composable providing:
 * - Active call tracking with real-time updates
 * - Click-to-call functionality (agent-first or destination-first)
 * - Call origination with flexible parameters
 * - Call control operations (hangup, transfer)
 * - Event-driven call state management
 * - Computed properties for call filtering
 *
 * @see src/composables/useAmiCalls.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiCalls } from '@/composables/useAmiCalls'
import { ChannelState } from '@/types/ami.types'
import type { AmiClient } from '@/core/AmiClient'
import type { ChannelInfo, AmiMessage, AmiNewChannelEvent, AmiHangupEvent, AmiNewStateEvent } from '@/types/ami.types'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  channels: {
    basic: {
      channel: 'SIP/1000-00000001',
      state: ChannelState.Up,
      channelState: ChannelState.Up,
      stateDesc: 'Up',
      channelStateDesc: 'Up',
      callerIdNum: '1000',
      callerIdName: 'Test User',
      connectedLineNum: '2000',
      connectedLineName: 'Other User',
      accountCode: '',
      context: 'from-internal',
      exten: '2000',
      priority: 1,
      uniqueId: '1234567890.1',
      linkedId: '1234567890.1',
      application: 'Dial',
      applicationData: 'SIP/2000',
      duration: '00:01:30',
      bridgeId: '',
      serverId: 1,
      createdAt: new Date(),
    } as ChannelInfo,
    ringing: {
      uniqueId: '1',
      channel: 'SIP/1000-00000001',
      linkedId: '1',
      callerIdNum: '1000',
      callerIdName: '',
      connectedLineNum: '',
      connectedLineName: '',
      state: ChannelState.Ringing,
      stateDesc: 'Ringing',
      startTime: new Date(),
      duration: 0,
      serverId: 1,
    },
    connected: {
      uniqueId: '2',
      channel: 'SIP/2000-00000001',
      linkedId: '2',
      callerIdNum: '2000',
      callerIdName: '',
      connectedLineNum: '',
      connectedLineName: '',
      state: ChannelState.Up,
      stateDesc: 'Up',
      startTime: new Date(),
      duration: 0,
      serverId: 1,
    },
    dialing: {
      uniqueId: '3',
      channel: 'SIP/3000-00000001',
      linkedId: '3',
      callerIdNum: '3000',
      callerIdName: '',
      connectedLineNum: '',
      connectedLineName: '',
      state: ChannelState.Dialing,
      stateDesc: 'Dialing',
      startTime: new Date(),
      duration: 0,
      serverId: 1,
    },
  },
  calls: {
    agent: 'SIP/1000',
    destination: '18005551234',
    context: 'from-internal',
    extension: '2000',
  },
  options: {
    agentFirst: { agentFirst: true },
    destinationFirst: { agentFirst: false },
    withCallbacks: {
      onCallStart: vi.fn(),
      onCallEnd: vi.fn(),
      onCallStateChange: vi.fn(),
    },
    withFilter: {
      channelFilter: (ch: any) => ch.channel.startsWith('SIP/'),
    },
    withStateLabels: {
      stateLabels: {
        [ChannelState.Up]: 'Connected',
      },
    },
  },
  events: {
    newChannel: {
      type: 1,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: {
        Event: 'Newchannel',
        Channel: 'SIP/1000-00000001',
        ChannelState: '6',
        ChannelStateDesc: 'Up',
        CallerIDNum: '1000',
        CallerIDName: 'Test User',
        ConnectedLineNum: '',
        ConnectedLineName: '',
        AccountCode: '',
        Context: 'from-internal',
        Exten: '2000',
        Priority: '1',
        Uniqueid: '123.456',
        Linkedid: '123.456',
      },
    } as AmiMessage<AmiNewChannelEvent>,
    hangup: {
      type: 1,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: {
        Event: 'Hangup',
        Channel: 'SIP/1000-00000001',
        Uniqueid: '123.456',
        Cause: '16',
        'Cause-txt': 'Normal Clearing',
      },
    } as AmiMessage<AmiHangupEvent>,
    newState: {
      type: 1,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: {
        Event: 'Newstate',
        Channel: 'SIP/1000-00000001',
        ChannelState: '6',
        ChannelStateDesc: 'Up',
        ConnectedLineNum: '2000',
        ConnectedLineName: 'Other User',
        Uniqueid: '123.456',
      },
    } as AmiMessage<AmiNewStateEvent>,
  },
} as const

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

/**
 * Factory function: Create mock AMI client with channel operations
 */
const createMockClient = (): AmiClient => {
  // Reset handlers
  Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

  return {
    getChannels: vi.fn().mockResolvedValue([]),
    originate: vi.fn().mockResolvedValue({ success: true, uniqueId: 'test-unique-id' }),
    hangupChannel: vi.fn().mockResolvedValue(undefined),
    redirectChannel: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
      }
    }),
  } as unknown as AmiClient
}

/**
 * Helper to trigger client events
 * Simulates AMI event emission for testing event handling
 */
function triggerClientEvent(event: string, ...args: unknown[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

/**
 * Factory function: Create channel info with sensible defaults
 */
function createMockChannel(overrides?: Partial<ChannelInfo>): ChannelInfo {
  return {
    ...TEST_FIXTURES.channels.basic,
    ...overrides,
  }
}

describe('useAmiCalls', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
    mockClient = createMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Initialization Tests
   * Verify composable starts with correct initial state
   */
  describe('Initialization', () => {
    describe.each([
      {
        description: 'with valid client',
        client: () => createMockClient(),
        expectedCalls: 0,
        expectedLoading: false,
        expectedError: null,
        expectedLastRefresh: null,
      },
      {
        description: 'with null client',
        client: null,
        expectedCalls: 0,
        expectedLoading: false,
        expectedError: null,
        expectedLastRefresh: null,
      },
    ])('$description', ({ client, expectedCalls, expectedLoading, expectedError, expectedLastRefresh }) => {
      it(`should initialize with ${expectedCalls} calls, loading=${expectedLoading}`, () => {
        const actualClient = typeof client === 'function' ? client() : client
        const { calls, callList, callCount, loading, error, lastRefresh } = useAmiCalls(actualClient)

        expect(calls.value.size).toBe(expectedCalls)
        expect(callList.value).toEqual([])
        expect(callCount.value).toBe(expectedCalls)
        expect(loading.value).toBe(expectedLoading)
        expect(error.value).toBe(expectedError)
        expect(lastRefresh.value).toBe(expectedLastRefresh)
      })
    })
  })

  /**
   * Data Fetching Tests
   * Verify channel refresh, loading states, and error handling
   *
   * Loading states:
   * - false initially
   * - true during fetch
   * - false after completion (success or error)
   */
  describe('Data Fetching', () => {
    it('should refresh channel list with loading state management', async () => {
      const mockChannels: ChannelInfo[] = [createMockChannel()]

      ;(mockClient.getChannels as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannels)

      const { refresh, calls, callList, loading, lastRefresh } = useAmiCalls(mockClient)

      expect(loading.value).toBe(false)

      const refreshPromise = refresh()

      expect(loading.value).toBe(true)

      await refreshPromise

      expect(loading.value).toBe(false)
      expect(calls.value.size).toBe(1)
      expect(callList.value[0].channel).toBe('SIP/1000-00000001')
      expect(callList.value[0].callerIdNum).toBe('1000')
      expect(callList.value[0].duration).toBe(90) // 1 min 30 sec
      expect(lastRefresh.value).toBeInstanceOf(Date)
    })

    /**
     * Error handling tests
     * Verify error state management when refresh fails
     */
    describe('error handling', () => {
      describe.each([
        {
          description: 'null client',
          setup: () => null,
          expectedError: 'AMI client not connected',
        },
        {
          description: 'network error',
          setup: () => {
            const client = createMockClient()
            ;(client.getChannels as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
            return client
          },
          expectedError: 'Network error',
        },
      ])('with $description', ({ setup, expectedError }) => {
        it(`should set error="${expectedError}"`, async () => {
          const client = setup()
          const { refresh, error, loading } = useAmiCalls(client)

          await refresh()

          expect(error.value).toBe(expectedError)
          expect(loading.value).toBe(false)
        })
      })
    })

    it('should apply channel filter', async () => {
      const mockChannels: ChannelInfo[] = [
        {
          channel: 'SIP/1000-00000001',
          state: ChannelState.Up,
          channelState: ChannelState.Up,
          stateDesc: 'Up',
          channelStateDesc: 'Up',
          callerIdNum: '1000',
          callerIdName: 'Test',
          connectedLineNum: '',
          connectedLineName: '',
          accountCode: '',
          context: 'from-internal',
          exten: '',
          priority: 1,
          uniqueId: '1',
          linkedId: '1',
          application: '',
          applicationData: '',
          duration: 0,
          bridgeId: '',
          serverId: 1,
          createdAt: new Date(),
        },
        {
          channel: 'Local/1000@context-00000001',
          state: ChannelState.Up,
          channelState: ChannelState.Up,
          stateDesc: 'Up',
          channelStateDesc: 'Up',
          callerIdNum: '',
          callerIdName: '',
          connectedLineNum: '',
          connectedLineName: '',
          accountCode: '',
          context: 'from-internal',
          exten: '',
          priority: 1,
          uniqueId: '2',
          linkedId: '2',
          application: '',
          applicationData: '',
          duration: 0,
          bridgeId: '',
          serverId: 1,
          createdAt: new Date(),
        },
      ]

      ;(mockClient.getChannels as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannels)

      const { refresh, calls } = useAmiCalls(mockClient, {
        channelFilter: (ch) => ch.channel.startsWith('SIP/'),
      })

      await refresh()

      expect(calls.value.size).toBe(1)
      expect(Array.from(calls.value.values())[0].channel).toBe('SIP/1000-00000001')
    })
  })

  /**
   * Click-to-Call Tests
   * Verify click-to-call functionality with different call flows
   *
   * Call flows:
   * - Agent-first: Call agent first, then connect to destination
   * - Destination-first: Call destination first, then connect to agent
   */
  describe('Click-to-Call Operations', () => {
    describe.each([
      {
        description: 'agent-first flow',
        options: TEST_FIXTURES.options.agentFirst,
        expectedChannel: TEST_FIXTURES.calls.agent,
        expectedApplication: 'Dial',
        expectedData: TEST_FIXTURES.calls.destination,
      },
      {
        description: 'destination-first flow',
        options: TEST_FIXTURES.options.destinationFirst,
        expectedChannel: TEST_FIXTURES.calls.destination,
        expectedExten: '1000',
        expectedContext: TEST_FIXTURES.calls.context,
      },
    ])('with $description', ({ options, expectedChannel, expectedApplication, expectedData, expectedExten, expectedContext }) => {
      it('should make click-to-call and return success', async () => {
        const { clickToCall } = useAmiCalls(mockClient, options)

        const result = await clickToCall(TEST_FIXTURES.calls.agent, TEST_FIXTURES.calls.destination)

        const expectedCall: any = {
          channel: expectedChannel,
          async: true,
        }
        if (expectedApplication) {
          expectedCall.application = expectedApplication
          expectedCall.data = expect.stringContaining(expectedData!)
        }
        if (expectedExten) {
          expectedCall.exten = expectedExten
          expectedCall.context = expectedContext
        }

        expect(mockClient.originate).toHaveBeenCalledWith(expect.objectContaining(expectedCall))
        expect(result.success).toBe(true)
      })
    })

    it('should pass caller ID options', async () => {
      const { clickToCall } = useAmiCalls(mockClient)

      await clickToCall(TEST_FIXTURES.calls.agent, TEST_FIXTURES.calls.destination, {
        callerId: 'Sales <1000>',
      })

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          callerId: 'Sales <1000>',
        })
      )
    })

    it('should throw when client is null', async () => {
      const { clickToCall } = useAmiCalls(null)

      await expect(clickToCall(TEST_FIXTURES.calls.agent, TEST_FIXTURES.calls.destination))
        .rejects.toThrow('AMI client not connected')
    })
  })

  describe('originate', () => {
    it('should originate a call', async () => {
      const { originate } = useAmiCalls(mockClient)

      const result = await originate({
        channel: 'SIP/1000',
        exten: '2000',
        context: 'from-internal',
        priority: 1,
      })

      expect(mockClient.originate).toHaveBeenCalledWith({
        channel: 'SIP/1000',
        exten: '2000',
        context: 'from-internal',
        priority: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should throw when client is null', async () => {
      const { originate } = useAmiCalls(null)

      await expect(originate({
        channel: 'SIP/1000',
        exten: '2000',
        context: 'from-internal',
        priority: 1,
      })).rejects.toThrow('AMI client not connected')
    })
  })

  describe('hangup', () => {
    it('should hangup by channel name', async () => {
      const { hangup } = useAmiCalls(mockClient)

      await hangup('SIP/1000-00000001')

      expect(mockClient.hangupChannel).toHaveBeenCalledWith('SIP/1000-00000001')
    })

    it('should hangup by unique ID', async () => {
      // First add a call to the map
      const { calls, hangup } = useAmiCalls(mockClient)

      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await hangup('123.456')

      expect(mockClient.hangupChannel).toHaveBeenCalledWith('SIP/1000-00000001')
      expect(calls.value.has('123.456')).toBe(false)
    })

    it('should call onCallEnd callback', async () => {
      const onCallEnd = vi.fn()
      const { calls, hangup } = useAmiCalls(mockClient, { onCallEnd })

      const call = {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      }
      calls.value.set('123.456', call)

      await hangup('123.456')

      expect(onCallEnd).toHaveBeenCalledWith(call)
    })

    it('should throw when client is null', async () => {
      const { hangup } = useAmiCalls(null)

      await expect(hangup('SIP/1000-00000001')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('transfer', () => {
    it('should transfer a call', async () => {
      const { calls, transfer } = useAmiCalls(mockClient)

      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await transfer('123.456', '2000')

      expect(mockClient.redirectChannel).toHaveBeenCalledWith(
        'SIP/1000-00000001',
        'from-internal',
        '2000',
        1
      )
    })

    it('should use custom context', async () => {
      const { transfer } = useAmiCalls(mockClient)

      await transfer('SIP/1000-00000001', '2000', 'custom-context')

      expect(mockClient.redirectChannel).toHaveBeenCalledWith(
        'SIP/1000-00000001',
        'custom-context',
        '2000',
        1
      )
    })

    it('should throw when client is null', async () => {
      const { transfer } = useAmiCalls(null)

      await expect(transfer('SIP/1000-00000001', '2000')).rejects.toThrow('AMI client not connected')
    })
  })

  /**
   * Computed Properties Tests
   * Verify reactive computed properties for call filtering
   *
   * Computed properties:
   * - ringingCalls: Filter calls by Ringing state
   * - connectedCalls: Filter calls by Up state
   * - dialingCalls: Filter calls by Dialing state
   * - totalDuration: Sum of all call durations
   */
  describe('Computed Properties', () => {
    describe.each([
      {
        description: 'ringing calls',
        calls: [TEST_FIXTURES.channels.ringing, TEST_FIXTURES.channels.connected],
        property: 'ringingCalls',
        expectedCount: 1,
        expectedId: '1',
      },
      {
        description: 'connected calls',
        calls: [TEST_FIXTURES.channels.connected, TEST_FIXTURES.channels.ringing],
        property: 'connectedCalls',
        expectedCount: 1,
        expectedId: '2',
      },
      {
        description: 'dialing calls',
        calls: [TEST_FIXTURES.channels.dialing, TEST_FIXTURES.channels.connected],
        property: 'dialingCalls',
        expectedCount: 1,
        expectedId: '3',
      },
    ])('$description', ({ calls: testCalls, property, expectedCount, expectedId }) => {
      it(`should filter ${expectedCount} call(s)`, async () => {
        const { calls, [property]: computedProp } = useAmiCalls(mockClient) as any

        testCalls.forEach((call: any) => {
          calls.value.set(call.uniqueId, call)
        })

        await nextTick()

        expect(computedProp.value.length).toBe(expectedCount)
        if (expectedId) {
          expect(computedProp.value[0].uniqueId).toBe(expectedId)
        }
      })
    })

    it('should compute total duration across all calls', async () => {
      const { calls, totalDuration } = useAmiCalls(mockClient)

      calls.value.set('1', { ...TEST_FIXTURES.channels.connected, uniqueId: '1', duration: 60 })
      calls.value.set('2', { ...TEST_FIXTURES.channels.connected, uniqueId: '2', duration: 120 })

      await nextTick()

      expect(totalDuration.value).toBe(180)
    })
  })

  /**
   * Event Management Tests
   * Verify real-time event handling for call state changes
   *
   * Event types:
   * - newChannel: New channel created (call initiated)
   * - hangup: Channel terminated (call ended)
   * - newState: Channel state changed (ringing → up, etc.)
   */
  describe('Event Management', () => {
    it('should handle new channel events and trigger callback', async () => {
      const onCallStart = vi.fn()
      const { calls } = useAmiCalls(mockClient, { onCallStart })

      triggerClientEvent('newChannel', TEST_FIXTURES.events.newChannel)
      await nextTick()

      expect(calls.value.size).toBe(1)
      expect(calls.value.get('123.456')?.channel).toBe('SIP/1000-00000001')
      expect(onCallStart).toHaveBeenCalled()
    })

    it('should handle hangup events', async () => {
      const onCallEnd = vi.fn()
      const { calls } = useAmiCalls(mockClient, { onCallEnd })

      // First add a call
      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      const event: AmiMessage<AmiHangupEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Hangup',
          Channel: 'SIP/1000-00000001',
          Uniqueid: '123.456',
          Cause: '16',
          'Cause-txt': 'Normal Clearing',
        },
      }

      triggerClientEvent('hangup', event)
      await nextTick()

      expect(calls.value.size).toBe(0)
      expect(onCallEnd).toHaveBeenCalled()
    })

    it('should handle state change events', async () => {
      const onCallStateChange = vi.fn()
      const { calls } = useAmiCalls(mockClient, { onCallStateChange })

      // First add a call in ringing state
      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Ringing,
        stateDesc: 'Ringing',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      const event: AmiMessage<AmiNewStateEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newstate',
          Channel: 'SIP/1000-00000001',
          ChannelState: '6',
          ChannelStateDesc: 'Up',
          ConnectedLineNum: '2000',
          ConnectedLineName: 'Other User',
          Uniqueid: '123.456',
        },
      }

      triggerClientEvent('newState', event)
      await nextTick()

      expect(calls.value.get('123.456')?.state).toBe(ChannelState.Up)
      expect(calls.value.get('123.456')?.connectedLineNum).toBe('2000')
      expect(onCallStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ uniqueId: '123.456' }),
        ChannelState.Ringing
      )
    })

    it('should apply channel filter to events', async () => {
      const { calls } = useAmiCalls(mockClient, {
        channelFilter: (ch) => ch.channel.startsWith('SIP/'),
      })

      const localChannelEvent: AmiMessage<AmiNewChannelEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newchannel',
          Channel: 'Local/1000@context-00000001',
          ChannelState: '6',
          ChannelStateDesc: 'Up',
          CallerIDNum: '',
          CallerIDName: '',
          ConnectedLineNum: '',
          ConnectedLineName: '',
          AccountCode: '',
          Context: 'from-internal',
          Exten: '',
          Priority: '1',
          Uniqueid: '789.012',
          Linkedid: '789.012',
        },
      }

      triggerClientEvent('newChannel', localChannelEvent)
      await nextTick()

      expect(calls.value.size).toBe(0)
    })
  })

  /**
   * State Label Tests
   * Verify state label formatting with default and custom labels
   *
   * State labels provide human-readable names for channel states
   */
  describe('State Labels', () => {
    describe.each([
      { state: ChannelState.Down, expectedLabel: 'Down' },
      { state: ChannelState.Ringing, expectedLabel: 'Ringing' },
      { state: ChannelState.Up, expectedLabel: 'Up' },
      { state: ChannelState.Busy, expectedLabel: 'Busy' },
    ])('default labels', ({ state, expectedLabel }) => {
      it(`should return "${expectedLabel}" for state ${state}`, () => {
        const { getStateLabel } = useAmiCalls(mockClient)
        expect(getStateLabel(state)).toBe(expectedLabel)
      })
    })

    it('should allow custom state labels', () => {
      const { getStateLabel } = useAmiCalls(mockClient, TEST_FIXTURES.options.withStateLabels)

      expect(getStateLabel(ChannelState.Up)).toBe('Connected')
    })
  })
})
