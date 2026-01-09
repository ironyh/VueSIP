/**
 * VoIP.ms Provider Configuration
 *
 * Configuration for VoIP.ms SIP connections.
 * VoIP.ms does not provide a native WebRTC gateway, so users must
 * supply their own WebRTC-to-SIP gateway URL.
 *
 * @see https://voip.ms/m/settings.php
 */

import type { ProviderConfig } from '../types'

/**
 * VoIP.ms provider configuration
 *
 * VoIP.ms is a popular wholesale VoIP provider that requires users
 * to set up their own WebRTC gateway (such as Asterisk, FreeSWITCH,
 * or a commercial WebRTC-to-SIP service) to enable browser-based calling.
 */
export const voipmsProvider: ProviderConfig = {
  id: 'voipms',
  name: 'VoIP.ms',
  websocketUrl: '', // User must provide their own gateway
  fields: [
    {
      name: 'websocketUrl',
      label: 'WebSocket Gateway URL',
      type: 'text',
      required: true,
      helpText: 'VoIP.ms requires a WebRTC gateway',
    },
    {
      name: 'username',
      label: 'Main Account',
      type: 'text',
      required: true,
    },
    {
      name: 'password',
      label: 'SIP Password',
      type: 'password',
      required: true,
      helpUrl: 'https://voip.ms/m/settings.php',
    },
  ],
  mapCredentials: (input: Record<string, string>) => ({
    uri: input.websocketUrl ?? '',
    sipUri: `sip:${input.username}@voip.ms`,
    password: input.password ?? '',
  }),
}
