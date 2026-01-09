/**
 * Own PBX (Generic SIP) Provider Configuration
 *
 * Configuration for connecting to self-hosted PBX systems like Asterisk,
 * FreePBX, or any other SIP-compliant PBX with WebSocket support.
 *
 * This is the most flexible provider - users provide all connection details.
 */

import type { ProviderConfig, SipCredentials } from '../types'

/**
 * Own PBX provider configuration
 *
 * Supports generic SIP connections where the user provides:
 * - WebSocket URL for their PBX
 * - Full SIP URI (sip:extension@domain)
 * - Password for authentication
 * - Optional display name for caller ID
 */
export const ownPbxProvider: ProviderConfig = {
  id: 'own-pbx',
  name: 'Own PBX (Asterisk/FreePBX)',
  websocketUrl: '', // User provides their own WebSocket URL
  fields: [
    {
      name: 'websocketUrl',
      label: 'WebSocket URL',
      type: 'text',
      placeholder: 'wss://pbx.example.com:8089/ws',
      required: true,
    },
    {
      name: 'sipUri',
      label: 'SIP URI',
      type: 'text',
      placeholder: 'sip:1000@pbx.example.com',
      required: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
    },
    {
      name: 'displayName',
      label: 'Display Name',
      type: 'text',
    },
  ],
  mapCredentials: (input: Record<string, string>): SipCredentials => ({
    uri: input.websocketUrl ?? '',
    sipUri: input.sipUri ?? '',
    password: input.password ?? '',
    displayName: input.displayName,
  }),
}
