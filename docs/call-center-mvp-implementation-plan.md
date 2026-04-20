# Call Center MVP Implementation Plan

**Goal:** Build the inbound-support-agent MVP defined in `docs/call-center-feature-spec.md` as a coherent example app in `examples/call-center/`, using existing VueSIP composables and an Asterisk-first integration path.

**Architecture:** Keep the implementation inside the existing `examples/call-center/` app, but stop treating `App.vue` as the product. Extract feature-local state and view-model logic into small composables under `examples/call-center/src/features/`, keep UI components thin, and map existing VueSIP primitives into a single agent workflow. The plan deliberately avoids inventing a new provider abstraction or shared interaction domain model in core library code.

**Tech Stack:** Vue 3, TypeScript, Vite, VueSIP composables (`useSipClient`, `useCallSession`, `useCallCenterProvider`, `useAgentState`, `useAgentQueue`, `useAgentMetrics`, `useAmiQueues`, `useAmiCallback`), Vitest, Vue Test Utils, Prettier, Playwright only after MVP smoke harness exists.

**Estimated Time:** 26 tasks x 5 minutes = 130 minutes of focused implementation work, excluding polish and unexpected PBX integration issues.

---

## Prerequisites

- [ ] Work on branch `feat/call-center-feature-spec` or a child branch from it.
- [ ] Use `docs/call-center-feature-spec.md` v2 as the source of truth.
- [ ] Ensure root dependencies are installed with `pnpm install`.
- [ ] Ensure Playwright Chromium is installed if you want browser smoke later.
- [ ] Assume Asterisk-first connected mode; do not widen scope to FreeSWITCH/cloud in MVP.

---

## Implementation Shape

### Existing Files to Reuse

- `examples/call-center/src/App.vue`
- `examples/call-center/src/components/ConnectionPanel.vue`
- `examples/call-center/src/components/SystemStatus.vue`
- `examples/call-center/src/components/CallQueue.vue`
- `examples/call-center/src/components/ActiveCall.vue`
- `examples/call-center/src/components/CallHistoryPanel.vue`
- `examples/call-center/src/components/AgentDashboard.vue`

### New Directories to Introduce

- `examples/call-center/src/features/shared/`
- `examples/call-center/src/features/setup/`
- `examples/call-center/src/features/agent/`
- `examples/call-center/src/features/supervisor/`
- `tests/unit/examples/call-center/`

### New Files Expected by the Plan

- `examples/call-center/src/features/shared/mvp-types.ts`
- `examples/call-center/src/features/shared/workspace-mappers.ts`
- `examples/call-center/src/features/shared/demo-mvp-gateway.ts`
- `examples/call-center/src/features/setup/useEnvironmentSetup.ts`
- `examples/call-center/src/features/agent/useAgentWorkspace.ts`
- `examples/call-center/src/features/agent/useWrapUpDraft.ts`
- `examples/call-center/src/features/agent/useCallbackWorklist.ts`
- `examples/call-center/src/features/agent/CustomerContextRail.vue`
- `examples/call-center/src/features/agent/WrapUpPanel.vue`
- `examples/call-center/src/features/agent/CallbackWorklist.vue`
- `examples/call-center/src/features/supervisor/useSupervisorBoard.ts`
- `examples/call-center/src/features/supervisor/SupervisorBoard.vue`
- `tests/unit/examples/call-center/workspace-mappers.test.ts`
- `tests/unit/examples/call-center/useAgentWorkspace.test.ts`
- `tests/unit/examples/call-center/useWrapUpDraft.test.ts`
- `tests/unit/examples/call-center/useCallbackWorklist.test.ts`
- `tests/unit/examples/call-center/useSupervisorBoard.test.ts`
- `tests/unit/examples/call-center/demo-mvp-gateway.test.ts`

---

## Phase 1: Baseline and State Boundaries

### Task 1: Add MVP example-local types

**Files:**

- Create: `examples/call-center/src/features/shared/mvp-types.ts`
- Test: `tests/unit/examples/call-center/workspace-mappers.test.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/examples/call-center/workspace-mappers.test.ts
import { describe, expect, it } from 'vitest'
import type {
  AgentWorkspaceState,
  CallbackTaskView,
} from '@/../examples/call-center/src/features/shared/mvp-types'

describe('mvp-types', () => {
  it('supports the locked MVP agent states', () => {
    const state: AgentWorkspaceState = 'wrap-up'
    expect(state).toBe('wrap-up')
  })

  it('supports callback work statuses', () => {
    const task: CallbackTaskView = {
      id: 'cb-1',
      assignee: 'agent-1',
      queue: 'support',
      status: 'open',
      reason: 'Follow-up',
      dueAt: new Date(),
    }
    expect(task.status).toBe('open')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/unit/examples/call-center/workspace-mappers.test.ts
```

Expected output: cannot find `mvp-types.ts`.

**Step 3: Implement minimal code**

```ts
// examples/call-center/src/features/shared/mvp-types.ts
export type AgentWorkspaceState =
  | 'offline'
  | 'connecting'
  | 'available'
  | 'ringing'
  | 'busy'
  | 'wrap-up'
  | 'paused'
  | 'reconnecting'
  | 'attention'

export interface CustomerContextView {
  displayName: string
  address: string
  queue: string | null
  latestDisposition: string | null
  noteSummary: string | null
  hasOpenCallback: boolean
}

export interface CallbackTaskView {
  id: string
  assignee: string
  queue: string
  status: 'open' | 'in-progress' | 'completed' | 'rescheduled' | 'failed'
  reason: string
  dueAt: Date
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run tests/unit/examples/call-center/workspace-mappers.test.ts
```

**Step 5: Commit**

```bash
git add examples/call-center/src/features/shared/mvp-types.ts tests/unit/examples/call-center/workspace-mappers.test.ts
git commit -m "feat(call-center): add MVP example types"
```

---

### Task 2: Add mapper layer between VueSIP primitives and example UI

**Files:**

- Create: `examples/call-center/src/features/shared/workspace-mappers.ts`
- Modify: `tests/unit/examples/call-center/workspace-mappers.test.ts`

**Step 1: Extend failing test**

```ts
import {
  mapAgentStatusToWorkspaceState,
  mapCallbackToTaskView,
} from '@/../examples/call-center/src/features/shared/workspace-mappers'

it('maps provider status to workspace state', () => {
  expect(mapAgentStatusToWorkspaceState('available', false)).toBe('available')
  expect(mapAgentStatusToWorkspaceState('busy', true)).toBe('wrap-up')
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/unit/examples/call-center/workspace-mappers.test.ts
```

**Step 3: Implement minimal code**

```ts
// examples/call-center/src/features/shared/workspace-mappers.ts
import type { AgentStatus } from '@/providers/call-center/types'
import type { CallbackRequest } from '@/types/callback.types'
import type { AgentWorkspaceState, CallbackTaskView } from './mvp-types'

export function mapAgentStatusToWorkspaceState(
  status: AgentStatus | 'connecting' | 'reconnecting',
  inWrapUp: boolean
): AgentWorkspaceState {
  if (inWrapUp) return 'wrap-up'
  if (status === 'connecting' || status === 'reconnecting') return status
  if (status === 'offline') return 'offline'
  if (status === 'available') return 'available'
  if (status === 'busy') return 'busy'
  return 'paused'
}

export function mapCallbackToTaskView(callback: CallbackRequest): CallbackTaskView {
  return {
    id: callback.id,
    assignee: callback.assignedTo ?? 'unassigned',
    queue: callback.queue,
    status: callback.status === 'pending' ? 'open' : callback.status,
    reason: callback.reason,
    dueAt: callback.scheduledAt ?? callback.requestedAt,
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run tests/unit/examples/call-center/workspace-mappers.test.ts
```

---

### Task 3: Replace monolithic `App.vue` ownership with agent workspace composable

**Files:**

- Create: `examples/call-center/src/features/agent/useAgentWorkspace.ts`
- Modify: `examples/call-center/src/App.vue`
- Test: `tests/unit/examples/call-center/useAgentWorkspace.test.ts`

**Step 1: Write failing test for workspace state**

```ts
// tests/unit/examples/call-center/useAgentWorkspace.test.ts
import { describe, expect, it } from 'vitest'
import { useAgentWorkspace } from '@/../examples/call-center/src/features/agent/useAgentWorkspace'

describe('useAgentWorkspace', () => {
  it('starts offline and exposes a callback-only outbound mode', () => {
    const workspace = useAgentWorkspace()
    expect(workspace.workspaceState.value).toBe('offline')
    expect(workspace.canStartManualOutbound.value).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useAgentWorkspace.test.ts
```

**Step 3: Implement minimal code**

```ts
// examples/call-center/src/features/agent/useAgentWorkspace.ts
import { computed, ref } from 'vue'

export function useAgentWorkspace() {
  const workspaceState = ref<'offline' | 'available' | 'wrap-up'>('offline')
  const selectedCallbackId = ref<string | null>(null)

  const canStartManualOutbound = computed(() => false)

  return {
    workspaceState,
    selectedCallbackId,
    canStartManualOutbound,
  }
}
```

**Step 4: Rewire `App.vue`**

Replace local agent-state flags in `examples/call-center/src/App.vue` with a single `useAgentWorkspace()` instance, but do not rewrite all child components yet.

**Step 5: Run test**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useAgentWorkspace.test.ts
```

---

## Phase 2: Setup and Readiness

### Task 4: Move environment, device, and connectivity concerns into `useEnvironmentSetup`

**Files:**

- Create: `examples/call-center/src/features/setup/useEnvironmentSetup.ts`
- Modify: `examples/call-center/src/App.vue`
- Modify: `examples/call-center/src/components/ConnectionPanel.vue`

**Target behavior:**

- one setup composable owns presets, current credentials, validation state, and readiness state
- `ConnectionPanel.vue` becomes a thin form component
- `App.vue` stops mutating SIP config directly

**Minimal code shape**

```ts
export function useEnvironmentSetup() {
  const selectedPreset = ref<'demo' | 'sandbox' | 'custom'>('demo')
  const readiness = ref({
    hasMicPermission: false,
    hasOutputDevice: false,
    hasSecureContext: window.isSecureContext,
  })

  function applyPreset(kind: 'demo' | 'sandbox' | 'custom') {
    selectedPreset.value = kind
  }

  return { selectedPreset, readiness, applyPreset }
}
```

**Verification**

```bash
pnpm exec vue-tsc --noEmit --pretty false
pnpm --dir examples/call-center build
```

---

### Task 5: Add honest capability gating banner

**Files:**

- Modify: `examples/call-center/src/components/SystemStatus.vue`
- Modify: `examples/call-center/src/App.vue`

**What to ship in this task**

- show `Asterisk-first`, `demo`, `connected`, `callback-only outbound`
- show `monitor/whisper/barge hidden in MVP`
- make unsupported features read-only or hidden, not clickable

**Verification**

```bash
pnpm exec vue-tsc --noEmit --pretty false
```

---

## Phase 3: Inbound Agent Flow

### Task 6: Narrow queue UI to inbound-support-agent flow

**Files:**

- Modify: `examples/call-center/src/components/CallQueue.vue`
- Modify: `examples/call-center/src/features/agent/useAgentWorkspace.ts`

**Required changes**

- assume one primary queue in the visible UX
- remove any implied blended outbound behavior from the queue panel
- show queue source, wait time, and urgency
- emit one queue-offer selection event into the workspace composable

**Verification**

```bash
pnpm exec vue-tsc --noEmit --pretty false
pnpm --dir examples/call-center build
```

---

### Task 7: Add a customer context rail

**Files:**

- Create: `examples/call-center/src/features/agent/CustomerContextRail.vue`
- Modify: `examples/call-center/src/App.vue`

**Step 1: Write failing render test**

```ts
// tests/unit/examples/call-center/useAgentWorkspace.test.ts
it('exposes customer context for the current interaction', () => {
  const workspace = useAgentWorkspace()
  expect(workspace.customerContext.value).toBeDefined()
})
```

**Step 2: Implement minimal state**

```ts
const customerContext = ref({
  displayName: 'Unknown Caller',
  address: '',
  queue: 'support',
  latestDisposition: null,
  noteSummary: null,
  hasOpenCallback: false,
})
```

**Step 3: Mount the component**

Render `CustomerContextRail` next to `ActiveCall` or `CallStats`, not inside the call control cluster.

---

### Task 8: Make `ActiveCall.vue` inbound-workflow aware

**Files:**

- Modify: `examples/call-center/src/components/ActiveCall.vue`
- Modify: `examples/call-center/src/features/agent/useAgentWorkspace.ts`

**Required changes**

- keep `hangup`, `mute`, `hold`, `transfer`
- remove generic product language that suggests open-ended dialer behavior
- display queue source and interaction state
- emit a single `complete-call` event that enters wrap-up, not just hangup and forget

**Verification**

```bash
pnpm exec vue-tsc --noEmit --pretty false
```

---

## Phase 4: Wrap-Up as a First-Class Flow

### Task 9: Add wrap-up draft composable

**Files:**

- Create: `examples/call-center/src/features/agent/useWrapUpDraft.ts`
- Test: `tests/unit/examples/call-center/useWrapUpDraft.test.ts`

**Minimal code**

```ts
export function useWrapUpDraft() {
  const disposition = ref<string | null>(null)
  const notes = ref('')
  const callbackRequested = ref(false)

  const canComplete = computed(() => Boolean(disposition.value))

  return { disposition, notes, callbackRequested, canComplete }
}
```

**Verification**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useWrapUpDraft.test.ts
```

---

### Task 10: Add `WrapUpPanel.vue`

**Files:**

- Create: `examples/call-center/src/features/agent/WrapUpPanel.vue`
- Modify: `examples/call-center/src/App.vue`

**Required controls**

- disposition select
- editable notes
- callback checkbox or CTA
- complete button disabled until disposition exists

**Verification**

```bash
pnpm exec vue-tsc --noEmit --pretty false
pnpm --dir examples/call-center build
```

---

### Task 11: Define RONA and attention-needed state

**Files:**

- Modify: `examples/call-center/src/features/agent/useAgentWorkspace.ts`
- Test: `tests/unit/examples/call-center/useAgentWorkspace.test.ts`

**Minimal test**

```ts
it('moves into attention state after queue no-answer', () => {
  const workspace = useAgentWorkspace()
  workspace.handleNoAnswer()
  expect(workspace.workspaceState.value).toBe('attention')
})
```

**Minimal code**

```ts
function handleNoAnswer() {
  workspaceState.value = 'attention'
}
```

**Verification**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useAgentWorkspace.test.ts
```

---

## Phase 5: Callback-Only Outbound

### Task 12: Add callback worklist adapter around `useAmiCallback`

**Files:**

- Create: `examples/call-center/src/features/agent/useCallbackWorklist.ts`
- Test: `tests/unit/examples/call-center/useCallbackWorklist.test.ts`

**Minimal code**

```ts
export function useCallbackWorklist() {
  const selectedCallbackId = ref<string | null>(null)
  const filters = ref<'all' | 'due' | 'mine'>('mine')

  function selectCallback(id: string) {
    selectedCallbackId.value = id
  }

  return { selectedCallbackId, filters, selectCallback }
}
```

**Verification**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useCallbackWorklist.test.ts
```

---

### Task 13: Add callback worklist UI

**Files:**

- Create: `examples/call-center/src/features/agent/CallbackWorklist.vue`
- Modify: `examples/call-center/src/App.vue`
- Modify: `examples/call-center/src/components/CallHistoryPanel.vue`

**Required behavior**

- split “recent history” from “callback work”
- show due state, assignee, reason
- make callback initiation the only outbound CTA

**Verification**

```bash
pnpm --dir examples/call-center build
```

---

### Task 14: Gate outbound to callback-only

**Files:**

- Modify: `examples/call-center/src/features/agent/useAgentWorkspace.ts`
- Modify: `examples/call-center/src/App.vue`

**Required behavior**

- disable generic manual dial flow
- only allow outbound if a callback task is selected
- keep `useCallSession.makeCall()` as the actual telephony path

**Minimal guard**

```ts
const canStartManualOutbound = computed(() => false)
const canStartCallbackOutbound = computed(() => Boolean(selectedCallbackId.value))
```

**Verification**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useAgentWorkspace.test.ts
```

---

## Phase 6: Supervisor Workspace

### Task 15: Add supervisor board view-model

**Files:**

- Create: `examples/call-center/src/features/supervisor/useSupervisorBoard.ts`
- Test: `tests/unit/examples/call-center/useSupervisorBoard.test.ts`

**What this composable owns**

- queue rows
- agent rows
- alert rows
- callback reassignment intent

**Minimal test**

```ts
it('does not expose audio intervention actions', () => {
  const board = useSupervisorBoard()
  expect(board.actions.value).not.toContain('barge')
})
```

---

### Task 16: Add `SupervisorBoard.vue`

**Files:**

- Create: `examples/call-center/src/features/supervisor/SupervisorBoard.vue`
- Modify: `examples/call-center/src/App.vue`

**Required sections**

- queue board
- agent board
- operational alerts
- callback reassignment

**Do not include**

- monitor
- whisper
- barge

**Verification**

```bash
pnpm exec vue-tsc --noEmit --pretty false
pnpm --dir examples/call-center build
```

---

## Phase 7: Demo Gateway and Honest Mode Behavior

### Task 17: Add demo gateway for inbound queue and callback scenarios

**Files:**

- Create: `examples/call-center/src/features/shared/demo-mvp-gateway.ts`
- Test: `tests/unit/examples/call-center/demo-mvp-gateway.test.ts`

**What this file should do**

- simulate inbound support calls
- simulate callback list data
- simulate queue alerts
- never pretend unsupported live capabilities exist

**Verification**

```bash
pnpm exec vitest run tests/unit/examples/call-center/demo-mvp-gateway.test.ts
```

---

### Task 18: Replace ad-hoc queue simulation in `App.vue`

**Files:**

- Modify: `examples/call-center/src/App.vue`
- Modify: `examples/call-center/src/features/shared/demo-mvp-gateway.ts`

**Required behavior**

- `App.vue` should consume a gateway API, not own interval logic
- demo and connected modes should render the same components

**Verification**

```bash
pnpm --dir examples/call-center build
```

---

## Phase 8: History, Notes, and Thin Persistence

### Task 19: Keep history narrow and honest

**Files:**

- Modify: `examples/call-center/src/components/CallHistoryPanel.vue`
- Modify: `examples/call-center/src/App.vue`

**Scope rule**

- history is a supporting panel
- it is not the primary work queue
- it must show callback linkage and disposition where available

---

### Task 20: Add minimal note persistence boundary

**Files:**

- Modify: `examples/call-center/src/features/agent/useWrapUpDraft.ts`
- Modify: `examples/call-center/src/App.vue`

**Rule**

- preserve notes from active call to wrap-up within the session
- do not promise durable multi-session persistence yet

**Verification**

```bash
pnpm exec vitest run tests/unit/examples/call-center/useWrapUpDraft.test.ts
```

---

## Phase 9: Testing and Verification

### Task 21: Add example unit test barrel

**Files:**

- Create tests listed above under `tests/unit/examples/call-center/`

**Run**

```bash
pnpm exec vitest run tests/unit/examples/call-center
```

---

### Task 22: Add example typecheck to the working loop

**Run**

```bash
pnpm exec vue-tsc --noEmit --pretty false
pnpm --dir examples/call-center build
```

Expected result:

- root types remain clean
- example builds clean

---

### Task 23: Add a future E2E placeholder issue instead of fake coverage

**Rule**

- do not claim browser workflow coverage until a real example harness exists
- if needed, create a follow-up bead for `tests/e2e/call-center-mvp.spec.ts`

---

## Execution Order

Execute phases in this order:

1. Baseline and state boundaries
2. Setup and readiness
3. Inbound agent flow
4. Wrap-up
5. Callback-only outbound
6. Supervisor workspace
7. Demo gateway
8. History and thin persistence
9. Final verification

Do not implement supervisor or callback UX before wrap-up exists.

---

## Suggested Commit Slices

Use these commit boundaries:

1. `feat(call-center): add MVP example types and mapper layer`
2. `refactor(call-center): extract agent workspace state`
3. `feat(call-center): add setup and readiness model`
4. `feat(call-center): add inbound support workflow`
5. `feat(call-center): add wrap-up and callback creation`
6. `feat(call-center): add callback-only outbound worklist`
7. `feat(call-center): add supervisor board`
8. `refactor(call-center): move demo simulation into gateway`
9. `test(call-center): add MVP example unit coverage`

---

## Final Verification Checklist

- [ ] `pnpm exec vitest run tests/unit/examples/call-center`
- [ ] `pnpm exec vitest run tests/unit/providers/call-center/asterisk-adapter.test.ts tests/unit/providers/call-center/types.test.ts`
- [ ] `pnpm exec vue-tsc --noEmit --pretty false`
- [ ] `pnpm --dir examples/call-center build`
- [ ] manual check: demo mode inbound flow
- [ ] manual check: wrap-up requires disposition
- [ ] manual check: outbound only available from callback worklist
- [ ] manual check: supervisor board contains no audio intervention controls

---

## Execution Options

**1. Sequential**

Implement the plan task-by-task in this branch and verify each slice before moving on.

**2. Parallel**

Split by independent workstreams after Phase 1:

- Agent workspace and wrap-up
- Callback worklist
- Supervisor board
- Demo gateway and tests

**3. Deferred Core Work**

Do not pull any of these into MVP unless a concrete blocker appears:

- provider-agnostic adapter expansion
- unified interaction domain model in `src/`
- monitor/whisper/barge productization
- campaign outbound
- WFM
