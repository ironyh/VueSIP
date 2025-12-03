import type { ExampleDefinition } from './types'
import FeatureCodesDemo from '../demos/FeatureCodesDemo.vue'

export const featureCodesExample: ExampleDefinition = {
  id: 'feature-codes',
  icon: '*️⃣',
  title: 'Feature Codes',
  description: 'Dial feature codes for call forwarding, DND, and more',
  tags: ['PBX', 'Features', 'Codes'],
  component: FeatureCodesDemo,
  setupGuide: '<p>Execute PBX feature codes directly from the application. Manage call forwarding, DND, voicemail, and other PBX features.</p>',
  codeSnippets: [
    {
      title: 'Execute Feature Codes',
      description: 'Dial feature codes for PBX functions',
      code: `import { useFeatureCodes } from 'vuesip'

const features = useFeatureCodes(sipClientRef)

// Enable Do Not Disturb
await features.enableDND()

// Disable Do Not Disturb
await features.disableDND()

// Set call forward
await features.setCallForward('all', '1002')`,
    },
    {
      title: 'Check Feature Status',
      description: 'Query current feature settings',
      code: `// Check DND status
const dndEnabled = features.dndEnabled.value
console.log('DND is', dndEnabled ? 'enabled' : 'disabled')

// Check call forward status
const cfStatus = features.callForwardStatus.value
cfStatus.forEach(cf => {
  if (cf.enabled) {
    console.log(cf.type, '->', cf.destination)
  }
})`,
    },
  ],
}
