<template>
  <div class="pje">
    <header class="pje__head">
      <div>
        <span class="pje__eyebrow">pjsip.conf · [{{ ep.id }}]</span>
        <h3 class="pje__title">Endpoint · {{ ep.id }}</h3>
      </div>
      <span class="pje__state" :class="`pje__state--${ep.state}`">{{ ep.state.toUpperCase() }}</span>
    </header>

    <dl class="pje__grid">
      <div class="pje__field">
        <dt>Endpoint ID</dt>
        <dd><input v-model="ep.id" type="text" class="pje__input" /></dd>
      </div>
      <div class="pje__field">
        <dt>Context</dt>
        <dd><input v-model="ep.context" type="text" class="pje__input" /></dd>
      </div>
      <div class="pje__field">
        <dt>Allowed codecs</dt>
        <dd>
          <div class="pje__codecs">
            <label v-for="c in codecs" :key="c" class="pje__chip">
              <input type="checkbox" :value="c" v-model="ep.codecs" />
              <span>{{ c }}</span>
            </label>
          </div>
          <span class="pje__hint">Order matters; Asterisk negotiates left-to-right.</span>
        </dd>
      </div>
      <div class="pje__field">
        <dt>Direct media</dt>
        <dd>
          <select v-model="ep.directMedia" class="pje__input">
            <option value="no">no (proxy RTP)</option>
            <option value="yes">yes (peer-to-peer)</option>
          </select>
          <span class="pje__hint">Default <code>no</code> on cloud PBXs; <code>yes</code> requires same L3.</span>
        </dd>
      </div>
      <div class="pje__field">
        <dt>DTMF mode</dt>
        <dd>
          <select v-model="ep.dtmf" class="pje__input">
            <option value="rfc4733">rfc4733 (RTP events)</option>
            <option value="inband">inband (audio)</option>
            <option value="info">info (SIP INFO)</option>
          </select>
        </dd>
      </div>
      <div class="pje__field">
        <dt>NAT handling</dt>
        <dd>
          <div class="pje__switches">
            <label class="pje__switch">
              <input type="checkbox" v-model="ep.forceRport" />
              <span>force_rport</span>
            </label>
            <label class="pje__switch">
              <input type="checkbox" v-model="ep.rewriteContact" />
              <span>rewrite_contact</span>
            </label>
          </div>
        </dd>
      </div>
      <div class="pje__field">
        <dt>WebRTC profile</dt>
        <dd>
          <label class="pje__switch pje__switch--wide">
            <input type="checkbox" v-model="ep.webrtc" />
            <span>{{ ep.webrtc ? 'webrtc = yes (ICE, DTLS, avpf, rtcp_mux)' : 'webrtc = no' }}</span>
          </label>
        </dd>
      </div>
    </dl>

    <section class="pje__preview">
      <span class="pje__preview-title">Generated stanza</span>
      <pre class="pje__code">[{{ ep.id }}]
type = endpoint
context = {{ ep.context }}
disallow = all
allow = {{ ep.codecs.join(',') || 'ulaw' }}
auth = {{ ep.id }}-auth
aors = {{ ep.id }}
direct_media = {{ ep.directMedia }}
dtmf_mode = {{ ep.dtmf }}
force_rport = {{ ep.forceRport ? 'yes' : 'no' }}
rewrite_contact = {{ ep.rewriteContact ? 'yes' : 'no' }}<template v-if="ep.webrtc">
webrtc = yes
use_avpf = yes
rtcp_mux = yes
media_encryption = dtls
dtls_auto_generate_cert = yes
ice_support = yes</template>
</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const codecs = ['opus', 'g722', 'ulaw', 'alaw', 'g729']

const ep = reactive({
  id: '2101',
  context: 'from-internal',
  codecs: ['opus', 'g722', 'ulaw'],
  directMedia: 'no',
  dtmf: 'rfc4733',
  forceRport: true,
  rewriteContact: true,
  webrtc: true,
  state: 'available' as 'available' | 'busy' | 'unreachable',
})
</script>

<style scoped>
.pje {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.85rem;
  color: var(--ink); font-family: var(--sans);
}

.pje__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.pje__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.pje__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.pje__state {
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.55rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.pje__state--available { color: #15803d; border-color: #15803d; }
.pje__state--busy { color: var(--accent); border-color: var(--accent); }
.pje__state--unreachable { color: #b91c1c; border-color: #b91c1c; }

.pje__grid {
  display: grid; gap: 0.45rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin: 0;
}
.pje__field {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex; flex-direction: column; gap: 0.3rem;
}
.pje__field dt {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.pje__field dd { margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }

.pje__input {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono); font-size: 0.8rem; color: var(--ink);
}
.pje__hint { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.pje__hint code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}

.pje__codecs { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.pje__chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; cursor: pointer;
}
.pje__chip:has(input:checked) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent); color: var(--accent);
}

.pje__switches { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.pje__switch {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted); cursor: pointer;
}
.pje__switch--wide { width: 100%; }
.pje__switch:has(input:checked) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent); color: var(--accent);
}

.pje__preview { display: flex; flex-direction: column; gap: 0.35rem; }
.pje__preview-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.pje__code {
  margin: 0;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem;
  font-family: var(--mono); font-size: 0.74rem; line-height: 1.5; color: var(--ink);
  overflow-x: auto; white-space: pre;
}
</style>
