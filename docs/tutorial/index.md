# VueSIP Interactive Tutorial

Welcome to the VueSIP interactive tutorial! This hands-on guide will take you from zero to building a production-ready softphone application in about 50 minutes.

## What Makes This Tutorial Special

This tutorial uses **mock mode** - a simulated SIP environment that lets you learn and experiment without needing:

- Real SIP server credentials
- A VoIP provider account
- Complex WebRTC configuration

You'll build real, working components that you can later connect to actual SIP infrastructure.

## Prerequisites

Before starting, make sure you have:

- **Vue 3** knowledge (Composition API basics)
- **TypeScript** familiarity (basic types)
- **Node.js 18+** installed
- A Vue 3 project ready (or use `npm create vue@latest`)

::: tip New to Vue 3?
If you're new to Vue 3's Composition API, we recommend the [Vue 3 Tutorial](https://vuejs.org/tutorial/) first. You'll need to understand `ref()`, `computed()`, and `watch()`.
:::

## What You'll Build

By the end of this tutorial, you'll have built:

### Part 1: Your First Mock Call

A simple component that connects to a simulated SIP server and makes a call - all in under 20 lines of code.

### Part 2: A Complete Softphone

A fully-functional softphone with:

- Dial pad with DTMF tones
- Call controls (answer, hangup, hold, mute)
- Call duration display
- Incoming call handling

### Part 3: Real Server Connection

Learn how to switch from mock mode to connecting with real SIP providers like Telnyx, VoIP.ms, or your own Asterisk server.

### Part 4: Advanced Features

Add professional features:

- Call transfers (blind and attended)
- Conference calling
- Real-time transcription
- Call quality monitoring

## Tutorial Structure

| Part                                   | Topic                  | Time   | Difficulty   |
| -------------------------------------- | ---------------------- | ------ | ------------ |
| [Part 1](/tutorial/part-1-hello)       | Hello VueSIP           | 5 min  | Beginner     |
| [Part 2](/tutorial/part-2-softphone)   | Building a Softphone   | 15 min | Intermediate |
| [Part 3](/tutorial/part-3-real-server) | Real Server Connection | 10 min | Intermediate |
| [Part 4](/tutorial/part-4-advanced)    | Advanced Features      | 20 min | Advanced     |

## Quick Start

If you want to jump right in, here's what mock mode looks like:

```typescript
import { useSipMock } from 'vuesip'

const { isConnected, activeCall, connect, call, hangup } = useSipMock()

// Connect to simulated server
await connect()

// Make a simulated call
await call('555-1234')

// End the call
await hangup()
```

That's it! No credentials, no server setup, no WebRTC configuration.

## How Mock Mode Works

The `useSipMock` composable simulates the entire SIP lifecycle:

1. **Connection** - Simulates WebSocket connection with configurable delays
2. **Registration** - Simulates SIP REGISTER with realistic timing
3. **Outgoing Calls** - Simulates call setup: calling -> ringing -> active
4. **Incoming Calls** - Trigger simulated incoming calls for testing
5. **Call Controls** - Hold, unhold, mute, DTMF - all reactive

Mock mode uses the same API as real mode, so your components work unchanged when you switch to production.

::: info Why Mock Mode?
Mock mode was designed specifically for this tutorial and for UI development. It lets you:

- **Learn without barriers** - No credentials needed
- **Test UI components** - Develop your interface independently
- **Debug edge cases** - Simulate network issues and quality drops
- **Write tests** - Perfect for unit and integration testing
  :::

## Ready to Start?

Let's begin with Part 1, where you'll make your first simulated call in just 5 minutes.

<div style="text-align: center; margin-top: 2rem;">

[Start Part 1: Hello VueSIP](/tutorial/part-1-hello)

</div>

## Additional Resources

As you work through the tutorial, you may want to reference:

- [API Reference](/api/) - Complete composable documentation
- [Getting Started](/guide/getting-started) - Full setup guide for production
- [Examples](/examples/) - More code examples and patterns
- [FAQ](/faq) - Common questions and answers
