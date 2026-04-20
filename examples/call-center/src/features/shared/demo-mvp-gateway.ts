import type { CallbackTaskView, QueuedCallView } from './mvp-types'

interface DemoGatewayRuntime {
  isQueueOpen: () => boolean
  onInboundCall: (call: QueuedCallView) => void
  onTick: () => void
}

interface DemoGatewayOptions {
  random?: () => number
  now?: () => number
}

const mockInboundCallers = [
  { uri: 'sip:customer1@domain.com', name: 'John Smith', queue: 'support' },
  { uri: 'sip:customer2@domain.com', name: 'Jane Doe', queue: 'support' },
  { uri: 'sip:customer3@domain.com', name: 'Bob Johnson', queue: 'billing' },
  { uri: 'sip:sales@domain.com', name: 'Sales Inquiry', queue: 'sales' },
]

const seededCallbacks: Array<
  Pick<CallbackTaskView, 'queue' | 'targetUri' | 'contactName' | 'reason'>
> = [
  {
    queue: 'support',
    targetUri: 'sip:followup1@domain.com',
    contactName: 'Follow-up Customer',
    reason: 'Customer asked for a callback after voicemail',
  },
  {
    queue: 'billing',
    targetUri: 'sip:followup2@domain.com',
    contactName: 'Billing Escalation',
    reason: 'Review billing dispute outcome',
  },
]

export function createDemoMvpGateway(options: DemoGatewayOptions = {}) {
  const random = options.random ?? Math.random
  const now = options.now ?? Date.now
  const capabilities = {
    manualOutbound: false,
    supervisorAudioIntervention: false,
  }

  let intervalId: ReturnType<typeof setInterval> | null = null

  function createInboundCall(): QueuedCallView {
    const caller = mockInboundCallers[Math.floor(random() * mockInboundCallers.length)]

    return {
      id: `queue-${now()}`,
      from: caller.uri,
      displayName: caller.name,
      waitTime: 0,
      priority: Math.floor(random() * 3) + 1,
      queue: caller.queue,
    }
  }

  function createSeedCallbacks(): CallbackTaskView[] {
    return seededCallbacks.map((callback, index) => ({
      id: `seed-callback-${index + 1}`,
      assignee: 'queue-shared',
      queue: callback.queue,
      targetUri: callback.targetUri,
      contactName: callback.contactName,
      status: 'open',
      reason: callback.reason,
      dueAt: new Date(now() + (index + 1) * 15 * 60 * 1000),
    }))
  }

  function start(runtime: DemoGatewayRuntime, intervalMs = 5000) {
    if (intervalId) {
      return
    }

    intervalId = setInterval(() => {
      runtime.onTick()

      if (runtime.isQueueOpen() && random() > 0.7) {
        runtime.onInboundCall(createInboundCall())
      }
    }, intervalMs)
  }

  function stop() {
    if (!intervalId) {
      return
    }

    clearInterval(intervalId)
    intervalId = null
  }

  return {
    capabilities,
    createInboundCall,
    createSeedCallbacks,
    start,
    stop,
  }
}
