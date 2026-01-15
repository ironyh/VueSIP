# Live Demos

Explore VueSIP demos deployed under dedicated subdomains. Each app is isolated for clean PWA/service worker scopes and simpler backend CORS.

> Replace the domains below with your own if self-hosting. Locally, use the default ports listed.

## Softphone

- PWA Softphone: https://softphone.vuesip.com
- Basic Softphone: https://basic-softphone.vuesip.com (optional)
- Local (PWA): http://localhost:3002
- Highlights: Installable PWA, push notifications, offline cache, full call controls, device selection.

## IVR Tester

- URL: https://ivr.vuesip.com
- Local: http://localhost:3005
- Highlights: Build IVR trees visually, send DTMF, capture transcripts, export sessions (Markdown/CSV/JSON).

## Video Room (Demo)

- URL: https://video.vuesip.com
- Local: http://localhost:3003
- Highlights: Multi-participant grid, active speaker highlighting, screen share, chat (UI scaffold; plug in your signaling).

## Call Center

- URL: https://callcenter.vuesip.com (or https://cc.vuesip.com)
- Local: http://localhost:3004
- Highlights: Agent dashboard, queues, supervisor controls, disposition workflow. Requires AMI WS proxy.

## Minimal / Basic Softphone (Local Demos)

- Minimal: http://localhost:3000
- Basic Softphone: http://localhost:3001

## Default Ports

| Template        | Port | URL                   |
| --------------- | ---- | --------------------- |
| Minimal         | 3000 | http://localhost:3000 |
| Basic Softphone | 3001 | http://localhost:3001 |
| PWA Softphone   | 3002 | http://localhost:3002 |
| Video Room      | 3003 | http://localhost:3003 |
| Call Center     | 3004 | http://localhost:3004 |
| IVR Tester      | 3005 | http://localhost:3005 |

## Deploying To Subdomains

We recommend subdomains for each app (e.g., `softphone.vuesip.com`, `ivr.vuesip.com`, `video.vuesip.com`). On Cloudflare Pages, configure a Pages project per app and add a `CNAME` in DNS. On Vercel/Netlify, create a project per app and add each subdomain in the project’s domain settings.
