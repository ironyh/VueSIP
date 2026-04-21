import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { createDemoMvpGateway } from '../../../../examples/call-center/src/features/shared/demo-mvp-gateway'
import { createPresenterControls } from '../../../../examples/call-center/src/features/shared/presenterControls'
import type {
  AgentWorkspaceState,
  CallbackTaskView,
  CustomerContextView,
  QueuedCallView,
} from '../../../../examples/call-center/src/features/shared/mvp-types'

describe('presenterControls', () => {
  it('forces an inbound call into the queue and seeds a selectable callback task', () => {
    const queue = ref<QueuedCallView[]>([])
    const callbacks = ref<CallbackTaskView[]>([])
    const selectedCallbackId = ref<string | null>(null)
    const currentCallNotes = ref('')
    const historyAnnotations = ref<
      Record<string, { tags: string[]; metadata: Record<string, unknown> }>
    >({})
    const activeCallbackId = ref<string | null>(null)
    const lastWrappedCallId = ref<string | null>(null)
    const customerContext = ref<CustomerContextView>({
      displayName: 'Unknown Caller',
      address: '',
      queue: null,
      latestDisposition: null,
      noteSummary: null,
      hasOpenCallback: false,
    })
    const workspaceState = ref<AgentWorkspaceState>('available')

    const gateway = createDemoMvpGateway({
      random: () => 0.9,
      now: () => new Date('2026-04-21T09:00:00Z').getTime(),
    })

    const controls = createPresenterControls({
      gateway,
      queue,
      callbacks,
      selectedCallbackId,
      currentCallNotes,
      historyAnnotations,
      activeCallbackId,
      lastWrappedCallId,
      customerContext,
      workspaceState,
      resetWrapUpDraft: vi.fn(),
      clearWrapUp: vi.fn(),
    })

    controls.forceInboundCall()
    controls.seedCallbackTask()

    expect(queue.value).toHaveLength(1)
    expect(queue.value[0].queue).toBeTruthy()
    expect(callbacks.value).toHaveLength(1)
    expect(callbacks.value[0].status).toBe('open')
    expect(selectedCallbackId.value).toBe(callbacks.value[0].id)
  })

  it('supports queue-specific presenter scenarios', () => {
    const queue = ref<QueuedCallView[]>([])
    const callbacks = ref<CallbackTaskView[]>([])
    const selectedCallbackId = ref<string | null>(null)
    const currentCallNotes = ref('')
    const historyAnnotations = ref<
      Record<string, { tags: string[]; metadata: Record<string, unknown> }>
    >({})
    const activeCallbackId = ref<string | null>(null)
    const lastWrappedCallId = ref<string | null>(null)
    const customerContext = ref<CustomerContextView>({
      displayName: 'Unknown Caller',
      address: '',
      queue: null,
      latestDisposition: null,
      noteSummary: null,
      hasOpenCallback: false,
    })
    const workspaceState = ref<AgentWorkspaceState>('available')

    const controls = createPresenterControls({
      gateway: createDemoMvpGateway({
        random: () => 0.9,
        now: () => new Date('2026-04-21T09:30:00Z').getTime(),
      }),
      queue,
      callbacks,
      selectedCallbackId,
      currentCallNotes,
      historyAnnotations,
      activeCallbackId,
      lastWrappedCallId,
      customerContext,
      workspaceState,
      resetWrapUpDraft: vi.fn(),
      clearWrapUp: vi.fn(),
    })

    controls.forceInboundCall('billing')
    controls.seedCallbackTask('billing')

    expect(queue.value).toHaveLength(1)
    expect(queue.value[0].queue).toBe('billing')
    expect(callbacks.value).toHaveLength(1)
    expect(callbacks.value[0].queue).toBe('billing')
    expect(callbacks.value[0].contactName).toContain('Billing')
  })

  it('resets presenter-managed demo state', () => {
    const queue = ref<QueuedCallView[]>([
      {
        id: 'queue-1',
        from: 'sip:caller@example.com',
        displayName: 'Caller',
        waitTime: 25,
        priority: 2,
        queue: 'support',
      },
    ])
    const callbacks = ref<CallbackTaskView[]>([
      {
        id: 'callback-1',
        assignee: 'current-agent',
        queue: 'support',
        targetUri: 'sip:callback@example.com',
        contactName: 'Callback Customer',
        status: 'open',
        reason: 'Call me back',
        dueAt: new Date('2026-04-21T09:15:00Z'),
      },
    ])
    const selectedCallbackId = ref<string | null>('callback-1')
    const currentCallNotes = ref('notes to clear')
    const historyAnnotations = ref<
      Record<string, { tags: string[]; metadata: Record<string, unknown> }>
    >({
      'call-1': { tags: ['callback'], metadata: { disposition: 'callback_required' } },
    })
    const activeCallbackId = ref<string | null>('callback-1')
    const lastWrappedCallId = ref<string | null>('call-1')
    const customerContext = ref<CustomerContextView>({
      displayName: 'Customer',
      address: 'sip:caller@example.com',
      queue: 'support',
      latestDisposition: 'callback_required',
      noteSummary: 'notes to clear',
      hasOpenCallback: true,
    })
    const workspaceState = ref<AgentWorkspaceState>('wrap-up')
    const resetWrapUpDraft = vi.fn()
    const clearWrapUp = vi.fn()

    const controls = createPresenterControls({
      gateway: createDemoMvpGateway(),
      queue,
      callbacks,
      selectedCallbackId,
      currentCallNotes,
      historyAnnotations,
      activeCallbackId,
      lastWrappedCallId,
      customerContext,
      workspaceState,
      resetWrapUpDraft,
      clearWrapUp,
    })

    controls.resetDemoState()

    expect(queue.value).toHaveLength(0)
    expect(callbacks.value).toHaveLength(0)
    expect(selectedCallbackId.value).toBeNull()
    expect(currentCallNotes.value).toBe('')
    expect(historyAnnotations.value).toEqual({})
    expect(activeCallbackId.value).toBeNull()
    expect(lastWrappedCallId.value).toBeNull()
    expect(customerContext.value.latestDisposition).toBeNull()
    expect(customerContext.value.noteSummary).toBeNull()
    expect(customerContext.value.hasOpenCallback).toBe(false)
    expect(clearWrapUp).toHaveBeenCalledWith('available')
    expect(resetWrapUpDraft).toHaveBeenCalled()
  })
})
