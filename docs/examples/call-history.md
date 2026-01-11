# Call History

Call log management with search, filtering, and callback functionality.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#call-history) or run `pnpm dev` → Navigate to **CallHistoryDemo** in the playground
:::

## Overview

Call history features include:

- Incoming, outgoing, and missed call logs
- Date range filtering
- Search by number or name
- Call back functionality
- Persistent storage

## Quick Start

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallHistory, useCallSession } from 'vuesip'

const { makeCall } = useCallSession()

const {
  history,
  filteredHistory,
  addEntry,
  removeEntry,
  clearHistory,
  searchQuery,
  filterType,
  setFilter,
  setSearch,
} = useCallHistory()

// Filter options
const filterOptions = [
  { value: 'all', label: 'All Calls' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
  { value: 'missed', label: 'Missed' },
]

function callBack(entry) {
  makeCall(entry.number)
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="history-demo">
    <!-- Filters -->
    <div class="filters">
      <input
        :value="searchQuery"
        @input="setSearch($event.target.value)"
        placeholder="Search calls..."
      />

      <select :value="filterType" @change="setFilter($event.target.value)">
        <option v-for="opt in filterOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <button @click="clearHistory" class="clear-btn">Clear All</button>
    </div>

    <!-- Call List -->
    <div class="call-list">
      <div v-for="entry in filteredHistory" :key="entry.id" :class="['call-entry', entry.type]">
        <div class="call-icon">
          <span v-if="entry.type === 'incoming'">📥</span>
          <span v-else-if="entry.type === 'outgoing'">📤</span>
          <span v-else>📵</span>
        </div>

        <div class="call-info">
          <span class="number">{{ entry.displayName || entry.number }}</span>
          <span class="date">{{ formatDate(entry.timestamp) }}</span>
        </div>

        <div class="call-meta">
          <span class="duration">{{ formatDuration(entry.duration) }}</span>
        </div>

        <div class="call-actions">
          <button @click="callBack(entry)">Call</button>
          <button @click="removeEntry(entry.id)">Delete</button>
        </div>
      </div>

      <div v-if="filteredHistory.length === 0" class="empty">No calls found</div>
    </div>
  </div>
</template>

<style scoped>
.call-entry {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.call-entry.missed {
  background: #fef2f2;
}

.call-entry.missed .number {
  color: #dc2626;
}
</style>
```

## Features

- **Call Logging**: Automatic logging of all calls
- **Call Types**: Incoming, outgoing, missed
- **Filtering**: Filter by call type
- **Search**: Search by number or contact name
- **Callback**: One-click to return a call
- **Persistence**: Stored in localStorage
- **Date Range**: Filter by time period

## Key Composables

| Composable       | Purpose                    |
| ---------------- | -------------------------- |
| `useCallHistory` | Call log management        |
| `useCallSession` | For callback functionality |

## Call Entry Structure

```typescript
interface CallHistoryEntry {
  id: string
  number: string
  displayName?: string
  type: 'incoming' | 'outgoing' | 'missed'
  timestamp: number // Unix timestamp
  duration: number // Seconds
  answered: boolean
}
```

## Filtering API

```typescript
const {
  filterType, // Ref<'all' | 'incoming' | 'outgoing' | 'missed'>
  searchQuery, // Ref<string>
  dateRange, // Ref<{ start: Date, end: Date } | null>

  setFilter, // (type: FilterType) => void
  setSearch, // (query: string) => void
  setDateRange, // (range: DateRange | null) => void
} = useCallHistory()
```

## Manual Entry Management

```typescript
const { addEntry, removeEntry, clearHistory } = useCallHistory()

// Add a call manually
addEntry({
  number: '+1234567890',
  displayName: 'John Doe',
  type: 'incoming',
  timestamp: Date.now(),
  duration: 180,
  answered: true,
})

// Remove specific entry
removeEntry('entry-id')

// Clear all history
clearHistory()
```

## Storage Configuration

```typescript
const history = useCallHistory({
  storageKey: 'vuesip-call-history',
  maxEntries: 100, // Maximum stored entries
  persistOnUnload: true, // Save before page unload
})
```

## Related

- [Basic Call](/examples/basic-call)
- [Settings Persistence](/examples/settings)
- [Call History Guide](/guide/call-history)
- [API: useCallHistory](/api/composables#usecallhistory)
