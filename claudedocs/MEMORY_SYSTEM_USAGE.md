# AgentDB Memory Patterns Usage Guide

## Overview

The Memory Module provides persistent memory patterns for AI agents built on AgentDB's 150x faster vector database. It includes session memory, long-term storage, pattern learning, and unified context management.

## Quick Start

### Basic Usage with In-Memory Storage

```typescript
import { createInMemoryAgentMemory } from './memory'

// Create an in-memory agent memory system
const memory = createInMemoryAgentMemory('my-agent')
await memory.initialize()

// Add conversation messages
await memory.addMessage('user', 'Hello!')
await memory.addMessage('assistant', 'Hi! How can I help you today?')

// Store facts about the user
await memory.storeFact('user', 'name', 'Alice')
await memory.storeFact('preference', 'language', 'English')

// Learn response patterns
await memory.learnPattern('greeting', ['hello', 'hi', 'hey'], 'Hello! How can I help?')

// Get context for generating responses
const context = await memory.getContext('What can you do?')
console.log(context.session.messages) // Recent conversation
console.log(context.facts)             // Relevant facts
console.log(context.patterns)          // Matched patterns

// Clean up
await memory.close()
```

### Persistent Storage with AgentDB

```typescript
import { createAgentMemorySystem } from './memory'

const memory = createAgentMemorySystem({
  agentId: 'assistant-1',
  dbPath: '.agentdb/memory.db',     // Persistent storage
  enableLearning: true,
  cacheSize: 1000,
})

await memory.initialize()
// Memory persists across sessions
```

## Architecture

### Components

1. **AgentMemorySystem** - Main facade for unified memory access
2. **SessionMemory** - Conversation history with summarization
3. **LongTermMemory** - Persistent fact storage with semantic search
4. **PatternLearning** - Adaptive response patterns with reinforcement learning
5. **ContextManager** - Unified context aggregation

### Data Flow

```
User Input → SessionMemory (conversation)
           → LongTermMemory (facts)
           → PatternLearning (patterns)
           → ContextManager (unified context)
```

## Session Memory

Manages conversation history within a session.

```typescript
import { createSessionMemory, createDefaultEmbeddingProvider, InMemoryAdapter } from './memory'

const adapter = new InMemoryAdapter(100)
await adapter.initialize()

const session = createSessionMemory(
  { agentId: 'agent-1', maxMessages: 100, enableSummarization: true },
  createDefaultEmbeddingProvider()
)
await session.initialize(adapter)

// Add messages
await session.addMessage('user', 'Tell me about weather')
await session.addMessage('assistant', 'The weather today is sunny')

// Get recent context
const recentMessages = await session.getContext(5)  // Last 5 messages

// Search messages semantically
const results = await session.searchMessages('weather')

// Export session data
const exported = await session.export()

// End session with summary
const result = await session.end()
console.log(result.data?.summary)  // Session summary

session.destroy()
await adapter.close()
```

## Long-Term Memory

Stores persistent facts with categories, confidence, and semantic search.

```typescript
import { createLongTermMemory, createDefaultEmbeddingProvider, InMemoryAdapter } from './memory'

const adapter = new InMemoryAdapter(500)
await adapter.initialize()

const longTerm = createLongTermMemory(
  { agentId: 'agent-1', maxFacts: 1000, autoConsolidate: false },
  createDefaultEmbeddingProvider()
)
await longTerm.initialize(adapter)

// Store facts with metadata
await longTerm.storeFact({
  category: 'user',
  key: 'name',
  value: 'Alice',
  description: 'User name learned from introduction',
  confidence: 0.95,
  tags: ['personal', 'identity']
})

await longTerm.storeFact({
  category: 'preferences',
  key: 'language',
  value: 'English',
  confidence: 0.9
})

// Retrieve specific fact
const fact = await longTerm.getFact('user', 'name')
console.log(fact?.data.value)  // 'Alice'

// Search facts semantically
const results = await longTerm.searchFacts('programming')

// Get all facts by category
const userFacts = await longTerm.getFactsByCategory('user')

// List all categories
const categories = await longTerm.getCategories()

// Update fact with verification
await longTerm.verifyFact(fact.id, true)  // Positive verification

// Find related facts
const related = await longTerm.getRelatedFacts(fact.id)

// Consolidate old/low-confidence facts
const removed = await longTerm.consolidate()

longTerm.destroy()
await adapter.close()
```

## Pattern Learning

Learns response patterns with reinforcement learning support.

```typescript
import { createPatternLearning, createDefaultEmbeddingProvider, InMemoryAdapter } from './memory'

const adapter = new InMemoryAdapter(100)
await adapter.initialize()

const patterns = createPatternLearning(
  {
    agentId: 'agent-1',
    minSuccessRate: 0.3,
    decayFactor: 0.99,
    maxPatternsPerDomain: 100,
    enableRL: true
  },
  createDefaultEmbeddingProvider()
)
await patterns.initialize(adapter)

// Learn patterns with triggers and responses
const result = await patterns.learnPattern({
  domain: 'greeting',
  trigger: {
    type: 'keyword',
    keywords: ['hello', 'hi', 'hey'],
    intent: 'greet'
  },
  response: {
    type: 'text',
    template: 'Hello! How can I help you today?'
  },
  context: {
    sessionState: ['active'],
    userAttributes: ['name']
  }
})

// Match patterns to input
const matches = await patterns.matchPatterns('Hello there!')
if (matches.length > 0) {
  console.log(matches[0].pattern)     // Matched pattern
  console.log(matches[0].confidence)  // Match confidence
}

// Apply pattern and provide feedback (reinforcement learning)
await patterns.applyPattern(result.data!.id, true)   // Positive feedback
await patterns.applyPattern(result.data!.id, false)  // Negative feedback

// Get patterns by domain
const greetings = await patterns.getPatternsByDomain('greeting')

// List all domains
const domains = await patterns.getDomains()

// Apply decay to reduce old pattern weights
const decayed = await patterns.applyDecay()

// Train from experience data
await patterns.train([
  { input: 'hello', response: 'Hi!', success: true, domain: 'greeting' },
  { input: 'bye', response: 'Goodbye!', success: true, domain: 'farewell' }
])

patterns.destroy()
await adapter.close()
```

## Context Manager

Unified context aggregation across all memory types.

```typescript
import { createContextManager, createDefaultEmbeddingProvider, InMemoryAdapter } from './memory'

const adapter = new InMemoryAdapter(500)
await adapter.initialize()

const context = createContextManager(
  {
    agentId: 'agent-1',
    session: { maxMessages: 100, enableSummarization: true },
    longTerm: { maxFacts: 1000, autoConsolidate: false },
    learning: { minSuccessRate: 0.3, enableRL: true }
  },
  createDefaultEmbeddingProvider()
)
await context.initialize(adapter)

// Process messages (with automatic pattern matching)
const msgResult = await context.processMessage('user', 'Hello!')
console.log(msgResult.data?.matchedPatterns)  // Any matched patterns

// Store facts
await context.storeFact({ category: 'user', key: 'topic', value: 'AI' })

// Learn patterns
await context.learnPattern({
  domain: 'ai',
  trigger: { type: 'keyword', keywords: ['ai', 'artificial intelligence'] },
  response: { type: 'text', template: 'AI is fascinating!' }
})

// Get unified context for response generation
const fullContext = await context.getContext({
  query: 'Tell me about AI',
  includeSession: true,
  includeFacts: true,
  includePatterns: true,
  maxFacts: 10,
  maxPatterns: 5
})

console.log(fullContext.session)    // Session data with messages
console.log(fullContext.facts)      // Relevant facts
console.log(fullContext.patterns)   // Matched patterns

// Session management
await context.endSession()
await context.startNewSession('new-session-id')

// Export/import data
const exported = await context.export()
await context.import(exported)

context.destroy()
await adapter.close()
```

## Event Handling

All components emit events for monitoring and integration.

```typescript
import { createAgentMemorySystem, createInMemoryAgentMemory } from './memory'

const memory = createInMemoryAgentMemory('agent-1')

// Listen to events
memory.on('initialized', (data) => console.log('Memory initialized:', data))
memory.on('message:processed', (msg) => console.log('Message processed:', msg))
memory.on('fact:stored', (fact) => console.log('Fact stored:', fact))
memory.on('pattern:learned', (pattern) => console.log('Pattern learned:', pattern))
memory.on('pattern:matched', (match) => console.log('Pattern matched:', match))
memory.on('session:ended', (summary) => console.log('Session ended:', summary))
memory.on('session:started', (id) => console.log('New session:', id))
memory.on('error', (error) => console.error('Error:', error))

await memory.initialize()

// Remove listener
memory.off('message:processed', handler)
```

## Storage Adapters

### InMemoryAdapter

Fast in-memory storage for development/testing.

```typescript
import { InMemoryAdapter } from './memory'

const adapter = new InMemoryAdapter(1000)  // Max 1000 entries
await adapter.initialize()

// Direct adapter operations
await adapter.store('key', { data: 'value' }, [0.1, 0.2, 0.3])
const entry = await adapter.retrieve('key')
const results = await adapter.search([0.1, 0.2], { limit: 10 })
await adapter.delete('key')

await adapter.close()
```

### AgentDBAdapter

Persistent storage with AgentDB vector database.

```typescript
import { AgentDBAdapter } from './memory'

const adapter = new AgentDBAdapter({
  dbPath: '.agentdb/memory.db',
  namespace: 'agent-1',
  cacheSize: 1000
})
await adapter.initialize()

// Same interface as InMemoryAdapter
// Data persists to disk

await adapter.close()
```

## Embedding Providers

### SimpleEmbeddingProvider

Basic embedding for testing (hash-based).

```typescript
import { SimpleEmbeddingProvider } from './memory'

const provider = new SimpleEmbeddingProvider()
const embedding = await provider.embed('hello world')
const batchEmbeddings = await provider.embedBatch(['hello', 'world'])
```

### OpenAIEmbeddingProvider

Production embeddings via OpenAI API.

```typescript
import { OpenAIEmbeddingProvider } from './memory'

const provider = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small'
})
const embedding = await provider.embed('hello world')
```

## Best Practices

### 1. Initialize Before Use
Always await `initialize()` before using any memory component.

### 2. Clean Up Resources
Call `destroy()` or `close()` when done to free resources.

### 3. Use Appropriate Adapters
- **Development/Testing**: `InMemoryAdapter`
- **Production**: `AgentDBAdapter` with persistent storage

### 4. Handle Errors
Wrap operations in try-catch and listen to error events.

```typescript
try {
  const result = await memory.addMessage('user', 'hello')
  if (!result.success) {
    console.error('Operation failed:', result.error)
  }
} catch (error) {
  console.error('Unexpected error:', error)
}
```

### 5. Provide Feedback for Learning
Use `provideFeedback()` to improve pattern matching over time.

```typescript
const context = await memory.getContext('hello')
if (context.patterns.length > 0) {
  // After using a pattern, provide feedback
  const wasHelpful = true
  await memory.provideFeedback(context.patterns[0].id, wasHelpful)
}
```

### 6. Manage Sessions
End sessions properly to generate summaries and start fresh.

```typescript
await memory.endSession()
await memory.startNewSession()
```

## TypeScript Types

All types are fully exported for type-safe development:

```typescript
import type {
  MemoryEntry,
  MemoryResult,
  MemoryStats,
  SessionMessage,
  FactEntry,
  PatternEntry,
  ContextSnapshot,
  MemorySystemConfig,
  LearningConfig,
  MemoryAdapter,
  EmbeddingProvider
} from './memory'
```

## Test Coverage

The memory module has comprehensive test coverage:

- 315 tests passing
- All components tested: adapters, patterns, utilities
- Concurrent operation tests
- Error handling tests
- Event emission tests
- Export/import tests

Run tests with:
```bash
npx vitest run tests/unit/memory
```
