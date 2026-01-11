/**
 * AMI ConfBridge Composable
 *
 * Vue composable for Asterisk ConfBridge conference management via AMI.
 * Provides room listing, participant management, mute/kick/lock controls.
 *
 * @module composables/useAmiConfBridge
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction, AmiMessage, AmiEventData } from '@/types/ami.types'
import type {
  ConfBridgeRoom,
  ConfBridgeUser,
  ConfBridgeActionResult,
  UseAmiConfBridgeOptions,
  AmiConfBridgeJoinEvent,
  AmiConfBridgeLeaveEvent,
  AmiConfBridgeTalkingEvent,
  AmiConfBridgeListEvent,
  AmiConfBridgeListRoomsEvent,
} from '@/types/confbridge.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiConfBridge')

/**
 * Return type for useAmiConfBridge composable
 */
export interface UseAmiConfBridgeReturn {
  // State
  /** Map of conferences by name */
  rooms: Ref<Map<string, ConfBridgeRoom>>
  /** Map of users by channel */
  users: Ref<Map<string, ConfBridgeUser>>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>

  // Computed
  /** All rooms as array */
  roomList: ComputedRef<ConfBridgeRoom[]>
  /** All users as array */
  userList: ComputedRef<ConfBridgeUser[]>
  /** Total participant count */
  totalParticipants: ComputedRef<number>

  // Room Actions
  /** List all active conferences */
  listRooms: () => Promise<ConfBridgeRoom[]>
  /** List users in a conference */
  listUsers: (conference: string) => Promise<ConfBridgeUser[]>
  /** Lock a conference */
  lockRoom: (conference: string) => Promise<ConfBridgeActionResult>
  /** Unlock a conference */
  unlockRoom: (conference: string) => Promise<ConfBridgeActionResult>
  /** Start recording */
  startRecording: (conference: string, recordFile?: string) => Promise<ConfBridgeActionResult>
  /** Stop recording */
  stopRecording: (conference: string) => Promise<ConfBridgeActionResult>

  // User Actions
  /** Mute a user */
  muteUser: (conference: string, channel: string) => Promise<ConfBridgeActionResult>
  /** Unmute a user */
  unmuteUser: (conference: string, channel: string) => Promise<ConfBridgeActionResult>
  /** Kick a user */
  kickUser: (conference: string, channel: string) => Promise<ConfBridgeActionResult>
  /** Set single video source */
  setVideoSource: (conference: string, channel: string) => Promise<ConfBridgeActionResult>

  // Utilities
  /** Get users in a specific room */
  getUsersInRoom: (conference: string) => ConfBridgeUser[]
  /** Refresh all data */
  refresh: () => Promise<void>
}

/**
 * AMI ConfBridge Composable
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   roomList,
 *   userList,
 *   listRooms,
 *   muteUser,
 *   kickUser,
 *   lockRoom
 * } = useAmiConfBridge(computed(() => ami.getClient()))
 *
 * // List all conferences
 * await listRooms()
 *
 * // Mute a participant
 * await muteUser('1000', 'PJSIP/1001-00000001')
 *
 * // Lock the conference
 * await lockRoom('1000')
 * ```
 */
export function useAmiConfBridge(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiConfBridgeOptions = {}
): UseAmiConfBridgeReturn {
  const {
    useEvents = true,
    autoRefresh = true,
    conferenceFilter,
    transformUser,
    onUserJoin,
    onUserLeave,
    onTalkingChange,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const rooms = ref<Map<string, ConfBridgeRoom>>(new Map())
  const users = ref<Map<string, ConfBridgeUser>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const roomList = computed(() => {
    const list = Array.from(rooms.value.values())
    return conferenceFilter ? list.filter(conferenceFilter) : list
  })

  const userList = computed(() => Array.from(users.value.values()))

  const totalParticipants = computed(() =>
    roomList.value.reduce((sum, room) => sum + room.parties, 0)
  )

  // ============================================================================
  // Parsing Helpers
  // ============================================================================

  function parseRoom(data: AmiConfBridgeListRoomsEvent): ConfBridgeRoom {
    return {
      conference: data.Conference,
      parties: parseInt(data.Parties || '0', 10),
      locked: data.Locked === 'Yes',
      muted: data.Muted === 'Yes',
      recording: false,
      markedUsers: parseInt(data.Marked || '0', 10),
    }
  }

  function parseUser(data: AmiConfBridgeListEvent | AmiConfBridgeJoinEvent): ConfBridgeUser {
    const user: ConfBridgeUser = {
      conference: data.Conference,
      callerIdNum: data.CallerIDNum || '',
      callerIdName: data.CallerIDName || '',
      channel: data.Channel,
      admin: data.Admin === 'Yes',
      marked: data.Marked === 'Yes',
      muted: data.Muted === 'Yes',
      talking: false,
      joinedAt: new Date(),
    }
    return transformUser ? transformUser(user) : user
  }

  // ============================================================================
  // AMI Actions
  // ============================================================================

  async function doAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    const response = await client.sendAction(action)
    return response.data as Record<string, unknown>
  }

  async function listRooms(): Promise<ConfBridgeRoom[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await doAction({ Action: 'ConfbridgeListRooms' })
      const events = (response.events || []) as AmiConfBridgeListRoomsEvent[]

      rooms.value.clear()
      for (const event of events) {
        if (event.Event === 'ConfbridgeListRooms') {
          const room = parseRoom(event)
          rooms.value.set(room.conference, room)
        }
      }

      return roomList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list rooms'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function listUsers(conference: string): Promise<ConfBridgeUser[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await doAction({
        Action: 'ConfbridgeList',
        Conference: conference,
      })
      const events = (response.events || []) as AmiConfBridgeListEvent[]

      // Clear users for this conference
      for (const [channel, user] of users.value) {
        if (user.conference === conference) {
          users.value.delete(channel)
        }
      }

      // Add new users
      for (const event of events) {
        if (event.Event === 'ConfbridgeList') {
          const user = parseUser(event)
          users.value.set(user.channel, user)
        }
      }

      return getUsersInRoom(conference)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list users'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function lockRoom(conference: string): Promise<ConfBridgeActionResult> {
    try {
      await doAction({ Action: 'ConfbridgeLock', Conference: conference })
      const room = rooms.value.get(conference)
      if (room) {
        room.locked = true
      }
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Lock failed',
      }
    }
  }

  async function unlockRoom(conference: string): Promise<ConfBridgeActionResult> {
    try {
      await doAction({ Action: 'ConfbridgeUnlock', Conference: conference })
      const room = rooms.value.get(conference)
      if (room) {
        room.locked = false
      }
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Unlock failed',
      }
    }
  }

  async function startRecording(
    conference: string,
    recordFile?: string
  ): Promise<ConfBridgeActionResult> {
    try {
      const action: AmiAction = { Action: 'ConfbridgeStartRecord', Conference: conference }
      if (recordFile) {
        action.RecordFile = recordFile
      }
      await doAction(action)
      const room = rooms.value.get(conference)
      if (room) {
        room.recording = true
      }
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Start recording failed',
      }
    }
  }

  async function stopRecording(conference: string): Promise<ConfBridgeActionResult> {
    try {
      await doAction({ Action: 'ConfbridgeStopRecord', Conference: conference })
      const room = rooms.value.get(conference)
      if (room) {
        room.recording = false
      }
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Stop recording failed',
      }
    }
  }

  async function muteUser(conference: string, channel: string): Promise<ConfBridgeActionResult> {
    try {
      await doAction({ Action: 'ConfbridgeMute', Conference: conference, Channel: channel })
      const user = users.value.get(channel)
      if (user) {
        user.muted = true
      }
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Mute failed',
      }
    }
  }

  async function unmuteUser(conference: string, channel: string): Promise<ConfBridgeActionResult> {
    try {
      await doAction({ Action: 'ConfbridgeUnmute', Conference: conference, Channel: channel })
      const user = users.value.get(channel)
      if (user) {
        user.muted = false
      }
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Unmute failed',
      }
    }
  }

  async function kickUser(conference: string, channel: string): Promise<ConfBridgeActionResult> {
    try {
      await doAction({ Action: 'ConfbridgeKick', Conference: conference, Channel: channel })
      users.value.delete(channel)
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Kick failed',
      }
    }
  }

  async function setVideoSource(
    conference: string,
    channel: string
  ): Promise<ConfBridgeActionResult> {
    try {
      await doAction({
        Action: 'ConfbridgeSetSingleVideoSrc',
        Conference: conference,
        Channel: channel,
      })
      return { success: true, conference }
    } catch (err) {
      return {
        success: false,
        conference,
        error: err instanceof Error ? err.message : 'Set video source failed',
      }
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  function getUsersInRoom(conference: string): ConfBridgeUser[] {
    return userList.value.filter((u) => u.conference === conference)
  }

  async function refresh(): Promise<void> {
    await listRooms()
    for (const room of roomList.value) {
      await listUsers(room.conference)
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    const handleJoin = (eventData: AmiConfBridgeJoinEvent) => {
      const user = parseUser(eventData)
      users.value.set(user.channel, user)

      // Update room count
      const room = rooms.value.get(user.conference)
      if (room) {
        room.parties++
      }

      onUserJoin?.(user)
      logger.debug('User joined conference', user.conference, user.channel)
    }

    const handleLeave = (eventData: AmiConfBridgeLeaveEvent) => {
      const user = users.value.get(eventData.Channel)
      if (user) {
        users.value.delete(eventData.Channel)

        // Update room count
        const room = rooms.value.get(eventData.Conference)
        if (room && room.parties > 0) {
          room.parties--
        }

        onUserLeave?.(user)
        logger.debug('User left conference', eventData.Conference, eventData.Channel)
      }
    }

    const handleTalking = (eventData: AmiConfBridgeTalkingEvent) => {
      const user = users.value.get(eventData.Channel)
      if (user) {
        const talking = eventData.TalkingStatus === 'on'
        user.talking = talking
        onTalkingChange?.(user, talking)
      }
    }

    // Subscribe to generic event handler and filter by event type
    const eventHandler = (event: AmiMessage<AmiEventData>) => {
      const data = event.data
      switch (data.Event) {
        case 'ConfbridgeJoin':
          handleJoin(data as unknown as AmiConfBridgeJoinEvent)
          break
        case 'ConfbridgeLeave':
          handleLeave(data as unknown as AmiConfBridgeLeaveEvent)
          break
        case 'ConfbridgeTalking':
          handleTalking(data as unknown as AmiConfBridgeTalkingEvent)
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
        if (autoRefresh) {
          listRooms().catch((err) => logger.error('Initial refresh failed', err))
        }
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanupEvents()
    rooms.value.clear()
    users.value.clear()
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    rooms,
    users,
    isLoading,
    error,

    // Computed
    roomList,
    userList,
    totalParticipants,

    // Room Actions
    listRooms,
    listUsers,
    lockRoom,
    unlockRoom,
    startRecording,
    stopRecording,

    // User Actions
    muteUser,
    unmuteUser,
    kickUser,
    setVideoSource,

    // Utilities
    getUsersInRoom,
    refresh,
  }
}
