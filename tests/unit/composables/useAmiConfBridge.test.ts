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
  })
})
