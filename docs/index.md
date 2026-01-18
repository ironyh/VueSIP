---
layout: home

hero:
  name: VueSIP
  text: SIP Calling for Vue.js
  tagline: Build production-ready softphones in minutes. No server required to start learning!
  image:
    src: /logo.svg
    alt: VueSIP
  actions:
    - theme: brand
      text: Start Tutorial
      link: /tutorial/
    - theme: alt
      text: View on GitHub
      link: https://github.com/ironyh/VueSIP
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: "\U0001F680"
    title: Zero-Config Mock Mode
    details: Build and test without a SIP server. Mock mode simulates the entire SIP lifecycle for tutorials and development.
    link: /tutorial/
    linkText: Try the Tutorial
  - icon: "\U0001F4DE"
    title: 70+ Composables
    details: Everything from basic calls to conferencing, transcription, and call quality monitoring. All with full TypeScript support.
    link: /api/composables
    linkText: Browse Composables
  - icon: "\U0001F3E2"
    title: Enterprise Ready
    details: Call centers, CRM integration, analytics dashboards. Production-tested patterns for real-world applications.
    link: /guide/templates
    linkText: View Templates
  - icon: "\U0001F916"
    title: AI-Powered Features
    details: Real-time transcription, sentiment analysis, and keyword detection. Built-in support for Deepgram, AssemblyAI, and more.
    link: /guide/transcription
    linkText: Learn More
  - icon: "\U0001F4F1"
    title: Mobile Ready
    details: PWA support, responsive templates, and picture-in-picture. Works great on desktop and mobile browsers.
    link: /examples/picture-in-picture
    linkText: See Examples
  - icon: "\U0001F50C"
    title: Multi-Provider Support
    details: Telnyx, VoIP.ms, Twilio, or your own Asterisk/FreeSWITCH server. Easy provider switching with unified API.
    link: /api/providers
    linkText: Provider Docs
---

<style>
.demo-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.demo-container {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.section-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.quick-start-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.step-card {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid var(--vp-c-brand-1);
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--vp-c-brand-1);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.step-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.path-section {
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg-elv) 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-top: 2rem;
}

.path-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.path-card {
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.path-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.path-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.path-title {
  font-weight: 600;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.path-desc {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.stats-section {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  margin-top: 3rem;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-badge img {
  height: 24px;
}

.use-cases {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.use-case {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 0.95rem;
}

.use-case-icon {
  font-size: 1.5rem;
}

.cta-section {
  text-align: center;
  padding: 3rem 1.5rem;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-bg-soft) 100%);
  border-radius: 16px;
  margin-top: 3rem;
}

.cta-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.cta-btn-primary {
  background: var(--vp-c-brand-1);
  color: white;
}

.cta-btn-primary:hover {
  background: var(--vp-c-brand-2);
}

.cta-btn-secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.cta-btn-secondary:hover {
  border-color: var(--vp-c-brand-1);
}
</style>

<div class="demo-section">

## Live Demo: Mock Mode

<p class="section-subtitle">Start building immediately - no SIP server required</p>

<div class="demo-container">
<div class="demo-header">Try this in your Vue app right now</div>

```vue
<script setup>
import { useSipMock } from 'vuesip'

const { isConnected, activeCall, connect, call, hangup } = useSipMock()

async function makeTestCall() {
  await connect() // Simulates WebSocket + SIP registration
  await call('555-1234') // Simulates outgoing call flow
}
</script>

<template>
  <div>
    <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
    <p v-if="activeCall">Call: {{ activeCall.state }}</p>

    <button @click="makeTestCall">Make Test Call</button>
    <button @click="hangup" v-if="activeCall">Hang Up</button>
  </div>
</template>
```

</div>

Mock mode simulates the entire SIP lifecycle: connection, registration, call states, DTMF, hold/mute, and even incoming calls. Your components will work unchanged when you switch to production.

<a href="/tutorial/" class="cta-btn cta-btn-primary" style="display: inline-flex; margin-top: 1rem;">
  Start the Tutorial
</a>

</div>

<div class="demo-section">

## Quick Start

<p class="section-subtitle">Get calling in 3 simple steps</p>

<div class="quick-start-steps">

<div class="step-card">
<div class="step-number">1</div>
<div class="step-title">Install</div>

```bash
npm install vuesip
```

</div>

<div class="step-card">
<div class="step-number">2</div>
<div class="step-title">Import</div>

```typescript
import { useSip } from 'vuesip'
// or for testing:
import { useSipMock } from 'vuesip'
```

</div>

<div class="step-card">
<div class="step-number">3</div>
<div class="step-title">Call</div>

```typescript
const sip = useSip({
  /* config */
})
await sip.connect()
await sip.call('extension')
```

</div>

</div>

</div>

<div class="demo-section">

## Path to Production

<p class="section-subtitle">From learning to deployment</p>

<div class="path-section">
<div class="path-grid">

<a href="/tutorial/" class="path-card">
<div class="path-icon">1. Learn</div>
<div class="path-title">Interactive Tutorial</div>
<div class="path-desc">Build with mock mode. No server needed. 50 minutes to proficiency.</div>
</a>

<a href="/guide/templates" class="path-card">
<div class="path-icon">2. Build</div>
<div class="path-title">Starter Templates</div>
<div class="path-desc">Copy a template: minimal, softphone, or call center. Production-ready code.</div>
</a>

<a href="/guide/getting-started" class="path-card">
<div class="path-icon">3. Deploy</div>
<div class="path-title">Production Guide</div>
<div class="path-desc">Connect to Telnyx, VoIP.ms, Twilio, or your own PBX. Go live with confidence.</div>
</a>

</div>
</div>

</div>

<div class="demo-section">

## What Can You Build?

<div class="use-cases">
<div class="use-case"><span class="use-case-icon">softphone</span> Web-based softphones</div>
<div class="use-case"><span class="use-case-icon">headset</span> Call center agent apps</div>
<div class="use-case"><span class="use-case-icon">click</span> Click-to-call widgets</div>
<div class="use-case"><span class="use-case-icon">support</span> CRM calling integration</div>
<div class="use-case"><span class="use-case-icon">video</span> Video conferencing</div>
<div class="use-case"><span class="use-case-icon">health</span> Telehealth applications</div>
</div>

</div>

### Call Management

- Outgoing and incoming calls
- Call hold, resume, and transfer
- DTMF tone generation
- Multi-line support
- Call history with persistence

### Media Handling

- Audio and video calls
- Device enumeration and selection
- Local media preview
- Screen sharing
- Audio/video quality controls

### Advanced Capabilities

- SIP presence and messaging
- Real-time status updates
- Typing indicators
- Encrypted messaging
- Custom SIP headers

### Quality Assurance

- Comprehensive error handling
- Automatic reconnection
- Network quality monitoring
- Performance optimization
- Security best practices

<div class="demo-section">

<div class="stats-section">
<div class="stat-badge">
<span>TypeScript</span>
<img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
</div>
<div class="stat-badge">
<span>Vue 3</span>
<img src="https://img.shields.io/badge/Vue-3.x-brightgreen" alt="Vue 3">
</div>
<div class="stat-badge">
<span>Tree-Shakeable</span>
<img src="https://img.shields.io/badge/Tree--Shakeable-Yes-green" alt="Tree-Shakeable">
</div>
<div class="stat-badge">
<span>70+ Composables</span>
<img src="https://img.shields.io/badge/Composables-70%2B-purple" alt="Composables">
</div>
</div>

</div>

<div class="demo-section">

<div class="cta-section">
<div class="cta-title">Ready to add calling to your Vue app?</div>
<p style="color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Start with the tutorial - no SIP credentials required.
</p>
<div class="cta-buttons">
<a href="/tutorial/" class="cta-btn cta-btn-primary">
Start Tutorial
</a>
<a href="/examples/" class="cta-btn cta-btn-secondary">
Browse 50+ Demos
</a>
<a href="https://github.com/ironyh/VueSip" class="cta-btn cta-btn-secondary">
View on GitHub
</a>
</div>
</div>

</div>

<div class="demo-section">

## Community & Support

- **[GitHub Issues](https://github.com/ironyh/VueSip/issues)** - Report bugs or request features
- **[GitHub Discussions](https://github.com/ironyh/VueSip/discussions)** - Ask questions and share ideas
- **[Examples Playground](/examples/)** - 50+ interactive demos to explore

VueSIP is [MIT licensed](https://github.com/ironyh/VueSip/blob/main/LICENSE).

</div>
