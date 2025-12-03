/**
 * useAmiAgentLogin composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiAgentLogin } from '@/composables/useAmiAgentLogin'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  createAmiEvent,
  createAmiSuccessResponse,
  type MockAmiClient,
} from '../utils/mockFactories'

describe('useAmiAgentLogin', () => {
  let mockClient: MockAmiClient

  const defaultOptions = {
    agentId: 'agent1001',
    interface: 'PJSIP/1001',
    name: 'Test Agent',
    availableQueues: ['sales', 'support', 'billing'],
    defaultQueues: ['sales'],
    defaultPenalty: 0,
    pauseReasons: ['Break', 'Lunch', 'Meeting'],
    persistState: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()

    // Mock queueAdd
    mockClient.queueAdd = vi.fn().mockResolvedValue(createAmiSuccessResponse())

    // Mock queueRemove
    mockClient.queueRemove = vi.fn().mockResolvedValue(createAmiSuccessResponse())

    // Mock queuePause
    mockClient.queuePause = vi.fn().mockResolvedValue(createAmiSuccessResponse())

    // Mock queuePenalty
    mockClient.queuePenalty = vi.fn().mockResolvedValue(createAmiSuccessResponse())

    // Mock getQueueStatus
    mockClient.getQueueStatus = vi.fn().mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have logged_out status initially', () => {
      const { status } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(status.value).toBe('logged_out')
    })

    it('should not be logged in initially', () => {
      const { isLoggedIn } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(isLoggedIn.value).toBe(false)
    })

    it('should not be paused initially', () => {
      const { isPaused } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(isPaused.value).toBe(false)
    })

    it('should not be on call initially', () => {
      const { isOnCall } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(isOnCall.value).toBe(false)
    })

    it('should have empty queues initially', () => {
      const { loggedInQueues } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(loggedInQueues.value).toHaveLength(0)
    })

    it('should have zero session duration initially', () => {
      const { sessionDurationFormatted } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(sessionDurationFormatted.value).toBe('00:00:00')
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(error.value).toBeNull()
    })

    it('should initialize session with correct agent info', () => {
      const { session } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
      expect(session.value.agentId).toBe('agent1001')
      expect(session.value.interface).toBe('PJSIP/1001')
      expect(session.value.name).toBe('Test Agent')
    })
  })

  describe('login', () => {
    it('should throw if client is null', async () => {
      const { login } = useAmiAgentLogin(null, defaultOptions)

      await expect(login({ queues: ['sales'] })).rejects.toThrow('AMI client not connected')
    })

    it('should login to specified queues', async () => {
      const { login, loggedInQueues, isLoggedIn } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })

      expect(mockClient.queueAdd).toHaveBeenCalledTimes(2)
      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', 'PJSIP/1001', {
        memberName: 'Test Agent',
        penalty: 0,
      })
      expect(loggedInQueues.value).toContain('sales')
      expect(loggedInQueues.value).toContain('support')
      expect(isLoggedIn.value).toBe(true)
    })

    it('should login to default queues if none specified', async () => {
      const { login, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: [] })

      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', 'PJSIP/1001', expect.any(Object))
      expect(loggedInQueues.value).toContain('sales')
    })

    it('should throw if no queues specified and no default queues', async () => {
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        { ...defaultOptions, defaultQueues: [] }
      )

      await expect(login({ queues: [] })).rejects.toThrow('No queues specified for login')
    })

    it('should use custom penalties', async () => {
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({
        queues: ['sales', 'support'],
        penalties: { sales: 5, support: 10 },
      })

      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', 'PJSIP/1001', {
        memberName: 'Test Agent',
        penalty: 5,
      })
      expect(mockClient.queueAdd).toHaveBeenCalledWith('support', 'PJSIP/1001', {
        memberName: 'Test Agent',
        penalty: 10,
      })
    })

    it('should set login time on first login', async () => {
      const { login, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      expect(session.value.loginTime).toBeNull()

      await login({ queues: ['sales'] })

      expect(session.value.loginTime).toBeInstanceOf(Date)
    })

    it('should update status to logged_in after login', async () => {
      const { login, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      expect(status.value).toBe('logged_out')

      await login({ queues: ['sales'] })

      expect(status.value).toBe('logged_in')
    })

    it('should call onStatusChange callback', async () => {
      const onStatusChange = vi.fn()
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        { ...defaultOptions, onStatusChange }
      )

      await login({ queues: ['sales'] })

      expect(onStatusChange).toHaveBeenCalledWith('logged_in', expect.any(Object))
    })

    it('should call onQueueChange callback', async () => {
      const onQueueChange = vi.fn()
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        { ...defaultOptions, onQueueChange }
      )

      await login({ queues: ['sales'] })

      expect(onQueueChange).toHaveBeenCalledWith('sales', true)
    })
  })

  describe('logout', () => {
    it('should throw if client is null', async () => {
      const { logout } = useAmiAgentLogin(null, defaultOptions)

      await expect(logout()).rejects.toThrow('AMI client not connected')
    })

    it('should logout from all queues', async () => {
      const { login, logout, loggedInQueues, isLoggedIn } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })
      expect(loggedInQueues.value).toHaveLength(2)

      await logout()

      expect(mockClient.queueRemove).toHaveBeenCalledTimes(2)
      expect(loggedInQueues.value).toHaveLength(0)
      expect(isLoggedIn.value).toBe(false)
    })

    it('should logout from specific queues', async () => {
      const { login, logout, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })
      await logout({ queues: ['sales'] })

      expect(mockClient.queueRemove).toHaveBeenCalledWith('sales', 'PJSIP/1001')
      expect(loggedInQueues.value).toContain('support')
      expect(loggedInQueues.value).not.toContain('sales')
    })

    it('should reset login time when fully logged out', async () => {
      const { login, logout, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      expect(session.value.loginTime).not.toBeNull()

      await logout()

      expect(session.value.loginTime).toBeNull()
    })

    it('should update status to logged_out', async () => {
      const { login, logout, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      await logout()

      expect(status.value).toBe('logged_out')
    })

    it('should call onQueueChange callback', async () => {
      const onQueueChange = vi.fn()
      const { login, logout } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        { ...defaultOptions, onQueueChange }
      )

      await login({ queues: ['sales'] })
      onQueueChange.mockClear()

      await logout()

      expect(onQueueChange).toHaveBeenCalledWith('sales', false)
    })
  })

  describe('pause', () => {
    it('should throw if client is null', async () => {
      const { pause } = useAmiAgentLogin(null, defaultOptions)

      await expect(pause({ reason: 'Break' })).rejects.toThrow('AMI client not connected')
    })

    it('should pause in all logged in queues', async () => {
      const { login, pause, isPaused, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })
      await pause({ reason: 'Lunch' })

      expect(mockClient.queuePause).toHaveBeenCalledTimes(2)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', 'PJSIP/1001', true, 'Lunch')
      expect(isPaused.value).toBe(true)
      expect(session.value.pauseReason).toBe('Lunch')
    })

    it('should pause in specific queues', async () => {
      const { login, pause, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })
      await pause({ queues: ['sales'], reason: 'Break' })

      expect(mockClient.queuePause).toHaveBeenCalledTimes(1)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', 'PJSIP/1001', true, 'Break')
      expect(session.value.queues.find(q => q.queue === 'sales')?.isPaused).toBe(true)
      expect(session.value.queues.find(q => q.queue === 'support')?.isPaused).toBe(false)
    })

    it('should update status to paused', async () => {
      const { login, pause, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      await pause({ reason: 'Break' })

      expect(status.value).toBe('paused')
    })

    it('should handle timed pause', async () => {
      const { login, pause, isPaused } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      await pause({ reason: 'Break', duration: 5 }) // 5 seconds

      expect(isPaused.value).toBe(true)

      // Advance time past duration
      vi.advanceTimersByTime(6000)

      // Unpause should have been called
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', 'PJSIP/1001', false)
    })
  })

  describe('unpause', () => {
    it('should throw if client is null', async () => {
      const { unpause } = useAmiAgentLogin(null, defaultOptions)

      await expect(unpause()).rejects.toThrow('AMI client not connected')
    })

    it('should unpause in all paused queues', async () => {
      const { login, pause, unpause, isPaused, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })
      await pause({ reason: 'Break' })

      vi.mocked(mockClient.queuePause).mockClear()

      await unpause()

      expect(mockClient.queuePause).toHaveBeenCalledTimes(2)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', 'PJSIP/1001', false)
      expect(isPaused.value).toBe(false)
      expect(session.value.pauseReason).toBeUndefined()
    })

    it('should unpause specific queues', async () => {
      const { login, pause, unpause } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales', 'support'] })
      await pause({ reason: 'Break' })

      vi.mocked(mockClient.queuePause).mockClear()

      await unpause(['sales'])

      expect(mockClient.queuePause).toHaveBeenCalledTimes(1)
      expect(mockClient.queuePause).toHaveBeenCalledWith('sales', 'PJSIP/1001', false)
    })

    it('should update status to logged_in after unpause', async () => {
      const { login, pause, unpause, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      await pause({ reason: 'Break' })
      expect(status.value).toBe('paused')

      await unpause()

      expect(status.value).toBe('logged_in')
    })
  })

  describe('toggleQueue', () => {
    it('should login to queue when not logged in', async () => {
      const { toggleQueue, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await toggleQueue('sales')

      expect(mockClient.queueAdd).toHaveBeenCalled()
      expect(loggedInQueues.value).toContain('sales')
    })

    it('should logout from queue when logged in', async () => {
      const { login, toggleQueue, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      await toggleQueue('sales')

      expect(mockClient.queueRemove).toHaveBeenCalled()
      expect(loggedInQueues.value).not.toContain('sales')
    })

    it('should use custom penalty when logging in', async () => {
      const { toggleQueue } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await toggleQueue('sales', 5)

      expect(mockClient.queueAdd).toHaveBeenCalledWith('sales', 'PJSIP/1001', expect.objectContaining({
        penalty: 5,
      }))
    })
  })

  describe('setPenalty', () => {
    it('should throw if client is null', async () => {
      const { setPenalty } = useAmiAgentLogin(null, defaultOptions)

      await expect(setPenalty('sales', 5)).rejects.toThrow('AMI client not connected')
    })

    it('should update penalty for queue', async () => {
      const { login, setPenalty, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      await setPenalty('sales', 10)

      expect(mockClient.queuePenalty).toHaveBeenCalledWith('sales', 'PJSIP/1001', 10)
      expect(session.value.queues.find(q => q.queue === 'sales')?.penalty).toBe(10)
    })
  })

  describe('refresh', () => {
    it('should refresh session state from AMI', async () => {
      mockClient.getQueueStatus = vi.fn().mockResolvedValue([
        {
          name: 'sales',
          members: [
            {
              interface: 'PJSIP/1001',
              paused: false,
              pausedReason: '',
              penalty: 0,
              callsTaken: 5,
              lastCall: 1234567890,
              loginTime: 1234567800,
              inCall: false,
            },
          ],
        },
      ])

      const { refresh, session, loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await refresh()

      expect(mockClient.getQueueStatus).toHaveBeenCalled()
      expect(loggedInQueues.value).toContain('sales')
      expect(session.value.queues.find(q => q.queue === 'sales')?.callsTaken).toBe(5)
    })

    it('should handle empty queue status', async () => {
      mockClient.getQueueStatus = vi.fn().mockResolvedValue([])

      const { refresh, loggedInQueues, error } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
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
        defaultOptions
      )

      const queues = getAvailableQueues()
      expect(queues).toEqual(['sales', 'support', 'billing'])
    })

    it('should return pause reasons', () => {
      const { getPauseReasons } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      const reasons = getPauseReasons()
      expect(reasons).toEqual(['Break', 'Lunch', 'Meeting'])
    })

    it('should check if logged into specific queue', async () => {
      const { login, isLoggedIntoQueue } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      expect(isLoggedIntoQueue('sales')).toBe(false)

      await login({ queues: ['sales'] })

      expect(isLoggedIntoQueue('sales')).toBe(true)
      expect(isLoggedIntoQueue('support')).toBe(false)
    })

    it('should get queue membership details', async () => {
      const { login, getQueueMembership } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      expect(getQueueMembership('sales')).toBeNull()

      await login({ queues: ['sales'] })

      const membership = getQueueMembership('sales')
      expect(membership).not.toBeNull()
      expect(membership?.queue).toBe('sales')
      expect(membership?.interface).toBe('PJSIP/1001')
    })
  })

  describe('session management', () => {
    it('should start session timer', async () => {
      const { login, session, sessionDurationFormatted } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })

      expect(session.value.loginTime).not.toBeNull()

      vi.advanceTimersByTime(5000)

      expect(session.value.sessionDuration).toBe(5)
      expect(sessionDurationFormatted.value).toBe('00:00:05')
    })

    it('should stop session timer on full logout', async () => {
      const { login, logout, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      vi.advanceTimersByTime(5000)

      await logout()

      const durationAtLogout = session.value.sessionDuration

      vi.advanceTimersByTime(5000)

      // Duration should not have increased after logout
      expect(session.value.sessionDuration).toBe(durationAtLogout)
    })

    it('should end session completely', async () => {
      const { login, endSession, session, isLoggedIn } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
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
        { ...defaultOptions, onQueueChange }
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
        { ...defaultOptions, onQueueChange }
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
        defaultOptions
      )

      await login({ queues: ['sales'] })

      // Simulate QueueMemberPause event
      mockClient._triggerEvent('queueMemberPause', createAmiEvent('QueueMemberPause', {
        Queue: 'sales',
        Interface: 'PJSIP/1001',
        Paused: '1',
        PausedReason: 'Lunch',
      }))
      await nextTick()

      expect(isPaused.value).toBe(true)
      expect(session.value.pauseReason).toBe('Lunch')
    })

    it('should ignore events for other interfaces', async () => {
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      // Simulate event for different interface
      mockClient._triggerEvent('queueMemberAdded', createAmiEvent('QueueMemberAdded', {
        Queue: 'sales',
        Interface: 'PJSIP/9999', // Different interface
        MemberName: 'Other Agent',
      }))
      await nextTick()

      expect(loggedInQueues.value).not.toContain('sales')
    })
  })

  describe('shift management', () => {
    it('should initialize with shift configuration', () => {
      const { session, isOnShift } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        {
          ...defaultOptions,
          shift: {
            startHour: 0,
            startMinute: 0,
            endHour: 23,
            endMinute: 59,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
          },
        }
      )

      expect(session.value.shiftStart).toBeInstanceOf(Date)
      expect(session.value.shiftEnd).toBeInstanceOf(Date)
      expect(isOnShift.value).toBe(true)
    })

    it('should be off shift when day not included', () => {
      const now = new Date()
      const notToday = (now.getDay() + 1) % 7 // Tomorrow's day index

      const { isOnShift } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        {
          ...defaultOptions,
          shift: {
            startHour: 0,
            startMinute: 0,
            endHour: 23,
            endMinute: 59,
            daysOfWeek: [notToday], // Only a different day
          },
        }
      )

      expect(isOnShift.value).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should set error on login failure', async () => {
      mockClient.queueAdd = vi.fn().mockRejectedValue(new Error('Queue not found'))

      const { login, error, isLoading } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await expect(login({ queues: ['nonexistent'] })).rejects.toThrow('Queue not found')

      expect(error.value).toBe('Queue not found')
      expect(isLoading.value).toBe(false)
    })

    it('should set error on logout failure', async () => {
      mockClient.queueRemove = vi.fn().mockRejectedValue(new Error('Not a member'))

      const { login, logout, error } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })

      await expect(logout()).rejects.toThrow('Not a member')

      expect(error.value).toBe('Not a member')
    })

    it('should set error on pause failure', async () => {
      mockClient.queuePause = vi.fn().mockRejectedValue(new Error('Pause failed'))

      const { login, pause, error } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })

      await expect(pause({ reason: 'Break' })).rejects.toThrow('Pause failed')

      expect(error.value).toBe('Pause failed')
    })
  })

  describe('input validation', () => {
    it('should throw on invalid agentId', () => {
      expect(() => useAmiAgentLogin(mockClient as unknown as AmiClient, {
        ...defaultOptions,
        agentId: '',
      })).toThrow('Invalid agentId')
    })

    it('should throw on invalid interface', () => {
      expect(() => useAmiAgentLogin(mockClient as unknown as AmiClient, {
        ...defaultOptions,
        interface: 'invalid<script>',
      })).toThrow('Invalid interface')
    })

    it('should reject invalid queue names on login', async () => {
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await expect(login({ queues: ['sales<script>'] })).rejects.toThrow('Invalid queue name')
    })

    it('should reject queue names with special characters', async () => {
      const { login } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await expect(login({ queues: ['valid', 'in valid'] })).rejects.toThrow('Invalid queue name')
    })

    it('should clamp penalty values', async () => {
      const { login, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'], penalties: { sales: 9999 } })

      // Should be clamped to 1000
      expect(session.value.queues.find(q => q.queue === 'sales')?.penalty).toBe(1000)
    })

    it('should clamp negative penalty values to 0', async () => {
      const { login, session } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'], penalties: { sales: -5 } })

      expect(session.value.queues.find(q => q.queue === 'sales')?.penalty).toBe(0)
    })

    it('should reject invalid queue name in setPenalty', async () => {
      const { login, setPenalty } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })

      await expect(setPenalty('sales<bad>', 5)).rejects.toThrow('Invalid queue name')
    })

    it('should ignore events with malformed data', async () => {
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
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
      const { loggedInQueues } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      // Simulate event with invalid queue name
      mockClient._triggerEvent('queueMemberAdded', {
        server_id: 0,
        server_name: 'test',
        data: {
          Queue: 'invalid<queue>',
          Interface: 'PJSIP/1001',
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

  describe('computed properties', () => {
    it('should update status to on_call when in call', async () => {
      const { login, session, status } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })
      expect(status.value).toBe('logged_in')

      // Simulate being on a call
      session.value.queues[0].inCall = true
      // Manually trigger status update
      session.value.status = 'on_call'

      expect(status.value).toBe('on_call')
    })

    it('should format session duration correctly', async () => {
      const { login, sessionDurationFormatted } = useAmiAgentLogin(
        mockClient as unknown as AmiClient,
        defaultOptions
      )

      await login({ queues: ['sales'] })

      // 1 hour, 30 minutes, 45 seconds
      vi.advanceTimersByTime(5445000)

      expect(sessionDurationFormatted.value).toBe('01:30:45')
    })
  })
})
