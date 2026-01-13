# VueSIP Growth Roadmap - Developer-First Strategy

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform VueSIP into the most adopted Vue.js SIP library through developer-first growth strategy

**Strategy:** Developer adoption first - Prioritize DX, documentation, easy onboarding. More devs = more enterprise deals naturally.

**Business Model:** Open core + Pro tier for compliance/support needs only

**Timeline:** 10 months (January - October 2026)

---

## Strategic Framework

### Developer Journey Stages

```
DISCOVER → TRY → BUILD → SCALE → PAY
   │         │      │       │       │
   │         │      │       │       └─ @vuesip/enterprise (Pro tier)
   │         │      │       └─ Analytics, Multi-provider
   │         │      └─ Real composables, Templates
   │         └─ Mock mode, Interactive playground
   └─ SEO, Social proof, Docs landing page
```

### Core Insights

1. **Primary friction points**: Getting started is hard + Documentation gaps
2. **First 5 minutes**: Guided tutorial with mock mode (no server needed)
3. **Revenue model**: Free = everything developers need, Pro = compliance & support

---

## Pricing Model

| Tier           | Price             | Includes                                                                                               |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Free**       | $0                | Everything: Core (70+ composables), CRM adapters, analytics, templates, AI features, community support |
| **Pro**        | $199/mo           | Compliance suite (PCI-DSS, HIPAA, GDPR), SLA guarantee, priority email support, training sessions      |
| **Enterprise** | Custom ($500+/mo) | Dedicated support engineer, custom integrations, on-premise deployment assistance, audit assistance    |

**Philosophy**: Maximize adoption. Only companies with compliance budgets or support requirements pay.

---

## Phase 0.5: Developer Experience Foundation (Month 1)

**Goal**: Developer goes from "What's VueSIP?" to "This is cool!" in under 10 minutes.

### 0.5.1 Mock Mode (`useSipMock`)

Zero-config simulation for learning and testing:

```typescript
import { useSip } from 'vuesip'

const sip = useSip({
  mock: true, // No server needed!
})

await sip.call('555-1234') // Simulates ringing → connected
sip.hangup() // Simulates call end
sip.on('incoming', (call) => {
  /* simulated incoming */
})
```

**Features**:

- Configurable delays (ring time, connect time)
- Simulated call quality events
- Fake remote party names/numbers
- Works with ALL composables

### 0.5.2 Interactive Tutorial

**Structure** (VitePress-based):

| Part                         | Duration | Content                             |
| ---------------------------- | -------- | ----------------------------------- |
| 1. "Hello VueSIP"            | 5 min    | Mock mode, make your first call     |
| 2. "Building a Softphone UI" | 15 min   | Call controls, status display, DTMF |
| 3. "Real Server Connection"  | 10 min   | Provider signup, real credentials   |
| 4. "Advanced Features"       | 20 min   | Transfer, conferencing, recording   |

Each step includes:

- Runnable code (embedded StackBlitz/CodeSandbox)
- "What you learned" summary
- "Common mistakes" callout
- Link to API reference

### 0.5.3 Landing Page Improvements

- Hero: "SIP calling for Vue.js - works in 5 minutes"
- Live demo widget (mock mode, no signup)
- Testimonials/logos (as adoption grows)
- Clear path: Tutorial → Templates → API Reference

**Deliverables**:

- [ ] `useSipMock` composable
- [ ] 4-part tutorial in docs
- [ ] Landing page redesign
- [ ] Interactive playground

---

## Phase 1: Quick Wins & Templates (Months 2-3)

**Goal**: Developer has working production code in under an hour.

### 1.1 Production-Ready Templates

| Template            | Status  | Key Composables         |
| ------------------- | ------- | ----------------------- |
| `basic-softphone`   | Exists  | useSip, useCallControls |
| `call-center-agent` | Exists  | useAgentState, useQueue |
| `pwa-softphone`     | **NEW** | useSip + PWA manifest   |
| `click-to-call`     | **NEW** | useClickToCall          |
| `video-room`        | **NEW** | useConference, useVideo |
| `ivr-tester`        | **NEW** | useAmiIVR, useDTMF      |

### 1.2 `useClickToCall` Composable

Embeddable calling widget for any website:

```typescript
import { useClickToCall } from 'vuesip'

const { widget, isMinimized, call, configure } = useClickToCall({
  position: 'bottom-right',
  provider: 'telnyx',
  apiKey: '...',
  defaultNumber: '+1-800-SUPPORT',
})
```

**Features**:

- Draggable/minimizable
- Position persistence (localStorage)
- Mobile responsive
- CSS variable customization

### 1.3 PWA Infrastructure

Service worker for incoming call notifications when backgrounded:

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VueSIP Softphone',
        display: 'standalone',
      },
    }),
  ],
}
```

**Deliverables**:

- [ ] `useClickToCall` composable
- [ ] PWA softphone template
- [ ] Video room template
- [ ] IVR tester template

---

## Phase 2: Core Power Features (Months 3-5)

**Goal**: Production-grade features for real applications.

### 2.1 Advanced AMI Composables

| Composable        | Use Case                         | Priority |
| ----------------- | -------------------------------- | -------- |
| `useAmiOriginate` | Click-to-call from CRM           | High     |
| `useAmiSpy`       | Supervisor monitor/whisper/barge | High     |
| `useAmiRedirect`  | Attended transfer via AMI        | Medium   |
| `useAmiBridge`    | Conference bridge management     | Medium   |
| `useAmiPresence`  | BLF/presence indicators          | Low      |

```typescript
const { originate, status } = useAmiOriginate(amiClient)

await originate({
  channel: 'PJSIP/1001',
  exten: '+1-555-123-4567',
  context: 'outbound',
  callerId: 'Sales <+1-800-COMPANY>',
})
```

### 2.2 Audio Processing Suite

```typescript
const { enableNoiseSuppression, enableEchoCancellation, audioQualityScore, isProcessing } =
  useAudioProcessing(mediaStream, {
    noiseSuppressionLevel: 'aggressive',
    echoCancellation: true,
    autoGainControl: true,
  })
```

**Technical approach**:

- RNNoise compiled to WASM (BSD licensed)
- Web Audio API for echo cancellation
- Real-time MOS quality scoring

### 2.3 Multi-Provider Abstraction

```typescript
import { createSipClient, TelnyxProvider, TwilioProvider } from 'vuesip'

const client = createSipClient({
  provider: new TelnyxProvider({ apiKey }),
  // or: new TwilioProvider({ accountSid, authToken })
})
```

**Deliverables**:

- [ ] `useAmiOriginate` composable
- [ ] `useAmiSpy` composable
- [ ] `useAudioProcessing` composable
- [ ] Provider abstraction layer

---

## Phase 3: AI Differentiators (Months 5-7)

**Goal**: Features that make VueSIP stand out from alternatives.

### 3.1 Sentiment Analysis

Builds on existing transcription:

```typescript
import { useTranscription, useSentiment } from 'vuesip'

const transcription = useTranscription(mediaStream)
const {
  currentSentiment, // -1 (angry) to +1 (happy)
  sentimentTrend, // 'improving' | 'declining' | 'stable'
  emotionBreakdown,
  alerts,
  onEscalation,
} = useSentiment(transcription, {
  escalationThreshold: -0.5,
  windowSize: 30,
})
```

**Implementation**:

- Free: Browser-based (Transformers.js + small model)
- Pro: API-based option (better accuracy)

### 3.2 Smart Call Routing Hooks

```typescript
const { registerRoutingRule, suggestAgent } = useSmartRouting(amiClient)

registerRoutingRule('language', async (call) => {
  const language = await detectLanguage(call.callerAudio)
  return { language, preferAgentsWithSkill: language }
})

registerRoutingRule('sentiment', async (call) => {
  if (call.ivr.sentiment < -0.3) {
    return { priority: 'high', preferAgentsWithSkill: 'de-escalation' }
  }
})
```

### 3.3 Call Summary Generation

```typescript
const { generateSummary, extractActionItems } = useCallSummary()

const summary = await generateSummary(transcription.fullText, {
  format: 'bullet-points',
  maxLength: 200,
})
// Returns: { summary, actionItems, sentiment, duration, topics }
```

**Deliverables**:

- [ ] `useSentiment` composable
- [ ] `useSmartRouting` composable
- [ ] `useCallSummary` composable

---

## Phase 4: Enterprise Features - Pro Tier (Months 7-10)

**Goal**: Monetization through compliance and support.

### 4.1 CRM Integration Layer

```typescript
// @vuesip/enterprise
import { useCRM, SalesforceAdapter } from '@vuesip/enterprise'

const crm = useCRM(
  new SalesforceAdapter({
    clientId: '...',
    instanceUrl: 'https://yourorg.salesforce.com',
  })
)

sip.on('incoming', async (call) => {
  const contact = await crm.lookupByPhone(call.remoteNumber)
  showScreenPop(contact)
})

sip.on('ended', async (call) => {
  await crm.logCall({
    contactId: contact.id,
    duration: call.duration,
    summary: await generateSummary(call.transcription),
  })
})
```

**Adapters**: Salesforce → HubSpot → Zendesk → Generic webhook

### 4.2 Compliance Suite

```typescript
import { useCompliance } from '@vuesip/enterprise'

const { pciMode, consentManager, auditLog, dataRetention } = useCompliance({
  regulations: ['PCI-DSS', 'GDPR'],
  consentRequired: true,
  retentionDays: 90,
})

pciMode.on('cardDetected', () => {
  recording.pause()
  ui.showSecureInput()
})
```

### 4.3 Analytics Dashboard Components

```vue
<template>
  <VueSipCallVolume :timeRange="'7d'" />
  <VueSipAgentPerformance :agentId="currentAgent" />
  <VueSipSentimentTrends />
  <VueSipQueueHealth :queues="['sales', 'support']" />
</template>
```

**Deliverables**:

- [ ] CRM adapter interface + Salesforce adapter
- [ ] HubSpot adapter
- [ ] Compliance suite (PCI-DSS, HIPAA, GDPR)
- [ ] Analytics dashboard components

---

## Dependency Graph

```
Mock Mode ──► Tutorial ──► Adoption ──► Everything else
     │
     └─► Critical path: Without mock mode, tutorial fails
                        Without tutorial, devs bounce
                        Without devs, nothing else matters
```

### Build Order

1. **Mock Mode** (blocks everything)
2. **Tutorial** (blocks adoption)
3. **Templates** (parallel with tutorial polish)
4. **AMI Composables** (after adoption baseline)
5. **Audio Processing** (parallel with AMI)
6. **AI Features** (after power features)
7. **Enterprise/Pro** (after AI differentiators)

---

## Success Metrics

| Phase   | Metric                    | Target              |
| ------- | ------------------------- | ------------------- |
| **0.5** | Tutorial completion rate  | >60% finish part 1  |
| **0.5** | Time to first call (mock) | <5 minutes          |
| **1**   | Template downloads        | 500/month           |
| **1**   | GitHub stars              | 500                 |
| **2**   | npm weekly downloads      | 1,000               |
| **2**   | Production deployments    | 50                  |
| **3**   | AI feature usage          | 30% of active users |
| **4**   | Pro tier conversions      | 10 paying customers |

---

## Files to Create/Modify

| File                                    | Action | Phase |
| --------------------------------------- | ------ | ----- |
| `src/composables/useSipMock.ts`         | CREATE | 0.5   |
| `docs/tutorial/`                        | CREATE | 0.5   |
| `docs/index.md`                         | MODIFY | 0.5   |
| `src/composables/useClickToCall.ts`     | CREATE | 1     |
| `templates/pwa-softphone/`              | CREATE | 1     |
| `templates/video-room/`                 | CREATE | 1     |
| `src/composables/useAmiOriginate.ts`    | CREATE | 2     |
| `src/composables/useAmiSpy.ts`          | CREATE | 2     |
| `src/composables/useAudioProcessing.ts` | CREATE | 2     |
| `src/composables/useSentiment.ts`       | CREATE | 3     |
| `src/composables/useSmartRouting.ts`    | CREATE | 3     |
| `src/composables/useCallSummary.ts`     | CREATE | 3     |
| `packages/enterprise/`                  | CREATE | 4     |

---

_This roadmap prioritizes developer adoption over feature completeness. Revenue comes from enterprises who need compliance - not from gating basic functionality._
