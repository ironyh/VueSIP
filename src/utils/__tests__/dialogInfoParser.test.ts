/**
 * Unit tests for dialogInfoParser
 */

import { describe, it, expect } from 'vitest'
import {
  parseDialogInfo,
  mapDialogState,
  dialogInfoToStatus,
  parseDialogInfoToStatus,
  areDialogStatesEqual,
} from '../dialogInfoParser'
import { DialogState } from '../../types/presence.types'
import type { DialogInfoDocument } from '../dialogInfoParser'
import type { DialogStatus } from '../../types/presence.types'

describe('dialogInfoParser', () => {
  describe('parseDialogInfo', () => {
    it('should parse valid XML dialog-info document', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="sip:100@pbx.example.com" version="1" state="full">
          <dialog id="abc123" call-id="call456" local-tag="local789" remote-tag="remote101" direction="initiator">
            <state>confirmed</state>
            <duration>120</duration>
            <local-identity>
              <display-name>John Doe</display-name>
              <uri>sip:100@pbx.example.com</uri>
            </local-identity>
            <remote-identity>
              <display-name>Jane Smith</display-name>
              <uri>sip:200@pbx.example.com</uri>
            </remote-identity>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).toBeDefined()
      expect(result?.entity).toBe('sip:100@pbx.example.com')
      expect(result?.version).toBe(1)
      expect(result?.state).toBe('full')
      expect(result?.dialogs).toHaveLength(1)
      expect(result?.dialogs[0].id).toBe('abc123')
      expect(result?.dialogs[0].callId).toBe('call456')
      expect(result?.dialogs[0].state).toBe('confirmed')
      expect(result?.dialogs[0].duration).toBe(120)
    })

    it('should return null for invalid XML', () => {
      const invalidXml = '<dialog-info><invalid>'
      const result = parseDialogInfo(invalidXml)
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = parseDialogInfo('')
      expect(result).toBeNull()
    })

    it('should parse even with non-standard namespace (lenient parsing)', () => {
      // The parser is lenient and still returns data even with wrong namespace
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="wrong:namespace" entity="sip:100@pbx.example.com" version="0" state="full">
        </dialog-info>`

      const result = parseDialogInfo(xml)
      // Parser is lenient - it still returns parsed data
      expect(result).toBeDefined()
      expect(result?.entity).toBe('sip:100@pbx.example.com')
    })

    it('should parse dialog with missing optional fields', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="sip:100@pbx.example.com" version="0" state="partial">
          <dialog id="test123">
            <state>trying</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).toBeDefined()
      expect(result?.entity).toBe('sip:100@pbx.example.com')
      expect(result?.dialogs).toHaveLength(1)
      expect(result?.dialogs[0].id).toBe('test123')
      expect(result?.dialogs[0].state).toBe('trying')
      expect(result?.dialogs[0].callId).toBeUndefined()
      expect(result?.dialogs[0].duration).toBeUndefined()
    })

    it('should parse multiple dialogs', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="sip:100@pbx.example.com" version="5" state="full">
          <dialog id="dialog1">
            <state>confirmed</state>
          </dialog>
          <dialog id="dialog2">
            <state>early</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result?.dialogs).toHaveLength(2)
      expect(result?.dialogs[0].id).toBe('dialog1')
      expect(result?.dialogs[1].id).toBe('dialog2')
    })

    it('should parse direction attribute', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="sip:100@pbx.example.com" version="0" state="full">
          <dialog id="test" direction="receiver">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result?.dialogs[0].direction).toBe('receiver')
    })
  })

  describe('mapDialogState', () => {
    it('should map "trying" to trying', () => {
      expect(mapDialogState('trying')).toBe(DialogState.Trying)
    })

    it('should map "ringing" to ringing', () => {
      expect(mapDialogState('ringing')).toBe(DialogState.Ringing)
    })

    it('should map "early" to ringing', () => {
      expect(mapDialogState('early')).toBe(DialogState.Ringing)
    })

    it('should map "early" with recipient direction to ringing', () => {
      expect(mapDialogState('early', 'recipient')).toBe(DialogState.Ringing)
    })

    it('should map "confirmed" to in-call', () => {
      expect(mapDialogState('confirmed')).toBe(DialogState.InCall)
    })

    it('should map "terminated" to idle', () => {
      expect(mapDialogState('terminated')).toBe(DialogState.Idle)
    })

    it('should map unknown state to unknown', () => {
      const invalidState = 'unknown-state' as DialogState
      expect(mapDialogState(invalidState)).toBe(DialogState.Unknown)
    })
  })

  describe('dialogInfoToStatus', () => {
    it('should return idle state when no dialogs exist', () => {
      const doc: DialogInfoDocument = {
        entity: 'sip:100@pbx.example.com',
        version: 0,
        state: 'full',
        dialogs: [],
      }

      const result = dialogInfoToStatus(doc)

      expect(result.state).toBe(DialogState.Idle)
      expect(result.uri).toBe('sip:100@pbx.example.com')
      expect(result.dialogId).toBeUndefined()
    })

    it('should return status from the first dialog when only one exists', () => {
      const doc: DialogInfoDocument = {
        entity: 'sip:100@pbx.example.com',
        version: 1,
        state: 'full',
        dialogs: [
          {
            id: 'dialog-abc',
            state: 'confirmed',
            callId: 'call-123',
            direction: 'initiator',
            remoteIdentity: 'sip:200@pbx.example.com',
            remoteDisplayName: 'Jane',
          },
        ],
      }

      const result = dialogInfoToStatus(doc)

      expect(result.state).toBe(DialogState.InCall)
      expect(result.uri).toBe('sip:100@pbx.example.com')
      expect(result.direction).toBe('initiator')
      expect(result.remoteIdentity).toBe('sip:200@pbx.example.com')
      expect(result.callId).toBe('call-123')
      expect(result.dialogId).toBe('dialog-abc')
      expect(result.remoteDisplayName).toBe('Jane')
    })

    it('should prefer active dialog over terminated when multiple dialogs exist', () => {
      const doc: DialogInfoDocument = {
        entity: 'sip:100@pbx.example.com',
        version: 3,
        state: 'full',
        dialogs: [
          {
            id: 'old-dialog',
            state: 'terminated',
            callId: 'call-old',
            direction: 'initiator',
          },
          {
            id: 'active-dialog',
            state: 'confirmed',
            callId: 'call-active',
            direction: 'recipient',
            remoteIdentity: 'sip:200@pbx.example.com',
          },
        ],
      }

      const result = dialogInfoToStatus(doc)

      expect(result.dialogId).toBe('active-dialog')
      expect(result.callId).toBe('call-active')
      expect(result.state).toBe(DialogState.InCall)
    })

    it('should fall back to firstDialog if all dialogs are terminated', () => {
      const doc: DialogInfoDocument = {
        entity: 'sip:100@pbx.example.com',
        version: 2,
        state: 'full',
        dialogs: [
          {
            id: 'terminated-1',
            state: 'terminated',
            callId: 'call-1',
          },
          {
            id: 'terminated-2',
            state: 'terminated',
            callId: 'call-2',
          },
        ],
      }

      const result = dialogInfoToStatus(doc)

      // Falls back to firstDialog when all are terminated
      expect(result.dialogId).toBe('terminated-1')
      expect(result.callId).toBe('call-1')
    })

    it('should map ringing state correctly', () => {
      const doc: DialogInfoDocument = {
        entity: 'sip:100@pbx.example.com',
        version: 1,
        state: 'full',
        dialogs: [
          {
            id: 'ringing-call',
            state: 'ringing',
            direction: 'recipient',
            remoteIdentity: 'sip:200@pbx.example.com',
          },
        ],
      }

      const result = dialogInfoToStatus(doc)

      expect(result.state).toBe(DialogState.Ringing)
      expect(result.direction).toBe('recipient')
    })

    it('should include lastUpdated timestamp', () => {
      const doc: DialogInfoDocument = {
        entity: 'sip:100@pbx.example.com',
        version: 0,
        state: 'full',
        dialogs: [],
      }

      const result = dialogInfoToStatus(doc)

      expect(result.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('parseDialogInfoToStatus', () => {
    it('should parse XML and return DialogStatus', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="sip:100@pbx.example.com" version="1" state="full">
          <dialog id="test-call" call-id="call-xyz" direction="initiator">
            <state>confirmed</state>
            <remote-identity>
              <uri>sip:200@pbx.example.com</uri>
            </remote-identity>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfoToStatus(xml)

      expect(result).toBeDefined()
      expect(result?.uri).toBe('sip:100@pbx.example.com')
      expect(result?.state).toBe(DialogState.InCall)
      expect(result?.dialogId).toBe('test-call')
    })

    it('should return null for invalid XML', () => {
      const invalidXml = '<not-valid-xml>'
      const result = parseDialogInfoToStatus(invalidXml)
      expect(result).toBeNull()
    })

    it('should use fallbackUri when entity is empty', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="" version="0" state="full">
          <dialog id="call-1" state="confirmed">
            <remote-identity><uri>sip:200@pbx.example.com</uri></remote-identity>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfoToStatus(xml, 'sip:fallback@pbx.example.com')

      expect(result).toBeDefined()
      expect(result?.uri).toBe('sip:fallback@pbx.example.com')
    })

    it('should not use fallbackUri when entity is present', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="sip:actual@pbx.example.com" version="0" state="full">
          <dialog id="call-1" state="trying"></dialog>
        </dialog-info>`

      const result = parseDialogInfoToStatus(xml, 'sip:fallback@pbx.example.com')

      expect(result?.uri).toBe('sip:actual@pbx.example.com')
    })

    it('should return idle for empty dialogs with fallbackUri', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" entity="" version="0" state="full">
        </dialog-info>`

      const result = parseDialogInfoToStatus(xml, 'sip:empty@pbx.example.com')

      expect(result?.state).toBe(DialogState.Idle)
      expect(result?.uri).toBe('sip:empty@pbx.example.com')
    })
  })

  describe('areDialogStatesEqual', () => {
    it('should return true for identical dialog statuses', () => {
      const a: DialogStatus = {
        state: DialogState.InCall,
        direction: 'initiator',
        remoteIdentity: 'sip:200@pbx.example.com',
      }
      const b: DialogStatus = {
        state: DialogState.InCall,
        direction: 'initiator',
        remoteIdentity: 'sip:200@pbx.example.com',
      }

      expect(areDialogStatesEqual(a, b)).toBe(true)
    })

    it('should return false when states differ', () => {
      const a: DialogStatus = { state: DialogState.InCall }
      const b: DialogStatus = { state: DialogState.Idle }

      expect(areDialogStatesEqual(a, b)).toBe(false)
    })

    it('should return false when directions differ', () => {
      const a: DialogStatus = { state: DialogState.Ringing, direction: 'initiator' }
      const b: DialogStatus = { state: DialogState.Ringing, direction: 'recipient' }

      expect(areDialogStatesEqual(a, b)).toBe(false)
    })

    it('should return false when remoteIdentity differs', () => {
      const a: DialogStatus = {
        state: DialogState.InCall,
        remoteIdentity: 'sip:200@pbx.example.com',
      }
      const b: DialogStatus = {
        state: DialogState.InCall,
        remoteIdentity: 'sip:300@pbx.example.com',
      }

      expect(areDialogStatesEqual(a, b)).toBe(false)
    })

    it('should return false when first argument is undefined', () => {
      const b: DialogStatus = { state: DialogState.InCall }
      expect(areDialogStatesEqual(undefined, b)).toBe(false)
    })

    it('should return false when second argument is undefined', () => {
      const a: DialogStatus = { state: DialogState.InCall }
      expect(areDialogStatesEqual(a, undefined)).toBe(false)
    })

    it('should return false when both arguments are undefined', () => {
      expect(areDialogStatesEqual(undefined, undefined)).toBe(false)
    })
  })
})
