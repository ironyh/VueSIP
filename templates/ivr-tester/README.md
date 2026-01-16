# IVR Tester Template

Interactive Voice Response (IVR) testing tool built with VueSIP. Test and map IVR phone systems by making real calls and navigating menus with DTMF tones.

## Features

- **IVR Tree Visualization**: Build a visual tree as you navigate IVR menus
- **DTMF Keypad**: Touch-friendly keypad with audio feedback
- **Real-time Transcription**: See voice prompts transcribed in real-time
- **Call Timeline**: Visual timeline showing DTMF inputs and call progress
- **Session Management**: Save, load, export, and import test sessions
- **Annotation Support**: Add notes to tree nodes for documentation

## Quick Start

```bash
cd templates/ivr-tester
pnpm install
pnpm dev
```

Open http://localhost:3005 in your browser.

## Usage

### 1. Connect to SIP Server

Select your SIP provider from the dropdown and enter credentials. Supported providers include:

- Own PBX (custom SIP server)
- 46elks
- Telnyx
- And more...

### 2. Start a Test Session

1. Click **New Test**
2. Enter the IVR phone number to test
3. Optionally name your session (e.g., "Customer Service IVR")
4. Click **Start Test** to initiate the call

### 3. Navigate the IVR

- Use the **DTMF Keypad** to send tones (0-9, \*, #, A-D)
- Watch the **IVR Tree** build as you navigate
- View **Transcription** of voice prompts
- Track your path on the **Timeline**

### 4. Annotate and Document

- Click the pencil icon on tree nodes to add annotations
- Mark endpoints with the flag icon
- Add session notes for overall documentation

### 5. Save and Export

- Sessions auto-save to local storage
- Export as Markdown, JSON, or CSV
- Import previously saved sessions

## Components

### IvrTree

Visual tree representation of IVR menu structure.

```vue
<IvrTree
  :root-node="ivrTree"
  :current-node-id="currentNodeId"
  :show-annotations="true"
  @node-click="handleNodeClick"
  @annotate="handleAnnotate"
  @mark-endpoint="handleMarkEndpoint"
/>
```

### DtmfKeypad

Touch-friendly DTMF input with audio feedback.

```vue
<DtmfKeypad :disabled="!isCallActive" :play-tones="true" size="medium" @digit="handleDtmfDigit" />
```

### TranscriptPanel

Real-time transcription display with DTMF markers.

```vue
<TranscriptPanel
  :entries="transcriptEntries"
  :dtmf-history="dtmfHistory"
  :current-transcript="currentTranscript"
  :is-recording="isTranscribing"
  @clear="handleClear"
/>
```

### CallTimeline

Visual timeline of call events.

```vue
<CallTimeline
  :dtmf-history="dtmfHistory"
  :transcript-entries="transcriptEntries"
  :start-time="startTime"
  :end-time="endTime"
  :duration="duration"
  :is-active="isCallActive"
  @seek="handleSeek"
  @dtmf-click="handleDtmfClick"
/>
```

### TestSession

Session management UI.

```vue
<TestSession
  :current-session="currentSession"
  :saved-sessions="savedSessions"
  :is-test-active="isTestActive"
  :is-call-active="isCallActive"
  :call-status="callStatus"
  :call-duration="callDuration"
  @start-test="handleStartTest"
  @end-test="handleEndTest"
  @load-session="handleLoadSession"
  @export-session="handleExportSession"
/>
```

## Composable API

### useIvrTester

Main composable for IVR testing functionality.

```typescript
import { useIvrTester } from './composables/useIvrTester'

const {
  // State
  isConnected,
  isConnecting,
  isCallActive,
  isTestActive,
  callState,
  callDuration,

  // IVR Tree
  ivrTree,
  currentNodeId,

  // History
  dtmfHistory,
  transcriptEntries,
  currentTranscript,

  // Sessions
  currentSession,
  savedSessions,

  // Methods
  configure,
  connect,
  disconnect,
  startTest,
  endTest,
  sendDtmf,
  navigateTo,
  annotateNode,
  markAsEndpoint,
  saveSession,
  loadSession,
  deleteSession,
  exportSession,
  importSession,
} = useIvrTester()
```

## Session Export Formats

### Markdown

```markdown
# IVR Test Session: Customer Service

**Target Number:** +1-800-555-0123
**Date:** Jan 13, 2025 10:30 AM
**Duration:** 5:32

## Navigation Path

- START -> Welcome message
  - 1 -> English
    - 1 -> Billing
    - 2 -> Technical Support [ENDPOINT]
```

### JSON

```json
{
  "id": "session-123",
  "name": "Customer Service",
  "targetNumber": "+1-800-555-0123",
  "startTime": "2025-01-13T10:30:00Z",
  "dtmfHistory": [...],
  "transcriptEntries": [...],
  "ivrTree": {...}
}
```

### CSV

```csv
Timestamp,Type,Value,Details
2025-01-13T10:30:05Z,DTMF,1,English selection
2025-01-13T10:30:15Z,DTMF,2,Technical Support
```

## Keyboard Shortcuts

| Key | Action             |
| --- | ------------------ |
| 0-9 | Send DTMF digit    |
| \*  | Send star          |
| #   | Send pound         |
| A-D | Send extended DTMF |

## Project Structure

```
ivr-tester/
├── src/
│   ├── main.ts                 # Application entry
│   ├── App.vue                 # Main component
│   ├── composables/
│   │   └── useIvrTester.ts     # Core IVR testing logic
│   ├── components/
│   │   ├── IvrTree.vue         # Tree visualization
│   │   ├── DtmfKeypad.vue      # DTMF input
│   │   ├── TranscriptPanel.vue # Transcription display
│   │   ├── CallTimeline.vue    # Timeline visualization
│   │   └── TestSession.vue     # Session management
│   └── styles/
│       └── main.css            # Global styles
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

<<<<<<< HEAD
## Cloudflare Pages (Deploy)

This template is ready to deploy on Cloudflare Pages.

- Project name: `vuesip-ivr-tester`
- Config: `templates/ivr-tester/wrangler.toml`

Commands:

```bash
# From repo root
pnpm build

cd templates/ivr-tester
pnpm build

# Create project once (safe if it already exists)
wrangler pages project create vuesip-ivr-tester --production-branch=main

# Deploy the dist/ folder
wrangler pages deploy dist --project-name=vuesip-ivr-tester
```

After deploying, map your subdomain (e.g., `ivr.vuesip.com`) to the Pages project in Cloudflare Pages → Custom Domains.

=======
>>>>>>> origin/main
## Dependencies

- **Vue 3**: Reactive UI framework
- **VueSIP**: SIP/WebRTC client library
- **PrimeVue**: UI component library
- **PrimeIcons**: Icon set

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebRTC support required for SIP calling functionality.

## License

MIT - See repository root for full license.
