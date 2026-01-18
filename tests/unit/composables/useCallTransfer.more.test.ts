import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCallTransfer } from '@/composables/useCallTransfer'
import { TransferType, TransferState } from '@/types/transfer.types'

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

function valid(target = '7001') {
  return `sip:${target}@pbx.example.com`
}

describe('useCallTransfer (additional coverage)', () => {
  it('validates prerequisites and fails for invalid inputs', async () => {
    const session = ref<any>({ id: 's1', state: 'idle', eventBus: createEventBus() })
    const { transferCall, transferState, transferError } = useCallTransfer(session)

    // No active session state
    await transferCall(valid(), { type: TransferType.Blind, target: valid() })
    expect(transferState.value).toBe(TransferState.Failed)
    expect(String(transferError.value)).toMatch(/active call session|active state/i)

    // Invalid URI
    session.value.state = 'active'
    const res = await transferCall('not-a-sip-uri', {
      type: TransferType.Blind,
      target: 'not-a-sip-uri',
    })
    expect(res.success).toBe(false)
    expect(transferState.value).toBe(TransferState.Failed)

    // Attended transfer without consultationCallId
    const res2 = await transferCall(valid(), { type: TransferType.Attended, target: valid() })
    expect(res2.success).toBe(false)
    expect(String(res2.error)).toMatch(/Consultation call ID/i)
  })

  it('initiates blind transfer and sets state to Initiated on success', async () => {
    const bus = createEventBus()
    const session = ref<any>({ id: 's2', state: 'active', eventBus: bus, transfer: async () => {} })
    const { transferCall, transferState, isTransferring } = useCallTransfer(session)
    const res = await transferCall(valid('7101'), {
      type: TransferType.Blind,
      target: valid('7101'),
    })
    expect(res.success).toBe(true)
    expect(transferState.value).toBe(TransferState.Initiated)
    expect(isTransferring.value).toBe(true)
  })

  it('initiates attended transfer when consultation id is provided', async () => {
    const bus = createEventBus()
    const session = ref<any>({
      id: 's3',
      state: 'active',
      eventBus: bus,
      attendedTransfer: async () => {},
    })
    const { transferCall, transferState } = useCallTransfer(session)
    const res = await transferCall(valid('7201'), {
      type: TransferType.Attended,
      target: valid('7201'),
      consultationCallId: 'call-x',
    })
    expect(res.success).toBe(true)
    expect(transferState.value).toBe(TransferState.Initiated)
  })

  it('accepts and rejects transfer via event emission and state updates', async () => {
    const bus = createEventBus()
    const session = ref<any>({ id: 's4', state: 'active', eventBus: bus })
    const { acceptTransfer, rejectTransfer, transferState, transferError } =
      useCallTransfer(session)

    await acceptTransfer()
    expect(transferState.value).toBe(TransferState.Accepted)

    await rejectTransfer('User declined')
    expect(transferState.value).toBe(TransferState.Failed)
    expect(String(transferError.value)).toContain('User declined')
  })
})
