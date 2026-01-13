# VueSIP PWA Softphone Template

A production-ready Progressive Web App (PWA) softphone template built with Vue 3 and VueSIP. This template provides a mobile-first, installable softphone that can receive push notifications for incoming calls.

## Features

- **PWA Support**: Installable on mobile and desktop devices
- **Push Notifications**: Receive incoming call notifications even when the app is in background
- **Offline Capable**: Service worker caches assets for offline use
- **Mobile-First Design**: Touch-friendly UI optimized for mobile devices
- **Dark Mode**: Modern dark theme with beautiful gradients
- **Full Call Controls**: Mute, hold, speaker toggle, and DTMF keypad
- **Call History**: View and redial recent calls
- **Device Selection**: Choose microphone and speaker devices

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- VueSIP library built (`pnpm build` in root directory)

### Installation

```bash
cd templates/pwa-softphone
pnpm install
```

### Development

```bash
pnpm dev
```

The app will be available at `http://localhost:3002`

### Production Build

```bash
pnpm build
```

The built files will be in the `dist/` directory.

## Project Structure

```
pwa-softphone/
├── public/
│   ├── icons/           # PWA icons
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── sw.js            # Service worker
├── src/
│   ├── components/
│   │   ├── DialPad.vue      # Dial pad with DTMF
│   │   ├── CallScreen.vue   # Active call UI
│   │   ├── IncomingCall.vue # Incoming call overlay
│   │   └── Settings.vue     # SIP configuration form
│   ├── composables/
│   │   ├── usePhone.ts           # VueSIP phone wrapper
│   │   ├── usePushNotifications.ts # Push notification handling
│   │   └── usePwaInstall.ts      # PWA install prompt
│   ├── styles/
│   │   └── main.css         # Global styles
│   ├── App.vue              # Main app component
│   └── main.ts              # App entry point
├── index.html
├── vite.config.ts           # Vite + PWA plugin config
├── tsconfig.json
└── package.json
```

## Configuration

### SIP Server

Enter your SIP credentials in the Settings screen:

- **WebSocket Server**: Your SIP server's WebSocket URL (e.g., `wss://sip.example.com:8089/ws`)
- **SIP URI**: Your SIP address (e.g., `sip:1001@sip.example.com`)
- **Password**: Your SIP password
- **Display Name**: Optional display name for caller ID

### PWA Manifest

The PWA manifest is configured in `vite.config.ts`. Customize the following:

```typescript
VitePWA({
  manifest: {
    name: 'Your Softphone Name',
    short_name: 'Softphone',
    theme_color: '#4f46e5',
    // ...
  },
})
```

### Icons

Replace the placeholder icons in `public/icons/` with your own:

- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels (also used as maskable icon)

## Push Notifications

The template includes push notification support for incoming calls. To fully enable server-side push:

1. Generate VAPID keys for your server
2. Implement a push notification server
3. Call `subscribeToPush(vapidPublicKey)` from `usePushNotifications`

### Local Notifications

When the app is in the background and a call comes in, a local notification is shown automatically if the user has granted notification permissions.

## Service Worker

The service worker (`public/sw.js`) handles:

- **Caching**: Static assets are cached for offline use
- **Push Events**: Incoming push notifications are displayed
- **Notification Actions**: Answer/Reject buttons on incoming call notifications

## Customization

### Theme Colors

Edit `src/styles/main.css` to customize colors:

```css
:root {
  --color-primary: #4f46e5; /* Main accent color */
  --color-success: #22c55e; /* Answer/call button */
  --color-error: #ef4444; /* End/reject button */
  --bg-primary: #0f0f1a; /* Main background */
  --bg-secondary: #1a1a2e; /* Card backgrounds */
}
```

### Adding Components

The app uses a simple component structure. Add new features by:

1. Creating a new component in `src/components/`
2. Adding new tabs or views in `App.vue`
3. Creating composables for business logic in `src/composables/`

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 14+ (iOS 14.5+)

Note: Push notifications require HTTPS in production.

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Cloudflare Pages

```bash
npm i -g wrangler
wrangler pages deploy dist
```

## Troubleshooting

### PWA Install Prompt Not Showing

- Ensure you're serving over HTTPS (or localhost for development)
- Check that the manifest is valid at `/manifest.webmanifest`
- Verify icons are accessible

### Push Notifications Not Working

- Request notification permission: `await requestPushPermission()`
- Check browser notification settings
- Ensure service worker is registered

### Audio Issues

- Check microphone permissions in browser settings
- Verify audio device selection in Settings
- Some browsers require user interaction before playing audio

## License

MIT
