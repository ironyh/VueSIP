<template>
  <div class="framework-example">
    <h4>Element Plus</h4>
    <p class="fw-description">Desktop UI library with elegant design for Vue 3</p>

    <div class="toolbar-preview-element">
      <div class="el-status">
        <span class="el-tag el-tag-success">Connected</span>
      </div>
      <div class="el-call-info">
        <span class="el-tag el-tag-primary">Active</span>
        <span class="el-caller">John Smith</span>
        <span class="el-duration">02:45</span>
      </div>
      <div class="el-btn-group">
        <button class="el-button el-button-default">Mute</button>
        <button class="el-button el-button-default">Hold</button>
        <button class="el-button el-button-danger">Hangup</button>
      </div>
    </div>

    <div class="code-block">
      <pre><code>&lt;template&gt;
  &lt;div class="call-toolbar"&gt;
    &lt;el-space&gt;
      &lt;el-tag :type="isConnected ? 'success' : 'danger'" effect="dark"&gt;
        &lt;el-icon&gt;&lt;Connection /&gt;&lt;/el-icon&gt;
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      &lt;/el-tag&gt;
      &lt;el-tag :type="isRegistered ? 'success' : 'warning'" effect="dark"&gt;
        {{ isRegistered ? 'Registered' : 'Unregistered' }}
      &lt;/el-tag&gt;
    &lt;/el-space&gt;

    &lt;div v-if="session" class="call-info"&gt;
      &lt;el-tag type="primary"&gt;{{ state }}&lt;/el-tag&gt;
      &lt;span class="caller-name"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;el-tag type="info" effect="plain"&gt;
        &lt;el-icon&gt;&lt;Timer /&gt;&lt;/el-icon&gt;
        {{ formattedDuration }}
      &lt;/el-tag&gt;
    &lt;/div&gt;
    &lt;el-text v-else type="info"&gt;No active call&lt;/el-text&gt;

    &lt;el-button-group&gt;
      &lt;el-button :type="isMuted ? 'warning' : 'default'" @click="toggleMute"&gt;
        &lt;el-icon&gt;&lt;Microphone v-if="!isMuted" /&gt;&lt;Mute v-else /&gt;&lt;/el-icon&gt;
        {{ isMuted ? 'Unmute' : 'Mute' }}
      &lt;/el-button&gt;
      &lt;el-button :type="isOnHold ? 'primary' : 'default'" @click="toggleHold"&gt;
        &lt;el-icon&gt;&lt;VideoPlay v-if="isOnHold" /&gt;&lt;VideoPause v-else /&gt;&lt;/el-icon&gt;
        {{ isOnHold ? 'Resume' : 'Hold' }}
      &lt;/el-button&gt;
      &lt;el-button type="danger" @click="hangup"&gt;
        &lt;el-icon&gt;&lt;Phone /&gt;&lt;/el-icon&gt;
        Hangup
      &lt;/el-button&gt;
    &lt;/el-button-group&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { Connection, Timer, Microphone, Mute, VideoPlay, VideoPause, Phone } from '@element-plus/icons-vue'
&lt;/script&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Element Plus Framework Example
 *
 * Demonstrates how to build the VueSIP toolbar using Element Plus components.
 * Shows use of el-space, el-tag, el-button-group with Element Plus icons.
 */
</script>
