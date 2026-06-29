/**
 * Connected (AMI-backed) gateway for the call-center MVP.
 *
 * Implements the same {@link MvpGateway} surface as the demo gateway, but feeds
 * the workspace from live Asterisk queue events instead of a wall-clock timer.
 *
 * Unlike the demo gateway (a self-contained factory), this gateway is constructed
 * with already-instantiated `useAmi()` / `useAmiQueues()` returns, because those
 * composables must be called within a Vue setup scope. The runtime wires them up
 * and hands the handles in; this adapter only translates their output into the
 * workspace's `QueuedCallView` shape and drives the gateway contract.
 *
 * @module features/shared/connected-gateway
 */

import { watchEffect, type Ref } from 'vue'
import type { AmiConnectionState, QueueEntry, QueueInfo } from '../../../../../src/types/ami.types'
import type { AmiClient } from '../../../../../src/core/AmiClient'
import type {
  MvpGateway,
  MvpGatewayCapabilities,
  MvpGatewayRuntime,
  QueuedCallView,
} from './mvp-types'

/**
 * Information about a pending or in-progress queue delivery (when Asterisk
 * rings a member for a queued caller). Built from AMI AgentCalled events.
 */
export interface DeliveryInfo {
  /** Queue name the caller is in (e.g. "8001"). */
  queue: string
  /** The caller's number. */
  callerIdNum: string
  /** The caller's display name, if any. */
  callerIdName?: string
  /** The AMI Uniqueid of the caller's channel (matches QueueEntry.uniqueId). */
  uniqueId?: string
  /** The member interface being rung (e.g. "PJSIP/1001"). */
  destChannel: string
  /** When the delivery event was received (epoch ms). */
  timestamp: number
}

/**
 * Connected gateway with delivery-correlation support. Extends MvpGateway with
 * lookup methods the runtime uses to correlate an incoming SIP dialog to a
 * queue entry deterministically (instead of fuzzy caller-number matching).
 */
export interface ConnectedGateway extends MvpGateway {
  /** Look up the most recent delivery for a member interface (e.g. PJSIP/1001). */
  getDeliveryForChannel(channel: string): DeliveryInfo | null
  /** Look up the most recent delivery by the caller's number. */
  getDeliveryForCallerNumber(num: string): DeliveryInfo | null
}

/**
 * Map a live Asterisk `QueueEntry` to the workspace's `QueuedCallView`.
 * AMI reports wait time in seconds; the workspace displays it in the same unit
 * (the demo gateway incremented by 1 per tick; here we use real seconds).
 */
export function mapQueueEntryToQueuedCall(entry: QueueEntry): QueuedCallView {
  return {
    id: entry.uniqueId || entry.channel,
    from: entry.callerIdNum || entry.channel,
    displayName: entry.callerIdName || undefined,
    waitTime: Math.round(entry.wait),
    priority: entry.priority,
    queue: entry.queue,
  }
}

/**
 * Flatten the `useAmiQueues` map into a deduplicated list of queued calls across
 * all queues, sorted by wait time descending (longest-waiting first).
 */
export function flattenQueueEntries(queues: Map<string, QueueInfo>): QueuedCallView[] {
  const all: QueuedCallView[] = []
  for (const queue of queues.values()) {
    for (const entry of queue.entries) {
      all.push(mapQueueEntryToQueuedCall(entry))
    }
  }
  return all.sort((a, b) => b.waitTime - a.waitTime)
}

export interface ConnectedGatewayHandles {
  /** Reactive AMI connection state (from `useAmi().connectionState`). */
  connectionState: Ref<AmiConnectionState>
  /** Live queue map (from `useAmiQueues().queues`). */
  queues: Ref<Map<string, QueueInfo>>
  /**
   * Getter for the current AMI client (from `useAmi().getClient()`). We take a
   * getter, not a snapshot, because getClient() returns null at setup time and
   * only becomes non-null after ami.connect() resolves in initializeConnection.
   * The gateway binds/unbinds the event listener in start()/stop() using the
   * value this getter returns at call time.
   */
  getClient: () => AmiClient | null
  /** Subscribe to AMI caller-join events (from `useAmiQueues().onCallerJoin` if present). */
  onCallerJoin?: (cb: (entry: QueueEntry, queue: string) => void) => () => void
  /** Subscribe to AMI caller-leave events. */
  onCallerLeave?: (cb: (entry: QueueEntry, queue: string) => void) => () => void
}

const CONNECTED_CAPABILITIES: MvpGatewayCapabilities = {
  manualOutbound: false,
  supervisorAudioIntervention: false,
  liveQueue: true,
}

/**
 * Create a connected gateway bound to live AMI queue state.
 *
 * `start()` wires the runtime callbacks to the reactive `queues` ref and (when
 * available) the AMI caller-join/leave subscriptions. Because AMI pushes events
 * rather than ticking on a timer, the `intervalMs` argument is accepted but
 * ignored — `onTick` fires whenever the queue map changes.
 */
export function createConnectedGateway(handles: ConnectedGatewayHandles): ConnectedGateway {
  let runtime: MvpGatewayRuntime | null = null
  let unsubscribeJoin: (() => void) | null = null
  let unsubscribeLeave: (() => void) | null = null
  let watchStop: (() => void) | null = null
  let lastSeenIds = new Set<string>()

  /**
   * Pending deliveries keyed by member interface (e.g. "PJSIP/1001"). Populated
   * from AMI AgentCalled events. Used to correlate an incoming SIP dialog to a
   * specific queue entry deterministically.
   */
  const deliveryByChannel = new Map<string, DeliveryInfo>()
  /** Reverse lookup by caller number (fallback when channel isn't known yet). */
  const deliveryByCallerNum = new Map<string, DeliveryInfo>()

  /**
   * AMI 'event' listener for delivery events. AgentCalled fires when the queue
   * rings a member; DialBegin fires when the dial actually starts. Both carry
   * enough fields to correlate. We also clear a delivery on BridgeLeave/hangup.
   */
  const onAmiEvent = (msg: Record<string, string | undefined>) => {
    const evt = msg.Event
    if (evt === 'AgentCalled') {
      const info: DeliveryInfo = {
        queue: msg.Queue ?? '',
        callerIdNum: msg.CallerIDNum ?? '',
        callerIdName: msg.CallerIDName,
        uniqueId: msg.Uniqueid ?? msg.UniqueID,
        destChannel: msg.DestChannel ?? msg.AgentCalled ?? '',
        timestamp: Date.now(),
      }
      if (info.destChannel) {
        deliveryByChannel.set(info.destChannel, info)
      }
      if (info.callerIdNum) {
        deliveryByCallerNum.set(info.callerIdNum, info)
      }
    } else if (evt === 'DialBegin' && msg.DestChannel) {
      // DialBegin also carries the destination; if AgentCalled was missed, use it.
      if (!deliveryByChannel.has(msg.DestChannel) && msg.CallerIDNum) {
        const info: DeliveryInfo = {
          queue: '',
          callerIdNum: msg.CallerIDNum,
          callerIdName: msg.CallerIDName,
          destChannel: msg.DestChannel,
          timestamp: Date.now(),
        }
        deliveryByChannel.set(msg.DestChannel, info)
      }
    } else if (evt === 'Hangup' || evt === 'BridgeLeave') {
      const ch = msg.Channel
      if (ch) deliveryByChannel.delete(ch)
      const num = msg.CallerIDNum
      if (num) deliveryByCallerNum.delete(num)
    }
  }

  function notifyTick() {
    if (!runtime) return
    runtime.onTick()
  }

  function handleQueuesChange(queues: Map<string, QueueInfo>) {
    if (!runtime) return

    // Detect new callers (ids not seen last tick) and fire onInboundCall.
    const currentIds = new Set<string>()
    for (const call of flattenQueueEntries(queues)) {
      currentIds.add(call.id)
      if (!lastSeenIds.has(call.id) && runtime.isQueueOpen()) {
        runtime.onInboundCall(call)
      }
    }
    lastSeenIds = currentIds

    notifyTick()
  }

  function start(startRuntime: MvpGatewayRuntime, _intervalMs?: number): void {
    if (runtime) return
    runtime = startRuntime

    // Drive updates from the live queue map. The demo gateway used a setInterval
    // tick; here we react to AMI-driven ref mutations, which is more accurate.
    watchStop = watchEffect(() => {
      handleQueuesChange(handles.queues.value)
    })

    // Listen for delivery events to build the correlation map. We call getClient()
    // at start() time (which runs after ami.connect() in initializeConnection),
    // not at setup time — getClient() returns null at setup.
    const client = handles.getClient()
    if (client) {
      client.on('event', onAmiEvent)
    }

    // If the AMI composable exposes granular caller-join subscriptions, use them
    // for crisper onInboundCall timing (in addition to the map watch above).
    if (handles.onCallerJoin) {
      unsubscribeJoin = handles.onCallerJoin((entry, queueName) => {
        if (!runtime || !runtime.isQueueOpen()) return
        const view = mapQueueEntryToQueuedCall({ ...entry, queue: queueName })
        if (!lastSeenIds.has(view.id)) {
          runtime.onInboundCall(view)
        }
      })
    }
    if (handles.onCallerLeave) {
      unsubscribeLeave = handles.onCallerLeave(() => {
        // The queue-map watch will reconcile lastSeenIds on the next flush.
        notifyTick()
      })
    }
  }

  function stop(): void {
    if (watchStop) {
      watchStop()
      watchStop = null
    }
    const client = handles.getClient()
    if (client) {
      client.off('event', onAmiEvent)
    }
    if (unsubscribeJoin) {
      unsubscribeJoin()
      unsubscribeJoin = null
    }
    if (unsubscribeLeave) {
      unsubscribeLeave()
      unsubscribeLeave = null
    }
    runtime = null
    lastSeenIds = new Set()
    deliveryByChannel.clear()
    deliveryByCallerNum.clear()
  }

  function getDeliveryForChannel(channel: string): DeliveryInfo | null {
    return deliveryByChannel.get(channel) ?? null
  }

  function getDeliveryForCallerNumber(num: string): DeliveryInfo | null {
    return deliveryByCallerNum.get(num) ?? null
  }

  return {
    capabilities: CONNECTED_CAPABILITIES,
    start,
    stop,
    getDeliveryForChannel,
    getDeliveryForCallerNumber,
  }
}
