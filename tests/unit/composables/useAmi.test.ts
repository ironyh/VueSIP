/**
 * Tests for useAmi composable
 *
 * AMI (Asterisk Manager Interface) composable providing:
 * - WebSocket connection management to AMI servers
 * - Presence state querying and updates
 * - Real-time event subscription (presence changes, connection events)
 * - Extension discovery and batch querying
 * - Error handling and connection state tracking
 *
 * @see src/composables/useAmi.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmi } from '@/composables/useAmi'
import { AmiConnectionState, AmiMessageType } from '@/types/ami.types'
import type { AmiConfig, AmiMessage, AmiEventData, AmiPresenceStateChangeEvent } from '@/types/ami.types'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  configs: {
    basic: {
      url: 'ws://localhost:8080',
      autoReconnect: true,
    } as AmiConfig,
    noReconnect: {
      url: 'ws://localhost:8080',
      autoReconnect: false,
    } as AmiConfig,
    customUrl: {
      url: 'ws://test-server:9090',
      autoReconnect: true,
    } as AmiConfig,
  },
  presenceStates: {
    available: {
      state: 'available',
      subtype: 'online',
      message: 'In office',
    },
    away: {
      state: 'away',
      subtype: undefined,
      message: 'In a meeting',
    },
    dnd: {
      state: 'dnd',
      subtype: undefined,
      message: undefined,
    },
    customState: {
      state: 'custom_state',
      subtype: undefined,
      message: undefined,
    },
  },
  extensions: {
    single: '1000',
    batch: ['1000', '1001', '1002'],
    batchWithFailure: ['1000', '9999', '1002'],
  },
  events: {
    standard: {
      type: AmiMessageType.Event,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: { Event: 'TestEvent' },
    } as AmiMessage<AmiEventData>,
    presenceChange: (extension: string, state: string, message?: string) => ({
      type: AmiMessageType.Event,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: {
        Event: 'PresenceStateChange',
        Presentity: `CustomPresence:${extension}`,
        State: state.toUpperCase(),
        Message: message,
      },
    }) as AmiMessage<AmiPresenceStateChangeEvent>,
  },
  defaultStates: ['available', 'away', 'dnd', 'busy'],
} as const

// Mock AmiClient
const mockAmiClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  getState: vi.fn().mockReturnValue(AmiConnectionState.Disconnected),
  isConnected: false,
  getPresenceState: vi.fn(),
  setPresenceState: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

vi.mock('@/core/AmiClient', () => ({
  createAmiClient: vi.fn(() => {
    // Reset handlers on new client creation
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

    return {
      ...mockAmiClient,
      on: vi.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) eventHandlers[event] = []
        eventHandlers[event].push(handler)
      }),
      off: vi.fn((event: string, handler: Function) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
        }
      }),
    }
  }),
  AmiClient: vi.fn(),
}))

/**
 * Helper: Trigger client events for test simulation
 *
 * Simulates AMI client events such as connection state changes,
 * presence updates, and error events.
 *
 * @param event - Event name to trigger
 * @param args - Event arguments
 */
function triggerClientEvent(event: string, ...args: any[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

/**
 * Factory function: Create mock AMI config with sensible defaults
 *
 * @param overrides - Optional config overrides
 * @returns AMI configuration object
 */

describe('useAmi', () => {
  let config: AmiConfig

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

    config = {
      url: 'ws://localhost:8080',
      autoReconnect: true,
    }

    // Reset mock implementations
    mockAmiClient.connect.mockResolvedValue(undefined)
    mockAmiClient.getPresenceState.mockResolvedValue({
      state: 'available',
      subtype: undefined,
      message: undefined,
    })
    mockAmiClient.setPresenceState.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Initial State Tests
   * Verify composable starts with correct initial state values
   */
  describe('Initial State', () => {
    describe.each([
      {
        description: 'connection state',
        getter: (api: ReturnType<typeof useAmi>) => api.connectionState.value,
        expected: AmiConnectionState.Disconnected,
      },
      {
        description: 'isConnected flag',
        getter: (api: ReturnType<typeof useAmi>) => api.isConnected.value,
        expected: false,
      },
      {
        description: 'error state',
        getter: (api: ReturnType<typeof useAmi>) => api.error.value,
        expected: null,
      },
      {
        description: 'presence states size',
        getter: (api: ReturnType<typeof useAmi>) => api.presenceStates.value.size,
        expected: 0,
      },
    ])('$description', ({ getter, expected }) => {
      it(`should initialize with ${expected}`, () => {
        const api = useAmi()
        expect(getter(api)).toBe(expected)
      })
    })

    it('should have default discovered states', () => {
      const { discoveredStates } = useAmi()

      TEST_FIXTURES.defaultStates.forEach(state => {
        expect(discoveredStates.value.has(state)).toBe(true)
      })
    })
  })

  /**
   * Connection Management Tests
   * Verify WebSocket connection lifecycle and state transitions
   *
   * Connection states:
   * - Disconnected → Connecting → Connected (success path)
   * - Disconnected → Connecting → Failed (error path)
   */
  describe('Connection Management', () => {
    it('should connect to AMI successfully', async () => {
      const { connect, connectionState } = useAmi()

      const connectPromise = connect(config)

      // Simulate connection success
      triggerClientEvent('connected')

      await connectPromise
      await nextTick()

      expect(connectionState.value).toBe(AmiConnectionState.Connected)
    })

    it('should set state to Connecting during connection', async () => {
      const { connect, connectionState } = useAmi()

      // Don't await - check intermediate state
      const connectPromise = connect(config)

      expect(connectionState.value).toBe(AmiConnectionState.Connecting)

      // Clean up
      triggerClientEvent('connected')
      await connectPromise
    })

    it('should handle connection errors', async () => {
      const { connect, connectionState, error } = useAmi()

      mockAmiClient.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(connect(config)).rejects.toThrow('Connection failed')

      expect(connectionState.value).toBe(AmiConnectionState.Failed)
      expect(error.value).toBe('Connection failed')
    })

    it('should disconnect existing client before reconnecting', async () => {
      const { connect } = useAmi()

      // First connection
      const connectPromise1 = connect(config)
      triggerClientEvent('connected')
      await connectPromise1

      // Second connection should disconnect first
      const connectPromise2 = connect(config)
      triggerClientEvent('connected')
      await connectPromise2

      expect(mockAmiClient.disconnect).toHaveBeenCalled()
    })
  })

  /**
   * Disconnection Tests
   * Verify proper cleanup when disconnecting from AMI
   */
  describe('Disconnection', () => {
    /**
     * Helper: Establish connection for disconnect tests
     */
    async function setupConnection() {
      const api = useAmi()
      const connectPromise = api.connect(config)
      triggerClientEvent('connected')
      await connectPromise
      return api
    }

    it('should disconnect from AMI', async () => {
      const { disconnect, connectionState } = await setupConnection()

      disconnect()

      expect(connectionState.value).toBe(AmiConnectionState.Disconnected)
    })

    it('should clear presence states on disconnect', async () => {
      const { disconnect, presenceStates, getPresenceState } = await setupConnection()

      // Add a presence state
      await getPresenceState(TEST_FIXTURES.extensions.single)
      expect(presenceStates.value.size).toBe(1)

      disconnect()

      expect(presenceStates.value.size).toBe(0)
    })
  })

  /**
   * Presence State Querying Tests
   * Verify extension presence state retrieval and caching
   *
   * Query flow:
   * 1. Check connection status (throw if not connected)
   * 2. Query AMI server for extension state
   * 3. Update local cache (presenceStates Map)
   * 4. Discover new states (add to discoveredStates Set)
   */
  describe('Presence State Querying', () => {
    /**
     * Helper: Setup connected AMI client for presence tests
     */
    async function setupConnectedClient() {
      const api = useAmi()
      const connectPromise = api.connect(config)
      triggerClientEvent('connected')
      await connectPromise
      return api
    }

    describe.each([
      {
        description: 'available state with metadata',
        mockResponse: TEST_FIXTURES.presenceStates.available,
        extension: TEST_FIXTURES.extensions.single,
        expectedState: 'available',
        expectedSubtype: 'online',
        expectedMessage: 'In office',
      },
      {
        description: 'away state with message',
        mockResponse: TEST_FIXTURES.presenceStates.away,
        extension: TEST_FIXTURES.extensions.single,
        expectedState: 'away',
        expectedSubtype: undefined,
        expectedMessage: 'In a meeting',
      },
      {
        description: 'dnd state without metadata',
        mockResponse: TEST_FIXTURES.presenceStates.dnd,
        extension: TEST_FIXTURES.extensions.single,
        expectedState: 'dnd',
        expectedSubtype: undefined,
        expectedMessage: undefined,
      },
    ])('query $description', ({ mockResponse, extension, expectedState, expectedSubtype, expectedMessage }) => {
      it(`should retrieve and cache ${expectedState} state`, async () => {
        const { getPresenceState, presenceStates } = await setupConnectedClient()

        mockAmiClient.getPresenceState.mockResolvedValue(mockResponse)

        const state = await getPresenceState(extension)

        expect(state.extension).toBe(extension)
        expect(state.state).toBe(expectedState)
        expect(state.subtype).toBe(expectedSubtype)
        expect(state.message).toBe(expectedMessage)
        expect(presenceStates.value.get(extension)).toEqual(state)
      })
    })

    it('should throw if not connected', async () => {
      const { getPresenceState } = useAmi()

      await expect(getPresenceState(TEST_FIXTURES.extensions.single))
        .rejects.toThrow('Not connected to AMI')
    })

    it('should discover new states', async () => {
      const { getPresenceState, discoveredStates } = await setupConnectedClient()

      mockAmiClient.getPresenceState.mockResolvedValue(TEST_FIXTURES.presenceStates.customState)

      await getPresenceState(TEST_FIXTURES.extensions.single)

      expect(discoveredStates.value.has('custom_state')).toBe(true)
    })
  })

  /**
   * Presence State Setting Tests
   * Verify extension presence state updates
   */
  describe('Presence State Setting', () => {
    /**
     * Helper: Setup connected client (reuse from querying tests)
     */
    async function setupConnectedClient() {
      const api = useAmi()
      const connectPromise = api.connect(config)
      triggerClientEvent('connected')
      await connectPromise
      return api
    }

    it('should set presence state with message', async () => {
      const { setPresenceState, presenceStates } = await setupConnectedClient()

      await setPresenceState(
        TEST_FIXTURES.extensions.single,
        TEST_FIXTURES.presenceStates.away.state,
        TEST_FIXTURES.presenceStates.away.message
      )

      expect(mockAmiClient.setPresenceState).toHaveBeenCalledWith(
        TEST_FIXTURES.extensions.single,
        TEST_FIXTURES.presenceStates.away.state,
        { message: TEST_FIXTURES.presenceStates.away.message }
      )

      // Should update local cache
      const cached = presenceStates.value.get(TEST_FIXTURES.extensions.single)
      expect(cached?.state).toBe(TEST_FIXTURES.presenceStates.away.state)
      expect(cached?.message).toBe(TEST_FIXTURES.presenceStates.away.message)
    })

    it('should throw if not connected', async () => {
      const { setPresenceState } = useAmi()

      await expect(setPresenceState(TEST_FIXTURES.extensions.single, 'away'))
        .rejects.toThrow('Not connected to AMI')
    })
  })

  /**
   * Batch Extension Querying Tests
   * Verify bulk querying of multiple extensions
   *
   * Batch query behavior:
   * - Queries all extensions in parallel
   * - Returns Map of successful queries only
   * - Silently skips failed queries (extension not found, etc.)
   */
  describe('Batch Extension Querying', () => {
    /**
     * Helper: Setup connected client for batch tests
     */
    async function setupConnectedClient() {
      const api = useAmi()
      const connectPromise = api.connect(config)
      triggerClientEvent('connected')
      await connectPromise
      return api
    }

    it('should query multiple extensions successfully', async () => {
      const { queryExtensions } = await setupConnectedClient()

      mockAmiClient.getPresenceState
        .mockResolvedValueOnce(TEST_FIXTURES.presenceStates.available)
        .mockResolvedValueOnce(TEST_FIXTURES.presenceStates.away)
        .mockResolvedValueOnce(TEST_FIXTURES.presenceStates.dnd)

      const results = await queryExtensions(TEST_FIXTURES.extensions.batch)

      expect(results.size).toBe(3)
      expect(results.get('1000')?.state).toBe('available')
      expect(results.get('1001')?.state).toBe('away')
      expect(results.get('1002')?.state).toBe('dnd')
    })

    it('should handle partial failures gracefully', async () => {
      const { queryExtensions } = await setupConnectedClient()

      mockAmiClient.getPresenceState
        .mockResolvedValueOnce(TEST_FIXTURES.presenceStates.available)
        .mockRejectedValueOnce(new Error('Extension not found'))
        .mockResolvedValueOnce(TEST_FIXTURES.presenceStates.dnd)

      const results = await queryExtensions(TEST_FIXTURES.extensions.batchWithFailure)

      // Should have 2 successful results
      expect(results.size).toBe(2)
      expect(results.get('1000')?.state).toBe('available')
      expect(results.get('1002')?.state).toBe('dnd')
      expect(results.has('9999')).toBe(false)
    })
  })

  /**
   * Event Subscription Tests
   * Verify real-time event handling and state updates
   *
   * Event types:
   * - Generic AMI events (onEvent)
   * - Presence state changes (onPresenceChange)
   * - Connection state changes (handled internally)
   */
  describe('Event Subscription', () => {
    /**
     * Helper: Setup connected client for event tests
     */
    async function setupConnectedClient() {
      const api = useAmi()
      const connectPromise = api.connect(config)
      triggerClientEvent('connected')
      await connectPromise
      return api
    }

    describe('generic events', () => {
      it('should allow registering event listeners', async () => {
        const { onEvent } = await setupConnectedClient()

        const handler = vi.fn()
        const unsubscribe = onEvent(handler)

        // Simulate an event
        triggerClientEvent('event', TEST_FIXTURES.events.standard)

        expect(handler).toHaveBeenCalledWith(TEST_FIXTURES.events.standard)

        // Unsubscribe should work
        unsubscribe()
      })
    })

    describe('presence change events', () => {
      it('should handle presence change events', async () => {
        const { onPresenceChange, presenceStates } = await setupConnectedClient()

        const handler = vi.fn()
        onPresenceChange(handler)

        // Simulate a presence change event
        const event = TEST_FIXTURES.events.presenceChange(
          TEST_FIXTURES.extensions.single,
          'away',
          'In a meeting'
        )
        triggerClientEvent('presenceChange', event)

        expect(handler).toHaveBeenCalled()
        const [ext, state] = handler.mock.calls[0]
        expect(ext).toBe(TEST_FIXTURES.extensions.single)
        expect(state.state).toBe('away')

        // Should also update presence states
        expect(presenceStates.value.get(TEST_FIXTURES.extensions.single)?.state).toBe('away')
      })

      it('should discover new states from events', async () => {
        const { onPresenceChange, discoveredStates } = await setupConnectedClient()

        onPresenceChange(() => {})

        const event = TEST_FIXTURES.events.presenceChange(
          TEST_FIXTURES.extensions.single,
          'CUSTOM_NEW_STATE'
        )
        triggerClientEvent('presenceChange', event)

        expect(discoveredStates.value.has('custom_new_state')).toBe(true)
      })
    })
  })

  /**
   * Client Access Tests
   * Verify access to underlying AMI client instance
   */
  describe('Client Access', () => {
    describe.each([
      {
        description: 'when not connected',
        setupFn: () => useAmi(),
        expectedResult: null,
      },
      {
        description: 'after connection',
        setupFn: async () => {
          const api = useAmi()
          const connectPromise = api.connect(config)
          triggerClientEvent('connected')
          await connectPromise
          return api
        },
        expectedResult: 'non-null',
      },
    ])('$description', ({ setupFn, expectedResult }) => {
      it(`should return ${expectedResult} client`, async () => {
        const { getClient } = await setupFn()
        const client = getClient()

        if (expectedResult === null) {
          expect(client).toBeNull()
        } else {
          expect(client).not.toBeNull()
        }
      })
    })
  })

  /**
   * Connection State Event Tests
   * Verify automatic state updates from AMI client events
   *
   * Automatic state tracking:
   * - 'connected' → Connected state
   * - 'disconnected' → Disconnected state
   * - 'error' → Update error message
   */
  describe('Connection State Events', () => {
    /**
     * Helper: Setup connected client for state event tests
     */
    async function setupConnectedClient() {
      const api = useAmi()
      const connectPromise = api.connect(config)
      triggerClientEvent('connected')
      await connectPromise
      return api
    }

    describe.each([
      {
        description: 'disconnected event',
        event: 'disconnected',
        eventArgs: ['Connection lost'],
        expectedState: AmiConnectionState.Disconnected,
        verifyFn: (api: ReturnType<typeof useAmi>) => {
          expect(api.connectionState.value).toBe(AmiConnectionState.Disconnected)
        },
      },
      {
        description: 'error event',
        event: 'error',
        eventArgs: [new Error('Network error')],
        expectedState: null,
        verifyFn: (api: ReturnType<typeof useAmi>) => {
          expect(api.error.value).toBe('Network error')
        },
      },
    ])('handle $description', ({ event, eventArgs, verifyFn }) => {
      it(`should update state on ${event}`, async () => {
        const api = await setupConnectedClient()

        // Verify initially connected
        expect(api.connectionState.value).toBe(AmiConnectionState.Connected)

        // Trigger event
        triggerClientEvent(event, ...eventArgs)

        // Verify state change
        verifyFn(api)
      })
    })
  })
})
