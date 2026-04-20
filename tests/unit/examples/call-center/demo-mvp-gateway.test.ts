import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDemoMvpGateway } from '../../../../examples/call-center/src/features/shared/demo-mvp-gateway'

describe('demo-mvp-gateway', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('seeds callback tasks without enabling manual outbound', () => {
    const gateway = createDemoMvpGateway({
      now: () => new Date('2026-04-20T12:00:00Z').getTime(),
    })

    const callbacks = gateway.createSeedCallbacks()

    expect(callbacks).toHaveLength(2)
    expect(callbacks.every((callback) => callback.status === 'open')).toBe(true)
    expect(gateway.capabilities.manualOutbound).toBe(false)
  })

  it('emits inbound calls through the runtime adapter', () => {
    const gateway = createDemoMvpGateway({
      random: () => 0.9,
      now: () => new Date('2026-04-20T12:00:00Z').getTime(),
    })

    const onInboundCall = vi.fn()
    const onTick = vi.fn()

    gateway.start(
      {
        isQueueOpen: () => true,
        onInboundCall,
        onTick,
      },
      1000
    )

    vi.advanceTimersByTime(1000)
    gateway.stop()

    expect(onTick).toHaveBeenCalledTimes(1)
    expect(onInboundCall).toHaveBeenCalledTimes(1)
    expect(onInboundCall.mock.calls[0][0].queue).toBeTruthy()
  })
})
