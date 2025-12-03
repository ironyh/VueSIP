/**
 * Unit tests for useAmiRingGroups composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiRingGroups } from '@/composables/useAmiRingGroups'
import type { AmiClient } from '@/core/AmiClient'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useAmiRingGroups', () => {
  let mockClient: AmiClient
  let eventHandlers: Map<string, Set<(event: unknown) => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    eventHandlers = new Map()

    mockClient = {
      on: vi.fn((event: string, handler: (data: unknown) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, new Set())
        }
        eventHandlers.get(event)!.add(handler)
      }),
      off: vi.fn((event: string, handler: (data: unknown) => void) => {
        eventHandlers.get(event)?.delete(handler)
      }),
      sendAction: vi.fn().mockResolvedValue({ Response: 'Success' }),
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as AmiClient
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function emitEvent(eventData: unknown) {
    const handlers = eventHandlers.get('event')
    const amiMessage = {
      type: 'event' as const,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: eventData,
    }
    handlers?.forEach((handler) => handler(amiMessage))
  }

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, isMonitoring, isLoading, error } = useAmiRingGroups(clientRef)

      expect(ringGroups.value.size).toBe(0)
      expect(isMonitoring.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should auto-start when autoStart option is true', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { isMonitoring } = useAmiRingGroups(clientRef, {
        autoStart: true,
        groupIds: ['600'],
      })

      expect(isMonitoring.value).toBe(true)
    })

    it('should initialize groups from groupIds option', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring } = useAmiRingGroups(clientRef, {
        groupIds: ['600', '601', '602'],
      })

      startMonitoring()

      expect(ringGroups.value.size).toBe(3)
      expect(ringGroups.value.has('600')).toBe(true)
      expect(ringGroups.value.has('601')).toBe(true)
      expect(ringGroups.value.has('602')).toBe(true)
    })
  })

  describe('Monitoring Control', () => {
    it('should start monitoring when startMonitoring is called', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, isMonitoring } = useAmiRingGroups(clientRef)

      startMonitoring()

      expect(isMonitoring.value).toBe(true)
      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should stop monitoring when stopMonitoring is called', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, stopMonitoring, isMonitoring } = useAmiRingGroups(clientRef)

      startMonitoring()
      stopMonitoring()

      expect(isMonitoring.value).toBe(false)
      expect(mockClient.off).toHaveBeenCalled()
    })

    it('should not start monitoring twice', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, isMonitoring } = useAmiRingGroups(clientRef)

      startMonitoring()
      startMonitoring()

      expect(isMonitoring.value).toBe(true)
      expect(mockClient.on).toHaveBeenCalledTimes(1)
    })
  })

  describe('Member Management', () => {
    it('should add a member to a ring group', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const result = await addMember('600', '1001', { name: 'Alice', priority: 1 })

      expect(result.success).toBe(true)
      expect(result.groupId).toBe('600')
      expect(result.member).toBe('1001')

      const group = ringGroups.value.get('600')
      expect(group?.members.length).toBe(1)
      expect(group?.members[0].extension).toBe('1001')
      expect(group?.members[0].name).toBe('Alice')
      expect(group?.members[0].priority).toBe(1)
    })

    it('should reject adding member with invalid extension', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const result = await addMember('600', '<script>alert(1)</script>')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid extension')
    })

    it('should reject adding duplicate member', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      await addMember('600', '1001')
      const result = await addMember('600', '1001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Member already exists')
    })

    it('should remove a member from a ring group', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember, removeMember } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await addMember('600', '1001')
      const result = await removeMember('600', '1001')

      expect(result.success).toBe(true)
      expect(ringGroups.value.get('600')?.members.length).toBe(0)
    })

    it('should reject removing non-existent member', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, removeMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const result = await removeMember('600', '9999')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Member not found')
    })

    it('should enable a member', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember, disableMember, enableMember } =
        useAmiRingGroups(clientRef, { groupIds: ['600'] })

      startMonitoring()
      await addMember('600', '1001')
      await disableMember('600', '1001')

      const group = ringGroups.value.get('600')
      expect(group?.members[0].enabled).toBe(false)

      await enableMember('600', '1001')
      expect(group?.members[0].enabled).toBe(true)
    })

    it('should disable a member', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember, disableMember } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await addMember('600', '1001')
      await disableMember('600', '1001')

      const group = ringGroups.value.get('600')
      expect(group?.members[0].enabled).toBe(false)
    })

    it('should update member priority', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember, setMemberPriority } =
        useAmiRingGroups(clientRef, { groupIds: ['600'] })

      startMonitoring()
      await addMember('600', '1001', { priority: 1 })
      await addMember('600', '1002', { priority: 2 })

      await setMemberPriority('600', '1002', 1)
      await setMemberPriority('600', '1001', 2)

      const group = ringGroups.value.get('600')
      expect(group?.members[0].extension).toBe('1002')
      expect(group?.members[1].extension).toBe('1001')
    })

    it('should reject invalid priority values', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember, setMemberPriority } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await addMember('600', '1001')

      const result = await setMemberPriority('600', '1001', 0)
      expect(result).toBe(false)

      const result2 = await setMemberPriority('600', '1001', 1000)
      expect(result2).toBe(false)
    })
  })

  describe('Ring Group Configuration', () => {
    it('should update ring strategy', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, setStrategy } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const result = await setStrategy('600', 'hunt')

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('hunt')
      expect(ringGroups.value.get('600')?.strategy).toBe('hunt')
    })

    it('should reject invalid ring strategy', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, setStrategy } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const result = await setStrategy('600', 'invalid' as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid ring strategy')
    })

    it('should update ring timeout', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, setRingTimeout } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const result = await setRingTimeout('600', 30)

      expect(result).toBe(true)
      expect(ringGroups.value.get('600')?.ringTimeout).toBe(30)
    })

    it('should reject invalid ring timeout', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, setRingTimeout } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()

      expect(await setRingTimeout('600', 3)).toBe(false) // Too low
      expect(await setRingTimeout('600', 500)).toBe(false) // Too high
    })

    it('should enable a ring group', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, disableGroup, enableGroup } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await disableGroup('600')
      expect(ringGroups.value.get('600')?.enabled).toBe(false)

      await enableGroup('600')
      expect(ringGroups.value.get('600')?.enabled).toBe(true)
      expect(ringGroups.value.get('600')?.state).toBe('idle')
    })

    it('should disable a ring group', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, disableGroup } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      await disableGroup('600')

      const group = ringGroups.value.get('600')
      expect(group?.enabled).toBe(false)
      expect(group?.state).toBe('disabled')
    })
  })

  describe('Event Handling', () => {
    it('should update member status on ExtensionStatus event', async () => {
      const onMemberStatusChange = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onMemberStatusChange,
      })

      startMonitoring()
      await addMember('600', '1001')

      emitEvent({
        Event: 'ExtensionStatus',
        Exten: '1001',
        Status: 'NOT_INUSE',
      })

      const member = ringGroups.value.get('600')?.members[0]
      expect(member?.status).toBe('available')
    })

    it('should handle Dial event (member ringing)', async () => {
      const onEvent = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onEvent,
      })

      startMonitoring()
      await addMember('600', '1001')

      emitEvent({
        Event: 'Dial',
        Channel: 'PJSIP/trunk-0001',
        DestChannel: 'PJSIP/1001-0002',
        CallerIDNum: '5551234567',
      })

      const group = ringGroups.value.get('600')
      expect(group?.state).toBe('ringing')
      expect(group?.members[0].status).toBe('ringing')
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'member_ring',
          groupId: '600',
          member: '1001',
        })
      )
    })

    it('should handle Bridge event (call connected)', async () => {
      const onEvent = vi.fn()
      const onStatsUpdate = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onEvent,
        onStatsUpdate,
      })

      startMonitoring()
      await addMember('600', '1001')

      // First dial
      emitEvent({
        Event: 'Dial',
        DestChannel: 'PJSIP/1001-0002',
      })

      // Then bridge
      emitEvent({
        Event: 'Bridge',
        Channel1: 'PJSIP/trunk-0001',
        Channel2: 'PJSIP/1001-0002',
        CallerIDNum: '5551234567',
      })

      const group = ringGroups.value.get('600')
      expect(group?.state).toBe('connected')
      expect(group?.members[0].status).toBe('busy')
      expect(group?.members[0].callsAnswered).toBe(1)
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'member_answer',
        })
      )
      expect(onStatsUpdate).toHaveBeenCalled()
    })

    it('should handle Hangup event', async () => {
      const onEvent = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onEvent,
      })

      startMonitoring()
      await addMember('600', '1001')

      // Simulate call flow
      emitEvent({ Event: 'Dial', DestChannel: 'PJSIP/1001-0002' })
      emitEvent({
        Event: 'Bridge',
        Channel1: 'PJSIP/trunk-0001',
        Channel2: 'PJSIP/1001-0002',
      })
      emitEvent({
        Event: 'Hangup',
        Channel: 'PJSIP/1001-0002',
        Cause: '16',
      })

      const group = ringGroups.value.get('600')
      expect(group?.state).toBe('idle')
      expect(group?.members[0].status).toBe('available')
      expect(group?.stats.totalCalls).toBe(1)
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'call_complete',
        })
      )
    })
  })

  describe('Statistics', () => {
    it('should track call statistics', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups: _ringGroups, startMonitoring, addMember, getStats } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await addMember('600', '1001')

      // Simulate a completed call
      emitEvent({ Event: 'Dial', DestChannel: 'PJSIP/1001-0002' })
      emitEvent({
        Event: 'Bridge',
        Channel2: 'PJSIP/1001-0002',
      })
      emitEvent({
        Event: 'Hangup',
        Channel: 'PJSIP/1001-0002',
      })

      const stats = getStats('600')
      expect(stats?.totalCalls).toBe(1)
      expect(stats?.answeredCalls).toBe(1)
      expect(stats?.lastCallTime).toBeDefined()
    })

    it('should clear statistics', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember, clearStats } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await addMember('600', '1001')

      // Simulate calls
      emitEvent({ Event: 'Dial', DestChannel: 'PJSIP/1001-0002' })
      emitEvent({ Event: 'Bridge', Channel2: 'PJSIP/1001-0002' })
      emitEvent({ Event: 'Hangup', Channel: 'PJSIP/1001-0002' })

      clearStats('600')

      const group = ringGroups.value.get('600')
      expect(group?.stats.totalCalls).toBe(0)
      expect(group?.stats.answeredCalls).toBe(0)
      expect(group?.members[0].callsAnswered).toBe(0)
    })

    it('should track missed calls', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      await addMember('600', '1001')

      // Ring but no answer
      emitEvent({ Event: 'Dial', DestChannel: 'PJSIP/1001-0002' })
      emitEvent({
        Event: 'Hangup',
        Channel: 'PJSIP/1001-0002',
        Cause: '21', // No answer
      })

      const group = ringGroups.value.get('600')
      expect(group?.members[0].callsMissed).toBe(1)
      expect(group?.stats.unansweredCalls).toBe(1)
    })
  })

  describe('Computed Values', () => {
    it('should compute groupList', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { groupList, startMonitoring } = useAmiRingGroups(clientRef, {
        groupIds: ['600', '601'],
      })

      startMonitoring()

      expect(groupList.value.length).toBe(2)
      expect(groupList.value.map((g) => g.id)).toContain('600')
      expect(groupList.value.map((g) => g.id)).toContain('601')
    })

    it('should compute totalMembers', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { totalMembers, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600', '601'],
      })

      startMonitoring()
      await addMember('600', '1001')
      await addMember('600', '1002')
      await addMember('601', '1003')

      expect(totalMembers.value).toBe(3)
    })

    it('should compute availableMembers', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { availableMembers, ringGroups, startMonitoring, addMember } =
        useAmiRingGroups(clientRef, { groupIds: ['600'] })

      startMonitoring()
      await addMember('600', '1001')
      await addMember('600', '1002')

      // Set members to available
      const group = ringGroups.value.get('600')
      group!.members[0].status = 'available'
      group!.members[1].status = 'busy'

      expect(availableMembers.value).toBe(1)
    })

    it('should compute activeGroups', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { activeGroups, ringGroups, startMonitoring } = useAmiRingGroups(clientRef, {
        groupIds: ['600', '601'],
      })

      startMonitoring()

      ringGroups.value.get('600')!.state = 'ringing'
      ringGroups.value.get('601')!.state = 'idle'

      expect(activeGroups.value.length).toBe(1)
      expect(activeGroups.value[0].id).toBe('600')
    })

    it('should compute disabledGroups', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { disabledGroups, startMonitoring, disableGroup } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600', '601'] }
      )

      startMonitoring()
      await disableGroup('600')

      expect(disabledGroups.value.length).toBe(1)
      expect(disabledGroups.value[0].id).toBe('600')
    })
  })

  describe('Selection', () => {
    it('should select a ring group', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { selectedGroup, startMonitoring, selectGroup } = useAmiRingGroups(clientRef, {
        groupIds: ['600', '601'],
      })

      startMonitoring()
      selectGroup('600')

      expect(selectedGroup.value?.id).toBe('600')
    })

    it('should deselect when null is passed', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { selectedGroup, startMonitoring, selectGroup } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      selectGroup('600')
      selectGroup(null)

      expect(selectedGroup.value).toBeNull()
    })
  })

  describe('Get Methods', () => {
    it('should get ring group by ID', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getRingGroup } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const group = getRingGroup('600')

      expect(group).not.toBeNull()
      expect(group?.id).toBe('600')
    })

    it('should return null for non-existent group', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getRingGroup } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const group = getRingGroup('999')

      expect(group).toBeNull()
    })

    it('should get member status', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember, getMemberStatus } =
        useAmiRingGroups(clientRef, { groupIds: ['600'] })

      startMonitoring()
      await addMember('600', '1001')

      ringGroups.value.get('600')!.members[0].status = 'available'

      const status = getMemberStatus('600', '1001')
      expect(status).toBe('available')
    })

    it('should return null for non-existent member status', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getMemberStatus } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      const status = getMemberStatus('600', '9999')

      expect(status).toBeNull()
    })
  })

  describe('Input Validation', () => {
    it('should reject invalid group IDs', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember, getRingGroup } = useAmiRingGroups(clientRef)

      startMonitoring()

      const result = await addMember('<script>', '1001')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid group ID')

      const group = getRingGroup('<script>')
      expect(group).toBeNull()
    })

    it('should sanitize input for member names', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
      })

      startMonitoring()
      await addMember('600', '1001', { name: '<script>alert(1)</script>' })

      const member = ringGroups.value.get('600')?.members[0]
      expect(member?.name).not.toContain('<script>')
    })
  })

  describe('Error Handling', () => {
    it('should handle AMI client not available', async () => {
      const onError = vi.fn()
      const clientRef = ref<AmiClient | null>(null)
      const { refresh, error } = useAmiRingGroups(clientRef, { onError })

      await refresh()

      expect(error.value).toBe('AMI client not available')
      expect(onError).toHaveBeenCalledWith('AMI client not available')
    })

    it('should handle non-existent group gracefully', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember } = useAmiRingGroups(clientRef)

      startMonitoring()
      const result = await addMember('nonexistent', '1001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Ring group not found')
    })
  })

  describe('Callbacks', () => {
    it('should call onEvent callback', async () => {
      const onEvent = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onEvent,
      })

      startMonitoring()
      await addMember('600', '1001')

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'member_added',
          groupId: '600',
          member: '1001',
        })
      )
    })

    it('should call onStatsUpdate callback', async () => {
      const onStatsUpdate = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onStatsUpdate,
      })

      startMonitoring()
      await addMember('600', '1001')

      // Trigger stats update via event
      emitEvent({ Event: 'Bridge', Channel2: 'PJSIP/1001-0002' })

      expect(onStatsUpdate).toHaveBeenCalledWith(
        '600',
        expect.objectContaining({
          answeredCalls: expect.any(Number),
        })
      )
    })

    it('should call onMemberStatusChange callback', async () => {
      const onMemberStatusChange = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ringGroups, startMonitoring, addMember } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onMemberStatusChange,
      })

      startMonitoring()
      await addMember('600', '1001')

      // Set initial status
      ringGroups.value.get('600')!.members[0].status = 'busy'

      emitEvent({
        Event: 'ExtensionStatus',
        Exten: '1001',
        Status: 'NOT_INUSE',
      })

      expect(onMemberStatusChange).toHaveBeenCalledWith('600', '1001', 'available')
    })
  })

  describe('Refresh', () => {
    it('should refresh ring group data', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          Status: 'NOT_INUSE',
        },
      })

      const { ringGroups, startMonitoring, addMember, refresh } = useAmiRingGroups(
        clientRef,
        { groupIds: ['600'] }
      )

      startMonitoring()
      await addMember('600', '1001')
      await refresh()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'ExtensionState',
          Exten: '1001',
        })
      )

      const member = ringGroups.value.get('600')?.members[0]
      expect(member?.status).toBe('available')
    })

    it('should handle refresh errors gracefully', async () => {
      const onError = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Network error'))

      const { startMonitoring, addMember, refresh, error } = useAmiRingGroups(clientRef, {
        groupIds: ['600'],
        onError,
      })

      startMonitoring()
      await addMember('600', '1001')
      await refresh()

      // Should not throw
      expect(error.value).toBeNull() // Individual member errors don't set global error
    })
  })

  describe('Cleanup', () => {
    it('should clean up on client change', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring } = useAmiRingGroups(clientRef)

      startMonitoring()

      const newClient = {
        ...mockClient,
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as AmiClient

      clientRef.value = newClient

      await nextTick()

      expect(mockClient.off).toHaveBeenCalled()
      expect(newClient.on).toHaveBeenCalled()
    })
  })
})
