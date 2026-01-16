/**
 * JsSIP Call Session Adapter
 *
 * Wraps a JsSIP RTCSession to implement the standardized ICallSession interface.
 */

import type { RTCSession } from 'jssip'
import { EventEmitter } from '../../utils/EventEmitter'
import type {
  ICallSession,
  AnswerOptions,
  DTMFOptions,
  RenegotiateOptions,
  CallStatistics,
  CallSessionEvents,
} from '../types'
import { CallDirection, CallState } from '../../types/call.types'

/**
 * JsSIP Call Session Implementation
 *
 * Adapts JsSIP's RTCSession to the unified ICallSession interface.
 */
export class JsSipCallSession extends EventEmitter<CallSessionEvents> implements ICallSession {
  private session: RTCSession
  private _state: CallState = CallState.Idle
  private _startTime: Date | null = null
  private _endTime: Date | null = null
  private _isOnHold = false
  private _isMuted = false
  private _localStream: MediaStream | null = null
  private _remoteStream: MediaStream | null = null

  private _codecPolicy: import('../../codecs/types').CodecPolicy | undefined

  constructor(session: RTCSession, codecPolicy?: import('../../codecs/types').CodecPolicy) {
    super()
    this.session = session
    this._codecPolicy = codecPolicy
    this.setupEventHandlers()
    this.initializeState()
  }

  // ========== Read-only Properties ==========

  get id(): string {
    return this.session.id
  }

  get direction(): CallDirection {
    return this.session.direction === 'incoming' ? CallDirection.Incoming : CallDirection.Outgoing
  }

  get state(): CallState {
    return this._state
  }

  get remoteUri(): string {
    return this.session.remote_identity?.uri?.toString() ?? ''
  }

  get remoteDisplayName(): string | null {
    return this.session.remote_identity?.display_name ?? null
  }

  get startTime(): Date | null {
    return this._startTime
  }

  get endTime(): Date | null {
    return this._endTime
  }

  get duration(): number {
    if (!this._startTime) return 0
    const end = this._endTime ?? new Date()
    return Math.floor((end.getTime() - this._startTime.getTime()) / 1000)
  }

  get localStream(): MediaStream | null {
    return this._localStream
  }

  get remoteStream(): MediaStream | null {
    return this._remoteStream
  }

  get isOnHold(): boolean {
    return this._isOnHold
  }

  get isMuted(): boolean {
    return this._isMuted
  }

  // ========== Call Control Methods ==========

  async answer(options?: AnswerOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const jssipOptions: Record<string, unknown> = {}

        if (options?.mediaConstraints) {
          jssipOptions.mediaConstraints = options.mediaConstraints
        }

        // Pass pre-acquired mediaStream if provided (takes precedence over mediaConstraints)
        if (options?.mediaStream) {
          jssipOptions.mediaStream = options.mediaStream
          console.log('[JsSipCallSession] Using pre-acquired mediaStream for answer')
        }

        if (options?.extraHeaders) {
          jssipOptions.extraHeaders = options.extraHeaders
        }

        if (options?.pcConfig) {
          jssipOptions.pcConfig = options.pcConfig
        }

        // Allow per-call codec policy override on answer
        if (options?.codecPolicy) {
          this._codecPolicy = options.codecPolicy
        }

        this.session.answer(jssipOptions)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  async reject(statusCode = 486): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.session.terminate({
          status_code: statusCode,
          reason_phrase: this.getReasonPhrase(statusCode),
        })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  async terminate(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.session.terminate()
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  async hold(): Promise<void> {
    return new Promise((resolve, reject) => {
      const result = this.session.hold({}, () => {
        this._isOnHold = true
        resolve()
      })

      if (!result) {
        reject(new Error('Hold operation failed'))
      }
    })
  }

  async unhold(): Promise<void> {
    return new Promise((resolve, reject) => {
      const result = this.session.unhold({}, () => {
        this._isOnHold = false
        resolve()
      })

      if (!result) {
        reject(new Error('Unhold operation failed'))
      }
    })
  }

  async mute(): Promise<void> {
    return new Promise((resolve) => {
      this.session.mute({ audio: true })
      this._isMuted = true
      resolve()
    })
  }

  async unmute(): Promise<void> {
    return new Promise((resolve) => {
      this.session.unmute({ audio: true })
      this._isMuted = false
      resolve()
    })
  }

  async sendDTMF(tone: string, options?: DTMFOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const jssipOptions: Record<string, unknown> = {}

        if (options?.duration) {
          jssipOptions.duration = options.duration
        }

        if (options?.interToneGap) {
          jssipOptions.interToneGap = options.interToneGap
        }

        if (options?.transport) {
          jssipOptions.transportType = options.transport
        }

        this.session.sendDTMF(tone, jssipOptions)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  async transfer(target: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // JsSIP uses refer for transfers
        const session = this.session as RTCSession & {
          refer?: (target: string, options?: unknown) => void
        }
        if (typeof session.refer === 'function') {
          session.refer(target)
          resolve()
        } else {
          reject(new Error('Transfer not supported by this session'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async attendedTransfer(target: ICallSession): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For attended transfer, we need the underlying JsSIP session
        const targetSession = target as JsSipCallSession
        const session = this.session as RTCSession & {
          refer?: (target: string, options?: unknown) => void
        }

        if (typeof session.refer === 'function') {
          // Use Replaces header for attended transfer
          session.refer(targetSession.remoteUri, {
            extraHeaders: [`Replaces: ${targetSession.id}`],
          })
          resolve()
        } else {
          reject(new Error('Attended transfer not supported by this session'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async renegotiate(options?: RenegotiateOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const jssipOptions: Record<string, unknown> = {}

      if (options?.mediaConstraints) {
        jssipOptions.rtcOfferConstraints = options.mediaConstraints
      }

      if (options?.useUpdate) {
        jssipOptions.useUpdate = options.useUpdate
      }

      const result = this.session.renegotiate(jssipOptions, () => {
        resolve()
      })

      if (!result) {
        reject(new Error('Renegotiation failed'))
      }
    })
  }

  async getStats(): Promise<CallStatistics> {
    const pc = this.session.connection
    if (!pc) {
      return {}
    }

    try {
      const stats = await pc.getStats()
      const result: CallStatistics = {}

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          result.audio = {
            bytesSent: 0,
            bytesReceived: report.bytesReceived ?? 0,
            packetsSent: 0,
            packetsReceived: report.packetsReceived ?? 0,
            packetsLost: report.packetsLost ?? 0,
            jitter: (report.jitter ?? 0) * 1000, // Convert to ms
            roundTripTime: 0,
            bitrate: 0,
          }
        }

        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          if (result.audio) {
            result.audio.bytesSent = report.bytesSent ?? 0
            result.audio.packetsSent = report.packetsSent ?? 0
          }
        }

        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          result.video = {
            bytesSent: 0,
            bytesReceived: report.bytesReceived ?? 0,
            packetsSent: 0,
            packetsReceived: report.packetsReceived ?? 0,
            packetsLost: report.packetsLost ?? 0,
            frameRate: report.framesPerSecond ?? 0,
            resolution: {
              width: report.frameWidth ?? 0,
              height: report.frameHeight ?? 0,
            },
            bitrate: 0,
          }
        }

        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          result.connection = {
            localCandidateType: report.localCandidateType ?? 'unknown',
            remoteCandidateType: report.remoteCandidateType ?? 'unknown',
            availableOutgoingBitrate: report.availableOutgoingBitrate ?? 0,
            availableIncomingBitrate: report.availableIncomingBitrate ?? 0,
          }
        }
      })

      return result
    } catch {
      return {}
    }
  }

  // ========== Private Methods ==========

  private initializeState(): void {
    // Set initial state based on session direction
    if (this.session.direction === 'incoming') {
      this._state = CallState.Ringing
    } else {
      this._state = CallState.Calling
    }

    // Sync hold/mute state
    const holdState = this.session.isOnHold()
    this._isOnHold = holdState.local || holdState.remote

    const muteState = this.session.isMuted()
    this._isMuted = muteState.audio
  }

  private setupEventHandlers(): void {
    // Progress (180 Ringing, 183 Session Progress)
    this.session.on(
      'progress',
      (data: { originator: string; response?: { status_code: number; reason_phrase: string } }) => {
        if (data.originator === 'remote') {
          this._state = CallState.Ringing
        }
        this.emit('progress', {
          statusCode: data.response?.status_code ?? 0,
          reasonPhrase: data.response?.reason_phrase ?? '',
        })
      }
    )

    // Accepted (2xx response)
    this.session.on('accepted', () => {
      this._state = CallState.Active
      this._startTime = new Date()
      this.emit('accepted', undefined)
    })

    // Confirmed (ACK received/sent)
    this.session.on('confirmed', () => {
      this._state = CallState.Active
      if (!this._startTime) {
        this._startTime = new Date()
      }
      this.emit('confirmed', undefined)
    })

    // Ended (BYE)
    this.session.on(
      'ended',
      (data: { originator: string; cause: string; message?: { status_code?: number } }) => {
        console.log('[JsSipCallSession] Call ended:', {
          originator: data.originator,
          cause: data.cause,
          statusCode: data.message?.status_code,
        })
        this._state = CallState.Terminated
        this._endTime = new Date()
        this.emit('ended', {
          cause: data.cause,
          statusCode: data.message?.status_code,
        })
      }
    )

    // Failed
    this.session.on(
      'failed',
      (data: { originator: string; cause: string; message?: { status_code?: number } }) => {
        console.error('[JsSipCallSession] Call failed:', {
          originator: data.originator,
          cause: data.cause,
          statusCode: data.message?.status_code,
        })
        this._state = CallState.Failed
        this._endTime = new Date()
        this.emit('failed', {
          cause: data.cause,
          statusCode: data.message?.status_code,
        })
      }
    )

    // Hold/Unhold
    this.session.on('hold', (data: { originator: string }) => {
      if (data.originator === 'local') {
        this._isOnHold = true
        this._state = CallState.Held
      } else {
        this._state = CallState.RemoteHeld
      }
      this.emit('hold', undefined)
    })

    this.session.on('unhold', (data: { originator: string }) => {
      if (data.originator === 'local') {
        this._isOnHold = false
      }
      this._state = CallState.Active
      this.emit('unhold', undefined)
    })

    // Mute/Unmute
    this.session.on('muted', () => {
      this._isMuted = true
      this.emit('muted', undefined)
    })

    this.session.on('unmuted', () => {
      this._isMuted = false
      this.emit('unmuted', undefined)
    })

    // DTMF
    this.session.on('newDTMF', (data: { originator: string; dtmf: { tone: string } }) => {
      this.emit('dtmf', { tone: data.dtmf.tone })
    })

    // PeerConnection for media streams
    this.session.on('peerconnection', (data: { peerconnection: RTCPeerConnection }) => {
      const pc = data.peerconnection

      // Handle local stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this._remoteStream = event.streams[0]
          this.emit('remoteStream', { stream: event.streams[0] })
        }
      }

      // ICE connection state
      pc.oniceconnectionstatechange = () => {
        this.emit('iceConnectionStateChange', { state: pc.iceConnectionState })
      }

      pc.onicegatheringstatechange = () => {
        this.emit('iceGatheringStateChange', { state: pc.iceGatheringState })
      }

      pc.onsignalingstatechange = () => {
        this.emit('signalingStateChange', { state: pc.signalingState })
      }

      // Get local stream from senders
      const senders = pc.getSenders()
      const audioSender = senders.find((s) => s.track?.kind === 'audio')
      const videoSender = senders.find((s) => s.track?.kind === 'video')

      if (audioSender?.track || videoSender?.track) {
        const tracks: MediaStreamTrack[] = []
        if (audioSender?.track) tracks.push(audioSender.track)
        if (videoSender?.track) tracks.push(videoSender.track)
        this._localStream = new MediaStream(tracks)
        this.emit('localStream', { stream: this._localStream })
      }

      // Apply codec preferences via transceivers when available
      try {
        const transceivers = typeof pc.getTransceivers === 'function' ? pc.getTransceivers() : []
        if (transceivers && transceivers.length > 0) {
          const { useCodecs } =
            require('../../codecs/useCodecs') as typeof import('../../codecs/useCodecs')
          const codecs = useCodecs(this._codecPolicy)
          for (const t of transceivers) {
            const kind = (t.sender?.track?.kind ?? t.receiver?.track?.kind) as
              | 'audio'
              | 'video'
              | undefined
            if (kind === 'audio' || kind === 'video') {
              codecs.applyToTransceiver(t as unknown as RTCRtpTransceiver, kind)
            }
          }
        }
      } catch {
        // Best effort; skip if environment doesn't support
      }
    })

    // Refer (transfer)
    this.session.on(
      'refer',
      (data: { request: { getHeader: (name: string) => string | undefined } }) => {
        const referTo = data.request.getHeader('Refer-To')
        if (referTo) {
          this.emit('referred', { target: referTo })
        }
      }
    )
  }

  private getReasonPhrase(statusCode: number): string {
    const reasons: Record<number, string> = {
      486: 'Busy Here',
      480: 'Temporarily Unavailable',
      603: 'Decline',
      487: 'Request Terminated',
    }
    return reasons[statusCode] ?? 'Unknown'
  }
}
