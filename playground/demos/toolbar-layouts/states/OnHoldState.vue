<template>
  <div class="state-card">
    <h4>Call On Hold</h4>
    <div class="toolbar-preview toolbar-hold">
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
        <span class="state-badge hold">On Hold</span>
        <span class="caller-name">John Smith</span>
        <span class="call-duration">05:12</span>
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
          label="Resume"
          :icon="PlayIcon"
          button-class="btn-primary"
          title="Resume call from hold"
          aria-label="Resume call from hold"
        />
        <ToolbarButton
          label="Conference"
          :icon="ConferenceIcon"
          button-class="btn-secondary"
          title="Merge into conference call"
          aria-label="Merge into conference call"
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
    <p class="state-description">Call is paused - resume, merge into conference, or transfer</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import {
  CheckIcon,
  MicrophoneIcon,
  PlayIcon,
  ConferenceIcon,
  TransferIcon,
  HangupIcon,
} from '../shared/icons'
</script>
