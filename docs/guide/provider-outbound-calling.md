# Provider-Specific Outbound Calling Guide

Learn how to handle outbound calls with different SIP providers, including standards-based SIP INVITE and provider-specific REST originate (e.g., 46elks).

## Table of Contents

- [Overview](#overview)
- [Standards-Based SIP INVITE](#standards-based-sip-invite)
- [Provider-Specific REST Originate](#provider-specific-rest-originate)
- [46elks REST Originate](#46elks-rest-originate)
- [Dial Strategy Selection](#dial-strategy-selection)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Different SIP providers have different capabilities for originating outbound calls:

1. **Standards-Based SIP INVITE** (default): Most providers support direct SIP INVITE to initiate calls. This is the standard, provider-agnostic approach.

2. **Provider-Specific REST Originate**: Some providers like 46elks require outbound calls to be initiated via their REST API instead of direct SIP INVITE. This is necessary for PSTN connectivity with these providers.

VueSip provides a dial strategy abstraction that automatically selects the appropriate method based on your provider configuration.

## Standards-Based SIP INVITE

For most SIP providers, you can use the standard SIP INVITE method:

```typescript
import { ref, computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

// Initialize SIP client
const { getClient } = useSipClient({
  uri: 'wss://sip.provider.com:7443',
  sipUri: 'sip:user@provider.com',
  password: 'your-password',
})

const sipClient = computed(() => getClient())
const { makeCall } = useCallSession(sipClient)

// Make a call using standard SIP INVITE
await makeCall('sip:+46700123456@provider.com')
```

This works with providers that support standard SIP trunking.

## Provider-Specific REST Originate

Some providers require outbound calls to be initiated via their REST API:

- **46elks**: Requires REST originate for PSTN calls
- **Future**: Additional providers may be supported

### Why REST Originate?

Some providers don't support direct SIP INVITE for PSTN calls because:

- They need to validate caller ID ownership via their API
- They need to apply custom routing or billing rules
- Their infrastructure doesn't bridge SIP to PSTN directly

Attempting direct SIP INVITE with these providers will fail with confusing errors that look like SIP bugs but are actually provider capability mismatches.

## 46elks REST Originate

46elks requires outbound PSTN calls to be initiated via their REST API. The flow is:

1. **Originate via REST API**: Call 46elks API to originate a call
2. **Incoming WebRTC Call**: 46elks calls your WebRTC number (auto-answer)
3. **Bridge to PSTN**: 46elks bridges the call to the destination number

### Using the Core Library

VueSip provides the `originateCall` function in `providers/services/elks46ApiService`:

```typescript
import { originateCall } from 'vuesip/providers/services/elks46ApiService'

// Originate a call via 46elks REST API
const result = await originateCall({
  credentials: {
    username: 'u1234567890abcdef',
    password: 'your-api-password',
  },
  callerId: '+46700000000',
  webrtcNumber: '+46700000000',
  destination: '+46700123456',
})

// Result contains:
// - id: Call ID
// - direction: 'outgoing'
// - from: Caller ID
// - to: Destination
// - state: Call state
```

### Using the Dial Strategy Composable

VueSip provides the `useDialStrategy` composable that automatically selects the appropriate dial method:

```typescript
import { ref, computed } from 'vue'
import { useSipClient, useDialStrategy } from 'vuesip'

// Initialize SIP client
const { getClient } = useSipClient()
const sipClient = computed(() => getClient())

// Initialize dial strategy
const { configure, dial, isDialing, error } = useDialStrategy(sipClient)

// Configure for 46elks with auto-detection
configure({
  providerId: '46elks',
  strategy: 'auto', // Automatically selects REST originate for 46elks
  // or explicitly:
  // strategy: 'rest-originate',
})

// Dial a number - automatically uses REST originate for 46elks
const result = await dial('+46700123456', {
  // REST originate options
  apiUsername: 'u1234567890abcdef',
  apiPassword: 'your-api-password',
  callerId: '+46700000000',
  webrtcNumber: '+46700000000',
  destination: '+46700123456',
})

if (result.success) {
  console.log('Call initiated:', result.callId)
} else {
  console.error('Dial failed:', result.error)
}
```

### 46elks Configuration

To use 46elks REST originate, you need:

1. **API Credentials**:
   - API Username (starts with 'u')
   - API Password
   - Get these from [46elks Dashboard](https://46elks.com/account)

2. **Phone Numbers**:
   - Caller ID number (your 46elks number)
   - WebRTC number (same as caller ID for 46elks)
   - Enable WebRTC on your number in 46elks dashboard

3. **Callback URL**:
   - Set `voice_start` callback URL in 46elks dashboard for your number
   - Format: `https://your-app.com/elks/calls?connect={destination}`
   - This is where 46elks sends incoming calls after bridging

### 46elks Flow Diagram

```
Your App                         46elks REST API                46elks SIP Server
    |                                  |                              |
    |-- originateCall() --------------> POST /calls             |
    |                                  |                              |
    |                                  v                              |
    |                             Call ID returned               |
    |                                  |                              |
    |                                  v                              |
    |                             Incoming call to                 |
    |                             your WebRTC number                 |
    |                                  v                              |
    |<----------------------------------+                              |
    |                             Auto-answer                   |
    |                                  |                              |
    |                                  v                              |
    |                            Call bridged to destination      |
    |                             (PSTN number)                 |
    |                                  v                              |
```

## Dial Strategy Selection

### Automatic Detection

The `useDialStrategy` composable automatically detects the appropriate strategy:

```typescript
import { useDialStrategy } from 'vuesip'

const { configure, strategy } = useDialStrategy(sipClient)

// Auto-detect based on provider
configure({
  providerId: '46elks',
  autoDetect: true, // Automatically selects 'rest-originate' for 46elks
})

// strategy.value will be 'rest-originate'
```

### Manual Strategy Selection

You can explicitly specify the strategy:

```typescript
configure({
  providerId: 'custom',
  strategy: 'sip-invite', // Force SIP INVITE
  // or
  strategy: 'rest-originate', // Force REST originate (if supported)
})
```

### Strategy Types

- **'sip-invite'**: Standards-based SIP INVITE (works with most providers)
- **'rest-originate'**: Provider-specific REST API (46elks, future providers)

## Security Best Practices

### Protect API Credentials

⚠️ **Critical**: Never expose API credentials in client-side code:

```typescript
// ❌ NEVER do this:
const API_PASSWORD = 'my-password' // Hardcoded in frontend!

// ✅ Correct approach:
// Store credentials securely on server-side
// Use server-side proxy to make API calls
// Client only stores tokens (not passwords)
```

### Validate Callback Webhooks

When implementing REST originate callbacks:

1. **Verify Request Origin**: Ensure requests come from your provider
2. **Validate Request Signatures**: Many providers sign webhook requests
3. **Rate Limit**: Implement rate limiting to prevent abuse
4. **Secure Endpoints**: Use HTTPS and proper authentication

### 46elks-Specific Security

1. **Protect voice_start Callback**:
   - Use HTTPS
   - Validate `X-46elks-Signature` header if provided
   - Verify the `connect` parameter is a valid phone number

2. **API Credentials**:
   - Store securely (server-side only)
   - Rotate credentials regularly
   - Use least-privilege API tokens if available

3. **Call Control Payloads**:
   - Don't log sensitive call-control data in production
   - Sanitize logs to avoid exposing user data

```typescript
// ❌ Don't log full payload
console.log('Callback:', fullRequestObject)

// ✅ Safe logging
console.log('Callback received for number:', phoneNumber)
console.log('Call state:', callState)
```

## Troubleshooting

### "Call failed" with 46elks

If you get call failures with 46elks:

1. **Check API Credentials**: Verify username/password are correct
2. **Verify Number Status**: Ensure number is active in 46elks dashboard
3. **Check WebRTC Enabled**: WebRTC must be enabled on your number
4. **Validate Callback URL**: Ensure `voice_start` URL is set correctly
5. **Check CORS**: If calling from browser, ensure proxy is configured

### "Unsupported mode" errors

If you see errors about unsupported dial modes:

1. **Verify Provider ID**: Ensure `providerId` matches the expected value
2. **Check Strategy**: Some providers only support specific strategies
3. **Review Documentation**: Check provider documentation for supported methods

### Debugging Tips

```typescript
// Enable verbose logging during development
const { dial, error } = useDialStrategy(sipClient, {
  debug: true, // Enable detailed logging
})

// Monitor dial state
watch([isDialing, error], ([dialing, err]) => {
  console.log(`Dialing: ${dialing}, Error: ${err}`)
})
```

## Example: Complete 46elks Setup

```typescript
import { ref, computed } from 'vue'
import { useSipClient, useCallSession, useDialStrategy } from 'vuesip'
import { originateCall } from 'vuesip/providers/services/elks46ApiService'

export function use46ElksPhone() {
  // SIP client for WebRTC connection
  const { getClient } = useSipClient({
    uri: 'wss://voip.46elks.com/w1/websocket',
    sipUri: 'sip:+46700000000@voip.46elks.com',
    password: 'webrtc-secret',
  })
  const sipClient = computed(() => getClient())

  const { answer, hangup } = useCallSession(sipClient)

  // Dial strategy for outbound calls
  const { configure, dial, isDialing, error, lastResult } = useDialStrategy(sipClient)

  // Configure for 46elks
  const config = ref({
    apiUsername: 'u1234567890abcdef',
    apiPassword: 'your-api-password',
    callerIdNumber: '+46700000000',
    webrtcNumber: '+46700000000',
  })

  // Auto-answer incoming 46elks bridge calls
  const autoAnswerUntil = ref(0)

  async function callNumber(destination: string) {
    // Check if this is a SIP URI or PSTN number
    const isSipUri = destination.startsWith('sip:') || destination.startsWith('sips:')

    if (!isSipUri) {
      // This is a PSTN number - use REST originate
      configure({
        providerId: '46elks',
        autoDetect: true,
      })

      const result = await dial(destination, {
        apiUsername: config.value.apiUsername,
        apiPassword: config.value.apiPassword,
        callerId: config.value.callerIdNumber,
        webrtcNumber: config.value.webrtcNumber,
        destination,
      })

      if (result.success) {
        // Set up auto-answer for the incoming bridge call
        autoAnswerUntil.value = Date.now() + 30_000
      }
    } else {
      // This is a SIP URI - use standard INVITE
      configure({
        providerId: 'custom',
        strategy: 'sip-invite',
      })

      await dial(destination)
    }
  }

  return {
    callNumber,
    answer,
    hangup,
    isDialing,
    error,
    lastResult,
  }
}
```

## Additional Resources

- [46elks REST API Documentation](https://46elks.com/docs/calls)
- [46elks WebRTC Guide](https://46elks.com/docs/webrtc-client-connect)
- [Making Calls Guide](/guide/making-calls)
- [Security Guide](/guide/security)
