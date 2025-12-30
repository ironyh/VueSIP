/**
 * Dialog-Info XML Parser tests
 */

import { describe, it, expect } from 'vitest'
import {
  parseDialogInfo,
  mapDialogState,
  dialogInfoToStatus,
  parseDialogInfoToStatus,
  areDialogStatesEqual,
  type DialogInfoDocument,
} from '@/utils/dialogInfoParser'
import { DialogState } from '@/types/presence.types'

describe('dialogInfoParser', () => {
  describe('parseDialogInfo', () => {
    it('should parse valid dialog-info XML with full state', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1" call-id="abc123" local-tag="tag1" remote-tag="tag2" direction="initiator">
            <state>confirmed</state>
            <duration>120</duration>
            <local>
              <identity display="User 1001">sip:1001@example.com</identity>
              <target uri="sip:1001@10.0.0.1"/>
            </local>
            <remote>
              <identity display="User 1002">sip:1002@example.com</identity>
              <target uri="sip:1002@10.0.0.2"/>
            </remote>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.entity).toBe('sip:1001@example.com')
      expect(result!.version).toBe(1)
      expect(result!.state).toBe('full')
      expect(result!.dialogs).toHaveLength(1)

      const dialog = result!.dialogs[0]
      expect(dialog.id).toBe('call-1')
      expect(dialog.callId).toBe('abc123')
      expect(dialog.localTag).toBe('tag1')
      expect(dialog.remoteTag).toBe('tag2')
      expect(dialog.direction).toBe('initiator')
      expect(dialog.state).toBe('confirmed')
      expect(dialog.duration).toBe(120)
      expect(dialog.localIdentity).toBe('sip:1001@example.com')
      expect(dialog.localDisplayName).toBe('User 1001')
      expect(dialog.remoteIdentity).toBe('sip:1002@example.com')
      expect(dialog.remoteDisplayName).toBe('User 1002')
      expect(dialog.localTarget).toBe('sip:1001@10.0.0.1')
      expect(dialog.remoteTarget).toBe('sip:1002@10.0.0.2')
    })

    it('should parse dialog-info with partial state', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="2" state="partial" entity="sip:1001@example.com">
          <dialog id="call-2">
            <state>trying</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.state).toBe('partial')
      expect(result!.version).toBe(2)
    })

    it('should parse dialog-info without namespace prefix', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>early</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.dialogs).toHaveLength(1)
      expect(result!.dialogs[0].state).toBe('early')
    })

    it('should handle multiple dialogs', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1"><state>confirmed</state></dialog>
          <dialog id="call-2"><state>early</state></dialog>
          <dialog id="call-3"><state>terminated</state></dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.dialogs).toHaveLength(3)
      expect(result!.dialogs[0].id).toBe('call-1')
      expect(result!.dialogs[1].id).toBe('call-2')
      expect(result!.dialogs[2].id).toBe('call-3')
    })

    it('should return null for malformed XML', () => {
      const xml = '<dialog-info><malformed'

      const result = parseDialogInfo(xml)

      expect(result).toBeNull()
    })

    it('should return null for XML without dialog-info root', () => {
      const xml = '<?xml version="1.0"?><other-root/>'

      const result = parseDialogInfo(xml)

      expect(result).toBeNull()
    })

    it('should handle dialog without optional attributes', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      const dialog = result!.dialogs[0]
      expect(dialog.callId).toBeUndefined()
      expect(dialog.localTag).toBeUndefined()
      expect(dialog.remoteTag).toBeUndefined()
      expect(dialog.direction).toBeUndefined()
    })

    it('should handle dialog without duration', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.dialogs[0].duration).toBeUndefined()
    })

    it('should handle dialog without local/remote elements', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>terminated</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      const dialog = result!.dialogs[0]
      expect(dialog.localIdentity).toBeUndefined()
      expect(dialog.remoteIdentity).toBeUndefined()
    })

    it('should parse state with code attribute', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state code="486">terminated</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.dialogs[0].stateCode).toBe(486)
    })

    it('should default entity to empty string if missing', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.entity).toBe('')
    })

    it('should default version to 0 if missing', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.version).toBe(0)
    })

    it('should default state to full if missing', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.state).toBe('full')
    })

    it('should handle empty dialogs list', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
        </dialog-info>`

      const result = parseDialogInfo(xml)

      expect(result).not.toBeNull()
      expect(result!.dialogs).toHaveLength(0)
    })
  })

  describe('mapDialogState', () => {
    it('should map RFC 4235 states', () => {
      expect(mapDialogState('trying')).toBe(DialogState.Trying)
      expect(mapDialogState('proceeding')).toBe(DialogState.Trying)
      expect(mapDialogState('early')).toBe(DialogState.Ringing)
      expect(mapDialogState('confirmed')).toBe(DialogState.InCall)
      expect(mapDialogState('terminated')).toBe(DialogState.Idle)
    })

    it('should map Asterisk-specific states', () => {
      expect(mapDialogState('ringing')).toBe(DialogState.Ringing)
      expect(mapDialogState('in-use')).toBe(DialogState.InCall)
      expect(mapDialogState('inuse')).toBe(DialogState.InCall)
      expect(mapDialogState('busy')).toBe(DialogState.InCall)
      expect(mapDialogState('not-in-use')).toBe(DialogState.Idle)
      expect(mapDialogState('notinuse')).toBe(DialogState.Idle)
      expect(mapDialogState('unavailable')).toBe(DialogState.Unavailable)
      expect(mapDialogState('onhold')).toBe(DialogState.OnHold)
      expect(mapDialogState('on-hold')).toBe(DialogState.OnHold)
      expect(mapDialogState('idle')).toBe(DialogState.Idle)
    })

    it('should handle case insensitivity', () => {
      expect(mapDialogState('CONFIRMED')).toBe(DialogState.InCall)
      expect(mapDialogState('TrYiNg')).toBe(DialogState.Trying)
      expect(mapDialogState('  EARLY  ')).toBe(DialogState.Ringing)
    })

    it('should handle early state with recipient direction', () => {
      expect(mapDialogState('early', 'recipient')).toBe(DialogState.Ringing)
      expect(mapDialogState('early', 'initiator')).toBe(DialogState.Ringing)
    })

    it('should return Unknown for unrecognized states', () => {
      expect(mapDialogState('unknown-state')).toBe(DialogState.Unknown)
      expect(mapDialogState('custom')).toBe(DialogState.Unknown)
      expect(mapDialogState('')).toBe(DialogState.Unknown)
    })

    it('should trim whitespace', () => {
      expect(mapDialogState('  confirmed  ')).toBe(DialogState.InCall)
      expect(mapDialogState('\ttrying\n')).toBe(DialogState.Trying)
    })
  })

  describe('dialogInfoToStatus', () => {
    it('should convert dialog-info with active dialog to status', () => {
      const dialogInfo: DialogInfoDocument = {
        entity: 'sip:1001@example.com',
        version: 1,
        state: 'full',
        dialogs: [
          {
            id: 'call-1',
            callId: 'abc123',
            direction: 'initiator',
            state: 'confirmed',
            localIdentity: 'sip:1001@example.com',
            remoteIdentity: 'sip:1002@example.com',
            remoteDisplayName: 'User 1002',
          },
        ],
      }

      const status = dialogInfoToStatus(dialogInfo)

      expect(status.uri).toBe('sip:1001@example.com')
      expect(status.state).toBe(DialogState.InCall)
      expect(status.direction).toBe('initiator')
      expect(status.remoteIdentity).toBe('sip:1002@example.com')
      expect(status.remoteDisplayName).toBe('User 1002')
      expect(status.callId).toBe('abc123')
      expect(status.dialogId).toBe('call-1')
      expect(status.rawState).toBe('confirmed')
      expect(status.lastUpdated).toBeInstanceOf(Date)
    })

    it('should return idle status when no dialogs', () => {
      const dialogInfo: DialogInfoDocument = {
        entity: 'sip:1001@example.com',
        version: 1,
        state: 'full',
        dialogs: [],
      }

      const status = dialogInfoToStatus(dialogInfo)

      expect(status.uri).toBe('sip:1001@example.com')
      expect(status.state).toBe(DialogState.Idle)
      expect(status.lastUpdated).toBeInstanceOf(Date)
    })

    it('should prefer active dialogs over terminated ones', () => {
      const dialogInfo: DialogInfoDocument = {
        entity: 'sip:1001@example.com',
        version: 1,
        state: 'full',
        dialogs: [
          {
            id: 'call-1',
            state: 'terminated',
          },
          {
            id: 'call-2',
            state: 'confirmed',
            remoteIdentity: 'sip:1002@example.com',
          },
        ],
      }

      const status = dialogInfoToStatus(dialogInfo)

      expect(status.dialogId).toBe('call-2')
      expect(status.state).toBe(DialogState.InCall)
      expect(status.remoteIdentity).toBe('sip:1002@example.com')
    })

    it('should use first dialog if all are terminated', () => {
      const dialogInfo: DialogInfoDocument = {
        entity: 'sip:1001@example.com',
        version: 1,
        state: 'full',
        dialogs: [
          {
            id: 'call-1',
            state: 'terminated',
          },
          {
            id: 'call-2',
            state: 'terminated',
          },
        ],
      }

      const status = dialogInfoToStatus(dialogInfo)

      expect(status.dialogId).toBe('call-1')
      expect(status.state).toBe(DialogState.Idle)
    })

    it('should handle dialog without optional fields', () => {
      const dialogInfo: DialogInfoDocument = {
        entity: 'sip:1001@example.com',
        version: 1,
        state: 'full',
        dialogs: [
          {
            id: 'call-1',
            state: 'early',
          },
        ],
      }

      const status = dialogInfoToStatus(dialogInfo)

      expect(status.direction).toBeUndefined()
      expect(status.remoteIdentity).toBeUndefined()
      expect(status.remoteDisplayName).toBeUndefined()
      expect(status.callId).toBeUndefined()
    })
  })

  describe('parseDialogInfoToStatus', () => {
    it('should parse XML and return status', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:1001@example.com">
          <dialog id="call-1">
            <state>confirmed</state>
            <remote>
              <identity display="User 1002">sip:1002@example.com</identity>
            </remote>
          </dialog>
        </dialog-info>`

      const status = parseDialogInfoToStatus(xml)

      expect(status).not.toBeNull()
      expect(status!.uri).toBe('sip:1001@example.com')
      expect(status!.state).toBe(DialogState.InCall)
      expect(status!.remoteIdentity).toBe('sip:1002@example.com')
    })

    it('should return null for invalid XML', () => {
      const xml = '<invalid><xml'

      const status = parseDialogInfoToStatus(xml)

      expect(status).toBeNull()
    })

    it('should use fallback URI if entity is empty', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const status = parseDialogInfoToStatus(xml, 'sip:fallback@example.com')

      expect(status).not.toBeNull()
      expect(status!.uri).toBe('sip:fallback@example.com')
    })

    it('should not use fallback URI if entity is present', () => {
      const xml = `<?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="1" state="full" entity="sip:original@example.com">
          <dialog id="call-1">
            <state>confirmed</state>
          </dialog>
        </dialog-info>`

      const status = parseDialogInfoToStatus(xml, 'sip:fallback@example.com')

      expect(status).not.toBeNull()
      expect(status!.uri).toBe('sip:original@example.com')
    })
  })

  describe('areDialogStatesEqual', () => {
    it('should return true for equal statuses', () => {
      const a = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      const b = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(Date.now() + 1000), // Different time
      }

      expect(areDialogStatesEqual(a, b)).toBe(true)
    })

    it('should return false for different states', () => {
      const a = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      const b = {
        uri: 'sip:1001@example.com',
        state: DialogState.Ringing,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      expect(areDialogStatesEqual(a, b)).toBe(false)
    })

    it('should return false for different directions', () => {
      const a = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      const b = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'recipient' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      expect(areDialogStatesEqual(a, b)).toBe(false)
    })

    it('should return false for different remote identities', () => {
      const a = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      const b = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1003@example.com',
        lastUpdated: new Date(),
      }

      expect(areDialogStatesEqual(a, b)).toBe(false)
    })

    it('should return false if first status is undefined', () => {
      const b = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      expect(areDialogStatesEqual(undefined, b)).toBe(false)
    })

    it('should return false if second status is undefined', () => {
      const a = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      expect(areDialogStatesEqual(a, undefined)).toBe(false)
    })

    it('should return false if both statuses are undefined', () => {
      expect(areDialogStatesEqual(undefined, undefined)).toBe(false)
    })

    it('should ignore URI differences', () => {
      const a = {
        uri: 'sip:1001@example.com',
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      const b = {
        uri: 'sip:9999@example.com', // Different URI
        state: DialogState.InCall,
        direction: 'initiator' as const,
        remoteIdentity: 'sip:1002@example.com',
        lastUpdated: new Date(),
      }

      expect(areDialogStatesEqual(a, b)).toBe(true)
    })
  })
})
