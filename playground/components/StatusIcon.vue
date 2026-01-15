<template>
  <svg
    class="status-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <template v-if="status === 'offline'">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </template>
    <template v-else-if="status === 'connecting'">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </template>
    <template v-else-if="status === 'ready'">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  status: 'offline' | 'connecting' | 'ready'
}>()
</script>
