<template>
  <div class="ume">
    <header class="ume__head">
      <div>
        <span class="ume__eyebrow">Editing · {{ user.name || 'new user' }}</span>
        <h3 class="ume__title">ext {{ user.ext }} · <span class="ume__uri">{{ user.uri }}</span></h3>
      </div>
      <span class="ume__dirty" :class="{ 'ume__dirty--on': dirty }">{{ dirty ? 'UNSAVED' : 'SAVED' }}</span>
    </header>

    <div class="ume__tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="ume__tab"
        :class="{ 'ume__tab--on': tab === t.id }"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >{{ t.label }}</button>
    </div>

    <section v-show="tab === 'profile'" class="ume__panel">
      <dl class="ume__fields">
        <div class="ume__field">
          <dt>Display name</dt>
          <dd><input v-model="user.name" @input="dirty = true" type="text" class="ume__input" /></dd>
        </div>
        <div class="ume__field">
          <dt>Email</dt>
          <dd><input v-model="user.email" @input="dirty = true" type="email" class="ume__input" /></dd>
        </div>
        <div class="ume__field">
          <dt>Extension</dt>
          <dd><input v-model="user.ext" @input="dirty = true" type="text" inputmode="numeric" class="ume__input ume__input--short" /></dd>
        </div>
        <div class="ume__field">
          <dt>SIP URI</dt>
          <dd><input v-model="user.uri" @input="dirty = true" type="text" class="ume__input" /></dd>
        </div>
        <div class="ume__field">
          <dt>Role</dt>
          <dd>
            <div class="ume__roles" role="radiogroup" aria-label="Role">
              <button
                v-for="r in roles"
                :key="r"
                type="button"
                role="radio"
                class="ume__chip"
                :class="{ 'ume__chip--on': user.role === r }"
                :aria-checked="user.role === r"
                @click="user.role = r; dirty = true"
              >{{ r }}</button>
            </div>
          </dd>
        </div>
      </dl>
    </section>

    <section v-show="tab === 'endpoint'" class="ume__panel">
      <dl class="ume__fields">
        <div class="ume__field">
          <dt>PJSIP auth</dt>
          <dd>
            <input v-model="user.authUser" @input="dirty = true" type="text" class="ume__input" />
            <span class="ume__hint">Username stored in <code>pjsip_auths.username</code>.</span>
          </dd>
        </div>
        <div class="ume__field">
          <dt>Secret</dt>
          <dd>
            <input v-model="user.secret" @input="dirty = true" type="password" class="ume__input" autocomplete="new-password" />
            <span class="ume__hint">Minimum 14 chars; generated server-side on save.</span>
          </dd>
        </div>
        <div class="ume__field">
          <dt>Transport</dt>
          <dd>
            <select v-model="user.transport" @change="dirty = true" class="ume__input">
              <option value="wss">wss (TLS over WebSocket)</option>
              <option value="tls">tls (SIP over TLS)</option>
              <option value="udp">udp (legacy, lab only)</option>
            </select>
          </dd>
        </div>
        <div class="ume__field">
          <dt>Max contacts</dt>
          <dd>
            <input v-model="user.maxContacts" @input="dirty = true" type="number" min="1" max="10" class="ume__input ume__input--short" />
            <span class="ume__hint">Parallel registrations; 2–3 for desk + soft client + mobile.</span>
          </dd>
        </div>
      </dl>
    </section>

    <section v-show="tab === 'caps'" class="ume__panel">
      <ul class="ume__caps" role="list">
        <li v-for="c in capabilities" :key="c.id" class="ume__cap">
          <label class="ume__cap-row">
            <input type="checkbox" v-model="user.caps[c.id]" @change="dirty = true" />
            <span class="ume__cap-label">{{ c.label }}</span>
            <span class="ume__cap-desc">{{ c.desc }}</span>
          </label>
        </li>
      </ul>
    </section>

    <footer class="ume__actions">
      <button type="button" class="ume__btn" @click="reset">Discard</button>
      <button type="button" class="ume__btn ume__btn--primary" :disabled="!dirty" @click="save">Save user</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const tabs = [
  { id: 'profile',  label: 'Profile' },
  { id: 'endpoint', label: 'Endpoint' },
  { id: 'caps',     label: 'Capabilities' },
]
const tab = ref('profile')

const roles = ['admin', 'agent', 'ext'] as const

const capabilities = [
  { id: 'record',     label: 'Record calls',          desc: 'One-touch *80 and auto-record rules.' },
  { id: 'transfer',   label: 'Blind/attended xfer',   desc: 'Enable ##, *2, and REFER routing.' },
  { id: 'conference', label: 'Host conferences',      desc: 'Start ConfBridge rooms with PIN.' },
  { id: 'external',   label: 'Dial external PSTN',    desc: 'Requires trunk reachability.' },
  { id: 'international',label: 'International dialing',desc: 'Subject to ToD and rate restrictions.' },
  { id: 'override',   label: 'Time-condition override',desc: 'Flip force-open/closed at will.' },
]

const user = reactive({
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  ext: '2101',
  uri: 'sip:alex@example.com',
  role: 'admin' as typeof roles[number],
  authUser: 'alex',
  secret: '••••••••••••••',
  transport: 'wss',
  maxContacts: 3,
  caps: {
    record: true, transfer: true, conference: true,
    external: true, international: false, override: true,
  } as Record<string, boolean>,
})

const dirty = ref(false)
const save = () => { dirty.value = false }
const reset = () => { dirty.value = false }
</script>

<style scoped>
.ume {
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

.ume__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.ume__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.ume__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.ume__uri { font-family: var(--mono); font-weight: 400; color: var(--muted); }
.ume__dirty {
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.5rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.ume__dirty--on { color: var(--accent); border-color: var(--accent); }

.ume__tabs { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.ume__tab {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.ume__tab--on { background: var(--accent); border-color: var(--accent); color: var(--paper); }

.ume__panel { display: block; }

.ume__fields {
  display: grid; gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin: 0;
}
.ume__field {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.7rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.ume__field dt {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.ume__field dd { margin: 0; display: flex; flex-direction: column; gap: 0.2rem; }

.ume__input {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono); font-size: 0.8rem; color: var(--ink);
}
.ume__input--short { max-width: 6rem; }
.ume__hint { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.ume__hint code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}

.ume__roles { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.ume__chip {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.ume__chip--on { background: var(--accent); border-color: var(--accent); color: var(--paper); }

.ume__caps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ume__cap {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.7rem;
}
.ume__cap-row {
  display: grid; grid-template-columns: 1.1rem 1fr;
  gap: 0.5rem; align-items: baseline;
  cursor: pointer;
}
.ume__cap-label { font-weight: 600; font-size: 0.88rem; }
.ume__cap-desc {
  grid-column: 2; font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
}

.ume__actions {
  display: flex; gap: 0.4rem; justify-content: flex-end;
  padding-top: 0.3rem; border-top: 1px dashed var(--rule);
}
.ume__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.ume__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ume__btn--primary { background: var(--accent); border-color: var(--accent); color: var(--paper); }
</style>
