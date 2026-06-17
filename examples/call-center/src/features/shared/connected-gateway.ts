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
import type {
  MvpGateway,
  MvpGatewayCapabilities,
  MvpGatewayRuntime,
  QueuedCallView,
} from './mvp-types'

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
export function createConnectedGateway(handles: ConnectedGatewayHandles): MvpGateway {
  let runtime: MvpGatewayRuntime | null = null
  let unsubscribeJoin: (() => void) | null = null
  let unsubscribeLeave: (() => void) | null = null
  let watchStop: (() => void) | null = null
  let lastSeenIds = new Set<string>()

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
  }

  return {
    capabilities: CONNECTED_CAPABILITIES,
    start,
    stop,
  }
}
