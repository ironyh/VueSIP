# FreePBX SMS Integration Guide

This guide explains how to integrate VueSIP with FreePBX's SMS functionality to send and receive text messages through your PBX system.

## Overview

FreePBX supports SMS through several methods:
- **SIP MESSAGE** - RFC 3428 instant messaging (already supported in VueSIP)
- **REST API** - FreePBX REST API for SMS modules
- **SMS Connector Module** - Routes SMS through various carriers
- **Flowroute SMS** - Direct carrier integration
- **Twilio SMS** - Cloud SMS service integration

---

## Prerequisites

### FreePBX Requirements

1. **FreePBX 15+ with SMS Support**:
   ```bash
   # Check if SMS modules are installed
   fwconsole ma list | grep -i sms
   ```

2. **Install Required Modules**:
   ```bash
   # SMS Connector (for most carriers)
   fwconsole ma downloadinstall smsconnector

   # OR Flowroute SMS (if using Flowroute)
   fwconsole ma downloadinstall flowroutesms

   # REST API (for API access)
   fwconsole ma downloadinstall restapps

   fwconsole reload
   ```

3. **Configure SMS Carrier**:
   - Admin → Connectivity → SMS Connector
   - Add your carrier credentials (Twilio, Flowroute, etc.)
   - Test sending/receiving SMS

---

## Method 1: SIP MESSAGE (Recommended for Internal)

VueSIP's existing `useMessaging` composable already supports SIP MESSAGE, which works with FreePBX's internal messaging.

### Configuration

**Asterisk Configuration** (`/etc/asterisk/sip.conf` or `pjsip.conf`):
```ini
; Enable MESSAGE support
accept_outofcall_message=yes
outofcall_message_context=from-internal

; For PJSIP
[endpoint_template]
accept_message_from=all
```

**FreePBX Dialplan** (`/etc/asterisk/extensions_custom.conf`):
```ini
[from-internal-custom]
; Route incoming SIP MESSAGE to user
exten => _X.,1,NoOp(SIP MESSAGE from ${MESSAGE(from)} to ${MESSAGE(to)})
 same => n,Set(PEER=${CUT(MESSAGE(to),@,1)})
 same => n,Set(PEER=${CUT(PEER,:,2)})
 same => n,MessageSend(sip:${PEER}@${SIPDOMAIN},${MESSAGE(from)})
 same => n,Hangup()
```

### VueSIP Implementation

```typescript
import { useMessaging } from 'vuesip'
import { useSipClient } from 'vuesip'

const { sipClient } = useSipClient()
const { sendMessage, messages, conversations } = useMessaging(sipClient)

// Send internal message to another extension
await sendMessage('sip:102@pbx.telenurse.se', 'Hello from VueSIP!')

// Listen for incoming messages
onMessagingEvent((event) => {
  if (event.type === 'message:received') {
    console.log('New message:', event.message)
  }
})
```

**Use Case**: Internal messaging between extensions

---

## Method 2: FreePBX REST API (Recommended for External SMS)

Use FreePBX REST API to send SMS through configured carriers like Twilio, Flowroute, etc.

### Setup

1. **Enable REST API**:
   ```bash
   fwconsole ma downloadinstall restapps
   fwconsole reload
   ```

2. **Create API User**:
   - Admin → REST API Settings
   - Add new application
   - Grant SMS permissions
   - Note the API Key and Secret

3. **Configure CORS** (if accessing from browser):
   ```bash
   # Edit /etc/httpd/conf.d/freepbx.conf or Apache config
   Header set Access-Control-Allow-Origin "https://your-app.com"
   Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
   Header set Access-Control-Allow-Headers "Authorization, Content-Type"
   ```

### Implementation

#### Create FreePBX SMS Service

Create `src/services/freepbxSms.ts`:

```typescript
/**
 * FreePBX SMS Service
 * Sends/receives SMS through FreePBX REST API
 */

export interface FreePBXSmsConfig {
  baseUrl: string          // e.g., 'https://pbx.telenurse.se'
  apiKey: string
  apiSecret: string
  defaultFrom?: string     // Default sender number
}

export interface SmsMessage {
  id?: string
  from: string
  to: string
  message: string
  timestamp?: Date
  status?: 'pending' | 'sent' | 'delivered' | 'failed'
}

export class FreePBXSmsService {
  private config: FreePBXSmsConfig
  private authToken: string = ''

  constructor(config: FreePBXSmsConfig) {
    this.config = config
    this.authToken = btoa(`${config.apiKey}:${config.apiSecret}`)
  }

  /**
   * Send SMS through FreePBX
   */
  async sendSms(to: string, message: string, from?: string): Promise<SmsMessage> {
    const url = `${this.config.baseUrl}/api/sms/send`

    const body = {
      to: this.normalizePhoneNumber(to),
      from: from || this.config.defaultFrom,
      message: message,
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`SMS send failed: ${error.message || response.statusText}`)
      }

      const data = await response.json()

      return {
        id: data.id || `sms-${Date.now()}`,
        from: body.from!,
        to: body.to,
        message: message,
        timestamp: new Date(),
        status: 'sent',
      }
    } catch (error) {
      console.error('Failed to send SMS:', error)
      throw error
    }
  }

  /**
   * Retrieve SMS messages
   */
  async getMessages(limit: number = 50): Promise<SmsMessage[]> {
    const url = `${this.config.baseUrl}/api/sms/messages?limit=${limit}`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      const data = await response.json()

      return data.messages.map((msg: any) => ({
        id: msg.id,
        from: msg.from,
        to: msg.to,
        message: msg.body,
        timestamp: new Date(msg.timestamp),
        status: msg.status,
      }))
    } catch (error) {
      console.error('Failed to fetch SMS messages:', error)
      return []
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const url = `${this.config.baseUrl}/api/sms/unread`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get unread count: ${response.statusText}`)
      }

      const data = await response.json()
      return data.count || 0
    } catch (error) {
      console.error('Failed to get unread count:', error)
      return 0
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '')

    // Add + if missing
    if (!cleaned.startsWith('+')) {
      return `+${cleaned}`
    }

    return cleaned
  }

  /**
   * Poll for new messages (for apps without webhook support)
   */
  startPolling(callback: (messages: SmsMessage[]) => void, intervalMs: number = 30000) {
    let lastCheck = new Date()

    const poll = async () => {
      try {
        const messages = await this.getMessages(50)
        const newMessages = messages.filter(msg =>
          msg.timestamp && msg.timestamp > lastCheck
        )

        if (newMessages.length > 0) {
          callback(newMessages)
          lastCheck = new Date()
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    const intervalId = setInterval(poll, intervalMs)

    // Initial poll
    poll()

    // Return cleanup function
    return () => clearInterval(intervalId)
  }
}
```

#### Create Vue Composable

Create `src/composables/useFreePBXSms.ts`:

```typescript
import { ref, computed } from 'vue'
import { FreePBXSmsService, type SmsMessage, type FreePBXSmsConfig } from '../services/freepbxSms'

export interface UseFreePBXSmsReturn {
  messages: Ref<SmsMessage[]>
  unreadCount: ComputedRef<number>
  isPolling: Ref<boolean>
  sendSms: (to: string, message: string, from?: string) => Promise<SmsMessage>
  refreshMessages: () => Promise<void>
  startPolling: (intervalMs?: number) => void
  stopPolling: () => void
}

export function useFreePBXSms(config: FreePBXSmsConfig): UseFreePBXSmsReturn {
  const service = new FreePBXSmsService(config)
  const messages = ref<SmsMessage[]>([])
  const isPolling = ref(false)
  let stopPollingFn: (() => void) | null = null

  const unreadCount = computed(() => {
    return messages.value.filter(msg => msg.status === 'pending').length
  })

  const sendSms = async (to: string, message: string, from?: string) => {
    const sms = await service.sendSms(to, message, from)
    messages.value.unshift(sms)
    return sms
  }

  const refreshMessages = async () => {
    const fetchedMessages = await service.getMessages()
    messages.value = fetchedMessages
  }

  const startPolling = (intervalMs: number = 30000) => {
    if (isPolling.value) return

    isPolling.value = true
    stopPollingFn = service.startPolling((newMessages) => {
      // Prepend new messages
      messages.value.unshift(...newMessages)
    }, intervalMs)
  }

  const stopPolling = () => {
    if (stopPollingFn) {
      stopPollingFn()
      stopPollingFn = null
    }
    isPolling.value = false
  }

  return {
    messages,
    unreadCount,
    isPolling,
    sendSms,
    refreshMessages,
    startPolling,
    stopPolling,
  }
}
```

#### Usage Example

```vue
<script setup lang="ts">
import { useFreePBXSms } from '@/composables/useFreePBXSms'

const { messages, unreadCount, sendSms, startPolling, stopPolling } = useFreePBXSms({
  baseUrl: 'https://pbx.telenurse.se',
  apiKey: import.meta.env.VITE_FREEPBX_API_KEY,
  apiSecret: import.meta.env.VITE_FREEPBX_API_SECRET,
  defaultFrom: '+46701234567',
})

// Start polling for new messages
startPolling(30000) // Poll every 30 seconds

// Send SMS
const handleSendSms = async () => {
  await sendSms('+46709876543', 'Hello from VueSIP!')
}

// Cleanup
onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="sms-container">
    <h2>SMS Messages ({{ unreadCount }} unread)</h2>

    <div v-for="msg in messages" :key="msg.id">
      <div class="message">
        <strong>{{ msg.from }}</strong> → {{ msg.to }}
        <p>{{ msg.message }}</p>
        <small>{{ msg.timestamp?.toLocaleString() }}</small>
      </div>
    </div>

    <button @click="handleSendSms">Send Test SMS</button>
  </div>
</template>
```

---

## Method 3: Webhook Integration (Real-time)

For real-time SMS notifications instead of polling, configure FreePBX to send webhooks.

### FreePBX Webhook Configuration

1. **Configure SMS Webhook** (in FreePBX SMS module):
   - URL: `https://your-app.com/api/sms/webhook`
   - Method: POST
   - Events: Incoming SMS

2. **Create Webhook Endpoint** (backend required):

```typescript
// Express.js example
app.post('/api/sms/webhook', (req, res) => {
  const { from, to, message, timestamp } = req.body

  // Validate webhook signature (if configured)
  const signature = req.headers['x-freepbx-signature']
  if (!validateSignature(signature, req.body)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Broadcast to connected WebSocket clients
  io.emit('sms:received', {
    from,
    to,
    message,
    timestamp: new Date(timestamp),
  })

  res.status(200).json({ success: true })
})
```

3. **Connect VueSIP to WebSocket**:

```typescript
import { io } from 'socket.io-client'

const socket = io('https://your-backend.com')

socket.on('sms:received', (smsData) => {
  console.log('New SMS:', smsData)
  // Add to messages
  messages.value.unshift({
    id: `sms-${Date.now()}`,
    ...smsData,
    status: 'delivered',
  })
})
```

---

## Method 4: Asterisk Manager Interface (AMI)

For advanced integration, use AMI to monitor SMS events directly.

### Configuration

**Enable AMI** (`/etc/asterisk/manager.conf`):
```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[vuesip]
secret = your_secret_here
permit = 0.0.0.0/0.0.0.0
read = message
write = message
```

### WebSocket AMI Integration

```typescript
class AsteriskAMI {
  private ws: WebSocket | null = null

  connect(host: string, username: string, secret: string) {
    this.ws = new WebSocket(`wss://${host}/ws`)

    this.ws.onopen = () => {
      // Login to AMI
      this.send({
        Action: 'Login',
        Username: username,
        Secret: secret,
      })
    }

    this.ws.onmessage = (event) => {
      const data = this.parseAMI(event.data)

      if (data.Event === 'MessageReceived') {
        console.log('SMS received via AMI:', {
          from: data.From,
          to: data.To,
          body: data.Body,
        })
      }
    }
  }

  private send(action: Record<string, string>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = Object.entries(action)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\r\n') + '\r\n\r\n'

      this.ws.send(message)
    }
  }

  private parseAMI(data: string): Record<string, string> {
    const lines = data.split('\r\n')
    const result: Record<string, string> = {}

    for (const line of lines) {
      const [key, value] = line.split(': ')
      if (key && value) {
        result[key] = value
      }
    }

    return result
  }
}
```

---

## Environment Configuration

Add to `.env`:

```bash
# FreePBX SMS Configuration
VITE_FREEPBX_URL=https://pbx.telenurse.se
VITE_FREEPBX_API_KEY=your_api_key_here
VITE_FREEPBX_API_SECRET=your_api_secret_here
VITE_FREEPBX_DEFAULT_FROM=+46701234567

# WebSocket for real-time updates (optional)
VITE_WEBSOCKET_URL=wss://your-backend.com

# AMI Configuration (optional)
VITE_AMI_HOST=pbx.telenurse.se
VITE_AMI_PORT=5038
VITE_AMI_USER=vuesip
VITE_AMI_SECRET=your_ami_secret
```

---

## Comparison

| Method | Latency | Setup Complexity | Use Case |
|--------|---------|------------------|----------|
| SIP MESSAGE | <100ms | Low | Internal messaging |
| REST API (Polling) | 5-30s | Medium | External SMS, simple apps |
| REST API (Webhook) | <1s | High | External SMS, real-time |
| AMI | <100ms | High | Advanced integration |

---

## Testing

### Test SIP MESSAGE

```bash
# From Asterisk CLI
asterisk -rx "message send text 'Test message' to sip:102@pbx.telenurse.se"
```

### Test REST API

```bash
# Send SMS via REST API
curl -X POST https://pbx.telenurse.se/api/sms/send \
  -H "Authorization: Basic $(echo -n 'apikey:secret' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+46709876543",
    "from": "+46701234567",
    "message": "Test SMS from curl"
  }'
```

### Monitor Asterisk Logs

```bash
# Watch for SMS events
tail -f /var/log/asterisk/full | grep -i message
```

---

## Troubleshooting

### SMS Not Sending

1. **Check FreePBX SMS module**:
   ```bash
   fwconsole ma list | grep -i sms
   fwconsole sms test
   ```

2. **Verify carrier credentials**:
   - Admin → Connectivity → SMS Connector
   - Test credentials

3. **Check Asterisk logs**:
   ```bash
   grep -i sms /var/log/asterisk/full | tail -20
   ```

### REST API 401 Errors

1. Verify API credentials
2. Check API user permissions
3. Test with curl first

### CORS Issues

1. Configure Apache/Nginx CORS headers
2. Use backend proxy for API calls
3. Check browser console for errors

---

## Security Best Practices

1. **Never expose API credentials in frontend code**
2. **Use environment variables** for all secrets
3. **Implement rate limiting** on SMS endpoints
4. **Validate webhook signatures** to prevent spoofing
5. **Use HTTPS** for all API communication
6. **Implement proper authentication** for your backend
7. **Monitor SMS usage** to prevent abuse

---

## Additional Resources

- [FreePBX SMS Connector Documentation](https://wiki.freepbx.org/display/FOP/SMS+Connector)
- [RFC 3428 - SIP MESSAGE Method](https://datatracker.ietf.org/doc/html/rfc3428)
- [FreePBX REST API Documentation](https://wiki.freepbx.org/display/FOP/REST+API)
- [Asterisk AMI Documentation](https://docs.asterisk.org/Asterisk_18_Documentation/API_Documentation/AMI_Commands/)
- [Twilio SMS with FreePBX](https://support.twilio.com/hc/en-us/articles/223180228)
