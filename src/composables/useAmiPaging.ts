/**
 * AMI Paging/Intercom Composable
 *
 * Vue composable for Asterisk paging and intercom functionality via AMI.
 * Supports single extension paging, group paging, and duplex intercom.
 *
 * @module composables/useAmiPaging
 */

import { ref, computed, onUnmounted } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  PagingMode,
  PagingStatus,
  PageGroup,
  PagingSession,
  PageOptions,
  GroupPageOptions,
  UseAmiPagingOptions,
  UseAmiPagingReturn,
} from '@/types/paging.types'
import type { AmiMessage, AmiHangupEvent, AmiNewStateEvent } from '@/types/ami.types'
import { ChannelState } from '@/types/ami.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiPaging')

// Re-export types for convenience
export type {
  PagingMode,
  PagingStatus,
  PageGroup,
  PagingSession,
  PageOptions,
  GroupPageOptions,
  UseAmiPagingOptions,
  UseAmiPagingReturn,
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Validate extension format
 * Allows alphanumeric extensions with optional special chars: - _ .
 */
function isValidExtension(extension: string): boolean {
  if (!extension || extension.length === 0 || extension.length > 32) {
    return false
  }
  // Allow alphanumeric, hyphen, underscore, dot
  return /^[a-zA-Z0-9_.-]+$/.test(extension)
}

/**
 * AMI Paging Composable
 *
 * Provides reactive paging/intercom functionality for Vue components.
 * Supports single extension paging, group paging, and duplex intercom mode.
 *
 * @param client - AMI client instance (from useAmi().getClient())
 * @param options - Configuration options with sensible defaults
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * await ami.connect({ url: 'ws://pbx.example.com:8080' })
 *
 * const {
 *   status,
 *   isPaging,
 *   pageExtension,
 *   pageGroup,
 *   endPage,
 * } = useAmiPaging(ami.getClient()!, {
 *   defaultMode: 'simplex',
 *   defaultTimeout: 30,
 *   onPageStart: (session) => console.log('Paging started:', session.target),
 *   onPageEnd: (session) => console.log('Paging ended:', session.sessionId),
 * })
 *
 * // Page a single extension
 * await pageExtension('1001')
 *
 * // Page with duplex intercom (two-way audio)
 * await pageExtension('1002', { mode: 'duplex' })
 *
 * // Page a group
 * await pageGroup('sales-floor')
 *
 * // End active page
 * await endPage()
 * ```
 */
export function useAmiPaging(
  client: AmiClient | null,
  options: UseAmiPagingOptions = {}
): UseAmiPagingReturn {
  // ============================================================================
  // Configuration with defaults
  // ============================================================================

  const config = {
    defaultMode: options.defaultMode ?? 'simplex',
    defaultTimeout: options.defaultTimeout ?? 30,
    defaultContext: options.defaultContext ?? 'from-internal',
    defaultCallerId: options.defaultCallerId ?? 'Paging',
    autoAnswerHeader: options.autoAnswerHeader ?? 'Call-Info: answer-after=0',
    onPageStart: options.onPageStart,
    onPageConnect: options.onPageConnect,
    onPageEnd: options.onPageEnd,
    onError: options.onError,
  }

  // ============================================================================
  // State
  // ============================================================================

  const status = ref<PagingStatus>('idle')
  const activeSession = ref<PagingSession | null>(null)
  const pageGroups = ref<PageGroup[]>(options.pageGroups ?? [])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const history = ref<PagingSession[]>([])

  // Duration timer
  let durationTimer: ReturnType<typeof setInterval> | null = null
  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const isPaging = computed(() => status.value === 'paging' || status.value === 'connected')

  const isConnected = computed(() => status.value === 'connected')

  const currentDuration = computed(() => activeSession.value?.duration ?? 0)

  const enabledGroups = computed(() => pageGroups.value.filter((g) => g.enabled))

  const groupCount = computed(() => pageGroups.value.length)

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Start duration timer
   */
  const startDurationTimer = (): void => {
    if (durationTimer) {
      clearInterval(durationTimer)
    }
    durationTimer = setInterval(() => {
      if (activeSession.value) {
        activeSession.value.duration = Math.floor(
          (Date.now() - activeSession.value.startTime.getTime()) / 1000
        )
      }
    }, 1000)
  }

  /**
   * Stop duration timer
   */
  const stopDurationTimer = (): void => {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  /**
   * Update session status
   */
  const updateSessionStatus = (newStatus: PagingStatus, errorMsg?: string): void => {
    status.value = newStatus
    if (activeSession.value) {
      activeSession.value.status = newStatus
      if (errorMsg) {
        activeSession.value.error = errorMsg
      }
    }
  }

  /**
   * End session and add to history
   */
  const finalizeSession = (): void => {
    if (activeSession.value) {
      activeSession.value.endTime = new Date()
      activeSession.value.duration = Math.floor(
        (activeSession.value.endTime.getTime() - activeSession.value.startTime.getTime()) / 1000
      )

      // Add to history
      history.value.unshift({ ...activeSession.value })

      // Limit history to 100 items
      if (history.value.length > 100) {
        history.value = history.value.slice(0, 100)
      }

      config.onPageEnd?.(activeSession.value)
    }

    stopDurationTimer()
    activeSession.value = null
    status.value = 'idle'
    error.value = null
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Page a single extension
   */
  const pageExtension = async (
    extension: string,
    pageOptions: PageOptions = {}
  ): Promise<PagingSession> => {
    if (!client) {
      throw new Error('AMI client not connected')
    }

    if (isPaging.value) {
      throw new Error('Already paging - end current page first')
    }

    if (!isValidExtension(extension)) {
      throw new Error('Invalid extension format')
    }

    const mode = pageOptions.mode ?? config.defaultMode
    const timeout = pageOptions.timeout ?? config.defaultTimeout
    const callerId = pageOptions.callerId ?? config.defaultCallerId
    // Context is available for future use when using exten/context/priority
    // const context = pageOptions.context ?? config.defaultContext

    // Create session
    const session: PagingSession = {
      sessionId: generateSessionId(),
      target: extension,
      isGroup: false,
      mode,
      status: 'paging',
      startTime: new Date(),
      duration: 0,
    }

    activeSession.value = session
    status.value = 'paging'
    isLoading.value = true
    error.value = null

    try {
      // Build variables for auto-answer
      const variables: Record<string, string> = {
        ...(pageOptions.variables ?? {}),
      }

      if (pageOptions.autoAnswer !== false) {
        // Add auto-answer header for supported endpoints
        variables['PJSIP_HEADER(add,Alert-Info)'] = 'info=auto-answer'
        variables['PJSIP_HEADER(add,Call-Info)'] = 'answer-after=0'
      }

      if (mode === 'simplex') {
        // Simplex mode: Use Page application for one-way audio
        const result = await client.originate({
          channel: `PJSIP/${extension}`,
          application: 'Page',
          data: `PJSIP/${extension},d`, // d = duplex (required for any audio)
          callerId: `${callerId} <${extension}>`,
          timeout: timeout * 1000,
          variables,
          async: true,
        })

        if (!result.success) {
          throw new Error(result.message || 'Failed to initiate page')
        }

        session.channel = result.channel
      } else {
        // Duplex mode: Direct call with auto-answer
        const result = await client.originate({
          channel: `PJSIP/${extension}`,
          application: 'Echo', // Echo for testing, use proper app in production
          callerId: `${callerId} <${extension}>`,
          timeout: timeout * 1000,
          variables,
          async: true,
        })

        if (!result.success) {
          throw new Error(result.message || 'Failed to initiate duplex intercom')
        }

        session.channel = result.channel
      }

      startDurationTimer()
      config.onPageStart?.(session)

      logger.debug('Page initiated', { extension, mode, sessionId: session.sessionId })

      return session
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to page extension'
      error.value = errorMsg
      updateSessionStatus('error', errorMsg)
      config.onError?.(errorMsg, session)
      finalizeSession()
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Page a group by ID
   */
  const pageGroup = async (
    groupId: string,
    groupOptions: GroupPageOptions = {}
  ): Promise<PagingSession> => {
    const group = pageGroups.value.find((g) => g.id === groupId)
    if (!group) {
      throw new Error(`Page group not found: ${groupId}`)
    }

    if (!group.enabled) {
      throw new Error(`Page group is disabled: ${groupId}`)
    }

    let extensions = [...group.extensions]

    // Apply filter if provided
    if (groupOptions.filterExtensions?.length) {
      const filterExtensions = groupOptions.filterExtensions
      extensions = extensions.filter((ext) => filterExtensions.includes(ext))
    }

    if (extensions.length === 0) {
      throw new Error('No extensions to page in group')
    }

    // Merge group options with provided options
    const mergedOptions: GroupPageOptions = {
      mode: groupOptions.mode ?? group.mode,
      callerId: groupOptions.callerId ?? group.callerId ?? config.defaultCallerId,
      timeout: groupOptions.timeout ?? group.timeout ?? config.defaultTimeout,
      ...groupOptions,
    }

    return pageExtensions(extensions, mergedOptions)
  }

  /**
   * Page multiple extensions directly
   */
  const pageExtensions = async (
    extensions: string[],
    groupOptions: GroupPageOptions = {}
  ): Promise<PagingSession> => {
    if (!client) {
      throw new Error('AMI client not connected')
    }

    if (isPaging.value) {
      throw new Error('Already paging - end current page first')
    }

    if (extensions.length === 0) {
      throw new Error('No extensions provided')
    }

    // Validate all extensions
    const invalidExtensions = extensions.filter((ext) => !isValidExtension(ext))
    if (invalidExtensions.length > 0) {
      throw new Error(`Invalid extension format: ${invalidExtensions.join(', ')}`)
    }

    const mode = groupOptions.mode ?? config.defaultMode
    const timeout = groupOptions.timeout ?? config.defaultTimeout
    const callerId = groupOptions.callerId ?? config.defaultCallerId
    const maxChannels = groupOptions.maxChannels ?? extensions.length

    // Limit extensions if maxChannels is set
    const targetExtensions = extensions.slice(0, maxChannels)

    // Create session
    const session: PagingSession = {
      sessionId: generateSessionId(),
      target: targetExtensions.join(','),
      isGroup: true,
      mode,
      status: 'paging',
      startTime: new Date(),
      duration: 0,
      answeredExtensions: [],
    }

    activeSession.value = session
    status.value = 'paging'
    isLoading.value = true
    error.value = null

    try {
      // Build variables for auto-answer
      const variables: Record<string, string> = {
        ...(groupOptions.variables ?? {}),
      }

      if (groupOptions.autoAnswer !== false) {
        variables['PJSIP_HEADER(add,Alert-Info)'] = 'info=auto-answer'
        variables['PJSIP_HEADER(add,Call-Info)'] = 'answer-after=0'
      }

      // Use Page application for group paging
      const pageData = targetExtensions.map((ext) => `PJSIP/${ext}`).join('&')
      const pageOptions = mode === 'duplex' ? 'd' : '' // d = duplex

      const result = await client.originate({
        channel: 'Local/s@page-group',
        application: 'Page',
        data: `${pageData},${pageOptions}`,
        callerId: `${callerId}`,
        timeout: timeout * 1000,
        variables,
        async: true,
      })

      if (!result.success) {
        throw new Error(result.message || 'Failed to initiate group page')
      }

      session.channel = result.channel
      startDurationTimer()
      config.onPageStart?.(session)

      logger.debug('Group page initiated', {
        extensions: targetExtensions,
        mode,
        sessionId: session.sessionId,
      })

      return session
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to page extensions'
      error.value = errorMsg
      updateSessionStatus('error', errorMsg)
      config.onError?.(errorMsg, session)
      finalizeSession()
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * End active paging session
   */
  const endPage = async (): Promise<void> => {
    if (!activeSession.value) {
      return
    }

    if (!client) {
      throw new Error('AMI client not connected')
    }

    const channel = activeSession.value.channel
    if (channel) {
      try {
        await client.hangupChannel(channel)
      } catch (err) {
        logger.warn('Failed to hangup paging channel', err)
      }
    }

    finalizeSession()
    logger.debug('Page ended')
  }

  /**
   * Toggle page (start/stop)
   */
  const togglePage = async (
    target: string,
    isGroup = false,
    toggleOptions: PageOptions = {}
  ): Promise<void> => {
    if (isPaging.value) {
      await endPage()
    } else if (isGroup) {
      await pageGroup(target, toggleOptions)
    } else {
      await pageExtension(target, toggleOptions)
    }
  }

  // ============================================================================
  // Group Management
  // ============================================================================

  /**
   * Add a page group
   */
  const addGroup = (group: PageGroup): void => {
    if (pageGroups.value.some((g) => g.id === group.id)) {
      throw new Error(`Group with ID ${group.id} already exists`)
    }
    pageGroups.value.push(group)
    logger.debug('Page group added', { groupId: group.id })
  }

  /**
   * Update a page group
   */
  const updateGroup = (groupId: string, updates: Partial<PageGroup>): void => {
    const idx = pageGroups.value.findIndex((g) => g.id === groupId)
    if (idx === -1) {
      throw new Error(`Group not found: ${groupId}`)
    }
    const currentGroup = pageGroups.value[idx]
    if (!currentGroup) {
      throw new Error(`Group not found at index: ${idx}`)
    }
    // Explicitly construct updated group to satisfy TypeScript
    const updatedGroup: PageGroup = {
      id: updates.id ?? currentGroup.id,
      name: updates.name ?? currentGroup.name,
      extensions: updates.extensions ?? currentGroup.extensions,
      mode: updates.mode ?? currentGroup.mode,
      enabled: updates.enabled ?? currentGroup.enabled,
      description: updates.description ?? currentGroup.description,
      callerId: updates.callerId ?? currentGroup.callerId,
      timeout: updates.timeout ?? currentGroup.timeout,
    }
    pageGroups.value[idx] = updatedGroup
    logger.debug('Page group updated', { groupId })
  }

  /**
   * Remove a page group
   */
  const removeGroup = (groupId: string): void => {
    const idx = pageGroups.value.findIndex((g) => g.id === groupId)
    if (idx === -1) {
      throw new Error(`Group not found: ${groupId}`)
    }
    pageGroups.value.splice(idx, 1)
    logger.debug('Page group removed', { groupId })
  }

  /**
   * Get a page group by ID
   */
  const getGroup = (groupId: string): PageGroup | undefined => {
    return pageGroups.value.find((g) => g.id === groupId)
  }

  /**
   * Toggle group enabled state
   */
  const toggleGroupEnabled = (groupId: string): void => {
    const group = pageGroups.value.find((g) => g.id === groupId)
    if (group) {
      group.enabled = !group.enabled
      logger.debug('Page group toggled', { groupId, enabled: group.enabled })
    }
  }

  // ============================================================================
  // History Methods
  // ============================================================================

  /**
   * Clear paging history
   */
  const clearHistory = (): void => {
    history.value = []
    logger.debug('Paging history cleared')
  }

  /**
   * Get history for specific target
   */
  const getHistoryForTarget = (target: string): PagingSession[] => {
    return history.value.filter((s) => s.target === target || s.target.includes(target))
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleHangup = (event: AmiMessage<AmiHangupEvent>): void => {
    if (!activeSession.value) return

    const data = event.data
    const channel = data.Channel || ''

    // Check if this hangup is for our paging channel
    if (activeSession.value.channel && channel.includes(activeSession.value.channel)) {
      logger.debug('Paging channel hung up', { channel })
      finalizeSession()
    }
  }

  const handleNewState = (event: AmiMessage<AmiNewStateEvent>): void => {
    if (!activeSession.value) return

    const data = event.data
    const state = parseInt(data.ChannelState || '0', 10) as ChannelState

    // Track when page connects (channel goes to Up state)
    if (state === ChannelState.Up && status.value === 'paging') {
      status.value = 'connected'
      activeSession.value.status = 'connected'
      config.onPageConnect?.(activeSession.value)
      logger.debug('Page connected')
    }
  }

  // ============================================================================
  // Setup Event Listeners
  // ============================================================================

  const setupEventListeners = (): void => {
    if (!client) return

    const hangupHandler = (event: AmiMessage<AmiHangupEvent>) => handleHangup(event)
    const stateHandler = (event: AmiMessage<AmiNewStateEvent>) => handleNewState(event)

    client.on('hangup', hangupHandler)
    client.on('newState', stateHandler)

    eventCleanups.push(() => {
      client.off('hangup', hangupHandler)
      client.off('newState', stateHandler)
    })
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  if (client) {
    setupEventListeners()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    stopDurationTimer()
    eventCleanups.forEach((cleanup) => cleanup())

    // End any active page
    if (activeSession.value && client) {
      endPage().catch(() => {
        // Ignore errors during cleanup
      })
    }
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive State
    status,
    activeSession,
    pageGroups,
    isLoading,
    error,
    history,

    // Computed
    isPaging,
    isConnected,
    currentDuration,
    enabledGroups,
    groupCount,

    // Methods
    pageExtension,
    pageGroup,
    pageExtensions,
    endPage,
    togglePage,

    // Group Management
    addGroup,
    updateGroup,
    removeGroup,
    getGroup,
    toggleGroupEnabled,

    // Utility
    clearHistory,
    getHistoryForTarget,
  }
}
