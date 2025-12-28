<template>
  <div class="demo-layout demo-layout-top">
    <div class="demo-toolbar toolbar-top">
      <div class="toolbar-section">
        <span class="status-dot connected"></span>
        <span class="status-text">Connected</span>
        <span class="status-dot connected"></span>
        <span class="status-text">Registered</span>
      </div>
      <div class="toolbar-section toolbar-center">
        <span class="state-badge active">Active</span>
        <span class="caller-name">John Smith</span>
        <span class="call-duration">02:45</span>
      </div>
      <div class="toolbar-section">
        <button class="toolbar-btn btn-secondary">Mute</button>
        <button class="toolbar-btn btn-secondary">Hold</button>
        <button class="toolbar-btn btn-danger">Hangup</button>
      </div>
    </div>
    <div class="demo-content">
      <p class="demo-placeholder">Main content area below toolbar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Top Horizontal Layout
 *
 * Traditional horizontal toolbar at the top of the application.
 * Best for desktop applications and wide screens.
 */
</script>
