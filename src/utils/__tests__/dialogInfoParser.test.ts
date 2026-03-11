/**
 * Unit tests for dialogInfoParser
 */

import { describe, it, expect } from 'vitest'
import { parseDialogInfo, mapDialogState } from '../dialogInfoParser'
import { DialogState } from '../../types/presence.types'

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
})
