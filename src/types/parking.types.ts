/**
 * Call Parking Types for AMI Integration
 * @packageDocumentation
 */

import type { AmiEventData } from './ami.types'

/**
 * Parked call status
 */
export type ParkedCallStatus = 'parked' | 'retrieved' | 'timeout' | 'giveup'

/**
 * Parked call information
 */
export interface ParkedCall {
  /** Parking space number */
  parkingSpace: number
  /** Parking lot name */
  parkingLot: string
  /** Parked channel */
  channel: string
  /** Unique ID */
  uniqueId: string
  /** Linked ID */
  linkedId: string
  /** Caller ID number */
  callerIdNum: string
  /** Caller ID name */
  callerIdName: string
  /** Connected line number */
  connectedLineNum: string
  /** Connected line name */
  connectedLineName: string
  /** Parker channel (who parked the call) */
  parkerChannel?: string
  /** Parker dial string */
  parkerDialString?: string
  /** Time the call was parked */
  parkedTime: Date
  /** Timeout in seconds */
  timeout: number
  /** Time remaining until timeout (seconds) */
  timeRemaining: number
  /** Server ID for multi-server setups */
  serverId?: number
}

/**
 * Parking lot configuration
 */
export interface ParkingLot {
  /** Lot name */
  name: string
  /** Starting space number */
  startSpace: number
  /** Ending space number */
  endSpace: number
  /** Default timeout in seconds */
  timeout: number
  /** Number of parked calls */
  parkedCalls: number
  /** Available spaces */
  availableSpaces: number
  /** Total spaces */
  totalSpaces: number
  /** Server ID */
  serverId?: number
}

/**
 * Parking lot status (summary)
 */
export interface ParkingLotStatus {
  /** Lot name */
  name: string
  /** List of parked calls */
  calls: ParkedCall[]
  /** Number of occupied spaces */
  occupied: number
  /** Total capacity */
  capacity: number
  /** Last updated */
  lastUpdated: Date
  /** Server ID */
  serverId?: number
}

/**
 * AMI ParkedCall event
 */
export interface AmiParkedCallEvent extends AmiEventData {
  Event: 'ParkedCall'
  /** Parking lot name */
  ParkingLot: string
  /** Parking space */
  ParkingSpace: string
  /** Timeout in seconds */
  ParkingTimeout: string
  /** Parked duration */
  ParkingDuration: string
  /** Parked channel */
  ParkeeChannel: string
  /** Parked channel state */
  ParkeeChannelState: string
  /** Parked channel state description */
  ParkeeChannelStateDesc: string
  /** Parked caller ID number */
  ParkeeCallerIDNum: string
  /** Parked caller ID name */
  ParkeeCallerIDName: string
  /** Parked connected line number */
  ParkeeConnectedLineNum: string
  /** Parked connected line name */
  ParkeeConnectedLineName: string
  /** Parked account code */
  ParkeeAccountCode?: string
  /** Parked context */
  ParkeeContext: string
  /** Parked exten */
  ParkeeExten: string
  /** Parked priority */
  ParkeePriority: string
  /** Parked unique ID */
  ParkeeUniqueid: string
  /** Parked linked ID */
  ParkeeLinkedid: string
  /** Parker channel */
  ParkerChannel?: string
  /** Parker dial string */
  ParkerDialString?: string
}

/**
 * AMI ParkedCallGiveUp event (caller hung up while parked)
 */
export interface AmiParkedCallGiveUpEvent extends AmiEventData {
  Event: 'ParkedCallGiveUp'
  /** Parking lot name */
  ParkingLot: string
  /** Parking space */
  ParkingSpace: string
  /** Parked channel */
  ParkeeChannel: string
  /** Parked unique ID */
  ParkeeUniqueid: string
  /** Parked linked ID */
  ParkeeLinkedid: string
  /** Parked caller ID number */
  ParkeeCallerIDNum: string
  /** Parked caller ID name */
  ParkeeCallerIDName: string
  /** Parker channel */
  ParkerChannel?: string
}

/**
 * AMI ParkedCallTimeOut event
 */
export interface AmiParkedCallTimeOutEvent extends AmiEventData {
  Event: 'ParkedCallTimeOut'
  /** Parking lot name */
  ParkingLot: string
  /** Parking space */
  ParkingSpace: string
  /** Parked channel */
  ParkeeChannel: string
  /** Parked unique ID */
  ParkeeUniqueid: string
  /** Parked linked ID */
  ParkeeLinkedid: string
  /** Parked caller ID number */
  ParkeeCallerIDNum: string
  /** Parked caller ID name */
  ParkeeCallerIDName: string
  /** Parker channel */
  ParkerChannel?: string
}

/**
 * AMI UnParkedCall event
 */
export interface AmiUnParkedCallEvent extends AmiEventData {
  Event: 'UnParkedCall'
  /** Parking lot name */
  ParkingLot: string
  /** Parking space */
  ParkingSpace: string
  /** Parked channel */
  ParkeeChannel: string
  /** Parked unique ID */
  ParkeeUniqueid: string
  /** Parked linked ID */
  ParkeeLinkedid: string
  /** Parked caller ID number */
  ParkeeCallerIDNum: string
  /** Parked caller ID name */
  ParkeeCallerIDName: string
  /** Retriever channel */
  RetrieverChannel: string
  /** Retriever channel state */
  RetrieverChannelState: string
  /** Retriever unique ID */
  RetrieverUniqueid: string
  /** Retriever linked ID */
  RetrieverLinkedid: string
}

/**
 * AMI ParkedCallSwap event (call transferred to different space)
 */
export interface AmiParkedCallSwapEvent extends AmiEventData {
  Event: 'ParkedCallSwap'
  /** Parking lot name */
  ParkingLot: string
  /** Parking space */
  ParkingSpace: string
  /** Parked channel */
  ParkeeChannel: string
  /** Parked unique ID */
  ParkeeUniqueid: string
}

/**
 * AMI Parkinglots event (from Parkinglots action)
 */
export interface AmiParkinglotsEvent extends AmiEventData {
  Event: 'Parkinglot'
  /** Parking lot name */
  Name: string
  /** Start space */
  StartSpace: string
  /** Stop space (end space) */
  StopSpace: string
  /** Timeout */
  Timeout: string
}

/**
 * Options for useAmiParking composable
 */
export interface UseAmiParkingOptions {
  /** Polling interval for parking status in ms (0 = events only) */
  pollInterval?: number
  /** Use real-time parking events */
  useEvents?: boolean
  /** Auto-refresh parking lots on reconnect */
  autoRefresh?: boolean
  /** Default parking lot name */
  defaultParkingLot?: string
  /** Parking lot filter function */
  parkingLotFilter?: (lot: ParkingLot) => boolean
  /** Parked call filter function */
  parkedCallFilter?: (call: ParkedCall) => boolean
  /** Parked call callback */
  onCallParked?: (call: ParkedCall) => void
  /** Call retrieved callback */
  onCallRetrieved?: (call: ParkedCall, retrieverChannel: string) => void
  /** Call timeout callback */
  onCallTimeout?: (call: ParkedCall) => void
  /** Call give-up callback (caller hung up) */
  onCallGiveUp?: (call: ParkedCall) => void
  /** Transform parked call function */
  transformParkedCall?: (call: ParkedCall) => ParkedCall
}
