# AMI Advanced Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 advanced AMI composables (ConfBridge, PJSIP Management, System Health, MWI) with full documentation, playground demos, and tests.

**Architecture:** Each composable extends `useAmiBase<T>` for consistency, exports types from dedicated type files, includes playground demo with SimulationControls, and adds documentation to the Examples sidebar.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, VitePress, PrimeVue (playground)

---

## Task 1: ConfBridge Types

**Files:**

- Create: `src/types/confbridge.types.ts`

**Step 1: Create ConfBridge type definitions**

```typescript
/**
 * ConfBridge Types
 *
 * Type definitions for Asterisk ConfBridge conferencing via AMI.
 *
 * @module types/confbridge.types
 */

import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * ConfBridge room/conference
 */
export interface ConfBridgeRoom {
  /** Conference name/number */
  conference: string
  /** Number of participants */
  parties: number
  /** Whether room is locked */
  locked: boolean
  /** Whether room is muted */
  muted: boolean
  /** Recording status */
  recording: boolean
  /** Marked user count (admins) */
  markedUsers: number
}

/**
 * ConfBridge participant
 */
export interface ConfBridgeUser {
  /** Conference name */
  conference: string
  /** Unique caller ID */
  callerIdNum: string
  /** Caller display name */
  callerIdName: string
  /** Channel name */
  channel: string
  /** Whether user is admin */
  admin: boolean
  /** Whether user is marked */
  marked: boolean
  /** Whether user is muted */
  muted: boolean
  /** Whether user is talking */
  talking: boolean
  /** Join timestamp */
  joinedAt: Date
}

/**
 * Conference action result
 */
export interface ConfBridgeActionResult {
  success: boolean
  conference: string
  error?: string
}

// ============================================================================
// Event Types
// ============================================================================

export interface AmiConfBridgeJoinEvent {
  Event: 'ConfbridgeJoin'
  Conference: string
  CallerIDNum: string
  CallerIDName: string
  Channel: string
  Admin: 'Yes' | 'No'
  Marked: 'Yes' | 'No'
  Muted: 'Yes' | 'No'
}

export interface AmiConfBridgeLeaveEvent {
  Event: 'ConfbridgeLeave'
  Conference: string
  CallerIDNum: string
  CallerIDName: string
  Channel: string
}

export interface AmiConfBridgeTalkingEvent {
  Event: 'ConfbridgeTalking'
  Conference: string
  Channel: string
  TalkingStatus: 'on' | 'off'
}

export interface AmiConfBridgeMuteEvent {
  Event: 'ConfbridgeMute' | 'ConfbridgeUnmute'
  Conference: string
  Channel: string
}

export interface AmiConfBridgeLockEvent {
  Event: 'ConfbridgeLock' | 'ConfbridgeUnlock'
  Conference: string
}

export interface AmiConfBridgeRecordEvent {
  Event: 'ConfbridgeRecord'
  Conference: string
  RecordFile: string
}

export interface AmiConfBridgeListEvent {
  Event: 'ConfbridgeList'
  Conference: string
  CallerIDNum: string
  CallerIDName: string
  Channel: string
  Admin: 'Yes' | 'No'
  Marked: 'Yes' | 'No'
  Muted: 'Yes' | 'No'
}

export interface AmiConfBridgeListRoomsEvent {
  Event: 'ConfbridgeListRooms'
  Conference: string
  Parties: string
  Locked: 'Yes' | 'No'
  Muted: 'Yes' | 'No'
  Marked: string
}

// ============================================================================
// Options Types
// ============================================================================

export interface UseAmiConfBridgeOptions extends BaseAmiOptions {
  /** Filter conferences by name pattern */
  conferenceFilter?: (room: ConfBridgeRoom) => boolean
  /** Transform user data after parsing */
  transformUser?: (user: ConfBridgeUser) => ConfBridgeUser
  /** Callback when user joins */
  onUserJoin?: (user: ConfBridgeUser) => void
  /** Callback when user leaves */
  onUserLeave?: (user: ConfBridgeUser) => void
  /** Callback when talking status changes */
  onTalkingChange?: (user: ConfBridgeUser, talking: boolean) => void
}
```

**Step 2: Verify file created**

Run: `cat src/types/confbridge.types.ts | head -20`
Expected: Shows file header and imports

**Step 3: Commit**

```bash
git add src/types/confbridge.types.ts
git commit -m "feat(types): add ConfBridge type definitions"
```

---

## Task 2: ConfBridge Composable

**Files:**

- Create: `src/composables/useAmiConfBridge.ts`
- Modify: `src/composables/index.ts`
- Modify: `src/index.ts`

**Step 1: Create the composable**

````typescript
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
import type { AmiAction } from '@/types/ami.types'
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

  async function sendAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    return client.send(action)
  }

  async function listRooms(): Promise<ConfBridgeRoom[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'ConfbridgeListRooms' })
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
      const response = await sendAction({
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
      await sendAction({ Action: 'ConfbridgeLock', Conference: conference })
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
      await sendAction({ Action: 'ConfbridgeUnlock', Conference: conference })
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
      await sendAction(action)
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
      await sendAction({ Action: 'ConfbridgeStopRecord', Conference: conference })
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
      await sendAction({ Action: 'ConfbridgeMute', Conference: conference, Channel: channel })
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
      await sendAction({ Action: 'ConfbridgeUnmute', Conference: conference, Channel: channel })
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
      await sendAction({ Action: 'ConfbridgeKick', Conference: conference, Channel: channel })
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
      await sendAction({
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

    const handleJoin = (event: AmiConfBridgeJoinEvent) => {
      const user = parseUser(event)
      users.value.set(user.channel, user)

      // Update room count
      const room = rooms.value.get(user.conference)
      if (room) {
        room.parties++
      }

      onUserJoin?.(user)
      logger.debug('User joined conference', user.conference, user.channel)
    }

    const handleLeave = (event: AmiConfBridgeLeaveEvent) => {
      const user = users.value.get(event.Channel)
      if (user) {
        users.value.delete(event.Channel)

        // Update room count
        const room = rooms.value.get(event.Conference)
        if (room && room.parties > 0) {
          room.parties--
        }

        onUserLeave?.(user)
        logger.debug('User left conference', event.Conference, event.Channel)
      }
    }

    const handleTalking = (event: AmiConfBridgeTalkingEvent) => {
      const user = users.value.get(event.Channel)
      if (user) {
        const talking = event.TalkingStatus === 'on'
        user.talking = talking
        onTalkingChange?.(user, talking)
      }
    }

    // Subscribe to events
    client.on('ConfbridgeJoin' as keyof import('@/types/ami.types').AmiClientEvents, handleJoin)
    client.on('ConfbridgeLeave' as keyof import('@/types/ami.types').AmiClientEvents, handleLeave)
    client.on(
      'ConfbridgeTalking' as keyof import('@/types/ami.types').AmiClientEvents,
      handleTalking
    )

    eventCleanups.push(
      () =>
        client.off(
          'ConfbridgeJoin' as keyof import('@/types/ami.types').AmiClientEvents,
          handleJoin
        ),
      () =>
        client.off(
          'ConfbridgeLeave' as keyof import('@/types/ami.types').AmiClientEvents,
          handleLeave
        ),
      () =>
        client.off(
          'ConfbridgeTalking' as keyof import('@/types/ami.types').AmiClientEvents,
          handleTalking
        )
    )
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
````

**Step 2: Export from composables index**

Add to `src/composables/index.ts`:

```typescript
export { useAmiConfBridge, type UseAmiConfBridgeReturn } from './useAmiConfBridge'
```

**Step 3: Export types from main index**

Add to `src/index.ts` in the types exports section:

```typescript
export type * from './types/confbridge.types'
```

**Step 4: Verify exports**

Run: `grep -n "useAmiConfBridge" src/composables/index.ts`
Expected: Shows the export line

**Step 5: Commit**

```bash
git add src/composables/useAmiConfBridge.ts src/composables/index.ts src/index.ts
git commit -m "feat(ami): add useAmiConfBridge composable for conference management"
```

---

## Task 3: ConfBridge Tests

**Files:**

- Create: `tests/unit/composables/useAmiConfBridge.test.ts`

**Step 1: Write tests**

```typescript
/**
 * useAmiConfBridge Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiConfBridge } from '@/composables/useAmiConfBridge'
import type { AmiClient } from '@/core/AmiClient'

// Mock AMI client
function createMockClient() {
  const handlers = new Map<string, Set<Function>>()

  return {
    send: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      handlers.get(event)?.delete(handler)
    }),
    emit: (event: string, data: unknown) => {
      handlers.get(event)?.forEach((h) => h(data))
    },
  } as unknown as AmiClient & { emit: (event: string, data: unknown) => void }
}

describe('useAmiConfBridge', () => {
  let mockClient: ReturnType<typeof createMockClient>
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    mockClient = createMockClient()
    clientRef = ref<AmiClient | null>(null)
  })

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { rooms, users, isLoading, error } = useAmiConfBridge(clientRef)

      expect(rooms.value.size).toBe(0)
      expect(users.value.size).toBe(0)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
    })

    it('should setup events when client connects', async () => {
      useAmiConfBridge(clientRef)
      clientRef.value = mockClient
      await nextTick()

      expect(mockClient.on).toHaveBeenCalledWith('ConfbridgeJoin', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('ConfbridgeLeave', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('ConfbridgeTalking', expect.any(Function))
    })
  })

  describe('listRooms', () => {
    it('should fetch and parse conference rooms', async () => {
      mockClient.send.mockResolvedValue({
        events: [
          {
            Event: 'ConfbridgeListRooms',
            Conference: '1000',
            Parties: '3',
            Locked: 'No',
            Muted: 'No',
            Marked: '1',
          },
        ],
      })

      clientRef.value = mockClient
      const { listRooms, roomList } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      await listRooms()

      expect(roomList.value).toHaveLength(1)
      expect(roomList.value[0]).toMatchObject({
        conference: '1000',
        parties: 3,
        locked: false,
        muted: false,
        markedUsers: 1,
      })
    })
  })

  describe('user actions', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should mute a user', async () => {
      mockClient.send.mockResolvedValue({ Response: 'Success' })
      const { muteUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await muteUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(true)
      expect(mockClient.send).toHaveBeenCalledWith({
        Action: 'ConfbridgeMute',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
      })
    })

    it('should kick a user', async () => {
      mockClient.send.mockResolvedValue({ Response: 'Success' })
      const { kickUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await kickUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(true)
      expect(mockClient.send).toHaveBeenCalledWith({
        Action: 'ConfbridgeKick',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
      })
    })
  })

  describe('room actions', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should lock a room', async () => {
      mockClient.send.mockResolvedValue({ Response: 'Success' })
      const { lockRoom } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await lockRoom('1000')

      expect(result.success).toBe(true)
      expect(mockClient.send).toHaveBeenCalledWith({
        Action: 'ConfbridgeLock',
        Conference: '1000',
      })
    })

    it('should start recording', async () => {
      mockClient.send.mockResolvedValue({ Response: 'Success' })
      const { startRecording } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await startRecording('1000', '/var/spool/asterisk/monitor/conf-1000.wav')

      expect(result.success).toBe(true)
      expect(mockClient.send).toHaveBeenCalledWith({
        Action: 'ConfbridgeStartRecord',
        Conference: '1000',
        RecordFile: '/var/spool/asterisk/monitor/conf-1000.wav',
      })
    })
  })

  describe('real-time events', () => {
    it('should handle user join events', async () => {
      const onUserJoin = vi.fn()
      clientRef.value = mockClient
      const { users } = useAmiConfBridge(clientRef, { autoRefresh: false, onUserJoin })
      await nextTick()

      mockClient.emit('ConfbridgeJoin', {
        Event: 'ConfbridgeJoin',
        Conference: '1000',
        CallerIDNum: '1001',
        CallerIDName: 'John Doe',
        Channel: 'PJSIP/1001-00000001',
        Admin: 'No',
        Marked: 'No',
        Muted: 'No',
      })
      await nextTick()

      expect(users.value.size).toBe(1)
      expect(onUserJoin).toHaveBeenCalled()
    })

    it('should handle talking events', async () => {
      const onTalkingChange = vi.fn()
      clientRef.value = mockClient
      const { users } = useAmiConfBridge(clientRef, { autoRefresh: false, onTalkingChange })
      await nextTick()

      // First add a user
      mockClient.emit('ConfbridgeJoin', {
        Event: 'ConfbridgeJoin',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
        CallerIDNum: '1001',
        CallerIDName: 'John',
        Admin: 'No',
        Marked: 'No',
        Muted: 'No',
      })
      await nextTick()

      // Then talking event
      mockClient.emit('ConfbridgeTalking', {
        Event: 'ConfbridgeTalking',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
        TalkingStatus: 'on',
      })
      await nextTick()

      const user = users.value.get('PJSIP/1001-00000001')
      expect(user?.talking).toBe(true)
      expect(onTalkingChange).toHaveBeenCalledWith(expect.any(Object), true)
    })
  })
})
```

**Step 2: Run tests**

Run: `pnpm test tests/unit/composables/useAmiConfBridge.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/unit/composables/useAmiConfBridge.test.ts
git commit -m "test(ami): add useAmiConfBridge unit tests"
```

---

## Task 4: ConfBridge Playground Demo

**Files:**

- Create: `playground/demos/ConfBridgeDemo.vue`
- Modify: `playground/App.vue` (add to demos list)

**Step 1: Create demo component**

```vue
<template>
  <div class="confbridge-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
    />

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">CB</span>
          <span>ConfBridge Manager</span>
        </div>
      </template>
      <template #subtitle>Manage Asterisk ConfBridge conferences via AMI</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage conferences
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" icon="pi pi-link" @click="connectAmi" :loading="connecting" />
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag
              :severity="isConnected ? 'success' : 'danger'"
              :value="isConnected ? 'Connected' : 'Disconnected'"
            />
            <Tag severity="info" :value="`${roomList.length} conferences`" />
            <Tag severity="secondary" :value="`${totalParticipants} participants`" />
          </div>

          <!-- Conference Rooms -->
          <Panel header="Active Conferences" :toggleable="true" class="section-panel">
            <div class="panel-actions">
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                size="small"
                @click="refresh"
                :loading="isLoading"
              />
            </div>

            <DataTable :value="roomList" class="conferences-table" size="small">
              <Column field="conference" header="Conference" />
              <Column field="parties" header="Participants" />
              <Column header="Status">
                <template #body="{ data }">
                  <div class="status-badges">
                    <Tag v-if="data.locked" severity="warning" value="Locked" />
                    <Tag v-if="data.recording" severity="danger" value="Recording" />
                    <Tag v-if="data.muted" severity="secondary" value="Muted" />
                  </div>
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      icon="pi pi-users"
                      size="small"
                      @click="selectConference(data)"
                      v-tooltip="'View Users'"
                    />
                    <Button
                      :icon="data.locked ? 'pi pi-unlock' : 'pi pi-lock'"
                      size="small"
                      severity="secondary"
                      @click="toggleLock(data)"
                      v-tooltip="data.locked ? 'Unlock' : 'Lock'"
                    />
                    <Button
                      :icon="data.recording ? 'pi pi-stop' : 'pi pi-circle'"
                      size="small"
                      :severity="data.recording ? 'danger' : 'success'"
                      @click="toggleRecording(data)"
                      v-tooltip="data.recording ? 'Stop Recording' : 'Start Recording'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Selected Conference Users -->
          <Panel
            v-if="selectedConference"
            :header="`Participants in ${selectedConference.conference}`"
            :toggleable="true"
            class="section-panel"
          >
            <DataTable :value="conferenceUsers" class="users-table" size="small">
              <Column field="callerIdNum" header="Number" />
              <Column field="callerIdName" header="Name" />
              <Column header="Status">
                <template #body="{ data }">
                  <div class="user-status">
                    <Tag v-if="data.admin" severity="info" value="Admin" />
                    <Tag v-if="data.muted" severity="warning" value="Muted" />
                    <Tag v-if="data.talking" severity="success" value="Talking" />
                  </div>
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      :icon="data.muted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
                      size="small"
                      :severity="data.muted ? 'success' : 'warning'"
                      @click="toggleMute(data)"
                      v-tooltip="data.muted ? 'Unmute' : 'Mute'"
                    />
                    <Button
                      icon="pi pi-times"
                      size="small"
                      severity="danger"
                      @click="kick(data)"
                      v-tooltip="'Kick'"
                    />
                    <Button
                      icon="pi pi-video"
                      size="small"
                      severity="secondary"
                      @click="setVideo(data)"
                      v-tooltip="'Set as Video Source'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Panel>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAmi, useAmiConfBridge } from 'vuesip'
import type { ConfBridgeRoom, ConfBridgeUser } from 'vuesip'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import SimulationControls from '../components/SimulationControls.vue'
import { useSimulation } from '../composables/useSimulation'

// Simulation
const simulation = useSimulation()
const isSimulationMode = computed(() => simulation.isEnabled.value)
const activeScenario = computed(() => simulation.activeScenario.value)

// AMI Connection
const amiUrl = ref('ws://localhost:8089/ws')
const connecting = ref(false)
const ami = useAmi()
const isConnected = computed(() => ami.isConnected())

const connectAmi = async () => {
  connecting.value = true
  try {
    await ami.connect(amiUrl.value)
  } finally {
    connecting.value = false
  }
}

// ConfBridge
const {
  roomList,
  userList,
  isLoading,
  totalParticipants,
  listRooms,
  listUsers,
  lockRoom,
  unlockRoom,
  startRecording,
  stopRecording,
  muteUser,
  unmuteUser,
  kickUser,
  setVideoSource,
  refresh,
} = useAmiConfBridge(computed(() => ami.getClient()))

// Selected conference
const selectedConference = ref<ConfBridgeRoom | null>(null)
const conferenceUsers = computed(() =>
  userList.value.filter((u) => u.conference === selectedConference.value?.conference)
)

const selectConference = async (room: ConfBridgeRoom) => {
  selectedConference.value = room
  await listUsers(room.conference)
}

const toggleLock = async (room: ConfBridgeRoom) => {
  if (room.locked) {
    await unlockRoom(room.conference)
  } else {
    await lockRoom(room.conference)
  }
}

const toggleRecording = async (room: ConfBridgeRoom) => {
  if (room.recording) {
    await stopRecording(room.conference)
  } else {
    await startRecording(room.conference)
  }
}

const toggleMute = async (user: ConfBridgeUser) => {
  if (user.muted) {
    await unmuteUser(user.conference, user.channel)
  } else {
    await muteUser(user.conference, user.channel)
  }
}

const kick = async (user: ConfBridgeUser) => {
  await kickUser(user.conference, user.channel)
}

const setVideo = async (user: ConfBridgeUser) => {
  await setVideoSource(user.conference, user.channel)
}
</script>

<style scoped>
.confbridge-demo {
  padding: 1rem;
}

.demo-card {
  max-width: 1000px;
  margin: 0 auto;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.875rem;
}

.connection-panel {
  padding: 1rem;
}

.connection-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.url-input {
  flex: 1;
}

.status-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.section-panel {
  margin-bottom: 1rem;
}

.panel-actions {
  margin-bottom: 0.5rem;
}

.status-badges,
.user-status {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}
</style>
```

**Step 2: Add to App.vue demos list**

Find the demos array in `playground/App.vue` and add:

```typescript
{ name: 'ConfBridgeDemo', label: 'ConfBridge Manager', icon: 'pi pi-users', category: 'AMI' },
```

**Step 3: Verify component loads**

Run: `pnpm dev`
Expected: ConfBridgeDemo appears in playground sidebar under AMI category

**Step 4: Commit**

```bash
git add playground/demos/ConfBridgeDemo.vue playground/App.vue
git commit -m "feat(playground): add ConfBridge demo component"
```

---

## Task 5: ConfBridge Documentation

**Files:**

- Create: `docs/examples/confbridge.md`
- Modify: `docs/.vitepress/config.ts` (add to sidebar)

**Step 1: Create documentation page**

````markdown
# ConfBridge Manager

Native Asterisk ConfBridge conference management.

::: tip Try It Live
Run `pnpm dev` → Navigate to **ConfBridgeDemo** in the playground
:::

## Overview

ConfBridge management features:

- List active conferences
- View participants with real-time talking indicators
- Mute/unmute participants
- Kick participants
- Lock/unlock conferences
- Start/stop recording
- Set video source for video conferences

## Quick Start

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiConfBridge } from 'vuesip'

const ami = useAmi()
const {
  roomList,
  userList,
  totalParticipants,
  listRooms,
  listUsers,
  muteUser,
  kickUser,
  lockRoom,
  startRecording,
} = useAmiConfBridge(computed(() => ami.getClient()))

// List all conferences
await listRooms()

// View users in a specific conference
await listUsers('1000')

// Mute a participant
await muteUser('1000', 'PJSIP/1001-00000001')

// Lock the conference
await lockRoom('1000')

// Start recording
await startRecording('1000')
</script>

<template>
  <div class="confbridge-manager">
    <h3>Active Conferences ({{ roomList.length }})</h3>

    <div v-for="room in roomList" :key="room.conference" class="conference-card">
      <h4>Conference {{ room.conference }}</h4>
      <p>{{ room.parties }} participants</p>
      <span v-if="room.locked" class="badge">Locked</span>
      <span v-if="room.recording" class="badge recording">Recording</span>
    </div>

    <h3>Participants ({{ totalParticipants }})</h3>

    <div v-for="user in userList" :key="user.channel" class="user-card">
      <span class="name">{{ user.callerIdName || user.callerIdNum }}</span>
      <span v-if="user.talking" class="talking">Speaking</span>
      <span v-if="user.muted" class="muted">Muted</span>
      <span v-if="user.admin" class="admin">Admin</span>
      <button @click="muteUser(user.conference, user.channel)">Mute</button>
      <button @click="kickUser(user.conference, user.channel)">Kick</button>
    </div>
  </div>
</template>
```
````

## Real-Time Events

The composable automatically handles ConfBridge events:

```typescript
const { roomList, userList } = useAmiConfBridge(
  computed(() => ami.getClient()),
  {
    onUserJoin: (user) => {
      console.log(`${user.callerIdName} joined ${user.conference}`)
    },
    onUserLeave: (user) => {
      console.log(`${user.callerIdName} left ${user.conference}`)
    },
    onTalkingChange: (user, talking) => {
      console.log(`${user.callerIdName} ${talking ? 'started' : 'stopped'} talking`)
    },
  }
)
```

## Key Composables

| Composable         | Purpose                          |
| ------------------ | -------------------------------- |
| `useAmiConfBridge` | ConfBridge conference management |

## Type Definitions

```typescript
interface ConfBridgeRoom {
  conference: string
  parties: number
  locked: boolean
  muted: boolean
  recording: boolean
  markedUsers: number
}

interface ConfBridgeUser {
  conference: string
  callerIdNum: string
  callerIdName: string
  channel: string
  admin: boolean
  marked: boolean
  muted: boolean
  talking: boolean
  joinedAt: Date
}
```

## Related

- [Conference Calls](/examples/conference)
- [Queue Monitor](/examples/queue-monitor)
- [Agent Login](/examples/agent-login)

````

**Step 2: Add to sidebar**

In `docs/.vitepress/config.ts`, find the "Call Center (AMI)" section and add:
```typescript
{ text: 'ConfBridge Manager', link: '/examples/confbridge' },
````

**Step 3: Verify docs build**

Run: `pnpm docs:build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add docs/examples/confbridge.md docs/.vitepress/config.ts
git commit -m "docs: add ConfBridge documentation and example"
```

---

## Task 6: PJSIP Management Types

**Files:**

- Create: `src/types/pjsip.types.ts`

**Step 1: Create PJSIP type definitions**

```typescript
/**
 * PJSIP Management Types
 *
 * Type definitions for PJSIP endpoint and registration management via AMI.
 *
 * @module types/pjsip.types
 */

import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * PJSIP Endpoint status
 */
export type PjsipEndpointState = 'Unavailable' | 'Not in use' | 'Busy' | 'Invalid' | 'Ringing'

/**
 * PJSIP Registration status
 */
export type PjsipRegistrationState = 'Registered' | 'Unregistered' | 'Rejected'

/**
 * PJSIP Endpoint
 */
export interface PjsipEndpoint {
  /** Endpoint name/ID */
  endpoint: string
  /** Device state */
  deviceState: PjsipEndpointState
  /** Active channel count */
  activeChannels: number
  /** Transport type */
  transport: string
  /** Associated AOR */
  aor: string
  /** Contacts (registrations) */
  contacts: PjsipContact[]
}

/**
 * PJSIP Contact/Registration
 */
export interface PjsipContact {
  /** Contact URI */
  uri: string
  /** Contact status */
  status: PjsipRegistrationState
  /** Round trip time in ms */
  roundTripTime: number
  /** User agent string */
  userAgent: string
  /** Registered expiry time */
  expirationTime: Date
  /** Via address */
  viaAddress: string
  /** Call ID */
  callId: string
}

/**
 * PJSIP Registration (outbound)
 */
export interface PjsipRegistration {
  /** Registration name */
  registration: string
  /** Status */
  status: 'Registered' | 'Unregistered' | 'Rejected'
  /** Server URI */
  serverUri: string
  /** Client URI */
  clientUri: string
  /** Next registration time */
  nextRegistration: Date
}

/**
 * Qualify result
 */
export interface PjsipQualifyResult {
  endpoint: string
  success: boolean
  roundTripTime?: number
  error?: string
}

// ============================================================================
// Event Types
// ============================================================================

export interface AmiPjsipEndpointListEvent {
  Event: 'EndpointList'
  ObjectType: 'endpoint'
  ObjectName: string
  Transport: string
  Aor: string
  DeviceState: string
  ActiveChannels: string
}

export interface AmiPjsipContactStatusEvent {
  Event: 'ContactStatus'
  URI: string
  ContactStatus: string
  AOR: string
  EndpointName: string
  RoundtripUsec: string
  UserAgent: string
  RegExpire: string
  ViaAddress: string
  CallID: string
}

export interface AmiPjsipRegistrationEvent {
  Event: 'RegistrationDetail'
  ObjectType: 'registration'
  ObjectName: string
  Status: string
  ServerUri: string
  ClientUri: string
  NextReg: string
}

// ============================================================================
// Options Types
// ============================================================================

export interface UseAmiPjsipOptions extends BaseAmiOptions {
  /** Filter endpoints by name pattern */
  endpointFilter?: (endpoint: PjsipEndpoint) => boolean
  /** Transform endpoint data after parsing */
  transformEndpoint?: (endpoint: PjsipEndpoint) => PjsipEndpoint
  /** Callback when contact status changes */
  onContactStatusChange?: (endpoint: string, contact: PjsipContact) => void
  /** Auto-qualify endpoints on refresh */
  autoQualify?: boolean
}
```

**Step 2: Commit**

```bash
git add src/types/pjsip.types.ts
git commit -m "feat(types): add PJSIP management type definitions"
```

---

## Task 7: PJSIP Management Composable

**Files:**

- Create: `src/composables/useAmiPjsip.ts`
- Modify: `src/composables/index.ts`
- Modify: `src/index.ts`

**Step 1: Create the composable**

````typescript
/**
 * AMI PJSIP Management Composable
 *
 * Vue composable for PJSIP endpoint and registration management via AMI.
 * Provides endpoint listing, qualification, and registration control.
 *
 * @module composables/useAmiPjsip
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction } from '@/types/ami.types'
import type {
  PjsipEndpoint,
  PjsipContact,
  PjsipRegistration,
  PjsipQualifyResult,
  UseAmiPjsipOptions,
  AmiPjsipEndpointListEvent,
  AmiPjsipContactStatusEvent,
  AmiPjsipRegistrationEvent,
} from '@/types/pjsip.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiPjsip')

/**
 * Return type for useAmiPjsip composable
 */
export interface UseAmiPjsipReturn {
  // State
  /** Map of endpoints by name */
  endpoints: Ref<Map<string, PjsipEndpoint>>
  /** Map of outbound registrations */
  registrations: Ref<Map<string, PjsipRegistration>>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>

  // Computed
  /** All endpoints as array */
  endpointList: ComputedRef<PjsipEndpoint[]>
  /** Online endpoints (with contacts) */
  onlineEndpoints: ComputedRef<PjsipEndpoint[]>
  /** Offline endpoints */
  offlineEndpoints: ComputedRef<PjsipEndpoint[]>
  /** Outbound registrations as array */
  registrationList: ComputedRef<PjsipRegistration[]>

  // Actions
  /** List all PJSIP endpoints */
  listEndpoints: () => Promise<PjsipEndpoint[]>
  /** Get endpoint details */
  showEndpoint: (endpoint: string) => Promise<PjsipEndpoint | null>
  /** Qualify an endpoint (check if reachable) */
  qualifyEndpoint: (endpoint: string) => Promise<PjsipQualifyResult>
  /** Qualify all endpoints */
  qualifyAll: () => Promise<PjsipQualifyResult[]>
  /** List outbound registrations */
  listRegistrations: () => Promise<PjsipRegistration[]>
  /** Force re-registration of an outbound registration */
  registerOutbound: (registration: string) => Promise<boolean>
  /** Unregister an outbound registration */
  unregisterOutbound: (registration: string) => Promise<boolean>

  // Utilities
  /** Refresh all data */
  refresh: () => Promise<void>
}

/**
 * AMI PJSIP Management Composable
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   endpointList,
 *   onlineEndpoints,
 *   listEndpoints,
 *   qualifyEndpoint,
 * } = useAmiPjsip(computed(() => ami.getClient()))
 *
 * // List all endpoints
 * await listEndpoints()
 *
 * // Check if an endpoint is reachable
 * const result = await qualifyEndpoint('1001')
 * console.log(`RTT: ${result.roundTripTime}ms`)
 * ```
 */
export function useAmiPjsip(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiPjsipOptions = {}
): UseAmiPjsipReturn {
  const {
    useEvents = true,
    autoRefresh = true,
    endpointFilter,
    transformEndpoint,
    onContactStatusChange,
    autoQualify = false,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const endpoints = ref<Map<string, PjsipEndpoint>>(new Map())
  const registrations = ref<Map<string, PjsipRegistration>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const endpointList = computed(() => {
    const list = Array.from(endpoints.value.values())
    return endpointFilter ? list.filter(endpointFilter) : list
  })

  const onlineEndpoints = computed(() => endpointList.value.filter((e) => e.contacts.length > 0))

  const offlineEndpoints = computed(() => endpointList.value.filter((e) => e.contacts.length === 0))

  const registrationList = computed(() => Array.from(registrations.value.values()))

  // ============================================================================
  // AMI Actions
  // ============================================================================

  async function sendAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    return client.send(action)
  }

  async function listEndpoints(): Promise<PjsipEndpoint[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'PJSIPShowEndpoints' })
      const events = (response.events || []) as AmiPjsipEndpointListEvent[]

      endpoints.value.clear()
      for (const event of events) {
        if (event.Event === 'EndpointList' && event.ObjectType === 'endpoint') {
          let endpoint: PjsipEndpoint = {
            endpoint: event.ObjectName,
            deviceState: event.DeviceState as PjsipEndpoint['deviceState'],
            activeChannels: parseInt(event.ActiveChannels || '0', 10),
            transport: event.Transport || '',
            aor: event.Aor || '',
            contacts: [],
          }

          if (transformEndpoint) {
            endpoint = transformEndpoint(endpoint)
          }

          endpoints.value.set(endpoint.endpoint, endpoint)
        }
      }

      // Optionally qualify all endpoints
      if (autoQualify) {
        await qualifyAll()
      }

      return endpointList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list endpoints'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function showEndpoint(endpointName: string): Promise<PjsipEndpoint | null> {
    try {
      const response = await sendAction({
        Action: 'PJSIPShowEndpoint',
        Endpoint: endpointName,
      })
      // Parse detailed endpoint info
      const endpoint = endpoints.value.get(endpointName)
      return endpoint || null
    } catch (err) {
      logger.error('Failed to show endpoint', err)
      return null
    }
  }

  async function qualifyEndpoint(endpointName: string): Promise<PjsipQualifyResult> {
    try {
      const response = await sendAction({
        Action: 'PJSIPQualify',
        Endpoint: endpointName,
      })

      return {
        endpoint: endpointName,
        success: true,
        roundTripTime: 0, // Will be updated via event
      }
    } catch (err) {
      return {
        endpoint: endpointName,
        success: false,
        error: err instanceof Error ? err.message : 'Qualify failed',
      }
    }
  }

  async function qualifyAll(): Promise<PjsipQualifyResult[]> {
    const results: PjsipQualifyResult[] = []
    for (const endpoint of endpointList.value) {
      const result = await qualifyEndpoint(endpoint.endpoint)
      results.push(result)
    }
    return results
  }

  async function listRegistrations(): Promise<PjsipRegistration[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'PJSIPShowRegistrationsOutbound' })
      const events = (response.events || []) as AmiPjsipRegistrationEvent[]

      registrations.value.clear()
      for (const event of events) {
        if (event.Event === 'RegistrationDetail') {
          const registration: PjsipRegistration = {
            registration: event.ObjectName,
            status: event.Status as PjsipRegistration['status'],
            serverUri: event.ServerUri || '',
            clientUri: event.ClientUri || '',
            nextRegistration: new Date(event.NextReg || Date.now()),
          }
          registrations.value.set(registration.registration, registration)
        }
      }

      return registrationList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list registrations'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function registerOutbound(registration: string): Promise<boolean> {
    try {
      await sendAction({
        Action: 'PJSIPRegister',
        Registration: registration,
      })
      return true
    } catch (err) {
      logger.error('Failed to register', err)
      return false
    }
  }

  async function unregisterOutbound(registration: string): Promise<boolean> {
    try {
      await sendAction({
        Action: 'PJSIPUnregister',
        Registration: registration,
      })
      return true
    } catch (err) {
      logger.error('Failed to unregister', err)
      return false
    }
  }

  async function refresh(): Promise<void> {
    await Promise.all([listEndpoints(), listRegistrations()])
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    const handleContactStatus = (event: AmiPjsipContactStatusEvent) => {
      const endpoint = endpoints.value.get(event.EndpointName)
      if (endpoint) {
        const contact: PjsipContact = {
          uri: event.URI,
          status: event.ContactStatus as PjsipContact['status'],
          roundTripTime: parseInt(event.RoundtripUsec || '0', 10) / 1000,
          userAgent: event.UserAgent || '',
          expirationTime: new Date(parseInt(event.RegExpire || '0', 10) * 1000),
          viaAddress: event.ViaAddress || '',
          callId: event.CallID || '',
        }

        // Update or add contact
        const existingIdx = endpoint.contacts.findIndex((c) => c.uri === contact.uri)
        if (existingIdx >= 0) {
          endpoint.contacts[existingIdx] = contact
        } else {
          endpoint.contacts.push(contact)
        }

        onContactStatusChange?.(event.EndpointName, contact)
        logger.debug('Contact status updated', event.EndpointName, contact.status)
      }
    }

    client.on(
      'ContactStatus' as keyof import('@/types/ami.types').AmiClientEvents,
      handleContactStatus
    )

    eventCleanups.push(() =>
      client.off(
        'ContactStatus' as keyof import('@/types/ami.types').AmiClientEvents,
        handleContactStatus
      )
    )
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
          refresh().catch((err) => logger.error('Initial refresh failed', err))
        }
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanupEvents()
    endpoints.value.clear()
    registrations.value.clear()
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    endpoints,
    registrations,
    isLoading,
    error,

    // Computed
    endpointList,
    onlineEndpoints,
    offlineEndpoints,
    registrationList,

    // Actions
    listEndpoints,
    showEndpoint,
    qualifyEndpoint,
    qualifyAll,
    listRegistrations,
    registerOutbound,
    unregisterOutbound,

    // Utilities
    refresh,
  }
}
````

**Step 2: Export from composables index**

Add to `src/composables/index.ts`:

```typescript
export { useAmiPjsip, type UseAmiPjsipReturn } from './useAmiPjsip'
```

**Step 3: Export types from main index**

Add to `src/index.ts`:

```typescript
export type * from './types/pjsip.types'
```

**Step 4: Commit**

```bash
git add src/composables/useAmiPjsip.ts src/composables/index.ts src/index.ts
git commit -m "feat(ami): add useAmiPjsip composable for PJSIP endpoint management"
```

---

## Task 8: System Health Types and Composable

**Files:**

- Create: `src/types/system.types.ts`
- Create: `src/composables/useAmiSystem.ts`
- Modify: `src/composables/index.ts`
- Modify: `src/index.ts`

**Step 1: Create system types**

```typescript
/**
 * System Health Types
 *
 * Type definitions for Asterisk system health monitoring via AMI.
 *
 * @module types/system.types
 */

import type { BaseAmiOptions } from './common'

export interface CoreStatus {
  /** Asterisk version */
  asteriskVersion: string
  /** System uptime in seconds */
  uptime: number
  /** Reload count */
  reloadCount: number
  /** Last reload time */
  lastReload: Date
  /** Current call count */
  currentCalls: number
  /** Max concurrent calls seen */
  maxCalls: number
}

export interface CoreChannel {
  /** Channel name */
  channel: string
  /** Channel state */
  state: string
  /** Application running */
  application: string
  /** Application data */
  data: string
  /** Caller ID */
  callerIdNum: string
  callerIdName: string
  /** Connected line */
  connectedLineNum: string
  connectedLineName: string
  /** Duration */
  duration: number
  /** Bridge ID */
  bridgeId?: string
}

export interface ModuleInfo {
  /** Module name */
  module: string
  /** Module description */
  description: string
  /** Load status */
  status: 'Running' | 'Stopped' | 'Not Running'
  /** Use count */
  useCount: number
}

export interface UseAmiSystemOptions extends BaseAmiOptions {
  /** Polling interval for status updates (ms) */
  statusPollInterval?: number
  /** Callback when uptime changes */
  onStatusUpdate?: (status: CoreStatus) => void
}
```

**Step 2: Create system composable**

```typescript
/**
 * AMI System Health Composable
 *
 * Vue composable for Asterisk system health monitoring via AMI.
 * Provides core status, channel listing, and module management.
 *
 * @module composables/useAmiSystem
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction } from '@/types/ami.types'
import type { CoreStatus, CoreChannel, ModuleInfo, UseAmiSystemOptions } from '@/types/system.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiSystem')

export interface UseAmiSystemReturn {
  // State
  coreStatus: Ref<CoreStatus | null>
  channels: Ref<Map<string, CoreChannel>>
  modules: Ref<Map<string, ModuleInfo>>
  isLoading: Ref<boolean>
  error: Ref<string | null>

  // Computed
  channelList: ComputedRef<CoreChannel[]>
  moduleList: ComputedRef<ModuleInfo[]>
  formattedUptime: ComputedRef<string>
  isHealthy: ComputedRef<boolean>

  // Actions
  getCoreStatus: () => Promise<CoreStatus>
  getChannels: () => Promise<CoreChannel[]>
  getModules: () => Promise<ModuleInfo[]>
  reloadModule: (module: string) => Promise<boolean>
  loadModule: (module: string) => Promise<boolean>
  unloadModule: (module: string) => Promise<boolean>
  ping: () => Promise<number>

  // Utilities
  refresh: () => Promise<void>
}

export function useAmiSystem(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiSystemOptions = {}
): UseAmiSystemReturn {
  const { autoRefresh = true, statusPollInterval = 30000, onStatusUpdate } = options

  const coreStatus = ref<CoreStatus | null>(null)
  const channels = ref<Map<string, CoreChannel>>(new Map())
  const modules = ref<Map<string, ModuleInfo>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const channelList = computed(() => Array.from(channels.value.values()))
  const moduleList = computed(() => Array.from(modules.value.values()))

  const formattedUptime = computed(() => {
    if (!coreStatus.value) return '0s'
    const seconds = coreStatus.value.uptime
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  })

  const isHealthy = computed(() => {
    return coreStatus.value !== null && coreStatus.value.uptime > 0
  })

  async function sendAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) throw new Error('AMI client not connected')
    return client.send(action)
  }

  async function getCoreStatus(): Promise<CoreStatus> {
    isLoading.value = true
    try {
      const response = await sendAction({ Action: 'CoreStatus' })
      const status: CoreStatus = {
        asteriskVersion: String(response.AsteriskVersion || ''),
        uptime: parseInt(String(response.CoreUptime || '0'), 10),
        reloadCount: parseInt(String(response.CoreReloadCount || '0'), 10),
        lastReload: new Date(String(response.CoreReloadTime || Date.now())),
        currentCalls: parseInt(String(response.CoreCurrentCalls || '0'), 10),
        maxCalls: parseInt(String(response.CoreMaxCalls || '0'), 10),
      }
      coreStatus.value = status
      onStatusUpdate?.(status)
      return status
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get status'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function getChannels(): Promise<CoreChannel[]> {
    isLoading.value = true
    try {
      const response = await sendAction({ Action: 'CoreShowChannels' })
      const events = (response.events || []) as Record<string, string>[]

      channels.value.clear()
      for (const event of events) {
        if (event.Event === 'CoreShowChannel') {
          const channel: CoreChannel = {
            channel: event.Channel,
            state: event.State || '',
            application: event.Application || '',
            data: event.Data || '',
            callerIdNum: event.CallerIDNum || '',
            callerIdName: event.CallerIDName || '',
            connectedLineNum: event.ConnectedLineNum || '',
            connectedLineName: event.ConnectedLineName || '',
            duration: parseInt(event.Duration || '0', 10),
            bridgeId: event.BridgeId,
          }
          channels.value.set(channel.channel, channel)
        }
      }

      return channelList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get channels'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function getModules(): Promise<ModuleInfo[]> {
    isLoading.value = true
    try {
      const response = await sendAction({ Action: 'ModuleCheck' })
      // Parse module list
      return moduleList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get modules'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function reloadModule(module: string): Promise<boolean> {
    try {
      await sendAction({ Action: 'ModuleLoad', Module: module, LoadType: 'Reload' })
      return true
    } catch {
      return false
    }
  }

  async function loadModule(module: string): Promise<boolean> {
    try {
      await sendAction({ Action: 'ModuleLoad', Module: module, LoadType: 'Load' })
      return true
    } catch {
      return false
    }
  }

  async function unloadModule(module: string): Promise<boolean> {
    try {
      await sendAction({ Action: 'ModuleLoad', Module: module, LoadType: 'Unload' })
      return true
    } catch {
      return false
    }
  }

  async function ping(): Promise<number> {
    const start = Date.now()
    await sendAction({ Action: 'Ping' })
    return Date.now() - start
  }

  async function refresh(): Promise<void> {
    await Promise.all([getCoreStatus(), getChannels()])
  }

  function startPolling(): void {
    if (pollTimer || !statusPollInterval) return
    pollTimer = setInterval(() => {
      getCoreStatus().catch((err) => logger.error('Poll failed', err))
    }, statusPollInterval)
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(
    amiClientRef,
    (newClient, oldClient) => {
      if (oldClient) stopPolling()
      if (newClient) {
        if (autoRefresh) {
          refresh().catch((err) => logger.error('Initial refresh failed', err))
        }
        startPolling()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    stopPolling()
    channels.value.clear()
    modules.value.clear()
  })

  return {
    coreStatus,
    channels,
    modules,
    isLoading,
    error,
    channelList,
    moduleList,
    formattedUptime,
    isHealthy,
    getCoreStatus,
    getChannels,
    getModules,
    reloadModule,
    loadModule,
    unloadModule,
    ping,
    refresh,
  }
}
```

**Step 3: Export**

Add to `src/composables/index.ts`:

```typescript
export { useAmiSystem, type UseAmiSystemReturn } from './useAmiSystem'
```

Add to `src/index.ts`:

```typescript
export type * from './types/system.types'
```

**Step 4: Commit**

```bash
git add src/types/system.types.ts src/composables/useAmiSystem.ts src/composables/index.ts src/index.ts
git commit -m "feat(ami): add useAmiSystem composable for system health monitoring"
```

---

## Task 9: MWI (Message Waiting Indicator) Types and Composable

**Files:**

- Create: `src/types/mwi.types.ts`
- Create: `src/composables/useAmiMWI.ts`
- Modify: `src/composables/index.ts`
- Modify: `src/index.ts`

**Step 1: Create MWI types**

```typescript
/**
 * MWI (Message Waiting Indicator) Types
 *
 * Type definitions for voicemail lamp/indicator control via AMI.
 *
 * @module types/mwi.types
 */

import type { BaseAmiOptions } from './common'

export interface MWIStatus {
  /** Mailbox (extension@context) */
  mailbox: string
  /** Number of new messages */
  newMessages: number
  /** Number of old messages */
  oldMessages: number
  /** Number of urgent new messages */
  urgentNew: number
  /** Number of urgent old messages */
  urgentOld: number
  /** Whether indicator should be on */
  indicatorOn: boolean
}

export interface AmiMWIEvent {
  Event: 'MessageWaiting'
  Mailbox: string
  Waiting: 'Yes' | 'No' | '1' | '0'
  New: string
  Old: string
}

export interface UseAmiMWIOptions extends BaseAmiOptions {
  /** Default voicemail context */
  defaultContext?: string
  /** Callback when MWI status changes */
  onMWIChange?: (mailbox: string, status: MWIStatus) => void
}
```

**Step 2: Create MWI composable**

```typescript
/**
 * AMI MWI Composable
 *
 * Vue composable for Message Waiting Indicator control via AMI.
 * Provides voicemail lamp status management.
 *
 * @module composables/useAmiMWI
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction } from '@/types/ami.types'
import type { MWIStatus, AmiMWIEvent, UseAmiMWIOptions } from '@/types/mwi.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiMWI')

export interface UseAmiMWIReturn {
  // State
  mailboxes: Ref<Map<string, MWIStatus>>
  isLoading: Ref<boolean>
  error: Ref<string | null>

  // Computed
  mailboxList: ComputedRef<MWIStatus[]>
  mailboxesWithMessages: ComputedRef<MWIStatus[]>

  // Actions
  getMailboxStatus: (mailbox: string) => Promise<MWIStatus>
  updateMWI: (mailbox: string, newMessages: number, oldMessages?: number) => Promise<boolean>
  deleteMWI: (mailbox: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useAmiMWI(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiMWIOptions = {}
): UseAmiMWIReturn {
  const { useEvents = true, defaultContext = 'default', onMWIChange } = options

  const mailboxes = ref<Map<string, MWIStatus>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const eventCleanups: Array<() => void> = []

  const mailboxList = computed(() => Array.from(mailboxes.value.values()))
  const mailboxesWithMessages = computed(() =>
    mailboxList.value.filter((m) => m.newMessages > 0 || m.oldMessages > 0)
  )

  function formatMailbox(mailbox: string): string {
    return mailbox.includes('@') ? mailbox : `${mailbox}@${defaultContext}`
  }

  async function sendAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) throw new Error('AMI client not connected')
    return client.send(action)
  }

  async function getMailboxStatus(mailbox: string): Promise<MWIStatus> {
    const formattedMailbox = formatMailbox(mailbox)
    isLoading.value = true
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

  async function updateMWI(
    mailbox: string,
    newMessages: number,
    oldMessages: number = 0
  ): Promise<boolean> {
    const formattedMailbox = formatMailbox(mailbox)
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
      }
      mailboxes.value.set(formattedMailbox, status)

      return true
    } catch (err) {
      logger.error('Failed to update MWI', err)
      return false
    }
  }

  async function deleteMWI(mailbox: string): Promise<boolean> {
    const formattedMailbox = formatMailbox(mailbox)
    try {
      await sendAction({
        Action: 'MWIDelete',
        Mailbox: formattedMailbox,
      })
      mailboxes.value.delete(formattedMailbox)
      return true
    } catch (err) {
      logger.error('Failed to delete MWI', err)
      return false
    }
  }

  async function refresh(): Promise<void> {
    // Refresh status for all known mailboxes
    for (const mailbox of mailboxes.value.keys()) {
      await getMailboxStatus(mailbox)
    }
  }

  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    const handleMWI = (event: AmiMWIEvent) => {
      const status: MWIStatus = {
        mailbox: event.Mailbox,
        newMessages: parseInt(event.New || '0', 10),
        oldMessages: parseInt(event.Old || '0', 10),
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: event.Waiting === 'Yes' || event.Waiting === '1',
      }

      mailboxes.value.set(event.Mailbox, status)
      onMWIChange?.(event.Mailbox, status)
      logger.debug('MWI updated', event.Mailbox, status.indicatorOn)
    }

    client.on('MessageWaiting' as keyof import('@/types/ami.types').AmiClientEvents, handleMWI)

    eventCleanups.push(() =>
      client.off('MessageWaiting' as keyof import('@/types/ami.types').AmiClientEvents, handleMWI)
    )
  }

  function cleanupEvents(): void {
    eventCleanups.forEach((cleanup) => cleanup())
    eventCleanups.length = 0
  }

  watch(
    amiClientRef,
    (newClient, oldClient) => {
      if (oldClient) cleanupEvents()
      if (newClient) setupEvents()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanupEvents()
    mailboxes.value.clear()
  })

  return {
    mailboxes,
    isLoading,
    error,
    mailboxList,
    mailboxesWithMessages,
    getMailboxStatus,
    updateMWI,
    deleteMWI,
    refresh,
  }
}
```

**Step 3: Export**

Add to `src/composables/index.ts`:

```typescript
export { useAmiMWI, type UseAmiMWIReturn } from './useAmiMWI'
```

Add to `src/index.ts`:

```typescript
export type * from './types/mwi.types'
```

**Step 4: Commit**

```bash
git add src/types/mwi.types.ts src/composables/useAmiMWI.ts src/composables/index.ts src/index.ts
git commit -m "feat(ami): add useAmiMWI composable for message waiting indicators"
```

---

## Task 10: Create Remaining Playground Demos

**Files:**

- Create: `playground/demos/PjsipDemo.vue`
- Create: `playground/demos/SystemHealthDemo.vue`
- Create: `playground/demos/MWIDemo.vue`
- Modify: `playground/App.vue`

Follow the same pattern as ConfBridgeDemo.vue for each demo. Include SimulationControls, connection panel, and feature-specific UI.

**Step 1: Create each demo component** (abbreviated - follow ConfBridgeDemo pattern)

**Step 2: Add to App.vue demos list**

```typescript
{ name: 'PjsipDemo', label: 'PJSIP Endpoints', icon: 'pi pi-server', category: 'AMI' },
{ name: 'SystemHealthDemo', label: 'System Health', icon: 'pi pi-heart', category: 'AMI' },
{ name: 'MWIDemo', label: 'Message Waiting', icon: 'pi pi-envelope', category: 'AMI' },
```

**Step 3: Commit**

```bash
git add playground/demos/PjsipDemo.vue playground/demos/SystemHealthDemo.vue playground/demos/MWIDemo.vue playground/App.vue
git commit -m "feat(playground): add PJSIP, System Health, and MWI demo components"
```

---

## Task 11: Create Remaining Documentation

**Files:**

- Create: `docs/examples/pjsip-endpoints.md`
- Create: `docs/examples/system-health.md`
- Create: `docs/examples/mwi.md`
- Modify: `docs/.vitepress/config.ts`

Follow the same documentation pattern as confbridge.md for each feature.

**Step 1: Create each documentation page** (follow confbridge.md pattern)

**Step 2: Update sidebar**

In `docs/.vitepress/config.ts`, update the "Call Center (AMI)" section:

```typescript
{
  text: 'Call Center (AMI)',
  collapsed: true,
  items: [
    { text: 'Agent Login', link: '/examples/agent-login' },
    { text: 'Queue Monitor', link: '/examples/queue-monitor' },
    { text: 'CDR Dashboard', link: '/examples/cdr-dashboard' },
    { text: 'ConfBridge Manager', link: '/examples/confbridge' },
    { text: 'PJSIP Endpoints', link: '/examples/pjsip-endpoints' },
    { text: 'System Health', link: '/examples/system-health' },
    { text: 'Message Waiting', link: '/examples/mwi' },
  ],
},
```

**Step 3: Commit**

```bash
git add docs/examples/pjsip-endpoints.md docs/examples/system-health.md docs/examples/mwi.md docs/.vitepress/config.ts
git commit -m "docs: add PJSIP, System Health, and MWI documentation"
```

---

## Task 12: Final Verification and Build

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run linting**

Run: `pnpm lint`
Expected: No errors

**Step 3: Build library**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Build docs**

Run: `pnpm docs:build`
Expected: Build succeeds

**Step 5: Create PR**

```bash
git push -u origin feature/ami-advanced-features
gh pr create --title "feat(ami): add advanced AMI features (ConfBridge, PJSIP, System Health, MWI)" \
  --body "## Summary
Adds 4 new AMI composables with full documentation, playground demos, and tests:
- useAmiConfBridge - Native Asterisk conferencing management
- useAmiPjsip - PJSIP endpoint and registration management
- useAmiSystem - System health monitoring
- useAmiMWI - Message waiting indicator control

## Changes
- 4 new composables in src/composables/
- 4 new type definition files in src/types/
- 4 new playground demos
- 4 new documentation pages
- Unit tests for all composables
- Updated sidebar navigation

## Test plan
- [ ] All unit tests pass
- [ ] Playground demos work with simulation mode
- [ ] Documentation builds and links work
- [ ] TypeScript types export correctly"
```

---

## Summary

| Feature       | Composable       | Types               | Demo                 | Docs               |
| ------------- | ---------------- | ------------------- | -------------------- | ------------------ |
| ConfBridge    | useAmiConfBridge | confbridge.types.ts | ConfBridgeDemo.vue   | confbridge.md      |
| PJSIP         | useAmiPjsip      | pjsip.types.ts      | PjsipDemo.vue        | pjsip-endpoints.md |
| System Health | useAmiSystem     | system.types.ts     | SystemHealthDemo.vue | system-health.md   |
| MWI           | useAmiMWI        | mwi.types.ts        | MWIDemo.vue          | mwi.md             |

Each composable:

- Extends the existing architecture patterns (uses `useAmiBase` concepts)
- Includes TypeScript types with JSDoc
- Has playground demo with SimulationControls
- Has documentation with quick start code
- Follows TDD with tests
