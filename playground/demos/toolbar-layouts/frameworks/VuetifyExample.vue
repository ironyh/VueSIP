<template>
  <div class="framework-example">
    <h4>Vuetify</h4>
    <p class="fw-description">Material Design component framework for Vue 3</p>

    <div class="toolbar-preview-vuetify">
      <div class="v-status">
        <span class="v-chip v-chip-success">Connected</span>
      </div>
      <div class="v-call-info">
        <span class="v-chip v-chip-primary">Active</span>
        <span class="v-caller">John Smith</span>
        <span class="v-duration">02:45</span>
      </div>
      <div class="v-btn-group">
        <button class="v-btn v-btn-text">Mute</button>
        <button class="v-btn v-btn-text">Hold</button>
        <button class="v-btn v-btn-error">Hangup</button>
      </div>
    </div>

    <div class="code-block">
      <pre><code>&lt;template&gt;
  &lt;v-app-bar color="deep-purple" density="comfortable"&gt;
    &lt;template #prepend&gt;
      &lt;v-chip :color="isConnected ? 'success' : 'error'" size="small" class="mr-2"&gt;
        &lt;v-icon start :icon="isConnected ? 'mdi-wifi' : 'mdi-wifi-off'" /&gt;
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      &lt;/v-chip&gt;
    &lt;/template&gt;

    &lt;v-app-bar-title v-if="session" class="text-center"&gt;
      &lt;v-chip color="primary" size="small" class="mr-2"&gt;{{ state }}&lt;/v-chip&gt;
      &lt;span class="font-weight-medium"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;v-chip variant="outlined" size="small" class="ml-2"&gt;
        &lt;v-icon start icon="mdi-timer" /&gt;
        {{ formattedDuration }}
      &lt;/v-chip&gt;
    &lt;/v-app-bar-title&gt;
    &lt;v-app-bar-title v-else class="text-center text-grey-lighten-1"&gt;
      No active call
    &lt;/v-app-bar-title&gt;

    &lt;template #append&gt;
      &lt;v-btn :icon="isMuted ? 'mdi-microphone-off' : 'mdi-microphone'"
             :color="isMuted ? 'warning' : undefined"
             variant="text" @click="toggleMute" /&gt;
      &lt;v-btn :icon="isOnHold ? 'mdi-play' : 'mdi-pause'"
             :color="isOnHold ? 'info' : undefined"
             variant="text" @click="toggleHold" /&gt;
      &lt;v-btn icon="mdi-phone-hangup" color="error" @click="hangup" /&gt;
    &lt;/template&gt;
  &lt;/v-app-bar&gt;
&lt;/template&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Vuetify Framework Example
 *
 * Demonstrates how to build the VueSIP toolbar using Vuetify Material Design components.
 * Shows use of v-app-bar, v-chip, v-btn with Material Design icons.
 */
</script>
