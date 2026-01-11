/**
 * AMI System Health Composable
 *
 * Vue composable for Asterisk system health monitoring via AMI.
 * Provides core status, channel listing, module management, and bridge info.
 *
 * @module composables/useAmiSystem
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction } from '@/types/ami.types'
import type {
  CoreStatus,
  CoreChannel,
  ModuleInfo,
  BridgeInfo,
  UseAmiSystemOptions,
  OriginateOptions,
  AmiCoreShowChannelEvent,
} from '@/types/system.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiSystem')

/**
 * Return type for useAmiSystem composable
 */
export interface UseAmiSystemReturn {
  // State
  /** Current core status */
  coreStatus: Ref<CoreStatus | null>
  /** Active channels map by channel name */
  channels: Ref<Map<string, CoreChannel>>
  /** Loaded modules map by module name */
  modules: Ref<Map<string, ModuleInfo>>
  /** Active bridges map by bridge ID */
  bridges: Ref<Map<string, BridgeInfo>>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>
  /** Last ping latency in ms */
  latency: Ref<number | null>

  // Computed
  /** Channels as array */
  channelList: ComputedRef<CoreChannel[]>
  /** Modules as array */
  moduleList: ComputedRef<ModuleInfo[]>
  /** Bridges as array */
  bridgeList: ComputedRef<BridgeInfo[]>
  /** Human-readable uptime string */
  formattedUptime: ComputedRef<string>
  /** System health status */
  isHealthy: ComputedRef<boolean>
  /** Total active channel count */
  totalChannels: ComputedRef<number>
  /** Total active bridge count */
  totalBridges: ComputedRef<number>

  // Actions
  /** Get core status */
  getCoreStatus: () => Promise<CoreStatus>
  /** List all active channels */
  getChannels: () => Promise<CoreChannel[]>
  /** List all loaded modules */
  getModules: () => Promise<ModuleInfo[]>
  /** List all active bridges */
  getBridges: () => Promise<BridgeInfo[]>
  /** Reload a module */
  reloadModule: (module: string) => Promise<boolean>
  /** Load a module */
  loadModule: (module: string) => Promise<boolean>
  /** Unload a module */
  unloadModule: (module: string) => Promise<boolean>
  /** Ping the AMI server and return latency */
  ping: () => Promise<number>
  /** Originate a call */
  originate: (options: OriginateOptions) => Promise<boolean>

  // Utilities
  /** Refresh all system data */
  refresh: () => Promise<void>
  /** Start status polling */
  startPolling: () => void
  /** Stop status polling */
  stopPolling: () => void
  /** Get channel by name */
  getChannel: (channelName: string) => CoreChannel | undefined
  /** Hangup a channel */
  hangupChannel: (channel: string) => Promise<boolean>
}

/**
 * AMI System Health Composable
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   coreStatus,
 *   channelList,
 *   formattedUptime,
 *   isHealthy,
 *   getCoreStatus,
 *   getChannels,
 *   ping,
 *   reloadModule
 * } = useAmiSystem(computed(() => ami.getClient()))
 *
 * // Get system status
 * await getCoreStatus()
 * console.log(`Asterisk ${coreStatus.value?.asteriskVersion} - Uptime: ${formattedUptime.value}`)
 *
 * // Check latency
 * const latencyMs = await ping()
 * console.log(`AMI latency: ${latencyMs}ms`)
 *
 * // List active channels
 * await getChannels()
 * console.log(`Active channels: ${channelList.value.length}`)
 *
 * // Reload a module
 * await reloadModule('res_pjsip.so')
 * ```
 */
export function useAmiSystem(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiSystemOptions = {}
): UseAmiSystemReturn {
  const {
    autoRefresh = true,
    statusPollInterval = 30000,
    enablePolling = true,
    onStatusUpdate,
    onChannelsUpdate,
  } = options

  // Reactive state
  const coreStatus = ref<CoreStatus | null>(null)
  const channels = ref<Map<string, CoreChannel>>(new Map())
  const modules = ref<Map<string, ModuleInfo>>(new Map())
  const bridges = ref<Map<string, BridgeInfo>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const latency = ref<number | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  // Computed properties
  const channelList = computed(() => Array.from(channels.value.values()))
  const moduleList = computed(() => Array.from(modules.value.values()))
  const bridgeList = computed(() => Array.from(bridges.value.values()))
  const totalChannels = computed(() => channels.value.size)
  const totalBridges = computed(() => bridges.value.size)

  const formattedUptime = computed(() => {
    if (!coreStatus.value) return '0s'
    const seconds = coreStatus.value.uptime
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  })

  const isHealthy = computed(() => {
    return coreStatus.value !== null && coreStatus.value.uptime > 0
  })

  // Helper to send AMI actions
  async function doAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    const response = await client.sendAction(action)
    return response.data as Record<string, unknown>
  }

  /**
   * Get core system status
   */
  async function getCoreStatus(): Promise<CoreStatus> {
    isLoading.value = true
    error.value = null

    try {
      const response = await doAction({ Action: 'CoreStatus' })

      const status: CoreStatus = {
        asteriskVersion: String(response.AsteriskVersion || ''),
        uptime: parseUptimeSeconds(response.CoreUptime),
        reloadCount: parseInt(String(response.CoreReloadCount || '0'), 10),
        lastReload: parseDateTimeFields(
          String(response.CoreReloadDate || ''),
          String(response.CoreReloadTime || '')
        ),
        currentCalls: parseInt(String(response.CoreCurrentCalls || '0'), 10),
        maxCalls: parseInt(String(response.CoreMaxCalls || '0'), 10),
        startupTime: parseDateTimeFields(
          String(response.CoreStartupDate || ''),
          String(response.CoreStartupTime || '')
        ),
        systemTime: new Date(),
      }

      coreStatus.value = status
      onStatusUpdate?.(status)

      logger.debug('Core status retrieved', { version: status.asteriskVersion })
      return status
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get core status'
      error.value = message
      logger.error('Failed to get core status', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * List all active channels
   */
  async function getChannels(): Promise<CoreChannel[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await doAction({ Action: 'CoreShowChannels' })
      const events = (response.events || []) as AmiCoreShowChannelEvent[]

      channels.value.clear()

      for (const event of events) {
        if (event.Event === 'CoreShowChannel') {
          const channel: CoreChannel = {
            channel: event.Channel,
            uniqueId: event.Uniqueid || '',
            state: event.StateDesc || event.State || '',
            stateCode: parseInt(String(event.State || '0'), 10),
            application: event.Application || '',
            data: event.ApplicationData || '',
            callerIdNum: event.CallerIDNum || '',
            callerIdName: event.CallerIDName || '',
            connectedLineNum: event.ConnectedLineNum || '',
            connectedLineName: event.ConnectedLineName || '',
            duration: parseDurationSeconds(event.Duration),
            accountCode: event.Accountcode,
            bridgeId: event.BridgeId,
            context: event.Context,
            extension: event.Extension,
            priority: event.Priority ? parseInt(event.Priority, 10) : undefined,
          }
          channels.value.set(channel.channel, channel)
        }
      }

      const result = channelList.value
      onChannelsUpdate?.(result)

      logger.debug('Channels retrieved', { count: result.length })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get channels'
      error.value = message
      logger.error('Failed to get channels', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * List all loaded modules
   */
  async function getModules(): Promise<ModuleInfo[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await doAction({ Action: 'ModuleCheck' })
      const events = (response.events || []) as Record<string, string>[]

      modules.value.clear()

      // Process each module event
      for (const event of events) {
        if (event.Event === 'ModuleCheck' || event.Module) {
          const moduleInfo: ModuleInfo = {
            module: event.Module || '',
            description: event.Description || '',
            status: parseModuleStatus(event.Status),
            useCount: parseInt(event.UseCount || '0', 10),
            supportLevel: parseSupportLevel(event.SupportLevel),
            version: event.Version,
          }
          if (moduleInfo.module) {
            modules.value.set(moduleInfo.module, moduleInfo)
          }
        }
      }

      logger.debug('Modules retrieved', { count: modules.value.size })
      return moduleList.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get modules'
      error.value = message
      logger.error('Failed to get modules', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * List all active bridges
   */
  async function getBridges(): Promise<BridgeInfo[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await doAction({ Action: 'BridgeList' })
      const events = (response.events || []) as Record<string, string>[]

      bridges.value.clear()

      for (const event of events) {
        if (event.Event === 'BridgeListItem') {
          const bridge: BridgeInfo = {
            bridgeId: event.BridgeUniqueid || '',
            bridgeType: event.BridgeType || '',
            bridgeTechnology: event.BridgeTechnology || '',
            channelCount: parseInt(event.BridgeNumChannels || '0', 10),
            createdAt: new Date(),
            videoMode: event.BridgeVideoSourceMode,
            name: event.BridgeName,
          }
          bridges.value.set(bridge.bridgeId, bridge)
        }
      }

      logger.debug('Bridges retrieved', { count: bridges.value.size })
      return bridgeList.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get bridges'
      error.value = message
      logger.error('Failed to get bridges', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Reload a module
   */
  async function reloadModule(module: string): Promise<boolean> {
    try {
      const response = await doAction({
        Action: 'ModuleLoad',
        Module: module,
        LoadType: 'Reload',
      })
      const success = response.Response === 'Success'
      logger.info('Module reload', { module, success })
      return success
    } catch (err) {
      logger.error('Failed to reload module', { module, error: err })
      return false
    }
  }

  /**
   * Load a module
   */
  async function loadModule(module: string): Promise<boolean> {
    try {
      const response = await doAction({
        Action: 'ModuleLoad',
        Module: module,
        LoadType: 'Load',
      })
      const success = response.Response === 'Success'
      logger.info('Module load', { module, success })
      return success
    } catch (err) {
      logger.error('Failed to load module', { module, error: err })
      return false
    }
  }

  /**
   * Unload a module
   */
  async function unloadModule(module: string): Promise<boolean> {
    try {
      const response = await doAction({
        Action: 'ModuleLoad',
        Module: module,
        LoadType: 'Unload',
      })
      const success = response.Response === 'Success'
      logger.info('Module unload', { module, success })
      return success
    } catch (err) {
      logger.error('Failed to unload module', { module, error: err })
      return false
    }
  }

  /**
   * Ping the AMI server and measure latency
   */
  async function ping(): Promise<number> {
    const start = Date.now()
    try {
      await doAction({ Action: 'Ping' })
      const elapsed = Date.now() - start
      latency.value = elapsed
      return elapsed
    } catch (err) {
      logger.error('Ping failed', err)
      throw err
    }
  }

  /**
   * Originate a call
   */
  async function originate(opts: OriginateOptions): Promise<boolean> {
    try {
      const action: AmiAction = {
        Action: 'Originate',
        Channel: opts.channel,
        Async: opts.async !== false ? 'yes' : 'no',
      }

      if (opts.application) {
        action.Application = opts.application
        if (opts.data) {
          action.Data = opts.data
        }
      } else {
        action.Context = opts.context
        action.Exten = opts.extension
        action.Priority = String(opts.priority || 1)
      }

      if (opts.callerId) action.CallerID = opts.callerId
      if (opts.timeout) action.Timeout = String(opts.timeout * 1000) // Convert to ms
      if (opts.accountCode) action.Account = opts.accountCode

      // Add variables
      if (opts.variables) {
        const varEntries = Object.entries(opts.variables)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
        action.Variable = varEntries
      }

      const response = await doAction(action)
      const success = response.Response === 'Success'
      logger.info('Originate call', { channel: opts.channel, success })
      return success
    } catch (err) {
      logger.error('Failed to originate call', { channel: opts.channel, error: err })
      return false
    }
  }

  /**
   * Hangup a channel
   */
  async function hangupChannel(channel: string): Promise<boolean> {
    try {
      const response = await doAction({
        Action: 'Hangup',
        Channel: channel,
      })
      const success = response.Response === 'Success'

      if (success) {
        channels.value.delete(channel)
      }

      logger.info('Channel hangup', { channel, success })
      return success
    } catch (err) {
      logger.error('Failed to hangup channel', { channel, error: err })
      return false
    }
  }

  /**
   * Get a channel by name
   */
  function getChannel(channelName: string): CoreChannel | undefined {
    return channels.value.get(channelName)
  }

  /**
   * Refresh all system data
   */
  async function refresh(): Promise<void> {
    await Promise.all([getCoreStatus(), getChannels(), getBridges()])
  }

  /**
   * Start status polling
   */
  function startPolling(): void {
    if (pollTimer || !statusPollInterval) return

    pollTimer = setInterval(() => {
      getCoreStatus().catch((err) => {
        logger.error('Poll failed', err)
      })
    }, statusPollInterval)

    logger.debug('Started polling', { interval: statusPollInterval })
  }

  /**
   * Stop status polling
   */
  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
      logger.debug('Stopped polling')
    }
  }

  // Helper functions
  function parseUptimeSeconds(uptime: unknown): number {
    if (typeof uptime === 'number') return uptime
    if (typeof uptime === 'string') {
      // Handle "HH:MM:SS" format
      const timeMatch = uptime.match(/^(\d+):(\d+):(\d+)$/)
      if (timeMatch && timeMatch[1] && timeMatch[2] && timeMatch[3]) {
        const hours = timeMatch[1]
        const minutes = timeMatch[2]
        const seconds = timeMatch[3]
        return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10)
      }
      // Try parsing as plain number
      return parseInt(uptime, 10) || 0
    }
    return 0
  }

  function parseDurationSeconds(duration: unknown): number {
    if (typeof duration === 'number') return duration
    if (typeof duration === 'string') {
      // Handle "HH:MM:SS" format
      const timeMatch = duration.match(/^(\d+):(\d+):(\d+)$/)
      if (timeMatch && timeMatch[1] && timeMatch[2] && timeMatch[3]) {
        const hours = timeMatch[1]
        const minutes = timeMatch[2]
        const seconds = timeMatch[3]
        return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10)
      }
      return parseInt(duration, 10) || 0
    }
    return 0
  }

  function parseDateTimeFields(dateStr: string, timeStr: string): Date {
    if (!dateStr || !timeStr) return new Date()
    try {
      // Combine date and time strings
      return new Date(`${dateStr} ${timeStr}`)
    } catch {
      return new Date()
    }
  }

  function parseModuleStatus(status: unknown): ModuleInfo['status'] {
    const str = String(status || '').toLowerCase()
    if (str.includes('running')) return 'Running'
    if (str.includes('stopped')) return 'Stopped'
    if (str.includes('failed')) return 'Failed'
    return 'Not Running'
  }

  function parseSupportLevel(level: unknown): ModuleInfo['supportLevel'] {
    const str = String(level || '').toLowerCase()
    if (str.includes('core')) return 'core'
    if (str.includes('extended')) return 'extended'
    if (str.includes('deprecated')) return 'deprecated'
    return undefined
  }

  // Watch for client changes
  watch(
    amiClientRef,
    (newClient, oldClient) => {
      if (oldClient) {
        stopPolling()
      }

      if (newClient) {
        // Initial refresh if autoRefresh is enabled
        if (autoRefresh) {
          refresh().catch((err) => {
            logger.error('Initial refresh failed', err)
          })
        }

        // Start polling if enabled
        if (enablePolling && statusPollInterval > 0) {
          startPolling()
        }
      }
    },
    { immediate: true }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling()
    channels.value.clear()
    modules.value.clear()
    bridges.value.clear()
  })

  return {
    // State
    coreStatus,
    channels,
    modules,
    bridges,
    isLoading,
    error,
    latency,

    // Computed
    channelList,
    moduleList,
    bridgeList,
    formattedUptime,
    isHealthy,
    totalChannels,
    totalBridges,

    // Actions
    getCoreStatus,
    getChannels,
    getModules,
    getBridges,
    reloadModule,
    loadModule,
    unloadModule,
    ping,
    originate,

    // Utilities
    refresh,
    startPolling,
    stopPolling,
    getChannel,
    hangupChannel,
  }
}
