/**
 * Type definitions for JsSIP 3.x
 * @packageDocumentation
 */

declare module 'jssip' {
  import { EventEmitter } from 'events'

  // Use any for Socket to avoid conflicts with internal lib/Socket type resolution
  export type Socket = any

  export class WebSocketInterface {
    constructor(url: string)
    connect(): void
    disconnect(): void
    isConnected(): boolean
  }

  export interface UAConfiguration {
    sockets: Socket | Socket[]
    uri: string
    password?: string
    display_name?: string
    authorization_user?: string
    register?: boolean
    register_expires?: number
    registrar_server?: string
    session_timers?: boolean
    use_preloaded_route?: boolean
    connection_recovery_min_interval?: number
    connection_recovery_max_interval?: number
    [key: string]: any
  }

  export interface CallOptions {
    mediaConstraints?: {
      audio: boolean
      video: boolean
    }
    mediaStream?: MediaStream
    extraHeaders?: string[]
    anonymous?: boolean
    rtcOfferConstraints?: any
    [key: string]: any
  }

  export class URI {
    constructor(scheme: string, user: string, host: string, port?: number, parameters?: any, headers?: any)
    toAor(show_port?: boolean): string
    toString(): string
    clone(): URI
    user: string
    host: string
    port?: number
    scheme: string
    setHeader(name: string, value: string): void
    getHeader(name: string): string | undefined
    hasHeader(name: string): boolean
    setParam(key: string, value: string): void
    getParam(key: string): string | undefined
    hasParam(key: string): boolean
    deleteParam(key: string): void
    clearParams(): void
  }

  export class NameAddrHeader {
    constructor(uri: URI, display_name?: string, parameters?: any)
    uri: URI
    display_name?: string
  }

  export class RTCSession extends EventEmitter {
    constructor(ua: UA)
    
    // Properties
    id: string
    data: any
    direction: 'incoming' | 'outgoing'
    local_identity: NameAddrHeader
    remote_identity: NameAddrHeader
    start_time?: Date
    end_time?: Date
    connection: RTCPeerConnection

    // Methods
    answer(options?: any): void
    terminate(options?: any): void
    sendDTMF(tone: string | number, options?: any): void
    sendInfo(contentType: string, body?: string, options?: any): void
    hold(options?: any, done?: () => void): boolean
    unhold(options?: any, done?: () => void): boolean
    mute(options?: { audio?: boolean, video?: boolean }): void
    unmute(options?: { audio?: boolean, video?: boolean }): void
    renegotiate(options?: any, done?: () => void): boolean
    isOnHold(): { local: boolean, remote: boolean }
    isMuted(): { audio: boolean, video: boolean }
    
    // Events
    on(event: 'peerconnection', listener: (data: { peerconnection: RTCPeerConnection }) => void): this
    on(event: 'connecting' | 'sending' | 'progress' | 'accepted' | 'confirmed' | 'ended' | 'failed' | 'refer' | 'replaces' | 'icecandidate' | 'getusermediafailed' | 'muted' | 'unmuted' | 'hold' | 'unhold' | 'renegotiation' | 'sdp', listener: (data: any) => void): this
    on(event: 'newDTMF', listener: (data: { originator: 'local' | 'remote', dtmf: any, request: any }) => void): this
    on(event: 'newInfo', listener: (data: { originator: 'local' | 'remote', info: any, request: any }) => void): this
  }

  export class Message extends EventEmitter {
    constructor(ua: UA)
    
    // Properties
    direction: 'incoming' | 'outgoing'
    local_identity: NameAddrHeader
    remote_identity: NameAddrHeader
    
    // Methods
    accept(options?: any): void
    reject(options?: any): void
    send(target: string, body: string, options?: any): void
    
    // Events
    on(event: 'succeeded' | 'failed', listener: (data: { originator: 'local' | 'remote', response: any }) => void): this
  }

  // IncomingRequest/IncomingResponse roughly
  export interface IncomingRequest {
    method: string
    ruri: URI
    headers: any
    body: string
    reply(code: number, reason?: string, extraHeaders?: string[], body?: string): void
  }

  export class UA extends EventEmitter {
    constructor(configuration: UAConfiguration)
    
    // Properties
    configuration: UAConfiguration
    
    // Methods
    start(): void
    stop(): void
    register(): void
    unregister(options?: { all?: boolean }): void
    registrator(): { setExtraHeaders(headers: string[]): void }
    call(target: string, options?: CallOptions): RTCSession
    sendMessage(target: string, body: string, options?: any): Message
    isRegistered(): boolean
    isConnected(): boolean
    
    // Events
    on(event: 'connected' | 'disconnected' | 'registered' | 'unregistered' | 'registrationFailed' | 'registrationExpiring', listener: (data: any) => void): this
    // 'connecting' added as commonly supported or observed in logs, but 'connected' is standard
    // Some versions emit 'connecting' during connection attempt?
    // Based on error report: "Argument of type '"connecting"' is not assignable to parameter of type..."
    on(event: 'connecting', listener: (data: any) => void): this
    on(event: 'newRTCSession', listener: (data: { originator: 'local' | 'remote', session: RTCSession, request: IncomingRequest }) => void): this
    on(event: 'newMessage', listener: (data: { originator: 'local' | 'remote', message: Message, request: IncomingRequest }) => void): this
    on(event: 'sipEvent', listener: (data: { event: any, request: IncomingRequest }) => void): this
  }

  export const version: string
  export const name: string
  
  // Debug
  export interface Debug {
    (name: string): any
    enable(namespaces: string): void
    disable(): void
  }
  export const debug: Debug
}
