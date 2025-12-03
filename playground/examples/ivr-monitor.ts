import type { ExampleDefinition } from './types'
import IvrMonitorDemo from '../demos/IVRMonitorDemo.vue'

export const ivrMonitorExample: ExampleDefinition = {
  id: 'ivr-monitor',
  icon: '🎛️',
  title: 'IVR Monitor',
  description: 'Monitor IVR menu navigation and caller paths',
  tags: ['PBX', 'IVR', 'Analytics'],
  component: IvrMonitorDemo,
  setupGuide: '<p>Track how callers navigate through IVR menus. Monitor option selections and identify optimization opportunities.</p>',
  codeSnippets: [
    {
      title: 'Monitor IVR Events',
      description: 'Track caller IVR navigation',
      code: `import { useIvrMonitor } from 'vuesip'

const ivrMonitor = useIvrMonitor(amiClientRef, {
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

// Get current callers in IVR
const callersInIvr = ivrMonitor.activeCallers.value
callersInIvr.forEach(caller => {
  console.log('Caller:', caller.number)
  console.log('Current menu:', caller.currentMenu)
  console.log('Path:', caller.path.join(' -> '))
})`,
    },
    {
      title: 'IVR Analytics',
      description: 'Analyze IVR usage patterns',
      code: `// Get IVR statistics
const stats = await ivrMonitor.getStats({
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
})

console.log('Total IVR calls:', stats.totalCalls)
console.log('Average time in IVR:', stats.avgTimeInIvr)
console.log('Abandonment rate:', stats.abandonmentRate + '%')

// Most selected options
stats.optionBreakdown.forEach(opt => {
  console.log('Option', opt.option + ':', opt.count, 'selections')
})

// Identify problem areas
const bottlenecks = ivrMonitor.identifyBottlenecks()
bottlenecks.forEach(b => {
  console.log('Bottleneck at:', b.menu, 'Drop rate:', b.dropRate + '%')
})`,
    },
  ],
}
