/**
 * Twilio Provider Adapter (Placeholder)
 *
 * Placeholder adapter for Twilio Voice SDK integration.
 * Twilio requires their proprietary @twilio/voice-sdk for WebRTC connections,
 * which differs from standard SIP WebSocket connections.
 *
 * This adapter serves as a placeholder until full Twilio SDK integration
 * is implemented. It provides the configuration structure for credential
 * collection but throws an informative error when connection is attempted.
 *
 * @see https://www.twilio.com/docs/voice/sdks/javascript
 * @see https://console.twilio.com/us1/develop/voice/twiml-apps
 */

import type { ProviderAdapter, SipCredentials } from '../types'
import type { SipClient } from '../../core/SipClient'

/**
 * Twilio provider adapter
 *
 * This is a placeholder adapter. Full Twilio integration requires:
 * 1. Installing @twilio/voice-sdk
 * 2. Server-side token generation endpoint
 * 3. TwiML application configuration
 */
export const twilioAdapter: ProviderAdapter = {
  id: 'twilio',
  name: 'Twilio',
  websocketUrl: '', // Not used - SDK handles connection
  fields: [
    {
      name: 'accountSid',
      label: 'Account SID',
      type: 'text',
      required: true,
    },
    {
      name: 'authToken',
      label: 'Auth Token',
      type: 'password',
      required: true,
    },
    {
      name: 'twimlAppSid',
      label: 'TwiML App SID',
      type: 'text',
      required: true,
      helpUrl: 'https://console.twilio.com/us1/develop/voice/twiml-apps',
    },
  ],
  mapCredentials: (_input: Record<string, string>): SipCredentials => ({
    uri: '',
    sipUri: '',
    password: '',
  }),
  connect: async (_credentials: SipCredentials, _sipClient: SipClient): Promise<void> => {
    throw new Error('Twilio adapter requires @twilio/voice-sdk. See documentation for setup.')
  },
}
