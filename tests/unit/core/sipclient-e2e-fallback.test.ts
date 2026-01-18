import { describe, it, expect, beforeEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'

declare global {
  var window: any
}

describe('SipClient E2E fallback mode', () => {
  let originalWindow: any

  beforeEach(() => {
    // Save and stub window to simulate E2E
    originalWindow = global.window
    ;(global as any).window = {
      __emitSipEvent: (event: string) => {
        // no-op for this test; presence indicates E2E mode
        void event
      },
      location: { search: '' },
    }
  })

  it('emits sip:connected immediately in E2E mode', async () => {
    const eventBus = new EventBus()
    const events: string[] = []
    eventBus.on('sip:*', (evt: any) => {
      events.push(evt.type)
    })

    const cfg: SipClientConfig = {
      uri: 'wss://example.com:7443',
      sipUri: 'sip:alice@example.com',
      password: 'secret',
      registrationOptions: { autoRegister: false },
      debug: false,
    }

    const client = new SipClient(cfg, eventBus as any)
    await client.start()

    expect(client.isConnected).toBe(true)
    expect(events.includes('sip:connected')).toBe(true)
  })

  afterEach(() => {
    // Restore window
    ;(global as any).window = originalWindow
  })
})
