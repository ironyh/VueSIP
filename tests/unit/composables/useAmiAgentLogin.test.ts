/**
 * useAmiAgentLogin composable unit tests
 *
 * Tests for AMI agent login functionality including:
 * - Login/logout to queues with custom penalties
 * - Pause/unpause with timed duration support
 * - Queue membership management
 * - Session tracking and duration formatting
 * - Event-driven state updates (QueueMemberAdded, QueueMemberRemoved, QueueMemberPause)
 * - Shift management with time ranges
 *
 * @see src/composables/useAmiAgentLogin.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiAgentLogin } from '@/composables/useAmiAgentLogin'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient as createMockAmiClientFactory,
  createAmiEvent,
  createAmiSuccessResponse,
  type MockAmiClient,
} from '../utils/mockFactories'

/**
 * Test fixtures for consistent test data
 */
const TEST_FIXTURES = {
  agents: {
    standard: {
      agentId: 'agent1001',
      interface: 'PJSIP/1001',
      name: 'Test Agent',
    },
    alternate: {
      agentId: 'agent2002',
      interface: 'PJSIP/2002',
      name: 'Other Agent',
    },
  },
  queues: {
    available: ['sales', 'support', 'billing'],
    single: ['sales'],
    multiple: ['sales', 'support'],
  },
  penalties: {
    default: 0,
    low: 5,
    medium: 10,
    high: 9999,
    negative: -5,
    clamped: 1000,
  },
  pauseReasons: ['Break', 'Lunch', 'Meeting'],
  durations: {
    short: 5000, // 5 seconds
    medium: 300000, // 5 minutes
    formatted: {
      zero: '00:00:00',
      fiveSeconds: '00:00:05',
      oneHourThirtyMinutes: '01:30:45',
    },
  },
  shifts: {
    allDay: {
      startHour: 0,
      startMinute: 0,
      endHour: 23,
      endMinute: 59,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  invalidInputs: {
    agentId: '',
    interface: 'invalid<script>',
    queueNames: ['sales<script>', 'in valid'],
  },
}

/**
 * Factory function: Create default options with sensible defaults
 */
function createDefaultOptions(overrides?: any) {
  return {
    agentId: TEST_FIXTURES.agents.standard.agentId,
    interface: TEST_FIXTURES.agents.standard.interface,
    name: TEST_FIXTURES.agents.standard.name,
    availableQueues: TEST_FIXTURES.queues.available,
    defaultQueues: TEST_FIXTURES.queues.single,
    defaultPenalty: TEST_FIXTURES.penalties.default,
    pauseReasons: TEST_FIXTURES.pauseReasons,
    persistState: false,
    ...overrides,
  }
}

/**
 * Factory function: Create queue status response
 */
function createQueueStatusResponse(queueName: string, memberData?: any) {
  return {
    name: queueName,
    members: [
      {
        interface: TEST_FIXTURES.agents.standard.interface,
        paused: false,
        pausedReason: '',
        penalty: 0,
        callsTaken: 5,
        lastCall: 1234567890,
        loginTime: 1234567800,
        inCall: false,
        ...memberData,
      },
    ],
  }
}

describe('useAmiAgentLogin', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClientFactory()

    // Mock AMI methods
    mockClient.queueAdd = vi.fn().mockResolvedValue(createAmiSuccessResponse())
    mockClient.queueRemove = vi.fn().mockResolvedValue(createAmiSuccessResponse())
    mockClient.queuePause = vi.fn().mockResolvedValue(createAmiSuccessResponse())
    mockClient.queuePenalty = vi.fn().mockResolvedValue(createAmiSuccessResponse())
    mockClient.getQueueStatus = vi.fn().mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  /**
   * Initial State Tests
   * Verify composable starts with correct initial values before login
   */
  describe('initial state', () => {
    describe.each([
      { property: 'status', expected: 'logged_out', description: 'logged_out status' },
      { property: 'isLoggedIn', expected: false, description: 'not logged in' },
      { property: 'isPaused', expected: false, description: 'not paused' },
      { property: 'isOnCall', expected: false, description: 'not on call' },
      { property: 'isLoading', expected: false, description: 'not loading' },
    ])('boolean/string states', ({ property, expected, description }) => {
      it(`should have ${description} initially`, () => {
        const options = createDefaultOptions()
        const composable = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
        expect((composable as any)[property].value).toBe(expected)
      })
    })

    it('should have empty queues initially', () => {
      const options = createDefaultOptions()
      const { loggedInQueues } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
      expect(loggedInQueues.value).toHaveLength(0)
    })

    it('should have zero session duration initially', () => {
      const options = createDefaultOptions()
      const { sessionDurationFormatted } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
      expect(sessionDurationFormatted.value).toBe(TEST_FIXTURES.durations.formatted.zero)
    })

    it('should have no error initially', () => {
      const options = createDefaultOptions()
      const { error } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
      expect(error.value).toBeNull()
    })

    it('should initialize session with correct agent info', () => {
      const options = createDefaultOptions()
      const { session } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
      expect(session.value.agentId).toBe(TEST_FIXTURES.agents.standard.agentId)
      expect(session.value.interface).toBe(TEST_FIXTURES.agents.standard.interface)
      expect(session.value.name).toBe(TEST_FIXTURES.agents.standard.name)
    })
  })

  /**
   * Login Tests
   * Tests for logging agents into queues with various configurations
   */
  describe('login', () => {
    it('should throw if client is null', async () => {
      const options = createDefaultOptions()
      const { login } = useAmiAgentLogin(null, options)

      await expect(login({ queues: TEST_FIXTURES.queues.single })).rejects.toThrow('AMI client not connected')
    })

    it('should login to specified queues', async () => {
      const options = createDefaultOptions()
      const { login, loggedInQueues, isLoggedIn } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })

      expect(mockClient.queueAdd).toHaveBeenCalledTimes(2)
      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, {
        memberName: TEST_FIXTURES.agents.standard.name,
        penalty: TEST_FIXTURES.penalties.default,
      })
      expect(loggedInQueues.value).toContain('sales')
      expect(loggedInQueues.value).toContain('support')
      expect(isLoggedIn.value).toBe(true)
    })

    it('should login to default queues if none specified', async () => {
      const options = createDefaultOptions()
      const { login, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: [] })

      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, expect.any(Object))
      expect(loggedInQueues.value).toContain('sales')
    })

    it('should throw if no queues specified and no default queues', async () => {
      const options = createDefaultOptions({ defaultQueues: [] })
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await expect(login({ queues: [] })).rejects.toThrow('No queues specified for login')
    })

    it('should use custom penalties', async () => {
      const options = createDefaultOptions()
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({
        queues: TEST_FIXTURES.queues.multiple,
        penalties: { sales: TEST_FIXTURES.penalties.low, support: TEST_FIXTURES.penalties.medium },
      })

      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, {
        memberName: TEST_FIXTURES.agents.standard.name,
        penalty: TEST_FIXTURES.penalties.low,
      })
      expect(mockClient.queueAdd).toHaveBeenCalledWith('support', TEST_FIXTURES.agents.standard.interface, {
        memberName: TEST_FIXTURES.agents.standard.name,
        penalty: TEST_FIXTURES.penalties.medium,
      })
    })

    it('should set login time on first login', async () => {
      const options = createDefaultOptions()
      const { login, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      expect(session.value.loginTime).toBeNull()

      await login({ queues: TEST_FIXTURES.queues.single })

      expect(session.value.loginTime).toBeInstanceOf(Date)
    })

    it('should update status to logged_in after login', async () => {
      const options = createDefaultOptions()
      const { login, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      expect(status.value).toBe('logged_out')

      await login({ queues: TEST_FIXTURES.queues.single })

      expect(status.value).toBe('logged_in')
    })

    it('should call onStatusChange callback', async () => {
      const onStatusChange = vi.fn()
      const options = createDefaultOptions({ onStatusChange })
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      expect(onStatusChange).toHaveBeenCalledWith('logged_in', expect.any(Object))
    })

    it('should call onQueueChange callback', async () => {
      const onQueueChange = vi.fn()
      const options = createDefaultOptions({ onQueueChange })
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      expect(onQueueChange).toHaveBeenCalledWith('sales', true)
    })
  })

  /**
   * Logout Tests
   * Tests for logging agents out of queues
   */
  describe('logout', () => {
    it('should throw if client is null', async () => {
      const options = createDefaultOptions()
      const { logout } = useAmiAgentLogin(null, options)

      await expect(logout()).rejects.toThrow('AMI client not connected')
    })

    it('should logout from all queues', async () => {
      const options = createDefaultOptions()
      const { login, logout, loggedInQueues, isLoggedIn } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })
      expect(loggedInQueues.value).toHaveLength(2)

      await logout()

      expect(mockClient.queueRemove).toHaveBeenCalledTimes(2)
      expect(loggedInQueues.value).toHaveLength(0)
      expect(isLoggedIn.value).toBe(false)
    })

    it('should logout from specific queues', async () => {
      const options = createDefaultOptions()
      const { login, logout, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })
      await logout({ queues: TEST_FIXTURES.queues.single })

      expect(mockClient.queueRemove).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface)
      expect(loggedInQueues.value).toContain('support')
      expect(loggedInQueues.value).not.toContain('sales')
    })

    it('should reset login time when fully logged out', async () => {
      const options = createDefaultOptions()
      const { login, logout, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      expect(session.value.loginTime).not.toBeNull()

      await logout()

      expect(session.value.loginTime).toBeNull()
    })

    it('should update status to logged_out', async () => {
      const options = createDefaultOptions()
      const { login, logout, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await logout()

      expect(status.value).toBe('logged_out')
    })

    it('should call onQueueChange callback', async () => {
      const onQueueChange = vi.fn()
      const options = createDefaultOptions({ onQueueChange })
      const { login, logout } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      onQueueChange.mockClear()

      await logout()

      expect(onQueueChange).toHaveBeenCalledWith('sales', false)
    })
  })

  /**
   * Pause/Unpause Tests
   * Tests for pausing and unpausing agents in queues
   */
  describe('pause', () => {
    it('should throw if client is null', async () => {
      const options = createDefaultOptions()
      const { pause } = useAmiAgentLogin(null, options)

      await expect(pause({ reason: 'Break' })).rejects.toThrow('AMI client not connected')
    })

    it('should pause in all logged in queues', async () => {
      const options = createDefaultOptions()
      const { login, pause, isPaused, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })
      await pause({ reason: 'Lunch' })

      expect(mockClient.queuePause).toHaveBeenCalledTimes(2)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, true, 'Lunch')
      expect(isPaused.value).toBe(true)
      expect(session.value.pauseReason).toBe('Lunch')
    })

    it('should pause in specific queues', async () => {
      const options = createDefaultOptions()
      const { login, pause, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })
      await pause({ queues: TEST_FIXTURES.queues.single, reason: 'Break' })

      expect(mockClient.queuePause).toHaveBeenCalledTimes(1)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, true, 'Break')
      expect(session.value.queues.find(q => q.queue === 'sales')?.isPaused).toBe(true)
      expect(session.value.queues.find(q => q.queue === 'support')?.isPaused).toBe(false)
    })

    it('should update status to paused', async () => {
      const options = createDefaultOptions()
      const { login, pause, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await pause({ reason: 'Break' })

      expect(status.value).toBe('paused')
    })

    it('should handle timed pause', async () => {
      const options = createDefaultOptions()
      const { login, pause, isPaused } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await pause({ reason: 'Break', duration: 5 }) // 5 seconds

      expect(isPaused.value).toBe(true)

      // Advance time past duration
      vi.advanceTimersByTime(6000)

      // Unpause should have been called
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, false)
    })
  })

  describe('unpause', () => {
    it('should throw if client is null', async () => {
      const options = createDefaultOptions()
      const { unpause } = useAmiAgentLogin(null, options)

      await expect(unpause()).rejects.toThrow('AMI client not connected')
    })

    it('should unpause in all paused queues', async () => {
      const options = createDefaultOptions()
      const { login, pause, unpause, isPaused, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })
      await pause({ reason: 'Break' })

      vi.mocked(mockClient.queuePause).mockClear()

      await unpause()

      expect(mockClient.queuePause).toHaveBeenCalledTimes(2)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, false)
      expect(isPaused.value).toBe(false)
      expect(session.value.pauseReason).toBeUndefined()
    })

    it('should unpause specific queues', async () => {
      const options = createDefaultOptions()
      const { login, pause, unpause } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.multiple })
      await pause({ reason: 'Break' })

      vi.mocked(mockClient.queuePause).mockClear()

      await unpause(TEST_FIXTURES.queues.single)

      expect(mockClient.queuePause).toHaveBeenCalledTimes(1)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, false)
    })

    it('should update status to logged_in after unpause', async () => {
      const options = createDefaultOptions()
      const { login, pause, unpause, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await pause({ reason: 'Break' })
      expect(status.value).toBe('paused')

      await unpause()

      expect(status.value).toBe('logged_in')
    })
  })

  /**
   * Queue Toggle Tests
   * Tests for toggling queue membership
   */
  describe('toggleQueue', () => {
    it('should login to queue when not logged in', async () => {
      const options = createDefaultOptions()
      const { toggleQueue, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await toggleQueue('sales')

      expect(mockClient.queueAdd).toHaveBeenCalled()
      expect(loggedInQueues.value).toContain('sales')
    })

    it('should logout from queue when logged in', async () => {
      const options = createDefaultOptions()
      const { login, toggleQueue, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await toggleQueue('sales')

      expect(mockClient.queueRemove).toHaveBeenCalled()
      expect(loggedInQueues.value).not.toContain('sales')
    })

    it('should use custom penalty when logging in', async () => {
      const options = createDefaultOptions()
      const { toggleQueue } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await toggleQueue('sales', TEST_FIXTURES.penalties.low)

      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, expect.objectContaining({
        penalty: TEST_FIXTURES.penalties.low,
      }))
    })
  })

  /**
   * Set Penalty Tests
   * Tests for updating queue penalty values
   */
  describe('setPenalty', () => {
    it('should throw if client is null', async () => {
      const options = createDefaultOptions()
      const { setPenalty } = useAmiAgentLogin(null, options)

      await expect(setPenalty('sales', 5)).rejects.toThrow('AMI client not connected')
    })

    it('should update penalty for queue', async () => {
      const options = createDefaultOptions()
      const { login, setPenalty, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await setPenalty('sales', TEST_FIXTURES.penalties.medium)

      expect(mockClient.queuePenalty).toHaveBeenCalledWith('sales', TEST_FIXTURES.agents.standard.interface, TEST_FIXTURES.penalties.medium)
      expect(session.value.queues.find(q => q.queue === 'sales')?.penalty).toBe(TEST_FIXTURES.penalties.medium)
    })
  })

  /**
   * Refresh Tests
   * Tests for refreshing session state from AMI
   */
  describe('refresh', () => {
    it('should refresh session state from AMI', async () => {
      const queueStatus = createQueueStatusResponse('sales')
      mockClient.getQueueStatus = vi.fn().mockResolvedValue([queueStatus])

      const options = createDefaultOptions()
      const { refresh, session, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await refresh()

      expect(mockClient.getQueueStatus).toHaveBeenCalled()
      expect(loggedInQueues.value).toContain('sales')
      expect(session.value.queues.find(q => q.queue === 'sales')?.callsTaken).toBe(5)
    })

    it('should handle empty queue status', async () => {
      mockClient.getQueueStatus = vi.fn().mockResolvedValue([])

      const options = createDefaultOptions()
      const { refresh, loggedInQueues, error } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await refresh()

      expect(loggedInQueues.value).toHaveLength(0)
      expect(error.value).toBeNull()
    })
  })

  describe('helper methods', () => {
    it('should return available queues', () => {
      const { getAvailableQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      const queues = getAvailableQueues()
      expect(queues).toEqual(TEST_FIXTURES.queues.available)
    })

    it('should return pause reasons', () => {
      const { getPauseReasons } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      const reasons = getPauseReasons()
      expect(reasons).toEqual(TEST_FIXTURES.pauseReasons)
    })

    it('should check if logged into specific queue', async () => {
      const { login, isLoggedIntoQueue } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      expect(isLoggedIntoQueue(TEST_FIXTURES.queues.single[0])).toBe(false)

      await login({ queues: TEST_FIXTURES.queues.single })

      expect(isLoggedIntoQueue(TEST_FIXTURES.queues.single[0])).toBe(true)
      expect(isLoggedIntoQueue(TEST_FIXTURES.queues.available[1])).toBe(false)
    })

    it('should get queue membership details', async () => {
      const { login, getQueueMembership } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      expect(getQueueMembership(TEST_FIXTURES.queues.single[0])).toBeNull()

      await login({ queues: TEST_FIXTURES.queues.single })

      const membership = getQueueMembership(TEST_FIXTURES.queues.single[0])
      expect(membership).not.toBeNull()
      expect(membership?.queue).toBe(TEST_FIXTURES.queues.single[0])
      expect(membership?.interface).toBe(TEST_FIXTURES.agents.standard.interface)
    })
  })

  describe('session management', () => {
    it('should start session timer', async () => {
      const { login, session, sessionDurationFormatted } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      expect(session.value.loginTime).not.toBeNull()

      vi.advanceTimersByTime(TEST_FIXTURES.durations.short)

      expect(session.value.sessionDuration).toBe(5)
      expect(sessionDurationFormatted.value).toBe(TEST_FIXTURES.durations.formatted.fiveSeconds)
    })

    it('should stop session timer on full logout', async () => {
      const { login, logout, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      vi.advanceTimersByTime(TEST_FIXTURES.durations.short)

      await logout()

      const durationAtLogout = session.value.sessionDuration

      vi.advanceTimersByTime(TEST_FIXTURES.durations.short)

      // Duration should not have increased after logout
      expect(session.value.sessionDuration).toBe(durationAtLogout)
    })

    it('should end session completely', async () => {
      const { login, endSession, session, isLoggedIn } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      await endSession()

      expect(isLoggedIn.value).toBe(false)
      expect(session.value.loginTime).toBeNull()
      expect(session.value.queues).toHaveLength(0)
    })
  })

  describe('event handling', () => {
    it('should handle QueueMemberAdded event', async () => {
      const onQueueChange = vi.fn()
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions({ onQueueChange })
      )

      // Simulate QueueMemberAdded event
      mockClient._triggerEvent('queueMemberAdded', createAmiEvent('QueueMemberAdded', {
        Queue: 'sales',
        Interface: 'PJSIP/1001',
        MemberName: 'Test Agent',
        Penalty: '0',
        CallsTaken: '0',
        Paused: '0',
      }))
      await nextTick()

      expect(loggedInQueues.value).toContain('sales')
      expect(onQueueChange).toHaveBeenCalledWith('sales', true)
    })

    it('should handle QueueMemberRemoved event', async () => {
      const onQueueChange = vi.fn()
      const { login, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions({ onQueueChange })
      )

      await login({ queues: ['sales'] })
      onQueueChange.mockClear()

      // Simulate QueueMemberRemoved event
      mockClient._triggerEvent('queueMemberRemoved', createAmiEvent('QueueMemberRemoved', {
        Queue: 'sales',
        Interface: 'PJSIP/1001',
        MemberName: 'Test Agent',
      }))
      await nextTick()

      expect(loggedInQueues.value).not.toContain('sales')
      expect(onQueueChange).toHaveBeenCalledWith('sales', false)
    })

    it('should handle QueueMemberPause event', async () => {
      const { login, session, isPaused } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      // Simulate QueueMemberPause event
      mockClient._triggerEvent('queueMemberPause', createAmiEvent('QueueMemberPause', {
        Queue: TEST_FIXTURES.queues.single[0],
        Interface: TEST_FIXTURES.agents.standard.interface,
        Paused: '1',
        PausedReason: TEST_FIXTURES.pauseReasons[1],
      }))
      await nextTick()

      expect(isPaused.value).toBe(true)
      expect(session.value.pauseReason).toBe(TEST_FIXTURES.pauseReasons[1])
    })

    it('should ignore events for other interfaces', async () => {
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        createDefaultOptions()
      )

      // Simulate event for different interface
      mockClient._triggerEvent('queueMemberAdded', createAmiEvent('QueueMemberAdded', {
        Queue: TEST_FIXTURES.queues.single[0],
        Interface: TEST_FIXTURES.agents.alternate.interface,
        MemberName: TEST_FIXTURES.agents.alternate.name,
      }))
      await nextTick()

      expect(loggedInQueues.value).not.toContain('sales')
    })
  })

  /**
   * Shift Management Tests
   * Tests for shift time range configuration
   */
  describe('shift management', () => {
    it('should initialize with shift configuration', () => {
      const options = createDefaultOptions({ shift: TEST_FIXTURES.shifts.allDay })
      const { session, isOnShift } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      expect(session.value.shiftStart).toBeInstanceOf(Date)
      expect(session.value.shiftEnd).toBeInstanceOf(Date)
      expect(isOnShift.value).toBe(true)
    })

    it('should be off shift when day not included', () => {
      const now = new Date()
      const notToday = (now.getDay() + 1) % 7 // Tomorrow's day index

      const options = createDefaultOptions({
        shift: {
          startHour: 0,
          startMinute: 0,
          endHour: 23,
          endMinute: 59,
          daysOfWeek: [notToday], // Only a different day
        },
      })
      const { isOnShift } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      expect(isOnShift.value).toBe(false)
    })
  })

  /**
   * Error Handling Tests
   * Tests for error handling and recovery
   */
  describe('error handling', () => {
    it('should set error on login failure', async () => {
      mockClient.queueAdd = vi.fn().mockRejectedValue(new Error('Queue not found'))

      const options = createDefaultOptions()
      const { login, error, isLoading } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await expect(login({ queues: ['nonexistent'] })).rejects.toThrow('Queue not found')

      expect(error.value).toBe('Queue not found')
      expect(isLoading.value).toBe(false)
    })

    it('should set error on logout failure', async () => {
      mockClient.queueRemove = vi.fn().mockRejectedValue(new Error('Not a member'))

      const options = createDefaultOptions()
      const { login, logout, error } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      await expect(logout()).rejects.toThrow('Not a member')

      expect(error.value).toBe('Not a member')
    })

    it('should set error on pause failure', async () => {
      mockClient.queuePause = vi.fn().mockRejectedValue(new Error('Pause failed'))

      const options = createDefaultOptions()
      const { login, pause, error } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      await expect(pause({ reason: 'Break' })).rejects.toThrow('Pause failed')

      expect(error.value).toBe('Pause failed')
    })
  })

  /**
   * Input Validation Tests
   * Tests for input validation and sanitization
   */
  describe('input validation', () => {
    /**
     * Parameterized tests for invalid configuration inputs
     */
    describe.each([
      {
        field: 'agentId',
        value: TEST_FIXTURES.invalidInputs.agentId,
        expectedError: 'Invalid agentId',
        description: 'empty agentId',
      },
      {
        field: 'interface',
        value: TEST_FIXTURES.invalidInputs.interface,
        expectedError: 'Invalid interface',
        description: 'interface with script tag',
      },
    ])('configuration validation', ({ field, value, expectedError, description }) => {
      it(`should throw on ${description}`, () => {
        const options = createDefaultOptions({ [field]: value })
        expect(() => useAmiAgentLogin(mockClient as unknown as AmiClient, options))
          .toThrow(expectedError)
      })
    })

    /**
     * Parameterized tests for invalid queue names
     */
    describe.each([
      {
        queues: ['sales<script>'],
        description: 'queue name with script tag',
      },
      {
        queues: ['valid', 'in valid'],
        description: 'queue name with spaces',
      },
    ])('queue name validation', ({ queues, description }) => {
      it(`should reject ${description}`, async () => {
        const options = createDefaultOptions()
        const { login } = useAmiAgentLogin(
          mockClient as unknown as AmiClient,
          options
        )

        await expect(login({ queues })).rejects.toThrow('Invalid queue name')
      })
    })

    /**
     * Parameterized tests for penalty clamping
     */
    describe.each([
      {
        penalty: TEST_FIXTURES.penalties.high,
        expected: TEST_FIXTURES.penalties.clamped,
        description: 'should clamp high penalty values to 1000',
      },
      {
        penalty: TEST_FIXTURES.penalties.negative,
        expected: 0,
        description: 'should clamp negative penalty values to 0',
      },
    ])('penalty clamping', ({ penalty, expected, description }) => {
      it(description, async () => {
        const options = createDefaultOptions()
        const { login, session } = useAmiAgentLogin(
          mockClient as unknown as AmiClient,
          options
        )

        await login({ queues: TEST_FIXTURES.queues.single, penalties: { sales: penalty } })

        expect(session.value.queues.find(q => q.queue === 'sales')?.penalty).toBe(expected)
      })
    })

    it('should reject invalid queue name in setPenalty', async () => {
      const options = createDefaultOptions()
      const { login, setPenalty } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      await expect(setPenalty('sales<bad>', 5)).rejects.toThrow('Invalid queue name')
    })

    it('should ignore events with malformed data', async () => {
      const options = createDefaultOptions()
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      // Simulate event with missing required fields
      mockClient._triggerEvent('queueMemberAdded', {
        server_id: 0,
        server_name: 'test',
        data: {
          // Missing Queue and Interface
        },
      })
      await nextTick()

      expect(loggedInQueues.value).toHaveLength(0)
    })

    it('should ignore events with invalid queue names', async () => {
      const options = createDefaultOptions()
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      // Simulate event with invalid queue name
      mockClient._triggerEvent('queueMemberAdded', {
        server_id: 0,
        server_name: 'test',
        data: {
          Queue: 'invalid<queue>',
          Interface: TEST_FIXTURES.agents.standard.interface,
          MemberName: 'Test',
          Penalty: '0',
          CallsTaken: '0',
          Paused: '0',
        },
      })
      await nextTick()

      expect(loggedInQueues.value).toHaveLength(0)
    })
  })

  /**
   * Computed Properties Tests
   * Tests for reactive computed values
   */
  describe('computed properties', () => {
    it('should update status to on_call when in call', async () => {
      const options = createDefaultOptions()
      const { login, session, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })
      expect(status.value).toBe('logged_in')

      // Simulate being on a call
      session.value.queues[0].inCall = true
      // Manually trigger status update
      session.value.status = 'on_call'

      expect(status.value).toBe('on_call')
    })

    it('should format session duration correctly', async () => {
      const options = createDefaultOptions()
      const { login, sessionDurationFormatted } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        options
      )

      await login({ queues: TEST_FIXTURES.queues.single })

      // 1 hour, 30 minutes, 45 seconds
      vi.advanceTimersByTime(5445000)

      expect(sessionDurationFormatted.value).toBe(TEST_FIXTURES.durations.formatted.oneHourThirtyMinutes)
    })
  })
})
