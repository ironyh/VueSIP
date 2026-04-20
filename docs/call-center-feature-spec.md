# Call Center Feature Spec

## Meta

- Status: Draft for product planning
- Version: 2
- Date: 2026-04-20
- Product shape: Demo first, productizable later
- Primary channel: Voice
- Primary persona for MVP: Inbound support agent
- Primary backend for MVP: Asterisk-first

## Why This Spec Exists

VueSIP already has strong call-center primitives for agent presence, queue membership, metrics, SIP calling, and Asterisk monitoring. What it does not yet have is a sharply scoped product surface that turns those primitives into a believable call-center application.

This spec defines that product surface before implementation planning begins.

## Locked Product Decisions

The following decisions are now treated as locked for planning purposes.

1. The call-center offer is split into three surfaces:
   - `Agent Workspace`
   - `Supervisor Workspace`
   - `Admin and Setup Surface`
2. MVP is built around one primary persona: `inbound support agent`.
3. MVP is `inbound-first`.
4. MVP outbound is limited to `callback follow-up` created from inbound wrap-up.
5. Supervisors do not join calls in MVP.
6. Supervisors may perform non-intrusive operational actions in MVP.
7. Demo mode and connected mode must share the same information architecture and user workflows.
8. Demo mode and connected mode do not need identical backend behavior.
9. MVP is Asterisk-first, even if the long-term architecture remains provider-oriented.

## Purpose

VueSIP should provide a call-center app that demonstrates a real inbound support workflow, proves the underlying voice and queue APIs, and can be evolved into a commercial product without a rewrite.

The goal is not to ship a full enterprise contact-center suite. The goal is to ship a believable and coherent first product slice that can be demoed, validated internally, and then hardened.

## Product Model

### 1. Agent Workspace

The operational desktop for agents.

It handles:

- login and readiness
- queue presence
- inbound call handling
- live call control
- notes and disposition
- callback creation
- callback follow-up
- recent interaction context

### 2. Supervisor Workspace

The monitoring and coordination surface for team leads.

It handles:

- queue load visibility
- agent state visibility
- active interaction visibility
- basic alerting
- non-audio operational actions

It does not handle:

- whisper
- barge
- live audio monitoring

### 3. Admin and Setup Surface

The environment and team setup surface.

It handles:

- SIP and PBX connectivity
- demo and sandbox presets
- queue defaults
- pause reasons
- capability visibility
- device and permission validation

It is intentionally not a full PBX administration UI.

## Product Principles

- One role, one workspace
- Inbound first, not everything first
- Demo-first, but never demo-only architecture
- Honest capability gating
- Queue work and wrap-up are first-class
- Callbacks are operational work, not sticky notes
- Supervisor visibility without call intrusion
- Same workflow model across demo and connected modes

## MVP Summary

The MVP is a believable inbound support flow:

1. Agent connects and validates readiness.
2. Agent joins queue and becomes available.
3. Agent receives inbound queue call.
4. Agent answers and handles the call.
5. Agent writes notes and completes disposition in wrap-up.
6. Agent optionally creates a callback task.
7. Agent later works the callback from a callback list.
8. Supervisor monitors queue and agent health without entering calls.

Everything outside that loop is secondary.

## Personas and Roles

### Primary Persona: Inbound Support Agent

The MVP is optimized for agents who:

- handle inbound queue calls
- need clear caller and queue context
- log outcome and notes
- create follow-up callbacks when needed

The MVP is not optimized for:

- high-volume outbound sales
- receptionist switchboard behavior
- blended multi-channel work

### Supervisor

The supervisor monitors queues and agent performance and can perform lightweight operational actions without joining calls.

### Admin or Implementer

The admin configures environments, presets, defaults, and capability display.

## Experience Modes

The product supports two modes.

### Demo Mode

- seeded or simulated queue traffic
- seeded customer and callback data
- guided inbound and callback scenarios
- can run without a live PBX
- clearly labels simulated data and simulated capabilities

### Connected Mode

- real SIP and PBX state
- real queue and agent state where supported
- real call handling
- real capability gating

### Truth Contract Between Modes

Demo mode and connected mode must share:

- the same screens
- the same navigation
- the same state labels
- the same major workflows

They do not need to share:

- identical data fidelity
- identical provider capabilities
- identical persistence model on day one

The UI must remain honest. Demo mode may simulate data, but must not pretend that unsupported live capabilities exist.

## Core User Journeys

### Journey A: Start Shift

1. Agent opens the app.
2. Agent selects or confirms environment.
3. Agent validates microphone, speaker, permissions, and connection state.
4. Agent signs in or connects.
5. Agent joins default queue.
6. Agent becomes available.

### Journey B: Handle Inbound Queue Call

1. Agent sees incoming queue call with customer and queue context.
2. Agent answers.
3. Agent uses call controls and writes notes during the call.
4. Agent ends or transfers the call.
5. Agent enters wrap-up.
6. Agent selects disposition and finalizes notes.
7. Agent optionally creates a callback.
8. Agent returns to available or paused.

### Journey C: Work Callback

1. Agent opens callback list.
2. Agent selects assigned callback.
3. Agent reviews customer snapshot and prior interaction.
4. Agent starts outbound follow-up.
5. Agent completes notes and outcome.
6. Agent closes, reschedules, or escalates callback.

### Journey D: Monitor Operations

1. Supervisor opens monitoring workspace.
2. Supervisor reviews queue load and longest wait.
3. Supervisor reviews agent states and wrap-up duration.
4. Supervisor acknowledges alerts or reassigns callback work when needed.

## Agent State Model

The MVP uses a defined state machine.

### Core States

- `offline`
- `connecting`
- `available`
- `ringing`
- `busy`
- `wrap-up`
- `paused`
- `reconnecting`

### Required State Rules

- An agent cannot be `available` until environment readiness checks pass.
- An inbound queue offer moves the agent from `available` to `ringing`.
- Answering moves the agent to `busy`.
- Ending a handled call moves the agent to `wrap-up`.
- Completing required wrap-up returns the agent to `available` or `paused`.
- A missed or unanswered queue offer must produce a defined RONA outcome.
- Reconnect must not silently reset the agent to `available` if state is uncertain.

### RONA and Missed-Call Rules

For MVP:

- queue no-answer creates a visible missed interaction event
- agent is removed from active availability until they explicitly recover state
- supervisor can see that the agent is in a degraded or attention-needed state

## Queue Model

The MVP keeps queue behavior intentionally simple.

### MVP Queue Rules

- one primary joined queue is sufficient for MVP
- additional queue membership may exist technically, but the MVP UX should not depend on complex multi-queue behavior
- queue-specific pause is optional and capability-gated
- inbound queue work always outranks callback work while the agent is available for inbound handling

### Deferred Queue Complexity

The MVP does not require:

- advanced queue priority tuning in the UI
- skill-based routing controls
- complex blended routing across several active queues

## Customer Context Rail

The agent workspace needs a minimal context rail in MVP.

### Minimum Customer Card Fields

- display name or caller identity
- number or endpoint
- queue source
- most recent interaction outcome
- open callback state
- free-text notes summary

This is intentionally small, but it must exist. The product should not be telephony-only.

## Callback Operating Model

Callbacks are first-class operational work in the MVP.

### MVP Callback Rules

- callbacks are queue-owned tasks with an assignee
- the creating agent is default assignee
- supervisors may reassign callbacks
- callbacks have:
  - due time
  - reason
  - status
  - owner
  - linked interaction
- callbacks may be:
  - `open`
  - `in-progress`
  - `completed`
  - `rescheduled`
  - `failed`

### MVP Callback Scope

Included:

- create callback from wrap-up
- callback list view
- callback follow-up call
- callback completion or reschedule

Deferred:

- outbound campaigns
- preview dialer logic
- compliance scripting
- queue-wide callback SLA automation beyond simple due-state visibility

## Functional Scope

### Agent Workspace

#### A. Session and Readiness

- connect or sign in to current environment
- validate microphone, speaker, permissions, and secure context
- show SIP and PBX connectivity state
- show reconnecting and degraded states clearly
- persist local user preferences in demo mode

#### B. Presence and Queue Membership

- join queue
- leave queue
- set state to available or paused
- display pause reason and elapsed paused time
- show attention-needed state after RONA or reconnect uncertainty

#### C. Inbound Call Handling

- inbound queue offer banner or panel
- answer
- reject
- hold and resume
- mute and unmute
- hangup
- transfer
- live call timer
- note-taking during the call

`park` is not required as a provider-agnostic MVP promise.

#### D. Wrap-Up

- enter wrap-up after handled inbound call
- require disposition before returning to available
- keep notes visible and editable during wrap-up
- allow callback creation from wrap-up
- display wrap-up timer or policy clearly

#### E. Callback Follow-Up

- show callback list
- filter by due state and assignee
- open customer context and prior interaction
- place callback follow-up call
- complete, fail, or reschedule callback

#### F. Recent History

- show recent handled interactions
- show disposition
- show callback linkage where present

### Supervisor Workspace

#### A. Queue Board

- waiting count
- longest wait
- active handled count
- abandoned or missed signal where available
- alert state

#### B. Agent Board

- current state
- active call state
- wrap-up duration
- pause reason
- reconnect or degraded state

#### C. Operational Actions

MVP supervisor actions are intentionally narrow:

- acknowledge alert
- reassign callback
- nudge agent to recover state out-of-band

MVP supervisor actions do not include:

- monitor
- whisper
- barge
- editing live call audio behavior

### Admin and Setup Surface

#### A. Environment Setup

- SIP credentials and transport settings
- PBX and AMI connectivity where applicable
- demo and sandbox presets
- local validation before connect

#### B. Team Defaults

- default queue
- pause reasons
- break labels
- queue display labels

#### C. Capability Display

- show provider capability flags
- disable unsupported features clearly
- distinguish simulated behavior from live capability

## MVP Boundaries

### Included in MVP

- Asterisk-first connected mode
- demo mode with the same workflow shape
- inbound support agent flow
- callback-only outbound follow-up
- minimal customer context rail
- wrap-up with required disposition
- callback assignment and reassignment
- read-only plus lightweight operational supervisor workspace
- admin/setup presets and readiness checks

### Explicitly Deferred

- broad manual outbound as a product pillar
- campaign or preview dialing
- advanced multi-queue routing UX
- full provider parity across FreeSWITCH, cloud, and custom backends
- full unified interaction model across queue, SIP, history, and callback layers
- rich reconnect-safe draft persistence for all work objects
- supervisor audio interventions
- PBX administration
- workforce management
- omnichannel

## Data Model

### Agent Session

- agent id
- display name
- extension
- joined queue
- current state
- pause reason
- session timestamps

### Interaction

MVP interaction tracking is a product concept, not yet a shared domain model.

For planning purposes an interaction contains:

- direction
- queue source
- customer reference
- state
- timing
- notes
- disposition
- linked callback

Implementation should not assume this already exists as a single first-class code object.

### Callback Task

- id
- interaction id
- assignee
- queue
- due at
- status
- reason
- latest outcome

## Mapping to Current VueSIP Capabilities

### Strong Fit Today

- `useCallCenterProvider`
- `useAgentState`
- `useAgentQueue`
- `useAgentMetrics`
- `useSipClient`
- `useCallSession`
- `useAmiAgentLogin`
- `useAmiQueues`

These are enough for:

- agent sign-in
- queue membership
- presence state
- queue monitoring
- core telephony controls
- basic Asterisk-first supervisor visibility

### Partial Fit Today

- wrap-up exists only lightly in the current call-center layer
- callback and history need careful scoping
- provider-agnostic story is aspirational beyond Asterisk today

### Deliberately Hidden in MVP

`useAmiSupervisor` supports `monitor`, `whisper`, and `barge`, but those capabilities should be explicitly gated out of the MVP product surface.

## Acceptance Criteria

### Agent Workspace

- An agent can connect, validate readiness, and become available from one screen.
- An inbound queue call can be answered, controlled, completed, and wrapped up in one continuous flow.
- Wrap-up requires a disposition before the agent returns to available.
- A callback can be created from wrap-up and later worked from a callback list.
- A callback follow-up call can be completed without leaving the workspace.

### Supervisor Workspace

- A supervisor can identify queue pressure and agent state problems from one screen.
- A supervisor can acknowledge alerts and reassign callback work.
- The supervisor cannot join or coach calls from the MVP UI.

### Demo and Connected Modes

- The same screens and core workflows exist in both modes.
- Simulated capabilities are visually distinct from live capabilities.
- Unsupported live features fail honestly and visibly.

## Non-Functional Requirements

### Reliability

- agent and call state must remain coherent during reconnects
- the UI must not silently lose notes during active call to wrap-up transition
- demo mode must fail soft rather than blank-screening

### Performance

- agent actions should feel immediate on commodity laptops
- queue and agent boards should update in near-real time without thrashing

### Accessibility

- full keyboard support for the core agent loop
- proper labels for call controls and stateful actions
- accessible focus management during incoming call and wrap-up states

### Security and Privacy

- credentials must not leak into logs
- customer data shown in demo mode must be clearly synthetic
- notes and callback flows must assume customer data sensitivity

## Market Alignment

This shape follows the broad patterns used by major call-center products:

- unified agent workspace
- separate supervisor monitoring
- separate admin or setup layer
- inbound-first operational focus
- outbound embedded as a narrower workflow unless the product is dialer-led

Reference patterns:

- [Talkdesk Workspace](https://www.talkdesk.com/contact-center-platform/workspace/)
- [Talkdesk Agent Workspace](https://www.talkdesk.com/cloud-contact-center/omnichannel-engagement/agent-workspace/)
- [Salesforce Service Agent Console](https://www.salesforce.com/products/service-cloud/features/service-agent-console/)
- [Twilio Flex UI](https://www.twilio.com/docs/flex/admin-guide/core-concepts/flex-ui)
- [Aircall Live Monitoring / Coaching](https://support.aircall.io/hc/en-gb/articles/22105393543965)
- [CloudTalk Call Monitor](https://help.cloudtalk.io/en/articles/5440621-call-monitor)

## What This Spec Is Ready For

This spec is now ready for:

- UX and information architecture planning
- MVP implementation planning
- component and state breakdown
- demo scenario design

This spec is not yet the place to define:

- detailed backend persistence design
- full provider abstraction strategy
- campaign management
- WFM or analytics roadmap
