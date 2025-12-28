<template>
  <div class="framework-example">
    <h4>PrimeVue</h4>
    <p class="fw-description">Rich UI component library with 90+ components for Vue 3</p>

    <div class="toolbar-preview-primevue">
      <div class="pv-status-section">
        <span class="pv-badge pv-badge-success">Connected</span>
        <span class="pv-badge pv-badge-success">Registered</span>
      </div>
      <div class="pv-call-info">
        <span class="pv-tag pv-tag-info">Active</span>
        <span class="pv-caller">John Smith</span>
        <span class="pv-duration">02:45</span>
      </div>
      <div class="pv-button-group">
        <button class="pv-button pv-button-outlined">Mute</button>
        <button class="pv-button pv-button-outlined">Hold</button>
        <button class="pv-button pv-button-danger">Hangup</button>
      </div>
    </div>

    <div class="code-block">
      <pre><code>&lt;template&gt;
  &lt;Toolbar class="call-toolbar"&gt;
    &lt;template #start&gt;
      &lt;Badge :value="isConnected ? 'Connected' : 'Disconnected'"
             :severity="isConnected ? 'success' : 'danger'" /&gt;
      &lt;Badge :value="isRegistered ? 'Registered' : 'Unregistered'"
             :severity="isRegistered ? 'success' : 'warn'" class="ml-2" /&gt;
    &lt;/template&gt;

    &lt;template #center&gt;
      &lt;div v-if="session" class="flex align-items-center gap-3"&gt;
        &lt;Tag :value="state" :severity="stateToSeverity(state)" /&gt;
        &lt;span class="font-semibold"&gt;{{ remoteDisplayName }}&lt;/span&gt;
        &lt;Chip :label="formattedDuration" icon="pi pi-clock" /&gt;
      &lt;/div&gt;
      &lt;span v-else class="text-500 font-italic"&gt;No active call&lt;/span&gt;
    &lt;/template&gt;

    &lt;template #end&gt;
      &lt;Button :label="isMuted ? 'Unmute' : 'Mute'"
              :icon="isMuted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
              :severity="isMuted ? 'warning' : 'secondary'"
              @click="toggleMute" outlined /&gt;
      &lt;Button :label="isOnHold ? 'Resume' : 'Hold'"
              :icon="isOnHold ? 'pi pi-play' : 'pi pi-pause'"
              :severity="isOnHold ? 'info' : 'secondary'"
              @click="toggleHold" outlined class="ml-2" /&gt;
      &lt;Button label="Hangup" icon="pi pi-phone" severity="danger"
              @click="hangup" class="ml-2" /&gt;
    &lt;/template&gt;
  &lt;/Toolbar&gt;
&lt;/template&gt;

&lt;script setup&gt;
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
&lt;/script&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PrimeVue Framework Example
 *
 * Demonstrates how to build the VueSIP toolbar using PrimeVue components.
 * Shows use of Toolbar, Badge, Tag, Chip, and Button components with slots.
 */
</script>
