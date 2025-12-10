# AMI CDR Integration Guide

This guide covers integrating VueSIP with Asterisk/FreePBX to retrieve server-side Call Detail Records (CDR) via the Asterisk Manager Interface (AMI).

## Overview

VueSIP provides two complementary approaches for call history:

| Approach | Source | Use Case |
|----------|--------|----------|
| **Client-side** (`useCallHistory`) | Browser IndexedDB | Local tracking, offline access |
| **Server-side** (`useAmiCDR`) | Asterisk CDR via AMI | Enterprise reporting, billing, compliance |

This guide focuses on the **server-side approach** using AMI CDR events.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  VueSIP App     │◄────►│  amiws Proxy     │◄────►│  Asterisk PBX   │
│  (Browser)      │  WS  │  (WebSocket)     │  AMI │  (FreePBX)      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────────┐
                                                   │  CDR Database   │
                                                   │  (MySQL/etc)    │
                                                   └─────────────────┘
```

### Components

1. **Asterisk PBX** - Generates CDR events when calls complete
2. **amiws Proxy** - Converts AMI protocol to WebSocket (JSON)
3. **VueSIP** - `useAmiCDR` composable processes CDR events reactively

## Prerequisites

### Asterisk Configuration

#### 1. Enable CDR Manager Backend

Create or edit `/etc/asterisk/cdr_manager.conf`:

```ini
; /etc/asterisk/cdr_manager.conf
[general]
enabled = yes

; Optional: Add custom CDR variables to AMI events
[mappings]
; Map dialplan CDR variables to AMI event fields
; Format: AMIFieldName = cdr_variable_name
rate = rate
carrier = carrier
department = department
```

#### 2. Configure AMI User

Edit `/etc/asterisk/manager.conf`:

```ini
; /etc/asterisk/manager.conf
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1  ; Bind to localhost, amiws connects locally

[vuesip]
secret = your-secure-password
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = cdr,call,agent,user
write = originate,call,agent
eventfilter = !Event: RTCP*
eventfilter = !Event: VarSet
```

**Required Permissions:**
- `read = cdr` - Receive CDR events
- `read = call` - Track call state changes
- `read = agent` - Queue agent statistics

#### 3. Reload Configuration

```bash
asterisk -rx "module reload cdr_manager.so"
asterisk -rx "manager reload"
```

### FreePBX Configuration

In FreePBX, AMI users are managed via the GUI:

1. Navigate to **Settings > Asterisk Manager Users**
2. Click **+ Add Manager**
3. Configure:
   - **Manager Name**: `vuesip`
   - **Manager Secret**: Strong password
   - **Deny**: `0.0.0.0/0.0.0.0`
   - **Permit**: `127.0.0.1/255.255.255.255`
   - **Read Permissions**: Enable `cdr`, `call`, `agent`, `user`
   - **Write Permissions**: Enable `originate`, `call` (if needed)
4. Submit and Apply Config

### amiws WebSocket Proxy

VueSIP connects to Asterisk AMI via [amiws](https://github.com/staskobzar/amiws), a proxy that converts AMI to WebSocket.

#### Installation

```bash
# Build from source
git clone https://github.com/staskobzar/amiws.git
cd amiws

# With SSL support (recommended for production)
autoreconf -if
./configure --with-ssl
make && sudo make install
```

#### Configuration

Create `/etc/amiws.yaml`:

```yaml
# /etc/amiws.yaml
---
# Web server settings
web:
  address: 0.0.0.0
  port: 8080
  # For production, enable SSL:
  # ssl_cert: /etc/ssl/certs/amiws.crt
  # ssl_key: /etc/ssl/private/amiws.key

# HTTP digest authentication (recommended)
# auth_domain: pbx.example.com
# auth_file: /etc/amiws/.htdigest

# AMI server connections
ami:
  - name: asterisk01
    host: 127.0.0.1
    port: 5038
    username: vuesip
    secret: your-secure-password
    # For SSL AMI connections:
    # ssl: true

  # Multi-server setup (optional)
  # - name: asterisk02
  #   host: 192.168.1.11
  #   port: 5038
  #   username: vuesip
  #   secret: another-password
```

#### Running amiws

```bash
# Foreground (testing)
amiws -f /etc/amiws.yaml

# Daemon mode (production)
amiws -f /etc/amiws.yaml -d -p /var/run/amiws.pid

# With systemd
sudo systemctl enable amiws
sudo systemctl start amiws
```

## VueSIP Integration

### Basic Setup

```typescript
import { computed } from 'vue'
import { useAmi, useAmiCDR } from 'vuesip'

// Create AMI connection
const ami = useAmi()

// Connect to amiws proxy
await ami.connect({
  url: 'ws://pbx.example.com:8080'
})

// Initialize CDR tracking
const {
  records,           // Reactive CDR records array
  stats,             // Computed statistics
  agentStats,        // Per-agent statistics
  queueStats,        // Per-queue statistics
  getRecords,        // Filtered record retrieval
  exportRecords,     // CSV/JSON export
  getTodayCalls,     // Today's calls helper
} = useAmiCDR(computed(() => ami.getClient()))
```

### Reactive CDR Dashboard

```vue
<template>
  <div class="cdr-dashboard">
    <!-- Today's Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="value">{{ stats.totalCalls }}</span>
        <span class="label">Total Calls</span>
      </div>
      <div class="stat-card">
        <span class="value">{{ stats.answeredCalls }}</span>
        <span class="label">Answered</span>
      </div>
      <div class="stat-card">
        <span class="value">{{ stats.answerRate.toFixed(1) }}%</span>
        <span class="label">Answer Rate</span>
      </div>
      <div class="stat-card">
        <span class="value">{{ formatDuration(stats.averageTalkTime) }}</span>
        <span class="label">Avg Talk Time</span>
      </div>
    </div>

    <!-- Recent Calls Table -->
    <table class="cdr-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>From</th>
          <th>To</th>
          <th>Duration</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cdr in recentCalls" :key="cdr.uniqueId">
          <td>{{ formatTime(cdr.startTime) }}</td>
          <td>{{ cdr.source || cdr.callerId }}</td>
          <td>{{ cdr.destination }}</td>
          <td>{{ formatDuration(cdr.billableSeconds) }}</td>
          <td :class="'status-' + cdr.disposition.toLowerCase()">
            {{ cdr.disposition }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiCDR } from 'vuesip'

const ami = useAmi()
const { records, stats } = useAmiCDR(computed(() => ami.getClient()))

// Show most recent 50 calls
const recentCalls = computed(() => records.value.slice(0, 50))

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}
</script>
```

### Filtering CDR Records

```typescript
import type { CdrFilter } from 'vuesip'

// Filter by date range
const todaysCalls = getRecords({
  startDate: new Date(new Date().setHours(0, 0, 0, 0)),
  endDate: new Date()
})

// Filter by disposition
const missedCalls = getRecords({
  disposition: ['NO ANSWER', 'CANCEL'],
  direction: 'inbound'
})

// Filter by extension/agent
const agentCalls = getRecords({
  agent: '1001',
  startDate: startOfWeek,
  sortBy: 'startTime',
  sortOrder: 'desc'
})

// Filter by queue
const queueCalls = getRecords({
  queue: 'support',
  disposition: 'ANSWERED',
  minDuration: 30  // At least 30 seconds
})

// Pagination
const pagedCalls = getRecords({
  limit: 25,
  offset: page * 25,
  sortBy: 'startTime',
  sortOrder: 'desc'
})
```

### Exporting CDR Data

```typescript
// Export to CSV
const csv = exportRecords({
  format: 'csv',
  fields: [
    'uniqueId',
    'startTime',
    'source',
    'destination',
    'duration',
    'billableSeconds',
    'disposition',
    'direction'
  ],
  dateFormat: 'yyyy-MM-dd HH:mm:ss',
  includeHeader: true
})

// Download CSV
const blob = new Blob([csv], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `cdr-export-${Date.now()}.csv`
a.click()

// Export to JSON
const json = exportRecords({ format: 'json' })

// Filtered export - only answered calls this week
const answeredCsv = exportRecords(
  { format: 'csv' },
  {
    disposition: 'ANSWERED',
    startDate: startOfWeek
  }
)
```

### Real-time CDR Events

```typescript
// Subscribe to new CDR records
const unsubscribe = onCdrEvent((cdr) => {
  console.log('New CDR:', cdr.uniqueId)

  // Trigger notification for missed calls
  if (cdr.disposition === 'NO ANSWER' && cdr.direction === 'inbound') {
    showNotification(`Missed call from ${cdr.callerId}`)
  }

  // Log long calls
  if (cdr.billableSeconds > 3600) {
    console.log('Long call detected:', cdr)
  }
})

// Clean up on unmount
onUnmounted(() => {
  unsubscribe()
})
```

### Agent Statistics

```typescript
// Get agent stats for today
const todayAgentStats = computed(() => {
  return Object.entries(agentStats.value).map(([agent, stats]) => ({
    agent,
    callsHandled: stats.callsHandled,
    avgTalkTime: stats.averageTalkTime,
    totalTalkTime: stats.totalTalkTime
  }))
})

// Get specific agent stats for date range
const agent1001Stats = getAgentStats('1001', startOfWeek, endOfWeek)
if (agent1001Stats) {
  console.log(`Agent 1001 handled ${agent1001Stats.callsHandled} calls`)
  console.log(`Average talk time: ${agent1001Stats.averageTalkTime}s`)
}
```

### Queue Statistics

```typescript
// Get all queue stats
const allQueueStats = computed(() => {
  return Object.entries(queueStats.value).map(([queue, stats]) => ({
    queue,
    offered: stats.callsOffered,
    answered: stats.callsAnswered,
    abandoned: stats.callsAbandoned,
    serviceLevelPct: stats.serviceLevelPct,
    abandonmentRate: stats.abandonmentRate
  }))
})

// Specific queue stats with custom service level
const supportQueueStats = getQueueStats('support', startOfDay, now)
if (supportQueueStats) {
  console.log(`Service Level: ${supportQueueStats.serviceLevelPct}%`)
  console.log(`Abandonment Rate: ${supportQueueStats.abandonmentRate}%`)
}

// Calculate service level with custom threshold (e.g., 30 seconds)
const serviceLevel = calculateServiceLevel(30, startOfDay)
console.log(`Calls answered within 30s: ${serviceLevel}%`)
```

### Hourly Breakdown

```typescript
// Get call distribution by hour
const hourlyBreakdown = getHourlyBreakdown(new Date())

// Render chart data
const chartData = Object.entries(hourlyBreakdown).map(([hour, stats]) => ({
  hour: parseInt(hour),
  calls: stats.totalCalls,
  answered: stats.answeredCalls,
  answerRate: stats.answerRate
}))
```

## CDR Event Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `uniqueId` | string | Unique call identifier |
| `accountCode` | string | Billing account code |
| `source` | string | Caller's number |
| `destination` | string | Dialed destination |
| `destinationContext` | string | Dialplan context |
| `callerId` | string | Caller ID name |
| `channel` | string | Party A channel |
| `destinationChannel` | string | Party B channel |
| `lastApplication` | string | Final dialplan app |
| `lastData` | string | App parameters |
| `startTime` | Date | Call initiated |
| `answerTime` | Date \| null | Call answered (null if unanswered) |
| `endTime` | Date | Call ended |
| `duration` | number | Total duration (seconds) |
| `billableSeconds` | number | Talk time (seconds) |
| `disposition` | string | Final status |
| `amaFlags` | string | AMA billing flags |
| `userField` | string | Custom user data |
| `direction` | string | inbound/outbound/internal |
| `queue` | string \| undefined | Queue name (if applicable) |
| `agent` | string \| undefined | Agent extension (if applicable) |

### Disposition Values

| Value | Description |
|-------|-------------|
| `ANSWERED` | Call was answered |
| `NO ANSWER` | No answer (timeout) |
| `BUSY` | Destination busy |
| `FAILED` | Call failed |
| `CONGESTION` | Network congestion |
| `CANCEL` | Caller hung up |

## Hybrid Architecture: Combining Both Approaches

For robust call history, combine client-side and server-side approaches:

```typescript
import {
  useCallHistory,
  useAmi,
  useAmiCDR
} from 'vuesip'
import type { CdrRecord } from 'vuesip'

// Client-side history (local)
const localHistory = useCallHistory(sipClient, {
  maxRecords: 500,
  persist: true
})

// Server-side CDR (AMI)
const ami = useAmi()
const serverCdr = useAmiCDR(computed(() => ami.getClient()))

// Combined call lookup
async function getCallDetails(callId: string) {
  // Check local history first (fast)
  const localRecord = localHistory.getCallById(callId)
  if (localRecord) {
    return { source: 'local', record: localRecord }
  }

  // Fall back to server CDR
  const cdrRecord = serverCdr.getCallDetail(callId)
  if (cdrRecord) {
    return { source: 'server', record: cdrRecord }
  }

  return null
}

// Sync local history with server CDR on connect
watch(serverCdr.records, (cdrRecords) => {
  // Optionally merge server CDR into local history
  // for offline access
})
```

### When to Use Each Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| Personal call log | Client-side (`useCallHistory`) |
| Billing reports | Server-side (`useAmiCDR`) |
| Compliance/audit | Server-side with database backend |
| Offline access | Client-side with sync |
| Real-time dashboard | Server-side |
| Multi-device sync | Server-side |
| Privacy-focused | Client-side only |

## Custom CDR Variables

Add custom data to CDR records via Asterisk dialplan:

```
; extensions.conf or FreePBX custom context
[macro-custom-cdr]
exten => s,1,Set(CDR(department)=${ARG1})
exten => s,n,Set(CDR(campaign)=${ARG2})
exten => s,n,Set(CDR(custom_field)=my_value)
```

Configure mapping in `cdr_manager.conf`:

```ini
[mappings]
Department = department
Campaign = campaign
CustomField = custom_field
```

Access in VueSIP:

```typescript
const { records } = useAmiCDR(amiClient, {
  transformCdr: (cdr) => ({
    ...cdr,
    customFields: {
      department: cdr.customFields?.Department,
      campaign: cdr.customFields?.Campaign
    }
  })
})
```

## Direction Detection

VueSIP auto-detects call direction based on channel patterns:

```typescript
// Default detection logic
function detectCallDirection(cdr: CdrRecord): CdrDirection {
  const externalPatterns = [
    /^(?:SIP|PJSIP|IAX2|DAHDI)\/trunk/i,
    /^(?:SIP|PJSIP|IAX2|DAHDI)\/provider/i,
    /^(?:SIP|PJSIP|IAX2|DAHDI)\/gateway/i,
  ]

  const isSourceExternal = externalPatterns.some(p => p.test(cdr.channel))
  const isDestExternal = externalPatterns.some(p => p.test(cdr.destinationChannel))

  if (isSourceExternal && !isDestExternal) return 'inbound'
  if (!isSourceExternal && isDestExternal) return 'outbound'
  if (!isSourceExternal && !isDestExternal) return 'internal'
  return 'unknown'
}
```

Override with custom detection:

```typescript
const { records } = useAmiCDR(amiClient, {
  detectDirection: (cdr) => {
    // Custom logic for your trunk naming convention
    if (cdr.channel.includes('PSTN')) return 'inbound'
    if (cdr.destinationChannel.includes('PSTN')) return 'outbound'
    return 'internal'
  }
})
```

## Multi-Server Setup

For multiple Asterisk servers, configure amiws with multiple connections:

```yaml
# /etc/amiws.yaml
ami:
  - name: pbx-east
    host: 192.168.1.10
    port: 5038
    username: vuesip
    secret: password1

  - name: pbx-west
    host: 192.168.1.20
    port: 5038
    username: vuesip
    secret: password2
```

CDR records include `serverId` for identification:

```typescript
// Filter by server
const eastCalls = getRecords({
  // serverId matches amiws server_id (1, 2, etc.)
}).filter(cdr => cdr.serverId === 1)
```

## Troubleshooting

### No CDR Events Received

1. **Verify cdr_manager is loaded:**
   ```bash
   asterisk -rx "module show like cdr_manager"
   # Should show: cdr_manager.so
   ```

2. **Check cdr_manager.conf:**
   ```bash
   cat /etc/asterisk/cdr_manager.conf
   # Must have: enabled = yes
   ```

3. **Verify AMI permissions:**
   ```bash
   asterisk -rx "manager show user vuesip"
   # Check read permissions include 'cdr'
   ```

4. **Test AMI connection:**
   ```bash
   telnet localhost 5038
   # Login and wait for events
   ```

### CDR Events Missing Fields

Custom fields require mapping in `cdr_manager.conf`:

```ini
[mappings]
MyField = myfield
```

And dialplan setting:
```
Set(CDR(myfield)=value)
```

### amiws Connection Issues

1. **Check amiws logs:**
   ```bash
   journalctl -u amiws -f
   ```

2. **Verify WebSocket connectivity:**
   ```javascript
   const ws = new WebSocket('ws://pbx:8080')
   ws.onopen = () => console.log('Connected')
   ws.onerror = (e) => console.error('Error:', e)
   ```

3. **Test AMI credentials:**
   ```bash
   telnet localhost 5038
   Action: Login
   Username: vuesip
   Secret: your-password
   ```

### Performance Optimization

For high-volume systems:

```typescript
const { records } = useAmiCDR(amiClient, {
  maxRecords: 500,        // Limit in-memory records
  autoStats: false,       // Disable auto-stats for large datasets
  filter: {
    // Only track answered calls
    disposition: 'ANSWERED'
  }
})
```

## Security Best Practices

1. **Never expose amiws directly to the internet**
   - Use a reverse proxy (nginx, Traefik)
   - Enable TLS/SSL
   - Implement authentication

2. **Restrict AMI permissions**
   - Only grant required read/write permissions
   - Bind AMI to localhost
   - Use strong passwords

3. **Enable HTTP digest authentication for amiws:**
   ```yaml
   auth_domain: pbx.example.com
   auth_file: /etc/amiws/.htdigest
   ```

4. **Use WSS (WebSocket Secure) in production:**
   ```typescript
   await ami.connect({
     url: 'wss://pbx.example.com/ami'
   })
   ```

## Related Documentation

- [Call History Guide](./call-history.md) - Client-side call history
- [AMI Integration](./ami-integration.md) - General AMI usage
- [Queue Monitoring](./queue-monitoring.md) - Real-time queue stats

## External Resources

- [amiws GitHub Repository](https://github.com/staskobzar/amiws)
- [Asterisk CDR Documentation](https://docs.asterisk.org/Latest_API/API_Documentation/AMI_Events/Cdr/)
- [AMI v2 Specification](https://docs.asterisk.org/Configuration/Interfaces/Asterisk-Manager-Interface-AMI/AMI-v2-Specification/)
- [FreePBX AMI Configuration](https://wiki.freepbx.org/pages/viewpage.action?pageId=202377422)
- [cdr_manager.conf Reference](https://www.asteriskguru.com/tutorials/cdr_manager_conf.html)
