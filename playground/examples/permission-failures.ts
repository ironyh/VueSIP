import type { ExampleDefinition } from './types'
import PermissionFailuresDemo from '../demos/PermissionFailures/index.vue'

export const permissionFailuresExample: ExampleDefinition = {
  id: 'permission-failures',
  icon: '🚫',
  title: 'Permission Failures',
  description: 'Design the unhappy path for blocked mic, missing speakers, and insecure origins',
  category: 'utility',
  tags: ['Permissions', 'Audio', 'UX'],
  component: PermissionFailuresDemo,
  layout: 'inline',
  setupGuide:
    '<p>Use this demo to design the failure states around browser media access. It covers microphone denial, missing output devices, and insecure origins that block <code>getUserMedia()</code> before the browser prompt appears.</p>',
  codeSnippets: [
    {
      title: 'Check secure context before media requests',
      description: 'Fail early when the app is served from an insecure origin',
      code: `const ensureMediaPrereqs = () => {
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'secure-context-required',
      message: 'Serve this app over HTTPS or localhost to use audio devices.',
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      reason: 'media-devices-unavailable',
      message: 'This browser cannot access camera or microphone APIs.',
    }
  }

  return { ok: true }
}`,
    },
    {
      title: 'Differentiate prompt from denied',
      description: 'The UI action changes once the browser has stored a denial',
      code: `type MicPermission = 'prompt' | 'granted' | 'denied'

const nextAction = (permission: MicPermission) => {
  switch (permission) {
    case 'prompt':
      return { cta: 'Request microphone', mode: 'ask-browser' }
    case 'denied':
      return { cta: 'Open browser settings', mode: 'manual-recovery' }
    case 'granted':
      return { cta: 'Continue', mode: 'ready' }
  }
}`,
    },
    {
      title: 'Fallback when output routing is unavailable',
      description: 'Be explicit when the browser can only use the default system speaker',
      code: `const canSwitchOutput = typeof HTMLMediaElement !== 'undefined'
  && 'setSinkId' in HTMLMediaElement.prototype

const speakerRoutingMessage = canSwitchOutput
  ? 'Choose a speaker from the list.'
  : 'Audio will play through the system default output device.'

if (!canSwitchOutput) {
  hideSpeakerPicker()
  showInfoBanner(speakerRoutingMessage)
}`,
    },
  ],
}
