/**
 * Asterisk AMI Adapter
 *
 * Implements CallCenterProvider interface for Asterisk PBX systems.
 * Wraps existing useAmiAgentLogin functionality in a provider-agnostic interface.
 *
 * @module providers/call-center/adapters/asterisk
 */

import type { AmiClient } from '@/core/AmiClient'
import type { AmiMessage, AmiEventData } from '@/types/ami.types'
import type {
  CallCenterProvider,
  CallCenterCapabilities,
  CallCenterProviderConfig,
  AgentState,
  AgentStatus,
  AgentMetrics,
  AgentLoginOptions,
  AgentLogoutOptions,
  AgentPauseOptions,
  QueueInfo,
  StateChangeCallback,
  QueueEventCallback,
  QueueEventType,
  Unsubscribe,
} from '../types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('AsteriskAdapter')

/**
 * Asterisk-specific capabilities
 */
const ASTERISK_CAPABILITIES: CallCenterCapabilities = {
  supportsQueues: true,
  supportsMultiQueue: true,
  supportsPause: true,
  supportsPauseReasons: true,
  supportsBreakTypes: false, // Asterisk uses pause reasons, not break types
  supportsWrapUp: true,
  supportsMetrics: true,
  supportsRealTimeEvents: true,
  supportsPenalty: true,
  supportsSkillBasedRouting: false,
}

/**
 * Map Asterisk queue member status to AgentStatus
 * Used when processing QueueMemberStatus events
 */
function mapAsteriskStatus(amiStatus: string, paused: boolean): AgentStatus {
  if (paused) return 'break'
  switch (amiStatus) {
    case '1':
      return 'available' // AST_DEVICE_NOT_INUSE
    case '2':
      return 'busy' // AST_DEVICE_INUSE
    case '3':
      return 'busy' // AST_DEVICE_BUSY
    case '5':
      return 'offline' // AST_DEVICE_UNAVAILABLE
    case '6':
      return 'wrap-up' // AST_DEVICE_RINGING
    default:
      return 'offline'
  }
}

// Export for testing - suppress unused warning
void mapAsteriskStatus

/**
 * Create Asterisk AMI adapter instance
 */
export function createAsteriskAdapter(): CallCenterProvider {
  let amiClient: AmiClient | null = null
  let config: CallCenterProviderConfig | null = null
  let currentState: AgentState | null = null
  let sessionMetrics: AgentMetrics = createInitialMetrics()
  let sessionStartTime: Date | null = null

  const stateCallbacks = new Set<StateChangeCallback>()
  const queueCallbacks = new Set<QueueEventCallback>()

  function createInitialMetrics(): AgentMetrics {
    return {
      callsHandled: 0,
      totalTalkTime: 0,
      averageHandleTime: 0,
      averageWrapUpTime: 0,
      longestCall: 0,
      shortestCall: 0,
      missedCalls: 0,
      transferredCalls: 0,
      sessionDuration: 0,
    }
  }

  function createInitialState(): AgentState {
    if (!config) throw new Error('Not configured')
    return {
      agentId: config.agent.id,
      displayName: config.agent.name || config.agent.id,
      status: 'offline',
      extension: config.agent.extension,
      queues: [],
      currentCall: null,
      loginTime: null,
      isPaused: false,
      pauseReason: undefined,
      breakType: undefined,
    }
  }

  function emitStateChange(newState: AgentState) {
    const previousState = currentState
    currentState = newState
    if (previousState) {
      stateCallbacks.forEach((cb) => cb(newState, previousState))
    }
  }

  function emitQueueEvent(type: QueueEventType, queue: string, data?: Record<string, unknown>) {
    queueCallbacks.forEach((cb) =>
      cb({
        type,
        queue,
        timestamp: new Date(),
        data,
      })
    )
  }

  function handleAmiEvent(event: AmiMessage<AmiEventData>) {
    if (!currentState) return

    const eventData = event.data
    const eventType = eventData.Event
    switch (eventType) {
      case 'QueueMemberAdded':
        handleQueueMemberAdded(eventData)
        break
      case 'QueueMemberRemoved':
        handleQueueMemberRemoved(eventData)
        break
      case 'QueueMemberPause':
        handleQueueMemberPause(eventData)
        break
      case 'AgentCalled':
        handleAgentCalled(eventData)
        break
      case 'AgentConnect':
        handleAgentConnect(eventData)
        break
      case 'AgentComplete':
        handleAgentComplete(eventData)
        break
    }
  }

  function handleQueueMemberAdded(eventData: AmiEventData) {
    if (!currentState || !config) return
    if (eventData.Interface !== config.agent.extension) return

    const queueName = eventData.Queue as string
    const existingQueue = currentState.queues.find((q) => q.name === queueName)

    if (!existingQueue) {
      const newQueue: QueueInfo = {
        name: queueName,
        displayName: queueName,
        isMember: true,
        isPaused: eventData.Paused === '1',
        penalty: parseInt(eventData.Penalty as string, 10) || 0,
        callsHandled: parseInt(eventData.CallsTaken as string, 10) || 0,
        lastCallTime: null,
      }

      const newState: AgentState = {
        ...currentState,
        queues: [...currentState.queues, newQueue],
        status: currentState.loginTime ? 'available' : currentState.status,
      }
      emitStateChange(newState)
      emitQueueEvent('joined', queueName)
    }
  }

  function handleQueueMemberRemoved(eventData: AmiEventData) {
    if (!currentState || !config) return
    if (eventData.Interface !== config.agent.extension) return

    const queueName = eventData.Queue as string
    const newState: AgentState = {
      ...currentState,
      queues: currentState.queues.filter((q) => q.name !== queueName),
    }
    emitStateChange(newState)
    emitQueueEvent('left', queueName)
  }

  function handleQueueMemberPause(eventData: AmiEventData) {
    if (!currentState || !config) return
    if (eventData.Interface !== config.agent.extension) return

    const queueName = eventData.Queue as string
    const isPaused = eventData.Paused === '1'
    const reason = (eventData.PausedReason || eventData.Reason) as string | undefined

    const newQueues = currentState.queues.map((q) =>
      q.name === queueName ? { ...q, isPaused } : q
    )

    const allPaused = newQueues.every((q) => q.isPaused)
    const newState: AgentState = {
      ...currentState,
      queues: newQueues,
      isPaused: allPaused,
      pauseReason: allPaused ? reason : undefined,
      status: allPaused ? 'break' : currentState.currentCall ? 'busy' : 'available',
    }
    emitStateChange(newState)
    emitQueueEvent(isPaused ? 'paused' : 'unpaused', queueName, { reason })
  }

  function handleAgentCalled(eventData: AmiEventData) {
    if (!currentState || !config) return
    // Check if this agent is being called
    if (!eventData.Interface?.includes(config.agent.extension)) return

    const queueName = eventData.Queue as string
    emitQueueEvent('call-received', queueName, {
      callerId: eventData.CallerIDNum,
      callerName: eventData.CallerIDName,
    })
  }

  function handleAgentConnect(eventData: AmiEventData) {
    if (!currentState || !config) return
    if (!eventData.Interface?.includes(config.agent.extension)) return

    const newState: AgentState = {
      ...currentState,
      status: 'busy',
      currentCall: {
        callId: eventData.Uniqueid as string,
        fromQueue: (eventData.Queue as string) || null,
        callerInfo:
          `${eventData.CallerIDName || ''} <${eventData.CallerIDNum || ''}>`.trim() || 'Unknown',
        startTime: new Date(),
        duration: 0,
        isOnHold: false,
      },
    }
    emitStateChange(newState)
  }

  function handleAgentComplete(eventData: AmiEventData) {
    if (!currentState || !config) return
    if (!eventData.Interface?.includes(config.agent.extension)) return

    const talkTime = parseInt(eventData.TalkTime as string, 10) || 0

    // Update metrics
    sessionMetrics.callsHandled++
    sessionMetrics.totalTalkTime += talkTime
    if (talkTime > sessionMetrics.longestCall) sessionMetrics.longestCall = talkTime
    if (sessionMetrics.shortestCall === 0 || talkTime < sessionMetrics.shortestCall) {
      sessionMetrics.shortestCall = talkTime
    }
    sessionMetrics.averageHandleTime = Math.round(
      sessionMetrics.totalTalkTime / sessionMetrics.callsHandled
    )

    const queueName = eventData.Queue as string
    const newQueues = currentState.queues.map((q) =>
      q.name === queueName
        ? { ...q, callsHandled: q.callsHandled + 1, lastCallTime: new Date() }
        : q
    )

    const newState: AgentState = {
      ...currentState,
      status: currentState.isPaused ? 'break' : 'wrap-up',
      currentCall: null,
      queues: newQueues,
    }
    emitStateChange(newState)

    const holdTime = parseInt(eventData.HoldTime as string, 10) || 0
    emitQueueEvent('call-completed', queueName, { talkTime, holdTime })

    // Auto-transition from wrap-up to available after short delay
    setTimeout(() => {
      if (currentState && currentState.status === 'wrap-up' && !currentState.isPaused) {
        emitStateChange({ ...currentState, status: 'available' })
      }
    }, 5000) // 5 second wrap-up time
  }

  const adapter: CallCenterProvider = {
    id: 'asterisk',
    name: 'Asterisk AMI',
    capabilities: ASTERISK_CAPABILITIES,

    async connect(providerConfig: CallCenterProviderConfig): Promise<void> {
      if (amiClient) {
        throw new Error('Already connected')
      }

      config = providerConfig
      const { AmiClient: AmiClientClass } = await import('@/core/AmiClient')

      // Build WebSocket URL for amiws proxy from connection config
      const host = config.connection.host as string
      const port = config.connection.port as number
      const protocol = config.connection.secure ? 'wss' : 'ws'
      const url = (config.connection.url as string) || `${protocol}://${host}:${port}/ami`

      amiClient = new AmiClientClass({ url })

      // Set up event listeners
      amiClient.on('event', handleAmiEvent)

      await amiClient.connect()
      currentState = createInitialState()
      logger.info('Connected to Asterisk AMI')
    },

    async disconnect(): Promise<void> {
      if (amiClient) {
        amiClient.off('event', handleAmiEvent)
        await amiClient.disconnect()
        amiClient = null
      }
      config = null
      currentState = null
      sessionMetrics = createInitialMetrics()
      sessionStartTime = null
      logger.info('Disconnected from Asterisk AMI')
    },

    async login(options?: AgentLoginOptions): Promise<AgentState> {
      if (!amiClient || !config || !currentState) {
        throw new Error('Not connected')
      }

      const queues = options?.queues || config.defaultQueues || []
      const defaultPenalty = options?.defaultPenalty ?? 0

      // Add agent to each queue
      for (const queue of queues) {
        const penalty = options?.penalties?.[queue] ?? defaultPenalty
        await amiClient.sendAction({
          Action: 'QueueAdd',
          Queue: queue,
          Interface: config.agent.extension,
          MemberName: config.agent.name || config.agent.id,
          Penalty: String(penalty),
          Paused: 'false',
        })
      }

      sessionStartTime = new Date()
      sessionMetrics = createInitialMetrics()

      const newState: AgentState = {
        ...currentState,
        status: 'available',
        loginTime: sessionStartTime,
        queues: queues.map((name) => ({
          name,
          displayName: name,
          isMember: true,
          isPaused: false,
          penalty: options?.penalties?.[name] ?? defaultPenalty,
          callsHandled: 0,
          lastCallTime: null,
        })),
      }

      emitStateChange(newState)
      logger.info(`Agent logged in to queues: ${queues.join(', ')}`)
      return newState
    },

    async logout(options?: AgentLogoutOptions): Promise<void> {
      if (!amiClient || !config || !currentState) {
        throw new Error('Not connected')
      }

      const queues = options?.queues || currentState.queues.map((q) => q.name)

      for (const queue of queues) {
        await amiClient.sendAction({
          Action: 'QueueRemove',
          Queue: queue,
          Interface: config.agent.extension,
        })
      }

      if (!options?.queues || options.queues.length === currentState.queues.length) {
        // Full logout
        const newState: AgentState = {
          ...currentState,
          status: 'offline',
          loginTime: null,
          queues: [],
          isPaused: false,
          pauseReason: undefined,
        }
        emitStateChange(newState)
        sessionStartTime = null
        logger.info('Agent logged out from all queues')
      } else {
        // Partial logout
        const newState: AgentState = {
          ...currentState,
          queues: currentState.queues.filter((q) => !queues.includes(q.name)),
        }
        emitStateChange(newState)
        logger.info(`Agent logged out from queues: ${queues.join(', ')}`)
      }
    },

    async setStatus(status: AgentStatus, reason?: string): Promise<void> {
      if (!currentState) throw new Error('Not connected')

      if (status === 'break' || status === 'meeting') {
        await adapter.pause({ reason: reason || status })
      } else if (currentState.isPaused && status === 'available') {
        await adapter.unpause()
      }

      // Direct status changes that don't involve pause
      if (status === 'wrap-up') {
        emitStateChange({ ...currentState, status: 'wrap-up' })
      }
    },

    async joinQueue(queue: string, penalty?: number): Promise<void> {
      if (!amiClient || !config) throw new Error('Not connected')

      await amiClient.sendAction({
        Action: 'QueueAdd',
        Queue: queue,
        Interface: config.agent.extension,
        MemberName: config.agent.name || config.agent.id,
        Penalty: String(penalty ?? 0),
        Paused: currentState?.isPaused ? 'true' : 'false',
      })
    },

    async leaveQueue(queue: string): Promise<void> {
      if (!amiClient || !config) throw new Error('Not connected')

      await amiClient.sendAction({
        Action: 'QueueRemove',
        Queue: queue,
        Interface: config.agent.extension,
      })
    },

    async pause(options: AgentPauseOptions): Promise<void> {
      if (!amiClient || !config || !currentState) throw new Error('Not connected')

      const queues = options.queues || currentState.queues.map((q) => q.name)

      for (const queue of queues) {
        await amiClient.sendAction({
          Action: 'QueuePause',
          Queue: queue,
          Interface: config.agent.extension,
          Paused: 'true',
          Reason: options.reason,
        })
      }

      // Handle auto-unpause
      if (options.duration && options.duration > 0) {
        setTimeout(() => {
          adapter.unpause(queues).catch((err) => {
            logger.error('Auto-unpause failed:', err)
          })
        }, options.duration * 1000)
      }
    },

    async unpause(queues?: string[]): Promise<void> {
      if (!amiClient || !config || !currentState) throw new Error('Not connected')

      const targetQueues = queues || currentState.queues.map((q) => q.name)

      for (const queue of targetQueues) {
        await amiClient.sendAction({
          Action: 'QueuePause',
          Queue: queue,
          Interface: config.agent.extension,
          Paused: 'false',
        })
      }
    },

    async getMetrics(): Promise<AgentMetrics> {
      if (sessionStartTime) {
        sessionMetrics.sessionDuration = Math.floor(
          (Date.now() - sessionStartTime.getTime()) / 1000
        )
      }
      return { ...sessionMetrics }
    },

    onStateChange(callback: StateChangeCallback): Unsubscribe {
      stateCallbacks.add(callback)
      return () => stateCallbacks.delete(callback)
    },

    onQueueEvent(callback: QueueEventCallback): Unsubscribe {
      queueCallbacks.add(callback)
      return () => queueCallbacks.delete(callback)
    },
  }

  return adapter
}
