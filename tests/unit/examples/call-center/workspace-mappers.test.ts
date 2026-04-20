import { describe, expect, it } from 'vitest'

import type {
  AgentWorkspaceState,
  CallbackTaskView,
} from '../../../../examples/call-center/src/features/shared/mvp-types'
import {
  buildCustomerContextView,
  mapAgentStatusToWorkspaceState,
  mapCallbackToTaskView,
} from '../../../../examples/call-center/src/features/shared/workspace-mappers'

describe('call-center workspace mappers', () => {
  it('supports the locked MVP workspace states', () => {
    const state: AgentWorkspaceState = 'wrap-up'

    expect(state).toBe('wrap-up')
  })

  it('maps agent status to workspace state', () => {
    expect(mapAgentStatusToWorkspaceState('available', false, false)).toBe('available')
    expect(mapAgentStatusToWorkspaceState('busy', true, false)).toBe('wrap-up')
    expect(mapAgentStatusToWorkspaceState('available', false, true)).toBe('attention')
  })

  it('maps callback requests into callback task views', () => {
    const task: CallbackTaskView = mapCallbackToTaskView({
      id: 'cb-1',
      callerNumber: '+15551234567',
      targetQueue: 'support',
      targetAgent: 'agent-1',
      reason: 'Follow up on failed password reset',
      priority: 'high',
      status: 'pending',
      requestedAt: new Date('2026-04-20T12:00:00Z'),
      scheduledAt: new Date('2026-04-20T12:15:00Z'),
      attempts: 0,
      maxAttempts: 3,
    })

    expect(task).toMatchObject({
      id: 'cb-1',
      assignee: 'agent-1',
      queue: 'support',
      targetUri: '+15551234567',
      status: 'open',
      reason: 'Follow up on failed password reset',
    })
  })

  it('builds a minimal customer context rail model', () => {
    expect(
      buildCustomerContextView({
        remoteUri: 'sip:customer@example.com',
        remoteDisplayName: 'Customer Example',
        queue: 'support',
        latestDisposition: 'resolved',
        noteSummary: 'Password reset handled',
        hasOpenCallback: true,
      })
    ).toEqual({
      displayName: 'Customer Example',
      address: 'sip:customer@example.com',
      queue: 'support',
      latestDisposition: 'resolved',
      noteSummary: 'Password reset handled',
      hasOpenCallback: true,
    })
  })
})
