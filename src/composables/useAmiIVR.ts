/**
 * AMI IVR Composable
 *
 * Vue composable for monitoring and controlling IVR systems via Asterisk Manager Interface.
 * Provides caller tracking, menu navigation monitoring, breakout control, and statistics.
 *
 * @module composables/useAmiIVR
 *
 * @example
 * ```typescript
 * import { useAmi, useAmiIVR } from 'vuesip'
 *
 * const ami = useAmi()
 * const {
 *   ivrs,
 *   ivrList,
 *   allCallers,
 *   startMonitoring,
 *   breakoutCaller,
 *   getStats
 * } = useAmiIVR(ami.getClient(), {
 *   ivrIds: ['ivr-main', 'ivr-support'],
 *   onCallerEntered: (ivrId, caller) => {
 *     console.log(`Caller ${caller.callerIdNum} entered IVR ${ivrId}`)
 *   },
 *   onTimeout: (ivrId, caller) => {
 *     console.log(`Caller ${caller.callerIdNum} timed out in IVR`)
 *   }
 * })
 *
 * startMonitoring()
 *
 * // Breakout a caller to an extension
 * await breakoutCaller('ivr-main', 'PJSIP/1001-00000001', '2001')
 * ```
 */

import { ref, computed, onUnmounted, watch, type Ref } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  IVR,
  IVRMenu,
  IVRMenuOption,
  IVRCaller,
  IVRStats,
  IVREvent,
  IVREventType,
  UseAmiIVROptions,
  UseAmiIVRReturn,
  BreakoutResult,
} from '@/types/ivr.types'
import type { AmiEventData } from '@/types/ami.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiIVR')

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input.replace(/[<>'";&|`$\\]/g, '').trim().slice(0, 255)
}

/**
 * Validate IVR ID format
 */
function isValidIVRId(ivrId: string): boolean {
  if (!ivrId || typeof ivrId !== 'string') return false
  return /^[a-zA-Z0-9_-]+$/.test(ivrId) && ivrId.length <= 64
}

/**
 * Validate extension/destination format
 */
function isValidDestination(dest: string): boolean {
  if (!dest || typeof dest !== 'string') return false
  return /^[a-zA-Z0-9_*#-]+$/.test(dest) && dest.length <= 32
}

/**
 * Validate channel format
 */
function isValidChannel(channel: string): boolean {
  if (!channel || typeof channel !== 'string') return false
  return /^[a-zA-Z0-9/_@.-]+$/.test(channel) && channel.length <= 128
}

/**
 * Create empty IVR stats
 */
function createEmptyStats(): IVRStats {
  return {
    totalCallers: 0,
    currentCallers: 0,
    successfulExits: 0,
    abandonedCalls: 0,
    timedOutCalls: 0,
    avgTimeInIVR: 0,
    avgMenuSelections: 0,
    peakCallers: 0,
    lastCallTime: undefined,
  }
}

/**
 * Create empty IVR menu
 */
function createEmptyMenu(id: string, name: string, isRoot: boolean = false): IVRMenu {
  return {
    id: sanitizeInput(id),
    name: sanitizeInput(name),
    timeout: 10,
    maxRetries: 3,
    options: [],
    isRoot,
    enabled: true,
    lastUpdated: new Date(),
  }
}

/**
 * Create empty IVR
 */
function createEmptyIVR(id: string, name: string, extension: string): IVR {
  const sanitizedId = sanitizeInput(id)
  const rootMenuId = `${sanitizedId}-main`
  const menus = new Map<string, IVRMenu>()
  menus.set(rootMenuId, createEmptyMenu(rootMenuId, 'Main Menu', true))

  return {
    id: sanitizedId,
    name: sanitizeInput(name),
    extension: sanitizeInput(extension),
    rootMenuId,
    menus,
    callers: new Map(),
    stats: createEmptyStats(),
    enabled: true,
    lastUpdated: new Date(),
  }
}

/**
 * AMI IVR Composable
 *
 * @param client - Ref to AMI client instance
 * @param options - Configuration options
 * @returns IVR management interface
 */
export function useAmiIVR(
  client: Ref<AmiClient | null>,
  options: UseAmiIVROptions = {}
): UseAmiIVRReturn {
  const {
    autoStart = false,
    refreshInterval = 30000,
    ivrIds = [],
    onEvent,
    onCallerEntered,
    onCallerExited,
    onTimeout,
    onError,
  } = options

  // State
  const ivrs = ref<Map<string, IVR>>(new Map())
  const selectedIVR = ref<IVR | null>(null)
  const isMonitoring = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Internal state
  const eventListeners: Array<() => void> = []
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // Track time-based stats
  const callerEnterTimes = new Map<string, number>()
  const callerMenuCounts = new Map<string, number>()

  // Computed
  const ivrList = computed(() => Array.from(ivrs.value.values()))

  const totalCallers = computed(() =>
    ivrList.value.reduce((sum, ivr) => sum + ivr.callers.size, 0)
  )

  const allCallers = computed(() => {
    const callers: IVRCaller[] = []
    for (const ivr of ivrs.value.values()) {
      callers.push(...ivr.callers.values())
    }
    return callers
  })

  const activeIVRs = computed(() => ivrList.value.filter((ivr) => ivr.callers.size > 0))

  const disabledIVRs = computed(() => ivrList.value.filter((ivr) => !ivr.enabled))

  /**
   * Emit an IVR event
   */
  function emitEvent(type: IVREventType, ivrId: string, data?: Partial<IVREvent>): void {
    const event: IVREvent = {
      type,
      ivrId,
      timestamp: new Date(),
      ...data,
    }
    onEvent?.(event)
  }

  /**
   * Get or create an IVR
   */
  function getOrCreateIVR(id: string, name?: string, extension?: string): IVR {
    if (!isValidIVRId(id)) {
      const sanitizedId = sanitizeInput(id) || 'default'
      let ivr = ivrs.value.get(sanitizedId)
      if (!ivr) {
        ivr = createEmptyIVR(sanitizedId, name || sanitizedId, extension || sanitizedId)
        ivrs.value.set(sanitizedId, ivr)
      }
      return ivr
    }

    let ivr = ivrs.value.get(id)
    if (!ivr) {
      ivr = createEmptyIVR(id, name || id, extension || id)
      ivrs.value.set(id, ivr)
    }
    return ivr
  }

  /**
   * Create a new IVR caller entry
   */
  function createCaller(
    channel: string,
    ivrId: string,
    callerIdNum: string,
    callerIdName: string
  ): IVRCaller {
    const ivr = ivrs.value.get(ivrId)
    const now = new Date()

    return {
      id: sanitizeInput(channel),
      channel: sanitizeInput(channel),
      callerIdNum: sanitizeInput(callerIdNum),
      callerIdName: sanitizeInput(callerIdName),
      ivrId: sanitizeInput(ivrId),
      currentMenuId: ivr?.rootMenuId || `${ivrId}-main`,
      state: 'entering',
      enteredAt: now,
      menuEnteredAt: now,
      navigationHistory: [ivr?.rootMenuId || `${ivrId}-main`],
      dtmfInput: '',
      invalidAttempts: 0,
      timedOut: false,
      lastActivity: now,
    }
  }

  /**
   * Handle caller entering IVR
   */
  function handleCallerEntered(
    channel: string,
    ivrId: string,
    callerIdNum: string,
    callerIdName: string
  ): void {
    if (!isValidChannel(channel) || !isValidIVRId(ivrId)) return

    const ivr = getOrCreateIVR(ivrId)
    const caller = createCaller(channel, ivrId, callerIdNum, callerIdName)

    ivr.callers.set(channel, caller)
    ivr.stats.totalCallers++
    ivr.stats.currentCallers = ivr.callers.size

    // Track peak callers
    if (ivr.callers.size > ivr.stats.peakCallers) {
      ivr.stats.peakCallers = ivr.callers.size
    }

    // Track enter time for stats
    callerEnterTimes.set(channel, Date.now())
    callerMenuCounts.set(channel, 1)

    ivr.lastUpdated = new Date()

    emitEvent('caller_entered', ivrId, { callerId: channel })
    onCallerEntered?.(ivrId, caller)
    logger.info('Caller entered IVR', { ivrId, channel, callerIdNum })
  }

  /**
   * Handle caller exiting IVR
   */
  function handleCallerExited(
    channel: string,
    ivrId: string,
    destination?: string,
    abandoned: boolean = false
  ): void {
    const ivr = ivrs.value.get(ivrId)
    if (!ivr) return

    const caller = ivr.callers.get(channel)
    if (!caller) return

    // Update stats
    const enterTime = callerEnterTimes.get(channel)
    if (enterTime) {
      const timeInIVR = (Date.now() - enterTime) / 1000
      const totalTime = ivr.stats.avgTimeInIVR * (ivr.stats.totalCallers - 1) + timeInIVR
      ivr.stats.avgTimeInIVR = totalTime / ivr.stats.totalCallers
    }

    const menuCount = callerMenuCounts.get(channel) || 1
    const totalMenus =
      ivr.stats.avgMenuSelections * (ivr.stats.totalCallers - 1) + menuCount
    ivr.stats.avgMenuSelections = totalMenus / ivr.stats.totalCallers

    if (abandoned) {
      ivr.stats.abandonedCalls++
    } else if (caller.timedOut) {
      ivr.stats.timedOutCalls++
    } else {
      ivr.stats.successfulExits++
    }

    ivr.stats.lastCallTime = new Date()
    ivr.callers.delete(channel)
    ivr.stats.currentCallers = ivr.callers.size
    ivr.lastUpdated = new Date()

    // Cleanup tracking
    callerEnterTimes.delete(channel)
    callerMenuCounts.delete(channel)

    const eventType = abandoned ? 'caller_abandoned' : 'caller_exited'
    emitEvent(eventType, ivrId, { callerId: channel, destination })
    onCallerExited?.(ivrId, channel, destination)
    logger.info('Caller exited IVR', { ivrId, channel, abandoned, destination })
  }

  /**
   * Handle DTMF input
   */
  function handleDTMF(channel: string, digit: string): void {
    // Find which IVR this caller is in
    for (const ivr of ivrs.value.values()) {
      const caller = ivr.callers.get(channel)
      if (caller) {
        caller.dtmfInput += digit
        caller.state = 'inputting'
        caller.lastActivity = new Date()
        ivr.lastUpdated = new Date()

        emitEvent('dtmf_received', ivr.id, {
          callerId: channel,
          digit,
          menuId: caller.currentMenuId,
        })

        // Check if input matches any menu option
        const menu = ivr.menus.get(caller.currentMenuId)
        if (menu) {
          const option = menu.options.find((o) => o.digit === digit)
          if (option && option.enabled) {
            option.timesSelected++

            // Update most popular option
            if (
              !ivr.stats.mostPopularOption ||
              option.timesSelected > ivr.stats.mostPopularOption.count
            ) {
              ivr.stats.mostPopularOption = {
                menuId: caller.currentMenuId,
                digit,
                count: option.timesSelected,
              }
            }

            emitEvent('option_selected', ivr.id, {
              callerId: channel,
              digit,
              menuId: caller.currentMenuId,
              destination: option.destination,
            })

            // Handle option type
            if (option.type === 'menu') {
              // Navigate to submenu
              caller.navigationHistory.push(option.destination)
              caller.currentMenuId = option.destination
              caller.menuEnteredAt = new Date()
              caller.dtmfInput = ''
              caller.state = 'navigating'

              const count = callerMenuCounts.get(channel) || 0
              callerMenuCounts.set(channel, count + 1)

              emitEvent('menu_entered', ivr.id, {
                callerId: channel,
                menuId: option.destination,
              })
            } else if (
              option.type === 'extension' ||
              option.type === 'queue' ||
              option.type === 'ringgroup'
            ) {
              // Transfer to destination
              caller.state = 'transferring'
              emitEvent('caller_transferred', ivr.id, {
                callerId: channel,
                destination: option.destination,
              })
            }
          } else {
            // Invalid input
            caller.invalidAttempts++
            emitEvent('invalid_input', ivr.id, {
              callerId: channel,
              digit,
              menuId: caller.currentMenuId,
            })

            if (caller.invalidAttempts >= menu.maxRetries) {
              caller.timedOut = true
              caller.state = 'timeout'
              emitEvent('timeout', ivr.id, { callerId: channel })
              onTimeout?.(ivr.id, caller)
            }
          }
        }

        break
      }
    }
  }

  /**
   * Handle VarSet AMI event (for IVR context)
   */
  function handleVarSet(event: Record<string, string>): void {
    const channel = event.Channel
    const variable = event.Variable
    const value = event.Value

    if (!channel || !variable) return

    // Check for IVR-related variables
    if ((variable === 'IVR_CONTEXT' || variable === 'IVRID') && value) {
      // Caller entering IVR
      const ivrId = value

      // If specific IVR IDs are configured, only process those
      if (ivrIds.length > 0 && !ivrIds.includes(ivrId)) {
        return
      }

      const callerIdNum = event.CallerIDNum || 'Unknown'
      const callerIdName = event.CallerIDName || ''
      handleCallerEntered(channel, ivrId, callerIdNum, callerIdName)
    } else if (variable === 'IVR_EXIT' || variable === 'IVR_DESTINATION') {
      // Caller exiting IVR
      for (const ivr of ivrs.value.values()) {
        if (ivr.callers.has(channel)) {
          handleCallerExited(channel, ivr.id, value, false)
          break
        }
      }
    }
  }

  /**
   * Handle DTMF AMI event
   */
  function handleDTMFEvent(event: Record<string, string>): void {
    const channel = event.Channel
    const digit = event.Digit

    if (!channel || !digit) return
    if (!/^[0-9*#]$/.test(digit)) return

    handleDTMF(channel, digit)
  }

  /**
   * Handle Hangup AMI event
   */
  function handleHangup(event: Record<string, string>): void {
    const channel = event.Channel

    if (!channel) return

    // Check if caller was in any IVR
    for (const ivr of ivrs.value.values()) {
      if (ivr.callers.has(channel)) {
        handleCallerExited(channel, ivr.id, undefined, true)
        break
      }
    }
  }

  /**
   * Handle Newchannel AMI event (potential IVR entry)
   */
  function handleNewchannel(event: Record<string, string>): void {
    const channel = event.Channel
    const context = event.Context
    const exten = event.Exten

    if (!channel || !context) return

    // Check if this is an IVR context
    if (context.toLowerCase().includes('ivr') || context.includes('auto-attendant')) {
      // Check against monitored IVR IDs
      for (const ivrId of ivrIds) {
        if (context.includes(ivrId) || exten === ivrId) {
          const callerIdNum = event.CallerIDNum || 'Unknown'
          const callerIdName = event.CallerIDName || ''
          handleCallerEntered(channel, ivrId, callerIdNum, callerIdName)
          break
        }
      }

      // If no specific IVR ID matched but it's an IVR context, try to match by extension
      if (exten && isValidIVRId(exten)) {
        const callerIdNum = event.CallerIDNum || 'Unknown'
        const callerIdName = event.CallerIDName || ''
        handleCallerEntered(channel, exten, callerIdNum, callerIdName)
      }
    }
  }

  /**
   * Setup AMI event listeners
   */
  function setupEventListeners(): void {
    const amiClient = client.value
    if (!amiClient) return

    const eventHandler = (message: { data: AmiEventData }) => {
      const event = message.data
      const eventName = event.Event

      switch (eventName) {
        case 'VarSet':
          handleVarSet(event as unknown as Record<string, string>)
          break
        case 'DTMFEnd':
        case 'DTMF':
          handleDTMFEvent(event as unknown as Record<string, string>)
          break
        case 'Hangup':
          handleHangup(event as unknown as Record<string, string>)
          break
        case 'Newchannel':
          handleNewchannel(event as unknown as Record<string, string>)
          break
      }
    }

    amiClient.on('event', eventHandler)
    eventListeners.push(() => amiClient.off('event', eventHandler))
  }

  /**
   * Remove event listeners
   */
  function removeEventListeners(): void {
    eventListeners.forEach((cleanup) => cleanup())
    eventListeners.length = 0
  }

  /**
   * Refresh IVR data
   */
  async function refresh(): Promise<void> {
    const amiClient = client.value
    if (!amiClient) {
      error.value = 'AMI client not available'
      onError?.('AMI client not available')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Update last updated timestamps
      for (const ivr of ivrs.value.values()) {
        ivr.lastUpdated = new Date()
      }

      logger.debug('IVR data refreshed')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh IVR data'
      error.value = message
      onError?.(message)
      logger.error('Failed to refresh IVR data:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Start monitoring IVRs
   */
  function startMonitoring(): void {
    if (isMonitoring.value) return

    isMonitoring.value = true
    setupEventListeners()

    // Initialize IVRs if IDs provided
    if (ivrIds.length > 0) {
      for (const id of ivrIds) {
        if (isValidIVRId(id)) {
          getOrCreateIVR(id)
        }
      }
    }

    // Start refresh timer
    if (refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        refresh()
      }, refreshInterval)
    }

    // Initial refresh
    refresh()

    logger.info('IVR monitoring started', { ivrIds })
  }

  /**
   * Stop monitoring IVRs
   */
  function stopMonitoring(): void {
    if (!isMonitoring.value) return

    isMonitoring.value = false
    removeEventListeners()

    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }

    logger.info('IVR monitoring stopped')
  }

  /**
   * Get a specific IVR by ID
   */
  function getIVR(ivrId: string): IVR | null {
    if (!isValidIVRId(ivrId)) return null
    return ivrs.value.get(ivrId) || null
  }

  /**
   * Select an IVR for detailed view
   */
  function selectIVR(ivrId: string | null): void {
    if (!ivrId) {
      selectedIVR.value = null
      return
    }
    if (!isValidIVRId(ivrId)) return
    selectedIVR.value = ivrs.value.get(ivrId) || null
  }

  /**
   * Get callers in a specific IVR
   */
  function getCallers(ivrId: string): IVRCaller[] {
    if (!isValidIVRId(ivrId)) return []
    const ivr = ivrs.value.get(ivrId)
    return ivr ? Array.from(ivr.callers.values()) : []
  }

  /**
   * Get a specific caller
   */
  function getCaller(ivrId: string, callerId: string): IVRCaller | null {
    if (!isValidIVRId(ivrId) || !isValidChannel(callerId)) return null
    const ivr = ivrs.value.get(ivrId)
    return ivr?.callers.get(callerId) || null
  }

  /**
   * Breakout a caller from IVR to a destination
   */
  async function breakoutCaller(
    ivrId: string,
    callerId: string,
    destination: string
  ): Promise<BreakoutResult> {
    if (!isValidIVRId(ivrId)) {
      return { success: false, channel: callerId, error: 'Invalid IVR ID' }
    }
    if (!isValidChannel(callerId)) {
      return { success: false, channel: callerId, error: 'Invalid channel' }
    }
    if (!isValidDestination(destination)) {
      return { success: false, channel: callerId, error: 'Invalid destination' }
    }

    const amiClient = client.value
    if (!amiClient) {
      return { success: false, channel: callerId, error: 'AMI client not available' }
    }

    const ivr = ivrs.value.get(ivrId)
    if (!ivr) {
      return { success: false, channel: callerId, error: 'IVR not found' }
    }

    const caller = ivr.callers.get(callerId)
    if (!caller) {
      return { success: false, channel: callerId, error: 'Caller not found in IVR' }
    }

    try {
      // Send redirect action to transfer caller out of IVR
      await amiClient.sendAction({
        Action: 'Redirect',
        Channel: callerId,
        Context: 'from-internal',
        Exten: destination,
        Priority: '1',
      })

      // Update caller state
      caller.state = 'transferring'
      emitEvent('breakout_initiated', ivrId, {
        callerId,
        destination,
      })

      // Remove caller from IVR
      handleCallerExited(callerId, ivrId, destination, false)

      logger.info('Caller breakout initiated', { ivrId, callerId, destination })

      return { success: true, channel: callerId, destination }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Breakout failed'
      logger.error('Breakout failed:', err)
      return { success: false, channel: callerId, error: message }
    }
  }

  /**
   * Breakout all callers from an IVR
   */
  async function breakoutAllCallers(
    ivrId: string,
    destination: string
  ): Promise<BreakoutResult[]> {
    if (!isValidIVRId(ivrId)) {
      return [{ success: false, channel: '', error: 'Invalid IVR ID' }]
    }

    const ivr = ivrs.value.get(ivrId)
    if (!ivr) {
      return [{ success: false, channel: '', error: 'IVR not found' }]
    }

    const results: BreakoutResult[] = []
    const callerIds = Array.from(ivr.callers.keys())

    for (const callerId of callerIds) {
      const result = await breakoutCaller(ivrId, callerId, destination)
      results.push(result)
    }

    return results
  }

  /**
   * Enable an IVR
   */
  async function enableIVR(ivrId: string): Promise<boolean> {
    if (!isValidIVRId(ivrId)) return false

    const ivr = ivrs.value.get(ivrId)
    if (!ivr) return false

    ivr.enabled = true
    ivr.lastUpdated = new Date()

    emitEvent('ivr_enabled', ivrId)
    logger.info('IVR enabled', { ivrId })

    return true
  }

  /**
   * Disable an IVR
   */
  async function disableIVR(ivrId: string): Promise<boolean> {
    if (!isValidIVRId(ivrId)) return false

    const ivr = ivrs.value.get(ivrId)
    if (!ivr) return false

    ivr.enabled = false
    ivr.lastUpdated = new Date()

    emitEvent('ivr_disabled', ivrId)
    logger.info('IVR disabled', { ivrId })

    return true
  }

  /**
   * Get IVR statistics
   */
  function getStats(ivrId: string): IVRStats | null {
    if (!isValidIVRId(ivrId)) return null
    const ivr = ivrs.value.get(ivrId)
    return ivr?.stats ?? null
  }

  /**
   * Clear statistics for an IVR
   */
  function clearStats(ivrId: string): void {
    if (!isValidIVRId(ivrId)) return

    const ivr = ivrs.value.get(ivrId)
    if (!ivr) return

    ivr.stats = createEmptyStats()
    ivr.stats.currentCallers = ivr.callers.size

    // Clear menu option stats
    for (const menu of ivr.menus.values()) {
      for (const option of menu.options) {
        option.timesSelected = 0
      }
    }

    ivr.lastUpdated = new Date()
    logger.info('IVR stats cleared', { ivrId })
  }

  /**
   * Validate menu ID format
   */
  function isValidMenuId(menuId: string): boolean {
    if (!menuId || typeof menuId !== 'string') return false
    return /^[a-zA-Z0-9_-]+$/.test(menuId) && menuId.length <= 64
  }

  /**
   * Get menu option statistics
   */
  function getMenuStats(ivrId: string, menuId: string): IVRMenuOption[] | null {
    if (!isValidIVRId(ivrId)) return null
    if (!isValidMenuId(menuId)) return null

    const ivr = ivrs.value.get(ivrId)
    if (!ivr) return null

    const menu = ivr.menus.get(menuId)
    return menu?.options ?? null
  }

  /**
   * Track DTMF input for a caller (public method for external use)
   */
  function trackDTMF(channel: string, digit: string): void {
    if (!isValidChannel(channel)) return
    if (!/^[0-9*#]$/.test(digit)) return
    handleDTMF(channel, digit)
  }

  // Watch for client changes
  watch(client, (newClient, oldClient) => {
    if (oldClient && isMonitoring.value) {
      removeEventListeners()
    }
    if (newClient && isMonitoring.value) {
      setupEventListeners()
    }
  })

  // Auto-start if enabled
  if (autoStart) {
    startMonitoring()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    ivrs,
    selectedIVR,
    isMonitoring,
    isLoading,
    error,

    // Computed
    ivrList,
    totalCallers,
    allCallers,
    activeIVRs,
    disabledIVRs,

    // Methods
    startMonitoring,
    stopMonitoring,
    refresh,
    getIVR,
    selectIVR,
    getCallers,
    getCaller,
    breakoutCaller,
    breakoutAllCallers,
    enableIVR,
    disableIVR,
    getStats,
    clearStats,
    getMenuStats,
    trackDTMF,
  }
}

export type { UseAmiIVRReturn }
