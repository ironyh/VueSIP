/**
 * Type definitions index
 * Export all type definitions from a single entry point
 * @packageDocumentation
 */

// Config types
export * from './config.types'

// Called identity (multi-DID)
export * from './called-identity.types'

// SIP types
export * from './sip.types'

// Call types
export * from './call.types'

// Media types
export * from './media.types'

// Event types
export * from './events.types'

// Transfer types
export * from './transfer.types'

// Presence types
export * from './presence.types'

// Messaging types
export * from './messaging.types'

// Conference types
export * from './conference.types'

// Participant controls types
export * from './participant-controls.types'

// History types
export * from './history.types'

// Storage types
export * from './storage.types'

// Provider types
export * from './provider.types'

// Plugin types
export * from './plugin.types'

// OAuth2 types
export * from './oauth.types'

// Local recording types
export * from './local-recording.types'

// Session persistence types
export * from './session-persistence.types'

// Connection recovery types
export * from './connection-recovery.types'

// Transcription types
export * from './transcription.types'

// ConfBridge types (AMI)
export * from './confbridge.types'

// PJSIP types (AMI)
export * from './pjsip.types'

// System types (AMI)
export * from './system.types'

// MWI types (AMI)
export * from './mwi.types'

// Originate types (AMI)
export * from './originate.types'

// Dial strategy types
export * from './dialStrategy.types'

// Re-export 46elks types for convenience
export type {
  Elks46Number,
  Elks46ApiCredentials,
  Elks46Call,
  Elks46CallDirection,
  Elks46CallState,
  Elks46CallLeg,
  FetchCallsOptions,
} from '../providers/services/elks46ApiService'
