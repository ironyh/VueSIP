<template>
  <div class="demo-layout demo-layout-left">
    <div class="demo-toolbar toolbar-left">
      <div class="toolbar-section-vertical">
        <div class="section-title">Status</div>
        <div class="status-group-vertical">
          <span class="status-dot connected"></span>
          <span class="status-label-small">Connected</span>
        </div>
        <div class="status-group-vertical">
          <span class="status-dot connected"></span>
          <span class="status-label-small">Registered</span>
        </div>
      </div>
      <div class="toolbar-section-vertical">
        <div class="section-title">Active Call</div>
        <div class="info-item">
          <span class="info-label">State:</span>
          <span class="state-badge-small active">Active</span>
        </div>
        <div class="info-item">
          <span class="info-label">Caller:</span>
          <span class="info-value">John Smith</span>
        </div>
        <div class="info-item">
          <span class="info-label">Duration:</span>
          <span class="info-value">02:45</span>
        </div>
      </div>
      <div class="toolbar-section-vertical">
        <div class="section-title">Controls</div>
        <button class="toolbar-btn-vertical btn-secondary">Mute</button>
        <button class="toolbar-btn-vertical btn-secondary">Hold</button>
        <button class="toolbar-btn-vertical btn-danger">Hangup</button>
      </div>
    </div>
    <div class="demo-content">
      <p class="demo-placeholder">Main content area to the right</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Left Sidebar Layout
 *
 * Vertical toolbar on the left side with detailed information display.
 * Best for applications with lots of call metadata to display.
 */
</script>
