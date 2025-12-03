import type { ExampleDefinition } from './types'
import VoicemailDemo from '../demos/VoicemailDemo.vue'

export const voicemailExample: ExampleDefinition = {
  id: 'voicemail',
  icon: '📬',
  title: 'Voicemail (MWI)',
  description: 'Message Waiting Indicator for voicemail notifications',
  tags: ['Advanced', 'Messaging', 'Notifications'],
  component: VoicemailDemo,
  setupGuide: '<p>Monitor voicemail status using MWI (Message Waiting Indicator). Subscribe to receive notifications when new voicemails arrive.</p>',
  codeSnippets: [
    {
      title: 'Subscribe to Voicemail Notifications',
      description: 'Get notified of new voicemail messages',
      code: `import { useVoicemail } from 'vuesip'

const voicemail = useVoicemail(sipClientRef)

// Subscribe to voicemail for an extension
await voicemail.subscribe('1000@default')

// Access MWI state
const mwi = voicemail.mwiStates.value.get('1000@default')
console.log('New messages:', mwi?.newMessages)
console.log('Old messages:', mwi?.oldMessages)`,
    },
    {
      title: 'Listen for MWI Changes',
      description: 'React to voicemail state updates',
      code: `// Watch for MWI updates
watch(voicemail.mwiStates, (states) => {
  states.forEach((mwi, account) => {
    if (mwi.newMessages > 0) {
      console.log('Account', account, 'has', mwi.newMessages, 'new messages')
    }
  })
}, { deep: true })`,
    },
  ],
}
