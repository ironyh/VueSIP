/**
 * AMI Originate Composable
 *
 * Vue composable for click-to-call and outbound call origination via Asterisk AMI.
 * Provides call initiation, progress tracking, and event-based state management.
 *
 * @module composables/useAmiOriginate
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction, AmiMessage, AmiEventData } from '@/types/ami.types'
import type {
  AmiOriginateOptions,
  AmiOriginateResult,
  OriginateProgress,
  OriginateState,
  UseAmiOriginateOptions,
  UseAmiOriginateReturn,
  AmiOriginateResponseEvent,
  AmiDialBeginEvent,
  AmiDialEndEvent,
} from '@/types/originate.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiOriginate')

/**
 * Generate a unique action ID for tracking AMI requests
 */
function generateActionId(): string {
  return `originate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * AMI Originate Composable
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   isOriginating,
 *   progress,
 *   originate,
 *   clickToCall,
 *   originateToExtension
 * } = useAmiOriginate(computed(() => ami.getClient()))
 *
 * // Simple click-to-call
 * await clickToCall('PJSIP/1001', '5551234567')
 *
 * // Originate to extension
 * await originateToExtension('PJSIP/1001', '200', 'from-internal')
 *
 * // Full control
 * await originate({
 *   channel: 'PJSIP/1001',
 *   exten: '5551234567',
 *   context: 'from-internal',
 *   callerId: '"Sales" <1001>',
 *   timeout: 60,
 *   variables: { CUSTOM_VAR: 'value' }
 * })
 * ```
 */
export function useAmiOriginate(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiOriginateOptions = {}
): UseAmiOriginateReturn {
  const {
    useEvents = true,
    defaultContext = 'from-internal',
    defaultTimeout = 30,
    onOriginateStart,
    onOriginateComplete,
    onProgressChange,
    formatCallerId: customFormatCallerId,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const isOriginating = ref(false)
  const lastResult = ref<AmiOriginateResult | null>(null)
  const progress = ref<OriginateProgress | null>(null)
  const error = ref<string | null>(null)

  // Internal tracking
  let currentActionId: string | null = null
  let currentChannel: string | null = null
  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Send an AMI action
   */
  async function doAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    const response = await client.sendAction(action)
    return response.data as Record<string, unknown>
  }

  /**
   * Update progress state
   */
  function updateProgress(state: OriginateState, extra?: Partial<OriginateProgress>): void {
    const newProgress: OriginateProgress = {
      state,
      timestamp: new Date(),
      channel: currentChannel || undefined,
      ...extra,
    }
    progress.value = newProgress
    onProgressChange?.(newProgress)
    logger.debug('Progress updated', { state, channel: currentChannel })
  }

  /**
   * Build caller ID string from name and number
   */
  function buildCallerId(name?: string, num?: string): string {
    if (customFormatCallerId) {
      return customFormatCallerId(name, num)
    }

    if (name && num) {
      return `"${name}" <${num}>`
    }
    if (num) {
      return num
    }
    if (name) {
      return name
    }
    return ''
  }

  /**
   * Format a channel string from technology and endpoint
   */
  function formatChannel(tech: string, endpoint: string): string {
    const cleanTech = tech.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '')
    return `${cleanTech}/${cleanEndpoint}`
  }

  /**
   * Reset state to idle
   */
  function reset(): void {
    isOriginating.value = false
    progress.value = null
    error.value = null
    currentActionId = null
    currentChannel = null
  }

  // ============================================================================
  // Core Actions
  // ============================================================================

  /**
   * Originate a call with full options
   */
  async function originate(opts: AmiOriginateOptions): Promise<AmiOriginateResult> {
    // Validate required fields
    if (!opts.channel) {
      const result: AmiOriginateResult = {
        success: false,
        actionId: '',
        error: 'Channel is required',
      }
      lastResult.value = result
      return result
    }

    if (!opts.application && (!opts.exten || !opts.context)) {
      const result: AmiOriginateResult = {
        success: false,
        actionId: '',
        error: 'Either application or exten+context is required',
      }
      lastResult.value = result
      return result
    }

    const client = amiClientRef.value
    if (!client) {
      const result: AmiOriginateResult = {
        success: false,
        actionId: '',
        error: 'AMI client not connected',
      }
      error.value = result.error ?? null
      lastResult.value = result
      return result
    }

    // Reset state
    error.value = null
    isOriginating.value = true
    currentActionId = generateActionId()
    currentChannel = opts.channel

    // Update progress
    updateProgress('initiating')

    // Notify callback
    onOriginateStart?.(opts)

    try {
      // Build the AMI action
      const action: AmiAction = {
        Action: 'Originate',
        ActionID: currentActionId,
        Channel: opts.channel,
        Async: opts.async !== false ? 'true' : 'false',
      }

      // Set destination: either application or context/exten/priority
      if (opts.application) {
        action.Application = opts.application
        if (opts.data) {
          action.Data = opts.data
        }
      } else {
        action.Context = opts.context
        action.Exten = opts.exten
        action.Priority = String(opts.priority || 1)
      }

      // Timeout (convert seconds to milliseconds for AMI)
      const timeout = opts.timeout || defaultTimeout
      action.Timeout = String(timeout * 1000)

      // Caller ID
      const callerId = opts.callerId || buildCallerId(opts.callerIdName, opts.callerIdNum)
      if (callerId) {
        action.CallerID = callerId
      }

      // Account code
      if (opts.account) {
        action.Account = opts.account
      }

      // Codecs
      if (opts.codecs && opts.codecs.length > 0) {
        action.Codecs = opts.codecs.join(',')
      }

      // Early media
      if (opts.earlyMedia) {
        action.EarlyMedia = 'true'
      }

      // Channel variables
      if (opts.variables && Object.keys(opts.variables).length > 0) {
        const varEntries = Object.entries(opts.variables)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
        action.Variable = varEntries
      }

      logger.debug('Sending Originate action', { action })

      // Send the action
      const response = await doAction(action)

      const success = response.Response === 'Success'
      const result: AmiOriginateResult = {
        success,
        actionId: currentActionId,
        channel: opts.channel,
        response: String(response.Message || response.Response || ''),
        error: success ? undefined : String(response.Message || 'Originate failed'),
      }

      if (!success) {
        error.value = result.error ?? null
        updateProgress('failed', { response: result.response })
      }

      lastResult.value = result
      onOriginateComplete?.(result)

      // If not async or failed, update state
      if (!success || opts.async === false) {
        isOriginating.value = false
        if (success) {
          updateProgress('completed')
        }
      }

      logger.info('Originate result', { success, channel: opts.channel })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Originate failed'
      error.value = errorMessage

      const result: AmiOriginateResult = {
        success: false,
        actionId: currentActionId || '',
        error: errorMessage,
      }

      lastResult.value = result
      updateProgress('failed', { response: errorMessage })
      isOriginating.value = false
      onOriginateComplete?.(result)

      logger.error('Originate error', { error: err, channel: opts.channel })
      return result
    }
  }

  /**
   * Originate to an extension (simplified)
   */
  async function originateToExtension(
    channel: string,
    exten: string,
    context?: string
  ): Promise<AmiOriginateResult> {
    return originate({
      channel,
      exten,
      context: context || defaultContext,
    })
  }

  /**
   * Originate to an application (e.g., Echo, Playback)
   */
  async function originateToApplication(
    channel: string,
    app: string,
    data?: string
  ): Promise<AmiOriginateResult> {
    return originate({
      channel,
      exten: '', // Not used for application
      context: '', // Not used for application
      application: app,
      data,
    })
  }

  /**
   * Click-to-call: Agent channel calls target number
   *
   * This is a convenience method that:
   * 1. Calls the agent's channel first
   * 2. When answered, dials the target number
   */
  async function clickToCall(
    agentChannel: string,
    targetNumber: string,
    callerId?: string
  ): Promise<AmiOriginateResult> {
    return originate({
      channel: agentChannel,
      exten: targetNumber,
      context: defaultContext,
      callerId,
    })
  }

  /**
   * Cancel current origination attempt
   *
   * Note: This cancels tracking on the client side.
   * The actual call may still proceed on the server.
   * To truly cancel, you would need to hang up the channel.
   */
  function cancel(): void {
    if (isOriginating.value && currentChannel) {
      logger.info('Cancelling originate', { channel: currentChannel })

      // Attempt to hangup the channel if possible
      const client = amiClientRef.value
      if (client && currentChannel) {
        client
          .sendAction({
            Action: 'Hangup',
            Channel: currentChannel,
          })
          .catch((err) => {
            logger.debug('Hangup during cancel failed (channel may not exist yet)', err)
          })
      }

      updateProgress('cancelled')
      // Reset state but preserve the cancelled progress state
      isOriginating.value = false
      error.value = null
      currentActionId = null
      currentChannel = null
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    const handleOriginateResponse = (eventData: AmiOriginateResponseEvent) => {
      // Only handle events for our current action
      if (eventData.ActionID && eventData.ActionID !== currentActionId) {
        return
      }

      if (eventData.Response === 'Success') {
        updateProgress('ringing', {
          channel: eventData.Channel,
          uniqueId: eventData.Uniqueid,
        })
        if (lastResult.value) {
          lastResult.value.uniqueId = eventData.Uniqueid
          lastResult.value.channel = eventData.Channel
        }
      } else {
        updateProgress('failed', {
          response: eventData.Reason || 'Unknown failure',
        })
        isOriginating.value = false
      }

      logger.debug('OriginateResponse received', eventData)
    }

    const handleDialBegin = (eventData: AmiDialBeginEvent) => {
      // Check if this is related to our origination
      if (
        currentChannel &&
        (eventData.Channel?.includes(currentChannel) ||
          eventData.DestChannel?.includes(currentChannel))
      ) {
        updateProgress('ringing', {
          channel: eventData.Channel,
          uniqueId: eventData.Uniqueid,
        })
        logger.debug('DialBegin received', eventData)
      }
    }

    const handleDialEnd = (eventData: AmiDialEndEvent) => {
      // Check if this is related to our origination
      if (
        currentChannel &&
        (eventData.Channel?.includes(currentChannel) ||
          eventData.DestChannel?.includes(currentChannel))
      ) {
        const dialStatus = eventData.DialStatus

        switch (dialStatus) {
          case 'ANSWER':
            updateProgress('answered', {
              channel: eventData.Channel,
              uniqueId: eventData.Uniqueid,
            })
            break
          case 'BUSY':
            updateProgress('busy')
            isOriginating.value = false
            break
          case 'NOANSWER':
          case 'CANCEL':
          case 'CONGESTION':
          case 'CHANUNAVAIL':
            updateProgress('failed', { response: dialStatus })
            isOriginating.value = false
            break
          default:
            logger.debug('Unknown DialStatus', { dialStatus })
        }

        logger.debug('DialEnd received', eventData)
      }
    }

    const handleHangup = (eventData: { Channel?: string; Cause?: string }) => {
      // Check if our originating channel was hung up
      if (currentChannel && eventData.Channel?.includes(currentChannel)) {
        if (isOriginating.value) {
          updateProgress('completed')
          isOriginating.value = false
        }
        logger.debug('Channel hangup detected', eventData)
      }
    }

    // Subscribe to generic event handler
    const eventHandler = (event: AmiMessage<AmiEventData>) => {
      const data = event.data
      switch (data.Event) {
        case 'OriginateResponse':
          handleOriginateResponse(data as unknown as AmiOriginateResponseEvent)
          break
        case 'DialBegin':
          handleDialBegin(data as unknown as AmiDialBeginEvent)
          break
        case 'DialEnd':
          handleDialEnd(data as unknown as AmiDialEndEvent)
          break
        case 'Hangup':
          handleHangup(data as unknown as { Channel?: string; Cause?: string })
          break
      }
    }

    client.on('event', eventHandler)
    eventCleanups.push(() => client.off('event', eventHandler))
  }

  function cleanupEvents(): void {
    eventCleanups.forEach((cleanup) => cleanup())
    eventCleanups.length = 0
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  watch(
    amiClientRef,
    (newClient, oldClient) => {
      if (oldClient) {
        cleanupEvents()
      }
      if (newClient) {
        setupEvents()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanupEvents()
    reset()
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    isOriginating,
    lastResult,
    progress,
    error,

    // Actions
    originate,
    originateToExtension,
    originateToApplication,
    clickToCall,

    // Utilities
    cancel,
    formatChannel,
    buildCallerId,
    reset,
  }
}
