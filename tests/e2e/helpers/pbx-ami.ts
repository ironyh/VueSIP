/**
 * Shared raw-AMI helpers for the real-PBX e2e specs.
 *
 * These talk straight to the Asterisk Manager Interface over TCP, bypassing
 * the library — deliberately: they are independent witnesses of what the PBX
 * actually did, which is what makes the Nivå 4/5 specs deterministic.
 */

import { Socket } from 'node:net'

export interface PbxEnv {
  amiHost: string
  amiPort: number
  amiUser: string
  amiSecret: string
  wsUrl: string
  sipDomain: string
  sipUser: string
  sipPassword: string
  amiWsUrl: string
}

/** Parse VUESIP_TEST_* env vars; returns null when the suite should self-skip. */
export function loadPbxEnv(): PbxEnv | null {
  const amiPortRaw = process.env.VUESIP_TEST_AMI_PORT
  const env = {
    amiHost: process.env.VUESIP_TEST_AMI_HOST,
    amiPort: amiPortRaw ? parseInt(amiPortRaw) : undefined,
    amiUser: process.env.VUESIP_TEST_AMI_USER,
    amiSecret: process.env.VUESIP_TEST_AMI_SECRET,
    wsUrl: process.env.VUESIP_TEST_WS_URL,
    sipDomain: process.env.VUESIP_TEST_SIP_DOMAIN,
    sipUser: process.env.VUESIP_TEST_SIP_USER,
    sipPassword: process.env.VUESIP_TEST_SIP_PASSWORD,
    amiWsUrl: process.env.VUESIP_TEST_AMI_WS_URL,
  } as PbxEnv | Record<string, undefined>

  const required: (keyof PbxEnv)[] = [
    'amiHost',
    'amiPort',
    'amiUser',
    'amiSecret',
    'wsUrl',
    'sipDomain',
    'sipUser',
    'sipPassword',
    'amiWsUrl',
  ]
  for (const key of required) {
    if (!env[key]) return null
  }
  return env as PbxEnv
}

/** Minimal raw-AMI helper for Originate (mirrors AmiTestClient's wire format). */
export function amiOriginate(opts: {
  host: string
  port: number
  user: string
  secret: string
  channel: string
  context: string
  exten: string
  callerId: string
  actionId: string
}): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const sock = new Socket()
    let buf = ''
    let resolved = false
    const finish = (r: { success: boolean; message: string }) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      try {
        sock.end()
      } catch {
        /* ignore */
      }
      resolve(r)
    }
    const timer = setTimeout(() => {
      finish({ success: false, message: 'Originate timeout' })
    }, 10000)

    sock.connect(opts.port, opts.host, () => {
      const send = (s: string) => sock.write(s + '\r\n')
      send(`Action: Login`)
      send(`Username: ${opts.user}`)
      send(`Secret: ${opts.secret}`)
      send(`Events: off`)
      send(``)
      // The Local channel dials the queue extension directly; CallerID sets
      // the inbound caller's number (see homelab-infra FREEPBX docs).
      send(`Action: Originate`)
      send(`Channel: ${opts.channel}`)
      send(`Context: ${opts.context}`)
      send(`Exten: ${opts.exten}`)
      send(`Priority: 1`)
      send(`CallerID: ${opts.callerId}`)
      send(`Async: true`)
      send(`ActionID: ${opts.actionId}`)
      send(`Timeout: 20000`)
      send(``)
    })
    sock.on('data', (chunk) => {
      buf += chunk.toString()
      let idx: number
      while ((idx = buf.indexOf('\r\n\r\n')) !== -1) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 4)
        const lines = frame.split('\r\n')
        const pkt: Record<string, string> = {}
        for (const l of lines) {
          const ci = l.indexOf(':')
          if (ci !== -1) pkt[l.slice(0, ci).trim()] = l.slice(ci + 1).trim()
        }
        if (pkt.Response === 'Success' && pkt.Message?.includes('Originate')) {
          finish({ success: true, message: pkt.Message })
        } else if (pkt.Response === 'Error' && pkt.ActionID === opts.actionId) {
          finish({ success: false, message: pkt.Message })
        }
      }
    })
    sock.on('error', (err) => {
      if (!resolved) reject(err)
    })
  })
}

/**
 * Poll the queue member's status until it can receive calls (not Paused, not
 * Unavailable). The PJSIP device state lags the SIP registration and static
 * members may be left Paused from prior sessions; injecting a caller before
 * this settles bounces the call out of the queue without ringing the agent.
 */
export function amiWaitForAgentReady(opts: {
  host: string
  port: number
  user: string
  secret: string
  queue: string
  /** Member interface, e.g. "PJSIP/1001". */
  interface: string
  timeoutMs?: number
}): Promise<boolean> {
  const deadline = Date.now() + (opts.timeoutMs ?? 20000)
  const attempt = (): Promise<boolean> =>
    new Promise((resolve) => {
      const sock = new Socket()
      let buf = ''
      let done = false
      const finish = (r: boolean) => {
        if (done) return
        done = true
        clearTimeout(timer)
        try {
          sock.end()
        } catch {
          /* ignore */
        }
        resolve(r)
      }
      const timer = setTimeout(() => finish(false), 5000)
      sock.connect(opts.port, opts.host, () => {
        const send = (s: string) => sock.write(s + '\r\n')
        send(`Action: Login`)
        send(`Username: ${opts.user}`)
        send(`Secret: ${opts.secret}`)
        send(`Events: off`)
        send(``)
        send(`Action: QueueStatus`)
        send(`Queue: ${opts.queue}`)
        send(`ActionID: qs-${Date.now()}`)
        send(``)
      })
      sock.on('data', (chunk) => {
        buf += chunk.toString()
        let idx: number
        while ((idx = buf.indexOf('\r\n\r\n')) !== -1) {
          const frame = buf.slice(0, idx)
          buf = buf.slice(idx + 4)
          const lines = frame.split('\r\n')
          const pkt: Record<string, string> = {}
          for (const l of lines) {
            const ci = l.indexOf(':')
            if (ci !== -1) pkt[l.slice(0, ci).trim()] = l.slice(ci + 1).trim()
          }
          // QueueMember fields (Asterisk 22/FreePBX): Location=PJSIP/1001,
          // Status 3=Unavailable, Paused 0=ready. Both must be clear.
          if (pkt.Event === 'QueueMember' && pkt.Location === opts.interface) {
            finish(pkt.Paused === '0' && pkt.Status !== '3')
          } else if (pkt.Event === 'QueueStatusComplete') {
            finish(false)
          }
        }
      })
      sock.on('error', () => finish(false))
    })

  return (async () => {
    while (Date.now() < deadline) {
      const ready = await attempt()
      if (ready) return true
      await new Promise((r) => setTimeout(r, 1500))
    }
    return false
  })()
}

/**
 * Long-lived AMI event monitor. Opens one connection with Events: on and
 * records every event frame; tests use waitFor(event) as a PBX-side witness
 * (e.g. BridgeEnter proves Asterisk actually bridged media).
 */
export class AmiEventMonitor {
  private sock: Socket | null = null
  private buf = ''
  private events: { event: string; data: Record<string, string> }[] = []
  private connected = false

  connect(opts: { host: string; port: number; user: string; secret: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = new Socket()
      this.sock = sock
      sock.connect(opts.port, opts.host, () => {
        const send = (s: string) => sock.write(s + '\r\n')
        send(`Action: Login`)
        send(`Username: ${opts.user}`)
        send(`Secret: ${opts.secret}`)
        send(`Events: on`)
        send(``)
      })
      sock.on('data', (chunk) => {
        this.buf += chunk.toString()
        let idx: number
        while ((idx = this.buf.indexOf('\r\n\r\n')) !== -1) {
          const frame = this.buf.slice(0, idx)
          this.buf = this.buf.slice(idx + 4)
          const pkt: Record<string, string> = {}
          for (const l of frame.split('\r\n')) {
            const ci = l.indexOf(':')
            if (ci !== -1) pkt[l.slice(0, ci).trim()] = l.slice(ci + 1).trim()
          }
          if (pkt.Response === 'Success' && pkt.Message === 'Authentication accepted') {
            this.connected = true
            resolve()
          } else if (pkt.Event) {
            this.events.push({ event: pkt.Event, data: pkt })
          }
        }
      })
      sock.on('error', (err) => {
        if (!this.connected) reject(err)
      })
    })
  }

  /** All captured events of a given name. */
  of(event: string): { event: string; data: Record<string, string> }[] {
    return this.events.filter((e) => e.event === event)
  }

  /**
   * Resolve as soon as at least one matching event has been captured
   * (checks already-captured events first, then polls).
   */
  async waitFor(event: string, timeoutMs = 20000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (this.of(event).length > 0) return true
      await new Promise((r) => setTimeout(r, 250))
    }
    return this.of(event).length > 0
  }

  close(): void {
    try {
      this.sock?.end()
    } catch {
      /* ignore */
    }
    this.sock = null
    this.connected = false
  }
}
