/**
 * 46 elks Provider Configuration
 *
 * Provider configuration for 46elks WebRTC SIP service.
 * @see https://46elks.com/docs/webrtc-client-connect
 */

import type { ProviderConfig } from '../types'

/**
 * 46 elks provider configuration
 *
 * Maps user credentials to SIP credentials for connecting to 46elks WebRTC service.
 * Phone number format: Swedish format without + prefix (e.g., 46700000000)
 * Secret: Retrieved from 46elks API: GET /a1/numbers/{number}
 */
export const elks46Provider: ProviderConfig = {
  id: '46elks',
  name: '46 elks',
  websocketUrl: 'wss://voip.46elks.com/w1/websocket',
  fields: [
    {
      name: 'phoneNumber',
      label: 'Phone Number',
      type: 'text',
      placeholder: '46700000000',
      required: true,
      helpText: 'Your 46elks number without +',
    },
    {
      name: 'secret',
      label: 'Secret',
      type: 'password',
      required: true,
      helpText: 'From API: GET /a1/numbers/{number}',
      helpUrl: 'https://46elks.com/docs/webrtc-client-connect',
    },
  ],
  mapCredentials: (input: Record<string, string>) => ({
    uri: 'wss://voip.46elks.com/w1/websocket',
    sipUri: `sip:${input.phoneNumber}@voip.46elks.com`,
    password: input.secret ?? '',
  }),
}
