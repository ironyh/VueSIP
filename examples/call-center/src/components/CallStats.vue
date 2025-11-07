<template>
  <div class="call-stats card">
    <h2>Statistics Dashboard</h2>

    <!-- Summary Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.totalCalls }}</div>
          <div class="stat-label">Total Calls</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.answeredCalls }}</div>
          <div class="stat-label">Answered</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.missedCalls }}</div>
          <div class="stat-label">Missed</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon purple">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatDuration(statistics.averageDuration) }}</div>
          <div class="stat-label">Avg Duration</div>
        </div>
      </div>
    </div>

    <!-- Call Distribution -->
    <div class="distribution-section">
      <h3>Call Distribution</h3>
      <div class="distribution-bars">
        <div class="bar-item">
          <div class="bar-label">
            <span>Incoming</span>
            <span class="bar-value">{{ statistics.incomingCalls }}</span>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill incoming"
              :style="{ width: `${getPercentage(statistics.incomingCalls)}%` }"
            ></div>
          </div>
        </div>

        <div class="bar-item">
          <div class="bar-label">
            <span>Outgoing</span>
            <span class="bar-value">{{ statistics.outgoingCalls }}</span>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill outgoing"
              :style="{ width: `${getPercentage(statistics.outgoingCalls)}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Frequent Contacts -->
    <div v-if="statistics.frequentContacts && statistics.frequentContacts.length > 0" class="frequent-contacts">
      <h3>Frequent Contacts</h3>
      <div class="contact-list">
        <div
          v-for="contact in statistics.frequentContacts"
          :key="contact.uri"
          class="contact-item"
        >
          <div class="contact-info">
            <div class="contact-name">{{ contact.displayName || formatUri(contact.uri) }}</div>
            <div class="contact-uri">{{ formatUri(contact.uri) }}</div>
          </div>
          <div class="contact-count">{{ contact.count }} calls</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  statistics: {
    totalCalls: number
    incomingCalls: number
    outgoingCalls: number
    answeredCalls: number
    missedCalls: number
    totalDuration: number
    averageDuration: number
    videoCalls: number
    frequentContacts?: Array<{
      uri: string
      displayName?: string
      count: number
    }>
  }
}>()

// ============================================================================
// Methods
// ============================================================================

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0s'

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

const formatUri = (uri: string): string => {
  const match = uri.match(/sip:([^@]+)/)
  return match ? match[1] : uri
}

const getPercentage = (value: number): number => {
  if (props.statistics.totalCalls === 0) return 0
  return Math.round((value / props.statistics.totalCalls) * 100)
}
</script>

<style scoped>
.call-stats {
  background: white;
}

.call-stats h2 {
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
  color: #111827;
}

.call-stats h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #374151;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.blue {
  background: #dbeafe;
  color: #1e40af;
}

.stat-icon.green {
  background: #d1fae5;
  color: #065f46;
}

.stat-icon.red {
  background: #fee2e2;
  color: #991b1b;
}

.stat-icon.purple {
  background: #ede9fe;
  color: #5b21b6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 600;
  color: #111827;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.distribution-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bar-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.bar-value {
  color: #6b7280;
}

.bar-track {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar-fill.incoming {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.bar-fill.outgoing {
  background: linear-gradient(90deg, #10b981, #059669);
}

.frequent-contacts {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.contact-info {
  flex: 1;
}

.contact-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.125rem;
}

.contact-uri {
  font-size: 0.75rem;
  color: #6b7280;
}

.contact-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #3b82f6;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
