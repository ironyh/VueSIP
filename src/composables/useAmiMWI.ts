/**
 * AMI MWI Composable
 *
 * Vue composable for Message Waiting Indicator control via AMI.
 * Provides voicemail lamp status management and real-time updates.
 *
 * @module composables/useAmiMWI
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction } from '@/types/ami.types'
import type { MWIStatus, AmiMWIEvent, UseAmiMWIOptions, UseAmiMWIReturn } from '@/types/mwi.types'

/**
 * Vue composable for managing MWI (Message Waiting Indicator) via AMI
 *
 * @param amiClientRef - Reactive reference to AMI client
 * @param options - Configuration options
 * @returns MWI management interface
 *
 * @example
 * ```typescript
 * const { mailboxes, getMailboxStatus, updateMWI } = useAmiMWI(clientRef, {
 *   defaultContext: 'default',
 *   onMWIChange: (mailbox, status) => console.log(`${mailbox}: ${status.newMessages} new`)
 * })
 *
 * // Check voicemail status
 * const status = await getMailboxStatus('1001')
 * console.log(`${status.newMessages} new, ${status.oldMessages} old messages`)
 *
 * // Update MWI lamp
 * await updateMWI('1001', 3)  // 3 new messages
 * ```
 */
export function useAmiMWI(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiMWIOptions = {}
): UseAmiMWIReturn {
  const { useEvents = true, defaultContext = 'default', onMWIChange } = options

  // ============================================================================
  // State
  // ============================================================================

  const mailboxes = ref<Map<string, MWIStatus>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const mailboxList: ComputedRef<MWIStatus[]> = computed(() => Array.from(mailboxes.value.values()))

  const mailboxesWithMessages: ComputedRef<MWIStatus[]> = computed(() =>
    mailboxList.value.filter((m) => m.newMessages > 0 || m.oldMessages > 0)
  )

  const totalNewMessages: ComputedRef<number> = computed(() =>
    mailboxList.value.reduce((sum, m) => sum + m.newMessages, 0)
  )

  const indicatorOnCount: ComputedRef<number> = computed(
    () => mailboxList.value.filter((m) => m.indicatorOn).length
  )

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Format mailbox with context if not present
   */
  function formatMailbox(mailbox: string): string {
    return mailbox.includes('@') ? mailbox : `${mailbox}@${defaultContext}`
  }

  /**
   * Send AMI action
   */
  async function sendAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    return client.send(action)
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Get mailbox message counts
   */
  async function getMailboxStatus(mailbox: string): Promise<MWIStatus> {
    const formattedMailbox = formatMailbox(mailbox)
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({
        Action: 'MailboxCount',
        Mailbox: formattedMailbox,
      })

      const status: MWIStatus = {
        mailbox: formattedMailbox,
        newMessages: parseInt(String(response.NewMessages || '0'), 10),
        oldMessages: parseInt(String(response.OldMessages || '0'), 10),
        urgentNew: parseInt(String(response.UrgentNew || '0'), 10),
        urgentOld: parseInt(String(response.UrgentOld || '0'), 10),
        indicatorOn: parseInt(String(response.NewMessages || '0'), 10) > 0,
        lastUpdate: new Date(),
      }

      mailboxes.value.set(formattedMailbox, status)
      return status
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get mailbox status'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update MWI indicator for a mailbox
   */
  async function updateMWI(
    mailbox: string,
    newMessages: number,
    oldMessages: number = 0
  ): Promise<boolean> {
    const formattedMailbox = formatMailbox(mailbox)
    error.value = null

    try {
      await sendAction({
        Action: 'MWIUpdate',
        Mailbox: formattedMailbox,
        NewMessages: String(newMessages),
        OldMessages: String(oldMessages),
      })

      const status: MWIStatus = {
        mailbox: formattedMailbox,
        newMessages,
        oldMessages,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: newMessages > 0,
        lastUpdate: new Date(),
      }
      mailboxes.value.set(formattedMailbox, status)
      onMWIChange?.(formattedMailbox, status)

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update MWI'
      return false
    }
  }

  /**
   * Delete MWI state for a mailbox
   */
  async function deleteMWI(mailbox: string): Promise<boolean> {
    const formattedMailbox = formatMailbox(mailbox)
    error.value = null

    try {
      await sendAction({
        Action: 'MWIDelete',
        Mailbox: formattedMailbox,
      })

      mailboxes.value.delete(formattedMailbox)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete MWI'
      return false
    }
  }

  /**
   * Refresh all tracked mailbox statuses
   */
  async function refresh(): Promise<void> {
    const mailboxIds = Array.from(mailboxes.value.keys())
    for (const mailboxId of mailboxIds) {
      try {
        await getMailboxStatus(mailboxId)
      } catch {
        // Continue with other mailboxes even if one fails
      }
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get status for a specific mailbox from cache
   */
  function getMailbox(mailbox: string): MWIStatus | undefined {
    const formattedMailbox = formatMailbox(mailbox)
    return mailboxes.value.get(formattedMailbox)
  }

  /**
   * Check if a specific mailbox has waiting messages
   */
  function hasMessages(mailbox: string): boolean {
    const status = getMailbox(mailbox)
    return status ? status.newMessages > 0 || status.oldMessages > 0 : false
  }

  /**
   * Track a mailbox for MWI events
   */
  async function trackMailbox(mailbox: string): Promise<void> {
    await getMailboxStatus(mailbox)
  }

  /**
   * Stop tracking a mailbox
   */
  function untrackMailbox(mailbox: string): void {
    const formattedMailbox = formatMailbox(mailbox)
    mailboxes.value.delete(formattedMailbox)
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Handle MessageWaiting event from AMI
   */
  function handleMWIEvent(event: AmiMWIEvent): void {
    const status: MWIStatus = {
      mailbox: event.Mailbox,
      newMessages: parseInt(event.New || '0', 10),
      oldMessages: parseInt(event.Old || '0', 10),
      urgentNew: 0,
      urgentOld: 0,
      indicatorOn: event.Waiting === 'Yes' || event.Waiting === '1',
      lastUpdate: new Date(),
    }

    mailboxes.value.set(event.Mailbox, status)
    onMWIChange?.(event.Mailbox, status)
  }

  /**
   * Setup event listeners
   */
  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    // Type-safe event handler registration
    const handler = handleMWIEvent as unknown as (event: Record<string, unknown>) => void
    client.on('MessageWaiting' as keyof import('@/types/ami.types').AmiClientEvents, handler)

    eventCleanups.push(() =>
      client.off('MessageWaiting' as keyof import('@/types/ami.types').AmiClientEvents, handler)
    )
  }

  /**
   * Cleanup event listeners
   */
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
    mailboxes.value.clear()
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    mailboxes,
    isLoading,
    error,

    // Computed
    mailboxList,
    mailboxesWithMessages,
    totalNewMessages,
    indicatorOnCount,

    // Actions
    getMailboxStatus,
    updateMWI,
    deleteMWI,
    refresh,

    // Utilities
    getMailbox,
    hasMessages,
    trackMailbox,
    untrackMailbox,
  }
}
