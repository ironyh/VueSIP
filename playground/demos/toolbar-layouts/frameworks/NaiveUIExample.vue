<template>
  <div class="framework-example">
    <h4>Naive UI</h4>
    <p class="fw-description">Modern, lightweight, and customizable Vue 3 component library</p>

    <div class="toolbar-preview-naive">
      <div class="n-status">
        <span class="n-tag n-tag-success">Connected</span>
      </div>
      <div class="n-call-info">
        <span class="n-tag n-tag-info">Active</span>
        <span class="n-caller">John Smith</span>
        <span class="n-duration">02:45</span>
      </div>
      <div class="n-btn-group">
        <button class="n-button n-button-default">Mute</button>
        <button class="n-button n-button-default">Hold</button>
        <button class="n-button n-button-error">Hangup</button>
      </div>
    </div>

    <div class="code-block">
      <pre><code>&lt;template&gt;
  &lt;n-layout-header class="call-toolbar"&gt;
    &lt;n-space align="center"&gt;
      &lt;n-tag :type="isConnected ? 'success' : 'error'" size="small"&gt;
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      &lt;/n-tag&gt;
      &lt;n-tag :type="isRegistered ? 'success' : 'warning'" size="small"&gt;
        {{ isRegistered ? 'Registered' : 'Unregistered' }}
      &lt;/n-tag&gt;
    &lt;/n-space&gt;

    &lt;n-space v-if="session" align="center" justify="center" class="call-info"&gt;
      &lt;n-tag type="info"&gt;{{ state }}&lt;/n-tag&gt;
      &lt;n-text strong&gt;{{ remoteDisplayName }}&lt;/n-text&gt;
      &lt;n-tag :bordered="false"&gt;
        &lt;template #icon&gt;&lt;n-icon :component="TimeOutline" /&gt;&lt;/template&gt;
        {{ formattedDuration }}
      &lt;/n-tag&gt;
    &lt;/n-space&gt;
    &lt;n-text v-else depth="3"&gt;No active call&lt;/n-text&gt;

    &lt;n-space&gt;
      &lt;n-button :type="isMuted ? 'warning' : 'default'"
                secondary @click="toggleMute"&gt;
        &lt;template #icon&gt;
          &lt;n-icon :component="isMuted ? MicOffOutline : MicOutline" /&gt;
        &lt;/template&gt;
        {{ isMuted ? 'Unmute' : 'Mute' }}
      &lt;/n-button&gt;
      &lt;n-button :type="isOnHold ? 'info' : 'default'"
                secondary @click="toggleHold"&gt;
        &lt;template #icon&gt;
          &lt;n-icon :component="isOnHold ? PlayOutline : PauseOutline" /&gt;
        &lt;/template&gt;
        {{ isOnHold ? 'Resume' : 'Hold' }}
      &lt;/n-button&gt;
      &lt;n-button type="error" @click="hangup"&gt;
        &lt;template #icon&gt;&lt;n-icon :component="CallOutline" /&gt;&lt;/template&gt;
        Hangup
      &lt;/n-button&gt;
    &lt;/n-space&gt;
  &lt;/n-layout-header&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { TimeOutline, MicOutline, MicOffOutline, PlayOutline, PauseOutline, CallOutline } from '@vicons/ionicons5'
&lt;/script&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Naive UI Framework Example
 *
 * Demonstrates how to build the VueSIP toolbar using Naive UI components.
 * Shows use of n-layout-header, n-space, n-tag, n-button with Ionicons 5.
 */
</script>
