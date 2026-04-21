import type { Ref } from 'vue'

import type { createDemoMvpGateway } from './demo-mvp-gateway'
import { buildCustomerContextView } from './workspace-mappers'
import type {
  AgentWorkspaceState,
  CallbackTaskView,
  CustomerContextView,
  DemoStoryScene,
  QueuedCallView,
} from './mvp-types'

interface PresenterControlsOptions {
  gateway: ReturnType<typeof createDemoMvpGateway>
  queue: Ref<QueuedCallView[]>
  callbacks: Ref<CallbackTaskView[]>
  selectedCallbackId: Ref<string | null>
  currentCallNotes: Ref<string>
  historyAnnotations: Ref<Record<string, { tags: string[]; metadata: Record<string, unknown> }>>
  activeCallbackId: Ref<string | null>
  lastWrappedCallId: Ref<string | null>
  customerContext: Ref<CustomerContextView>
  workspaceState: Ref<AgentWorkspaceState>
  resetWrapUpDraft: () => void
  clearWrapUp: (nextState: Extract<AgentWorkspaceState, 'available' | 'paused' | 'offline'>) => void
}

type DemoScenario = 'support' | 'billing' | 'sales'

export function createPresenterControls(options: PresenterControlsOptions) {
  const forceInboundCall = (scenario: DemoScenario = 'support') => {
    options.queue.value.push(options.gateway.createInboundCall(scenario))
  }

  const seedCallbackTask = (scenario: DemoScenario = 'support') => {
    const callback = options.gateway.createPresenterCallback(
      options.callbacks.value.length + 1,
      scenario
    )
    options.callbacks.value.push(callback)
    options.selectedCallbackId.value = callback.id
    options.customerContext.value.hasOpenCallback = true
  }

  const runStoryScene = (sceneId: DemoStoryScene) => {
    const scene = options.gateway.createStoryScene(sceneId)

    options.queue.value.push(...scene.queueCalls)
    options.callbacks.value.push(...scene.callbacks)
    options.customerContext.value = buildCustomerContextView({
      remoteUri: scene.callbacks[0]?.targetUri ?? scene.queueCalls[0]?.from ?? '',
      remoteDisplayName:
        scene.callbacks[0]?.contactName ?? scene.queueCalls[0]?.displayName ?? 'Story Preview',
      queue: scene.scenario,
      latestDisposition: options.customerContext.value.latestDisposition,
      noteSummary: scene.summary,
      hasOpenCallback: scene.callbacks.length > 0,
      profile: scene.callbacks[0]?.profile ?? scene.queueCalls[0]?.profile ?? null,
    })

    if (scene.callbacks[0]) {
      options.selectedCallbackId.value = scene.callbacks[0].id
    }

    return scene
  }

  const resetDemoState = () => {
    options.queue.value = []
    options.callbacks.value = []
    options.selectedCallbackId.value = null
    options.currentCallNotes.value = ''
    options.historyAnnotations.value = {}
    options.activeCallbackId.value = null
    options.lastWrappedCallId.value = null
    options.customerContext.value = {
      ...options.customerContext.value,
      latestDisposition: null,
      noteSummary: null,
      hasOpenCallback: false,
      accountTier: null,
      accountHealth: null,
      serviceLevel: null,
      openCaseTitle: null,
      callbackReason: null,
      lastInteractionAt: null,
    }

    if (options.workspaceState.value === 'wrap-up') {
      options.clearWrapUp('available')
    }

    options.resetWrapUpDraft()
  }

  return {
    forceInboundCall,
    seedCallbackTask,
    runStoryScene,
    resetDemoState,
  }
}
