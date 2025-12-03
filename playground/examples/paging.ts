import type { ExampleDefinition } from './types'
import PagingDemo from '../demos/PagingDemo.vue'

export const pagingExample: ExampleDefinition = {
  id: 'paging',
  icon: '📢',
  title: 'Paging & Intercom',
  description: 'One-way and two-way paging announcements',
  tags: ['Advanced', 'Paging', 'Announcements'],
  component: PagingDemo,
  setupGuide: '<p>Send paging announcements to groups of phones. Supports one-way announcements and two-way intercom functionality.</p>',
  codeSnippets: [
    {
      title: 'Send Page Announcement',
      description: 'Page a group of extensions',
      code: `import { usePaging } from 'vuesip'

const paging = usePaging(sipClientRef, {
  onPageStart: (session) => {
    console.log('Paging', session.target, '...')
  },
  onPageEnd: (session) => {
    console.log('Page ended')
  },
})

// Page a group
await paging.page('Page(PJSIP/1001&PJSIP/1002)')`,
    },
    {
      title: 'Intercom Call',
      description: 'Two-way intercom functionality',
      code: `// Start intercom (auto-answer on target)
await paging.intercom('sip:1001@pbx.example.com')

// Page with timeout
await paging.page('Page(PJSIP/1001)', {
  timeout: 30,
  announcement: '/sounds/announcement.wav',
})`,
    },
  ],
}
