import type { ExampleDefinition } from './types'
import BlacklistDemo from '../demos/BlacklistDemo.vue'

export const blacklistExample: ExampleDefinition = {
  id: 'blacklist',
  icon: '🚫',
  title: 'Call Blacklist',
  description: 'Block unwanted callers and manage blacklist rules',
  category: 'utility',
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
    {
      title: 'Blacklist Data Model',
      description: 'Complete blacklist entry structure',
      code: `interface BlacklistEntry {
  id: string
  type: 'number' | 'pattern' | 'prefix' | 'anonymous'
  value: string  // Number, pattern, or prefix
  reason: string
  category: 'spam' | 'harassment' | 'telemarketer' | 'scam' | 'other'
  permanent: boolean
  expiresAt?: Date
  blockedCount: number
  lastBlockedAt?: Date
  createdAt: Date
  createdBy: string
  notes?: string
}

interface WhitelistEntry {
  id: string
  type: 'number' | 'pattern' | 'prefix'
  value: string
  reason: string
  createdAt: Date
  createdBy: string
}

interface BlockingAction {
  action: 'reject' | 'voicemail' | 'busy' | 'silent'
  customMessage?: string
  responseCode?: number
}

const blacklist = ref<Map<string, BlacklistEntry>>(new Map())
const whitelist = ref<Map<string, WhitelistEntry>>(new Map())

const defaultBlockingAction = ref<BlockingAction>({
  action: 'reject',
  responseCode: 603  // Decline
})`,
    },
    {
      title: 'Pattern-Based Blocking',
      description: 'Block numbers using patterns and prefixes',
      code: `const addBlockPattern = (
  pattern: string,
  options: Partial<BlacklistEntry>
): BlacklistEntry => {
  const entry: BlacklistEntry = {
    id: \`block-\${Date.now()}\`,
    type: 'pattern',
    value: pattern,
    reason: options.reason || 'Pattern block',
    category: options.category || 'other',
    permanent: options.permanent ?? false,
    expiresAt: options.expiresAt,
    blockedCount: 0,
    createdAt: new Date(),
    createdBy: currentUser.value.name
  }

  blacklist.value.set(entry.id, entry)
  return entry
}

// Block all numbers starting with prefix
const blockPrefix = (prefix: string, reason: string) => {
  return addBlockPattern(prefix, {
    type: 'prefix',
    reason,
    category: 'telemarketer'
  })
}

// Block using regex pattern
const blockByRegex = (pattern: RegExp, reason: string) => {
  return addBlockPattern(pattern.source, {
    type: 'pattern',
    reason
  })
}

// Check if number matches any block rule
const checkBlacklist = (callerNumber: string): BlacklistEntry | null => {
  // First check whitelist
  for (const [, entry] of whitelist.value) {
    if (matchesEntry(callerNumber, entry)) {
      return null // Whitelisted
    }
  }

  // Check blacklist
  for (const [, entry] of blacklist.value) {
    // Skip expired entries
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      continue
    }

    if (matchesEntry(callerNumber, entry)) {
      return entry
    }
  }

  return null
}

const matchesEntry = (
  number: string,
  entry: BlacklistEntry | WhitelistEntry
): boolean => {
  const normalized = normalizeNumber(number)

  switch (entry.type) {
    case 'number':
      return normalized === normalizeNumber(entry.value)
    case 'prefix':
      return normalized.startsWith(entry.value)
    case 'pattern':
      return new RegExp(entry.value).test(normalized)
    case 'anonymous':
      return isAnonymous(number)
    default:
      return false
  }
}

const normalizeNumber = (number: string): string => {
  return number.replace(/[^0-9+]/g, '')
}

const isAnonymous = (number: string): boolean => {
  return !number || number === 'anonymous' || number === 'unknown'
}`,
    },
    {
      title: 'Call Blocking Handler',
      description: 'Intercept and block incoming calls',
      code: `const handleIncomingCall = async (session: IncomingSession) => {
  const callerNumber = session.remoteIdentity.uri.user || ''
  const callerUri = session.remoteIdentity.uri.toString()

  // Check blacklist
  const blockEntry = checkBlacklist(callerNumber)

  if (blockEntry) {
    // Update block count
    blockEntry.blockedCount++
    blockEntry.lastBlockedAt = new Date()

    // Log the blocked call
    logBlockedCall(callerNumber, blockEntry)

    // Execute blocking action
    await executeBlockAction(session, blockEntry)

    emit('callBlocked', { callerNumber, entry: blockEntry })
    return true
  }

  return false
}

const executeBlockAction = async (
  session: IncomingSession,
  entry: BlacklistEntry
) => {
  const action = entry.blockingAction || defaultBlockingAction.value

  switch (action.action) {
    case 'reject':
      await session.reject({
        statusCode: action.responseCode || 603
      })
      break

    case 'busy':
      await session.reject({ statusCode: 486 }) // Busy Here
      break

    case 'voicemail':
      // Redirect to voicemail
      await session.reject({
        statusCode: 302,
        reasonPhrase: 'Moved Temporarily',
        extraHeaders: [\`Contact: <sip:voicemail@\${domain}>\`]
      })
      break

    case 'silent':
      // Let it ring without notifying user, auto-reject after timeout
      setTimeout(() => {
        if (session.state === SessionState.Initial) {
          session.reject({ statusCode: 480 }) // Temporarily Unavailable
        }
      }, 30000)
      break
  }
}

const logBlockedCall = (callerNumber: string, entry: BlacklistEntry) => {
  const log = {
    timestamp: new Date(),
    callerNumber,
    reason: entry.reason,
    category: entry.category,
    entryId: entry.id
  }

  blockedCallsLog.value.push(log)

  // Keep last 100 entries
  if (blockedCallsLog.value.length > 100) {
    blockedCallsLog.value.shift()
  }
}`,
    },
    {
      title: 'Blacklist Management UI',
      description: 'Visual interface for managing blocked numbers',
      code: `<template>
  <div class="blacklist-manager">
    <!-- Stats Overview -->
    <div class="stats-bar">
      <div class="stat">
        <span class="value">{{ blacklist.size }}</span>
        <span class="label">Blocked Numbers</span>
      </div>
      <div class="stat">
        <span class="value">{{ totalBlockedCalls }}</span>
        <span class="label">Calls Blocked</span>
      </div>
      <div class="stat">
        <span class="value">{{ todayBlocked }}</span>
        <span class="label">Blocked Today</span>
      </div>
    </div>

    <!-- Add to Blacklist -->
    <div class="add-entry">
      <input
        v-model="newEntry.value"
        placeholder="Enter number or pattern"
      />
      <select v-model="newEntry.type">
        <option value="number">Exact Number</option>
        <option value="prefix">Prefix</option>
        <option value="pattern">Pattern (Regex)</option>
        <option value="anonymous">Anonymous Calls</option>
      </select>
      <select v-model="newEntry.category">
        <option value="spam">Spam</option>
        <option value="telemarketer">Telemarketer</option>
        <option value="scam">Scam</option>
        <option value="harassment">Harassment</option>
        <option value="other">Other</option>
      </select>
      <input
        v-model="newEntry.reason"
        placeholder="Reason for blocking"
      />
      <button @click="addEntry" :disabled="!isValidEntry">
        Add to Blacklist
      </button>
    </div>

    <!-- Blacklist Table -->
    <div class="blacklist-table">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Value</th>
            <th>Category</th>
            <th>Reason</th>
            <th>Blocked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in sortedEntries" :key="entry.id">
            <td>
              <span class="type-badge" :class="entry.type">
                {{ entry.type }}
              </span>
            </td>
            <td class="value-cell">{{ entry.value }}</td>
            <td>
              <span class="category-badge" :class="entry.category">
                {{ entry.category }}
              </span>
            </td>
            <td>{{ entry.reason }}</td>
            <td>{{ entry.blockedCount }} times</td>
            <td class="actions">
              <button @click="editEntry(entry)">Edit</button>
              <button @click="moveToWhitelist(entry)">Whitelist</button>
              <button @click="removeEntry(entry.id)" class="danger">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recent Blocked Calls -->
    <div class="recent-blocked">
      <h4>Recently Blocked</h4>
      <div v-for="log in recentBlocked" :key="log.timestamp.toISOString()" class="blocked-entry">
        <span class="number">{{ log.callerNumber }}</span>
        <span class="reason">{{ log.reason }}</span>
        <span class="time">{{ formatTime(log.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Import/Export Blacklist',
      description: 'Backup and restore blacklist data',
      code: `interface BlacklistExport {
  version: string
  exportDate: string
  entries: BlacklistEntry[]
  whitelist: WhitelistEntry[]
  settings: {
    defaultAction: BlockingAction
  }
}

const exportBlacklist = (): string => {
  const data: BlacklistExport = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    entries: Array.from(blacklist.value.values()),
    whitelist: Array.from(whitelist.value.values()),
    settings: {
      defaultAction: defaultBlockingAction.value
    }
  }

  return JSON.stringify(data, null, 2)
}

const downloadBlacklist = () => {
  const json = exportBlacklist()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = \`blacklist-\${new Date().toISOString().slice(0, 10)}.json\`
  a.click()

  URL.revokeObjectURL(url)
}

const importBlacklist = async (file: File, mode: 'replace' | 'merge') => {
  const text = await file.text()
  const data: BlacklistExport = JSON.parse(text)

  if (data.version !== '1.0') {
    throw new Error('Unsupported blacklist format version')
  }

  if (mode === 'replace') {
    blacklist.value.clear()
    whitelist.value.clear()
  }

  // Import entries
  let imported = 0
  let skipped = 0

  for (const entry of data.entries) {
    if (mode === 'merge' && blacklist.value.has(entry.id)) {
      skipped++
      continue
    }

    // Reset stats on import
    entry.blockedCount = 0
    entry.lastBlockedAt = undefined

    blacklist.value.set(entry.id, entry)
    imported++
  }

  // Import whitelist
  for (const entry of data.whitelist) {
    if (mode === 'merge' && whitelist.value.has(entry.id)) {
      continue
    }
    whitelist.value.set(entry.id, entry)
  }

  // Import settings
  if (mode === 'replace' && data.settings) {
    defaultBlockingAction.value = data.settings.defaultAction
  }

  return { imported, skipped }
}`,
    },
    {
      title: 'Spam Detection Integration',
      description: 'Integrate with external spam databases',
      code: `interface SpamCheckResult {
  number: string
  isSpam: boolean
  spamScore: number  // 0-100
  source: string
  reportCount?: number
  category?: string
  lastReported?: Date
}

const spamDatabases = [
  { name: 'Local', url: null },
  { name: 'TrueCaller', url: 'https://api.truecaller.com/v1/lookup' },
  { name: 'Hiya', url: 'https://api.hiya.com/v1/check' }
]

const checkSpamDatabases = async (
  number: string
): Promise<SpamCheckResult[]> => {
  const results: SpamCheckResult[] = []

  // Check local blacklist first
  const localEntry = checkBlacklist(number)
  if (localEntry) {
    results.push({
      number,
      isSpam: true,
      spamScore: 100,
      source: 'Local Blacklist',
      category: localEntry.category
    })
  }

  // Check external databases (example implementation)
  for (const db of spamDatabases.filter(d => d.url)) {
    try {
      const response = await fetch(\`\${db.url}?number=\${encodeURIComponent(number)}\`)
      if (response.ok) {
        const data = await response.json()
        results.push({
          number,
          isSpam: data.spam_score > 50,
          spamScore: data.spam_score,
          source: db.name,
          reportCount: data.report_count,
          category: data.category
        })
      }
    } catch (error) {
      console.warn(\`Failed to check \${db.name}:\`, error)
    }
  }

  return results
}

// Auto-block based on spam score
const autoBlockThreshold = ref(80) // Block if score >= 80

const handleSpamCheck = async (callerNumber: string) => {
  const results = await checkSpamDatabases(callerNumber)
  const maxScore = Math.max(...results.map(r => r.spamScore))

  if (maxScore >= autoBlockThreshold.value) {
    // Auto-add to blacklist
    const topResult = results.find(r => r.spamScore === maxScore)

    addBlockPattern(callerNumber, {
      type: 'number',
      reason: \`Auto-blocked: Spam score \${maxScore}\`,
      category: topResult?.category as BlacklistEntry['category'] || 'spam',
      permanent: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60000) // 30 days
    })

    return true
  }

  return false
}`,
    },
  ],
}
