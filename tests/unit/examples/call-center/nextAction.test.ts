import { describe, expect, it } from 'vitest'

import { buildAgentNextAction } from '../../../../examples/call-center/src/features/agent/nextAction'

describe('buildAgentNextAction', () => {
  it('prioritizes queued inbound work', () => {
    const action = buildAgentNextAction({
      agentStatus: 'available',
      workspaceState: 'available',
      queue: [
        {
          id: 'queue-1',
          from: 'sip:caller@example.com',
          displayName: 'Caller Example',
          waitTime: 32,
          queue: 'billing',
        },
      ],
      callbacks: [],
      selectedCallback: null,
      isActive: false,
    })

    expect(action.title).toContain('Answer billing queue')
    expect(action.tone).toBe('attention')
  })

  it('falls back to overdue callback work when the queue is clear', () => {
    const action = buildAgentNextAction({
      agentStatus: 'available',
      workspaceState: 'available',
      queue: [],
      callbacks: [
        {
          id: 'cb-1',
          assignee: 'queue-shared',
          queue: 'support',
          targetUri: 'sip:callback@example.com',
          contactName: 'Callback Customer',
          status: 'open',
          reason: 'Call back now',
          dueAt: new Date(Date.now() - 60_000),
        },
      ],
      selectedCallback: null,
      isActive: false,
    })

    expect(action.title).toBe('Return overdue callback')
    expect(action.tone).toBe('warning')
  })

  it('uses wrap-up as the top priority when applicable', () => {
    const action = buildAgentNextAction({
      agentStatus: 'busy',
      workspaceState: 'wrap-up',
      queue: [],
      callbacks: [],
      selectedCallback: null,
      isActive: false,
    })

    expect(action.title).toBe('Complete wrap-up')
    expect(action.tone).toBe('warning')
  })
})
