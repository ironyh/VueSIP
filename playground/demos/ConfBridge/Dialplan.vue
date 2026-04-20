<template>
  <div class="cbd">
    <header class="cbd__head">
      <div>
        <span class="cbd__eyebrow">extensions.conf</span>
        <h3 class="cbd__title">ConfBridge dialplan</h3>
      </div>
      <span class="cbd__file">/etc/asterisk/extensions.conf</span>
    </header>

    <pre class="cbd__code"><code>[conferences]
<span class="cbd__k">exten</span> => <span class="cbd__v">1000</span>,1,NoOp(Entering bridge ${EXTEN})
 same => n,Answer()
 same => n,ConfBridge(${EXTEN},<span class="cbd__acc">default_bridge</span>,<span class="cbd__acc">default_user</span>)
 same => n,Hangup()

<span class="cbd__k">exten</span> => <span class="cbd__v">1001</span>,1,NoOp(Moderator entry)
 same => n,Answer()
 same => n,ConfBridge(1000,default_bridge,<span class="cbd__acc">admin_user</span>)
 same => n,Hangup()</code></pre>

    <section class="cbd__section">
      <span class="cbd__section-title">Bridge profiles (confbridge.conf)</span>
      <ul class="cbd__profiles" role="list">
        <li v-for="p in profiles" :key="p.name" class="cbd__profile">
          <div class="cbd__profile-head">
            <code class="cbd__name">[{{ p.name }}]</code>
            <span class="cbd__type">type={{ p.type }}</span>
          </div>
          <dl class="cbd__kv">
            <template v-for="(v, k) in p.options" :key="k">
              <dt>{{ k }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
        </li>
      </ul>
    </section>

    <footer class="cbd__foot">
      <span class="cbd__dot" aria-hidden="true" />
      <span>Reload with <code>module reload app_confbridge.so</code> — changes are picked up per-bridge on next join.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
interface Profile {
  name: string
  type: 'bridge' | 'user'
  options: Record<string, string>
}

const profiles: Profile[] = [
  {
    name: 'default_bridge',
    type: 'bridge',
    options: {
      max_members: '50',
      record_conference: 'no',
      mixing_interval: '20',
      internal_sample_rate: '48000',
      video_mode: 'talker',
    },
  },
  {
    name: 'default_user',
    type: 'user',
    options: {
      announce_user_count: 'yes',
      music_on_hold_when_empty: 'yes',
      dsp_drop_silence: 'yes',
      dtmf_passthrough: 'no',
      quiet: 'no',
    },
  },
  {
    name: 'admin_user',
    type: 'user',
    options: {
      admin: 'yes',
      marked: 'yes',
      end_marked: 'yes',
      announce_join_leave: 'yes',
    },
  },
]
</script>

<style scoped>
.cbd {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.cbd__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.cbd__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cbd__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.cbd__file {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.2rem 0.45rem;
}

.cbd__code {
  margin: 0;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.85rem 1rem;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--ink);
}
.cbd__code .cbd__k { color: var(--accent); font-weight: 700; }
.cbd__code .cbd__v { color: var(--ink); font-weight: 600; }
.cbd__code .cbd__acc { color: var(--accent); }

.cbd__section { display: flex; flex-direction: column; gap: 0.45rem; }
.cbd__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.cbd__profiles { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.cbd__profile {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.85rem;
}
.cbd__profile-head { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.45rem; }
.cbd__name {
  font-family: var(--mono);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--accent);
}
.cbd__type {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.cbd__kv {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.15rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.76rem;
}
.cbd__kv dt { color: var(--muted); }
.cbd__kv dd { margin: 0; color: var(--ink); font-variant-numeric: tabular-nums; }

.cbd__foot {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.cbd__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
.cbd__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent);
}
</style>
