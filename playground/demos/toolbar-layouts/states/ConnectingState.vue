<template>
  <div class="state-card">
    <h4>Connected (Not Registered)</h4>
    <div class="toolbar-preview toolbar-connecting">
      <div class="toolbar-section">
        <StatusIndicator
          status="yellow"
          label="Connecting"
          :icon="WarningIcon"
          aria-label="Connection status: Connected but not registered - Cannot receive calls"
          title="Connected but not registered - Cannot receive calls"
        />
      </div>
      <div class="toolbar-section toolbar-center">
        <span class="connecting-text">Registering with server...</span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Cancel"
          :icon="CloseIcon"
          button-class="btn-warning"
          title="Cancel registration"
          aria-label="Cancel server registration"
        />
      </div>
    </div>
    <p class="state-description">
      Orange = Connected but not yet registered (cannot receive calls)
    </p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { WarningIcon, CloseIcon } from '../shared/icons'
</script>
