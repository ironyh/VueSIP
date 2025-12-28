<template>
  <div class="state-card">
    <h4>Disconnected</h4>
    <div class="toolbar-preview toolbar-disconnected">
      <div class="toolbar-section">
        <StatusIndicator
          status="red"
          label="Offline"
          :icon="ErrorIcon"
          aria-label="Connection status: Disconnected - Not connected to SIP server"
          title="Disconnected - Not connected to SIP server"
        />
      </div>
      <div class="toolbar-section toolbar-center">
        <span class="disconnected-text">Not connected to server</span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Connect"
          :icon="ArrowRightIcon"
          button-class="btn-primary"
          title="Connect to SIP server"
          aria-label="Connect to SIP server"
        />
      </div>
    </div>
    <p class="state-description">Red = No connection to SIP server</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { ErrorIcon, ArrowRightIcon } from '../shared/icons'
</script>
