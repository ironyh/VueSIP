<template>
  <div class="framework-example">
    <h4>Quasar</h4>
    <p class="fw-description">High performance Vue framework with Material and iOS design</p>

    <div class="toolbar-preview-quasar">
      <div class="q-status">
        <span class="q-badge q-badge-positive">Connected</span>
      </div>
      <div class="q-call-info">
        <span class="q-badge q-badge-primary">Active</span>
        <span class="q-caller">John Smith</span>
        <span class="q-duration">02:45</span>
      </div>
      <div class="q-btn-group">
        <button class="q-btn q-btn-flat">Mute</button>
        <button class="q-btn q-btn-flat">Hold</button>
        <button class="q-btn q-btn-negative">Hangup</button>
      </div>
    </div>

    <div class="code-block">
      <pre><code>&lt;template&gt;
  &lt;q-toolbar class="bg-deep-purple text-var(--surface-0)"&gt;
    &lt;q-badge :color="isConnected ? 'positive' : 'negative'" class="q-mr-sm"&gt;
      {{ isConnected ? 'Connected' : 'Disconnected' }}
    &lt;/q-badge&gt;
    &lt;q-badge :color="isRegistered ? 'positive' : 'warning'"&gt;
      {{ isRegistered ? 'Registered' : 'Unregistered' }}
    &lt;/q-badge&gt;

    &lt;q-space /&gt;

    &lt;div v-if="session" class="row items-center q-gutter-sm"&gt;
      &lt;q-badge color="primary" :label="state" /&gt;
      &lt;span class="text-weight-medium"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;q-chip dense color="dark" text-color="var(--surface-0)" icon="schedule"&gt;
        {{ formattedDuration }}
      &lt;/q-chip&gt;
    &lt;/div&gt;
    &lt;span v-else class="text-grey-5"&gt;No active call&lt;/span&gt;

    &lt;q-space /&gt;

    &lt;q-btn-group flat&gt;
      &lt;q-btn flat :icon="isMuted ? 'mic_off' : 'mic'"
             :color="isMuted ? 'warning' : undefined"
             @click="toggleMute"&gt;
        &lt;q-tooltip&gt;{{ isMuted ? 'Unmute' : 'Mute' }}&lt;/q-tooltip&gt;
      &lt;/q-btn&gt;
      &lt;q-btn flat :icon="isOnHold ? 'play_arrow' : 'pause'"
             :color="isOnHold ? 'info' : undefined"
             @click="toggleHold"&gt;
        &lt;q-tooltip&gt;{{ isOnHold ? 'Resume' : 'Hold' }}&lt;/q-tooltip&gt;
      &lt;/q-btn&gt;
      &lt;q-btn flat icon="call_end" color="negative" @click="hangup"&gt;
        &lt;q-tooltip&gt;Hangup&lt;/q-tooltip&gt;
      &lt;/q-btn&gt;
    &lt;/q-btn-group&gt;
  &lt;/q-toolbar&gt;
&lt;/template&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Quasar Framework Example
 *
 * Demonstrates how to build the VueSIP toolbar using Quasar Framework components.
 * Shows use of q-toolbar, q-badge, q-chip, q-btn-group with Material icons.
 */
</script>
