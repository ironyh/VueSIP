import type { ExampleDefinition } from './types'
import PbxRecordingsSmokeDemo from '../demos/PbxRecordingsSmoke/index.vue'

export const pbxRecordingsSmokeExample: ExampleDefinition = {
  id: 'pbx-recordings-smoke',
  icon: '🎙️',
  title: 'PBX Recordings (Smoke)',
  description: 'Integration smoke: usePbxRecordings with mock provider — list, render, play.',
  category: 'ami',
  tags: ['E2E', 'Recording', 'PBX', 'Smoke'],
  layout: 'inline',
  component: PbxRecordingsSmokeDemo,
  setupGuide: `<p>Minimal demo for E2E smoke test: list recordings and get playback URL via usePbxRecordings with a mock provider. No real PBX required.</p>`,
  codeSnippets: [
    {
      title: 'usePbxRecordings with mock provider',
      description: 'Wire composable to a mock for smoke testing',
      code: `const mockProvider: PbxRecordingProvider = {
  capabilities: { listRecordings: true, getPlaybackInfo: true },
  listRecordings: async () => ({ items: [...], totalCount: 1, hasMore: false }),
  getPlaybackInfo: async (id) => ({ recordingId: id, playbackUrl: 'https://...' }),
}
const providerRef = shallowRef(mockProvider)
const { recordings, fetchRecordings, getPlaybackUrl } = usePbxRecordings(providerRef)
await fetchRecordings()
const url = await getPlaybackUrl(recordings.value[0].id)`,
    },
  ],
}
