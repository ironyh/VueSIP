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
    sendAction: vi.fn().mockResolvedValue({ data: {} }),
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

      // Composable listens to generic 'event' and filters by Event property
      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })
  })

  describe('listRooms', () => {
    it('should fetch and parse conference rooms', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: {
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
        },
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
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { muteUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await muteUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ConfbridgeMute',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
      })
    })

    it('should kick a user', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { kickUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await kickUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
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
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { lockRoom } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await lockRoom('1000')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ConfbridgeLock',
        Conference: '1000',
      })
    })

    it('should start recording', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { startRecording } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await startRecording('1000', '/var/spool/asterisk/monitor/conf-1000.wav')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
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

      // Emit 'event' with data wrapper structure matching AmiMessage
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeJoin',
          Conference: '1000',
          CallerIDNum: '1001',
          CallerIDName: 'John Doe',
          Channel: 'PJSIP/1001-00000001',
          Admin: 'No',
          Marked: 'No',
          Muted: 'No',
        },
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
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeJoin',
          Conference: '1000',
          Channel: 'PJSIP/1001-00000001',
          CallerIDNum: '1001',
          CallerIDName: 'John',
          Admin: 'No',
          Marked: 'No',
          Muted: 'No',
        },
      })
      await nextTick()

      // Then talking event
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeTalking',
          Conference: '1000',
          Channel: 'PJSIP/1001-00000001',
          TalkingStatus: 'on',
        },
      })
      await nextTick()

      const user = users.value.get('PJSIP/1001-00000001')
      expect(user?.talking).toBe(true)
      expect(onTalkingChange).toHaveBeenCalledWith(expect.any(Object), true)
    })

    it('should handle user leave events', async () => {
      const onUserLeave = vi.fn()
      clientRef.value = mockClient
      const { users, rooms } = useAmiConfBridge(clientRef, { autoRefresh: false, onUserLeave })
      await nextTick()

      // Add a room first
      rooms.value.set('1000', {
        conference: '1000',
        parties: 1,
        locked: false,
        muted: false,
        recording: false,
        markedUsers: 0,
      })

      // Add a user
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeJoin',
          Conference: '1000',
          Channel: 'PJSIP/1001-00000001',
          CallerIDNum: '1001',
          CallerIDName: 'John',
          Admin: 'No',
          Marked: 'No',
          Muted: 'No',
        },
      })
      await nextTick()
      expect(users.value.size).toBe(1)

      // Leave event
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeLeave',
          Conference: '1000',
          Channel: 'PJSIP/1001-00000001',
        },
      })
      await nextTick()

      expect(users.value.size).toBe(0)
      expect(onUserLeave).toHaveBeenCalled()
    })

    it('should handle leave event for unknown user gracefully', async () => {
      clientRef.value = mockClient
      const { users } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      // Leave event for user that doesn't exist
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeLeave',
          Conference: '1000',
          Channel: 'PJSIP/unknown-00000001',
        },
      })
      await nextTick()

      expect(users.value.size).toBe(0)
    })

    it('should handle talking event for unknown user gracefully', async () => {
      clientRef.value = mockClient
      const { users } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      // Talking event for user that doesn't exist
      mockClient.emit('event', {
        data: {
          Event: 'ConfbridgeTalking',
          Conference: '1000',
          Channel: 'PJSIP/unknown-00000001',
          TalkingStatus: 'on',
        },
      })
      await nextTick()

      expect(users.value.size).toBe(0)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should handle listRooms error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Network error'))
      const { listRooms, error, isLoading } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      await expect(listRooms()).rejects.toThrow('Network error')
      expect(error.value).toBe('Network error')
      expect(isLoading.value).toBe(false)
    })

    it('should handle listRooms non-Error exception', async () => {
      mockClient.sendAction.mockRejectedValue('Unknown error string')
      const { listRooms, error } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      await expect(listRooms()).rejects.toBe('Unknown error string')
      expect(error.value).toBe('Failed to list rooms')
    })

    it('should handle listUsers error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Conference not found'))
      const { listUsers, error } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      await expect(listUsers('9999')).rejects.toThrow('Conference not found')
      expect(error.value).toBe('Conference not found')
    })

    it('should handle lockRoom error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Lock failed'))
      const { lockRoom } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await lockRoom('1000')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Lock failed')
    })

    it('should handle unlockRoom error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Unlock failed'))
      const { unlockRoom } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await unlockRoom('1000')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unlock failed')
    })

    it('should handle stopRecording error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Stop recording failed'))
      const { stopRecording } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await stopRecording('1000')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Stop recording failed')
    })

    it('should handle unmuteUser error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Unmute failed'))
      const { unmuteUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await unmuteUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unmute failed')
    })

    it('should handle setVideoSource error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Set video failed'))
      const { setVideoSource } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await setVideoSource('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Set video failed')
    })

    it('should handle kickUser error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Kick failed'))
      const { kickUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await kickUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Kick failed')
    })
  })

  describe('additional room and user actions', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should unlock a room', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { unlockRoom } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await unlockRoom('1000')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ConfbridgeUnlock',
        Conference: '1000',
      })
    })

    it('should stop recording', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { stopRecording } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await stopRecording('1000')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ConfbridgeStopRecord',
        Conference: '1000',
      })
    })

    it('should unmute a user', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { unmuteUser } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await unmuteUser('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ConfbridgeUnmute',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
      })
    })

    it('should set video source', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { setVideoSource } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await setVideoSource('1000', 'PJSIP/1001-00000001')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ConfbridgeSetSingleVideoSrc',
        Conference: '1000',
        Channel: 'PJSIP/1001-00000001',
      })
    })

    it('should list users in a conference', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: {
          events: [
            {
              Event: 'ConfbridgeList',
              Conference: '1000',
              CallerIDNum: '1001',
              CallerIDName: 'John',
              Channel: 'PJSIP/1001-00000001',
              Admin: 'Yes',
              Marked: 'No',
              Muted: 'No',
            },
          ],
        },
      })

      const { listUsers, users } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      const result = await listUsers('1000')

      expect(result).toHaveLength(1)
      expect(result[0].callerIdNum).toBe('1001')
      expect(result[0].admin).toBe(true)
      expect(users.value.size).toBe(1)
    })

    it('should update room state when lock/unlock succeeds with existing room', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { lockRoom, unlockRoom, rooms } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      // Add a room
      rooms.value.set('1000', {
        conference: '1000',
        parties: 1,
        locked: false,
        muted: false,
        recording: false,
        markedUsers: 0,
      })

      await lockRoom('1000')
      expect(rooms.value.get('1000')?.locked).toBe(true)

      await unlockRoom('1000')
      expect(rooms.value.get('1000')?.locked).toBe(false)
    })

    it('should update user state when mute/unmute succeeds with existing user', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { muteUser, unmuteUser, users } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      // Add a user
      users.value.set('PJSIP/1001-00000001', {
        conference: '1000',
        callerIdNum: '1001',
        callerIdName: 'John',
        channel: 'PJSIP/1001-00000001',
        admin: false,
        marked: false,
        muted: false,
        talking: false,
        joinedAt: new Date(),
      })

      await muteUser('1000', 'PJSIP/1001-00000001')
      expect(users.value.get('PJSIP/1001-00000001')?.muted).toBe(true)

      await unmuteUser('1000', 'PJSIP/1001-00000001')
      expect(users.value.get('PJSIP/1001-00000001')?.muted).toBe(false)
    })

    it('should update room recording state when start/stop succeeds', async () => {
      mockClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })
      const { startRecording, stopRecording, rooms } = useAmiConfBridge(clientRef, {
        autoRefresh: false,
      })
      await nextTick()

      // Add a room
      rooms.value.set('1000', {
        conference: '1000',
        parties: 1,
        locked: false,
        muted: false,
        recording: false,
        markedUsers: 0,
      })

      await startRecording('1000')
      expect(rooms.value.get('1000')?.recording).toBe(true)

      await stopRecording('1000')
      expect(rooms.value.get('1000')?.recording).toBe(false)
    })
  })

  describe('options', () => {
    it('should apply conferenceFilter', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: {
          events: [
            { Event: 'ConfbridgeListRooms', Conference: '1000', Parties: '2', Locked: 'No' },
            { Event: 'ConfbridgeListRooms', Conference: '2000', Parties: '3', Locked: 'Yes' },
          ],
        },
      })

      clientRef.value = mockClient
      const { listRooms, roomList } = useAmiConfBridge(clientRef, {
        autoRefresh: false,
        conferenceFilter: (room) => room.locked === false,
      })
      await nextTick()

      await listRooms()

      expect(roomList.value).toHaveLength(1)
      expect(roomList.value[0].conference).toBe('1000')
    })

    it('should apply transformUser', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: {
          events: [
            {
              Event: 'ConfbridgeList',
              Conference: '1000',
              CallerIDNum: '1001',
              CallerIDName: 'John',
              Channel: 'PJSIP/1001-00000001',
              Admin: 'No',
              Marked: 'No',
              Muted: 'No',
            },
          ],
        },
      })

      clientRef.value = mockClient
      const { listUsers, users } = useAmiConfBridge(clientRef, {
        autoRefresh: false,
        transformUser: (user) => ({ ...user, callerIdName: user.callerIdName.toUpperCase() }),
      })
      await nextTick()

      await listUsers('1000')

      expect(users.value.get('PJSIP/1001-00000001')?.callerIdName).toBe('JOHN')
    })

    it('should not setup events when useEvents is false', async () => {
      clientRef.value = mockClient
      useAmiConfBridge(clientRef, { autoRefresh: false, useEvents: false })
      await nextTick()

      expect(mockClient.on).not.toHaveBeenCalled()
    })
  })

  describe('utilities', () => {
    it('should get users in a specific room', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: {
          events: [
            {
              Event: 'ConfbridgeList',
              Conference: '1000',
              CallerIDNum: '1001',
              CallerIDName: 'John',
              Channel: 'PJSIP/1001-00000001',
              Admin: 'No',
              Marked: 'No',
              Muted: 'No',
            },
            {
              Event: 'ConfbridgeList',
              Conference: '2000',
              CallerIDNum: '1002',
              CallerIDName: 'Jane',
              Channel: 'PJSIP/1002-00000001',
              Admin: 'No',
              Marked: 'No',
              Muted: 'No',
            },
          ],
        },
      })

      clientRef.value = mockClient
      const { listUsers, getUsersInRoom } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      await listUsers('1000')

      const usersIn1000 = getUsersInRoom('1000')
      expect(usersIn1000).toHaveLength(1)
      expect(usersIn1000[0].callerIdNum).toBe('1001')
    })

    it('should refresh all rooms and users', async () => {
      mockClient.sendAction
        .mockResolvedValueOnce({
          data: {
            events: [
              { Event: 'ConfbridgeListRooms', Conference: '1000', Parties: '1', Locked: 'No' },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            events: [
              {
                Event: 'ConfbridgeList',
                Conference: '1000',
                CallerIDNum: '1001',
                Channel: 'PJSIP/1001',
                Admin: 'No',
                Marked: 'No',
                Muted: 'No',
              },
            ],
          },
        })

      clientRef.value = mockClient
      const { refresh, roomList, userList } = useAmiConfBridge(clientRef, { autoRefresh: false })
      await nextTick()

      await refresh()

      expect(roomList.value).toHaveLength(1)
      expect(userList.value).toHaveLength(1)
    })
  })
})
