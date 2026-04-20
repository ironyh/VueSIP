# Call Center Feature Spec

## Meta

- Status: Draft for product planning
- Date: 2026-04-20
- Scope type: Demo first, productizable later
- Primary channels: Voice
- Interaction modes: Inbound and outbound

## Locked Product Decisions

This spec reflects the current product decisions:

1. The call-center offering is split into three surfaces so all user types can be supported.
2. Both inbound and outbound flows are planned from the start.
3. The first release is an internal/demo-friendly experience, but the design must support future commercial packaging.
4. Supervisors monitor activity and performance, but do not join calls in the initial product shape.
5. The work should start as a demo and evolve into a real product surface over time.

## Purpose

VueSIP should offer a call-center application that demonstrates a realistic agent workflow, proves the underlying call-center APIs, and can evolve into a productized voice workspace without a full rewrite.

The first objective is not to build a full enterprise suite. The first objective is to make a convincing, stable voice call-center experience that supports real inbound and outbound work, shows supervisory visibility, and uses clean seams for future PBX and CRM integrations.

## Product Model

The application is divided into three product surfaces.

### 1. Agent Workspace

The operational desktop used by agents to:

- log in and become available
- receive inbound queue calls
- place outbound calls
- manage active calls
- write notes
- complete wrap-up
- create callbacks
- review recent work

### 2. Supervisor Workspace

The monitoring desktop used by team leads to:

- monitor queue health
- monitor agent availability and activity
- inspect active call metadata and queue pressure
- review live and session metrics
- detect SLA risk and staffing issues

The supervisor does not silently listen, whisper, or barge into calls in the first product shape.

### 3. Admin and Setup Surface

The configuration and enablement surface used to:

- configure SIP and PBX connectivity
- define queues, pause reasons, and agent defaults
- manage demo presets and environment switching
- validate permissions, devices, and backend reachability

This is intentionally lighter than full PBX administration.

## Goals

- Deliver a believable call-center demo that can be used in sales, testing, and internal validation.
- Support a full agent loop: login, queue work, call handling, wrap-up, callback, and history.
- Support both inbound and outbound call handling without splitting the UI into separate products.
- Prove VueSIP's provider-agnostic call-center APIs in a real application surface.
- Keep the architecture compatible with future Asterisk, FreeSWITCH, cloud, and CRM integrations.

## Non-Goals

- Full omnichannel support in the first phase
- Workforce management, forecasting, or scheduling
- Predictive dialers or campaign automation
- Supervisor whisper, barge, or live call intrusion
- Full PBX administration inside the app
- Heavy BI or long-horizon analytics

## Users and Roles

### Agent

Primary operator handling inbound and outbound customer conversations.

### Supervisor

Observes queues and agent performance, identifies risk, and manages staffing response.

### Admin or Implementer

Configures environments, queues, agent defaults, and demo/product connectivity.

## Experience Modes

The application must support two operating modes.

### Demo Mode

- Uses seeded or simulated queue, call, and customer data
- Supports guided scenarios for inbound and outbound flows
- Can run without a live PBX
- Makes capability gaps explicit in the UI

### Connected Mode

- Uses real SIP and PBX connectivity
- Reflects real queue state, agent state, and call state
- Preserves the same UI model as demo mode

The UI should not look like a separate product in each mode. Demo mode and connected mode should share the same workflows and layout.

## Core User Journeys

### Journey A: Start Shift

1. Agent opens the workspace.
2. Agent validates device and network readiness.
3. Agent signs in or connects to the configured environment.
4. Agent joins default queues and selects an initial availability state.
5. Workspace confirms readiness and exposes queue load.

### Journey B: Handle Inbound Queue Call

1. Agent sees queue pressure and incoming call context.
2. Agent answers the call.
3. Agent uses call controls and notes during the conversation.
4. Agent ends or transfers the call.
5. Workspace enters wrap-up.
6. Agent sets outcome, notes, and callback if needed.
7. Agent returns to available or paused.

### Journey C: Place Outbound Call

1. Agent opens callback list, recent history, or customer card.
2. Agent initiates a manual outbound call.
3. Workspace shows call progress and live controls.
4. Agent logs notes and outcome.
5. Workspace records the interaction in history.

### Journey D: Monitor Team Health

1. Supervisor opens the monitoring workspace.
2. Supervisor sees live queue load, active calls, and agent states.
3. Supervisor filters by queue or team.
4. Supervisor identifies SLA risk, backlog, or staffing imbalance.
5. Supervisor uses operational controls outside the call audio path, such as changing queue membership expectations or contacting agents outside the monitored call.

## Functional Scope

### Agent Workspace

#### A. Session and Readiness

- Connect or sign in to the current environment
- Validate microphone, speaker, permissions, and secure context
- Show PBX/SIP connectivity state
- Show reconnecting and degraded states clearly
- Persist basic agent preferences locally in demo mode

#### B. Agent Presence and Queue Membership

- Login and logout from queues
- Join and leave specific queues
- Set availability to available, busy, break, meeting, or wrap-up
- Pause globally or by queue if supported by the provider
- Show pause reason and elapsed pause time

#### C. Inbound Queue Handling

- Show queued and active inbound work
- Display caller identity and originating queue where available
- Support answer, reject, hold, resume, mute, transfer, park, and hangup
- Maintain live call timer and on-hold state
- Preserve call notes during the conversation

#### D. Outbound Calling

- Manual dial pad or click-to-call
- Outbound from callback queue, recent history, or customer card
- Outbound notes and disposition
- Distinguish preview/manual outbound from future campaign-style outbound

#### E. Wrap-Up and After-Call Work

- Enter wrap-up after each handled call
- Require or encourage disposition selection
- Persist notes
- Allow callback creation with due time, owner, and reason
- Allow returning to available or paused after wrap-up

#### F. Worklist and History

- Show recent inbound and outbound interactions
- Filter by status, direction, queue, and agent-owned callbacks
- Reopen a callback and start a new outbound call from it
- Show linked notes and outcomes

#### G. Error and Recovery UX

- Distinguish SIP offline, PBX offline, media device error, and permission denial
- Provide recovery guidance in-product
- Preserve unsaved notes and wrap-up state during reconnect where possible

### Supervisor Workspace

#### A. Live Queue Board

- Show queues, waiting count, longest wait, answered count, abandoned count, and alert state
- Highlight SLA-risk queues
- Filter by queue group or team

#### B. Agent State Board

- Show agent state, current queue membership, pause reason, and session duration
- Show which agents are on call, wrapping up, paused, or offline
- Support simple search and filtering

#### C. Live Activity View

- Show active call metadata such as agent, queue, duration, and state
- Show whether the call is inbound or outbound
- Do not provide join, whisper, or barge actions in the initial product

#### D. Session Metrics

- Show current handled count, missed count, average handle time, average wrap-up time, and utilization-style signals
- Allow queue and agent drill-down

#### E. Operational Alerts

- Queue backlog risk
- Long wrap-up times
- Repeated disconnects
- Agent unavailable while assigned to critical queues

### Admin and Setup Surface

#### A. Environment Setup

- SIP credentials and transport settings
- PBX and AMI connectivity settings where applicable
- Demo presets and sandbox presets
- Local validation before connect

#### B. Team and Queue Defaults

- Available queues
- Default joined queues
- Pause reasons
- Break types
- Queue labels and display metadata

#### C. Capability Display

- Make provider capabilities visible
- Hide or disable features that are unsupported by the current backend
- Keep the UI honest about demo-only vs live capabilities

## Inbound and Outbound Product Shape

Inbound and outbound should be treated as first-class but not identical experiences.

### Inbound

Inbound is the operational center of gravity in MVP:

- queue state is always visible
- queue-originated calls are clearly labeled
- wrap-up is strongly tied to inbound handling
- supervisor visibility focuses heavily on inbound load and SLA

### Outbound

Outbound is included from the beginning, but starts narrower:

- manual outbound
- callback-driven outbound
- recent-history outbound
- customer-card outbound

Future outbound expansion may include:

- task lists
- preview dialing
- campaign pacing
- script guidance

## Feature Prioritization

### MVP: Demo-Ready Product Slice

- Agent sign-in and environment readiness
- Queue login/logout and availability control
- Inbound queue handling
- Manual outbound calling
- Active call controls
- Call notes
- Wrap-up with disposition
- Callback creation and callback worklist
- Recent interaction history
- Supervisor queue board
- Supervisor agent state board
- Admin/setup basics
- Demo mode and connected mode parity

### Phase 2: Product Hardening

- Real queue and callback persistence
- Customer card model beyond mock data
- Role-aware permissions
- Better filtering and saved views
- Export/report basics
- Queue-level configuration polish
- Cross-session recovery for notes and wrap-up drafts

### Phase 3: Product Expansion

- CRM integration panel
- Skill-based routing UI
- Advanced outbound workflows
- QA review flows
- AI summarization and tagging
- WFM-adjacent insights

## High-Level Data Model

### Agent Profile

- id
- displayName
- extension
- currentStatus
- pauseReason
- joinedQueues
- currentSession

### Queue

- id
- displayName
- priorityModel
- joinedAgents
- waitingCount
- longestWait
- alertState

### Interaction

- id
- direction
- queueId
- customerRef
- state
- startTime
- endTime
- duration
- notes
- disposition
- callbackRef

### Callback Task

- id
- interactionId
- dueAt
- owner
- reason
- status

### Supervisor Snapshot

- queueMetrics
- activeCalls
- agentStates
- alerts

## Functional Acceptance Criteria

### Agent Workspace

- An agent can sign in, join queues, and become available without leaving the workspace.
- An inbound call can be answered, controlled, ended, and wrapped up in one continuous flow.
- A manual outbound call can be placed from the same workspace without switching apps.
- Notes entered during a call survive the transition to wrap-up.
- A callback can be created from wrap-up and later used to initiate outbound follow-up.

### Supervisor Workspace

- A supervisor can identify queue backlog and agent availability issues within one screen.
- A supervisor can distinguish live inbound and outbound activity without opening the agent workspace.
- The supervisor workspace exposes monitoring data only and does not expose join-call controls in MVP.

### Admin and Setup

- A setup user can configure or select an environment without editing source code.
- Unsupported features are either disabled or clearly labeled.
- Demo mode can be used without a live PBX.

## Non-Functional Requirements

### Reliability

- The UI must keep agent state and call state coherent during reconnects.
- Draft notes and wrap-up inputs should survive transient frontend refreshes where feasible.
- Demo mode must fail soft rather than blank-screening.

### Performance

- Agent workspace interactions should feel immediate on commodity laptops.
- Live queue and agent boards should update in near-real time without visibly thrashing the UI.
- Filtering and list actions should remain responsive with realistic team sizes.

### Accessibility

- Full keyboard operation for the core agent loop
- Screen-reader labels for controls and dynamic states
- Clear focus management in incoming call and wrap-up states

### Security and Privacy

- Credentials must not be exposed in logs or demo output
- PII handling should be explicit in notes and history flows
- Demo data must be visually distinct from real customer data

### Compatibility

- Browser-first experience
- Consistent behavior in demo mode and connected mode
- Backend capability differences surfaced through feature gating, not silent failure

## Product Principles

- One workspace per role, not many disconnected panels
- Demo-first, but never demo-only architecture
- Honest capability gating
- Queue work and wrap-up are first-class
- Inbound and outbound share one interaction model
- Supervisor visibility without call intrusion

## Mapping to Existing VueSIP Capabilities

This spec should build on existing VueSIP primitives rather than invent a separate stack.

### Existing Fit

- `useCallCenterProvider`
- `useAgentState`
- `useAgentQueue`
- `useAgentMetrics`
- `useSipClient`
- `useCallSession`
- `useAmiAgentLogin`
- `useAmiQueues`

### Existing Capabilities That Should Be Deliberately Deferred or Feature-Gated

- `useAmiSupervisor` supports monitor, whisper, and barge at the API level, but the product surface should only expose non-intrusive supervision in the initial release.

### Capability Constraints to Respect

The UI should map to provider capabilities such as:

- queue support
- multi-queue support
- pause and pause-reason support
- wrap-up support
- real-time metrics support
- penalty and skill-based routing support

If the backend does not support a capability, the UI must degrade explicitly.

## Market Alignment

This product shape follows the broad pattern used by major call-center platforms:

- a unified agent workspace
- a separate supervisor monitoring surface
- queue visibility as a first-class concept
- outbound support inside the same agent workspace
- configuration separated from the operational desktop

Reference examples:

- [Talkdesk Workspace](https://www.talkdesk.com/contact-center-platform/workspace/)
- [Salesforce Service Agent Console](https://www.salesforce.com/products/service-cloud/features/service-agent-console/)
- [NiCE Supervisor Workspace](https://www.nice.com/resources/supervisor-workspace)
- [Genesys Workforce Management overview](https://www.genesys.com/definitions/what-is-contact-center-workforce-management)
- [Aircall Live Monitoring / Coaching](https://support.aircall.io/hc/en-gb/articles/22105393543965)
- [CloudTalk Call Monitor](https://help.cloudtalk.io/en/articles/5440621-call-monitor)
- [Five9 Features](https://www.five9.com/products/features)

## Open Questions for the Next Planning Step

These should be resolved before implementation planning starts:

- Which agent persona is primary in MVP: support, receptionist, or sales?
- Should callbacks be personal only, queue-owned, or both?
- Should outbound in MVP include scripts or just notes and disposition?
- What minimum customer card fields are required in demo mode?
- Should supervisors see individual interaction notes, or only operational metrics?
