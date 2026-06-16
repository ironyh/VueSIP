import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useSupervisorBoard } from '../../../../examples/call-center/src/features/supervisor/useSupervisorBoard'

describe('useSupervisorBoard', () => {
  it('does not expose audio intervention actions', () => {
    const board = useSupervisorBoard({
      queueCalls: ref([]),
      callbacks: ref([]),
      agentStatus: ref('available'),
      workspaceState: ref('available'),
      activeCallId: ref(null),
    })

    expect(board.actions.value).not.toContain('barge')
    expect(board.actions.value).toContain('reassign-callback')
  })

  it('summarizes queue pressure and overdue callbacks', () => {
    const board = useSupervisorBoard({
      queueCalls: ref([
        {
          id: 'queue-1',
          from: 'sip:customer@example.com',
          displayName: 'Customer Example',
          waitTime: 75,
          priority: 2,
          queue: 'support',
        },
      ]),
      callbacks: ref([
        {
          id: 'cb-1',
          assignee: 'queue-shared',
          queue: 'support',
          targetUri: 'sip:followup@example.com',
          contactName: 'Follow Up',
          status: 'open',
          reason: 'Follow-up',
          dueAt: new Date(Date.now() - 1000),
        },
      ]),
      agentStatus: ref('busy'),
      workspaceState: ref('busy'),
      activeCallId: ref('call-1'),
    })

    expect(board.queueRows.value[0]).toMatchObject({
      queue: 'support',
      waitingCalls: 1,
    })
    expect(board.alertRows.value.map((alert) => alert.id)).toContain('callbacks-overdue')
  })
})
