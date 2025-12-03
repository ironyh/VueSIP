import type { ExampleDefinition } from './types'
import BlacklistDemo from '../demos/BlacklistDemo.vue'

export const blacklistExample: ExampleDefinition = {
  id: 'blacklist',
  icon: '🚫',
  title: 'Call Blacklist',
  description: 'Block unwanted callers and manage blacklist rules',
  tags: ['Security', 'Blocking', 'Filters'],
  component: BlacklistDemo,
  setupGuide: '<p>Manage call blocking rules to prevent unwanted calls. Add numbers to blacklist and configure blocking behavior.</p>',
  codeSnippets: [
    {
      title: 'Manage Blacklist',
      description: 'Add and remove numbers from blacklist',
      code: `import { useBlacklist } from 'vuesip'

const blacklist = useBlacklist(amiClientRef, {
  onNumberBlocked: (number) => {
    console.log('Blocked:', number)
  },
  onNumberUnblocked: (number) => {
    console.log('Unblocked:', number)
  },
})

// Add a number to blacklist
await blacklist.addNumber('+1234567890', {
  reason: 'Spam caller',
  permanent: true,
})

// Remove from blacklist
await blacklist.removeNumber('+1234567890')`,
    },
    {
      title: 'Query Blacklist',
      description: 'Check blacklist status and list entries',
      code: `// Check if number is blocked
const isBlocked = blacklist.isBlocked('+1234567890')
console.log('Is blocked:', isBlocked)

// List all blocked numbers
const blockedList = blacklist.blockedNumbers.value
blockedList.forEach(entry => {
  console.log('Number:', entry.number, 'Reason:', entry.reason)
})

// Get blocking statistics
const stats = blacklist.stats.value
console.log('Total blocked:', stats.totalBlocked)`,
    },
  ],
}
