/**
 * AMI Ring Groups Composable
 *
 * Vue composable for managing ring groups via Asterisk Manager Interface.
 * Provides ring group monitoring, member management, and strategy configuration.
 *
 * @module composables/useAmiRingGroups
 *
 * @example
 * ```typescript
 * import { useAmi, useAmiRingGroups } from 'vuesip'
 *
 * const ami = useAmi()
 * const {
 *   ringGroups,
 *   groupList,
 *   startMonitoring,
 *   addMember,
 *   removeMember,
 *   setStrategy
 * } = useAmiRingGroups(ami.getClient(), {
 *   groupIds: ['600', '601'],
 *   onEvent: (event) => console.log('Ring group event:', event)
 * })
 *
 * startMonitoring()
 *
 * // Add member to ring group
 * await addMember('600', '1001', { name: 'Alice', priority: 1 })
 *
 * // Change ring strategy
 * await setStrategy('600', 'ringall')
 * ```
 */

import { ref, computed, onUnmounted, watch, type Ref } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  RingGroup,
  RingGroupMember,
  RingGroupMemberStatus,
  RingStrategy,
  RingGroupStats,
  RingGroupEvent,
  RingGroupEventType,
  UseAmiRingGroupsOptions,
  UseAmiRingGroupsReturn,
  AddMemberResult,
  RemoveMemberResult,
  UpdateStrategyResult,
} from '@/types/ringgroup.types'
import type { AmiEventData } from '@/types/ami.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiRingGroups')

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input.replace(/[<>'";&|`$\\]/g, '').trim().slice(0, 255)
}

/**
 * Validate extension format
 */
function isValidExtension(extension: string): boolean {
  if (!extension || typeof extension !== 'string') return false
  // Allow digits, letters, and common separators
  return /^[a-zA-Z0-9_-]+$/.test(extension) && extension.length <= 32
}

/**
 * Validate ring group ID
 */
function isValidGroupId(groupId: string): boolean {
  if (!groupId || typeof groupId !== 'string') return false
  return /^[a-zA-Z0-9_-]+$/.test(groupId) && groupId.length <= 32
}

/**
 * Create empty ring group stats
 */
function createEmptyStats(): RingGroupStats {
  return {
    totalCalls: 0,
    answeredCalls: 0,
    unansweredCalls: 0,
    timedOutCalls: 0,
    avgRingTime: 0,
    avgTalkTime: 0,
    currentCalls: 0,
    serviceLevel: 100,
    lastCallTime: undefined,
  }
}

/**
 * Safe channel pattern matching without dynamic regex to prevent ReDoS
 */
function matchChannelExtension(channel: string, extension: string): boolean {
  if (!channel || !extension) return false
  // Safe pattern matching: look for PJSIP/ext or SIP/ext
  const normalizedChannel = channel.toUpperCase()
  const normalizedExt = extension.toUpperCase()
  return (
    normalizedChannel.includes(`PJSIP/${normalizedExt}-`) ||
    normalizedChannel.includes(`PJSIP/${normalizedExt}@`) ||
    normalizedChannel.includes(`SIP/${normalizedExt}-`) ||
    normalizedChannel.includes(`SIP/${normalizedExt}@`) ||
    normalizedChannel === `PJSIP/${normalizedExt}` ||
    normalizedChannel === `SIP/${normalizedExt}`
  )
}

/**
 * Create empty ring group
 */
function createEmptyRingGroup(id: string, name: string, extension: string): RingGroup {
  // Sanitize all inputs to prevent XSS and injection
  const sanitizedId = sanitizeInput(id)
  return {
    id: sanitizedId,
    name: sanitizeInput(name),
    extension: sanitizeInput(extension),
    strategy: 'ringall',
    ringTimeout: 20,
    totalTimeout: 60,
    state: 'idle',
    enabled: true,
    members: [],
    stats: createEmptyStats(),
    skipBusy: true,
    confirmAnswer: false,
    lastUpdated: new Date(),
  }
}

/**
 * AMI Ring Groups Composable
 *
 * @param client - Ref to AMI client instance
 * @param options - Configuration options
 * @returns Ring group management interface
 */
export function useAmiRingGroups(
  client: Ref<AmiClient | null>,
  options: UseAmiRingGroupsOptions = {}
): UseAmiRingGroupsReturn {
  const {
    autoStart = false,
    refreshInterval = 30000,
    groupIds = [],
    onEvent,
    onStatsUpdate,
    onMemberStatusChange,
    onError,
  } = options

  // State
  const ringGroups = ref<Map<string, RingGroup>>(new Map())
  const selectedGroup = ref<RingGroup | null>(null)
  const isMonitoring = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Internal state
  const eventListeners: Array<() => void> = []
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // Computed
  const groupList = computed(() => Array.from(ringGroups.value.values()))

  const totalMembers = computed(() =>
    groupList.value.reduce((sum, group) => sum + group.members.length, 0)
  )

  const availableMembers = computed(() =>
    groupList.value.reduce(
      (sum, group) =>
        sum + group.members.filter((m) => m.status === 'available' && m.enabled).length,
      0
    )
  )

  const activeGroups = computed(() =>
    groupList.value.filter((g) => g.state === 'ringing' || g.state === 'connected')
  )

  const disabledGroups = computed(() =>
    groupList.value.filter((g) => !g.enabled || g.state === 'disabled')
  )

  /**
   * Emit a ring group event
   */
  function emitEvent(
    type: RingGroupEventType,
    groupId: string,
    data?: Partial<RingGroupEvent>
  ): void {
    const event: RingGroupEvent = {
      type,
      groupId,
      timestamp: new Date(),
      ...data,
    }
    onEvent?.(event)
  }

  /**
   * Get or create a ring group
   */
  function getOrCreateGroup(id: string, name?: string, extension?: string): RingGroup {
    // Validate ID before use
    if (!isValidGroupId(id)) {
      // Return a default group with sanitized ID for invalid inputs
      const sanitizedId = sanitizeInput(id) || 'default'
      let group = ringGroups.value.get(sanitizedId)
      if (!group) {
        group = createEmptyRingGroup(sanitizedId, name || sanitizedId, extension || sanitizedId)
        ringGroups.value.set(sanitizedId, group)
      }
      return group
    }

    let group = ringGroups.value.get(id)
    if (!group) {
      group = createEmptyRingGroup(id, name || id, extension || id)
      ringGroups.value.set(id, group)
    }
    return group
  }

  /**
   * Update member status based on device state
   */
  function mapDeviceStateToStatus(state: string): RingGroupMemberStatus {
    const normalizedState = state.toLowerCase()
    if (normalizedState.includes('not_inuse') || normalizedState.includes('idle')) {
      return 'available'
    }
    if (normalizedState.includes('inuse') || normalizedState.includes('busy')) {
      return 'busy'
    }
    if (normalizedState.includes('ringing')) {
      return 'ringing'
    }
    if (
      normalizedState.includes('unavailable') ||
      normalizedState.includes('invalid') ||
      normalizedState.includes('unreachable')
    ) {
      return 'unavailable'
    }
    return 'unknown'
  }

  /**
   * Handle ExtensionStatus AMI event
   */
  function handleExtensionStatus(event: Record<string, string>): void {
    const exten = event.Exten || event.Extension
    const status = event.Status || event.State
    const hint = event.Hint

    if (!exten || !status) return

    // Update member status in all groups
    for (const group of ringGroups.value.values()) {
      const member = group.members.find(
        (m) => m.extension === exten || m.interface === hint
      )
      if (member) {
        const newStatus = mapDeviceStateToStatus(status)
        if (member.status !== newStatus) {
          const oldStatus = member.status
          member.status = newStatus
          member.lastStatusChange = new Date()
          group.lastUpdated = new Date()

          onMemberStatusChange?.(group.id, member.extension, newStatus)
          emitEvent(oldStatus === 'ringing' ? 'member_noanswer' : 'member_busy', group.id, {
            member: member.extension,
          })
        }
      }
    }
  }

  /**
   * Handle Dial AMI event (member ringing)
   */
  function handleDial(event: Record<string, string>): void {
    const channel = event.Channel || ''
    const destChannel = event.DestChannel || event.Destination || ''
    const dialstring = event.Dialstring || ''

    // Extract extension from destination
    const destMatch = destChannel.match(/(?:PJSIP|SIP)\/(\d+)/i) || dialstring.match(/(\d+)/)
    if (!destMatch) return

    const destExtension = destMatch[1]

    // Check if this is a ring group call
    for (const group of ringGroups.value.values()) {
      const member = group.members.find((m) => m.extension === destExtension)
      if (member) {
        member.status = 'ringing'
        member.lastStatusChange = new Date()
        group.state = 'ringing'
        group.lastUpdated = new Date()

        emitEvent('member_ring', group.id, {
          member: destExtension,
          channel,
          callerId: event.CallerIDNum,
        })
        break
      }
    }
  }

  /**
   * Handle Bridge AMI event (call connected)
   */
  function handleBridge(event: Record<string, string>): void {
    const channel1 = event.Channel1 || event.Channel
    const channel2 = event.Channel2 || event.DestChannel

    // Check if either channel belongs to a ring group member
    for (const group of ringGroups.value.values()) {
      for (const member of group.members) {
        // Use safe pattern matching instead of dynamic regex to prevent ReDoS
        if (
          matchChannelExtension(channel2 || '', member.extension) ||
          matchChannelExtension(channel1 || '', member.extension)
        ) {
          member.status = 'busy'
          member.callsAnswered++
          member.lastStatusChange = new Date()
          group.state = 'connected'
          group.stats.answeredCalls++
          group.stats.currentCalls++
          group.lastUpdated = new Date()

          emitEvent('member_answer', group.id, {
            member: member.extension,
            channel: channel2 || channel1,
            callerId: event.CallerIDNum,
          })
          onStatsUpdate?.(group.id, group.stats)
          break
        }
      }
    }
  }

  /**
   * Handle Hangup AMI event
   */
  function handleHangup(event: Record<string, string>): void {
    const channel = event.Channel || ''
    const cause = event.Cause || ''

    // Extract extension from channel
    const extMatch = channel.match(/(?:PJSIP|SIP)\/(\d+)/i)
    if (!extMatch) return

    const extension = extMatch[1]

    for (const group of ringGroups.value.values()) {
      const member = group.members.find((m) => m.extension === extension)
      if (member) {
        // Update stats based on call outcome
        if (member.status === 'ringing') {
          member.callsMissed++
          group.stats.unansweredCalls++
        }

        member.status = 'available'
        member.lastStatusChange = new Date()

        // Update group state
        const ringingMembers = group.members.filter((m) => m.status === 'ringing' || m.status === 'busy')
        if (ringingMembers.length === 0) {
          group.state = 'idle'
          if (group.stats.currentCalls > 0) {
            group.stats.currentCalls--
          }
        }

        group.stats.totalCalls++
        group.stats.lastCallTime = new Date()
        group.lastUpdated = new Date()

        emitEvent('call_complete', group.id, {
          member: extension,
          channel,
          data: { cause },
        })
        onStatsUpdate?.(group.id, group.stats)
        break
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
        case 'ExtensionStatus':
        case 'DeviceStateChange':
          handleExtensionStatus(event as unknown as Record<string, string>)
          break
        case 'Dial':
        case 'DialBegin':
          handleDial(event as unknown as Record<string, string>)
          break
        case 'Bridge':
        case 'BridgeEnter':
          handleBridge(event as unknown as Record<string, string>)
          break
        case 'Hangup':
          handleHangup(event as unknown as Record<string, string>)
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
   * Refresh ring group data from AMI
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
      // Get extension states for members
      for (const group of ringGroups.value.values()) {
        for (const member of group.members) {
          try {
            const response = await amiClient.sendAction({
              Action: 'ExtensionState',
              Exten: member.extension,
              Context: 'ext-local',
            })

            if (response.data.Response === 'Success' && response.data.Status) {
              const status = mapDeviceStateToStatus(String(response.data.Status))
              if (member.status !== status) {
                member.status = status
                member.lastStatusChange = new Date()
                onMemberStatusChange?.(group.id, member.extension, status)
              }
            }
          } catch (err) {
            logger.debug(`Failed to get state for ${member.extension}:`, err)
          }
        }
        group.lastUpdated = new Date()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh ring groups'
      error.value = message
      onError?.(message)
      logger.error('Failed to refresh ring groups:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Start monitoring ring groups
   */
  function startMonitoring(): void {
    if (isMonitoring.value) return

    isMonitoring.value = true
    setupEventListeners()

    // Initialize groups if IDs provided
    if (groupIds.length > 0) {
      for (const id of groupIds) {
        if (isValidGroupId(id)) {
          getOrCreateGroup(id)
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

    logger.info('Ring group monitoring started', { groupIds })
  }

  /**
   * Stop monitoring ring groups
   */
  function stopMonitoring(): void {
    if (!isMonitoring.value) return

    isMonitoring.value = false
    removeEventListeners()

    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }

    logger.info('Ring group monitoring stopped')
  }

  /**
   * Get a specific ring group by ID
   */
  function getRingGroup(groupId: string): RingGroup | null {
    if (!isValidGroupId(groupId)) return null
    return ringGroups.value.get(groupId) || null
  }

  /**
   * Select a ring group for detailed view
   */
  function selectGroup(groupId: string | null): void {
    if (!groupId) {
      selectedGroup.value = null
      return
    }
    if (!isValidGroupId(groupId)) return
    selectedGroup.value = ringGroups.value.get(groupId) || null
  }

  /**
   * Add a member to a ring group
   */
  async function addMember(
    groupId: string,
    extension: string,
    memberOptions?: { name?: string; priority?: number }
  ): Promise<AddMemberResult> {
    if (!isValidGroupId(groupId)) {
      return { success: false, groupId, member: extension, error: 'Invalid group ID' }
    }
    if (!isValidExtension(extension)) {
      return { success: false, groupId, member: extension, error: 'Invalid extension' }
    }

    const group = ringGroups.value.get(groupId)
    if (!group) {
      return { success: false, groupId, member: extension, error: 'Ring group not found' }
    }

    // Check if member already exists
    if (group.members.some((m) => m.extension === extension)) {
      return { success: false, groupId, member: extension, error: 'Member already exists' }
    }

    const member: RingGroupMember = {
      extension: sanitizeInput(extension),
      interface: `PJSIP/${sanitizeInput(extension)}`,
      name: sanitizeInput(memberOptions?.name || extension),
      status: 'unknown',
      priority: memberOptions?.priority ?? group.members.length + 1,
      enabled: true,
      addedAt: new Date(),
      callsAnswered: 0,
      callsMissed: 0,
    }

    group.members.push(member)
    group.members.sort((a, b) => a.priority - b.priority)
    group.lastUpdated = new Date()

    emitEvent('member_added', groupId, { member: extension })
    logger.info('Member added to ring group', { groupId, extension })

    // Try to get initial status
    const amiClient = client.value
    if (amiClient) {
      try {
        const response = await amiClient.sendAction({
          Action: 'ExtensionState',
          Exten: extension,
          Context: 'ext-local',
        })
        if (response.data.Response === 'Success' && response.data.Status) {
          member.status = mapDeviceStateToStatus(String(response.data.Status))
          member.lastStatusChange = new Date()
        }
      } catch (err) {
        logger.debug(`Failed to get initial state for ${extension}:`, err)
      }
    }

    return { success: true, groupId, member: extension }
  }

  /**
   * Remove a member from a ring group
   */
  async function removeMember(
    groupId: string,
    extension: string
  ): Promise<RemoveMemberResult> {
    if (!isValidGroupId(groupId)) {
      return { success: false, groupId, member: extension, error: 'Invalid group ID' }
    }
    if (!isValidExtension(extension)) {
      return { success: false, groupId, member: extension, error: 'Invalid extension' }
    }

    const group = ringGroups.value.get(groupId)
    if (!group) {
      return { success: false, groupId, member: extension, error: 'Ring group not found' }
    }

    const memberIndex = group.members.findIndex((m) => m.extension === extension)
    if (memberIndex === -1) {
      return { success: false, groupId, member: extension, error: 'Member not found' }
    }

    group.members.splice(memberIndex, 1)
    group.lastUpdated = new Date()

    emitEvent('member_removed', groupId, { member: extension })
    logger.info('Member removed from ring group', { groupId, extension })

    return { success: true, groupId, member: extension }
  }

  /**
   * Enable a member in a ring group
   */
  async function enableMember(groupId: string, extension: string): Promise<boolean> {
    if (!isValidGroupId(groupId) || !isValidExtension(extension)) return false

    const group = ringGroups.value.get(groupId)
    if (!group) return false

    const member = group.members.find((m) => m.extension === extension)
    if (!member) return false

    member.enabled = true
    group.lastUpdated = new Date()
    logger.info('Member enabled in ring group', { groupId, extension })

    return true
  }

  /**
   * Disable a member in a ring group
   */
  async function disableMember(groupId: string, extension: string): Promise<boolean> {
    if (!isValidGroupId(groupId) || !isValidExtension(extension)) return false

    const group = ringGroups.value.get(groupId)
    if (!group) return false

    const member = group.members.find((m) => m.extension === extension)
    if (!member) return false

    member.enabled = false
    group.lastUpdated = new Date()
    logger.info('Member disabled in ring group', { groupId, extension })

    return true
  }

  /**
   * Update member priority
   */
  async function setMemberPriority(
    groupId: string,
    extension: string,
    priority: number
  ): Promise<boolean> {
    if (!isValidGroupId(groupId) || !isValidExtension(extension)) return false
    if (typeof priority !== 'number' || priority < 1 || priority > 999) return false

    const group = ringGroups.value.get(groupId)
    if (!group) return false

    const member = group.members.find((m) => m.extension === extension)
    if (!member) return false

    member.priority = priority
    group.members.sort((a, b) => a.priority - b.priority)
    group.lastUpdated = new Date()
    logger.info('Member priority updated', { groupId, extension, priority })

    return true
  }

  /**
   * Update ring group strategy
   */
  async function setStrategy(
    groupId: string,
    strategy: RingStrategy
  ): Promise<UpdateStrategyResult> {
    const validStrategies: RingStrategy[] = [
      'ringall',
      'hunt',
      'memoryhunt',
      'firstunavailable',
      'firstnotonphone',
      'random',
      'linear',
      'rrmemory',
      'rrordered',
    ]

    if (!isValidGroupId(groupId)) {
      return { success: false, groupId, strategy, error: 'Invalid group ID' }
    }
    if (!validStrategies.includes(strategy)) {
      return { success: false, groupId, strategy, error: 'Invalid ring strategy' }
    }

    const group = ringGroups.value.get(groupId)
    if (!group) {
      return { success: false, groupId, strategy, error: 'Ring group not found' }
    }

    group.strategy = strategy
    group.lastUpdated = new Date()
    logger.info('Ring group strategy updated', { groupId, strategy })

    return { success: true, groupId, strategy }
  }

  /**
   * Update ring timeout
   */
  async function setRingTimeout(groupId: string, timeout: number): Promise<boolean> {
    if (!isValidGroupId(groupId)) return false
    if (typeof timeout !== 'number' || timeout < 5 || timeout > 300) return false

    const group = ringGroups.value.get(groupId)
    if (!group) return false

    group.ringTimeout = timeout
    group.lastUpdated = new Date()
    logger.info('Ring timeout updated', { groupId, timeout })

    return true
  }

  /**
   * Enable a ring group
   */
  async function enableGroup(groupId: string): Promise<boolean> {
    if (!isValidGroupId(groupId)) return false

    const group = ringGroups.value.get(groupId)
    if (!group) return false

    group.enabled = true
    group.state = 'idle'
    group.lastUpdated = new Date()

    emitEvent('group_enabled', groupId)
    logger.info('Ring group enabled', { groupId })

    return true
  }

  /**
   * Disable a ring group
   */
  async function disableGroup(groupId: string): Promise<boolean> {
    if (!isValidGroupId(groupId)) return false

    const group = ringGroups.value.get(groupId)
    if (!group) return false

    group.enabled = false
    group.state = 'disabled'
    group.lastUpdated = new Date()

    emitEvent('group_disabled', groupId)
    logger.info('Ring group disabled', { groupId })

    return true
  }

  /**
   * Get member status
   */
  function getMemberStatus(
    groupId: string,
    extension: string
  ): RingGroupMemberStatus | null {
    if (!isValidGroupId(groupId) || !isValidExtension(extension)) return null

    const group = ringGroups.value.get(groupId)
    if (!group) return null

    const member = group.members.find((m) => m.extension === extension)
    return member?.status ?? null
  }

  /**
   * Get ring group statistics
   */
  function getStats(groupId: string): RingGroupStats | null {
    if (!isValidGroupId(groupId)) return null

    const group = ringGroups.value.get(groupId)
    return group?.stats ?? null
  }

  /**
   * Clear statistics for a ring group
   */
  function clearStats(groupId: string): void {
    if (!isValidGroupId(groupId)) return

    const group = ringGroups.value.get(groupId)
    if (!group) return

    group.stats = createEmptyStats()
    group.members.forEach((m) => {
      m.callsAnswered = 0
      m.callsMissed = 0
    })
    group.lastUpdated = new Date()
    logger.info('Ring group stats cleared', { groupId })
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
    ringGroups,
    selectedGroup,
    isMonitoring,
    isLoading,
    error,

    // Computed
    groupList,
    totalMembers,
    availableMembers,
    activeGroups,
    disabledGroups,

    // Methods
    startMonitoring,
    stopMonitoring,
    refresh,
    getRingGroup,
    selectGroup,
    addMember,
    removeMember,
    enableMember,
    disableMember,
    setMemberPriority,
    setStrategy,
    setRingTimeout,
    enableGroup,
    disableGroup,
    getMemberStatus,
    getStats,
    clearStats,
  }
}

export type { UseAmiRingGroupsReturn }
