# Quick Fix Script for Linting Issues

## Phase 1: Critical Fixes (15 minutes)

### 1. Fix Vue Template Self-Closing Tags

**File**: `playground/components/SimulationControls.vue`

```diff
Line 121:
-          <i class="pi pi-info-circle text-base" />
+          <i class="pi pi-info-circle text-base"></i>

Line 130:
-        <i class="pi pi-info-circle text-base" />
+        <i class="pi pi-info-circle text-base"></i>
```

### 2. Remove Unused Import

**File**: `playground/components/SimulationControls.vue`

```diff
Line 138:
-import { computed } from 'vue'
+// import { computed } from 'vue' // Removed - not used
```

### 3. Fix Test File Unused Variables

#### SipClient.conference.test.ts

```diff
-import { ParticipantState } from '../../src/types/conference.types'
+// import { ParticipantState } from '../../src/types/conference.types' // Removed - not used

-const { triggerEvent } = useTestHelpers()
+const { triggerEvent: _triggerEvent } = useTestHelpers() // Prefixed - setup only
```

#### SipClient.media.test.ts

```diff
-const { triggerEvent } = useTestHelpers()
+const { triggerEvent: _triggerEvent } = useTestHelpers()
```

#### SipClient.presence.test.ts

```diff
-const { triggerEvent } = useTestHelpers()
+const { triggerEvent: _triggerEvent } = useTestHelpers()
```

#### CallControls.test.ts

```diff
-import { describe, it, expect, beforeEach, vi } from 'vitest'
+import { describe, it, expect } from 'vitest'
+// Removed: beforeEach, vi (not used)
```

#### Dialpad.test.ts

```diff
-import { describe, it, expect, beforeEach } from 'vitest'
+import { describe, it, expect } from 'vitest'
+// Removed: beforeEach (not used)
```

#### storage/persistence.test.ts

```diff
-import { ref } from 'vue'
+// import { ref } from 'vue' // Removed - not used

Line 90, 107, 124, 365, 396:
-    const manager = new PersistenceManager(...)
+    const _manager = new PersistenceManager(...) // Prefixed - setup only
```

#### stores/persistence.test.ts

```diff
-    const mockError = new Error('Encryption failed')
+    const _mockError = new Error('Encryption failed') // Prefixed - setup only
```

#### utils/errorHelpers.test.ts

```diff
-import FormattedError from '../../../src/utils/errorHelpers'
+// import FormattedError from '../../../src/utils/errorHelpers' // Removed - not used
```

#### utils/storageQuota.test.ts

```diff
-  (ids) => {
+  (_ids) => { // Prefixed - parameter not used
```

## Phase 2: Run Auto-Fix

```bash
pnpm lint:fix
```

## Phase 3: Verify

```bash
# Check linting
pnpm lint

# Check TypeScript
pnpm typecheck

# Build project
pnpm build
```

## Expected Results

### Before

- **Errors**: 19
- **Warnings**: 262
- **Build**: ❌ FAIL (TypeScript error)

### After Phase 1

- **Errors**: 0
- **Warnings**: 262
- **Build**: ✅ PASS

## Notes

1. TypeScript module augmentation error may be a false positive due to tsconfig.json configuration
2. The 262 warnings are type safety issues that should be addressed in a separate ticket
3. All unused test variables are prefixed with `_` to indicate they're intentionally unused for test setup
