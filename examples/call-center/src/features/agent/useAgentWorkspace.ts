import { computed, ref } from 'vue'
import { buildCustomerContextView } from '../shared/workspace-mappers'
import type {
  AgentWorkspaceState,
  CallbackTaskView,
  CustomerContextView,
  QueuedCallView,
  WrapUpDraftValue,
} from '../shared/mvp-types'

export function useAgentWorkspace() {
  const isConnected = ref(false)
  const needsAttention = ref(false)
  const workspaceState = ref<AgentWorkspaceState>('offline')
  const currentQueueCall = ref<QueuedCallView | null>(null)
  const customerContext = ref<CustomerContextView>(
    buildCustomerContextView({
      remoteUri: '',
      remoteDisplayName: 'Unknown Caller',
      queue: null,
      latestDisposition: null,
      noteSummary: null,
      hasOpenCallback: false,
    })
  )
  const wrapUp = ref<WrapUpDraftValue>({
    disposition: null,
    notes: '',
    callbackRequested: false,
  })
  const pendingCallbacks = ref<CallbackTaskView[]>([])

  const canStartManualOutbound = computed(() => false)

  function setConnected(connected: boolean) {
    isConnected.value = connected
    workspaceState.value = connected ? 'available' : 'offline'
  }

  function selectQueuedCall(call: QueuedCallView) {
    currentQueueCall.value = call
    customerContext.value = buildCustomerContextView({
      remoteUri: call.from,
      remoteDisplayName: call.displayName ?? null,
      queue: call.queue,
      latestDisposition: customerContext.value.latestDisposition,
      noteSummary: customerContext.value.noteSummary,
      hasOpenCallback: customerContext.value.hasOpenCallback,
    })
    workspaceState.value = 'ringing'
    needsAttention.value = false
  }

  function beginWrapUp(prefill?: Partial<WrapUpDraftValue>) {
    wrapUp.value = {
      disposition: prefill?.disposition ?? null,
      notes: prefill?.notes ?? '',
      callbackRequested: prefill?.callbackRequested ?? false,
    }
    workspaceState.value = 'wrap-up'
  }

  function enterWrapUp(draft: WrapUpDraftValue): CallbackTaskView | null {
    wrapUp.value = { ...draft }
    let createdCallback: CallbackTaskView | null = null

    if (draft.callbackRequested) {
      createdCallback = {
        id: `callback-${Date.now()}`,
        assignee: 'current-agent',
        queue: currentQueueCall.value?.queue ?? 'support',
        targetUri: currentQueueCall.value?.from ?? customerContext.value.address,
        contactName: customerContext.value.displayName,
        status: 'open',
        reason: draft.notes || 'Requested callback',
        dueAt: new Date(),
      }
      pendingCallbacks.value.push(createdCallback)
      customerContext.value.hasOpenCallback = true
    }

    customerContext.value.latestDisposition = draft.disposition
    customerContext.value.noteSummary = draft.notes || customerContext.value.noteSummary
    currentQueueCall.value = null
    needsAttention.value = false
    workspaceState.value = isConnected.value ? 'available' : 'offline'
    return createdCallback
  }

  function clearWrapUp(
    nextState: Extract<AgentWorkspaceState, 'available' | 'paused' | 'offline'>
  ) {
    wrapUp.value = {
      disposition: null,
      notes: '',
      callbackRequested: false,
    }
    workspaceState.value = nextState
  }

  function handleNoAnswer() {
    needsAttention.value = true
    workspaceState.value = 'attention'
  }

  return {
    isConnected,
    workspaceState,
    currentQueueCall,
    customerContext,
    wrapUp,
    pendingCallbacks,
    canStartManualOutbound,
    setConnected,
    selectQueuedCall,
    beginWrapUp,
    enterWrapUp,
    clearWrapUp,
    handleNoAnswer,
  }
}
