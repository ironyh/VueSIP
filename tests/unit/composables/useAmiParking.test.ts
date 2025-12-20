/**
 * useAmiParking composable unit tests
 *
 * Tests the parking lot management composable that provides:
 * - Parking lot information retrieval and tracking
 * - Parked call management and monitoring
 * - Park/retrieve call operations
 * - Real-time parking event handling
 * - Parking statistics and aggregation
 *
 * @see src/composables/useAmiParking.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiParking } from '@/composables/useAmiParking'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  createAmiEvent,
  type MockAmiClient,
} from '../utils/mockFactories'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  parkingLots: {
    default: {
      Name: 'default',
      StartSpace: '701',
      StopSpace: '720',
      Timeout: '45',
    },
    vip: {
      Name: 'vip',
      StartSpace: '801',
      StopSpace: '820',
      Timeout: '60',
    },
  },
  parkedCalls: {
    basic: {
      ParkingSpace: '701',
      ParkingLot: 'default',
      ParkeeChannel: 'PJSIP/1001-00000001',
      ParkeeUniqueid: '1234567890.1',
      ParkeeLinkedid: '1234567890.1',
      ParkeeCallerIDNum: '5551234',
      ParkeeCallerIDName: 'Test Caller',
      ParkingTimeout: '45',
      ParkingDuration: '10',
    },
    vip: {
      ParkingSpace: '801',
      ParkingLot: 'vip',
      ParkeeChannel: 'PJSIP/1002-00000002',
      ParkeeUniqueid: '1234567890.2',
      ParkeeLinkedid: '1234567890.2',
      ParkeeCallerIDNum: '5555678',
      ParkeeCallerIDName: 'VIP Caller',
      ParkingTimeout: '60',
      ParkingDuration: '5',
    },
  },
  responses: {
    success: {
      Response: 'Success',
      ParkingSpace: '701',
    },
    error: {
      Response: 'Error',
      Message: 'Channel not found',
    },
  },
  options: {
    autoRefreshDisabled: {
      autoRefresh: false,
    } as const,
  },
} as const

/**
 * Factory function: Create mock AMI action response
 */
function createMockActionResponse(data: any) {
  return {
    server_id: 1,
    data,
  }
}


/**
 * Factory function: Create parked call event data
 */
function createParkedCallEvent(overrides?: Partial<typeof TEST_FIXTURES.parkedCalls.basic>) {
  return {
    ...TEST_FIXTURES.parkedCalls.basic,
    ...overrides,
  }
}

describe('useAmiParking', () => {
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
   * Verify composable starts with correct initial state values
   */
  describe('Initial State', () => {
    describe.each([
      {
        property: 'parkingLots',
        description: 'empty parking lots',
        getValue: (result: any) => result.parkingLots.value.size,
        expected: 0,
      },
      {
        property: 'parkedCalls',
        description: 'empty parked calls',
        getValue: (result: any) => result.parkedCalls.value.length,
        expected: 0,
      },
      {
        property: 'error',
        description: 'no error',
        getValue: (result: any) => result.error.value,
        expected: null,
      },
      {
        property: 'isLoading',
        description: 'not loading',
        getValue: (result: any) => result.isLoading.value,
        expected: false,
      },
      {
        property: 'totalParkedCalls',
        description: 'zero total parked calls',
        getValue: (result: any) => result.totalParkedCalls.value,
        expected: 0,
      },
    ])('$property', ({ description, getValue, expected }) => {
      it(`should have ${description} initially`, () => {
        const result = useAmiParking(clientRef, TEST_FIXTURES.options.autoRefreshDisabled)
        expect(getValue(result)).toBe(expected)
      })
    })
  })

  /**
   * Disconnection Error Tests
   * Verify all methods throw when client is not connected
   */
  describe('Disconnection Error Handling', () => {
    describe.each([
      {
        method: 'getParkingLots',
        getMethod: (result: any) => result.getParkingLots,
        args: [],
      },
      {
        method: 'getParkedCalls',
        getMethod: (result: any) => result.getParkedCalls,
        args: [],
      },
      {
        method: 'parkCall',
        getMethod: (result: any) => result.parkCall,
        args: ['PJSIP/1001-00000001'],
      },
      {
        method: 'retrieveCall',
        getMethod: (result: any) => result.retrieveCall,
        args: [701, 'PJSIP/1002-00000001'],
      },
    ])('$method', ({ method: _method, getMethod, args }) => {
      it(`should throw "Not connected to AMI" when client is disconnected`, async () => {
        clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
        const result = useAmiParking(clientRef, TEST_FIXTURES.options.autoRefreshDisabled)

        const fn = getMethod(result)
        await expect(fn(...args)).rejects.toThrow('Not connected to AMI')
      })
    })
  })

  /**
   * getParkingLots Method Tests
   * Verify parking lot information retrieval and event collection
   */
  describe('getParkingLots', () => {
    it('should collect parking lots from events', async () => {
      mockClient.sendAction = vi.fn().mockImplementation((action) => {
        const actionId = action.ActionID
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('Parkinglot', {
              ActionID: actionId,
              Name: 'default',
              StartSpace: '701',
              StopSpace: '720',
              Timeout: '45',
            })
          )
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkinglotsComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { getParkingLots } = useAmiParking(clientRef, { autoRefresh: false })

      const lotsPromise = getParkingLots()
      vi.advanceTimersByTime(100)
      const lots = await lotsPromise

      expect(lots).toHaveLength(1)
      expect(lots[0].name).toBe('default')
      expect(lots[0].startSpace).toBe(701)
      expect(lots[0].endSpace).toBe(720)
      expect(lots[0].timeout).toBe(45)
      expect(lots[0].totalSpaces).toBe(20)
    })
  })

  /**
   * getParkedCalls Method Tests
   * Verify parked call information retrieval and filtering
   */
  describe('getParkedCalls', () => {
    it('should collect parked calls from events', async () => {
      mockClient.sendAction = vi.fn().mockImplementation((action) => {
        const actionId = action.ActionID
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkedCall', {
              ActionID: actionId,
              ParkingSpace: '701',
              ParkingLot: 'default',
              ParkeeChannel: 'PJSIP/1001-00000001',
              ParkeeUniqueid: '1234567890.1',
              ParkeeLinkedid: '1234567890.1',
              ParkeeCallerIDNum: '5551234',
              ParkeeCallerIDName: 'Test Caller',
              ParkingTimeout: '45',
              ParkingDuration: '10',
            })
          )
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkedCallsComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { getParkedCalls, parkedCalls } = useAmiParking(clientRef, { autoRefresh: false })

      const callsPromise = getParkedCalls()
      vi.advanceTimersByTime(100)
      const calls = await callsPromise

      expect(calls).toHaveLength(1)
      expect(calls[0].parkingSpace).toBe(701)
      expect(calls[0].parkingLot).toBe('default')
      expect(calls[0].callerIdNum).toBe('5551234')
      expect(calls[0].callerIdName).toBe('Test Caller')
      expect(parkedCalls.value).toHaveLength(1)
    })

    it('should filter by parking lot when specified', async () => {
      mockClient.sendAction = vi.fn().mockImplementation((action) => {
        const actionId = action.ActionID
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkedCall', {
              ActionID: actionId,
              ParkingSpace: '701',
              ParkingLot: 'default',
              ParkeeChannel: 'PJSIP/1001-00000001',
              ParkeeCallerIDNum: '5551234',
            })
          )
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkedCall', {
              ActionID: actionId,
              ParkingSpace: '801',
              ParkingLot: 'vip',
              ParkeeChannel: 'PJSIP/1002-00000002',
              ParkeeCallerIDNum: '5555678',
            })
          )
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkedCallsComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { getParkedCalls } = useAmiParking(clientRef, { autoRefresh: false })

      const callsPromise = getParkedCalls('vip')
      vi.advanceTimersByTime(100)
      const calls = await callsPromise

      expect(calls).toHaveLength(1)
      expect(calls[0].parkingLot).toBe('vip')
    })
  })

  /**
   * parkCall Method Tests
   * Verify call parking operations and parameter handling
   *
   * Tests parking lot selection, timeout handling, and error responses
   */
  describe('parkCall', () => {
    describe.each([
      {
        description: 'send Park action with specified lot',
        channel: 'PJSIP/1001-00000001',
        parkingLot: 'default',
        timeout: undefined,
        expectedAction: {
          Action: 'Park',
          Channel: 'PJSIP/1001-00000001',
          ParkingLot: 'default',
        },
        response: TEST_FIXTURES.responses.success,
        expectedSpace: 701,
      },
      {
        description: 'use default parking lot when not specified',
        channel: 'PJSIP/1001-00000001',
        parkingLot: undefined,
        timeout: undefined,
        expectedAction: {
          Action: 'Park',
          Channel: 'PJSIP/1001-00000001',
          ParkingLot: 'default',
        },
        response: TEST_FIXTURES.responses.success,
        expectedSpace: 701,
      },
      {
        description: 'include timeout when specified',
        channel: 'PJSIP/1001-00000001',
        parkingLot: 'default',
        timeout: 60,
        expectedAction: {
          Action: 'Park',
          Channel: 'PJSIP/1001-00000001',
          ParkingLot: 'default',
          Timeout: '60',
        },
        response: TEST_FIXTURES.responses.success,
        expectedSpace: 701,
      },
    ])('$description', ({ channel, parkingLot, timeout, expectedAction, response, expectedSpace }) => {
      it('should call sendAction with correct parameters', async () => {
        mockClient.sendAction = vi.fn().mockResolvedValue(createMockActionResponse(response))

        const { parkCall } = useAmiParking(clientRef, TEST_FIXTURES.options.autoRefreshDisabled)
        const args = [channel, parkingLot, timeout].filter(arg => arg !== undefined)
        const space = await parkCall(...args as any)

        expect(mockClient.sendAction).toHaveBeenCalledWith(expectedAction)
        expect(space).toBe(expectedSpace)
      })
    })

    it('should handle failed response', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createMockActionResponse(TEST_FIXTURES.responses.error)
      )

      const { parkCall } = useAmiParking(clientRef, TEST_FIXTURES.options.autoRefreshDisabled)

      await expect(parkCall('INVALID-CHANNEL')).rejects.toThrow('Channel not found')
    })
  })

  /**
   * retrieveCall Method Tests
   * Verify call retrieval operations from parking lots
   */
  describe('retrieveCall', () => {
    it('should send Originate action to retrieve call', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: { Response: 'Success' },
      })

      const { retrieveCall } = useAmiParking(clientRef, { autoRefresh: false })
      await retrieveCall(701, 'PJSIP/1002-00000001', 'default')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Originate',
        Channel: 'PJSIP/1002-00000001',
        Application: 'ParkedCall',
        Data: 'default,701',
        Async: 'true',
      })
    })

    it('should handle failed retrieval', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Error',
          Message: 'Parking space not found',
        },
      })

      const { retrieveCall } = useAmiParking(clientRef, { autoRefresh: false })

      await expect(retrieveCall(999, 'PJSIP/1002-00000001')).rejects.toThrow('Parking space not found')
    })
  })

  /**
   * Parking Event Handling Tests
   * Verify real-time parking event processing and state updates
   *
   * Events tested:
   * - ParkedCall: Call is parked in a lot
   * - UnParkedCall: Call is retrieved from parking
   * - ParkedCallTimeOut: Call parking times out
   * - ParkedCallGiveUp: Parker hangs up while parked
   */
  describe('Parking Event Handling', () => {
    it('should update state on ParkedCall event', async () => {
      const { parkedCalls, parkingLots } = useAmiParking(clientRef, { autoRefresh: false })

      // Simulate ParkedCall event using helper
      const event = createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
        ParkeeUniqueid: '1234567890.1',
        ParkeeCallerIDNum: '5551234',
        ParkeeCallerIDName: 'Test',
        ParkingTimeout: '45',
        ParkingDuration: '0',
      })

      mockClient._triggerEvent('event', event)
      await nextTick()

      expect(parkedCalls.value).toHaveLength(1)
      expect(parkedCalls.value[0].parkingSpace).toBe(701)
      expect(parkingLots.value.get('default')?.occupied).toBe(1)
    })

    it('should update state on UnParkedCall event', async () => {
      const { parkedCalls, parkingLots } = useAmiParking(clientRef, { autoRefresh: false })

      // First park a call using helper
      const parkEvent = createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
        ParkeeCallerIDNum: '5551234',
      })

      mockClient._triggerEvent('event', parkEvent)
      await nextTick()
      expect(parkedCalls.value).toHaveLength(1)

      // Then unpark using helper
      const unparkEvent = createAmiEvent('UnParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        RetrieverChannel: 'PJSIP/1002-00000002',
      })

      mockClient._triggerEvent('event', unparkEvent)
      await nextTick()

      expect(parkedCalls.value).toHaveLength(0)
      expect(parkingLots.value.get('default')?.occupied).toBe(0)
    })

    it('should update state on ParkedCallTimeOut event', async () => {
      const onCallTimeout = vi.fn()
      const { parkedCalls } = useAmiParking(clientRef, {
        autoRefresh: false,
        onCallTimeout,
      })

      // First park a call using helper
      const parkEvent = createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      })

      mockClient._triggerEvent('event', parkEvent)
      await nextTick()

      // Then timeout using helper
      const timeoutEvent = createAmiEvent('ParkedCallTimeOut', {
        ParkingSpace: '701',
        ParkingLot: 'default',
      })

      mockClient._triggerEvent('event', timeoutEvent)
      await nextTick()

      expect(parkedCalls.value).toHaveLength(0)
      expect(onCallTimeout).toHaveBeenCalled()
    })

    it('should update state on ParkedCallGiveUp event', async () => {
      const onCallGiveUp = vi.fn()
      const { parkedCalls } = useAmiParking(clientRef, {
        autoRefresh: false,
        onCallGiveUp,
      })

      // First park a call using helper
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      await nextTick()

      // Then give up using helper
      mockClient._triggerEvent('event', createAmiEvent('ParkedCallGiveUp', {
        ParkingSpace: '701',
        ParkingLot: 'default',
      }))
      await nextTick()

      expect(parkedCalls.value).toHaveLength(0)
      expect(onCallGiveUp).toHaveBeenCalled()
    })
  })

  describe('onParkingEvent listener', () => {
    it('should register and call listener on parking events', async () => {
      const listener = vi.fn()
      const { onParkingEvent } = useAmiParking(clientRef, { autoRefresh: false })

      const unsubscribe = onParkingEvent(listener)

      // Simulate ParkedCall event using helper
      mockClient._triggerEvent(
        'event',
        createAmiEvent('ParkedCall', {
          ParkingSpace: '701',
          ParkingLot: 'default',
          ParkeeChannel: 'PJSIP/1001-00000001',
          ParkeeCallerIDNum: '5551234',
        })
      )
      await nextTick()

      expect(listener).toHaveBeenCalled()
      expect(listener.mock.calls[0][0].type).toBe('parked')

      // Unsubscribe
      unsubscribe()
      mockClient._triggerEvent(
        'event',
        createAmiEvent('ParkedCall', {
          ParkingSpace: '702',
          ParkingLot: 'default',
          ParkeeChannel: 'PJSIP/1002-00000002',
        })
      )
      await nextTick()

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('getParkedCallBySpace', () => {
    it('should find parked call by space number', async () => {
      const { parkedCalls: _parkedCalls, getParkedCallBySpace, parkingLots: _parkingLots } = useAmiParking(clientRef, { autoRefresh: false })

      // Park a call using helper
      mockClient._triggerEvent(
        'event',
        createAmiEvent('ParkedCall', {
          ParkingSpace: '701',
          ParkingLot: 'default',
          ParkeeChannel: 'PJSIP/1001-00000001',
          ParkeeCallerIDNum: '5551234',
        })
      )
      await nextTick()

      const call = getParkedCallBySpace(701, 'default')
      expect(call?.callerIdNum).toBe('5551234')
    })

    it('should return undefined for non-existent space', () => {
      const { getParkedCallBySpace } = useAmiParking(clientRef, { autoRefresh: false })

      const call = getParkedCallBySpace(999, 'default')
      expect(call).toBeUndefined()
    })
  })

  /**
   * Configuration Options Tests
   * Verify composable configuration options work correctly
   *
   * Tests:
   * - Custom defaultParkingLot
   * - Event callbacks (onCallParked, onCallRetrieved, onCallTimeout, onCallGiveUp)
   * - Data transformation (transformParkedCall)
   * - Filtering (parkedCallFilter)
   */
  describe('Configuration Options', () => {
    it('should use custom defaultParkingLot', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        createMockActionResponse({ Response: 'Success', ParkingSpace: '801' })
      )

      const { parkCall } = useAmiParking(clientRef, {
        autoRefresh: false,
        defaultParkingLot: 'vip',
      })
      await parkCall('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Park',
        Channel: 'PJSIP/1001-00000001',
        ParkingLot: 'vip',
      })
    })

    describe('event callbacks', () => {
      describe.each([
        {
          callback: 'onCallParked',
          setupEvents: (trigger: Function) => {
            trigger('ParkedCall', createParkedCallEvent())
          },
          verify: (fn: any) => {
            expect(fn).toHaveBeenCalled()
            expect(fn.mock.calls[0][0].parkingSpace).toBe(701)
          },
        },
        {
          callback: 'onCallRetrieved',
          setupEvents: (trigger: Function) => {
            trigger('ParkedCall', createParkedCallEvent())
            trigger('UnParkedCall', {
              ParkingSpace: '701',
              ParkingLot: 'default',
              RetrieverChannel: 'PJSIP/1002-00000002',
            })
          },
          verify: (fn: any) => {
            expect(fn).toHaveBeenCalled()
            expect(fn.mock.calls[0][1]).toBe('PJSIP/1002-00000002')
          },
        },
      ])('$callback', ({ callback, setupEvents, verify }) => {
        it(`should call ${callback} callback`, async () => {
          const callbackFn = vi.fn()
          const options = {
            autoRefresh: false,
            [callback]: callbackFn,
          }

          useAmiParking(clientRef, options)

          setupEvents((eventType: string, eventData: any) => {
            mockClient._triggerEvent('event', createAmiEvent(eventType, eventData))
          })

          await nextTick()

          verify(callbackFn)
        })
      })
    })

    it('should apply transformParkedCall', async () => {
      const transformParkedCall = vi.fn((call) => ({
        ...call,
        customField: 'customValue',
      }))

      const { parkedCalls } = useAmiParking(clientRef, {
        autoRefresh: false,
        transformParkedCall,
      })

      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      await nextTick()

      expect(transformParkedCall).toHaveBeenCalled()
      expect((parkedCalls.value[0] as any).customField).toBe('customValue')
    })

    it('should apply parkedCallFilter', async () => {
      const parkedCallFilter = vi.fn((call) => call.parkingSpace !== 701)

      const { parkedCalls } = useAmiParking(clientRef, {
        autoRefresh: false,
        parkedCallFilter,
      })

      // This one should be filtered out
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      await nextTick()

      // This one should pass
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '702',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1002-00000002',
      }))
      await nextTick()

      expect(parkedCalls.value).toHaveLength(1)
      expect(parkedCalls.value[0].parkingSpace).toBe(702)
    })
  })

  /**
   * Computed Properties Tests
   * Verify reactive computed values aggregate state correctly
   */
  describe('Computed Properties', () => {
    it('should calculate totalParkedCalls across all lots', async () => {
      const { totalParkedCalls } = useAmiParking(clientRef, { autoRefresh: false })

      // Park calls in different lots using helpers
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '801',
        ParkingLot: 'vip',
        ParkeeChannel: 'PJSIP/1002-00000002',
      }))
      await nextTick()

      expect(totalParkedCalls.value).toBe(2)
    })

    it('should aggregate parkedCalls from all lots', async () => {
      const { parkedCalls } = useAmiParking(clientRef, { autoRefresh: false })

      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '801',
        ParkingLot: 'vip',
        ParkeeChannel: 'PJSIP/1002-00000002',
      }))
      await nextTick()

      expect(parkedCalls.value).toHaveLength(2)
      expect(parkedCalls.value.map(c => c.parkingLot)).toContain('default')
      expect(parkedCalls.value.map(c => c.parkingLot)).toContain('vip')
    })
  })

  /**
   * refreshParkingLot Method Tests
   * Verify manual parking lot status refresh
   */
  describe('refreshParkingLot', () => {
    it('should refresh parking lot status', async () => {
      mockClient.sendAction = vi.fn().mockImplementation((action) => {
        const actionId = action.ActionID
        setTimeout(() => {
          mockClient._triggerEvent(
            'event',
            createAmiEvent('ParkedCallsComplete', {
              ActionID: actionId,
            })
          )
        }, 10)
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { refreshParkingLot } = useAmiParking(clientRef, { autoRefresh: false })

      const refreshPromise = refreshParkingLot('default')
      vi.advanceTimersByTime(100)
      await refreshPromise

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'ParkedCalls',
          ParkingLot: 'default',
        })
      )
    })
  })
})
