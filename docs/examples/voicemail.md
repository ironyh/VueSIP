# Voicemail

Voicemail box management.

::: tip Try It Live
Run `pnpm dev` → Navigate to **VoicemailDemo** in the playground
:::

## Overview

Voicemail features:

- Message list
- Playback controls
- Delete/archive messages
- New message notifications

## Quick Start

```vue
<script setup lang="ts">
import { useAmiVoicemail } from 'vuesip'

const { messages, unreadCount, playMessage, deleteMessage, markAsRead, refresh } = useAmiVoicemail()
</script>

<template>
  <div class="voicemail-demo">
    <h3>Voicemail ({{ unreadCount }} new)</h3>

    <div class="message-list">
      <div v-for="msg in messages" :key="msg.id" :class="['message', { unread: !msg.read }]">
        <span class="from">{{ msg.callerName || msg.callerNumber }}</span>
        <span class="date">{{ new Date(msg.timestamp).toLocaleString() }}</span>
        <span class="duration">{{ msg.duration }}s</span>
        <button @click="playMessage(msg.id)">Play</button>
        <button @click="deleteMessage(msg.id)">Delete</button>
      </div>
    </div>
  </div>
</template>
```

## Key Composables

| Composable        | Purpose              |
| ----------------- | -------------------- |
| `useAmiVoicemail` | Voicemail management |

## Related

- [Basic Call](/examples/basic-call)
- [Voicemail Guide](/guide/voicemail)
