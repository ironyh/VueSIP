# Product Mission

## Pitch

VueSip is a headless Vue.js component library that helps Vue developers build professional SIP/VoIP applications by providing plug-and-play composables with deep customization options. It abstracts the complexity of WebRTC and SIP protocols while giving developers complete control over their UI.

## Users

### Primary Customers

- **Vue.js Developers**: Building softphone interfaces, dialpad UIs, or VoIP features into existing applications
- **Enterprise Development Teams**: Creating contact center applications, agent softphones, or customer service tools
- **VoIP Service Providers**: White-labeling browser-based calling solutions for their customers

### User Personas

**Full-Stack Developer** (25-40 years old)
- **Role:** Senior Developer building internal tools
- **Context:** Working on a Vue 3 application that needs calling features for customer support
- **Pain Points:** WebRTC complexity, SIP protocol learning curve, lack of Vue-specific libraries, rigid UI components
- **Goals:** Add calling features quickly, maintain consistent design system, avoid vendor lock-in

**Contact Center Architect** (35-50 years old)
- **Role:** Technical Lead at a BPO or call center
- **Context:** Modernizing legacy desktop softphones to web-based agents
- **Pain Points:** Browser compatibility, call quality monitoring, AMI/Asterisk integration, multi-line handling
- **Goals:** Reliable browser-based calling, integration with existing PBX, real-time stats and monitoring

**Startup CTO** (28-45 years old)
- **Role:** Technical decision-maker at a SaaS company
- **Context:** Building a communication feature for their product (healthcare, real estate, support)
- **Pain Points:** Limited development resources, need for rapid iteration, security compliance
- **Goals:** Ship VoIP features fast, avoid building from scratch, maintain flexibility for future needs

## The Problem

### WebRTC and SIP Complexity

Building VoIP applications requires deep expertise in WebRTC, SIP protocols, codec negotiation, and NAT traversal. Most Vue developers lack this specialized knowledge, leading to months of learning curve before productive development.

**Our Solution:** VueSip abstracts all protocol complexity into simple Vue composables like `useSipClient()`, `useCallSession()`, and `useDTMF()`.

### Rigid Third-Party Solutions

Existing SIP libraries either provide no UI (forcing developers to build everything) or opinionated components that don't match application design systems. Developers are forced to choose between starting from scratch or fighting against inflexible components.

**Our Solution:** Headless composables provide all business logic while developers maintain complete UI control using any CSS framework or component library.

### Asterisk/PBX Integration Gaps

Many applications need deep integration with Asterisk Manager Interface (AMI) for features like queue management, agent login, call recording control, and presence. Most WebRTC libraries ignore server-side integration.

**Our Solution:** Dedicated AMI composables (`useAmiQueues`, `useAmiAgentLogin`, `useAmiRecording`) provide seamless Asterisk integration.

## Differentiators

### Headless Architecture

Unlike traditional SIP libraries that ship with opinionated UI components, VueSip provides pure business logic through Vue composables. This results in zero CSS conflicts, perfect design system integration, and complete UI flexibility.

### Dual SIP + AMI Support

Unlike WebRTC-only libraries (SIP.js, JsSIP), VueSip provides both client-side SIP functionality AND server-side AMI integration in a single package. This enables features like queue statistics, call recording control, and agent presence that require PBX access.

### Adapter Pattern Extensibility

Unlike libraries locked to a single SIP stack, VueSip uses an adapter pattern supporting JsSIP (default) and SIP.js. This provides vendor flexibility and future-proofing as the WebRTC ecosystem evolves.

## Key Features

### Core SIP Features

- **SIP Connection & Registration:** Managed WebSocket connections with auto-reconnection and registration state tracking
- **Call Management:** Make, answer, reject, hold, transfer calls with full state machine management
- **DTMF Support:** Send dialpad tones during active calls with proper RFC 4733 compliance
- **Multi-Line Handling:** Manage multiple simultaneous calls with line switching and parking

### Media & Quality Features

- **Audio Device Management:** Enumerate, select, and switch microphones and speakers dynamically
- **Video Calling:** Full video support with Picture-in-Picture and inset positioning
- **Call Quality Monitoring:** Real-time WebRTC stats, quality scoring (A-F grades), and network indicators
- **Bandwidth Adaptation:** Intelligent recommendations based on network conditions

### Enterprise Features

- **Conference Calling:** Multi-party calls with active speaker detection and gallery layouts
- **Call Recording:** Client-side (MediaRecorder) and server-side (AMI) recording support
- **Connection Recovery:** ICE restart handling, session persistence, automatic reconnection
- **Presence & Messaging:** Subscribe to user presence and send SIP MESSAGE

### AMI Integration Features

- **Queue Management:** Real-time queue statistics, agent status, caller information
- **Agent Login/Logout:** Control agent availability and pause/unpause states
- **Voicemail Access:** List, play, delete voicemail messages
- **Call Recording Control:** Start, stop, pause recordings via Asterisk

### Developer Experience

- **TypeScript First:** Full type safety with 47+ type definition files
- **Plugin System:** Extend functionality with analytics, recording, and custom plugins
- **Vue Plugin API:** Optional `app.use(createVueSip())` for global configuration
- **Comprehensive Testing:** Unit, integration, E2E, and performance test suites
