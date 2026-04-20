<template>
  <section class="wrap-up-panel card" aria-label="Wrap-up panel">
    <header class="wrap-up-header">
      <h2>Wrap-Up</h2>
      <p>Complete disposition before returning to queue work.</p>
    </header>

    <div class="form-group">
      <label for="wrapup-disposition">Disposition</label>
      <select
        id="wrapup-disposition"
        :value="disposition || ''"
        @change="$emit('update:disposition', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">Select disposition</option>
        <option value="resolved">Resolved</option>
        <option value="callback_required">Callback Required</option>
        <option value="escalated">Escalated</option>
      </select>
    </div>

    <div class="form-group">
      <label for="wrapup-notes">Notes</label>
      <textarea
        id="wrapup-notes"
        :value="notes"
        rows="5"
        @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>

    <label class="callback-toggle">
      <input
        type="checkbox"
        :checked="callbackRequested"
        @change="$emit('update:callbackRequested', ($event.target as HTMLInputElement).checked)"
      />
      Create callback task from this interaction
    </label>

    <div class="wrap-up-actions">
      <button class="btn btn-secondary" type="button" @click="$emit('cancel')">Cancel</button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!canComplete"
        @click="$emit('complete')"
      >
        Complete Wrap-Up
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  disposition: string | null
  notes: string
  callbackRequested: boolean
  canComplete: boolean
}>()

defineEmits<{
  'update:disposition': [value: string | null]
  'update:notes': [value: string]
  'update:callbackRequested': [value: boolean]
  complete: []
  cancel: []
}>()
</script>

<style scoped>
.wrap-up-panel {
  background: white;
}

.wrap-up-header {
  margin-bottom: 1rem;
}

.wrap-up-header h2 {
  margin: 0 0 0.25rem;
}

.wrap-up-header p {
  margin: 0;
  color: #6b7280;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.375rem;
  font-weight: 600;
}

.form-group select,
.form-group textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
  font: inherit;
}

.callback-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.wrap-up-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
