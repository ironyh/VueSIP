<template>
  <div class="state-card">
    <h4>Ready (Idle)</h4>
    <div class="toolbar-preview toolbar-idle">
      <div class="toolbar-section">
        <StatusIndicator
          status="green"
          label="Ready"
          :icon="CheckIcon"
          :pulse-animation="true"
          aria-label="Connection status: Ready to make and receive calls"
          title="Ready to make and receive calls"
        />
      </div>
      <div class="toolbar-section toolbar-center">
        <span class="ready-text">Ready for calls</span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Settings"
          :icon="SettingsIcon"
          button-class="btn-secondary"
          title="Open settings"
          aria-label="Open call settings"
        />
      </div>
    </div>
    <p class="state-description">Green = Ready to make/receive calls</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, SettingsIcon } from '../shared/icons'
</script>
