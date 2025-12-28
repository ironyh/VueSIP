<template>
  <div class="state-card">
    <h4>Active Call (In Progress)</h4>
    <div class="toolbar-preview toolbar-active">
      <div class="toolbar-section">
        <StatusIndicator
          status="green"
          label="Ready"
          :icon="CheckIcon"
          aria-label="Connection status: Ready"
          title="Ready for calls"
        />
      </div>
      <div class="toolbar-section toolbar-center">
        <span class="state-badge active">Active</span>
        <span class="caller-name">John Smith</span>
        <span class="call-duration">03:45</span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Mute"
          :icon="MicrophoneIcon"
          button-class="btn-secondary"
          title="Mute microphone"
          aria-label="Mute your microphone"
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
          title="Transfer call"
          aria-label="Transfer call to another person"
        />
        <ToolbarButton
          label="Hangup"
          :icon="HangupIcon"
          button-class="btn-danger"
          title="End call"
          aria-label="End current call"
        />
      </div>
    </div>
    <p class="state-description">Call in progress with full control options</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, MicrophoneIcon, HoldIcon, TransferIcon, HangupIcon } from '../shared/icons'
</script>
