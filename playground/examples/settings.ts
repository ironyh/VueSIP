import type { ExampleDefinition } from './types'
import SettingsDemo from '../demos/SettingsDemo.vue'

export const settingsExample: ExampleDefinition = {
  id: 'settings',
  icon: '⚙️',
  title: 'Settings Manager',
  description: 'User preferences and application settings',
  tags: ['Configuration', 'Preferences', 'User'],
  component: SettingsDemo,
  setupGuide: '<p>Manage user preferences and application settings. Configure audio devices, notifications, and display options.</p>',
  codeSnippets: [
    {
      title: 'Manage Settings',
      description: 'Read and update user settings',
      code: `import { useSettings } from 'vuesip'

const settings = useSettings({
  storageKey: 'vuesip-settings',
  defaults: {
    audioInputDevice: 'default',
    audioOutputDevice: 'default',
    ringtoneVolume: 0.8,
    notificationsEnabled: true,
    autoAnswer: false,
  },
  onSettingChange: (key, value) => {
    console.log('Setting changed:', key, '=', value)
  },
})

// Get a setting
const volume = settings.get('ringtoneVolume')
console.log('Ringtone volume:', volume)

// Update a setting
settings.set('ringtoneVolume', 0.5)

// Update multiple settings
settings.update({
  notificationsEnabled: false,
  autoAnswer: true,
})`,
    },
    {
      title: 'Settings Persistence',
      description: 'Save and restore settings',
      code: `// Export settings
const exported = settings.export()
console.log('Settings exported:', JSON.stringify(exported))

// Import settings
await settings.import({
  ringtoneVolume: 0.7,
  notificationsEnabled: true,
})

// Reset to defaults
settings.reset()

// Watch for changes
watch(settings.all, (newSettings) => {
  console.log('Settings updated:', newSettings)
})

// Check if setting exists
const hasCustomRingtone = settings.has('customRingtone')
console.log('Has custom ringtone:', hasCustomRingtone)`,
    },
  ],
}
