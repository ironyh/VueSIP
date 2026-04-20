<template>
  <div class="cntd">
    <header class="cntd__head">
      <div class="cntd__avatar" :style="{ background: avatarColor(contact.name) }">
        {{ initials(contact.name) }}
        <span class="cntd__presence" :class="`cntd__presence--${contact.presence}`" />
      </div>
      <div class="cntd__id">
        <div class="cntd__id-row">
          <h3 class="cntd__name">{{ contact.name }}</h3>
          <button
            type="button"
            class="cntd__star"
            :class="{ 'cntd__star--on': contact.favorite }"
            :aria-pressed="contact.favorite"
            aria-label="Favorite"
            @click="contact.favorite = !contact.favorite"
          >
            ★
          </button>
        </div>
        <span class="cntd__meta">{{ contact.title }} · {{ contact.company }}</span>
        <div class="cntd__presence-row">
          <span class="cntd__presence-dot" :class="`cntd__presence--${contact.presence}`" aria-hidden="true" />
          <span class="cntd__presence-label">{{ presenceLabel(contact.presence) }}</span>
          <span v-if="contact.presenceNote" class="cntd__presence-note">— {{ contact.presenceNote }}</span>
        </div>
      </div>
    </header>

    <section class="cntd__section">
      <span class="cntd__section-title">Numbers &amp; URIs</span>
      <ul class="cntd__uris" role="list">
        <li v-for="u in contact.uris" :key="u.value" class="cntd__uri">
          <div class="cntd__uri-body">
            <code class="cntd__uri-value">{{ u.value }}</code>
            <span class="cntd__uri-meta">
              <span class="cntd__tag">{{ u.kind }}</span>
              <span v-if="u.label" class="cntd__uri-label">{{ u.label }}</span>
              <span v-if="u.preferred" class="cntd__uri-preferred">preferred</span>
            </span>
          </div>
          <div class="cntd__uri-actions">
            <button type="button" class="cntd__btn cntd__btn--primary" :aria-label="`Call ${u.value}`">
              Call
            </button>
            <button type="button" class="cntd__btn" :aria-label="`Copy ${u.value}`">
              Copy
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="cntd__section">
      <span class="cntd__section-title">Recent calls</span>
      <ul class="cntd__calls" role="list">
        <li v-for="call in contact.calls" :key="call.id" class="cntd__call">
          <span
            class="cntd__dir"
            :class="`cntd__dir--${call.dir}`"
            :aria-label="call.dir === 'in' ? 'inbound' : call.dir === 'out' ? 'outbound' : 'missed'"
          >
            {{ call.dir === 'in' ? '←' : call.dir === 'out' ? '→' : '×' }}
          </span>
          <code class="cntd__call-num">{{ call.via }}</code>
          <span class="cntd__call-when">{{ call.when }}</span>
          <span class="cntd__call-dur">{{ call.dur }}</span>
        </li>
      </ul>
    </section>

    <section class="cntd__section">
      <span class="cntd__section-title">Notes</span>
      <textarea
        v-model="contact.notes"
        class="cntd__notes"
        rows="3"
        placeholder="Add a note — visible only to you."
        aria-label="Private notes"
      />
      <span class="cntd__notes-meta">
        {{ contact.notes.length }} chars · Stored locally · Never sent to the PBX
      </span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

type Presence = 'available' | 'busy' | 'dnd' | 'away' | 'offline'
type UriKind = 'SIP' | 'Tel' | 'Ext' | 'XMPP'
type CallDir = 'in' | 'out' | 'missed'

interface Uri {
  value: string
  kind: UriKind
  label?: string
  preferred?: boolean
}
interface CallRow {
  id: number
  dir: CallDir
  via: string
  when: string
  dur: string
}

interface ContactDetail {
  name: string
  title: string
  company: string
  favorite: boolean
  presence: Presence
  presenceNote?: string
  uris: Uri[]
  calls: CallRow[]
  notes: string
}

const contact = reactive<ContactDetail>({
  name: 'Alex Rivera',
  title: 'Senior Account Executive',
  company: 'Acme Industrial · San Francisco',
  favorite: true,
  presence: 'available',
  presenceNote: 'Free until 3:30pm PT',
  uris: [
    { value: 'sip:alex@example.com', kind: 'SIP', label: 'Office softphone', preferred: true },
    { value: '+14155550100', kind: 'Tel', label: 'Mobile' },
    { value: '+14155552323', kind: 'Tel', label: 'Desk' },
    { value: '2001', kind: 'Ext', label: 'Internal · sales floor' },
    { value: 'alex@example.com', kind: 'XMPP', label: 'Chat' },
  ],
  calls: [
    { id: 1, dir: 'out', via: '+14155550100', when: 'Today · 14:12', dur: '8m 22s' },
    { id: 2, dir: 'in', via: 'sip:alex@example.com', when: 'Today · 09:41', dur: '2m 03s' },
    { id: 3, dir: 'missed', via: '+14155550100', when: 'Yesterday · 17:55', dur: '—' },
    { id: 4, dir: 'out', via: '2001', when: 'Mon · 11:02', dur: '0m 47s' },
    { id: 5, dir: 'in', via: '+14155552323', when: 'Fri · 15:28', dur: '14m 09s' },
  ],
  notes:
    'Prefers Tuesday afternoons. Renewal conversation opens in Q3; Priya is co-owner on the account. Avoid the 10am slot — team standup.',
})

const presenceLabel = (p: Presence) =>
  p === 'available'
    ? 'Available'
    : p === 'busy'
      ? 'On a call'
      : p === 'dnd'
        ? 'Do not disturb'
        : p === 'away'
          ? 'Away'
          : 'Offline'

const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

const avatarColor = (n: string) => {
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, 35%, 72%)`
}
</script>

<style scoped>
.cntd {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --available: #4a8f4a;
  --busy: #a41d08;
  --dnd: #7a4b9c;
  --away: #d4811f;
  --offline: #8a7d6b;

  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  color: var(--ink);
  font-family: var(--sans);
}

.cntd__head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.cntd__avatar {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--ink);
  flex-shrink: 0;
}
.cntd__presence {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--offline);
  border: 2px solid var(--paper);
}
.cntd__presence--available { background: var(--available); }
.cntd__presence--busy { background: var(--busy); }
.cntd__presence--dnd { background: var(--dnd); }
.cntd__presence--away { background: var(--away); }
.cntd__presence--offline { background: var(--offline); }

.cntd__id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.cntd__id-row { display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; }
.cntd__name { margin: 0; font-size: 1.1rem; font-weight: 700; }
.cntd__star {
  background: transparent;
  border: 0;
  color: var(--rule);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.12s;
}
.cntd__star:hover { color: var(--accent); }
.cntd__star--on { color: var(--accent); }
.cntd__meta {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.cntd__presence-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-top: 0.15rem;
}
.cntd__presence-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.cntd__presence-label { text-transform: uppercase; letter-spacing: 0.1em; }
.cntd__presence-note { text-transform: none; letter-spacing: 0.02em; }

.cntd__section { display: flex; flex-direction: column; gap: 0.4rem; }
.cntd__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.cntd__uris, .cntd__calls {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cntd__uri {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.cntd__uri:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.cntd__uri-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.cntd__uri-value {
  font-family: var(--mono);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cntd__uri-meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.cntd__tag {
  text-transform: uppercase;
  padding: 0.05rem 0.35rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--accent);
  font-weight: 600;
}
.cntd__uri-label { text-transform: none; }
.cntd__uri-preferred {
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

.cntd__uri-actions { display: inline-flex; gap: 0.25rem; flex-shrink: 0; }
.cntd__btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cntd__btn:hover { color: var(--ink); border-color: var(--ink); }
.cntd__btn--primary {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cntd__btn--primary:hover {
  color: var(--paper);
  background: var(--accent);
}

.cntd__call {
  display: grid;
  grid-template-columns: 24px 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.cntd__dir {
  font-size: 0.95rem;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
}
.cntd__dir--in { color: var(--available); }
.cntd__dir--out { color: var(--accent); }
.cntd__dir--missed { color: var(--busy); }
.cntd__call-num {
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
}
.cntd__call-when, .cntd__call-dur {
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.cntd__notes {
  width: 100%;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  font-family: var(--sans);
  font-size: 0.88rem;
  color: var(--ink);
  line-height: 1.4;
  resize: vertical;
  box-sizing: border-box;
}
.cntd__notes:focus { outline: none; border-color: var(--accent); }
.cntd__notes-meta {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
</style>
