/**
 * DTMF Type Definitions
 *
 * Type definitions for Dual-Tone Multi-Frequency (DTMF) signaling support
 * following RFC 2833 and SIP INFO specifications.
 */

/**
 * DTMF transmission method
 */
export type DTMFMethod = 'rfc2833' | 'sipinfo' | 'inband';

/**
 * Valid DTMF tone characters
 * - Digits: 0-9
 * - Special: * (star), # (pound/hash)
 * - Extended: A-D (rarely used)
 */
export type DTMFTone = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '*' | '#' | 'A' | 'B' | 'C' | 'D';

/**
 * DTMF options for tone transmission
 */
export interface DTMFOptions {
  /**
   * Method to use for DTMF transmission
   * @default 'rfc2833'
   */
  method?: DTMFMethod;

  /**
   * Duration of each tone in milliseconds
   * RFC 2833: typically 100-250ms
   * @default 160
   */
  duration?: number;

  /**
   * Gap between tones in milliseconds
   * RFC 2833: typically 50-70ms
   * @default 70
   */
  interToneGap?: number;

  /**
   * Enable local audio feedback for sent tones
   * @default false
   */
  audioFeedback?: boolean;
}

/**
 * Result of a DTMF send operation
 */
export interface DTMFSendResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Method used for transmission
   */
  method: DTMFMethod;

  /**
   * Tones that were sent
   */
  tones: string;

  /**
   * Error message if unsuccessful
   */
  error?: string;

  /**
   * Timestamp when tones were sent
   */
  timestamp: Date;
}

/**
 * DTMF event emitted during tone transmission
 */
export interface DTMFEvent {
  /**
   * Type of event
   */
  type: 'start' | 'tone' | 'end' | 'error';

  /**
   * Current tone being sent (for 'tone' events)
   */
  tone?: DTMFTone;

  /**
   * Method being used
   */
  method?: DTMFMethod;

  /**
   * Error message (for 'error' events)
   */
  error?: string;

  /**
   * Event timestamp
   */
  timestamp: Date;
}

/**
 * DTMF capability information
 */
export interface DTMFCapabilities {
  /**
   * Supported DTMF methods
   */
  supportedMethods: DTMFMethod[];

  /**
   * Whether RFC 2833 is negotiated in SDP
   */
  rfc2833Enabled: boolean;

  /**
   * Whether SIP INFO is supported
   */
  sipInfoEnabled: boolean;

  /**
   * Whether inband audio is available
   */
  inbandEnabled: boolean;

  /**
   * Preferred method based on negotiation
   */
  preferredMethod: DTMFMethod;
}

/**
 * DTMF queue item
 */
export interface DTMFQueueItem {
  /**
   * Tone to send
   */
  tone: DTMFTone;

  /**
   * Options for this tone
   */
  options: Required<DTMFOptions>;

  /**
   * Promise resolver for completion
   */
  resolve: (result: DTMFSendResult) => void;

  /**
   * Promise rejector for errors
   */
  reject: (error: Error) => void;
}

/**
 * DTMF state information
 */
export interface DTMFState {
  /**
   * Whether DTMF is currently being sent
   */
  isSending: boolean;

  /**
   * Current tone being sent
   */
  currentTone: DTMFTone | null;

  /**
   * Number of tones in queue
   */
  queueLength: number;

  /**
   * Last send result
   */
  lastResult: DTMFSendResult | null;

  /**
   * Current capabilities
   */
  capabilities: DTMFCapabilities | null;
}

/**
 * RFC 2833 event codes mapping
 */
export const RFC2833_EVENT_CODES: Record<DTMFTone, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '*': 10,
  '#': 11,
  'A': 12,
  'B': 13,
  'C': 14,
  'D': 15,
};

/**
 * DTMF configuration constants
 */
export const DTMF_CONSTANTS = {
  /**
   * Default tone duration in milliseconds
   */
  DEFAULT_DURATION: 160,

  /**
   * Default inter-tone gap in milliseconds
   */
  DEFAULT_INTER_TONE_GAP: 70,

  /**
   * Minimum tone duration for reliable detection
   */
  MIN_DURATION: 40,

  /**
   * Maximum tone duration
   */
  MAX_DURATION: 6000,

  /**
   * Minimum inter-tone gap
   */
  MIN_INTER_TONE_GAP: 50,

  /**
   * Maximum inter-tone gap
   */
  MAX_INTER_TONE_GAP: 500,

  /**
   * RTP payload type for telephone-event (RFC 2833)
   */
  RFC2833_PAYLOAD_TYPE: 101,

  /**
   * SIP INFO content type for DTMF relay
   */
  SIPINFO_CONTENT_TYPE: 'application/dtmf-relay',
} as const;

/**
 * Type guard to check if a character is a valid DTMF tone
 */
export function isDTMFTone(char: string): char is DTMFTone {
  return /^[0-9*#A-D]$/.test(char);
}

/**
 * Validate DTMF tone string
 * @param tones - String of DTMF tones to validate
 * @returns true if all characters are valid DTMF tones
 */
export function validateDTMFTones(tones: string): boolean {
  return tones.length > 0 && tones.split('').every(isDTMFTone);
}

/**
 * Parse DTMF tone string into array of valid tones
 * @param tones - String of DTMF tones
 * @returns Array of valid DTMF tones
 * @throws Error if any character is invalid
 */
export function parseDTMFTones(tones: string): DTMFTone[] {
  const chars = tones.toUpperCase().split('');
  const invalidChars = chars.filter(char => !isDTMFTone(char));

  if (invalidChars.length > 0) {
    throw new Error(`Invalid DTMF characters: ${invalidChars.join(', ')}`);
  }

  return chars as DTMFTone[];
}
