import type { Ref } from 'vue'

import type { createDemoMvpGateway } from './demo-mvp-gateway'
import type {
  AgentWorkspaceState,
  CallbackTaskView,
  CustomerContextView,
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
    }

    if (options.workspaceState.value === 'wrap-up') {
      options.clearWrapUp('available')
    }

    options.resetWrapUpDraft()
  }

  return {
    forceInboundCall,
    seedCallbackTask,
    resetDemoState,
  }
}
