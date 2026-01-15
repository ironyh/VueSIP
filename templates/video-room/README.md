# VueSIP Video Room Template

A multi-participant video conferencing application template built with Vue 3 and VueSIP.

## Features

- **Dynamic Video Grid** - Responsive grid layout that adapts to participant count (1x1, 2x2, 3x3, etc.)
- **Active Speaker Detection** - Visual highlighting of the currently speaking participant
- **Participant Pinning** - Pin any participant to keep them in focus
- **Screen Sharing** - Share your screen with all participants
- **Real-time Chat** - Side panel chat for text communication
- **Participant List** - View all participants with their status indicators
- **Media Controls** - Toggle camera, microphone, and screen sharing
- **Responsive Design** - Works on desktop and mobile devices

## Directory Structure

```
templates/video-room/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── components/
│   │   ├── VideoGrid.vue         # Participant video grid
│   │   ├── ParticipantTile.vue   # Single participant video
│   │   ├── ControlBar.vue        # Meeting controls
│   │   ├── ChatPanel.vue         # Side chat panel
│   │   ├── ParticipantList.vue   # Participant sidebar
│   │   └── ScreenShareView.vue   # Screen share display
│   ├── composables/
│   │   ├── useVideoRoom.ts       # Room management
│   │   └── useScreenShare.ts     # Screen sharing
│   └── styles/
│       └── main.css
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
cd templates/video-room
pnpm install
```

### Development

```bash
pnpm dev
```

The application will be available at `http://localhost:3002`.

### Build

```bash
pnpm build
```

### Type Checking

```bash
pnpm typecheck
```

## Components

### VideoGrid

Displays all participants in a responsive grid layout.

```vue
<VideoGrid
  :participants="participants"
  :local-participant="localParticipant"
  :active-speaker-id="activeSpeakerId"
  :pinned-participant-id="pinnedParticipantId"
  :is-screen-sharing="isScreenSharing"
  @pin="handlePin"
  @unpin="handleUnpin"
/>
```

**Props:**

- `participants` - Array of remote participants
- `localParticipant` - Local participant object
- `activeSpeakerId` - ID of the current speaker
- `pinnedParticipantId` - ID of the pinned participant
- `isScreenSharing` - Whether screen sharing is active

### ParticipantTile

Renders a single participant with video, audio level indicator, and status badges.

```vue
<ParticipantTile
  :participant="participant"
  :is-local="false"
  :is-active-speaker="true"
  :is-pinned="false"
  @pin="handlePin"
/>
```

### ControlBar

Meeting control buttons for camera, microphone, screen share, and leave.

```vue
<ControlBar
  :is-video-enabled="isVideoEnabled"
  :is-audio-enabled="isAudioEnabled"
  :is-screen-sharing="isScreenSharing"
  @toggle-video="handleToggleVideo"
  @toggle-audio="handleToggleAudio"
  @toggle-screen-share="handleToggleScreenShare"
  @leave="handleLeave"
/>
```

### ChatPanel

Real-time chat sidebar with message history.

```vue
<ChatPanel :room-id="roomId" :user-name="userName" @close="handleCloseChat" />
```

### ParticipantList

Sidebar showing all participants with status indicators.

```vue
<ParticipantList
  :participants="participants"
  :local-participant="localParticipant"
  :active-speaker-id="activeSpeakerId"
  @close="handleCloseList"
/>
```

### ScreenShareView

Full-width screen share display with presenter info.

```vue
<ScreenShareView
  :participant-id="screenShare.participantId"
  :participant-name="screenShare.participantName"
  :stream="screenShare.stream"
  :is-local="true"
  @stop-sharing="handleStopSharing"
/>
```

## Composables

### useVideoRoom

Main composable for video room management.

```typescript
import { useVideoRoom } from './composables/useVideoRoom'

const {
  participants, // Remote participants
  localParticipant, // Local participant
  activeSpeakerId, // Current speaker ID
  pinnedParticipantId, // Pinned participant ID
  isVideoEnabled, // Camera state
  isAudioEnabled, // Microphone state
  isJoined, // Room join state
  roomId, // Current room ID
  joinRoom, // Join a room
  leaveRoom, // Leave current room
  toggleVideo, // Toggle camera
  toggleAudio, // Toggle microphone
  pinParticipant, // Pin a participant
  unpinParticipant, // Unpin participant
} = useVideoRoom()

// Join a room
await joinRoom('meeting-123', 'John Doe')

// Toggle camera
toggleVideo()

// Leave room
leaveRoom()
```

### useScreenShare

Screen sharing functionality.

```typescript
import { useScreenShare } from './composables/useScreenShare'

const {
  isSharing, // Screen sharing state
  stream, // MediaStream
  error, // Error message
  startSharing, // Start screen share
  stopSharing, // Stop screen share
} = useScreenShare()

// Start sharing
await startSharing()

// Stop sharing
stopSharing()
```

## Participant Interface

```typescript
interface VideoRoomParticipant {
  id: string
  name: string
  videoStream: MediaStream | null
  audioStream: MediaStream | null
  screenStream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
  isSpeaking: boolean
  isScreenSharing: boolean
  audioLevel: number
  joinedAt: Date
}
```

## Grid Layout Rules

| Participants | Grid Layout |
| ------------ | ----------- |
| 1            | 1x1         |
| 2            | 2x1         |
| 3-4          | 2x2         |
| 5-6          | 3x2         |
| 7-9          | 3x3         |
| 10-12        | 4x3         |
| 13+          | 4x4         |

## Styling

The template uses PrimeVue components with the `lara-dark-blue` theme. Custom CSS variables are defined in `main.css`:

```css
:root {
  --video-room-bg: var(--surface-ground);
  --video-tile-bg: var(--surface-card);
  --active-speaker-color: var(--green-500);
  --pinned-participant-color: var(--primary-500);
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## Integration with VueSIP

This template demonstrates how to build a video conferencing application using VueSIP composables. For production use, integrate with:

- `useConference` - For SIP-based conference calls
- `useMediaDevices` - For device selection
- `useActiveSpeaker` - For active speaker detection
- `useGalleryLayout` - For gallery layout calculations
 
## Cloudflare Pages (Deploy)

This template is ready to deploy on Cloudflare Pages.

- Project name: `vuesip-video-room`
- Config: `templates/video-room/wrangler.toml`

Commands:

```bash
# From repo root
pnpm build

cd templates/video-room
pnpm build

# Create project once (safe if it already exists)
wrangler pages project create vuesip-video-room --production-branch=main

# Deploy the dist/ folder
wrangler pages deploy dist --project-name=vuesip-video-room
```

After deploying, map your subdomain (e.g., `video.vuesip.com`) to the Pages project in Cloudflare Pages → Custom Domains.
## License

MIT
