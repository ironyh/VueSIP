<script setup lang="ts">
import { computed } from 'vue'
import { useCallQualityHistory } from 'vuesip'
import type { CallQualityRecord, QualityLevel } from 'vuesip'

const { records, aggregates, exportToJson, importFromJson, clearHistory, deleteRecord } =
  useCallQualityHistory()

// Format duration from seconds to mm:ss
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Format date for display
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Quality level colors
const qualityColors: Record<QualityLevel, string> = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#eab308',
  poor: '#ef4444',
  unknown: '#6b7280',
}

// Quality level labels in Swedish
const qualityLabels: Record<QualityLevel, string> = {
  excellent: 'Utmärkt',
  good: 'Bra',
  fair: 'Acceptabel',
  poor: 'Dålig',
  unknown: 'Okänd',
}

// Recent calls (last 10)
const recentCalls = computed(() => {
  return [...records.value]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 10)
})

// Quality distribution for chart
const qualityDistribution = computed(() => aggregates.value.qualityDistribution)

// Has any history
const hasHistory = computed(() => records.value.length > 0)

// Export history as JSON file
function handleExport() {
  const json = exportToJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vuesip-call-quality-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Import history from JSON file
function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      importFromJson(json)
    } catch {
      alert('Ogiltig filformat')
    }
  }
  reader.readAsText(file)
  input.value = '' // Reset
}

// Confirm and clear history
function handleClear() {
  if (confirm('Är du säker på att du vill radera all samtalshistorik?')) {
    clearHistory()
  }
}

// Delete single record
function handleDelete(callId: string) {
  if (confirm('Ta bort detta samtal från historiken?')) {
    deleteRecord(callId)
  }
}

// Trend indicator
const trendEmoji = computed(() => {
  switch (aggregates.value.trend) {
    case 'improving':
      return '📈'
    case 'degrading':
      return '📉'
    default:
      return '➡️'
  }
})

const trendLabel = computed(() => {
  switch (aggregates.value.trend) {
    case 'improving':
      return 'Förbättras'
    case 'degrading':
      return 'Försämras'
    default:
      return 'Stabilt'
  }
})
</script>

<template>
  <div class="call-quality-history">
    <!-- Header -->
    <div class="history-header">
      <h3>📞 Samtalskvalitetshistorik</h3>
      <div class="header-actions">
        <button class="btn-icon" @click="handleExport" title="Exportera historik">📥</button>
        <label class="btn-icon" title="Importera historik">
          📤
          <input type="file" accept=".json" @change="handleImport" hidden />
        </label>
        <button class="btn-icon btn-danger" @click="handleClear" title="Rensa historik">🗑️</button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!hasHistory" class="empty-state">
      <div class="empty-icon">📊</div>
      <p>Ingen samtalshistorik ännu</p>
      <p class="empty-sub">Samtalskvalitet kommer att sparas automatiskt efter varje samtal</p>
    </div>

    <template v-else>
      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ aggregates.totalCalls }}</div>
          <div class="stat-label">Totalt antal samtal</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ aggregates.avgRtt?.toFixed(0) ?? '--' }}</div>
          <div class="stat-label">Genomsnittlig RTT (ms)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ aggregates.avgPacketLoss?.toFixed(1) ?? '--' }}%</div>
          <div class="stat-label">Genomsnittlig paketförlust</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ trendEmoji }}</div>
          <div class="stat-label">Trend: {{ trendLabel }}</div>
        </div>
      </div>

      <!-- Quality Distribution -->
      <div class="distribution-section">
        <h4>Kvalitetsfördelning</h4>
        <div class="distribution-bars">
          <div
            v-for="(count, level) in qualityDistribution"
            :key="level"
            class="dist-bar"
            :style="{ backgroundColor: qualityColors[level as QualityLevel] }"
            :title="`${qualityLabels[level as QualityLevel]}: ${count} samtal`"
          >
            <span v-if="count > 0" class="dist-count">{{ count }}</span>
          </div>
        </div>
        <div class="distribution-legend">
          <span v-for="(label, level) in qualityLabels" :key="level" class="legend-item">
            <span
              class="legend-dot"
              :style="{ backgroundColor: qualityColors[level as QualityLevel] }"
            />
            {{ label }}
          </span>
        </div>
      </div>

      <!-- Recent Calls List -->
      <div class="calls-section">
        <h4>Senaste samtalen</h4>
        <div class="calls-list">
          <div v-for="call in recentCalls" :key="call.callId" class="call-item">
            <div
              class="call-quality-indicator"
              :style="{ backgroundColor: qualityColors[call.overallQuality] }"
            />
            <div class="call-info">
              <div class="call-main">
                <span class="call-number">{{ call.metadata?.remoteNumber ?? 'Okänt nummer' }}</span>
                <span class="call-duration">{{ formatDuration(call.durationSeconds) }}</span>
              </div>
              <div class="call-meta">
                <span class="call-date">{{ formatDate(call.startedAt) }}</span>
                <span
                  class="call-quality-badge"
                  :style="{
                    backgroundColor: qualityColors[call.overallQuality] + '20',
                    color: qualityColors[call.overallQuality],
                  }"
                >
                  {{ qualityLabels[call.overallQuality] }}
                </span>
              </div>
              <div v-if="call.alertCount > 0" class="call-alerts">
                ⚠️ {{ call.alertCount }} varsel under samtalet
              </div>
            </div>
            <button class="btn-delete" @click="handleDelete(call.callId)" title="Ta bort">×</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.call-quality-history {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #e5e7eb;
}

.btn-danger:hover {
  background: #fee2e2;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.empty-sub {
  font-size: 0.875rem;
  color: #9ca3af;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.distribution-section {
  margin-bottom: 24px;
}

.distribution-section h4,
.calls-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.distribution-bars {
  display: flex;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.dist-bar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 4px;
  transition: flex 0.3s;
}

.dist-count {
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.distribution-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #6b7280;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.call-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
  transition: background 0.2s;
}

.call-item:hover {
  background: #f3f4f6;
}

.call-quality-indicator {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 4px;
}

.call-info {
  flex: 1;
  min-width: 0;
}

.call-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.call-number {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.9375rem;
}

.call-duration {
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

.call-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.call-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.call-quality-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.call-alerts {
  font-size: 0.75rem;
  color: #f59e0b;
  margin-top: 4px;
}

.btn-delete {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.btn-delete:hover {
  color: #ef4444;
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .distribution-legend {
    gap: 8px;
  }

  .call-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
