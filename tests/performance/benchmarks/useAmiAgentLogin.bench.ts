import { bench, describe, beforeEach, vi } from 'vitest'
import { useAmiAgentLogin } from '@/composables/useAmiAgentLogin'
import type { AmiClient } from '@/core/AmiClient'
import { createMockAmiClient, createAmiSuccessResponse } from '../../unit/utils/mockFactories'

describe('useAmiAgentLogin Performance', () => {
  let mockClient: any
  const queueCount = 100
  const queues = Array.from({ length: queueCount }, (_, i) => `queue_${i}`)

  const defaultOptions = {
    agentId: 'agent1001',
    interface: 'PJSIP/1001',
    name: 'Test Agent',
    availableQueues: queues,
    defaultQueues: queues,
    persistState: false,
  }

  beforeEach(() => {
    mockClient = createMockAmiClient()
    mockClient.queueAdd = vi.fn().mockResolvedValue(createAmiSuccessResponse())
    mockClient.queueRemove = vi.fn().mockResolvedValue(createAmiSuccessResponse())
    mockClient.queuePause = vi.fn().mockResolvedValue(createAmiSuccessResponse())
  })

  bench(`login to ${queueCount} queues`, async () => {
    const { login } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
    await login({ queues })
  })

  bench(`logout from ${queueCount} queues`, async () => {
    const { login, logout } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
    await login({ queues })
    await logout({ queues })
  })

  bench(`pause in ${queueCount} queues`, async () => {
    const { login, pause } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
    await login({ queues })
    await pause({ queues, reason: 'Break' })
  })

  bench(`unpause in ${queueCount} queues`, async () => {
    const { login, pause, unpause } = useAmiAgentLogin(mockClient as unknown as AmiClient, defaultOptions)
    await login({ queues })
    await pause({ queues, reason: 'Break' })
    await unpause(queues)
  })
})
