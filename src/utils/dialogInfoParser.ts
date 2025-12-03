/**
 * Dialog-Info XML Parser (RFC 4235)
 *
 * Parses SIP dialog-info+xml documents from Asterisk/FreePBX
 * for BLF (Busy Lamp Field) presence monitoring.
 *
 * @module utils/dialogInfoParser
 */

import { DialogState, type DialogStatus } from '../types/presence.types'
import { createLogger } from './logger'

const logger = createLogger('DialogInfoParser')

/**
 * Raw dialog element from XML
 */
interface RawDialog {
  id: string
  callId?: string
  localTag?: string
  remoteTag?: string
  direction?: string
  state: string
  stateCode?: number
  duration?: number
  localIdentity?: string
  localDisplayName?: string
  remoteIdentity?: string
  remoteDisplayName?: string
  localTarget?: string
  remoteTarget?: string
}

/**
 * Parsed dialog-info document
 */
export interface DialogInfoDocument {
  /** Entity URI (the extension being monitored) */
  entity: string
  /** Document version */
  version: number
  /** Document state: full or partial */
  state: 'full' | 'partial'
  /** List of dialogs */
  dialogs: RawDialog[]
}

/**
 * Map RFC 4235 dialog states to DialogState enum
 */
const DIALOG_STATE_MAP: Record<string, DialogState> = {
  // RFC 4235 states
  trying: DialogState.Trying,
  proceeding: DialogState.Trying,
  early: DialogState.Ringing,
  confirmed: DialogState.InCall,
  terminated: DialogState.Idle,

  // Asterisk-specific states (sometimes sent directly)
  ringing: DialogState.Ringing,
  'in-use': DialogState.InCall,
  inuse: DialogState.InCall,
  busy: DialogState.InCall,
  'not-in-use': DialogState.Idle,
  notinuse: DialogState.Idle,
  unavailable: DialogState.Unavailable,
  onhold: DialogState.OnHold,
  'on-hold': DialogState.OnHold,
  idle: DialogState.Idle,
}

/**
 * Parse a dialog-info+xml document
 *
 * @param xml - The XML string to parse
 * @returns Parsed dialog info document or null on error
 */
export function parseDialogInfo(xml: string): DialogInfoDocument | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')

    // Check for parse errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      logger.error('XML parse error:', parseError.textContent)
      return null
    }

    // Get root element - handle namespaced and non-namespaced
    const root =
      doc.querySelector('dialog-info') || doc.getElementsByTagNameNS('urn:ietf:params:xml:ns:dialog-info', 'dialog-info')[0]

    if (!root) {
      logger.error('No dialog-info root element found')
      return null
    }

    // Extract document attributes
    const entity = root.getAttribute('entity') || ''
    const version = parseInt(root.getAttribute('version') || '0', 10)
    const state = (root.getAttribute('state') as 'full' | 'partial') || 'full'

    // Parse all dialog elements
    const dialogElements = root.querySelectorAll('dialog')
    const dialogs: RawDialog[] = []

    dialogElements.forEach((dialogEl) => {
      const dialog = parseDialogElement(dialogEl)
      if (dialog) {
        dialogs.push(dialog)
      }
    })

    return {
      entity,
      version,
      state,
      dialogs,
    }
  } catch (error) {
    logger.error('Failed to parse dialog-info XML:', error)
    return null
  }
}

/**
 * Parse a single dialog element
 */
function parseDialogElement(dialogEl: Element): RawDialog | null {
  try {
    const id = dialogEl.getAttribute('id') || ''
    const callId = dialogEl.getAttribute('call-id') || undefined
    const localTag = dialogEl.getAttribute('local-tag') || undefined
    const remoteTag = dialogEl.getAttribute('remote-tag') || undefined
    const direction = dialogEl.getAttribute('direction') || undefined

    // Get state element
    const stateEl = dialogEl.querySelector('state')
    const state = stateEl?.textContent?.toLowerCase().trim() || 'terminated'
    const stateCodeAttr = stateEl?.getAttribute('code')
    const stateCode = stateCodeAttr ? parseInt(stateCodeAttr, 10) : undefined

    // Get duration if present
    const durationEl = dialogEl.querySelector('duration')
    const duration = durationEl?.textContent ? parseInt(durationEl.textContent, 10) : undefined

    // Get local identity
    const localEl = dialogEl.querySelector('local')
    const localIdentityEl = localEl?.querySelector('identity')
    const localIdentity = localIdentityEl?.textContent || undefined
    const localDisplayName = localIdentityEl?.getAttribute('display') || undefined
    const localTargetEl = localEl?.querySelector('target')
    const localTarget = localTargetEl?.getAttribute('uri') || undefined

    // Get remote identity
    const remoteEl = dialogEl.querySelector('remote')
    const remoteIdentityEl = remoteEl?.querySelector('identity')
    const remoteIdentity = remoteIdentityEl?.textContent || undefined
    const remoteDisplayName = remoteIdentityEl?.getAttribute('display') || undefined
    const remoteTargetEl = remoteEl?.querySelector('target')
    const remoteTarget = remoteTargetEl?.getAttribute('uri') || undefined

    return {
      id,
      callId,
      localTag,
      remoteTag,
      direction,
      state,
      stateCode,
      duration,
      localIdentity,
      localDisplayName,
      remoteIdentity,
      remoteDisplayName,
      localTarget,
      remoteTarget,
    }
  } catch (error) {
    logger.error('Failed to parse dialog element:', error)
    return null
  }
}

/**
 * Convert a raw dialog state string to DialogState enum
 *
 * @param rawState - The state string from the XML
 * @param direction - Optional direction for context
 * @returns Mapped DialogState
 */
export function mapDialogState(rawState: string, direction?: string): DialogState {
  const normalizedState = rawState.toLowerCase().trim()

  // Check direct mapping first
  const mappedState = DIALOG_STATE_MAP[normalizedState]
  if (mappedState !== undefined) {
    return mappedState
  }

  // Handle early state with direction for ringing detection
  if (normalizedState === 'early' && direction === 'recipient') {
    return DialogState.Ringing
  }

  // Unknown state - return Unknown and let caller handle
  logger.debug(`Unknown dialog state: ${rawState}`)
  return DialogState.Unknown
}

/**
 * Convert parsed dialog-info to DialogStatus
 *
 * @param dialogInfo - Parsed dialog info document
 * @returns DialogStatus object
 */
export function dialogInfoToStatus(dialogInfo: DialogInfoDocument): DialogStatus {
  const uri = dialogInfo.entity

  // If no dialogs, extension is idle
  if (dialogInfo.dialogs.length === 0) {
    return {
      uri,
      state: DialogState.Idle,
      lastUpdated: new Date(),
    }
  }

  // Find the most relevant dialog (prefer active over terminated)
  // We know dialogs.length > 0 from the check above, so dialogs[0] exists
  const firstDialog = dialogInfo.dialogs[0]
  const activeDialog = dialogInfo.dialogs.find((d) => d.state !== 'terminated') ?? firstDialog
  if (!activeDialog) {
    // This should never happen since we checked dialogs.length > 0 above
    throw new Error('No dialog found in dialog-info')
  }

  const state = mapDialogState(activeDialog.state, activeDialog.direction)

  return {
    uri,
    state,
    direction: activeDialog.direction as 'initiator' | 'recipient' | undefined,
    remoteIdentity: activeDialog.remoteIdentity,
    remoteDisplayName: activeDialog.remoteDisplayName,
    callId: activeDialog.callId,
    dialogId: activeDialog.id,
    lastUpdated: new Date(),
    rawState: activeDialog.state,
  }
}

/**
 * Parse dialog-info XML and return DialogStatus directly
 *
 * @param xml - The XML string to parse
 * @param fallbackUri - Fallback URI if not in XML
 * @returns DialogStatus or null on error
 */
export function parseDialogInfoToStatus(xml: string, fallbackUri?: string): DialogStatus | null {
  const dialogInfo = parseDialogInfo(xml)

  if (!dialogInfo) {
    return null
  }

  const status = dialogInfoToStatus(dialogInfo)

  // Use fallback URI if entity was empty
  if (!status.uri && fallbackUri) {
    status.uri = fallbackUri
  }

  return status
}

/**
 * Check if two DialogStatus objects have the same state
 * Used for deduplication
 *
 * @param a - First status
 * @param b - Second status
 * @returns True if states are equal
 */
export function areDialogStatesEqual(a: DialogStatus | undefined, b: DialogStatus | undefined): boolean {
  if (!a || !b) return false
  return a.state === b.state && a.direction === b.direction && a.remoteIdentity === b.remoteIdentity
}
