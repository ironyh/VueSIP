<template>
  <div class="blfc">
    <header class="blfc__head">
      <div>
        <span class="blfc__eyebrow">Watch list</span>
        <h3 class="blfc__title">{{ watches.length }} extensions subscribed</h3>
      </div>
      <button type="button" class="blfc__add" @click="openAdd">+ Watch extension</button>
    </header>

    <form v-if="adding" class="blfc__form" @submit.prevent="submit">
      <div class="blfc__form-row">
        <label class="blfc__field">
          <span class="blfc__label">Extension or AOR</span>
          <input
            v-model="draft.ext"
            class="blfc__input"
            type="text"
            placeholder="2001 or sip:alex@example.com"
            required
            autofocus
          />
        </label>
        <label class="blfc__field">
          <span class="blfc__label">Display label</span>
          <input
            v-model="draft.label"
            class="blfc__input"
            type="text"
            placeholder="Alex Rivera · sales"
            maxlength="40"
          />
        </label>
        <label class="blfc__field">
          <span class="blfc__label">Action on click</span>
          <select v-model="draft.action" class="blfc__input">
            <option value="call">Call extension</option>
            <option value="pickup">Directed pickup (*8)</option>
            <option value="barge">Barge (ChanSpy)</option>
            <option value="intercom">Intercom (paging)</option>
            <option value="transfer">Blind transfer</option>
          </select>
        </label>
      </div>
      <div class="blfc__form-actions">
        <button type="button" class="blfc__cancel" @click="adding = false">Cancel</button>
        <button type="submit" class="blfc__save">Subscribe</button>
      </div>
    </form>

    <ul class="blfc__list" role="list">
      <li v-for="w in watches" :key="w.ext" class="blfc__row">
        <div class="blfc__row-main">
          <div class="blfc__row-head">
            <code class="blfc__ext">{{ w.ext }}</code>
            <span class="blfc__label-text">{{ w.label || 'No label' }}</span>
            <span class="blfc__status">
              <span
                class="blfc__dot"
                :class="`blfc__dot--${w.subStatus}`"
                aria-hidden="true"
              ></span>
              {{ subLabel(w.subStatus) }}
            </span>
          </div>
          <div class="blfc__row-meta">
            <span class="blfc__meta">Action · {{ actionLabel(w.action) }}</span>
            <span class="blfc__sep" aria-hidden="true">·</span>
            <span class="blfc__meta">Expires {{ w.expires }}s</span>
            <span class="blfc__sep" aria-hidden="true">·</span>
            <span class="blfc__meta">renewed {{ w.renewedAgo }}s ago</span>
          </div>
        </div>
        <div class="blfc__tools">
          <button
            type="button"
            class="blfc__tool"
            :class="{ 'blfc__tool--on': w.favorite }"
            :aria-pressed="w.favorite"
            :aria-label="`Favorite ${w.ext}`"
            @click="w.favorite = !w.favorite"
          >
            ★
          </button>
          <button
            type="button"
            class="blfc__tool blfc__tool--danger"
            :aria-label="`Unsubscribe ${w.ext}`"
            @click="remove(w.ext)"
          >
            ×
          </button>
        </div>
      </li>
    </ul>

    <section class="blfc__globals">
      <span class="blfc__section-title">Subscription policy</span>
      <label class="blfc__global">
        <input type="checkbox" v-model="policy.batchSubscribe" />
        <span>
          Use RFC 5367 resource-list <code>SUBSCRIBE</code>
          <span class="blfc__hint"
            >One dialog, many extensions. Cuts PBX load 10–50×; requires compatible server.</span
          >
        </span>
      </label>
      <label class="blfc__global">
        <input type="checkbox" v-model="policy.backgroundRenew" />
        <span>
          Auto-renew 60s before <code>Expires</code>
          <span class="blfc__hint"
            >Standard practice — without it a lost <code>NOTIFY</code> leaves stale lamps.</span
          >
        </span>
      </label>
      <label class="blfc__global">
        <input type="checkbox" v-model="policy.pickupGroup" />
        <span>
          Restrict pickup to my pickup group
          <span class="blfc__hint"
            >Asterisk <code>pickupgroup=</code> / FreeSWITCH <code>pickup_group</code>.</span
          >
        </span>
      </label>
    </section>

    <footer class="blfc__foot">
      <span>
        Template ·
        <code>{{ subscribeTemplate }}</code> · <code>Event: dialog</code> ·
        <code>Expires: 3600</code>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

type Action = 'call' | 'pickup' | 'barge' | 'intercom' | 'transfer'
type SubStatus = 'active' | 'pending' | 'failed'

interface Watch {
  ext: string
  label: string
  action: Action
  favorite: boolean
  subStatus: SubStatus
  expires: number
  renewedAgo: number
}

const watches = ref<Watch[]>([
  {
    ext: '2001',
    label: 'Alex Rivera · sales',
    action: 'call',
    favorite: true,
    subStatus: 'active',
    expires: 3600,
    renewedAgo: 142,
  },
  {
    ext: '2002',
    label: 'Priya Shah · sales',
    action: 'call',
    favorite: false,
    subStatus: 'active',
    expires: 3600,
    renewedAgo: 87,
  },
  {
    ext: '2003',
    label: 'Tomás León · sales',
    action: 'pickup',
    favorite: false,
    subStatus: 'active',
    expires: 3600,
    renewedAgo: 54,
  },
  {
    ext: '4000',
    label: 'Queue · support',
    action: 'barge',
    favorite: true,
    subStatus: 'active',
    expires: 1800,
    renewedAgo: 301,
  },
  {
    ext: '9001',
    label: 'Paging · all floors',
    action: 'intercom',
    favorite: false,
    subStatus: 'pending',
    expires: 3600,
    renewedAgo: 0,
  },
  {
    ext: 'sip:alex@example.com',
    label: 'Alex · mobile AOR',
    action: 'transfer',
    favorite: false,
    subStatus: 'failed',
    expires: 3600,
    renewedAgo: 0,
  },
])

const adding = ref(false)
const draft = reactive<{ ext: string; label: string; action: Action }>({
  ext: '',
  label: '',
  action: 'call',
})
const openAdd = () => {
  draft.ext = ''
  draft.label = ''
  draft.action = 'call'
  adding.value = true
}
const submit = () => {
  const ext = draft.ext.trim()
  if (!ext) return
  watches.value.unshift({
    ext,
    label: draft.label.trim(),
    action: draft.action,
    favorite: false,
    subStatus: 'pending',
    expires: 3600,
    renewedAgo: 0,
  })
  adding.value = false
}
const remove = (ext: string) => {
  watches.value = watches.value.filter((w) => w.ext !== ext)
}

const policy = reactive({
  batchSubscribe: true,
  backgroundRenew: true,
  pickupGroup: true,
})

const actionLabel = (a: Action) =>
  a === 'call'
    ? 'Call extension'
    : a === 'pickup'
      ? 'Pickup (*8)'
      : a === 'barge'
        ? 'Barge'
        : a === 'intercom'
          ? 'Intercom'
          : 'Blind transfer'

const subLabel = (s: SubStatus) =>
  s === 'active' ? 'Subscribed' : s === 'pending' ? 'Subscribing…' : 'Failed'

const subscribeTemplate = 'SUBSCRIBE sip:<ext>@pbx SIP/2.0'
</script>

<style scoped>
.blfc {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --ok: #4a8f4a;
  --warn: #d4811f;
  --err: #a41d08;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.blfc__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.blfc__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.blfc__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.blfc__add {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.5rem 0.85rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.blfc__add:hover {
  background: var(--accent);
}

.blfc__form {
  background: var(--paper);
  border: 1px solid var(--accent);
  border-radius: 2px;
  padding: 0.8rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.blfc__form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.6rem;
}
@media (max-width: 720px) {
  .blfc__form-row {
    grid-template-columns: 1fr;
  }
}
.blfc__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.blfc__label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.blfc__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.84rem;
  color: var(--ink);
}
.blfc__input:focus {
  outline: none;
  border-color: var(--accent);
}
.blfc__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}
.blfc__cancel,
.blfc__save {
  border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.blfc__cancel {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
}
.blfc__cancel:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.blfc__save {
  background: var(--accent);
  color: var(--paper);
  border: 0;
}

.blfc__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.blfc__row {
  display: flex;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  align-items: center;
}
.blfc__row:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.blfc__row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.blfc__row-head {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.blfc__ext {
  font-family: var(--mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.blfc__label-text {
  font-size: 0.84rem;
  color: var(--ink);
}
.blfc__status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-left: auto;
}
.blfc__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
}
.blfc__dot--active {
  background: var(--ok);
}
.blfc__dot--pending {
  background: var(--warn);
}
.blfc__dot--failed {
  background: var(--err);
}

.blfc__row-meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.blfc__sep {
  opacity: 0.5;
}

.blfc__tools {
  display: inline-flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.blfc__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.blfc__tool:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.blfc__tool--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.blfc__tool--danger {
  font-size: 1rem;
  line-height: 1;
  padding: 0.2rem 0.55rem;
}
.blfc__tool--danger:hover {
  color: var(--err);
  border-color: var(--err);
}

.blfc__globals {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.blfc__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.blfc__global {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  font-size: 0.88rem;
  cursor: pointer;
}
.blfc__global input {
  accent-color: var(--accent);
  margin-top: 0.3rem;
}
.blfc__global code {
  font-family: var(--mono);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
  font-size: 0.78rem;
}
.blfc__hint {
  display: block;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  margin-top: 0.15rem;
}

.blfc__foot {
  padding: 0.5rem 0.7rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
  overflow-x: auto;
}
.blfc__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
