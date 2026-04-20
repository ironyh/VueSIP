<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="health"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import HealthCheck from './HealthCheck.vue'
import HealthCheckSrc from './HealthCheck.vue?raw'
import DiagnosticLog from './DiagnosticLog.vue'
import DiagnosticLogSrc from './DiagnosticLog.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A recording smoke-test answers one question: if a call comes in right now, will there be a recording tomorrow? The question sounds obvious and the failure modes are not. Disk fills up, Asterisk config drifts during an upgrade, MixMonitor fires but writes to the wrong directory, credentials rotate and nobody updates the AMI bot. Each of these is silent: calls still connect, agents still talk, and somewhere a compliance officer is about to find out the last six weeks of recordings don't exist.

The fix is an agent-style smoke-test that makes one real call every N minutes, verifies every step, and rings alarms when a step fails. Build it with two surfaces: a manual "run it now" health check for the operator debugging a ticket, and a diagnostic log that shows pass/fail history so drift is visible before it becomes an incident.`

const variants: DemoVariant[] = [
  {
    id: 'health',
    label: 'Health check',
    description: 'Runs a synthetic call end-to-end and asserts the recording lands on disk with the right format.',
    component: HealthCheck,
    source: HealthCheckSrc,
    sourceName: 'HealthCheck.vue',
    intro: `The health check is a step-by-step audit of the recording pipeline. Each step has an explicit assertion — not "did it work" but "did the \`MixMonitorStart\` event fire within 3 seconds" — and each step is cheap enough to run on every CI build, every deploy, and ad-hoc when a user reports a missing recording.

The non-negotiable piece is the file-on-disk check. A call that completes successfully and a file that shows up in \`/var/spool/asterisk/monitor/\` are two separate facts; MixMonitor can emit "started" and still write nothing if the disk is full or the path is misconfigured. Check both.`,
    keyPoints: [
      'Every step has an explicit pass/fail criterion — "call answered" is not a criterion, "ChannelStateDesc: Up within 5 s" is',
      'Smoke tests must clean up their own artefacts (delete the test recording) — otherwise the library fills with \`smoke-001.wav\` through \`smoke-99999.wav\` and nobody wants to sort them',
      'Separate bot credentials from human credentials. When the smoke-test user gets locked out, you should not lose the on-call engineer\'s login at the same time',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Run the smoke test on every deploy. The five-minute window between "I pushed the dialplan change" and "MixMonitor is now writing to /tmp for some reason" is where most recording outages start.',
      },
      {
        kind: 'warning',
        text: 'Do not run the smoke test against production queues. Use a dedicated context (\`smoke\`) and a dedicated test-destination extension (\`sip:echo@\`) — otherwise your on-call engineer gets paged by a test call at 3 AM.',
      },
      {
        kind: 'note',
        text: 'The \`Cause=16 Normal Clearing\` check is cheap and catches a class of bugs where the test completes but the channel was torn down by an error condition — the recording exists but is truncated.',
      },
    ],
    accessibility: [
      'Overall summary uses \`role="status"\` with \`aria-live="polite"\` — screen readers announce pass/fail transitions.',
      'Each step exposes its state via a visible icon AND a text label in the result block — colour alone never carries the state.',
      'Run button has \`:disabled\` + \`aria-pressed\`-style animation — the pulsing dot is decorative, the button text changes.',
    ],
    takeaway:
      'A recording smoke-test is the only cheap insurance policy against silent compliance failure. Every step gets an assertion; cleanup is non-negotiable.',
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic log',
    description: 'Recent smoke-test results with per-step timings and a pass/fail timeline.',
    component: DiagnosticLog,
    source: DiagnosticLogSrc,
    sourceName: 'DiagnosticLog.vue',
    intro: `The diagnostic log turns individual smoke-test runs into a time series. What you care about is not any one run, it's the pattern: "we were green for a month, then suddenly p95 doubled and step 6 started failing 15% of the time." The log makes that pattern legible at a glance.

Expand-on-click shows per-step timings. The interesting signal is usually in a specific step — step 6 (file-on-disk) slowing from 400 ms to 1800 ms over a week tells you the storage subsystem is degrading. Without per-step timing, you see a slow overall run and guess.`,
    keyPoints: [
      'p95 matters more than mean — recording pipelines fail in spikes, not averages; a 99%-green test with an occasional 30-second step is hiding a disk problem',
      'Capture the error message verbatim in the summary — "step 6 failed" is useless, "Expected file in /var/spool after 2 s — none found. Disk 96% full" is actionable',
      'Per-step latency history is the most useful view — seeing file-on-disk step climb from 400 ms to 1800 ms over a week predicts disk failure before it happens',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Wire the log to your alerting. A smoke-test failure is a Tier-1 page during business hours; three consecutive failures page regardless of time. Pages from silent recording failures are worth the noise.',
      },
      {
        kind: 'note',
        text: 'Store the raw trace output (AMI responses, CLI output) with each run. "It failed because x" is a hypothesis; the raw trace is evidence. Storage is cheap, retention here can be days not years.',
      },
      {
        kind: 'warning',
        text: 'Do not let the log itself become a queue-poisoning incident. Retain the last 1000 runs, not everything. A log that takes 30 seconds to render is a log nobody reads.',
      },
    ],
    accessibility: [
      'Expand buttons are full-row \`<button>\` elements with \`aria-expanded\` — keyboard users can navigate and toggle details with Enter / Space.',
      'Pass / Fail badges use "PASS" / "FAIL" text in addition to green / red colour — readable in monochrome printouts and for colour-blind users.',
      'Step-status icons are paired with text names — screen readers get "step 6 failed, Recording file on disk, 650 ms" without parsing the icon.',
    ],
    takeaway:
      'A smoke-test is data. The log turns that data into a time-series that catches drift before it becomes an outage.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Client can trigger smoke tests via the test bot.'
      : 'Not strictly required — bot can run server-side; client registration only needed if you drive tests from here.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'AMI test-bot credentials',
    met: true,
    hint: 'Asterisk Manager user with originate + monitor privileges, rotated separately from humans.',
  },
  {
    label: 'Dedicated smoke context',
    met: true,
    hint: 'Isolated dialplan context (\`smoke\`) + echo extension so tests cannot page on-call engineers.',
  },
])
</script>
