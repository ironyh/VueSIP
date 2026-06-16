import { describe, expect, it } from 'vitest'

import { useWrapUpDraft } from '../../../../examples/call-center/src/features/agent/useWrapUpDraft'

describe('useWrapUpDraft', () => {
  it('requires a disposition before wrap-up can complete', () => {
    const draft = useWrapUpDraft()

    expect(draft.canComplete.value).toBe(false)

    draft.notes.value = 'Customer needs callback tomorrow'
    draft.disposition.value = 'callback_required'

    expect(draft.canComplete.value).toBe(true)
  })

  it('can reset the draft back to an empty state', () => {
    const draft = useWrapUpDraft()

    draft.notes.value = 'A note'
    draft.disposition.value = 'resolved'
    draft.callbackRequested.value = true

    draft.reset()

    expect(draft.notes.value).toBe('')
    expect(draft.disposition.value).toBeNull()
    expect(draft.callbackRequested.value).toBe(false)
  })

  it('can hydrate notes from the active call into wrap-up', () => {
    const draft = useWrapUpDraft()

    draft.hydrate({
      notes: 'Customer asked for a callback tomorrow morning',
      callbackRequested: true,
    })

    expect(draft.notes.value).toBe('Customer asked for a callback tomorrow morning')
    expect(draft.callbackRequested.value).toBe(true)
  })
})
