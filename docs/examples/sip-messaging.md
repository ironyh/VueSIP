# SIP Messaging

Instant messaging over SIP MESSAGE.

::: tip Try It Live
Run `pnpm dev` → Navigate to **SipMessagingDemo** in the playground
:::

## Overview

SIP messaging features:

- Send/receive SIP messages
- Message history
- Delivery confirmation
- Typing indicators

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useMessaging } from 'vuesip'

const { conversations, sendMessage, markAsRead, onMessage } = useMessaging()

const recipient = ref('')
const messageText = ref('')

async function handleSend() {
  if (recipient.value && messageText.value) {
    await sendMessage(recipient.value, messageText.value)
    messageText.value = ''
  }
}
</script>

<template>
  <div class="messaging-demo">
    <div class="conversations">
      <div v-for="conv in conversations" :key="conv.id" class="conversation">
        <h4>{{ conv.displayName }}</h4>
        <div v-for="msg in conv.messages" :key="msg.id" :class="msg.direction">
          {{ msg.content }}
        </div>
      </div>
    </div>

    <div class="compose">
      <input v-model="recipient" placeholder="To: sip:user@example.com" />
      <input v-model="messageText" placeholder="Message..." @keyup.enter="handleSend" />
      <button @click="handleSend">Send</button>
    </div>
  </div>
</template>
```

## Key Composables

| Composable     | Purpose             |
| -------------- | ------------------- |
| `useMessaging` | SIP MESSAGE support |

## Related

- [Presence & BLF](/examples/presence)
- [Presence Guide](/guide/presence-messaging)
