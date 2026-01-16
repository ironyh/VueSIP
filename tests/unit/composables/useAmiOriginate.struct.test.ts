import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import type { AmiMessage, AmiEventData } from '@/types/ami.types'
import { useAmiOriginate } from '@/composables/useAmiOriginate'

class MockAmiClient {
  private listeners: Array<(e: AmiMessage<AmiEventData>) => void> = []

  async sendAction(_action: Record<string, unknown>) {
    // Simulate a success originate
    return { data: { Response: 'Success', Message: 'Originate successfully queued' } }
  }

  on(event: 'event', cb: (e: AmiMessage<AmiEventData>) => void) {
    this.listeners.push(cb)
  }
  off(event: 'event', cb: (e: AmiMessage<AmiEventData>) => void) {
    this.listeners = this.listeners.filter((f) => f !== cb)
  }
  emit(e: AmiMessage<AmiEventData>) {
    this.listeners.forEach((f) => f(e))
  }
}

describe('useAmiOriginate', () => {
  let client: MockAmiClient
  const clientRef = ref<any>(null)

  beforeEach(() => {
    client = new MockAmiClient()
    clientRef.value = client as any
  })

  afterEach(() => {
    clientRef.value = null
  })

  it('builds AMI action with context/exten and updates progress/result', async () => {
    const { originate, progress, lastResult } = useAmiOriginate(clientRef, {
      defaultContext: 'from-internal',
    })

    const res = await originate({
      channel: 'PJSIP/1001',
      exten: '200',
      context: 'from-internal',
      timeout: 10,
      variables: { FOO: 'bar' },
    })

    expect(res.success).toBe(true)
    expect(progress.value?.state).toBeDefined()
    expect(lastResult.value?.response).toContain('queued')
  })

  it('handles OriginateResponse and Dial events', async () => {
    const { originate, progress } = useAmiOriginate(clientRef)

    await originate({ channel: 'PJSIP/1001', exten: '201', context: 'from-internal' })

    // Emit OriginateResponse success
    client.emit({
      data: { Event: 'OriginateResponse', Response: 'Success', Channel: 'PJSIP/1001-0001' } as any,
    })
    expect(progress.value?.state).toBe('ringing')

    // Emit DialEnd BUSY
    client.emit({
      data: { Event: 'DialEnd', Channel: 'PJSIP/1001-0001', DialStatus: 'BUSY' } as any,
    })
    expect(progress.value?.state).toBe('busy')
  })
})
