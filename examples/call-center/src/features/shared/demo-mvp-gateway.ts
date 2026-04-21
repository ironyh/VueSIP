import type {
  CallbackTaskView,
  DemoContactProfile,
  DemoScenario,
  DemoStoryScene,
  QueuedCallView,
} from './mvp-types'

interface DemoGatewayRuntime {
  isQueueOpen: () => boolean
  onInboundCall: (call: QueuedCallView) => void
  onTick: () => void
}

interface DemoGatewayOptions {
  random?: () => number
  now?: () => number
}

interface DemoCallerTemplate {
  uri: string
  name: string
  queue: DemoScenario
  profile: DemoContactProfile
}

interface DemoStorySceneView {
  id: DemoStoryScene
  label: string
  summary: string
  scenario: DemoScenario
  queueCalls: QueuedCallView[]
  callbacks: CallbackTaskView[]
}

const mockInboundCallers: DemoCallerTemplate[] = [
  {
    uri: 'sip:customer1@domain.com',
    name: 'John Smith',
    queue: 'support',
    profile: {
      accountTier: 'Standard',
      accountHealth: 'healthy',
      serviceLevel: 'Core SLA',
      openCaseTitle: 'Password reset follow-up',
      callbackReason: 'Confirm login after yesterday reset',
      lastInteractionAt: 'Yesterday, 16:20',
    },
  },
  {
    uri: 'sip:customer2@domain.com',
    name: 'Jane Doe',
    queue: 'support',
    profile: {
      accountTier: 'VIP',
      accountHealth: 'at-risk',
      serviceLevel: 'Platinum SLA',
      openCaseTitle: 'Checkout outage escalation',
      callbackReason: 'Escalation owner promised a same-day update',
      lastInteractionAt: '12 minutes ago',
    },
  },
  {
    uri: 'sip:customer3@domain.com',
    name: 'Northwind Health',
    queue: 'billing',
    profile: {
      accountTier: 'Priority',
      accountHealth: 'watch',
      serviceLevel: 'Finance Care',
      openCaseTitle: 'Invoice dispute on March renewal',
      callbackReason: 'Customer is waiting for credit confirmation',
      lastInteractionAt: '27 minutes ago',
    },
  },
  {
    uri: 'sip:sales@domain.com',
    name: 'Mercury Retail Group',
    queue: 'sales',
    profile: {
      accountTier: 'Priority',
      accountHealth: 'healthy',
      serviceLevel: 'Pipeline Assist',
      openCaseTitle: 'Outbound upgrade follow-up',
      callbackReason: 'Review proposal before end-of-quarter',
      lastInteractionAt: 'This morning',
    },
  },
]

const seededCallbacks: Array<
  Pick<CallbackTaskView, 'queue' | 'targetUri' | 'contactName' | 'reason' | 'profile'>
> = [
  {
    queue: 'support',
    targetUri: 'sip:followup1@domain.com',
    contactName: 'Follow-up Customer',
    reason: 'Customer asked for a callback after voicemail',
    profile: {
      accountTier: 'Standard',
      accountHealth: 'healthy',
      serviceLevel: 'Core SLA',
      openCaseTitle: 'Voicemail follow-up',
      callbackReason: 'Customer asked for an afternoon callback window',
      lastInteractionAt: 'Today, 09:15',
    },
  },
  {
    queue: 'billing',
    targetUri: 'sip:followup2@domain.com',
    contactName: 'Billing Escalation',
    reason: 'Review billing dispute outcome',
    profile: {
      accountTier: 'Priority',
      accountHealth: 'watch',
      serviceLevel: 'Finance Care',
      openCaseTitle: 'Billing dispute review',
      callbackReason: 'Validate whether the promised credit has posted',
      lastInteractionAt: 'Today, 08:45',
    },
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

  function createInboundCall(queue?: DemoScenario): QueuedCallView {
    const candidates = queue
      ? mockInboundCallers.filter((caller) => caller.queue === queue)
      : mockInboundCallers
    const caller = candidates[Math.floor(random() * candidates.length)]

    return {
      id: `queue-${now()}`,
      from: caller.uri,
      displayName: caller.name,
      waitTime: 0,
      priority: Math.floor(random() * 3) + 1,
      queue: caller.queue,
      profile: caller.profile,
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
      profile: callback.profile,
    }))
  }

  function createPresenterCallback(index = 1, queue: DemoScenario = 'support'): CallbackTaskView {
    const contactByQueue: Record<DemoScenario, string> = {
      support: 'Priority Follow-up',
      billing: 'Billing Follow-up',
      sales: 'Sales Follow-up',
    }
    const reasonByQueue: Record<DemoScenario, string> = {
      support: 'Walk through support callback flow',
      billing: 'Walk through billing callback flow',
      sales: 'Walk through sales callback flow',
    }

    return {
      id: `presenter-callback-${now()}-${index}`,
      assignee: 'queue-shared',
      queue,
      targetUri: `sip:presenter${index}@domain.com`,
      contactName: contactByQueue[queue],
      status: 'open',
      reason: reasonByQueue[queue],
      dueAt: new Date(now() + 5 * 60 * 1000),
      profile:
        queue === 'billing'
          ? {
              accountTier: 'Priority',
              accountHealth: 'watch',
              serviceLevel: 'Finance Care',
              openCaseTitle: 'Invoice dispute callback',
              callbackReason: 'Walk through disputed charge resolution',
              lastInteractionAt: '5 minutes ago',
            }
          : queue === 'sales'
            ? {
                accountTier: 'Priority',
                accountHealth: 'healthy',
                serviceLevel: 'Pipeline Assist',
                openCaseTitle: 'Expansion call-back',
                callbackReason: 'Walk through proposal and next commercial step',
                lastInteractionAt: '18 minutes ago',
              }
            : {
                accountTier: 'Standard',
                accountHealth: 'healthy',
                serviceLevel: 'Core SLA',
                openCaseTitle: 'Callback requested after troubleshooting',
                callbackReason: 'Walk through support callback flow',
                lastInteractionAt: '9 minutes ago',
              },
    }
  }

  function createStoryScene(scene: DemoStoryScene): DemoStorySceneView {
    const idBase = now()

    switch (scene) {
      case 'peak-hour':
        return {
          id: scene,
          label: 'Peak Hour',
          summary: 'Two callers waiting and one callback already overdue.',
          scenario: 'support',
          queueCalls: [
            {
              id: `scene-${idBase}-queue-1`,
              from: 'sip:peak1@domain.com',
              displayName: 'Maya Lindstrom',
              waitTime: 94,
              priority: 3,
              queue: 'support',
              profile: {
                accountTier: 'VIP',
                accountHealth: 'at-risk',
                serviceLevel: 'Platinum SLA',
                openCaseTitle: 'Storefront outage affecting EU checkout',
                callbackReason: 'Needs status update before exec review',
                lastInteractionAt: '11 minutes ago',
              },
            },
            {
              id: `scene-${idBase}-queue-2`,
              from: 'sip:peak2@domain.com',
              displayName: 'Greenline Dental',
              waitTime: 46,
              priority: 2,
              queue: 'support',
              profile: {
                accountTier: 'Priority',
                accountHealth: 'watch',
                serviceLevel: 'Priority Care',
                openCaseTitle: 'Intermittent audio issue',
                callbackReason: 'Agent promised a device routing check',
                lastInteractionAt: '28 minutes ago',
              },
            },
          ],
          callbacks: [
            {
              id: `scene-${idBase}-callback-1`,
              assignee: 'queue-shared',
              queue: 'support',
              targetUri: 'sip:peak-callback@domain.com',
              contactName: 'Harbor Fitness',
              status: 'open',
              reason: 'Return callback before noon status review',
              dueAt: new Date(idBase - 5 * 60 * 1000),
              profile: {
                accountTier: 'Standard',
                accountHealth: 'watch',
                serviceLevel: 'Core SLA',
                openCaseTitle: 'Callback promised after overnight incident',
                callbackReason: 'Customer is overdue for a progress update',
                lastInteractionAt: '53 minutes ago',
              },
            },
          ],
        }
      case 'vip-escalation':
        return {
          id: scene,
          label: 'VIP Escalation',
          summary: 'Single high-value caller with strict SLA and immediate follow-up pressure.',
          scenario: 'support',
          queueCalls: [
            {
              id: `scene-${idBase}-queue-1`,
              from: 'sip:vip@domain.com',
              displayName: 'Aria Ventures',
              waitTime: 22,
              priority: 3,
              queue: 'support',
              profile: {
                accountTier: 'VIP',
                accountHealth: 'at-risk',
                serviceLevel: 'Executive Platinum',
                openCaseTitle: 'Production outage: admin sign-in blocked',
                callbackReason: 'CTO expects callback before next board sync',
                lastInteractionAt: '7 minutes ago',
              },
            },
          ],
          callbacks: [
            {
              id: `scene-${idBase}-callback-1`,
              assignee: 'queue-shared',
              queue: 'support',
              targetUri: 'sip:vip-callback@domain.com',
              contactName: 'Aria Ventures',
              status: 'open',
              reason: 'Prep callback in case caller drops before escalation handoff',
              dueAt: new Date(idBase + 2 * 60 * 1000),
              profile: {
                accountTier: 'VIP',
                accountHealth: 'at-risk',
                serviceLevel: 'Executive Platinum',
                openCaseTitle: 'Escalation handoff prep',
                callbackReason: 'Preserve the promised VIP follow-up window',
                lastInteractionAt: '7 minutes ago',
              },
            },
          ],
        }
      case 'billing-backlog':
        return {
          id: scene,
          label: 'Billing Backlog',
          summary: 'Billing queue is loaded and the callback backlog is slipping.',
          scenario: 'billing',
          queueCalls: [
            {
              id: `scene-${idBase}-queue-1`,
              from: 'sip:billing1@domain.com',
              displayName: 'Northwind Health',
              waitTime: 68,
              priority: 2,
              queue: 'billing',
              profile: {
                accountTier: 'Priority',
                accountHealth: 'watch',
                serviceLevel: 'Finance Care',
                openCaseTitle: 'Invoice dispute on March renewal',
                callbackReason: 'Customer expects same-hour billing resolution',
                lastInteractionAt: '27 minutes ago',
              },
            },
          ],
          callbacks: [
            {
              id: `scene-${idBase}-callback-1`,
              assignee: 'queue-shared',
              queue: 'billing',
              targetUri: 'sip:billing-callback-1@domain.com',
              contactName: 'Metro Clinics',
              status: 'open',
              reason: 'Overdue callback after failed invoice correction',
              dueAt: new Date(idBase - 18 * 60 * 1000),
              profile: {
                accountTier: 'Priority',
                accountHealth: 'watch',
                serviceLevel: 'Finance Care',
                openCaseTitle: 'Incorrect tax adjustment',
                callbackReason: 'Explain why the invoice correction was rejected',
                lastInteractionAt: '44 minutes ago',
              },
            },
            {
              id: `scene-${idBase}-callback-2`,
              assignee: 'queue-shared',
              queue: 'billing',
              targetUri: 'sip:billing-callback-2@domain.com',
              contactName: 'Skylark Labs',
              status: 'open',
              reason: 'Call back before invoice lock window closes',
              dueAt: new Date(idBase + 4 * 60 * 1000),
              profile: {
                accountTier: 'Standard',
                accountHealth: 'watch',
                serviceLevel: 'Core Billing',
                openCaseTitle: 'Credit memo approval pending',
                callbackReason: 'Need approval before invoicing deadline',
                lastInteractionAt: '16 minutes ago',
              },
            },
          ],
        }
      case 'callback-recovery':
        return {
          id: scene,
          label: 'Callback Recovery',
          summary: 'Queue is calm, but callback work must be recovered quickly.',
          scenario: 'sales',
          queueCalls: [],
          callbacks: [
            {
              id: `scene-${idBase}-callback-1`,
              assignee: 'queue-shared',
              queue: 'sales',
              targetUri: 'sip:recovery-1@domain.com',
              contactName: 'Mercury Retail Group',
              status: 'open',
              reason: 'Outbound follow-up after missed product review',
              dueAt: new Date(idBase - 12 * 60 * 1000),
              profile: {
                accountTier: 'Priority',
                accountHealth: 'watch',
                serviceLevel: 'Pipeline Assist',
                openCaseTitle: 'Missed product review callback',
                callbackReason: 'Recover the follow-up before opportunity cools down',
                lastInteractionAt: '35 minutes ago',
              },
            },
            {
              id: `scene-${idBase}-callback-2`,
              assignee: 'queue-shared',
              queue: 'sales',
              targetUri: 'sip:recovery-2@domain.com',
              contactName: 'Aster Bio',
              status: 'open',
              reason: 'Confirm procurement next step',
              dueAt: new Date(idBase + 6 * 60 * 1000),
              profile: {
                accountTier: 'Priority',
                accountHealth: 'healthy',
                serviceLevel: 'Pipeline Assist',
                openCaseTitle: 'Procurement review next step',
                callbackReason: 'Lock in a follow-up before internal review ends',
                lastInteractionAt: '13 minutes ago',
              },
            },
          ],
        }
    }
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
    createPresenterCallback,
    createStoryScene,
    start,
    stop,
  }
}
