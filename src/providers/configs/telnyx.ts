/**
 * Telnyx Provider Configuration
 *
 * Configuration for Telnyx SIP WebRTC connections.
 * Uses Telnyx's WebRTC gateway for real-time communications.
 *
 * @see https://developers.telnyx.com/docs/voice/webrtc
 */

import type { ProviderConfig } from '../types'

/**
 * Telnyx provider configuration
 *
 * Telnyx provides WebRTC SIP connections via their rtc.telnyx.com endpoint.
 * Users need credentials from their SIP Connection in the Telnyx portal.
 */
export const telnyxProvider: ProviderConfig = {
  id: 'telnyx',
  name: 'Telnyx',
  websocketUrl: 'wss://rtc.telnyx.com',
  fields: [
    {
      name: 'username',
      label: 'SIP Username',
      type: 'text',
      required: true,
      helpText: 'From your SIP Connection credentials',
    },
    {
      name: 'password',
      label: 'SIP Password',
      type: 'password',
      required: true,
      helpUrl: 'https://portal.telnyx.com/#/app/sip-trunks',
    },
  ],
  mapCredentials: (input: Record<string, string>) => ({
    uri: 'wss://rtc.telnyx.com',
    sipUri: `sip:${input.username}@sip.telnyx.com`,
    password: input.password ?? '',
  }),
}
