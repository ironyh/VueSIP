<template>
  <div class="state-card">
    <h4>Incoming Call</h4>
    <div class="toolbar-preview toolbar-incoming">
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
        <span class="state-badge incoming">Incoming</span>
        <span class="caller-name">John Smith</span>
        <span class="caller-number">+1 (555) 123-4567</span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Answer"
          :icon="PhoneIcon"
          button-class="btn-success"
          title="Answer incoming call"
          aria-label="Answer incoming call from John Smith"
        />
        <ToolbarButton
          label="Decline"
          :icon="HangupIcon"
          button-class="btn-danger"
          title="Decline incoming call"
          aria-label="Decline incoming call from John Smith"
        />
      </div>
    </div>
    <p class="state-description">Incoming call with answer/decline options</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, PhoneIcon, HangupIcon } from '../shared/icons'
</script>
