import { describe, bench } from 'vitest'
import {
  validateSipUri,
  validatePhoneNumber,
  validateWebSocketUrl,
  validateDtmfSequence,
} from '../../../src/utils/validators'

describe('validateSipUri Performance', () => {
  bench('validate valid SIP URI', () => {
    validateSipUri('sip:alice@example.com')
  })

  bench('validate valid SIP URI with port', () => {
    validateSipUri('sip:alice@example.com:5060')
  })

  bench('validate valid SIPS URI', () => {
    validateSipUri('sips:alice@secure.example.com')
  })

  bench('validate invalid URI - missing user', () => {
    validateSipUri('sip:@example.com')
  })

  bench('validate invalid URI - missing domain', () => {
    validateSipUri('sip:user@')
  })

  bench('validate invalid URI - invalid port', () => {
    validateSipUri('sip:user@example.com:99999')
  })

  bench('validate empty string', () => {
    validateSipUri('')
  })
})

describe('validatePhoneNumber Performance', () => {
  bench('validate valid E164 number', () => {
    validatePhoneNumber('+14155551234')
  })

  bench('validate valid international number', () => {
    validatePhoneNumber('+442071838750')
  })

  bench('validate valid Swedish number', () => {
    validatePhoneNumber('+46701234567')
  })

  bench('validate invalid - no plus prefix', () => {
    validatePhoneNumber('4155551234')
  })

  bench('validate invalid - too many digits', () => {
    validatePhoneNumber('+141555123456789')
  })

  bench('validate empty string', () => {
    validatePhoneNumber('')
  })
})

describe('validateWebSocketUrl Performance', () => {
  bench('validate valid WSS URL', () => {
    validateWebSocketUrl('wss://sip.example.com:7443')
  })

  bench('validate valid WS URL', () => {
    validateWebSocketUrl('ws://localhost:8080')
  })

  bench('validate valid WSS with path', () => {
    validateWebSocketUrl('wss://sip.example.com/ws')
  })

  bench('validate invalid - HTTP URL', () => {
    validateWebSocketUrl('http://example.com')
  })

  bench('validate invalid - no hostname', () => {
    validateWebSocketUrl('wss://:7443')
  })

  bench('validate empty string', () => {
    validateWebSocketUrl('')
  })
})

describe('validateDtmfSequence Performance', () => {
  bench('validate valid short sequence', () => {
    validateDtmfSequence('123')
  })

  bench('validate valid medium sequence', () => {
    validateDtmfSequence('1234567890*#')
  })

  bench('validate valid long sequence', () => {
    validateDtmfSequence('1234567890*#ABCD1234567890*#')
  })

  bench('validate invalid sequence', () => {
    validateDtmfSequence('1234X')
  })

  bench('validate empty sequence', () => {
    validateDtmfSequence('')
  })
})
