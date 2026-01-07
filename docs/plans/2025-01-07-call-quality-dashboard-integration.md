# Call Quality Dashboard Playground Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the CallQualityDashboard component into the VueSIP playground navigation so users can access and explore the Phase 2.1 call quality composables.

**Architecture:** Create a new example definition file following the existing pattern (`call-quality.ts`, `webrtc-stats.ts`), register it in the example index, and provide comprehensive code snippets demonstrating the three new composables (`useCallQualityScore`, `useNetworkQualityIndicator`, `useBandwidthAdaptation`).

**Tech Stack:** Vue 3, TypeScript, VueSIP composables

---

## Task 1: Create Example Definition File

**Files:**

- Create: `playground/examples/call-quality-dashboard.ts`

**Step 1: Create the example definition file**

```typescript
// playground/examples/call-quality-dashboard.ts
import type { ExampleDefinition } from './types'
import CallQualityDashboard from '../components/CallQualityDashboard.vue'

export const callQualityDashboardExample: ExampleDefinition = {
  id: 'call-quality-dashboard',
  icon: '📈',
  title: 'Call Quality Dashboard',
  description:
    'Comprehensive call quality monitoring with scoring, network indicators, and bandwidth adaptation',
  category: 'sip',
  tags: ['Advanced', 'Quality', 'Monitoring', 'Dashboard', 'Phase 2.1'],
  component: CallQualityDashboard,
  setupGuide:
    '<p>Interactive dashboard demonstrating the Phase 2.1 call quality composables: <code>useCallQualityScore</code> for comprehensive quality scoring, <code>useNetworkQualityIndicator</code> for visual signal bars, and <code>useBandwidthAdaptation</code> for intelligent bandwidth recommendations.</p>',
  codeSnippets: [
    // Will add in subsequent steps
  ],
}
```

**Step 2: Verify file was created**

Run: `cat playground/examples/call-quality-dashboard.ts | head -20`
Expected: File contents displayed

**Step 3: Commit**

```bash
git add playground/examples/call-quality-dashboard.ts
git commit -m "feat(playground): add call quality dashboard example definition"
```

---

## Task 2: Add Code Snippets - useCallQualityScore

**Files:**

- Modify: `playground/examples/call-quality-dashboard.ts`

**Step 1: Add useCallQualityScore code snippet**

Add to the `codeSnippets` array:

```typescript
{
  title: 'useCallQualityScore - Basic Usage',
  description: 'Comprehensive call quality scoring with trend analysis',
  code: `import { useCallQualityScore } from 'vuesip'

const { score, trend, history, updateScore, reset, weights } = useCallQualityScore({
  historySize: 10,
  updateInterval: 1000,
  enableTrendAnalysis: true
})

// Update with WebRTC stats
updateScore({
  packetLoss: 0.5,      // percentage (0-100)
  jitter: 15,           // milliseconds
  rtt: 80,              // round-trip time in ms
  mos: 4.2,             // Mean Opinion Score (1-5)
  bitrate: 128,         // current bitrate in kbps
  previousBitrate: 120  // for stability calculation
})

// Access the computed score
console.log('Overall Score:', score.value?.overall)     // 0-100
console.log('Grade:', score.value?.grade)               // A, B, C, D, or F
console.log('Audio Score:', score.value?.audio)         // 0-100
console.log('Network Score:', score.value?.network)     // 0-100

// Check trend direction
console.log('Trend:', trend.value?.direction)  // 'improving', 'stable', 'degrading'
console.log('Confidence:', trend.value?.confidence)  // 0-1`,
},
{
  title: 'useCallQualityScore - Video Call Support',
  description: 'Quality scoring for video calls with video-specific metrics',
  code: `import { useCallQualityScore } from 'vuesip'

const { score, updateScore } = useCallQualityScore()

// Update with video call stats
updateScore({
  packetLoss: 1.2,
  jitter: 20,
  rtt: 100,
  mos: 3.8,
  bitrate: 2500,
  // Video-specific metrics
  audioOnly: false,
  videoPacketLoss: 0.8,
  framerate: 28,
  targetFramerate: 30,
  resolutionWidth: 1280,
  resolutionHeight: 720,
  freezeCount: 0
})

// Video score is now available
console.log('Video Score:', score.value?.video)  // 0-100 (null for audio-only)
console.log('Description:', score.value?.description)  // Human-readable summary`,
},
```

**Step 2: Verify snippet added**

Run: `grep -c "useCallQualityScore" playground/examples/call-quality-dashboard.ts`
Expected: 2 or more matches

**Step 3: Run lint check**

Run: `npm run lint -- --fix`
Expected: No errors

**Step 4: Commit**

```bash
git add playground/examples/call-quality-dashboard.ts
git commit -m "feat(playground): add useCallQualityScore code snippets"
```

---

## Task 3: Add Code Snippets - useNetworkQualityIndicator

**Files:**

- Modify: `playground/examples/call-quality-dashboard.ts`

**Step 1: Add useNetworkQualityIndicator code snippet**

Add to the `codeSnippets` array:

```typescript
{
  title: 'useNetworkQualityIndicator - Signal Bars UI',
  description: 'Visual network quality indicator with signal bars and colors',
  code: `import { useNetworkQualityIndicator } from 'vuesip'

const { indicator, isAvailable, update, reset } = useNetworkQualityIndicator({
  updateInterval: 1000,
  estimateBandwidth: true,
  colors: {
    excellent: '#22c55e',  // green
    good: '#22c55e',
    fair: '#eab308',       // yellow
    poor: '#f97316',       // orange
    critical: '#ef4444',   // red
    unknown: '#9ca3af'     // gray
  },
  thresholds: {
    rtt: [50, 100, 200, 400],       // ms thresholds
    packetLoss: [0.5, 1, 2, 5],     // % thresholds
    jitter: [10, 20, 40, 80]        // ms thresholds
  }
})

// Update with network stats
update({
  rtt: 65,
  jitter: 12,
  packetLoss: 0.3,
  candidateType: 'host'  // 'host', 'srflx', 'prflx', 'relay'
})

// Use in template
// <NetworkSignalBars
//   :bars="indicator.bars"        // 1-5
//   :color="indicator.color"      // CSS color
//   :aria-label="indicator.ariaLabel"  // Accessibility
// />

console.log('Level:', indicator.value.level)  // 'excellent', 'good', 'fair', 'poor', 'critical'
console.log('Bars:', indicator.value.bars)    // 1-5
console.log('Icon:', indicator.value.icon)    // 'signal-excellent', etc.`,
},
{
  title: 'useNetworkQualityIndicator - Detailed Metrics',
  description: 'Access detailed network metrics for tooltips',
  code: `import { useNetworkQualityIndicator } from 'vuesip'

const { indicator, update } = useNetworkQualityIndicator()

// Update with full metrics including bandwidth
update({
  rtt: 75,
  jitter: 18,
  packetLoss: 0.8,
  bitrate: 128,
  availableOutgoingBitrate: 500,
  candidateType: 'srflx'
})

// Access detailed metrics for tooltip display
const details = indicator.value.details
console.log('RTT:', details.rtt, 'ms')
console.log('Jitter:', details.jitter, 'ms')
console.log('Packet Loss:', details.packetLoss, '%')
console.log('Bandwidth:', details.bandwidth, 'kbps')
console.log('Connection Type:', details.connectionType)

// Template example with tooltip
// <div :title="\`RTT: \${details.rtt}ms | Jitter: \${details.jitter}ms\`">
//   <SignalBars :level="indicator.level" />
// </div>`,
},
```

**Step 2: Verify snippet added**

Run: `grep -c "useNetworkQualityIndicator" playground/examples/call-quality-dashboard.ts`
Expected: 2 or more matches

**Step 3: Run lint check**

Run: `npm run lint -- --fix`
Expected: No errors

**Step 4: Commit**

```bash
git add playground/examples/call-quality-dashboard.ts
git commit -m "feat(playground): add useNetworkQualityIndicator code snippets"
```

---

## Task 4: Add Code Snippets - useBandwidthAdaptation

**Files:**

- Modify: `playground/examples/call-quality-dashboard.ts`

**Step 1: Add useBandwidthAdaptation code snippet**

Add to the `codeSnippets` array:

```typescript
{
  title: 'useBandwidthAdaptation - Intelligent Recommendations',
  description: 'Get bandwidth adaptation recommendations based on network conditions',
  code: `import { useBandwidthAdaptation } from 'vuesip'

const {
  recommendation,
  isAutoAdapting,
  constraints,
  update,
  setAutoAdapt,
  setConstraints,
  applySuggestion
} = useBandwidthAdaptation({
  constraints: {
    minVideoBitrate: 100,
    maxVideoBitrate: 2500,
    targetFramerate: 30,
    minFramerate: 15,
    preferredResolution: { width: 1280, height: 720, label: '720p' }
  },
  sensitivity: 0.5,  // 0-1, higher = more reactive
  autoAdapt: false,
  onRecommendation: (rec) => {
    console.log('New recommendation:', rec.action)
  }
})

// Update with current stats
update({
  availableBitrate: 800,
  currentBitrate: 1200,
  packetLoss: 3.5,
  rtt: 180,
  currentResolution: { width: 1280, height: 720, label: '720p' },
  currentFramerate: 25,
  videoEnabled: true,
  degradationEvents: 2
})

// Check recommendation
console.log('Action:', recommendation.value.action)  // 'upgrade', 'maintain', 'downgrade', 'critical'
console.log('Priority:', recommendation.value.priority)  // 'low', 'medium', 'high', 'critical'
console.log('Improvement:', recommendation.value.estimatedImprovement)  // 0-100`,
},
{
  title: 'useBandwidthAdaptation - Applying Suggestions',
  description: 'Handle and apply bandwidth adaptation suggestions',
  code: `import { useBandwidthAdaptation } from 'vuesip'

const { recommendation, applySuggestion, setConstraints } = useBandwidthAdaptation()

// Access specific suggestions
const suggestions = recommendation.value.suggestions
suggestions.forEach(suggestion => {
  console.log('Type:', suggestion.type)        // 'video', 'audio', 'network', 'codec'
  console.log('Message:', suggestion.message)
  console.log('Current:', suggestion.current)
  console.log('Recommended:', suggestion.recommended)
  console.log('Impact:', suggestion.impact)    // 0-100, higher = more improvement
})

// Apply a suggestion (e.g., reduce resolution)
const videoSuggestion = suggestions.find(s => s.type === 'video')
if (videoSuggestion) {
  applySuggestion(videoSuggestion)

  // Then update your media constraints accordingly
  // This triggers your app's logic to actually change resolution
}

// Or dynamically update constraints based on conditions
setConstraints({
  maxVideoBitrate: 1000,  // Reduce max bitrate
  targetFramerate: 24     // Lower framerate target
})`,
},
{
  title: 'useBandwidthAdaptation - Auto-Adaptation Mode',
  description: 'Enable automatic bandwidth adaptation',
  code: `import { useBandwidthAdaptation } from 'vuesip'
import { watch } from 'vue'

const {
  recommendation,
  isAutoAdapting,
  setAutoAdapt,
  update
} = useBandwidthAdaptation({
  autoAdapt: true,
  sensitivity: 0.7,  // Higher sensitivity for faster reactions
  onRecommendation: (rec) => {
    // Auto-adaptation callback
    if (rec.action === 'critical') {
      // Emergency: switch to audio-only
      disableVideo()
    } else if (rec.action === 'downgrade') {
      // Apply the highest-impact suggestion automatically
      const topSuggestion = rec.suggestions[0]
      applyMediaConstraint(topSuggestion)
    }
  }
})

// Toggle auto-adaptation
setAutoAdapt(true)   // Enable
setAutoAdapt(false)  // Disable for manual control

// Watch for changes
watch(recommendation, (rec) => {
  if (rec.priority === 'critical') {
    showQualityWarning('Connection quality is poor')
  }
})`,
},
```

**Step 2: Verify snippet added**

Run: `grep -c "useBandwidthAdaptation" playground/examples/call-quality-dashboard.ts`
Expected: 3 or more matches

**Step 3: Run lint check**

Run: `npm run lint -- --fix`
Expected: No errors

**Step 4: Commit**

```bash
git add playground/examples/call-quality-dashboard.ts
git commit -m "feat(playground): add useBandwidthAdaptation code snippets"
```

---

## Task 5: Register Example in Index

**Files:**

- Modify: `playground/examples/index.ts:17` (add import)
- Modify: `playground/examples/index.ts:74` (add to sipExamples array)

**Step 1: Add import statement**

Add after line 10 (after `callQualityExample` import):

```typescript
import { callQualityDashboardExample } from './call-quality-dashboard'
```

**Step 2: Add to sipExamples array**

Add after `webrtcStatsExample` (around line 73-74):

```typescript
  callQualityDashboardExample,
```

The sipExamples array should look like:

```typescript
export const sipExamples = [
  basicCallExample,
  videoCallExample,
  // ... other examples ...
  callQualityExample,
  webrtcStatsExample,
  callQualityDashboardExample, // <-- Add here
  connectionRecoveryExample,
  // ... rest ...
]
```

**Step 3: Verify registration**

Run: `grep "callQualityDashboardExample" playground/examples/index.ts`
Expected: 2 matches (import and array entry)

**Step 4: Run TypeScript check**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Run lint check**

Run: `npm run lint -- --fix`
Expected: No errors

**Step 6: Commit**

```bash
git add playground/examples/index.ts
git commit -m "feat(playground): register call quality dashboard in example index"
```

---

## Task 6: Run Full Test Suite

**Files:**

- None (verification only)

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (4700+ tests)

**Step 2: Run lint on entire project**

Run: `npm run lint`
Expected: No errors

**Step 3: Run TypeScript check**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Verify playground builds**

Run: `cd playground && npm run build`
Expected: Build succeeds without errors

---

## Task 7: Final Commit and Summary

**Files:**

- None (git operations only)

**Step 1: Review all changes**

Run: `git diff --stat main`
Expected: Shows changes to example files

**Step 2: Create summary commit (if not already committed incrementally)**

If changes weren't committed incrementally:

```bash
git add -A
git commit -m "feat(playground): integrate Call Quality Dashboard with Phase 2.1 composables

- Add call-quality-dashboard example definition
- Include code snippets for useCallQualityScore, useNetworkQualityIndicator, useBandwidthAdaptation
- Register in sipExamples for playground navigation
- Comprehensive documentation with usage patterns"
```

**Step 3: Verify integration**

Run: `npm run dev` (in playground directory)
Expected: Dashboard appears in SIP Features category in playground navigation

---

## Verification Checklist

- [ ] `playground/examples/call-quality-dashboard.ts` created with ExampleDefinition
- [ ] 7 code snippets covering all 3 composables
- [ ] Example registered in `playground/examples/index.ts`
- [ ] All 4700+ tests pass
- [ ] Lint passes with no errors
- [ ] TypeScript check passes
- [ ] Playground builds successfully
- [ ] Dashboard accessible from playground navigation under "SIP Features"
