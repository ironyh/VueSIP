# Message Waiting Indicator

Control voicemail lamp status via AMI.

::: tip Try It Live
Run `pnpm dev` → Navigate to **MWIDemo** in the playground
:::

## Overview

Message Waiting Indicator (MWI) features:

- Track mailbox message counts
- Control voicemail lamp status
- Real-time MWI event handling
- New/old message tracking
- Urgent message support

## Quick Start

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiMWI } from 'vuesip'

const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

const {
  mailboxList,
  isLoading,
  totalNewMessages,
  indicatorOnCount,
  getMailboxStatus,
  updateMWI,
  trackMailbox,
} = useAmiMWI(computed(() => ami.getClient()))

await trackMailbox('1001@default')
</script>

<template>
  <div class="mwi-demo">
    <div class="status-bar">
      <span>{{ mailboxList.length }} mailboxes</span>
      <span>{{ totalNewMessages }} new messages</span>
      <span>{{ indicatorOnCount }} indicators on</span>
    </div>

    <div v-for="mb in mailboxList" :key="mb.mailbox" class="mailbox-card">
      <h4>{{ mb.mailbox }}</h4>
      <span :class="['indicator', mb.indicatorOn ? 'on' : 'off']">
        {{ mb.indicatorOn ? '🔴' : '⚪' }}
      </span>
      <div class="counts">
        <span>{{ mb.newMessages }} new</span>
        <span>{{ mb.oldMessages }} old</span>
      </div>
    </div>
  </div>
</template>
```

## Check Mailbox Status

```typescript
// Get mailbox status
const status = await getMailboxStatus('1001@default')
console.log('New messages:', status.newMessages)
console.log('Old messages:', status.oldMessages)
console.log('Urgent new:', status.urgentNew)
console.log('Indicator on:', status.indicatorOn)

// Check if mailbox has messages
const hasVoicemail = hasMessages('1001@default')
console.log('Has voicemail:', hasVoicemail)

// Get cached status (no API call)
const cached = getMailbox('1001@default')
```

## Control MWI Status

```typescript
// Turn on MWI lamp (set new message count)
await updateMWI('1001@default', 3, 2)
// Sets: 3 new messages, 2 old messages

// Turn off MWI lamp (clear messages)
await updateMWI('1001@default', 0, 0)

// Delete MWI state entirely
await deleteMWI('1001@default')

// Refresh all tracked mailboxes
await refresh()
```

## Real-Time Events

```typescript
const { mailboxList, totalNewMessages } = useAmiMWI(
  computed(() => ami.getClient()),
  {
    defaultContext: 'default',
    onMWIChange: (mailbox, status) => {
      console.log(`Mailbox ${mailbox} updated:`)
      console.log(`  New: ${status.newMessages}`)
      console.log(`  Indicator: ${status.indicatorOn ? 'ON' : 'OFF'}`)
    },
  }
)
```

## Key Composables

| Composable  | Purpose                           |
| ----------- | --------------------------------- |
| `useAmiMWI` | Message waiting indicator control |

## Related

- [Voicemail](/examples/voicemail)
- [System Health](/examples/system-health)
