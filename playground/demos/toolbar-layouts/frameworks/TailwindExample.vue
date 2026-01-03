<template>
  <div class="framework-example">
    <h4>Tailwind CSS</h4>
    <p class="fw-description">Utility-first CSS framework for rapid custom styling</p>

    <div class="toolbar-preview-tailwind">
      <div class="tw-flex tw-items-center tw-gap-4">
        <span class="tw-w-3 tw-h-3 tw-rounded-full tw-bg-emerald-500"></span>
        <span class="tw-text-sm tw-font-medium">Connected</span>
      </div>
      <div class="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-3">
        <span
          class="tw-px-2 tw-py-1 tw-bg-emerald-500/20 tw-text-emerald-400 tw-rounded tw-text-xs tw-font-semibold"
        >Active</span
        >
        <span class="tw-font-medium">John Smith</span>
        <span class="tw-font-mono tw-bg-var(--surface-900)/20 tw-px-2 tw-py-1 tw-rounded tw-text-sm"
        >02:45</span
        >
      </div>
      <div class="tw-flex tw-gap-2">
        <button
          class="tw-px-3 tw-py-1.5 tw-bg-var(--surface-0)/20 tw-border tw-border-var(--surface-0)/30 tw-rounded-md tw-text-sm tw-font-medium hover:tw-bg-var(--surface-0)/30"
        >
          Mute
        </button>
        <button
          class="tw-px-3 tw-py-1.5 tw-bg-var(--surface-0)/20 tw-border tw-border-var(--surface-0)/30 tw-rounded-md tw-text-sm tw-font-medium hover:tw-bg-var(--surface-0)/30"
        >
          Hold
        </button>
        <button
          class="tw-px-3 tw-py-1.5 tw-bg-red-500 tw-rounded-md tw-text-sm tw-font-medium hover:tw-bg-red-600"
        >
          Hangup
        </button>
      </div>
    </div>

    <div class="code-block">
      <pre><code>&lt;template&gt;
  &lt;div class="flex items-center gap-6 px-4 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-var(--surface-0)"&gt;
    &lt;!-- Status --&gt;
    &lt;div class="flex items-center gap-2"&gt;
      &lt;span :class="[
        'w-3 h-3 rounded-full',
        isConnected ? 'bg-emerald-500' : 'bg-red-500'
      ]"&gt;&lt;/span&gt;
      &lt;span class="text-sm font-medium"&gt;{{ isConnected ? 'Connected' : 'Disconnected' }}&lt;/span&gt;
    &lt;/div&gt;

    &lt;!-- Call Info --&gt;
    &lt;div v-if="session" class="flex-1 flex items-center justify-center gap-3"&gt;
      &lt;span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-semibold"&gt;
        {{ state }}
      &lt;/span&gt;
      &lt;span class="font-medium"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;span class="font-mono bg-var(--surface-900)/20 px-2 py-1 rounded text-sm"&gt;{{ formattedDuration }}&lt;/span&gt;
    &lt;/div&gt;

    &lt;!-- Controls --&gt;
    &lt;div class="flex gap-2"&gt;
      &lt;button @click="toggleMute" class="px-3 py-1.5 bg-var(--surface-0)/20 border border-var(--surface-0)/30 rounded-md text-sm font-medium transition hover:bg-var(--surface-0)/30"&gt;
        {{ isMuted ? 'Unmute' : 'Mute' }}
      &lt;/button&gt;
      &lt;button @click="toggleHold" class="px-3 py-1.5 bg-var(--surface-0)/20 border border-var(--surface-0)/30 rounded-md text-sm font-medium transition hover:bg-var(--surface-0)/30"&gt;
        {{ isOnHold ? 'Resume' : 'Hold' }}
      &lt;/button&gt;
      &lt;button @click="hangup" class="px-3 py-1.5 bg-red-500 rounded-md text-sm font-medium transition hover:bg-red-600"&gt;
        Hangup
      &lt;/button&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Tailwind CSS Framework Example
 *
 * Demonstrates how to build the VueSIP toolbar using Tailwind CSS utility classes.
 * Shows utility-first approach with responsive design and hover states.
 */
</script>
