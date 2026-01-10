import type { ExampleDefinition } from './types'
import SystemHealthDemo from '../demos/SystemHealthDemo.vue'

export const systemHealthExample: ExampleDefinition = {
  id: 'system-health',
  icon: '💓',
  title: 'System Health',
  description: 'Monitor Asterisk system health and performance via AMI',
  tags: ['System', 'AMI', 'Health', 'Monitoring'],
  component: SystemHealthDemo,
  setupGuide: `<p>Monitor Asterisk system health including uptime, CPU/memory usage, active calls, and module status. Manage modules and reload configurations.</p>
<h4>Requirements</h4>
<ul>
  <li>Asterisk PBX with AMI enabled</li>
  <li>AMI WebSocket connection</li>
  <li>AMI user with system permissions</li>
</ul>`,
  codeSnippets: [
    {
      title: 'Basic Setup',
      description: 'Initialize system health monitoring',
      code: `import { useAmi, useAmiSystem } from 'vuesip'
import { computed } from 'vue'

// Connect to AMI
const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

// Initialize System composable
const {
  systemInfo,
  moduleList,
  isLoading,
  healthStatus,
  activeCalls,
  refresh,
} = useAmiSystem(computed(() => ami.getClient()))

// Refresh system data
await refresh()
console.log('System info:', systemInfo.value)
console.log('Health status:', healthStatus.value)`,
    },
    {
      title: 'Monitor System Metrics',
      description: 'Track CPU, memory, and call statistics',
      code: `// Access system information
const info = systemInfo.value
console.log('Version:', info?.version)
console.log('Uptime:', info?.uptime, 'seconds')
console.log('Active channels:', info?.activeChannels)
console.log('Calls processed:', info?.callsProcessed)

// Resource metrics
console.log('CPU usage:', info?.cpuUsage, '%')
console.log('Memory usage:', info?.memoryUsage, '%')
console.log('File descriptors:', info?.openFileDescriptors)
console.log('Thread count:', info?.threadCount)

// Health assessment
console.log('Overall health:', healthStatus.value)
// Returns: 'healthy' | 'degraded' | 'critical'`,
    },
    {
      title: 'Manage Modules',
      description: 'Load, unload, and reload Asterisk modules',
      code: `// List all modules
console.log('Loaded modules:', moduleList.value)

// Load a module
await loadModule('res_pjsip.so')

// Unload a module
await unloadModule('res_pjsip.so')

// Reload a module
await reloadModule('res_pjsip.so')

// Reload entire configuration
await reloadConfig()`,
    },
    {
      title: 'Real-Time Monitoring',
      description: 'Set up continuous health monitoring',
      code: `const { systemInfo, healthStatus } = useAmiSystem(
  computed(() => ami.getClient()),
  {
    // Auto-refresh on connect
    autoRefresh: true,

    // Polling interval (milliseconds)
    pollingInterval: 30000,

    // Health thresholds
    healthThresholds: {
      cpuWarning: 70,
      cpuCritical: 90,
      memoryWarning: 70,
      memoryCritical: 90,
    },

    // Event handlers
    onHealthChange: (status, previousStatus) => {
      if (status === 'critical') {
        console.warn('System health is critical!')
      }
    },
    onModuleChange: (module, event) => {
      console.log(\`Module \${module}: \${event}\`)
    },
  }
)`,
    },
  ],
}
