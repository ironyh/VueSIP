<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="endpoint"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Endpoint from './Endpoint.vue'
import EndpointSrc from './Endpoint.vue?raw'
import Transports from './Transports.vue'
import TransportsSrc from './Transports.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `PJSIP is Asterisk's modern SIP stack and its configuration is blessedly modular — endpoints, auths, aors, transports, and identifies are separate objects that reference each other, instead of the chan_sip \`[2101]\` all-in-one stanza that hid sins. The price is that every "add a user" operation touches four files, and every "expose to WebRTC" change adds another six settings you have to get right or Chrome rejects the SDP.

This surface is two views. The endpoint editor is where you configure a specific \`[endpoint]\` stanza — codecs, NAT handling, DTMF mode, the whole WebRTC block. The transports view is the operational picture — what ports are listening, how many contacts, how hot the traffic is.`

const variants: DemoVariant[] = [
  {
    id: 'endpoint',
    label: 'Endpoint editor',
    description: 'Compose a pjsip.conf [endpoint] stanza with live preview.',
    component: Endpoint,
    source: EndpointSrc,
    sourceName: 'Endpoint.vue',
    intro: `Editing a PJSIP endpoint by hand is fine for one or two; past that you want a form that knows the rules. Codec order matters, \`direct_media = yes\` is tempting but wrong on cloud PBXs, the WebRTC profile needs six settings or Chrome refuses the offer. The generated-config preview is the learning path — operators see that toggling one checkbox adds three lines to the stanza, internalise the mapping, and are more confident next time.

\`webrtc = yes\` is the most-requested and most-misconfigured knob. It is shorthand for "turn on ICE, DTLS, AVPF, RTCP-MUX, and auto-generate certs". Enable it via a single toggle; the config view can show what it expanded to.`,
    keyPoints: [
      'Codec order is negotiated left-to-right — put the preferred codec first, not the fallback',
      '`force_rport=yes` + `rewrite_contact=yes` fix 90% of NAT traversal issues without needing a SIP ALG',
      '`webrtc = yes` is a meta-flag that implies six other settings; use it, do not recreate it by hand',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Ship the form with sane defaults (opus + g722 + ulaw, rfc4733 DTMF, webrtc=yes for browser clients). 90% of endpoints never need more.',
      },
      {
        kind: 'warning',
        text: 'Never set `direct_media = yes` for browser endpoints. The PBX must proxy RTP so STUN / TURN / DTLS negotiation survives.',
      },
      {
        kind: 'note',
        text: 'Asterisk 20+ supports `codec_prefs` for finer-grained preference (caller vs callee). Most UIs over-simplify this; the underlying stack allows asymmetry.',
      },
    ],
    accessibility: [
      'Every form field uses a `<dt>` / `<dd>` pair so screen readers announce label-then-value.',
      'Codec toggles are real checkboxes wrapped in labels; the ordered preview echoes the selection.',
      'Generated stanza is rendered as `<pre>` with preserved whitespace — copyable and screen-readable.',
    ],
    takeaway: 'PJSIP endpoint config is a lot of small decisions. Default to sane values, toggle `webrtc = yes` as a meta-flag, and always show the generated stanza.',
  },
  {
    id: 'transports',
    label: 'Transports',
    description: 'Live view of listening transports with contact counts and traffic.',
    component: Transports,
    source: TransportsSrc,
    sourceName: 'Transports.vue',
    intro: `The transports view is the operational truth. \`pjsip show transports\` tells you whether the stack is actually binding to the ports you expect, and the contacts/reqs-per-sec numbers tell you whether anyone is using them. New installs routinely fail here — a typo in \`bind\` makes PJSIP silently bind to 0.0.0.0 when you meant 10.0.1.5, or the wss cert path is wrong and the transport never starts.

Make it obvious. One row per transport, protocol badge, bind address, external address, state. Degraded state (loaded but with errors) is the most important: \`up\` and \`down\` are easy; \`degraded\` is where operators spend their Saturdays.`,
    keyPoints: [
      'Each transport is a distinct `[transport-foo]` stanza; a reload cycles them independently',
      '`external_media_address` and `external_signaling_address` are mandatory if the PBX is behind NAT',
      'WebSocket transports require TLS cert files on the same filesystem as Asterisk; loading from blob storage is not supported',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show both bind and external addresses. A transport that binds 0.0.0.0 but has no external address set is a 95% chance of broken NAT.',
      },
      {
        kind: 'warning',
        text: 'The wss port (usually 8089) must terminate TLS inside Asterisk, not behind a load balancer. L7 load balancers break SRTP/DTLS negotiation.',
      },
      {
        kind: 'note',
        text: 'FreeSWITCH has a different model (profiles instead of transports) — the underlying facts (ports, protocols, bind addresses) are the same but the config surface is not translatable.',
      },
    ],
    accessibility: [
      'Each transport row is a grid with text columns; protocol and state are both text plus colour, not colour alone.',
      'The detail stanza is plain `<pre>` with preserved whitespace.',
      'Last-refresh timestamp is updated text, not an ARIA-live stream — polling is visible, not shouted.',
    ],
    takeaway: 'The transports view is the stack\'s pulse. Show bind + external, highlight degraded state, and keep the live traffic visible.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You are live on the running PJSIP stack.'
      : 'Register to drive real traffic; the config editor is fully usable regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PJSIP loaded (`res_pjsip.so`)',
    met: true,
    hint: 'Required; chan_sip is deprecated since Asterisk 17.',
  },
  {
    label: 'AMI `PJSIPShowTransports` action',
    met: true,
    hint: 'Needed for live transport state without shell access.',
  },
])
</script>
