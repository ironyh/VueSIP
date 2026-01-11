# Agent Login

Call center agent authentication and status management.

::: tip Try It Live
Run `pnpm dev` → Navigate to **AgentLoginDemo** in the playground
:::

## Overview

Agent login features:

- Agent login/logout
- Queue membership management
- Break/pause status
- Extension assignment

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAmiAgentLogin } from 'vuesip'

const { isLoggedIn, agentStatus, login, logout, pause, unpause, queues } = useAmiAgentLogin()

const agentId = ref('')
const extension = ref('')
</script>

<template>
  <div class="agent-login-demo">
    <div v-if="!isLoggedIn" class="login-form">
      <input v-model="agentId" placeholder="Agent ID" />
      <input v-model="extension" placeholder="Extension" />
      <button @click="login(agentId, extension)">Login</button>
    </div>

    <div v-else class="agent-panel">
      <p>Status: {{ agentStatus }}</p>
      <p>Queues: {{ queues.join(', ') }}</p>

      <button v-if="agentStatus === 'available'" @click="pause('Break')">Take Break</button>
      <button v-else @click="unpause()">Return from Break</button>

      <button @click="logout">Logout</button>
    </div>
  </div>
</template>
```

## Key Composables

| Composable         | Purpose              |
| ------------------ | -------------------- |
| `useAmiAgentLogin` | Agent authentication |
| `useAmiAgentStats` | Agent statistics     |

## Related

- [Queue Monitor](/examples/queue-monitor)
- [CDR Dashboard](/examples/cdr-dashboard)
- [AMI Guide](/guide/ami-cdr)
