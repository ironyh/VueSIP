# Voicemail Management Guide

This guide covers voicemail management in VueSIP using the `useAmiVoicemail` composable, enabling you to build applications with MWI (Message Waiting Indicator) monitoring, mailbox status tracking, and voicemail user management.

## Overview

Voicemail is an essential feature for any business phone system. VueSIP provides comprehensive voicemail monitoring through the AMI (Asterisk Manager Interface), allowing you to:

- **Monitor MWI**: Track new and old message counts for any mailbox
- **Real-time Updates**: Receive instant notifications when messages arrive
- **Multi-mailbox Support**: Monitor multiple mailboxes simultaneously
- **User Information**: Retrieve voicemail user details and settings

**Why Voicemail Management Matters:**

- **User Experience**: Users need to know when they have messages waiting
- **Productivity**: Quick access to message counts reduces phone tag
- **Business Intelligence**: Track voicemail usage patterns
- **Integration**: Connect voicemail to unified messaging systems

## Table of Contents

- [Prerequisites](#prerequisites)
- [Basic Setup](#basic-setup)
- [Monitoring Mailboxes](#monitoring-mailboxes)
- [MWI State](#mwi-state)
- [Voicemail Users](#voicemail-users)
- [Event Handling](#event-handling)
- [Advanced Usage](#advanced-usage)
- [Asterisk Configuration](#asterisk-configuration)

---

## Prerequisites

Before using `useAmiVoicemail`, ensure you have:

1. **AMI WebSocket Proxy**: An amiws proxy running alongside Asterisk
2. **AMI Permissions**: User with voicemail-related permissions
3. **Asterisk Voicemail**: Configured voicemail.conf with mailboxes
4. **VueSIP AMI Connection**: Established AmiClient connection

## Basic Setup

### Creating the Voicemail Composable

```typescript
import { computed } from 'vue'
import { useAmi, useAmiVoicemail } from 'vuesip'

// Get the AMI client
const ami = useAmi()

// Create the voicemail composable
const {
  mwiStates, // Map of MWI states by mailbox
  mailboxes, // Map of mailbox info
  isLoading, // Loading state
  error, // Error message if any
  totalNewMessages, // Total new messages across all monitored mailboxes
  totalOldMessages, // Total old messages
  hasWaitingMessages, // Whether any mailbox has waiting messages

  // Methods
  getMwiState, // Get MWI state for a mailbox
  getMailboxInfo, // Get detailed mailbox info
  getVoicemailUsers, // List all voicemail users
  refreshMailbox, // Refresh MWI for a mailbox
  monitorMailbox, // Start monitoring a mailbox
  unmonitorMailbox, // Stop monitoring a mailbox
  clearMonitoring, // Clear all monitoring
  onMwiChange, // Listen for MWI changes
} = useAmiVoicemail(computed(() => ami.getClient()))
```

### With Options

```typescript
const voicemail = useAmiVoicemail(
  computed(() => ami.getClient()),
  {
    // Default voicemail context (default: 'default')
    defaultContext: 'default',

    // Use AMI events for real-time updates (default: true)
    useEvents: true,

    // Auto-refresh when client connects (default: true)
    autoRefresh: true,

    // Polling interval in ms (0 = disabled, default: 0)
    pollInterval: 0,

    // Callbacks
    onMwiChange: (mwi) => {
      console.log(`${mwi.mailbox}: ${mwi.newMessages} new messages`)
    },
    onNewMessage: (mailbox, count) => {
      showNotification(`New voicemail in ${mailbox}!`)
    },

    // Filter mailboxes
    mailboxFilter: (info) => info.context === 'sales',

    // Transform mailbox data
    transformMailbox: (info) => ({
      ...info,
      displayName: info.fullName || info.mailbox,
    }),
  }
)
```

## Monitoring Mailboxes

### Adding a Mailbox to Monitor

```typescript
// Monitor a single mailbox
monitorMailbox('1001', 'default')

// Monitor multiple mailboxes
const extensions = ['1001', '1002', '1003']
extensions.forEach((ext) => monitorMailbox(ext, 'default'))
```

When you monitor a mailbox, VueSIP:

1. Adds it to the monitored set
2. Fetches the initial MWI state
3. Listens for MessageWaiting events for that mailbox

### Stopping Monitoring

```typescript
// Stop monitoring a specific mailbox
unmonitorMailbox('1001', 'default')

// Clear all monitoring
clearMonitoring()
```

### Checking Monitored State

```typescript
// Access all MWI states
for (const [key, mwi] of mwiStates.value) {
  console.log(`${key}: ${mwi.newMessages} new, ${mwi.oldMessages} old`)
}

// Check totals
console.log(`Total new: ${totalNewMessages.value}`)
console.log(`Has waiting: ${hasWaitingMessages.value}`)
```

## MWI State

### MWI State Structure

Each MWI state contains:

```typescript
interface MwiState {
  mailbox: string // Mailbox identifier (e.g., '1001@default')
  waiting: boolean // Whether messages are waiting
  newMessages: number // Count of new/unread messages
  oldMessages: number // Count of old/read messages
  lastUpdated: Date // When this state was last updated
  serverId?: number // AMI server ID (for multi-server setups)
}
```

### Getting MWI State

```typescript
// Get MWI state (async - queries Asterisk)
const mwi = await getMwiState('1001', 'default')

console.log(`Mailbox: ${mwi.mailbox}`)
console.log(`Waiting: ${mwi.waiting}`)
console.log(`New: ${mwi.newMessages}`)
console.log(`Old: ${mwi.oldMessages}`)
```

### Refreshing MWI

```typescript
// Force refresh MWI for a mailbox
// This sends VoicemailRefresh action to Asterisk
await refreshMailbox('1001', 'default')
```

## Voicemail Users

### Listing All Users

```typescript
// Get all voicemail users
const users = await getVoicemailUsers()

users.forEach((user) => {
  console.log(`${user.mailbox} - ${user.fullName}`)
  console.log(`  New: ${user.newMessages}, Old: ${user.oldMessages}`)
  console.log(`  Email: ${user.email || 'Not configured'}`)
})
```

### Filtering by Context

```typescript
// Get users in a specific context
const salesUsers = await getVoicemailUsers('sales')
```

### Getting Single User Info

```typescript
// Get info for a specific mailbox
const info = await getMailboxInfo('1001', 'default')

if (info) {
  console.log(`Full Name: ${info.fullName}`)
  console.log(`Email: ${info.email}`)
  console.log(`Messages: ${info.newMessages} new, ${info.oldMessages} old`)
}
```

### MailboxInfo Structure

```typescript
interface MailboxInfo {
  mailbox: string // Mailbox number
  context: string // Voicemail context
  newMessages: number // New message count
  oldMessages: number // Old message count
  urgentMessages: number // Urgent message count
  fullName?: string // User's full name
  email?: string // Email address for notifications
  pager?: string // Pager number
  serverId?: number // AMI server ID
}
```

## Event Handling

### Listening for MWI Changes

```typescript
// Register a listener
const unsubscribe = onMwiChange((mwi) => {
  if (mwi.waiting) {
    showNotification(`You have ${mwi.newMessages} new messages`)
  }
})

// Later: unsubscribe when done
unsubscribe()
```

### Using Callback Options

```typescript
const voicemail = useAmiVoicemail(clientRef, {
  onMwiChange: (mwi) => {
    // Called for every MWI update
    updateBadge(mwi.mailbox, mwi.newMessages)
  },
  onNewMessage: (mailbox, count) => {
    // Called only when new messages arrive
    playNotificationSound()
  },
})
```

## Advanced Usage

### Building an MWI Badge Component

```vue
<template>
  <div class="mwi-badge" :class="{ active: hasMessages }">
    <span class="icon">📬</span>
    <span v-if="hasMessages" class="count">{{ newCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiVoicemail } from 'vuesip'

const props = defineProps<{
  mailbox: string
  context?: string
}>()

const ami = useAmi()
const { mwiStates, monitorMailbox } = useAmiVoicemail(computed(() => ami.getClient()))

// Start monitoring this mailbox
monitorMailbox(props.mailbox, props.context)

const mwiKey = computed(() => `${props.mailbox}@${props.context || 'default'}`)

const mwiState = computed(() => mwiStates.value.get(mwiKey.value))

const hasMessages = computed(() => mwiState.value?.waiting ?? false)

const newCount = computed(() => mwiState.value?.newMessages ?? 0)
</script>
```

### Multi-Mailbox Dashboard

```vue
<template>
  <div class="voicemail-dashboard">
    <div class="summary">
      <span>Total: {{ totalNewMessages }} new messages</span>
    </div>

    <div class="mailbox-list">
      <div
        v-for="[key, mwi] in mwiStates"
        :key="key"
        class="mailbox-item"
        :class="{ 'has-new': mwi.newMessages > 0 }"
      >
        <span class="mailbox-name">{{ mwi.mailbox }}</span>
        <span class="message-counts"> {{ mwi.newMessages }} new / {{ mwi.oldMessages }} old </span>
        <span class="updated"> Updated: {{ formatTime(mwi.lastUpdated) }} </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAmiVoicemail } from 'vuesip'

const { mwiStates, totalNewMessages, monitorMailbox } = useAmiVoicemail(clientRef)

// Monitor all extension mailboxes
onMounted(() => {
  const extensions = ['1001', '1002', '1003', '1004', '1005']
  extensions.forEach((ext) => monitorMailbox(ext))
})

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}
</script>
```

### Integration with Notifications

```typescript
import { watch } from 'vue'

const { totalNewMessages, onMwiChange } = useAmiVoicemail(clientRef)

// Watch for new messages
watch(totalNewMessages, (newCount, oldCount) => {
  if (newCount > oldCount) {
    // New message arrived
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Voicemail', {
        body: `You have ${newCount} new voicemail message(s)`,
        icon: '/voicemail-icon.png',
      })
    }
  }
})

// Or use the callback
onMwiChange((mwi) => {
  if (mwi.newMessages > 0) {
    // Update browser tab title
    document.title = `(${mwi.newMessages}) Voicemail`
  }
})
```

## Asterisk Configuration

### voicemail.conf Setup

```ini
[general]
; Voicemail format
format=wav49|gsm|wav

; Email settings
serveremail=voicemail@yourserver.com
attach=yes
mailcmd=/usr/sbin/sendmail -t

; MWI settings
pollmailboxes=yes
pollfreq=30

[default]
; Extension mailboxes
1001 => 1234,John Doe,john@example.com,,attach=yes
1002 => 1234,Jane Smith,jane@example.com,,attach=yes
1003 => 1234,Bob Wilson,bob@example.com,,attach=yes
```

### AMI User Permissions

```ini
; manager.conf
[amiuser]
secret = your_secret
read = call,agent,user,system
write = call,agent,user,originate,system
```

### Required Permissions

For voicemail features, your AMI user needs:

- `read`: `system` (for VoicemailUsersList)
- `write`: `system` (for VoicemailRefresh)

## Best Practices

### 1. Monitor Only Needed Mailboxes

```typescript
// Good: Monitor specific mailboxes
monitorMailbox(currentUserExtension)

// Avoid: Monitoring all mailboxes unnecessarily
// This generates more AMI traffic
```

### 2. Handle Connection Loss

```typescript
import { watch } from 'vue'

watch(
  () => ami.isConnected.value,
  (connected) => {
    if (!connected) {
      // Connection lost - states may be stale
      console.log('AMI disconnected - voicemail states may be outdated')
    }
  }
)
```

### 3. Clean Up on Unmount

```typescript
import { onUnmounted } from 'vue'

onUnmounted(() => {
  clearMonitoring()
})
```

### 4. Use Computed Properties for UI

```typescript
const displayMessage = computed(() => {
  if (totalNewMessages.value === 0) {
    return 'No new messages'
  }
  return `${totalNewMessages.value} new message${totalNewMessages.value > 1 ? 's' : ''}`
})
```

## Related Guides

- [AMI Integration Overview](/guide/ami-cdr)
- [Presence & Messaging](/guide/presence-messaging)
- [Error Handling](/guide/error-handling)
