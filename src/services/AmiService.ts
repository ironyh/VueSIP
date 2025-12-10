/**
 * AmiService - Unified AMI Interface Service
 *
 * A singleton service that provides unified access to all AMI composables
 * with consistent initialization, connection management, and event handling.
 *
 * This service wraps all 19 AMI composables and provides:
 * - Centralized connection management
 * - Lazy initialization of composables
 * - Consistent event handling across all features
 * - Type-safe access to all AMI functionality
 * - Automatic cleanup on disconnect
 *
 * @module services/AmiService
 */

import { ref, computed, shallowRef, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  AmiConfig,
  AmiConnectionState,
  UseAmiQueuesOptions,
  UseAmiCallsOptions,
  UseAmiSupervisorOptions,
  UseAmiPeersOptions,
  UseAmiDatabaseOptions,
} from '@/types/ami.types'
import type { UseAmiAgentStatsOptions, UseAmiAgentStatsReturn } from '@/types/agentstats.types'
import type { UseAmiAgentLoginOptions, UseAmiAgentLoginReturn } from '@/types/agent.types'
import type { UseAmiVoicemailOptions } from '@/types/voicemail.types'
import type { UseAmiParkingOptions } from '@/types/parking.types'
import type { UseAmiCallbackOptions, UseAmiCallbackReturn } from '@/types/callback.types'
import type { UseAmiCDROptions, UseAmiCDRReturn } from '@/types/cdr.types'
import type { UseAmiRingGroupsOptions, UseAmiRingGroupsReturn } from '@/types/ringgroup.types'
import type { UseAmiIVROptions, UseAmiIVRReturn } from '@/types/ivr.types'
import type { UseAmiRecordingOptions, UseAmiRecordingReturn } from '@/types/recording.types'
import type {
  UseAmiTimeConditionsOptions,
  UseAmiTimeConditionsReturn,
} from '@/types/timeconditions.types'
import type {
  UseAmiFeatureCodesOptions,
  UseAmiFeatureCodesReturn,
} from '@/types/featurecodes.types'
import type { UseAmiPagingOptions, UseAmiPagingReturn } from '@/types/paging.types'
import type { UseAmiBlacklistOptions, UseAmiBlacklistReturn } from '@/types/blacklist.types'

// Import all AMI composables
import { useAmi, type UseAmiReturn } from '@/composables/useAmi'
import { useAmiQueues, type UseAmiQueuesReturn } from '@/composables/useAmiQueues'
import { useAmiAgentStats } from '@/composables/useAmiAgentStats'
import { useAmiAgentLogin } from '@/composables/useAmiAgentLogin'
import { useAmiVoicemail, type UseAmiVoicemailReturn } from '@/composables/useAmiVoicemail'
import { useAmiParking, type UseAmiParkingReturn } from '@/composables/useAmiParking'
import { useAmiCallback } from '@/composables/useAmiCallback'
import { useAmiCDR } from '@/composables/useAmiCDR'
import { useAmiSupervisor, type UseAmiSupervisorReturn } from '@/composables/useAmiSupervisor'
import { useAmiRingGroups } from '@/composables/useAmiRingGroups'
import { useAmiIVR } from '@/composables/useAmiIVR'
import { useAmiRecording } from '@/composables/useAmiRecording'
import { useAmiTimeConditions } from '@/composables/useAmiTimeConditions'
import { useAmiFeatureCodes } from '@/composables/useAmiFeatureCodes'
import { useAmiPaging } from '@/composables/useAmiPaging'
import { useAmiBlacklist } from '@/composables/useAmiBlacklist'
import { useAmiPeers, type UseAmiPeersReturn } from '@/composables/useAmiPeers'
import { useAmiCalls, type UseAmiCallsReturn } from '@/composables/useAmiCalls'
import { useAmiDatabase, type UseAmiDatabaseReturn } from '@/composables/useAmiDatabase'

// Types are re-exported at the bottom of the file

import { createLogger } from '@/utils/logger'

const logger = createLogger('AmiService')

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for AmiService
 */
export interface AmiServiceConfig {
  /** Optional AMI connection config (can be provided later via connect()) */
  amiConfig?: AmiConfig
  /** Auto-connect on initialization */
  autoConnect?: boolean
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number
}

/**
 * Options map for all composables
 */
export interface ComposableOptionsMap {
  queues?: UseAmiQueuesOptions
  agentStats?: UseAmiAgentStatsOptions
  agentLogin?: UseAmiAgentLoginOptions
  voicemail?: UseAmiVoicemailOptions
  parking?: UseAmiParkingOptions
  callback?: UseAmiCallbackOptions
  cdr?: UseAmiCDROptions
  supervisor?: UseAmiSupervisorOptions
  ringGroups?: UseAmiRingGroupsOptions
  ivr?: UseAmiIVROptions
  recording?: UseAmiRecordingOptions
  timeConditions?: UseAmiTimeConditionsOptions
  featureCodes?: UseAmiFeatureCodesOptions
  paging?: UseAmiPagingOptions
  blacklist?: UseAmiBlacklistOptions
  peers?: UseAmiPeersOptions
  calls?: UseAmiCallsOptions
  database?: UseAmiDatabaseOptions
}

/**
 * Map of all initialized composables
 */
export interface InitializedComposables {
  queues: UseAmiQueuesReturn | null
  agentStats: UseAmiAgentStatsReturn | null
  agentLogin: UseAmiAgentLoginReturn | null
  voicemail: UseAmiVoicemailReturn | null
  parking: UseAmiParkingReturn | null
  callback: UseAmiCallbackReturn | null
  cdr: UseAmiCDRReturn | null
  supervisor: UseAmiSupervisorReturn | null
  ringGroups: UseAmiRingGroupsReturn | null
  ivr: UseAmiIVRReturn | null
  recording: UseAmiRecordingReturn | null
  timeConditions: UseAmiTimeConditionsReturn | null
  featureCodes: UseAmiFeatureCodesReturn | null
  paging: UseAmiPagingReturn | null
  blacklist: UseAmiBlacklistReturn | null
  peers: UseAmiPeersReturn | null
  calls: UseAmiCallsReturn | null
  database: UseAmiDatabaseReturn | null
}

/**
 * AmiService return type
 */
export interface AmiServiceReturn {
  // Connection state
  connectionState: ComputedRef<AmiConnectionState>
  isConnected: ComputedRef<boolean>
  error: Ref<string | null>

  // Core AMI access
  ami: UseAmiReturn
  client: ComputedRef<AmiClient | null>
  clientRef: Ref<AmiClient | null>

  // Connection methods
  connect: (config?: AmiConfig) => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>

  // Composable factories (lazy initialization)
  useQueues: (options?: UseAmiQueuesOptions) => UseAmiQueuesReturn
  useAgentStats: (options?: UseAmiAgentStatsOptions) => UseAmiAgentStatsReturn
  useAgentLogin: (options?: UseAmiAgentLoginOptions) => UseAmiAgentLoginReturn
  useVoicemail: (options?: UseAmiVoicemailOptions) => UseAmiVoicemailReturn
  useParking: (options?: UseAmiParkingOptions) => UseAmiParkingReturn
  useCallback: (options?: UseAmiCallbackOptions) => UseAmiCallbackReturn
  useCDR: (options?: UseAmiCDROptions) => UseAmiCDRReturn
  useSupervisor: (options?: UseAmiSupervisorOptions) => UseAmiSupervisorReturn
  useRingGroups: (options?: UseAmiRingGroupsOptions) => UseAmiRingGroupsReturn
  useIVR: (options?: UseAmiIVROptions) => UseAmiIVRReturn
  useRecording: (options?: UseAmiRecordingOptions) => UseAmiRecordingReturn
  useTimeConditions: (options?: UseAmiTimeConditionsOptions) => UseAmiTimeConditionsReturn
  useFeatureCodes: (options?: UseAmiFeatureCodesOptions) => UseAmiFeatureCodesReturn
  usePaging: (options?: UseAmiPagingOptions) => UseAmiPagingReturn
  useBlacklist: (options?: UseAmiBlacklistOptions) => UseAmiBlacklistReturn
  usePeers: (options?: UseAmiPeersOptions) => UseAmiPeersReturn
  useCalls: (options?: UseAmiCallsOptions) => UseAmiCallsReturn
  useDatabase: (options?: UseAmiDatabaseOptions) => UseAmiDatabaseReturn

  // Direct composable access (pre-initialized)
  composables: InitializedComposables

  // Utility methods
  initializeAll: (options?: ComposableOptionsMap) => void
  resetAll: () => void
  getStats: () => AmiServiceStats
}

/**
 * Service statistics
 */
export interface AmiServiceStats {
  isConnected: boolean
  connectionState: AmiConnectionState
  initializedComposables: string[]
  reconnectAttempts: number
  lastConnectedAt: Date | null
  lastDisconnectedAt: Date | null
}

// ============================================================================
// AmiService Implementation
// ============================================================================

/**
 * Create an AmiService instance
 *
 * Provides unified access to all AMI composables with consistent
 * initialization and connection management.
 *
 * @param config - Service configuration options
 * @returns AmiService instance
 *
 * @example
 * ```typescript
 * // Create service
 * const amiService = createAmiService()
 *
 * // Connect to AMI
 * await amiService.connect({
 *   url: 'ws://pbx.example.com:8080',
 *   username: 'admin',
 *   secret: 'secret'
 * })
 *
 * // Use queues
 * const queues = amiService.useQueues({
 *   useEvents: true,
 *   pauseReasons: ['Break', 'Lunch', 'Meeting']
 * })
 * await queues.refresh()
 *
 * // Use agent stats
 * const agentStats = amiService.useAgentStats({
 *   agentId: '1001',
 *   queues: ['sales', 'support']
 * })
 * agentStats.startTracking()
 *
 * // Use voicemail
 * const voicemail = amiService.useVoicemail()
 * voicemail.monitorMailbox('1000', 'default')
 * ```
 */
export function createAmiService(config: AmiServiceConfig = {}): AmiServiceReturn {
  const {
    amiConfig,
    autoConnect = false,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5,
  } = config

  // ============================================================================
  // State
  // ============================================================================

  const error = ref<string | null>(null)
  const reconnectAttempts = ref(0)
  const lastConnectedAt = ref<Date | null>(null)
  const lastDisconnectedAt = ref<Date | null>(null)
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // Core AMI composable
  const ami = useAmi()

  // Client ref for composables that need Ref<AmiClient | null>
  const clientRef = computed(() => ami.getClient())

  // Shallow ref for composables that need AmiClient | null
  const clientShallowRef: Ref<AmiClient | null> = shallowRef(null)

  // Initialized composables storage
  const composables: InitializedComposables = {
    queues: null,
    agentStats: null,
    agentLogin: null,
    voicemail: null,
    parking: null,
    callback: null,
    cdr: null,
    supervisor: null,
    ringGroups: null,
    ivr: null,
    recording: null,
    timeConditions: null,
    featureCodes: null,
    paging: null,
    blacklist: null,
    peers: null,
    calls: null,
    database: null,
  }

  // ============================================================================
  // Computed
  // ============================================================================

  const connectionState = computed(() => ami.connectionState.value)
  const isConnected = computed(() => ami.isConnected.value)
  const client = computed(() => ami.getClient())

  // ============================================================================
  // Connection Methods
  // ============================================================================

  /**
   * Connect to AMI WebSocket
   */
  const connect = async (connectConfig?: AmiConfig): Promise<void> => {
    const finalConfig = connectConfig || amiConfig
    if (!finalConfig) {
      throw new Error('AMI configuration required')
    }

    error.value = null

    try {
      await ami.connect(finalConfig)

      // Update client ref for composables
      clientShallowRef.value = ami.getClient()

      reconnectAttempts.value = 0
      lastConnectedAt.value = new Date()

      logger.info('AmiService connected')

      // Setup disconnect handler for auto-reconnect
      if (autoReconnect) {
        // Use onEvent to listen for disconnection - the cleanup is automatic via useAmi lifecycle
        ami.onEvent((event) => {
          // Check if event indicates disconnection
          if ((event as unknown as { type?: string }).type === 'disconnected') {
            lastDisconnectedAt.value = new Date()
            scheduleReconnect(finalConfig)
          }
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect'
      logger.error('AmiService connection failed', err)
      throw err
    }
  }

  /**
   * Disconnect from AMI
   */
  const disconnect = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    ami.disconnect()
    clientShallowRef.value = null
    lastDisconnectedAt.value = new Date()

    // Reset all composables
    resetAll()

    logger.info('AmiService disconnected')
  }

  /**
   * Reconnect to AMI
   */
  const reconnect = async (): Promise<void> => {
    disconnect()
    if (amiConfig) {
      await connect(amiConfig)
    }
  }

  /**
   * Schedule reconnect attempt
   */
  const scheduleReconnect = (configToUse: AmiConfig): void => {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      logger.warn('Max reconnection attempts reached')
      error.value = 'Max reconnection attempts reached'
      return
    }

    reconnectTimer = setTimeout(async () => {
      reconnectAttempts.value++
      logger.info(`Reconnect attempt ${reconnectAttempts.value}/${maxReconnectAttempts}`)

      try {
        await connect(configToUse)
      } catch (_err) {
        scheduleReconnect(configToUse)
      }
    }, reconnectDelay)
  }

  // ============================================================================
  // Composable Factories
  // ============================================================================

  /**
   * Create or return existing queues composable
   */
  const useQueuesFactory = (options?: UseAmiQueuesOptions): UseAmiQueuesReturn => {
    if (!composables.queues) {
      composables.queues = useAmiQueues(ami.getClient(), options)
    }
    return composables.queues
  }

  /**
   * Create or return existing agent stats composable
   */
  const useAgentStatsFactory = (options?: UseAmiAgentStatsOptions): UseAmiAgentStatsReturn => {
    if (!composables.agentStats) {
      composables.agentStats = useAmiAgentStats(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.agentStats
  }

  /**
   * Create or return existing agent login composable
   */
  const useAgentLoginFactory = (options?: UseAmiAgentLoginOptions): UseAmiAgentLoginReturn => {
    if (!composables.agentLogin) {
      composables.agentLogin = useAmiAgentLogin(
        ami.getClient(),
        options || ({} as UseAmiAgentLoginOptions)
      )
    }
    return composables.agentLogin
  }

  /**
   * Create or return existing voicemail composable
   */
  const useVoicemailFactory = (options?: UseAmiVoicemailOptions): UseAmiVoicemailReturn => {
    if (!composables.voicemail) {
      composables.voicemail = useAmiVoicemail(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.voicemail
  }

  /**
   * Create or return existing parking composable
   */
  const useParkingFactory = (options?: UseAmiParkingOptions): UseAmiParkingReturn => {
    if (!composables.parking) {
      composables.parking = useAmiParking(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.parking
  }

  /**
   * Create or return existing callback composable
   */
  const useCallbackFactory = (options?: UseAmiCallbackOptions): UseAmiCallbackReturn => {
    if (!composables.callback) {
      composables.callback = useAmiCallback(ami.getClient(), options)
    }
    return composables.callback
  }

  /**
   * Create or return existing CDR composable
   */
  const useCDRFactory = (options?: UseAmiCDROptions): UseAmiCDRReturn => {
    if (!composables.cdr) {
      composables.cdr = useAmiCDR(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.cdr
  }

  /**
   * Create or return existing supervisor composable
   */
  const useSupervisorFactory = (options?: UseAmiSupervisorOptions): UseAmiSupervisorReturn => {
    if (!composables.supervisor) {
      composables.supervisor = useAmiSupervisor(ami.getClient(), options)
    }
    return composables.supervisor
  }

  /**
   * Create or return existing ring groups composable
   */
  const useRingGroupsFactory = (options?: UseAmiRingGroupsOptions): UseAmiRingGroupsReturn => {
    if (!composables.ringGroups) {
      composables.ringGroups = useAmiRingGroups(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.ringGroups
  }

  /**
   * Create or return existing IVR composable
   */
  const useIVRFactory = (options?: UseAmiIVROptions): UseAmiIVRReturn => {
    if (!composables.ivr) {
      composables.ivr = useAmiIVR(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.ivr
  }

  /**
   * Create or return existing recording composable
   */
  const useRecordingFactory = (options?: UseAmiRecordingOptions): UseAmiRecordingReturn => {
    if (!composables.recording) {
      composables.recording = useAmiRecording(clientRef as Ref<AmiClient | null>, options)
    }
    return composables.recording
  }

  /**
   * Create or return existing time conditions composable
   */
  const useTimeConditionsFactory = (
    options?: UseAmiTimeConditionsOptions
  ): UseAmiTimeConditionsReturn => {
    if (!composables.timeConditions) {
      composables.timeConditions = useAmiTimeConditions(ami.getClient(), options)
    }
    return composables.timeConditions
  }

  /**
   * Create or return existing feature codes composable
   */
  const useFeatureCodesFactory = (
    options?: UseAmiFeatureCodesOptions
  ): UseAmiFeatureCodesReturn => {
    if (!composables.featureCodes) {
      composables.featureCodes = useAmiFeatureCodes(ami.getClient(), options)
    }
    return composables.featureCodes
  }

  /**
   * Create or return existing paging composable
   */
  const usePagingFactory = (options?: UseAmiPagingOptions): UseAmiPagingReturn => {
    if (!composables.paging) {
      composables.paging = useAmiPaging(ami.getClient(), options)
    }
    return composables.paging
  }

  /**
   * Create or return existing blacklist composable
   */
  const useBlacklistFactory = (options?: UseAmiBlacklistOptions): UseAmiBlacklistReturn => {
    if (!composables.blacklist) {
      composables.blacklist = useAmiBlacklist(ami.getClient(), options)
    }
    return composables.blacklist
  }

  /**
   * Create or return existing peers composable
   */
  const usePeersFactory = (options?: UseAmiPeersOptions): UseAmiPeersReturn => {
    if (!composables.peers) {
      composables.peers = useAmiPeers(ami.getClient(), options)
    }
    return composables.peers
  }

  /**
   * Create or return existing calls composable
   */
  const useCallsFactory = (options?: UseAmiCallsOptions): UseAmiCallsReturn => {
    if (!composables.calls) {
      composables.calls = useAmiCalls(ami.getClient(), options)
    }
    return composables.calls
  }

  /**
   * Create or return existing database composable
   */
  const useDatabaseFactory = (options?: UseAmiDatabaseOptions): UseAmiDatabaseReturn => {
    if (!composables.database) {
      composables.database = useAmiDatabase(ami.getClient(), options)
    }
    return composables.database
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Initialize all composables at once
   */
  const initializeAll = (options: ComposableOptionsMap = {}): void => {
    useQueuesFactory(options.queues)
    useAgentStatsFactory(options.agentStats)
    useAgentLoginFactory(options.agentLogin)
    useVoicemailFactory(options.voicemail)
    useParkingFactory(options.parking)
    useCallbackFactory(options.callback)
    useCDRFactory(options.cdr)
    useSupervisorFactory(options.supervisor)
    useRingGroupsFactory(options.ringGroups)
    useIVRFactory(options.ivr)
    useRecordingFactory(options.recording)
    useTimeConditionsFactory(options.timeConditions)
    useFeatureCodesFactory(options.featureCodes)
    usePagingFactory(options.paging)
    useBlacklistFactory(options.blacklist)
    usePeersFactory(options.peers)
    useCallsFactory(options.calls)
    useDatabaseFactory(options.database)

    logger.info('All AMI composables initialized')
  }

  /**
   * Reset all composables
   */
  const resetAll = (): void => {
    composables.queues = null
    composables.agentStats = null
    composables.agentLogin = null
    composables.voicemail = null
    composables.parking = null
    composables.callback = null
    composables.cdr = null
    composables.supervisor = null
    composables.ringGroups = null
    composables.ivr = null
    composables.recording = null
    composables.timeConditions = null
    composables.featureCodes = null
    composables.paging = null
    composables.blacklist = null
    composables.peers = null
    composables.calls = null
    composables.database = null

    logger.info('All AMI composables reset')
  }

  /**
   * Get service statistics
   */
  const getStats = (): AmiServiceStats => {
    const initializedComposables: string[] = []

    Object.entries(composables).forEach(([key, value]) => {
      if (value !== null) {
        initializedComposables.push(key)
      }
    })

    return {
      isConnected: isConnected.value,
      connectionState: connectionState.value,
      initializedComposables,
      reconnectAttempts: reconnectAttempts.value,
      lastConnectedAt: lastConnectedAt.value,
      lastDisconnectedAt: lastDisconnectedAt.value,
    }
  }

  // ============================================================================
  // Auto-connect if configured
  // ============================================================================

  if (autoConnect && amiConfig) {
    connect(amiConfig).catch((err) => {
      logger.error('Auto-connect failed', err)
    })
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Connection state
    connectionState,
    isConnected,
    error,

    // Core AMI access
    ami,
    client,
    clientRef: clientRef as Ref<AmiClient | null>,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Composable factories
    useQueues: useQueuesFactory,
    useAgentStats: useAgentStatsFactory,
    useAgentLogin: useAgentLoginFactory,
    useVoicemail: useVoicemailFactory,
    useParking: useParkingFactory,
    useCallback: useCallbackFactory,
    useCDR: useCDRFactory,
    useSupervisor: useSupervisorFactory,
    useRingGroups: useRingGroupsFactory,
    useIVR: useIVRFactory,
    useRecording: useRecordingFactory,
    useTimeConditions: useTimeConditionsFactory,
    useFeatureCodes: useFeatureCodesFactory,
    usePaging: usePagingFactory,
    useBlacklist: useBlacklistFactory,
    usePeers: usePeersFactory,
    useCalls: useCallsFactory,
    useDatabase: useDatabaseFactory,

    // Direct composable access
    composables,

    // Utility methods
    initializeAll,
    resetAll,
    getStats,
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _amiServiceInstance: AmiServiceReturn | null = null

/**
 * Get or create the singleton AmiService instance
 *
 * Use this in playground demos for consistent shared state.
 *
 * @example
 * ```typescript
 * import { getAmiService } from '@/services/AmiService'
 *
 * const amiService = getAmiService()
 * await amiService.connect(config)
 * ```
 */
export function getAmiService(config?: AmiServiceConfig): AmiServiceReturn {
  if (!_amiServiceInstance) {
    _amiServiceInstance = createAmiService(config)
  }
  return _amiServiceInstance
}

/**
 * Reset the singleton AmiService instance
 *
 * Useful for testing or reinitializing the service.
 */
export function resetAmiService(): void {
  if (_amiServiceInstance) {
    _amiServiceInstance.disconnect()
    _amiServiceInstance = null
  }
}

export type { UseAmiQueuesOptions, UseAmiQueuesReturn }
export type { UseAmiAgentStatsOptions, UseAmiAgentStatsReturn }
export type { UseAmiAgentLoginOptions, UseAmiAgentLoginReturn }
export type { UseAmiVoicemailOptions, UseAmiVoicemailReturn }
export type { UseAmiParkingOptions, UseAmiParkingReturn }
export type { UseAmiCallbackOptions, UseAmiCallbackReturn }
export type { UseAmiCDROptions, UseAmiCDRReturn }
export type { UseAmiSupervisorOptions, UseAmiSupervisorReturn }
export type { UseAmiRingGroupsOptions, UseAmiRingGroupsReturn }
export type { UseAmiIVROptions, UseAmiIVRReturn }
export type { UseAmiRecordingOptions, UseAmiRecordingReturn }
export type { UseAmiTimeConditionsOptions, UseAmiTimeConditionsReturn }
export type { UseAmiFeatureCodesOptions, UseAmiFeatureCodesReturn }
export type { UseAmiPagingOptions, UseAmiPagingReturn }
export type { UseAmiBlacklistOptions, UseAmiBlacklistReturn }
export type { UseAmiPeersOptions, UseAmiPeersReturn }
export type { UseAmiCallsOptions, UseAmiCallsReturn }
export type { UseAmiDatabaseOptions, UseAmiDatabaseReturn }
