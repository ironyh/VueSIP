/**
 * useAmiParking composable unit tests
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

  describe('initial state', () => {
    it('should have empty parking lots initially', () => {
      const { parkingLots } = useAmiParking(clientRef, { autoRefresh: false })
      expect(parkingLots.value.size).toBe(0)
    })

    it('should have empty parked calls initially', () => {
      const { parkedCalls } = useAmiParking(clientRef, { autoRefresh: false })
      expect(parkedCalls.value).toHaveLength(0)
    })

    it('should have no error initially', () => {
      const { error } = useAmiParking(clientRef, { autoRefresh: false })
      expect(error.value).toBeNull()
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiParking(clientRef, { autoRefresh: false })
      expect(isLoading.value).toBe(false)
    })

    it('should have zero total parked calls initially', () => {
      const { totalParkedCalls } = useAmiParking(clientRef, { autoRefresh: false })
      expect(totalParkedCalls.value).toBe(0)
    })
  })

  describe('getParkingLots', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { getParkingLots } = useAmiParking(clientRef, { autoRefresh: false })

      await expect(getParkingLots()).rejects.toThrow('Not connected to AMI')
    })

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

  describe('getParkedCalls', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { getParkedCalls } = useAmiParking(clientRef, { autoRefresh: false })

      await expect(getParkedCalls()).rejects.toThrow('Not connected to AMI')
    })

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

  describe('parkCall', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { parkCall } = useAmiParking(clientRef, { autoRefresh: false })

      await expect(parkCall('PJSIP/1001-00000001')).rejects.toThrow('Not connected to AMI')
    })

    it('should send Park action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Success',
          ParkingSpace: '701',
        },
      })

      const { parkCall } = useAmiParking(clientRef, { autoRefresh: false })
      const space = await parkCall('PJSIP/1001-00000001', 'default')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Park',
        Channel: 'PJSIP/1001-00000001',
        ParkingLot: 'default',
      })
      expect(space).toBe(701)
    })

    it('should use default parking lot when not specified', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: { Response: 'Success', ParkingSpace: '701' },
      })

      const { parkCall } = useAmiParking(clientRef, { autoRefresh: false })
      await parkCall('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Park',
        Channel: 'PJSIP/1001-00000001',
        ParkingLot: 'default',
      })
    })

    it('should include timeout when specified', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: { Response: 'Success', ParkingSpace: '701' },
      })

      const { parkCall } = useAmiParking(clientRef, { autoRefresh: false })
      await parkCall('PJSIP/1001-00000001', 'default', 60)

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Park',
        Channel: 'PJSIP/1001-00000001',
        ParkingLot: 'default',
        Timeout: '60',
      })
    })

    it('should handle failed response', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: {
          Response: 'Error',
          Message: 'Channel not found',
        },
      })

      const { parkCall } = useAmiParking(clientRef, { autoRefresh: false })

      await expect(parkCall('INVALID-CHANNEL')).rejects.toThrow('Channel not found')
    })
  })

  describe('retrieveCall', () => {
    it('should throw if not connected', async () => {
      clientRef.value = { ...mockClient, isConnected: false } as unknown as AmiClient
      const { retrieveCall } = useAmiParking(clientRef, { autoRefresh: false })

      await expect(retrieveCall(701, 'PJSIP/1002-00000001')).rejects.toThrow('Not connected to AMI')
    })

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

  describe('parking event handling', () => {
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

  describe('options', () => {
    it('should use custom defaultParkingLot', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        server_id: 1,
        data: { Response: 'Success', ParkingSpace: '801' },
      })

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

    it('should call onCallParked callback', async () => {
      const onCallParked = vi.fn()
      // Initialize composable for side effects (callback registration)
      useAmiParking(clientRef, {
        autoRefresh: false,
        onCallParked,
      })

      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      await nextTick()

      expect(onCallParked).toHaveBeenCalled()
      expect(onCallParked.mock.calls[0][0].parkingSpace).toBe(701)
    })

    it('should call onCallRetrieved callback', async () => {
      const onCallRetrieved = vi.fn()
      // Initialize composable for side effects (callback registration)
      useAmiParking(clientRef, {
        autoRefresh: false,
        onCallRetrieved,
      })

      // First park using helper
      mockClient._triggerEvent('event', createAmiEvent('ParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        ParkeeChannel: 'PJSIP/1001-00000001',
      }))
      await nextTick()

      // Then retrieve using helper
      mockClient._triggerEvent('event', createAmiEvent('UnParkedCall', {
        ParkingSpace: '701',
        ParkingLot: 'default',
        RetrieverChannel: 'PJSIP/1002-00000002',
      }))
      await nextTick()

      expect(onCallRetrieved).toHaveBeenCalled()
      expect(onCallRetrieved.mock.calls[0][1]).toBe('PJSIP/1002-00000002')
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

  describe('computed properties', () => {
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
