import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useCallHold } from '@/composables/useCallHold'
import { HoldState } from '@/types/call.types'

function createEventBus() {
  let nextId = 1
  const handlers: Record<string, Map<number, (...args: any[]) => void>> = {}
  return {
    on(event: string, cb: (...args: any[]) => void) {
      const id = nextId++
      ;(handlers[event] ||= new Map()).set(id, cb)
      return id
    },
    off(event: string, id: number) {
      handlers[event]?.delete(id)
    },
    emit(event: string, payload: any) {
      for (const cb of handlers[event]?.values() ?? []) cb(payload)
    },
  }
}

describe('useCallHold (additional coverage)', () => {
  it('validates prerequisites and sets errors on invalid operations', async () => {
    const session = ref<any>({ id: 'c1', state: 'idle', eventBus: createEventBus() })
    const { holdCall, resumeCall, holdError } = useCallHold(session)
    // hold in idle -> invalid
    const r1 = await holdCall()
    expect(r1.success).toBe(false)
    expect(String(holdError.value)).toMatch(/active or held/i)

    // set active, then resume when not held
    session.value.state = 'active'
    const r2 = await resumeCall()
    expect(r2.success).toBe(false)
    expect(String(r2.error)).toMatch(/not on hold/i)
  })

  it('successful hold/resume via events updates state', async () => {
    const bus = createEventBus()
    const session = ref<any>({
      id: 'c2',
      state: 'active',
      eventBus: bus,
      hold: vi.fn(async () => {}),
      unhold: vi.fn(async () => {}),
    })
    const { holdCall, resumeCall, holdState } = useCallHold(session)

    const hr = await holdCall()
    expect(hr.success).toBe(true)
    // simulate event confirming local hold
    bus.emit('call:hold', { originator: 'local' })
    expect(holdState.value).toBe(HoldState.Held)

    const rr = await resumeCall()
    expect(rr.success).toBe(true)
    // simulate unhold confirmation
    bus.emit('call:unhold', { originator: 'local' })
    expect(holdState.value).toBe(HoldState.Active)
  })

  it('toggleHold switches between hold and resume', async () => {
    const bus = createEventBus()
    const session = ref<any>({
      id: 'c3',
      state: 'active',
      eventBus: bus,
      hold: vi.fn(async () => {}),
      unhold: vi.fn(async () => {}),
    })
    const { toggleHold, holdState } = useCallHold(session)

    await toggleHold() // should hold
    bus.emit('call:hold', { originator: 'local' })
    expect(holdState.value).toBe(HoldState.Held)

    await toggleHold() // should resume
    bus.emit('call:unhold', { originator: 'local' })
    expect(holdState.value).toBe(HoldState.Active)
  })
})
