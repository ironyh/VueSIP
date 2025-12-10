import type { ExampleDefinition } from './types'
import IvrMonitorDemo from '../demos/IVRMonitorDemo.vue'

export const ivrMonitorExample: ExampleDefinition = {
  id: 'ivr-monitor',
  icon: '🎛️',
  title: 'IVR Monitor',
  description: 'Monitor IVR menu navigation and caller paths',
  category: 'ami',
  tags: ['PBX', 'IVR', 'Analytics'],
  component: IvrMonitorDemo,
  setupGuide: `<p>Track how callers navigate through IVR menus. Monitor option selections and identify optimization opportunities via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the IVR monitor composable for analytics</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & IVR Monitor',
      description: 'Connect to AMI and access IVR monitoring',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the IVR monitor composable via unified service
const ivrMonitor = amiService.useIVR({
  onMenuEntry: (caller, menu) => {
    console.log('Caller', caller, 'entered menu:', menu)
  },
  onOptionSelected: (caller, option) => {
    console.log('Caller selected option:', option)
  },
  onIvrExit: (caller, exitPoint) => {
    console.log('Caller exited IVR at:', exitPoint)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Monitor IVR Events',
      description: 'Track caller IVR navigation in real-time',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()
const ivrMonitor = amiService.useIVR()

// Get current callers in IVR
const callersInIvr = ivrMonitor.activeCallers.value
callersInIvr.forEach(caller => {
  console.log('Caller:', caller.number)
  console.log('Current menu:', caller.currentMenu)
  console.log('Path:', caller.path.join(' -> '))
  console.log('Time in IVR:', caller.timeInIvr, 'seconds')
})

// Watch for new IVR entries
watch(ivrMonitor.activeCallers, (callers) => {
  console.log('Active callers in IVR:', callers.size)
}, { deep: true })

// Listen for IVR events via AMI
amiService.on('VarSet', (event) => {
  if (event.Variable?.startsWith('IVR_')) {
    console.log('IVR event:', event.Variable, '=', event.Value)
  }
})`,
    },
    {
      title: 'IVR Analytics',
      description: 'Analyze IVR usage patterns',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ivrMonitor = amiService.useIVR()

// Get IVR statistics
const stats = await ivrMonitor.getStats({
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
})

console.log('Total IVR calls:', stats.totalCalls)
console.log('Average time in IVR:', stats.avgTimeInIvr, 'seconds')
console.log('Abandonment rate:', stats.abandonmentRate + '%')
console.log('First-option resolution:', stats.firstOptionResolution + '%')

// Most selected options
stats.optionBreakdown.forEach(opt => {
  console.log('Option', opt.option + ':', opt.count, 'selections', \`(\${opt.percentage}%)\`)
})

// Menu distribution
stats.menuDistribution.forEach(menu => {
  console.log('Menu', menu.name + ':', menu.visits, 'visits')
})

// Identify problem areas
const bottlenecks = ivrMonitor.identifyBottlenecks()
bottlenecks.forEach(b => {
  console.log('Bottleneck at:', b.menu)
  console.log('  Drop rate:', b.dropRate + '%')
  console.log('  Avg time:', b.avgTime, 'seconds')
  console.log('  Suggestion:', b.recommendation)
})`,
    },
    {
      title: 'IVR Data Model',
      description: 'Data structures for IVR monitoring',
      code: `interface IvrCaller {
  id: string
  number: string
  callerName?: string
  channel: string
  enteredAt: Date
  currentMenu: string
  previousMenus: string[]
  path: IvrPathEntry[]
  selections: IvrSelection[]
  timeInIvr: number
  status: 'navigating' | 'transferred' | 'abandoned' | 'completed'
}

interface IvrPathEntry {
  menu: string
  enteredAt: Date
  exitedAt?: Date
  selection?: string
  duration: number
}

interface IvrSelection {
  menu: string
  option: string
  timestamp: Date
  dtmfInput: string
}

interface IvrMenu {
  id: string
  name: string
  description: string
  options: IvrOption[]
  timeout: number
  maxRetries: number
  greeting: string
}

interface IvrOption {
  digit: string
  label: string
  destination: string  // menu ID, queue, extension, etc.
  type: 'menu' | 'queue' | 'extension' | 'voicemail' | 'external'
}

interface IvrStats {
  totalCalls: number
  completedCalls: number
  abandonedCalls: number
  avgTimeInIvr: number
  abandonmentRate: number
  firstOptionResolution: number
  optionBreakdown: OptionStats[]
  menuDistribution: MenuStats[]
  peakHours: HourlyStats[]
}`,
    },
    {
      title: 'IVR Path Analysis',
      description: 'Analyze caller paths through IVR',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ivrMonitor = amiService.useIVR()

// Get common paths through IVR
const getCommonPaths = async (limit: number = 10) => {
  const paths = await ivrMonitor.analyzePaths({
    startDate: new Date(Date.now() - 30 * 86400000), // Last 30 days
    minOccurrences: 10,
  })

  return paths
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(path => ({
      route: path.path.join(' → '),
      count: path.count,
      avgDuration: path.avgDuration,
      successRate: path.completionRate,
    }))
}

// Identify drop-off points
const getDropOffPoints = async () => {
  const dropOffs = await ivrMonitor.analyzeDropOffs()

  return dropOffs.map(point => ({
    menu: point.menu,
    dropCount: point.abandonedCount,
    totalVisits: point.totalVisits,
    dropRate: ((point.abandonedCount / point.totalVisits) * 100).toFixed(1),
    avgTimeBeforeDrop: point.avgTimeBeforeDrop,
  }))
}

// Analyze option selection patterns
const getSelectionPatterns = async (menuId: string) => {
  const patterns = await ivrMonitor.analyzeSelections(menuId)

  return {
    menu: menuId,
    totalSelections: patterns.total,
    byOption: patterns.options.map(opt => ({
      option: opt.digit,
      label: opt.label,
      count: opt.count,
      percentage: ((opt.count / patterns.total) * 100).toFixed(1),
    })),
    timeouts: patterns.timeouts,
    invalidInputs: patterns.invalidInputs,
  }
}`,
    },
    {
      title: 'IVR Optimization Recommendations',
      description: 'Get suggestions to improve IVR flow',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ivrMonitor = amiService.useIVR()

interface OptimizationRecommendation {
  type: 'reorder' | 'combine' | 'shortcut' | 'simplify' | 'remove'
  priority: 'high' | 'medium' | 'low'
  menu: string
  description: string
  expectedImprovement: string
  currentMetric: number
  estimatedMetric: number
}

const getOptimizationRecommendations = async (): Promise<OptimizationRecommendation[]> => {
  const stats = await ivrMonitor.getStats({
    startDate: new Date(Date.now() - 30 * 86400000),
    endDate: new Date(),
  })

  const recommendations: OptimizationRecommendation[] = []

  // Check for high abandonment menus
  const dropOffs = await ivrMonitor.analyzeDropOffs()
  dropOffs
    .filter(d => (d.abandonedCount / d.totalVisits) > 0.2)
    .forEach(d => {
      recommendations.push({
        type: 'simplify',
        priority: 'high',
        menu: d.menu,
        description: \`Menu "\${d.menu}" has high abandonment rate\`,
        expectedImprovement: 'Reduce options or add shortcut to agent',
        currentMetric: (d.abandonedCount / d.totalVisits) * 100,
        estimatedMetric: 10,
      })
    })

  // Check for rarely used options
  const menus = await ivrMonitor.getMenus()
  for (const menu of menus) {
    const selections = await ivrMonitor.analyzeSelections(menu.id)
    selections.options
      .filter(opt => (opt.count / selections.total) < 0.02)
      .forEach(opt => {
        recommendations.push({
          type: 'remove',
          priority: 'low',
          menu: menu.id,
          description: \`Option "\${opt.label}" is rarely selected (<2%)\`,
          expectedImprovement: 'Simplify menu by removing or combining',
          currentMetric: (opt.count / selections.total) * 100,
          estimatedMetric: 0,
        })
      })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}`,
    },
    {
      title: 'IVR Monitor UI Component',
      description: 'Visual IVR monitoring dashboard',
      code: `<template>
  <div class="ivr-monitor">
    <!-- Live Callers -->
    <div class="live-callers">
      <h4>🎛️ Live IVR Callers ({{ activeCallers.length }})</h4>
      <div
        v-for="caller in activeCallers"
        :key="caller.id"
        class="caller-card"
      >
        <div class="caller-info">
          <span class="number">{{ caller.number }}</span>
          <span class="time">{{ formatDuration(caller.timeInIvr) }}</span>
        </div>
        <div class="caller-path">
          <span
            v-for="(step, idx) in caller.path"
            :key="idx"
            class="path-step"
          >
            {{ step.menu }}
            <span v-if="step.selection" class="selection">[{{ step.selection }}]</span>
            <span v-if="idx < caller.path.length - 1">→</span>
          </span>
        </div>
        <div class="current-menu">
          📍 Current: <strong>{{ caller.currentMenu }}</strong>
        </div>
      </div>
    </div>

    <!-- IVR Flow Visualization -->
    <div class="ivr-flow">
      <h4>📊 IVR Flow Analysis</h4>
      <div class="menu-stats">
        <div
          v-for="menu in menuStats"
          :key="menu.id"
          class="menu-card"
          :class="{ bottleneck: menu.dropRate > 15 }"
        >
          <div class="menu-header">
            <span class="menu-name">{{ menu.name }}</span>
            <span class="visit-count">{{ menu.visits }} visits</span>
          </div>
          <div class="menu-metrics">
            <div class="metric">
              <span class="label">Avg Time</span>
              <span class="value">{{ menu.avgTime }}s</span>
            </div>
            <div class="metric" :class="{ warning: menu.dropRate > 15 }">
              <span class="label">Drop Rate</span>
              <span class="value">{{ menu.dropRate }}%</span>
            </div>
          </div>
          <div class="option-breakdown">
            <div
              v-for="opt in menu.options"
              :key="opt.digit"
              class="option-bar"
              :style="{ width: opt.percentage + '%' }"
            >
              {{ opt.digit }}: {{ opt.percentage }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="recommendations" v-if="recommendations.length > 0">
      <h4>💡 Optimization Recommendations</h4>
      <div
        v-for="rec in recommendations"
        :key="rec.menu + rec.type"
        class="recommendation-card"
        :class="rec.priority"
      >
        <span class="badge">{{ rec.priority }}</span>
        <p>{{ rec.description }}</p>
        <span class="improvement">{{ rec.expectedImprovement }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ivrMonitor = amiService.useIVR()

const activeCallers = computed(() =>
  Array.from(ivrMonitor.activeCallers.value.values())
)
const menuStats = ref([])
const recommendations = ref([])

onMounted(async () => {
  menuStats.value = await ivrMonitor.getMenuStats()
  recommendations.value = await getOptimizationRecommendations()
})
</script>`,
    },
  ],
}
