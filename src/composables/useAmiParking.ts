/**
 * AMI Parking Composable
 *
 * Vue composable for call parking management via AMI WebSocket proxy.
 * Provides parking lot monitoring, park/retrieve operations.
 *
 * @module composables/useAmiParking
 */

import { ref, computed, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiMessage, AmiEventData, AmiAction } from '@/types/ami.types'
import type {
  ParkedCall,
  ParkingLot,
  ParkingLotStatus,
  UseAmiParkingOptions,
  AmiParkedCallEvent,
  AmiParkedCallGiveUpEvent,
  AmiParkedCallTimeOutEvent,
  AmiUnParkedCallEvent,
  AmiParkinglotsEvent,
} from '@/types/parking.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiParking')

/**
 * Return type for useAmiParking composable
 */
export interface UseAmiParkingReturn {
  // State
  /** Map of parking lots by name */
  parkingLots: Ref<Map<string, ParkingLotStatus>>
  /** All parked calls across all lots */
  parkedCalls: ComputedRef<ParkedCall[]>
  /** Whether currently loading */
  isLoading: Ref<boolean>
  /** Error message if any */
  error: Ref<string | null>
  /** Total parked calls count */
  totalParkedCalls: ComputedRef<number>

  // Methods
  /** Get all parking lots configuration */
  getParkingLots: () => Promise<ParkingLot[]>
  /** Get parked calls in a lot */
  getParkedCalls: (parkingLot?: string) => Promise<ParkedCall[]>
  /** Park a call */
  parkCall: (channel: string, parkingLot?: string, timeout?: number) => Promise<number>
  /** Retrieve a parked call */
  retrieveCall: (parkingSpace: number, channel: string, parkingLot?: string) => Promise<void>
  /** Refresh parking lot status */
  refreshParkingLot: (parkingLot?: string) => Promise<void>
  /** Get parked call by space number */
  getParkedCallBySpace: (parkingSpace: number, parkingLot?: string) => ParkedCall | undefined
  /** Listen for parking events */
  onParkingEvent: (callback: (event: ParkingEvent) => void) => () => void
}

/**
 * Parking event types for listeners
 */
export type ParkingEventType = 'parked' | 'retrieved' | 'timeout' | 'giveup'

export interface ParkingEvent {
  type: ParkingEventType
  call: ParkedCall
  retrieverChannel?: string
}

/**
 * AMI Parking Composable
 *
 * Provides reactive call parking functionality for Vue components.
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const { parkedCalls, parkCall, retrieveCall, refreshParkingLot } = useAmiParking(
 *   computed(() => ami.getClient())
 * )
 *
 * // Park a call
 * const space = await parkCall('PJSIP/1001-00000001')
 * console.log(`Call parked at space ${space}`)
 *
 * // Retrieve a parked call
 * await retrieveCall(701, 'PJSIP/1002-00000002')
 *
 * // Watch parked calls
 * watch(parkedCalls, (calls) => {
 *   console.log(`${calls.length} calls currently parked`)
 * })
 * ```
 */
export function useAmiParking(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiParkingOptions = {}
): UseAmiParkingReturn {
  const {
    pollInterval = 0,
    useEvents = true,
    autoRefresh = true,
    defaultParkingLot = 'default',
    parkingLotFilter,
    parkedCallFilter,
    onCallParked,
    onCallRetrieved,
    onCallTimeout,
    onCallGiveUp,
    transformParkedCall,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const parkingLots = ref<Map<string, ParkingLotStatus>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const parkingEventListeners = ref<Array<(event: ParkingEvent) => void>>([])

  let pollTimer: number | null = null
  let eventUnsubscribe: (() => void) | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const parkedCalls = computed(() => {
    const calls: ParkedCall[] = []
    parkingLots.value.forEach((lot) => {
      calls.push(...lot.calls)
    })
    return calls
  })

  const totalParkedCalls = computed(() => parkedCalls.value.length)

  // ============================================================================
  // Internal Methods
  // ============================================================================

  const parseParkedCall = (data: AmiParkedCallEvent, serverId?: number): ParkedCall => {
    const timeout = parseInt(data.ParkingTimeout || '0', 10)
    const duration = parseInt(data.ParkingDuration || '0', 10)

    let call: ParkedCall = {
      parkingSpace: parseInt(data.ParkingSpace || '0', 10),
      parkingLot: data.ParkingLot || defaultParkingLot,
      channel: data.ParkeeChannel || '',
      uniqueId: data.ParkeeUniqueid || '',
      linkedId: data.ParkeeLinkedid || '',
      callerIdNum: data.ParkeeCallerIDNum || '',
      callerIdName: data.ParkeeCallerIDName || '',
      connectedLineNum: data.ParkeeConnectedLineNum || '',
      connectedLineName: data.ParkeeConnectedLineName || '',
      parkerChannel: data.ParkerChannel,
      parkerDialString: data.ParkerDialString,
      parkedTime: new Date(Date.now() - duration * 1000),
      timeout,
      timeRemaining: Math.max(0, timeout - duration),
      serverId,
    }

    if (transformParkedCall) {
      call = transformParkedCall(call)
    }

    return call
  }

  const updateParkingLot = (call: ParkedCall, action: 'add' | 'remove'): void => {
    const lotName = call.parkingLot
    let lot = parkingLots.value.get(lotName)

    if (!lot) {
      lot = {
        name: lotName,
        calls: [],
        occupied: 0,
        capacity: 100, // Default, will be updated from Parkinglots action
        lastUpdated: new Date(),
      }
      parkingLots.value.set(lotName, lot)
    }

    if (action === 'add') {
      // Remove existing call at same space if any
      lot.calls = lot.calls.filter((c) => c.parkingSpace !== call.parkingSpace)
      lot.calls.push(call)
    } else {
      lot.calls = lot.calls.filter((c) => c.parkingSpace !== call.parkingSpace)
    }

    lot.occupied = lot.calls.length
    lot.lastUpdated = new Date()
  }

  const notifyParkingEvent = (event: ParkingEvent): void => {
    // Call option callbacks
    switch (event.type) {
      case 'parked':
        if (onCallParked) onCallParked(event.call)
        break
      case 'retrieved':
        if (onCallRetrieved) onCallRetrieved(event.call, event.retrieverChannel || '')
        break
      case 'timeout':
        if (onCallTimeout) onCallTimeout(event.call)
        break
      case 'giveup':
        if (onCallGiveUp) onCallGiveUp(event.call)
        break
    }

    // Call registered listeners
    parkingEventListeners.value.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        logger.error('Error in parking event listener', err)
      }
    })
  }

  const handleParkingEvent = (event: AmiMessage<AmiEventData>): void => {
    switch (event.data.Event) {
      case 'ParkedCall': {
        const data = event.data as unknown as AmiParkedCallEvent
        const call = parseParkedCall(data, event.server_id)

        if (parkedCallFilter && !parkedCallFilter(call)) return

        updateParkingLot(call, 'add')
        notifyParkingEvent({ type: 'parked', call })
        break
      }

      case 'UnParkedCall': {
        const data = event.data as unknown as AmiUnParkedCallEvent
        const space = parseInt(data.ParkingSpace || '0', 10)
        const lotName = data.ParkingLot || defaultParkingLot
        const lot = parkingLots.value.get(lotName)
        const call = lot?.calls.find((c) => c.parkingSpace === space)

        if (call) {
          updateParkingLot(call, 'remove')
          notifyParkingEvent({
            type: 'retrieved',
            call,
            retrieverChannel: data.RetrieverChannel,
          })
        }
        break
      }

      case 'ParkedCallTimeOut': {
        const data = event.data as unknown as AmiParkedCallTimeOutEvent
        const space = parseInt(data.ParkingSpace || '0', 10)
        const lotName = data.ParkingLot || defaultParkingLot
        const lot = parkingLots.value.get(lotName)
        const call = lot?.calls.find((c) => c.parkingSpace === space)

        if (call) {
          updateParkingLot(call, 'remove')
          notifyParkingEvent({ type: 'timeout', call })
        }
        break
      }

      case 'ParkedCallGiveUp': {
        const data = event.data as unknown as AmiParkedCallGiveUpEvent
        const space = parseInt(data.ParkingSpace || '0', 10)
        const lotName = data.ParkingLot || defaultParkingLot
        const lot = parkingLots.value.get(lotName)
        const call = lot?.calls.find((c) => c.parkingSpace === space)

        if (call) {
          updateParkingLot(call, 'remove')
          notifyParkingEvent({ type: 'giveup', call })
        }
        break
      }
    }
  }

  const setupEventListeners = (): void => {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    if (eventUnsubscribe) {
      eventUnsubscribe()
    }

    const handler = (event: AmiMessage<AmiEventData>) => {
      handleParkingEvent(event)
    }

    client.on('event', handler)
    eventUnsubscribe = () => client.off('event', handler)
  }

  const startPolling = (): void => {
    if (pollInterval <= 0 || pollTimer) return

    pollTimer = window.setInterval(async () => {
      try {
        await refreshParkingLot()
      } catch (err) {
        logger.warn('Failed to poll parking status', err)
      }
    }, pollInterval)
  }

  const stopPolling = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Get all parking lots configuration
   */
  const getParkingLots = async (): Promise<ParkingLot[]> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    isLoading.value = true
    error.value = null

    const actionId = `vuesip-park-${Date.now()}`
    const lots: ParkingLot[] = []

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        client.off('event', handler)
        isLoading.value = false
        reject(new Error('Parkinglots timeout'))
      }, 10000)

      const handler = (event: AmiMessage<AmiEventData>) => {
        if (event.data.ActionID !== actionId) return

        if (event.data.Event === 'Parkinglot') {
          const data = event.data as unknown as AmiParkinglotsEvent
          const startSpace = parseInt(data.StartSpace || '0', 10)
          const endSpace = parseInt(data.StopSpace || '0', 10)

          const lot: ParkingLot = {
            name: data.Name,
            startSpace,
            endSpace,
            timeout: parseInt(data.Timeout || '45', 10),
            parkedCalls: 0,
            availableSpaces: endSpace - startSpace + 1,
            totalSpaces: endSpace - startSpace + 1,
            serverId: event.server_id,
          }

          if (!parkingLotFilter || parkingLotFilter(lot)) {
            lots.push(lot)
          }
        } else if (event.data.Event === 'ParkinglotsComplete') {
          clearTimeout(timeout)
          client.off('event', handler)
          isLoading.value = false
          resolve(lots)
        }
      }

      client.on('event', handler)

      client.sendAction({
        Action: 'Parkinglots',
        ActionID: actionId,
      }).catch((err) => {
        clearTimeout(timeout)
        client.off('event', handler)
        isLoading.value = false
        reject(err)
      })
    })
  }

  /**
   * Get parked calls in a lot
   */
  const getParkedCalls = async (parkingLot?: string): Promise<ParkedCall[]> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    isLoading.value = true
    error.value = null

    const actionId = `vuesip-parked-${Date.now()}`
    const calls: ParkedCall[] = []

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        client.off('event', handler)
        isLoading.value = false
        reject(new Error('ParkedCalls timeout'))
      }, 10000)

      const handler = (event: AmiMessage<AmiEventData>) => {
        if (event.data.ActionID !== actionId) return

        if (event.data.Event === 'ParkedCall') {
          const data = event.data as unknown as AmiParkedCallEvent

          // Filter by parking lot if specified
          if (parkingLot && data.ParkingLot !== parkingLot) return

          const call = parseParkedCall(data, event.server_id)

          if (!parkedCallFilter || parkedCallFilter(call)) {
            calls.push(call)
            updateParkingLot(call, 'add')
          }
        } else if (event.data.Event === 'ParkedCallsComplete') {
          clearTimeout(timeout)
          client.off('event', handler)
          isLoading.value = false
          resolve(calls)
        }
      }

      client.on('event', handler)

      const action: Record<string, string> = {
        Action: 'ParkedCalls',
        ActionID: actionId,
      }
      if (parkingLot) {
        action.ParkingLot = parkingLot
      }

      client.sendAction(action as AmiAction).catch((err) => {
        clearTimeout(timeout)
        client.off('event', handler)
        isLoading.value = false
        reject(err)
      })
    })
  }

  /**
   * Park a call
   */
  const parkCall = async (
    channel: string,
    parkingLot?: string,
    timeout?: number
  ): Promise<number> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    const action: AmiAction = {
      Action: 'Park',
      Channel: channel,
      ParkingLot: parkingLot || defaultParkingLot,
    }

    if (timeout !== undefined) {
      action.Timeout = timeout.toString()
    }

    const response = await client.sendAction(action)

    if (response.data.Response !== 'Success') {
      throw new Error(response.data.Message || 'Failed to park call')
    }

    // The parking space is returned in the response or via event
    const space = parseInt(response.data.ParkingSpace || '0', 10)
    return space
  }

  /**
   * Retrieve a parked call
   */
  const retrieveCall = async (
    parkingSpace: number,
    channel: string,
    parkingLot?: string
  ): Promise<void> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    // Use Originate to dial the parking space
    const lot = parkingLot || defaultParkingLot
    const response = await client.sendAction({
      Action: 'Originate',
      Channel: channel,
      Application: 'ParkedCall',
      Data: `${lot},${parkingSpace}`,
      Async: 'true',
    })

    if (response.data.Response !== 'Success') {
      throw new Error(response.data.Message || 'Failed to retrieve parked call')
    }
  }

  /**
   * Refresh parking lot status
   */
  const refreshParkingLot = async (parkingLot?: string): Promise<void> => {
    await getParkedCalls(parkingLot)
  }

  /**
   * Get parked call by space number
   */
  const getParkedCallBySpace = (
    parkingSpace: number,
    parkingLot?: string
  ): ParkedCall | undefined => {
    const lotName = parkingLot || defaultParkingLot
    const lot = parkingLots.value.get(lotName)
    return lot?.calls.find((c) => c.parkingSpace === parkingSpace)
  }

  /**
   * Listen for parking events
   */
  const onParkingEvent = (callback: (event: ParkingEvent) => void): (() => void) => {
    parkingEventListeners.value.push(callback)
    return () => {
      const index = parkingEventListeners.value.indexOf(callback)
      if (index !== -1) {
        parkingEventListeners.value.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  watch(
    amiClientRef,
    (client) => {
      if (client && client.isConnected) {
        setupEventListeners()
        if (pollInterval > 0) {
          startPolling()
        }
        if (autoRefresh) {
          refreshParkingLot().catch((err) => {
            logger.warn('Failed to refresh parking on connect', err)
          })
        }
      } else {
        stopPolling()
        if (eventUnsubscribe) {
          eventUnsubscribe()
          eventUnsubscribe = null
        }
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    stopPolling()
    if (eventUnsubscribe) {
      eventUnsubscribe()
    }
    parkingLots.value.clear()
    parkingEventListeners.value = []
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    parkingLots,
    parkedCalls,
    isLoading,
    error,
    totalParkedCalls,

    // Methods
    getParkingLots,
    getParkedCalls,
    parkCall,
    retrieveCall,
    refreshParkingLot,
    getParkedCallBySpace,
    onParkingEvent,
  }
}
