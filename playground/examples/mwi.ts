import type { ExampleDefinition } from './types'
import MWIDemo from '../demos/MWIDemo.vue'

export const mwiExample: ExampleDefinition = {
  id: 'mwi',
  icon: '📬',
  title: 'Message Waiting',
  description: 'Control voicemail lamp status via AMI',
  tags: ['MWI', 'AMI', 'Voicemail', 'Indicator'],
  component: MWIDemo,
  setupGuide: `<p>Control Message Waiting Indicator (MWI) status for voicemail notifications. Monitor mailbox message counts and control voicemail lamp status on phones.</p>
<h4>Requirements</h4>
<ul>
  <li>Asterisk PBX with voicemail configured</li>
  <li>AMI WebSocket connection</li>
  <li>AMI user with MWI permissions</li>
  <li>SIP phones that support MWI</li>
</ul>`,
  codeSnippets: [
    {
      title: 'Basic Setup',
      description: 'Initialize MWI management',
      code: `import { useAmi, useAmiMWI } from 'vuesip'
import { computed } from 'vue'

// Connect to AMI
const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

// Initialize MWI composable
const {
  mailboxList,
  isLoading,
  totalNewMessages,
  indicatorOnCount,
  getMailboxStatus,
  updateMWI,
  trackMailbox,
} = useAmiMWI(computed(() => ami.getClient()))

// Start tracking a mailbox
await trackMailbox('1001@default')
console.log('Mailboxes:', mailboxList.value)`,
    },
    {
      title: 'Check Mailbox Status',
      description: 'Get message counts for a mailbox',
      code: `// Get mailbox status
const status = await getMailboxStatus('1001@default')
console.log('New messages:', status.newMessages)
console.log('Old messages:', status.oldMessages)
console.log('Urgent new:', status.urgentNew)
console.log('Indicator on:', status.indicatorOn)

// Check if mailbox has messages
const hasVoicemail = hasMessages('1001@default')
console.log('Has voicemail:', hasVoicemail)

// Get cached status (no API call)
const cached = getMailbox('1001@default')
if (cached) {
  console.log('Cached status:', cached)
}`,
    },
    {
      title: 'Update MWI Status',
      description: 'Control voicemail lamp indicators',
      code: `// Turn on MWI lamp (set new message count)
await updateMWI('1001@default', 3, 2)
// Sets: 3 new messages, 2 old messages

// Turn off MWI lamp (clear messages)
await updateMWI('1001@default', 0, 0)

// Delete MWI state entirely
await deleteMWI('1001@default')

// Refresh all tracked mailboxes
await refresh()`,
    },
    {
      title: 'Real-Time Events',
      description: 'Handle MWI change events',
      code: `const { mailboxList, totalNewMessages } = useAmiMWI(
  computed(() => ami.getClient()),
  {
    // Default voicemail context
    defaultContext: 'default',

    // Handle real-time MWI events
    onMWIChange: (mailbox, status) => {
      console.log(\`Mailbox \${mailbox} updated:\`)
      console.log(\`  New: \${status.newMessages}\`)
      console.log(\`  Old: \${status.oldMessages}\`)
      console.log(\`  Indicator: \${status.indicatorOn ? 'ON' : 'OFF'}\`)

      // Example: show notification
      if (status.newMessages > 0) {
        showNotification(\`You have \${status.newMessages} new voicemail(s)\`)
      }
    },
  }
)

// Track multiple mailboxes
const extensions = ['1001', '1002', '1003']
for (const ext of extensions) {
  await trackMailbox(ext)
}

// Use computed totals
console.log(\`Total new messages: \${totalNewMessages.value}\`)
console.log(\`Indicators on: \${indicatorOnCount.value}\`)`,
    },
  ],
}
