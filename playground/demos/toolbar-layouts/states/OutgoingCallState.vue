<template>
  <div class="state-card">
    <h4>Outgoing Call (Dialing)</h4>
    <div class="toolbar-preview toolbar-dialing">
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
        <span class="state-badge dialing">Calling...</span>
        <span class="caller-name">+1 (555) 987-6543</span>
        <span class="dialing-indicator">
          <span class="dot-pulse"></span>
          <span class="dot-pulse"></span>
          <span class="dot-pulse"></span>
        </span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Cancel"
          :icon="HangupIcon"
          button-class="btn-danger"
          title="Cancel outgoing call"
          aria-label="Cancel outgoing call"
        />
      </div>
    </div>
    <p class="state-description">Waiting for remote party to answer</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, HangupIcon } from '../shared/icons'
</script>
