<template>
  <div class="state-card">
    <h4>Transfer in Progress</h4>
    <div class="toolbar-preview toolbar-transfer">
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
        <span class="state-badge transfer">Transferring</span>
        <span class="transfer-info">
          <span class="from-caller">John Smith</span>
          <span class="transfer-arrow">-></span>
          <span class="to-caller">Support Queue</span>
        </span>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          label="Cancel"
          :icon="CloseIcon"
          button-class="btn-warning"
          title="Cancel transfer"
          aria-label="Cancel transfer"
        />
      </div>
    </div>
    <p class="state-description">Blind or attended transfer in progress</p>
  </div>
</template>

<script setup lang="ts">
import StatusIndicator from '../shared/StatusIndicator.vue'
import ToolbarButton from '../shared/ToolbarButton.vue'
import { CheckIcon, CloseIcon } from '../shared/icons'
</script>
