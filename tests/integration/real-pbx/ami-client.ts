/**
 * Minimal AMI (Asterisk Manager Interface) client for integration tests.
 *
 * Speaks the raw AMI protocol over TCP: CRLF-delimited Key: Value lines,
 * blank-line frame terminator. Dependency-free on purpose — pulls in nothing
 * beyond Node `net`, so the test suite is a faithful wire-level check.
 *
 * Not intended for production use; there is no auto-reconnect, multi-line
 * value unfolding, or CommandResponse list handling beyond what the tests
 * need today.
 */

import { Socket } from 'node:net'
import { randomUUID } from 'node:crypto'

export type AmiFrame = Record<string, string>

export interface AmiClientOptions {
  host: string
  port: number
  connectTimeoutMs?: number
  responseTimeoutMs?: number
}

interface PendingAction {
  actionId: string
  resolve: (frames: AmiFrame[]) => void
  reject: (err: Error) => void
  frames: AmiFrame[]
  expectEventList?: boolean
  timer: NodeJS.Timeout
}

const CRLF = '\r\n'
const FRAME_END = '\r\n\r\n'

const parseFrame = (raw: string): AmiFrame => {
  const frame: AmiFrame = {}
  for (const line of raw.split(CRLF)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key) frame[key] = value
  }
  return frame
}

export class AmiTestClient {
  private socket: Socket | null = null
  private buffer = ''
  private banner: string | null = null
  private readonly opts: Required<AmiClientOptions>
  private readonly pending = new Map<string, PendingAction>()

  constructor(opts: AmiClientOptions) {
    this.opts = {
      connectTimeoutMs: 5000,
      responseTimeoutMs: 5000,
      ...opts,
    }
  }

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new Socket()
      this.socket = socket
      const timer = setTimeout(() => {
        socket.destroy()
        reject(new Error(`AMI connect timed out after ${this.opts.connectTimeoutMs}ms`))
      }, this.opts.connectTimeoutMs)

      socket.once('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      socket.connect(this.opts.port, this.opts.host, () => {
        socket.setEncoding('utf8')
        socket.on('data', (chunk: string) => this.handleData(chunk, resolve, timer))
        socket.on('close', () => this.handleClose())
      })
    })
  }

  private handleData(
    chunk: string,
    bannerResolve?: (banner: string) => void,
    bannerTimer?: NodeJS.Timeout,
  ): void {
    this.buffer += chunk
    // Banner is a single CRLF-terminated line before any frame separator.
    if (this.banner === null) {
      const nl = this.buffer.indexOf(CRLF)
      if (nl !== -1) {
        this.banner = this.buffer.slice(0, nl)
        this.buffer = this.buffer.slice(nl + CRLF.length)
        if (bannerTimer) clearTimeout(bannerTimer)
        if (bannerResolve) bannerResolve(this.banner)
      }
    }
    while (true) {
      const end = this.buffer.indexOf(FRAME_END)
      if (end === -1) break
      const raw = this.buffer.slice(0, end)
      this.buffer = this.buffer.slice(end + FRAME_END.length)
      this.dispatchFrame(parseFrame(raw))
    }
  }

  private dispatchFrame(frame: AmiFrame): void {
    const actionId = frame.ActionID
    if (!actionId) return
    const pending = this.pending.get(actionId)
    if (!pending) return
    pending.frames.push(frame)

    if (pending.expectEventList) {
      const listType = (frame.EventList ?? '').toLowerCase()
      if (listType === 'complete' || frame.Event === 'EndpointList Complete') {
        this.completePending(pending)
      }
      return
    }

    if (frame.Response) {
      this.completePending(pending)
    }
  }

  private completePending(pending: PendingAction): void {
    clearTimeout(pending.timer)
    this.pending.delete(pending.actionId)
    pending.resolve(pending.frames)
  }

  private handleClose(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('AMI socket closed before response'))
    }
    this.pending.clear()
  }

  action(
    fields: Record<string, string>,
    options: { expectEventList?: boolean } = {},
  ): Promise<AmiFrame[]> {
    if (!this.socket) return Promise.reject(new Error('AMI not connected'))
    const actionId = fields.ActionID ?? randomUUID()
    const payload = Object.entries({ ...fields, ActionID: actionId })
      .map(([k, v]) => `${k}: ${v}`)
      .join(CRLF) + FRAME_END
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(actionId)
        reject(new Error(`AMI action '${fields.Action}' timed out`))
      }, this.opts.responseTimeoutMs)
      this.pending.set(actionId, {
        actionId,
        resolve,
        reject,
        frames: [],
        expectEventList: options.expectEventList,
        timer,
      })
      this.socket!.write(payload, 'utf8', (err) => {
        if (err) {
          clearTimeout(timer)
          this.pending.delete(actionId)
          reject(err)
        }
      })
    })
  }

  getBanner(): string | null {
    return this.banner
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve()
      this.socket.once('close', () => resolve())
      this.socket.end()
    })
  }
}
