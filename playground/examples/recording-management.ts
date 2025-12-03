import type { ExampleDefinition } from './types'
import RecordingManagementDemo from '../demos/RecordingManagementDemo.vue'

export const recordingManagementExample: ExampleDefinition = {
  id: 'recording-management',
  icon: '🎙️',
  title: 'Recording Management',
  description: 'Advanced call recording controls and management',
  tags: ['Advanced', 'Recording', 'Compliance'],
  component: RecordingManagementDemo,
  setupGuide: '<p>Manage call recordings with start, stop, pause, and resume controls. Access recording metadata and download recordings.</p>',
  codeSnippets: [
    {
      title: 'Start Recording',
      description: 'Begin recording a call with options',
      code: `import { useRecordingManagement } from 'vuesip'

const recording = useRecordingManagement(amiClientRef)

// Start recording with options
const session = await recording.startRecording({
  channel: 'PJSIP/1001-00000001',
  format: 'wav',
  mixMode: 'both',
})
console.log('Recording started:', session.filePath)`,
    },
    {
      title: 'Control Recording',
      description: 'Pause, resume, and stop recordings',
      code: `// Pause recording (for sensitive information)
await recording.pauseRecording(session.id)

// Resume recording
await recording.resumeRecording(session.id)

// Stop recording
await recording.stopRecording(session.id)

// List all recordings
const recordings = recording.recordings.value
recordings.forEach(rec => {
  console.log('Recording:', rec.filename, 'Duration:', rec.duration)
})`,
    },
  ],
}
