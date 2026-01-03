<template>
  <div class="demo-layout demo-layout-right">
    <div class="demo-content">
      <p class="demo-placeholder">Main content area to the left</p>
    </div>
    <div class="demo-toolbar toolbar-right">
      <div class="toolbar-section-vertical">
        <div class="section-title">Status</div>
        <div class="status-group-vertical">
          <span class="status-dot connected"></span>
          <span class="status-label-small">Connected</span>
        </div>
      </div>
      <div class="toolbar-section-vertical">
        <div class="section-title">Call Details</div>
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
        <div class="section-title">Actions</div>
        <div class="icon-buttons">
          <button class="toolbar-btn-icon">M</button>
          <button class="toolbar-btn-icon">H</button>
          <button class="toolbar-btn-icon btn-danger">X</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Right Sidebar Layout
 *
 * Vertical toolbar on the right side with compact icon buttons.
 * Best for right-handed users or when sidebar space is limited.
 */
</script>
