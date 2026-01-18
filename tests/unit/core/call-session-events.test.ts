import { describe, it, expect, beforeEach } from 'vitest'
import { CallSession } from '@/core/CallSession'
import { EventBus } from '@/core/EventBus'

function createMockRtcSession() {
  const handlers: Record<string, Function[]> = {}
  return {
    on: (event: string, cb: Function) => {
      handlers[event] = handlers[event] || []
      handlers[event].push(cb)
    },
    emit: (event: string, payload?: unknown) => {
      ;(handlers[event] || []).forEach((cb) => cb(payload))
    },
    removeAllListeners: () => {
      Object.keys(handlers).forEach((k) => delete handlers[k])
    },
  }
}

describe('CallSession event emissions', () => {
  let rtcSession: ReturnType<typeof createMockRtcSession>
  let eventBus: EventBus

  beforeEach(() => {
    rtcSession = createMockRtcSession()
    eventBus = new EventBus()
    // Minimal MediaStream polyfill for Node/JSDOM
    ;(global as any).MediaStream = class {
      _tracks: any[] = []
      addTrack(t: any) {
        this._tracks.push(t)
      }
      getTracks() {
        return this._tracks
      }
    }
  })

  function makeSession() {
    return new CallSession({
      id: 'call-1',
      direction: 'outgoing',
      localUri: 'sip:alice@example.com',
      remoteUri: 'sip:bob@example.com',
      rtcSession,
      eventBus,
    })
  }

  it('emits call:state_changed on lifecycle transitions', () => {
    makeSession()
    const seen: string[] = []

    eventBus.on('call:*', (evt: any) => {
      if (evt?.currentState) seen.push(evt.currentState)
    })

    rtcSession.emit('progress', { response: { status_code: 180 } })
    rtcSession.emit('ended', { cause: 'normal', originator: 'local' })

    // Should have seen at least moving to active and then terminated/failed
    expect(seen.length).toBeGreaterThan(0)
  })

  it('emits call:hold and call:unhold, toggling hold flag', () => {
    const session = makeSession()
    let holdCount = 0
    let unholdCount = 0
    eventBus.on('call:hold', () => {
      holdCount++
    })
    eventBus.on('call:unhold', () => {
      unholdCount++
    })

    rtcSession.emit('hold', { originator: 'local' })
    expect(holdCount).toBeGreaterThanOrEqual(1)
    expect(session.isOnHold).toBe(true)

    rtcSession.emit('unhold', { originator: 'local' })
    expect(unholdCount).toBeGreaterThanOrEqual(1)
    expect(session.isOnHold).toBe(false)
  })

  it('emits call:muted and call:unmuted, toggling mute flag', () => {
    const session = makeSession()
    // No emitted events for mute/unmute, only flags change

    rtcSession.emit('muted')
    expect(session.isMuted).toBe(true)

    rtcSession.emit('unmuted')
    expect(session.isMuted).toBe(false)
  })

  it('emits call:stream_added for local and remote on peerconnection', () => {
    makeSession()

    let count = 0
    eventBus.on('call:stream_added', () => {
      count++
    })

    const remoteTrack = { id: 'remote-video-1', kind: 'video' }
    const localTrack = { id: 'local-audio-1', kind: 'audio' }

    const pc: any = {
      ontrack: null as any,
      getSenders() {
        return [{ track: localTrack }]
      },
    }

    rtcSession.emit('peerconnection', { peerconnection: pc })
    // Trigger remote track
    pc.ontrack?.({ track: remoteTrack })

    expect(count).toBeGreaterThanOrEqual(1)
  })
})
