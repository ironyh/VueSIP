<template>
  <div class="state-card">
    <h4>Incoming Call (While On Call)</h4>
    <div class="toolbar-preview toolbar-incoming-oncall">
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
        <span class="caller-name">John Smith</span>
        <span class="call-duration">03:45</span>
        <span class="incoming-badge">
          <span class="incoming-pulse"></span>
          Incoming: Jane Doe
        </span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Answer + Hold"
          :icon="PhoneIcon"
          button-class="btn-success btn-sm"
          title="Answer incoming call and put current call on hold"
          aria-label="Answer incoming call and put current call on hold"
        />
        <ToolbarButton
          label="Answer + Conference"
          :icon="ConferenceIcon"
          button-class="btn-success btn-sm"
          title="Answer incoming call and merge into conference"
          aria-label="Answer incoming call and merge into conference"
        />
        <ToolbarButton
          label="Ignore"
          :icon="IgnoreIcon"
          button-class="btn-warning btn-sm"
          title="Ignore incoming call"
          aria-label="Ignore incoming call"
        />
        <ToolbarButton
          label="Hangup"
          :icon="HangupIcon"
          button-class="btn-danger"
          title="End current call"
          aria-label="End current call"
        />
      </div>
    </div>
    <p class="state-description">
      Call waiting - answer and hold current, merge into conference, or ignore
    </p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, PhoneIcon, ConferenceIcon, IgnoreIcon, HangupIcon } from '../shared/icons'
</script>
