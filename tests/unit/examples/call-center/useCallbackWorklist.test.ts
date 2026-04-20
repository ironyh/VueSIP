import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useCallbackWorklist } from '../../../../examples/call-center/src/features/agent/useCallbackWorklist'

describe('useCallbackWorklist', () => {
  it('blocks outbound until a callback task is selected', () => {
    const callbacks = ref([
      {
        id: 'cb-1',
        assignee: 'agent-1',
        queue: 'support',
        targetUri: 'sip:customer@example.com',
        contactName: 'Customer Example',
        status: 'open' as const,
        reason: 'Return billing call',
        dueAt: new Date('2026-04-20T12:05:00Z'),
      },
    ])

    const worklist = useCallbackWorklist(callbacks)

    expect(worklist.canStartCallbackOutbound.value).toBe(false)

    worklist.selectCallback('cb-1')

    expect(worklist.canStartCallbackOutbound.value).toBe(true)
    expect(worklist.selectedCallback.value?.targetUri).toBe('sip:customer@example.com')
  })

  it('marks selected callback tasks in progress and completed', () => {
    const callbacks = ref([
      {
        id: 'cb-1',
        assignee: 'agent-1',
        queue: 'support',
        targetUri: 'sip:customer@example.com',
        contactName: 'Customer Example',
        status: 'open' as const,
        reason: 'Return billing call',
        dueAt: new Date('2026-04-20T12:05:00Z'),
      },
    ])

    const worklist = useCallbackWorklist(callbacks)

    worklist.markCallbackInProgress('cb-1')
    expect(callbacks.value[0].status).toBe('in-progress')

    worklist.completeCallback('cb-1')
    expect(callbacks.value[0].status).toBe('completed')
    expect(worklist.selectedCallbackId.value).toBeNull()
  })
})
