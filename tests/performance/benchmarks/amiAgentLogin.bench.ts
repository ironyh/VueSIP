import { bench, describe, beforeEach, vi } from 'vitest'
import { useAmiAgentLogin } from '@/composables/useAmiAgentLogin'
import type { AmiClient } from '@/core/AmiClient'
import { createAmiSuccessResponse } from '../../unit/utils/mockFactories'

// Simulated network latency per AMI call in milliseconds
const LATENCY = 10

describe('useAmiAgentLogin Performance (Sequential vs Concurrent)', () => {
  let mockClient: any
  const queueCount = 10
  const queues = Array.from({ length: queueCount }, (_, i) => `queue-${i}`)

  const options = {
    agentId: 'agent1',
    interface: 'PJSIP/101',
    availableQueues: queues,
  }

  beforeEach(() => {
    mockClient = {
      queueAdd: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, LATENCY))
        return createAmiSuccessResponse()
      }),
      queueRemove: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, LATENCY))
        return createAmiSuccessResponse()
      }),
      queuePause: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, LATENCY))
        return createAmiSuccessResponse()
      }),
      on: vi.fn(),
      off: vi.fn(),
      getQueueStatus: vi.fn().mockResolvedValue([]),
    }
  })

  bench(`login to ${queueCount} queues`, async () => {
    const { login } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
    await login({ queues })
  })

  bench(`pause in ${queueCount} queues`, async () => {
    const { login, pause } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
    // Pre-login so we can pause
    // Note: This setup is included in the benchmark timing.
    // In sequential version, this adds overhead.
    // In concurrent version, it also adds overhead.
    // The relative difference should still be clear.
    await login({ queues })
    await pause({ reason: 'Lunch' })
  })

  bench(`unpause in ${queueCount} queues`, async () => {
    const { login, pause, unpause } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
    await login({ queues })
    await pause({ reason: 'Lunch' })
    await unpause()
  })

  bench(`logout from ${queueCount} queues`, async () => {
    const { login, logout } = useAmiAgentLogin(mockClient as unknown as AmiClient, options)
    await login({ queues })
    await logout()
  })
})
