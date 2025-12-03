# Custom Presence States Guide

This guide explains two approaches for customizing presence states in VueSIP to match your FreePBX or Asterisk setup.

## Overview

By default, VueSIP includes standard SIP presence states:
- 🟢 Available (open)
- 🟡 Away (away)
- 🔴 Busy (busy)
- ⚫ Offline (closed)

You can customize these to match your organization's needs or FreePBX custom presence configuration.

---

## Option 1: Configuration-Based (Recommended)

### When to Use
- You have a fixed set of custom presence states
- States are defined in your FreePBX dialplan or Asterisk configuration
- You want a simple, maintainable solution

### Implementation Steps

#### 1. Create a Presence Configuration File

Create `src/config/presenceStates.ts`:

```typescript
export interface PresenceState {
  id: string
  label: string
  icon: string
  pidfState: 'open' | 'closed'
  pidfNote?: string
}

export const presenceStates: PresenceState[] = [
  {
    id: 'available',
    label: 'Available',
    icon: '🟢',
    pidfState: 'open',
    pidfNote: 'Available'
  },
  {
    id: 'away',
    label: 'Away',
    icon: '🟡',
    pidfState: 'open',
    pidfNote: 'Away from desk'
  },
  {
    id: 'busy',
    label: 'Busy',
    icon: '🔴',
    pidfState: 'open',
    pidfNote: 'On a call'
  },
  {
    id: 'lunch',
    label: 'At Lunch',
    icon: '🍽️',
    pidfState: 'open',
    pidfNote: 'At lunch'
  },
  {
    id: 'meeting',
    label: 'In Meeting',
    icon: '📅',
    pidfState: 'open',
    pidfNote: 'In a meeting'
  },
  {
    id: 'dnd',
    label: 'Do Not Disturb',
    icon: '🔕',
    pidfState: 'closed',
    pidfNote: 'Do not disturb'
  },
  {
    id: 'offline',
    label: 'Offline',
    icon: '⚫',
    pidfState: 'closed',
    pidfNote: 'Offline'
  }
]
```

#### 2. Update PresenceDemo Component

Modify `playground/demos/PresenceDemo.vue`:

```vue
<script setup lang="ts">
import { presenceStates } from '@/config/presenceStates'

// ... existing code ...
</script>

<template>
  <!-- Replace hardcoded buttons with dynamic loop -->
  <div class="status-buttons">
    <button
      v-for="state in presenceStates"
      :key="state.id"
      class="btn btn-status"
      :class="{ active: currentState === state.id }"
      @click="handleSetStatus(state.id)"
      :disabled="!isRegistered"
    >
      {{ state.icon }} {{ state.label }}
    </button>
  </div>
</template>
```

#### 3. Match FreePBX Custom States

In FreePBX, custom presence states are typically defined in:
- **User Control Panel (UCP)** → Presence States
- **Custom Context** → `[from-internal-custom]` in `/etc/asterisk/extensions_custom.conf`

Example FreePBX hint configuration:
```ini
; extensions_custom.conf
exten => *90,hint,Custom:DND${EXTEN:3}
exten => *90,1,Set(DEVICE_STATE(Custom:DND${CALLERID(num)})=INUSE)

exten => *91,hint,Custom:LUNCH${EXTEN:3}
exten => *91,1,Set(DEVICE_STATE(Custom:LUNCH${CALLERID(num)})=INUSE)
```

Map these to your `presenceStates.ts` configuration using the `pidfNote` field.

---

## Option 2: FreePBX REST API Integration

### When to Use
- You want real-time sync with FreePBX configuration
- Presence states change frequently
- You have FreePBX REST API access enabled

### Prerequisites

1. **Enable FreePBX REST API**:
   ```bash
   fwconsole ma downloadinstall restapps
   fwconsole reload
   ```

2. **Create API User**:
   - Admin → REST API Settings
   - Add new application with read permissions

### Implementation Steps

#### 1. Create FreePBX API Service

Create `src/services/freepbxApi.ts`:

```typescript
interface FreePBXPresenceState {
  id: string
  description: string
  color?: string
}

export class FreePBXApi {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async getPresenceStates(): Promise<FreePBXPresenceState[]> {
    try {
      // Note: FreePBX doesn't have a native presence states API
      // You may need to use the Asterisk Manager Interface (AMI) instead
      const response = await fetch(`${this.baseUrl}/api/presencestates`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch presence states:', error)
      return []
    }
  }
}
```

#### 2. Integrate with Presence Component

Update `playground/demos/PresenceDemo.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FreePBXApi } from '@/services/freepbxApi'
import { presenceStates as defaultStates } from '@/config/presenceStates'

const presenceStates = ref(defaultStates)
const freepbxApi = new FreePBXApi(
  import.meta.env.VITE_FREEPBX_URL || '',
  import.meta.env.VITE_FREEPBX_API_KEY || ''
)

onMounted(async () => {
  // Try to fetch from FreePBX, fall back to defaults
  const apiStates = await freepbxApi.getPresenceStates()

  if (apiStates.length > 0) {
    presenceStates.value = apiStates.map(state => ({
      id: state.id,
      label: state.description,
      icon: getIconForState(state.id),
      pidfState: state.id === 'dnd' || state.id === 'offline' ? 'closed' : 'open',
      pidfNote: state.description
    }))
  }
})

function getIconForState(id: string): string {
  const icons: Record<string, string> = {
    available: '🟢',
    away: '🟡',
    busy: '🔴',
    dnd: '🔕',
    lunch: '🍽️',
    meeting: '📅',
    offline: '⚫'
  }
  return icons[id] || '⚪'
}
</script>
```

#### 3. Environment Configuration

Add to `.env`:

```bash
# FreePBX REST API Configuration (Optional)
VITE_FREEPBX_URL=https://pbx.telenurse.se
VITE_FREEPBX_API_KEY=your_api_key_here
```

### Alternative: Asterisk AMI Integration

Since FreePBX doesn't have a dedicated presence states REST API, you can use Asterisk Manager Interface (AMI):

```typescript
// src/services/asteriskAmi.ts
export class AsteriskAMI {
  private ws: WebSocket | null = null

  connect(host: string, username: string, secret: string) {
    this.ws = new WebSocket(`wss://${host}/ws`)

    this.ws.onopen = () => {
      // Send AMI login
      this.send({
        Action: 'Login',
        Username: username,
        Secret: secret
      })
    }
  }

  async getHints(): Promise<any[]> {
    return new Promise((resolve) => {
      this.send({
        Action: 'Command',
        Command: 'core show hints'
      })

      // Parse response and extract custom device states
      // ... implementation details
    })
  }

  private send(action: Record<string, string>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = Object.entries(action)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\r\n') + '\r\n\r\n'

      this.ws.send(message)
    }
  }
}
```

---

## Comparison

| Feature | Configuration-Based | FreePBX API |
|---------|-------------------|-------------|
| Setup Complexity | Low | High |
| Maintenance | Manual updates | Automatic sync |
| Performance | Fast | Network dependent |
| Offline Support | ✅ Yes | ❌ No |
| Custom States | ✅ Unlimited | Limited by FreePBX |
| Best For | Static setups | Dynamic environments |

---

## Recommendations

### For Most Users: Configuration-Based (Option 1)
- Simple to set up and maintain
- No external dependencies
- Works offline
- Full control over appearance and behavior

### For Enterprise: Hybrid Approach
1. Use configuration-based as default
2. Optionally sync with FreePBX API on startup
3. Fall back to defaults if API unavailable
4. Cache API results in localStorage

Example hybrid implementation:

```typescript
const DEFAULT_STATES = [...] // from presenceStates.ts

async function loadPresenceStates() {
  // Try cache first
  const cached = localStorage.getItem('presence_states')
  if (cached) {
    return JSON.parse(cached)
  }

  // Try API
  try {
    const api = new FreePBXApi(...)
    const states = await api.getPresenceStates()
    if (states.length > 0) {
      localStorage.setItem('presence_states', JSON.stringify(states))
      return states
    }
  } catch (error) {
    console.warn('Failed to load from API, using defaults')
  }

  // Fall back to defaults
  return DEFAULT_STATES
}
```

---

## Testing

### Test Custom States with Asterisk CLI

```bash
# Connect to Asterisk console
asterisk -rx "core show hints"

# Set custom device state
asterisk -rx "devstate change Custom:DND102 INUSE"

# Check hint status
asterisk -rx "core show hint *90"
```

### Monitor PUBLISH/SUBSCRIBE in VueSIP

Enable debug logging in browser console to see SIP messages:

```javascript
// Browser console
localStorage.setItem('debug', 'VueSIP:*')
```

---

## Troubleshooting

### States Not Showing
1. Check browser console for errors
2. Verify `presenceStates.ts` is imported correctly
3. Ensure component reactive state updates

### FreePBX API Not Working
1. Verify API is enabled: `fwconsole ma list | grep restapps`
2. Check API credentials
3. Test API manually: `curl -H "Authorization: Bearer TOKEN" https://pbx.example.com/api/`
4. Check CORS settings in FreePBX

### PUBLISH Requests Failing
1. Verify Asterisk accepts PUBLISH: `grep PUBLISH /etc/asterisk/sip.conf`
2. Check presence configuration in FreePBX UCP
3. Monitor Asterisk logs: `tail -f /var/log/asterisk/full | grep PUBLISH`

---

## Additional Resources

- [RFC 3863 - Presence Information Data Format (PIDF)](https://datatracker.ietf.org/doc/html/rfc3863)
- [RFC 3903 - SIP PUBLISH Method](https://datatracker.ietf.org/doc/html/rfc3903)
- [FreePBX REST API Documentation](https://wiki.freepbx.org/display/FOP/REST+API)
- [Asterisk Device State](https://docs.asterisk.org/Asterisk_18_Documentation/API_Documentation/Dialplan_Functions/DEVICE_STATE/)
