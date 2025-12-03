import type { ExampleDefinition } from './types'
import MultiLineDemo from '../demos/MultiLineDemo.vue'

export const multiLineExample: ExampleDefinition = {
  id: 'multi-line',
  icon: '📱',
  title: 'Multi-Line Phone',
  description: 'Handle multiple simultaneous call lines',
  tags: ['Advanced', 'Multi-Line', 'Professional'],
  component: MultiLineDemo,
  setupGuide: '<p>Manage multiple phone lines simultaneously. Switch between calls, place calls on hold, and handle multiple conversations.</p>',
  codeSnippets: [
    {
      title: 'Initialize Multi-Line',
      description: 'Set up multiple phone lines',
      code: `import { useMultiLine } from 'vuesip'

const multiLine = useMultiLine(sipClientRef, {
  maxLines: 4,
  onLineStateChange: (lineNumber, status) => {
    console.log('Line', lineNumber, 'changed to', status)
  },
})

// Get available lines
const lines = multiLine.lines.value
console.log('Total lines:', lines.length)`,
    },
    {
      title: 'Manage Lines',
      description: 'Select and control individual lines',
      code: `// Select a line
multiLine.selectLine(2)

// Make a call on the selected line
await multiLine.makeCall('sip:user@example.com')

// Hold current line and switch
await multiLine.holdCurrentLine()
multiLine.selectLine(1)

// Monitor all lines
watch(multiLine.lines, (currentLines) => {
  currentLines.forEach(line => {
    console.log('Line', line.lineNumber, ':', line.status)
  })
})`,
    },
  ],
}
