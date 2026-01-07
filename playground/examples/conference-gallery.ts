import type { ExampleDefinition } from './types'
import ConferenceGalleryDemo from '../demos/ConferenceGalleryDemo.vue'

export const conferenceGalleryExample: ExampleDefinition = {
  id: 'conference-gallery',
  icon: '🎬',
  title: 'Conference Gallery',
  description: 'Gallery view with active speaker detection and layouts',
  category: 'sip',
  tags: ['Advanced', 'Video', 'Conference'],
  component: ConferenceGalleryDemo,
  setupGuide: '<p>View conference participants in a responsive gallery layout with automatic active speaker detection and multiple layout modes.</p>',
  codeSnippets: [
    {
      title: 'Active Speaker Detection',
      description: 'Detect dominant speaker from audio levels',
      code: `import { useActiveSpeaker } from 'vuesip'

const { activeSpeaker, activeSpeakers, isSomeoneSpeaking } = useActiveSpeaker(
  participants,
  {
    threshold: 0.15,
    debounceMs: 300,
    historySize: 10,
    excludeMuted: true,
    onSpeakerChange: (newSpeaker, previousSpeaker) => {
      console.log('Speaker changed:', newSpeaker?.displayName)
    }
  }
)`,
    },
    {
      title: 'Gallery Layout',
      description: 'Calculate optimal grid dimensions',
      code: `import { useGalleryLayout } from 'vuesip'

const participantCount = computed(() => participants.value.length)

const {
  gridCols,
  gridRows,
  gridStyle,
  layout,
  setLayout,
  pinParticipant,
  unpinParticipant
} = useGalleryLayout(participantCount, {
  gap: 8,
  maxCols: 4,
  maxRows: 4,
})`,
    },
    {
      title: 'Participant Controls',
      description: 'Control individual participants',
      code: `import { useParticipantControls } from 'vuesip'

const {
  canMute,
  canKick,
  canPin,
  volume,
  toggleMute,
  kickParticipant,
  togglePin,
  setVolume,
} = useParticipantControls(participant, {
  isModerator: ref(true),
  isPinned: ref(false),
  onMute: (p) => console.log('Muted:', p.displayName),
  onKick: (p) => console.log('Kicked:', p.displayName),
})`,
    },
  ],
}
