import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { DialogState, type DialogStatus } from '@/types/presence.types'

function createEventBus() {
  const listeners: Record<string, Set<(...args: any[]) => void>> = {}
  return {
    on(event: string, cb: (...args: any[]) => void) {
      ;(listeners[event] ||= new Set()).add(cb)
    },
    off(event: string, cb: (...args: any[]) => void) {
      listeners[event]?.delete(cb)
    },
    emit(event: string, payload: any) {
      for (const cb of listeners[event] ?? []) cb(payload)
    },
  }
}

function validUri(ext = '6001') {
  return `sip:${ext}@pbx.example.com`
}

describe('useDialog (additional coverage)', () => {
  it('emits error event and rethrows when subscribeDialog fails', async () => {
    const eventBus = createEventBus()
    const sipClient = ref<any>({
      eventBus,
      async subscribeDialog() {
        throw new Error('network error')
      },
    })
    const { subscribe, onDialogEvent } = useDialog(sipClient)

    const events: any[] = []
    const off = onDialogEvent((e) => events.push(e))

    await expect(subscribe(validUri('6002'))).rejects.toThrow('network error')
    off()

    const errorEvt = events.find((e) => e?.type === 'error')
    expect(errorEvt).toBeTruthy()
    expect(errorEvt.uri).toBe(validUri('6002'))
    expect(String(errorEvt.error)).toContain('network error')
  })

  it('unsubscribeAll swallows client errors and leaves state intact on failure', async () => {
    const eventBus = createEventBus()
    const sipClient = ref<any>({
      eventBus,
      async subscribeDialog() {
        return 'sub-1'
      },
      async unsubscribeAllDialogs() {
        throw new Error('fail')
      },
    })

    const { unsubscribeAll, subscriptions, watchedExtensions } = useDialog(sipClient)

    // Seed state by emulating a subscribe event to create a subscription entry
    eventBus.emit('sip:dialog:subscribe', {
      uri: validUri('6003'),
      subscriptionId: 'sub-6003',
      expires: 300,
    })
    expect(subscriptions.value.size).toBe(1)

    await expect(unsubscribeAll()).resolves.toBeUndefined()
    // Since client threw, internal maps should remain as they were
    expect(subscriptions.value.size).toBe(1)
    expect(watchedExtensions.value.size).toBe(0)
  })

  it('respects custom display configuration overrides', () => {
    const sipClient = ref<any>(null)
    const { getDisplayOptions, setDisplayConfig } = useDialog(sipClient)
    setDisplayConfig({ stateDisplay: { [DialogState.Busy]: { label: 'On a Call', icon: '☎️' } } })
    const opts = getDisplayOptions(DialogState.Busy)
    expect(opts.label).toBe('On a Call')
    expect(opts.icon).toBe('☎️')
  })

  it('handles dialog notify/subscribe/unsubscribe/refresh events end-to-end', () => {
    const eventBus = createEventBus()
    const sipClient = ref<any>({
      eventBus,
      async subscribeDialog() {
        return 'x'
      },
    })
    const { subscriptions, getStatus, onDialogEvent, subscriptionCount } = useDialog(sipClient)

    const uri = validUri('6010')
    const seen: string[] = []
    const off = onDialogEvent((e) => seen.push(e.type))

    // Subscription created by event
    eventBus.emit('sip:dialog:subscribe', { uri, subscriptionId: 'sub-6010', expires: 120 })
    expect(subscriptionCount.value).toBe(1)

    // Notify updates status
    const status: DialogStatus = { state: DialogState.Busy, reason: 'in-use' } as any
    eventBus.emit('sip:dialog:notify', { uri, status })
    expect(getStatus(uri)?.state).toBe(DialogState.Busy)

    // Refresh updates expiresAt
    const before = subscriptions.value.get(uri)!.expiresAt
    eventBus.emit('sip:dialog:refreshed', { uri })
    const after = subscriptions.value.get(uri)!.expiresAt
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime())

    // Unsubscribe removes entries
    eventBus.emit('sip:dialog:unsubscribe', { uri })
    expect(subscriptions.value.size).toBe(0)

    off()
    // Events observed include subscribed/updated/refreshed/unsubscribed in some order
    expect(new Set(seen)).toEqual(new Set(['subscribed', 'updated', 'refreshed', 'unsubscribed']))
  })
})
