# Code Style and Patterns Guide

**Last Updated:** 2025-11-22
**Target Audience:** Contributors, Developers

Coding standards and patterns used in the VueSIP project.

---

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Conventions](#typescript-conventions)
3. [Vue 3 Patterns](#vue-3-patterns)
4. [Naming Conventions](#naming-conventions)
5. [Code Organization](#code-organization)
6. [Error Handling](#error-handling)
7. [Documentation](#documentation)
8. [Code Quality Tools](#code-quality-tools)

---

## Overview

VueSIP follows strict coding standards to ensure consistency, maintainability, and quality across the codebase.

**Core Principles:**
- **TypeScript First**: All code must be fully typed
- **Composition API**: Use Vue 3 Composition API patterns
- **Functional Style**: Prefer pure functions and immutability
- **Explicit Over Implicit**: Be clear and explicit in your code
- **DRY**: Don't repeat yourself, but avoid premature abstraction

---

## TypeScript Conventions

### Type Definitions

```typescript
// ✅ Good: Explicit types for function parameters and return values
function makeCall(target: string, options?: CallOptions): Promise<CallSession> {
  // Implementation
}

// ❌ Bad: No type annotations
function makeCall(target, options) {
  // Implementation
}
```

### Interface vs Type

```typescript
// ✅ Good: Use interfaces for object shapes
export interface CallSession {
  id: string
  state: CallState
  direction: CallDirection
}

// ✅ Good: Use type for unions, intersections, primitives
export type CallState = 'idle' | 'connecting' | 'active' | 'ended'
export type ExtendedSession = CallSession & { metadata: Record<string, unknown> }

// ❌ Bad: Using type for simple object shapes
export type CallSession = {
  id: string
  state: CallState
}
```

### Avoid `any`

```typescript
// ❌ Bad: Using any
function process(data: any) {
  return data.value
}

// ✅ Good: Use proper types
function process(data: Record<string, unknown>) {
  return data.value
}

// ✅ Better: Use generics
function process<T extends { value: unknown }>(data: T) {
  return data.value
}
```

### Null vs Undefined

```typescript
// ✅ Good: Use undefined for optional values
interface CallOptions {
  timeout?: number  // undefined when not provided
}

// ✅ Good: Use null for intentional absence
let activeCall: CallSession | null = null  // No call active
```

### Type Guards

```typescript
// ✅ Good: Implement type guards for runtime type checking
function isCallSession(value: unknown): value is CallSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'state' in value
  )
}

// Usage
if (isCallSession(data)) {
  console.log(data.id) // TypeScript knows data is CallSession
}
```

---

## Vue 3 Patterns

### Composition API

```typescript
// ✅ Good: Use Composition API with script setup
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSipClient } from '@/composables/useSipClient'

const count = ref(0)
const doubled = computed(() => count.value * 2)

onMounted(() => {
  console.log('Component mounted')
})
</script>

// ❌ Bad: Don't use Options API
<script lang="ts">
export default {
  data() {
    return { count: 0 }
  },
  computed: {
    doubled() {
      return this.count * 2
    }
  }
}
</script>
```

### Composable Patterns

```typescript
// ✅ Good: Composable naming and structure
export function useSipClient(config: SipClientConfig) {
  // State
  const isConnected = ref(false)
  const error = ref<Error | null>(null)

  // Computed
  const canMakeCall = computed(() => isConnected.value && !error.value)

  // Methods
  async function connect(): Promise<void> {
    try {
      // Connection logic
      isConnected.value = true
    } catch (e) {
      error.value = e as Error
      throw e
    }
  }

  // Cleanup
  onUnmounted(() => {
    // Cleanup logic
  })

  // Return public API
  return {
    // State
    isConnected: readonly(isConnected),
    error: readonly(error),

    // Computed
    canMakeCall,

    // Methods
    connect,
  }
}
```

### Reactive References

```typescript
// ✅ Good: Use ref for primitives and reactive for objects
const count = ref(0)
const user = reactive({ name: 'John', age: 30 })

// ✅ Good: Use readonly for exposing state
return {
  count: readonly(count),
  user: readonly(user),
}

// ❌ Bad: Exposing mutable state directly
return {
  count,  // Consumers can modify this
  user,   // Consumers can modify this
}
```

---

## Naming Conventions

### Files and Directories

```
✅ Good file naming:
- useSipClient.ts        (composables)
- CallSession.ts         (classes)
- sip.types.ts           (types)
- logger.ts              (utilities)
- configStore.ts         (stores)

❌ Bad file naming:
- sip-client.ts
- call_session.ts
- SipTypes.ts
```

### Variables and Functions

```typescript
// ✅ Good: Descriptive names with proper casing
const isConnected = ref(false)
const selectedAudioDevice = ref<MediaDevice | null>(null)

function makeOutboundCall(target: string): Promise<CallSession> {
  // Implementation
}

// ❌ Bad: Unclear or poorly cased names
const conn = ref(false)
const dev = ref(null)

function call(t: string) {
  // Implementation
}
```

### Constants

```typescript
// ✅ Good: UPPER_SNAKE_CASE for true constants
export const MAX_CALL_DURATION = 3600
export const DEFAULT_TIMEOUT = 30000
export const SIP_STATUS_OK = 200

// ✅ Good: Configuration objects
export const DEFAULT_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
} as const
```

### Boolean Variables

```typescript
// ✅ Good: Use is/has/can/should prefixes
const isConnected = ref(false)
const hasActiveCall = computed(() => calls.value.length > 0)
const canMakeCall = computed(() => isRegistered.value)
const shouldRetry = (attempts: number) => attempts < MAX_RETRIES

// ❌ Bad: Ambiguous boolean names
const connected = ref(false)
const active = computed(() => calls.value.length > 0)
```

---

## Code Organization

### File Structure

```typescript
/**
 * File header with module description
 */

// 1. Imports - grouped and ordered
import { ref, computed, onUnmounted } from 'vue'  // Framework imports
import type { CallSession } from '@/types'         // Type imports
import { logger } from '@/utils/logger'           // Utility imports

// 2. Constants
const MAX_RETRIES = 3
const TIMEOUT_MS = 5000

// 3. Types and interfaces (if not in separate file)
export interface UseSipClientOptions {
  autoConnect?: boolean
  timeout?: number
}

// 4. Main implementation
export function useSipClient(options: UseSipClientOptions) {
  // Implementation
}

// 5. Helper functions
function validateConfig(config: unknown): boolean {
  // Implementation
}
```

### Import Order

```typescript
// 1. Vue imports
import { ref, computed, watch } from 'vue'

// 2. External libraries
import JsSIP from 'jssip'

// 3. Types (with 'type' keyword)
import type { CallSession, SipConfig } from '@/types'

// 4. Internal modules (grouped by type)
import { SipClient } from '@/core/SipClient'
import { useSipClient } from '@/composables/useSipClient'
import { logger } from '@/utils/logger'
import { configStore } from '@/stores/configStore'
```

### Directory Structure

```
src/
├── composables/     # Vue composables
├── core/            # Core business logic classes
├── stores/          # Pinia stores
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── plugins/         # Vue plugins
└── index.ts         # Public API exports
```

---

## Error Handling

### Error Types

```typescript
// ✅ Good: Define custom error classes
export class SipConnectionError extends Error {
  constructor(message: string, public code?: number) {
    super(message)
    this.name = 'SipConnectionError'
  }
}

export class CallFailedError extends Error {
  constructor(message: string, public reason: string) {
    super(message)
    this.name = 'CallFailedError'
  }
}
```

### Try-Catch Patterns

```typescript
// ✅ Good: Specific error handling with logging
async function connect(): Promise<void> {
  try {
    await client.connect()
    logger.info('Connected successfully')
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Connection failed')
    logger.error('Connection failed', err)
    lastError.value = err
    throw err  // Re-throw after handling
  }
}

// ❌ Bad: Silent error swallowing
async function connect() {
  try {
    await client.connect()
  } catch (error) {
    // Error ignored
  }
}
```

### Error State Management

```typescript
// ✅ Good: Track errors in composables
export function useSipClient() {
  const lastError = ref<Error | null>(null)

  async function connect() {
    lastError.value = null  // Clear previous error
    try {
      await client.connect()
    } catch (error) {
      lastError.value = error as Error
      throw error
    }
  }

  return {
    lastError: readonly(lastError),
    connect,
  }
}
```

---

## Documentation

### JSDoc Comments

```typescript
/**
 * Makes an outbound SIP call to the specified target
 *
 * @param target - The SIP URI or phone number to call
 * @param options - Optional call configuration
 * @returns Promise that resolves to the active call session
 * @throws {CallFailedError} If the call setup fails
 *
 * @example
 * ```typescript
 * const session = await makeCall('sip:user@example.com')
 * console.log('Call established:', session.id)
 * ```
 */
export async function makeCall(
  target: string,
  options?: CallOptions
): Promise<CallSession> {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ Good: Explain why, not what
// Retry connection because network might be temporarily unavailable
if (retryAttempts < MAX_RETRIES) {
  await connect()
}

// ❌ Bad: Stating the obvious
// Increment retry attempts
retryAttempts++
```

### Module Documentation

```typescript
/**
 * SIP Call Session Management
 *
 * Provides composables for managing SIP call sessions including:
 * - Making outbound calls
 * - Receiving inbound calls
 * - Call state management
 * - DTMF tone sending
 *
 * @module composables/useCallSession
 */
```

---

## Code Quality Tools

### ESLint

```bash
# Run linter
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix
```

**Key Rules:**
- No unused variables
- Consistent quotes (single quotes)
- No console.log (use logger)
- Explicit return types for functions

### Prettier

```bash
# Format code
pnpm format
```

**Configuration:**
- 2 spaces for indentation
- Single quotes
- Trailing commas
- Semicolons required

### TypeScript Compiler

```bash
# Type check
pnpm typecheck
```

**Settings:**
- Strict mode enabled
- No implicit any
- Strict null checks
- No unused locals/parameters

### Commit Hooks

Pre-commit hooks run automatically:

1. **Lint staged files**: ESLint on changed files
2. **Format**: Prettier on changed files
3. **Type check**: TypeScript compilation

---

## Best Practices Summary

**DO:**
- ✅ Write fully typed TypeScript
- ✅ Use Composition API with `<script setup>`
- ✅ Export readonly state from composables
- ✅ Use descriptive variable and function names
- ✅ Handle errors explicitly with logging
- ✅ Write JSDoc comments for public APIs
- ✅ Keep functions small and focused
- ✅ Use const for values that don't change

**DON'T:**
- ❌ Use `any` type
- ❌ Use Options API
- ❌ Expose mutable state directly
- ❌ Use single-letter variable names
- ❌ Swallow errors silently
- ❌ Write functions longer than 50 lines
- ❌ Use `var` keyword
- ❌ Ignore linter warnings

---

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vue 3 Style Guide](https://vuejs.org/style-guide/)
- [Composition API Guide](https://vuejs.org/guide/extras/composition-api-faq.html)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Testing Guide](./testing.md)
- [Architecture Documentation](./architecture.md)

---

**Questions or Suggestions?**

Open a [GitHub Discussion](https://github.com/ironyh/VueSIP/discussions) to discuss code style improvements.
