import { describe, expect, it } from 'vitest'

import { useAgentWorkspace } from '../../../../examples/call-center/src/features/agent/useAgentWorkspace'

describe('useAgentWorkspace', () => {
  it('starts offline and blocks generic manual outbound', () => {
    const workspace = useAgentWorkspace()

    expect(workspace.workspaceState.value).toBe('offline')
    expect(workspace.canStartManualOutbound.value).toBe(false)
  })

  it('moves into attention state after queue no-answer', () => {
    const workspace = useAgentWorkspace()

    workspace.handleNoAnswer()

    expect(workspace.workspaceState.value).toBe('attention')
  })

  it('captures customer context from a selected queue call and completes wrap-up', () => {
    const workspace = useAgentWorkspace()

    workspace.setConnected(true)
    workspace.selectQueuedCall({
      id: 'queue-1',
      from: 'sip:customer@example.com',
      displayName: 'Customer Example',
      waitTime: 42,
      priority: 2,
      queue: 'support',
    })

    expect(workspace.customerContext.value.displayName).toBe('Customer Example')
    expect(workspace.workspaceState.value).toBe('ringing')

    workspace.beginWrapUp({
      notes: 'Customer requested a callback',
    })

    expect(workspace.workspaceState.value).toBe('wrap-up')

    workspace.enterWrapUp({
      disposition: 'callback_required',
      notes: 'Customer requested a callback',
      callbackRequested: true,
    })

    expect(workspace.workspaceState.value).toBe('available')
    expect(workspace.wrapUp.value.disposition).toBe('callback_required')
    expect(workspace.pendingCallbacks.value).toHaveLength(1)
  })
})
