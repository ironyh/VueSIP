import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'VueSip',
  description: 'A headless Vue.js component library for SIP/VoIP applications',
  base: '/',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: [/^\/playground\/index$/],

  srcExclude: [
    '**/README.md',
    '**/TODO.md',
    'plans/**',
    'tickets/**',
    'hive-mind/**',
    'implementation/**',
    'testing/**',
    'adapters/**',
    '**/*_REPORT.md',
    '**/*_SUMMARY.md',
    '**/*_PLAN.md',
    '**/*_INDEX.md',
    '**/*_CHECKLIST.md',
    '**/*_REFERENCE.md',
    '**/*_POLICY.md',
    '**/*_COMPLETE.md',
    '**/*_FINDINGS.md',
    '**/*_ANALYSIS.md',
    '**/*_TRACKER.md',
    '**/*_ASSESSMENT.md',
    '**/*_FIXES.md',
    '**/*_PATTERNS.md',
    '**/*_PRIORITY.md',
    '**/*_STATUS.md',
    '**/*_GUIDE.md', // Be careful with this one, but looking at file list PHASE_1_MIGRATION_GUIDE.md seems internal
    '**/*_ROADMAP.md',
    '**/*_EXECUTION_PLAN.md',
    '**/*_PRESCAN.md',
    '**/*_RESEARCH.md',
    '**/*_INVENTORY.md',
    '**/*_SCRIPT.md',
    '**/*_TEMPLATE.md', // PR_TEMPLATE.md
    '**/*_IMPROVEMENTS.md',
    '**/*_MIGRATION.md',
    'README_CROSS_BROWSER.md',
  ],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'VueSip' }],
    ['meta', { name: 'og:image', content: '/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Tutorial', link: '/tutorial/', activeMatch: '/tutorial/' },
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Demos', link: '/guide/demos', activeMatch: '/guide/demos' },
      { text: 'API Reference', link: '/api/', activeMatch: '/api/' },
      { text: 'Enterprise', link: '/enterprise/', activeMatch: '/enterprise/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
      { text: 'Developer', link: '/developer/', activeMatch: '/developer/' },
      { text: 'FAQ', link: '/faq' },
    ],

    sidebar: {
      '/tutorial/': [
        {
          text: 'Interactive Tutorial',
          collapsed: false,
          items: [
            { text: 'Start Here', link: '/tutorial/' },
            { text: '1. Hello VueSIP', link: '/tutorial/part-1-hello' },
            { text: '2. Building a Softphone', link: '/tutorial/part-2-softphone' },
            { text: '3. Real Server Connection', link: '/tutorial/part-3-real-server' },
            { text: '4. Advanced Features', link: '/tutorial/part-4-advanced' },
          ],
        },
      ],

      '/guide/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Starter Templates', link: '/guide/templates' },
            { text: 'Migration Guide', link: '/guide/migration' },
          ],
        },
        {
          text: 'Core Features',
          collapsed: false,
          items: [
            { text: 'Making Calls', link: '/guide/making-calls' },
            { text: 'Receiving Calls', link: '/guide/receiving-calls' },
            { text: 'Call Controls', link: '/guide/call-controls' },
            { text: 'Video Calling', link: '/guide/video-calling' },
            { text: 'Picture-in-Picture', link: '/guide/picture-in-picture' },
            { text: 'Click-to-Call', link: '/guide/click-to-call' },
          ],
        },
        {
          text: 'Authentication',
          collapsed: false,
          items: [{ text: 'OAuth2 Authentication', link: '/guide/oauth2-authentication' }],
        },
        {
          text: 'Advanced Topics',
          collapsed: false,
          items: [
            { text: 'Codecs & Negotiation', link: '/guide/codecs' },
            { text: 'Device Management', link: '/guide/device-management' },
            { text: 'Presence & Messaging', link: '/guide/presence-messaging' },
            { text: 'Call History', link: '/guide/call-history' },
            { text: 'Multi-Line Support', link: '/guide/multi-line' },
            { text: 'Call Parking', link: '/guide/call-parking' },
            { text: 'Voicemail', link: '/guide/voicemail' },
            { text: 'Real-Time Transcription', link: '/guide/transcription' },
            { text: 'AMI Originate', link: '/guide/ami-originate' },
            { text: 'Sentiment Analysis', link: '/guide/sentiment' },
            { text: 'SIP Mock', link: '/guide/sip-mock' },
          ],
        },
        {
          text: 'Call Quality',
          collapsed: false,
          items: [
            { text: 'Call Quality Monitoring', link: '/guide/call-quality' },
            { text: 'Quality Dashboard', link: '/guide/call-quality-dashboard' },
          ],
        },
        {
          text: 'Integrations',
          collapsed: false,
          items: [
            { text: 'AMI & CDR Integration', link: '/guide/ami-cdr' },
            { text: 'ConfBridge Conferencing', link: '/guide/confbridge' },
          ],
        },
        {
          text: 'Quality & Reliability',
          collapsed: false,
          items: [
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Security', link: '/guide/security' },
            { text: 'Performance', link: '/guide/performance' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [{ text: 'Overview', link: '/api/' }],
        },
        {
          text: 'Core APIs',
          collapsed: false,
          items: [
            { text: 'Composables', link: '/api/composables' },
            { text: 'Types', link: '/api/types' },
            { text: 'Events', link: '/api/events' },
          ],
        },
        {
          text: 'Extension APIs',
          collapsed: false,
          items: [
            { text: 'Providers', link: '/api/providers' },
            { text: 'Plugins', link: '/api/plugins' },
            { text: 'Utilities', link: '/api/utilities' },
          ],
        },
        {
          text: 'Generated API Docs',
          collapsed: false,
          items: [{ text: 'Full API Reference (TypeDoc)', link: '/api/generated/' }],
        },
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [{ text: 'Overview', link: '/examples/' }],
        },
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Quick Start', link: '/examples/quick-start' },
            { text: 'Learning Paths', link: '/examples/learning-paths' },
          ],
        },
        {
          text: 'Core Calling',
          collapsed: false,
          items: [
            { text: 'Click-to-Call', link: '/examples/click-to-call' },
            { text: 'Basic Audio Call', link: '/examples/basic-call' },
            { text: 'Video Calling', link: '/examples/video-call' },
            { text: 'Conference Calls', link: '/examples/conference' },
            { text: 'Call Transfer', link: '/examples/call-transfer' },
            { text: 'Multi-Line', link: '/examples/multi-line' },
          ],
        },
        {
          text: 'Call Controls',
          collapsed: false,
          items: [
            { text: 'DTMF Tones', link: '/examples/dtmf' },
            { text: 'Hold & Mute', link: '/examples/hold-mute' },
            { text: 'Call Timer', link: '/examples/call-timer' },
            { text: 'Auto Answer', link: '/examples/auto-answer' },
          ],
        },
        {
          text: 'Call Quality',
          collapsed: false,
          items: [
            { text: 'Quality Monitoring', link: '/examples/call-quality' },
            { text: 'Connection Recovery', link: '/examples/connection-recovery' },
          ],
        },
        {
          text: 'Transcription',
          collapsed: false,
          items: [
            { text: 'Real-Time Transcription', link: '/examples/transcription' },
            { text: 'Keyword Detection', link: '/examples/transcription-keywords' },
          ],
        },
        {
          text: 'Video & Recording',
          collapsed: false,
          items: [
            { text: 'Picture-in-Picture', link: '/examples/picture-in-picture' },
            { text: 'Screen Sharing', link: '/examples/screen-sharing' },
            { text: 'Call Recording', link: '/examples/call-recording' },
            { text: 'Conference Gallery', link: '/examples/conference-gallery' },
          ],
        },
        {
          text: 'Communication',
          collapsed: false,
          items: [
            { text: 'Presence & BLF', link: '/examples/presence' },
            { text: 'SIP Messaging', link: '/examples/sip-messaging' },
            { text: 'Voicemail', link: '/examples/voicemail' },
          ],
        },
        {
          text: 'Call Center (AMI)',
          collapsed: true,
          items: [
            { text: 'Agent Login', link: '/examples/agent-login' },
            { text: 'Queue Monitor', link: '/examples/queue-monitor' },
            { text: 'CDR Dashboard', link: '/examples/cdr-dashboard' },
            { text: 'ConfBridge Manager', link: '/examples/confbridge' },
            { text: 'PJSIP Endpoints', link: '/examples/pjsip-endpoints' },
            { text: 'System Health', link: '/examples/system-health' },
            { text: 'Message Waiting', link: '/examples/mwi' },
          ],
        },
        {
          text: 'Settings & Utilities',
          collapsed: true,
          items: [
            { text: 'Audio Devices', link: '/examples/audio-devices' },
            { text: 'Call History', link: '/examples/call-history' },
            { text: 'Settings Persistence', link: '/examples/settings' },
          ],
        },
      ],

      '/developer/': [
        {
          text: 'Developer Guide',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/developer/' },
            { text: 'Architecture', link: '/developer/architecture' },
            { text: 'TypeDoc Setup', link: '/developer/typedoc-setup' },
            { text: 'Testing Guide', link: '/developer/testing' },
            { text: 'Code Style & Patterns', link: '/developer/code-style' },
          ],
        },
      ],

      '/enterprise/': [
        {
          text: 'Enterprise',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/enterprise/' },
            { text: 'Analytics', link: '/enterprise/analytics' },
            { text: 'Compliance', link: '/enterprise/compliance' },
            { text: 'CRM', link: '/enterprise/crm' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/ironyh/VueSip' }],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/ironyh/VueSip/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present VueSip',
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },
  },
})
