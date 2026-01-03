<template>
  <div class="state-card">
    <h4>Call Muted</h4>
    <div class="toolbar-preview toolbar-muted">
      <div class="toolbar-section">
        <StatusIndicator
          status="green"
          label="Ready"
          :icon="CheckIcon"
          aria-label="Connection status: Ready"
          title="Ready"
        />
      </div>
      <div class="toolbar-section toolbar-center">
        <span class="state-badge active">Active</span>
        <span class="mute-indicator">MUTED</span>
        <span class="caller-name">John Smith</span>
        <span class="call-duration">02:30</span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Unmute"
          :icon="UnmuteIcon"
          button-class="btn-warning active"
          title="Unmute microphone"
          aria-label="Unmute your microphone"
        />
        <ToolbarButton
          label="Hold"
          :icon="HoldIcon"
          button-class="btn-secondary"
          title="Put call on hold"
          aria-label="Put call on hold"
        />
        <ToolbarButton
          label="Transfer"
          :icon="TransferIcon"
          button-class="btn-secondary"
          title="Transfer call to another person"
          aria-label="Transfer call to another person"
        />
        <ToolbarButton
          label="Hangup"
          :icon="HangupIcon"
          button-class="btn-danger"
          title="End call"
          aria-label="End call"
        />
      </div>
    </div>
    <p class="state-description">Microphone muted, caller cannot hear you</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, UnmuteIcon, HoldIcon, TransferIcon, HangupIcon } from '../shared/icons'
</script>
