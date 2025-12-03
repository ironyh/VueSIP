import type { ExampleDefinition } from './types'
import CDRDashboardDemo from '../demos/CDRDashboardDemo.vue'

export const cdrDashboardExample: ExampleDefinition = {
  id: 'cdr-dashboard',
  icon: '📈',
  title: 'CDR Dashboard',
  description: 'Call Detail Records and analytics dashboard',
  tags: ['Advanced', 'Analytics', 'Reporting'],
  component: CDRDashboardDemo,
  setupGuide: '<p>View and analyze Call Detail Records (CDR). Track call volumes, durations, answer rates, and identify calling patterns.</p>',
  codeSnippets: [
    {
      title: 'Access CDR Statistics',
      description: 'Get call analytics and metrics',
      code: `import { useCDR } from 'vuesip'

const cdr = useCDR(amiClientRef)

// Access reactive statistics
watch(cdr.stats, (stats) => {
  console.log('Total calls:', stats.totalCalls)
  console.log('Answer rate:', stats.answerRate.toFixed(1) + '%')
  console.log('Avg talk time:', stats.averageTalkTime + 's')
})`,
    },
    {
      title: 'Query CDR Records',
      description: 'Search and filter call records',
      code: `// Get records for a date range
const records = await cdr.getRecords({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  disposition: 'ANSWERED',
})

records.forEach(record => {
  console.log('Call from', record.src, 'to', record.dst)
  console.log('Duration:', record.duration, 'seconds')
})`,
    },
  ],
}
