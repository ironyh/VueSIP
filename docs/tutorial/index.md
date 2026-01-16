# VueSIP Interactive Tutorial

Welcome to the VueSIP tutorial! This hands-on guide takes you from zero to building production-ready SIP applications in under an hour.

## Learning Path

| Part                                                      | Duration | What You'll Build               |
| --------------------------------------------------------- | -------- | ------------------------------- |
| [1. Hello VueSIP](/tutorial/part-1-hello)                 | 5 min    | Your first call using mock mode |
| [2. Building a Softphone](/tutorial/part-2-softphone)     | 15 min   | Complete UI with call controls  |
| [3. Real Server Connection](/tutorial/part-3-real-server) | 10 min   | Connect to a real SIP provider  |
| [4. Advanced Features](/tutorial/part-4-advanced)         | 20 min   | Transfer, conference, recording |

## Prerequisites

- Basic Vue.js 3 knowledge (Composition API)
- Node.js 20+ and npm/pnpm
- A code editor (VS Code recommended)

::: tip No Server Required!
Parts 1 and 2 use VueSIP's **mock mode** - you don't need a SIP server or account to start learning.
:::

## Quick Setup

Create a new Vue project and install VueSIP:

```bash
# Create new Vue project
npm create vue@latest vuesip-tutorial
cd vuesip-tutorial

# Install VueSIP
npm install vuesip

# Start development server
npm run dev
```

## What You'll Learn

### Part 1: Hello VueSIP (5 minutes)

- Installing and importing VueSIP
- Using mock mode for development
- Making your first simulated call
- Understanding the basic call lifecycle

### Part 2: Building a Softphone (15 minutes)

- Creating a dial pad component
- Displaying call status and duration
- Adding hold, mute, and hangup controls
- Sending DTMF tones
- Handling incoming calls

### Part 3: Real Server Connection (10 minutes)

- Choosing a SIP provider (Telnyx, 46elks, etc.)
- Configuring real credentials
- Understanding WebSocket connections
- Troubleshooting registration issues

### Part 4: Advanced Features (20 minutes)

- Call transfer (blind and attended)
- Conference calls with multiple participants
- Call recording with local storage
- Audio device management

## Philosophy

This tutorial follows a **progressive disclosure** approach:

1. **Start simple** - Mock mode lets you learn without infrastructure
2. **Build incrementally** - Each part adds to your working application
3. **Real-world patterns** - Code you write is production-ready
4. **Learn by doing** - Every concept includes working examples

## Ready?

Let's start with [Part 1: Hello VueSIP](/tutorial/part-1-hello) and make your first call in under 5 minutes!
