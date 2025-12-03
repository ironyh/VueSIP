/**
 * AMI Voicemail Composable
 *
 * Vue composable for voicemail management via AMI WebSocket proxy.
 * Provides MWI (Message Waiting Indicator) monitoring and mailbox queries.
 *
 * @module composables/useAmiVoicemail
 */

import { ref, computed, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiMessage, AmiEventData } from '@/types/ami.types'
import type {
  MwiState,
  MailboxInfo,
  UseAmiVoicemailOptions,
  AmiMessageWaitingEvent,
  AmiVoicemailUserEntryEvent,
} from '@/types/voicemail.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiVoicemail')

/**
 * Return type for useAmiVoicemail composable
 */
export interface UseAmiVoicemailReturn {
  // State
  /** Map of MWI states by mailbox */
  mwiStates: Ref<Map<string, MwiState>>
  /** Map of mailbox info by mailbox */
  mailboxes: Ref<Map<string, MailboxInfo>>
  /** Whether currently loading */
  isLoading: Ref<boolean>
  /** Error message if any */
  error: Ref<string | null>
  /** Total new messages across all monitored mailboxes */
  totalNewMessages: ComputedRef<number>
  /** Total old messages across all monitored mailboxes */
  totalOldMessages: ComputedRef<number>
  /** Whether any mailbox has waiting messages */
  hasWaitingMessages: ComputedRef<boolean>

  // Methods
  /** Get MWI state for a mailbox */
  getMwiState: (mailbox: string, context?: string) => Promise<MwiState>
  /** Get mailbox info */
  getMailboxInfo: (mailbox: string, context?: string) => Promise<MailboxInfo | null>
  /** Get all voicemail users */
  getVoicemailUsers: (context?: string) => Promise<MailboxInfo[]>
  /** Refresh MWI for a mailbox */
  refreshMailbox: (mailbox: string, context?: string) => Promise<void>
  /** Monitor a mailbox for MWI changes */
  monitorMailbox: (mailbox: string, context?: string) => void
  /** Stop monitoring a mailbox */
  unmonitorMailbox: (mailbox: string, context?: string) => void
  /** Clear all monitored mailboxes */
  clearMonitoring: () => void
  /** Listen for MWI changes */
  onMwiChange: (callback: (mwi: MwiState) => void) => () => void
}

/**
 * AMI Voicemail Composable
 *
 * Provides reactive voicemail/MWI functionality for Vue components.
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const { mwiStates, getMwiState, monitorMailbox, totalNewMessages } = useAmiVoicemail(
 *   computed(() => ami.getClient())
 * )
 *
 * // Monitor a mailbox
 * monitorMailbox('1000', 'default')
 *
 * // Check MWI state
 * const mwi = await getMwiState('1000')
 * console.log(`${mwi.newMessages} new messages`)
 *
 * // Watch for changes
 * watch(totalNewMessages, (count) => {
 *   console.log(`Total new messages: ${count}`)
 * })
 * ```
 */
export function useAmiVoicemail(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiVoicemailOptions = {}
): UseAmiVoicemailReturn {
  const {
    pollInterval = 0,
    useEvents = true,
    autoRefresh = true,
    defaultContext = 'default',
    mailboxFilter,
    onMwiChange: onMwiChangeCallback,
    onNewMessage,
    transformMailbox,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const mwiStates = ref<Map<string, MwiState>>(new Map())
  const mailboxes = ref<Map<string, MailboxInfo>>(new Map())
  const monitoredMailboxes = ref<Set<string>>(new Set())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const mwiListeners = ref<Array<(mwi: MwiState) => void>>([])

  let pollTimer: number | null = null
  let eventUnsubscribe: (() => void) | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const totalNewMessages = computed(() => {
    let total = 0
    mwiStates.value.forEach((mwi) => {
      total += mwi.newMessages
    })
    return total
  })

  const totalOldMessages = computed(() => {
    let total = 0
    mwiStates.value.forEach((mwi) => {
      total += mwi.oldMessages
    })
    return total
  })

  const hasWaitingMessages = computed(() => {
    for (const mwi of mwiStates.value.values()) {
      if (mwi.waiting) return true
    }
    return false
  })

  // ============================================================================
  // Internal Methods
  // ============================================================================

  const getMailboxKey = (mailbox: string, context?: string): string => {
    return `${mailbox}@${context || defaultContext}`
  }

  const parseMailboxKey = (key: string): { mailbox: string; context: string } => {
    const parts = key.split('@')
    return { mailbox: parts[0] || '', context: parts[1] || defaultContext }
  }

  const handleMwiEvent = (event: AmiMessage<AmiEventData>): void => {
    if (event.data.Event !== 'MessageWaiting') return

    const data = event.data as unknown as AmiMessageWaitingEvent
    const mailboxWithContext = data.Mailbox || ''

    // Parse mailbox@context format
    const parts = mailboxWithContext.includes('@')
      ? mailboxWithContext.split('@')
      : [mailboxWithContext, defaultContext]
    const mailbox = parts[0] || ''
    const context = parts[1] || defaultContext

    const key = getMailboxKey(mailbox, context)

    // Only process if we're monitoring this mailbox
    if (!monitoredMailboxes.value.has(key)) return

    const prevMwi = mwiStates.value.get(key)
    const prevNewCount = prevMwi?.newMessages || 0

    const mwi: MwiState = {
      mailbox: mailboxWithContext,
      waiting: data.Waiting === 'yes' || data.Waiting === '1',
      newMessages: parseInt(data.New || '0', 10),
      oldMessages: parseInt(data.Old || '0', 10),
      lastUpdated: new Date(),
      serverId: event.server_id,
    }

    mwiStates.value.set(key, mwi)

    // Notify listeners
    notifyMwiChange(mwi)

    // Check for new message callback
    if (onNewMessage && mwi.newMessages > prevNewCount) {
      onNewMessage(mailbox, mwi.newMessages)
    }
  }

  const notifyMwiChange = (mwi: MwiState): void => {
    // Call option callback
    if (onMwiChangeCallback) {
      try {
        onMwiChangeCallback(mwi)
      } catch (err) {
        logger.error('Error in onMwiChange callback', err)
      }
    }

    // Call registered listeners
    mwiListeners.value.forEach((listener) => {
      try {
        listener(mwi)
      } catch (err) {
        logger.error('Error in MWI listener', err)
      }
    })
  }

  const setupEventListeners = (): void => {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    // Clean up previous listeners
    if (eventUnsubscribe) {
      eventUnsubscribe()
    }

    const handler = (event: AmiMessage<AmiEventData>) => {
      handleMwiEvent(event)
    }

    client.on('event', handler)
    eventUnsubscribe = () => client.off('event', handler)
  }

  const startPolling = (): void => {
    if (pollInterval <= 0 || pollTimer) return

    pollTimer = window.setInterval(async () => {
      for (const key of monitoredMailboxes.value) {
        const { mailbox, context } = parseMailboxKey(key)
        try {
          await getMwiState(mailbox, context)
        } catch (err) {
          logger.warn(`Failed to poll MWI for ${key}`, err)
        }
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
   * Get MWI state for a mailbox
   */
  const getMwiState = async (mailbox: string, context?: string): Promise<MwiState> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    const mailboxWithContext = `${mailbox}@${context || defaultContext}`
    const key = getMailboxKey(mailbox, context)

    try {
      const response = await client.sendAction({
        Action: 'MailboxStatus',
        Mailbox: mailboxWithContext,
      })

      if (response.data.Response !== 'Success') {
        throw new Error(response.data.Message || 'Failed to get mailbox status')
      }

      const mwi: MwiState = {
        mailbox: mailboxWithContext,
        waiting: parseInt(response.data.Waiting || '0', 10) > 0,
        newMessages: parseInt(response.data.NewMessages || '0', 10),
        oldMessages: parseInt(response.data.OldMessages || '0', 10),
        lastUpdated: new Date(),
        serverId: response.server_id,
      }

      mwiStates.value.set(key, mwi)
      return mwi
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get MWI state'
      throw err
    }
  }

  /**
   * Get mailbox info (from VoicemailUsersList)
   */
  const getMailboxInfo = async (
    mailbox: string,
    context?: string
  ): Promise<MailboxInfo | null> => {
    const users = await getVoicemailUsers(context)
    return users.find((u) => u.mailbox === mailbox) || null
  }

  /**
   * Get all voicemail users
   */
  const getVoicemailUsers = async (context?: string): Promise<MailboxInfo[]> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    isLoading.value = true
    error.value = null

    const actionId = `vuesip-vm-${Date.now()}`
    const users: MailboxInfo[] = []

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        client.off('event', handler)
        isLoading.value = false
        reject(new Error('VoicemailUsersList timeout'))
      }, 30000)

      const handler = (event: AmiMessage<AmiEventData>) => {
        if (event.data.ActionID !== actionId) return

        if (event.data.Event === 'VoicemailUserEntry') {
          const data = event.data as unknown as AmiVoicemailUserEntryEvent

          // Apply context filter
          if (context && data.VMContext !== context) return

          let info: MailboxInfo = {
            mailbox: data.VoiceMailbox,
            context: data.VMContext,
            newMessages: parseInt(data.NewMessageCount || '0', 10),
            oldMessages: parseInt(data.OldMessageCount || '0', 10),
            urgentMessages: parseInt(data.UrgentMessageCount || '0', 10),
            fullName: data.FullName,
            email: data.Email,
            pager: data.Pager,
            serverId: event.server_id,
          }

          // Apply transform
          if (transformMailbox) {
            info = transformMailbox(info)
          }

          // Apply filter
          if (mailboxFilter && !mailboxFilter(info)) return

          users.push(info)

          // Update mailboxes cache
          const key = getMailboxKey(info.mailbox, info.context)
          mailboxes.value.set(key, info)
        } else if (event.data.Event === 'VoicemailUserEntryComplete') {
          clearTimeout(timeout)
          client.off('event', handler)
          isLoading.value = false
          resolve(users)
        }
      }

      client.on('event', handler)

      client.sendAction({
        Action: 'VoicemailUsersList',
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
   * Refresh MWI for a mailbox
   */
  const refreshMailbox = async (mailbox: string, context?: string): Promise<void> => {
    const client = amiClientRef.value
    if (!client || !client.isConnected) {
      throw new Error('Not connected to AMI')
    }

    // VoicemailRefresh triggers MWI updates
    await client.sendAction({
      Action: 'VoicemailRefresh',
      Context: context || defaultContext,
      Mailbox: mailbox,
    })

    // Also get current state
    await getMwiState(mailbox, context)
  }

  /**
   * Monitor a mailbox for MWI changes
   */
  const monitorMailbox = (mailbox: string, context?: string): void => {
    const key = getMailboxKey(mailbox, context)
    monitoredMailboxes.value.add(key)

    // Get initial state
    getMwiState(mailbox, context).catch((err) => {
      logger.warn(`Failed to get initial MWI for ${key}`, err)
    })
  }

  /**
   * Stop monitoring a mailbox
   */
  const unmonitorMailbox = (mailbox: string, context?: string): void => {
    const key = getMailboxKey(mailbox, context)
    monitoredMailboxes.value.delete(key)
    mwiStates.value.delete(key)
  }

  /**
   * Clear all monitored mailboxes
   */
  const clearMonitoring = (): void => {
    monitoredMailboxes.value.clear()
    mwiStates.value.clear()
    mailboxes.value.clear()
  }

  /**
   * Listen for MWI changes
   */
  const onMwiChange = (callback: (mwi: MwiState) => void): (() => void) => {
    mwiListeners.value.push(callback)
    return () => {
      const index = mwiListeners.value.indexOf(callback)
      if (index !== -1) {
        mwiListeners.value.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Watch for client changes
  watch(
    amiClientRef,
    (client) => {
      if (client && client.isConnected) {
        setupEventListeners()
        if (pollInterval > 0) {
          startPolling()
        }
        if (autoRefresh && monitoredMailboxes.value.size > 0) {
          // Refresh all monitored mailboxes
          monitoredMailboxes.value.forEach((key) => {
            const { mailbox, context } = parseMailboxKey(key)
            getMwiState(mailbox, context).catch((err) => {
              logger.warn(`Failed to refresh MWI for ${key}`, err)
            })
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
    clearMonitoring()
    mwiListeners.value = []
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    mwiStates,
    mailboxes,
    isLoading,
    error,
    totalNewMessages,
    totalOldMessages,
    hasWaitingMessages,

    // Methods
    getMwiState,
    getMailboxInfo,
    getVoicemailUsers,
    refreshMailbox,
    monitorMailbox,
    unmonitorMailbox,
    clearMonitoring,
    onMwiChange,
  }
}
