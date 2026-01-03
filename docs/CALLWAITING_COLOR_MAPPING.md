# CallWaitingDemo.vue Hex Color Mapping

**Date**: 2025-12-22
**Purpose**: Pre-migration color mapping for Week 3 Day 4
**Total Hex Colors**: 33 usages (19 unique colors)

---

## Color Usage Analysis

### Partially Migrated (Fallback Pattern)

**Status**: Already using CSS custom properties with hex fallbacks
**Action**: Remove hex fallbacks during migration

| Line | Current Code                                          | Recommended                                  |
| ---- | ----------------------------------------------------- | -------------------------------------------- |
| 591  | `color: var(--text-secondary, #666);`                 | `color: var(--text-secondary);`              |
| 638  | `color: var(--text-primary, #111827);`                | `color: var(--text-primary);`                |
| 648  | `background: var(--warning-bg, #fef3c7);`             | `background: var(--warning-bg);`             |
| 650  | `border: 1px solid var(--warning-border, #fcd34d);`   | `border: 1px solid var(--warning-border);`   |
| 654  | `color: var(--warning-text, #92400e);`                | `color: var(--warning-text);`                |
| 672  | `color: var(--text-primary, #111827);`                | `color: var(--text-primary);`                |
| 696  | `border: 1px solid var(--border-color, #d1d5db);`     | `border: 1px solid var(--border-color);`     |
| 718  | `background-color: var(--text-muted, #9ca3af);`       | `background-color: var(--text-muted);`       |
| 803  | `color: var(--info-text, #1e40af);`                   | `color: var(--info-text);`                   |
| 807  | `background: var(--warning-bg, #fef3c7);`             | `background: var(--warning-bg);`             |
| 808  | `color: var(--warning-text, #92400e);`                | `color: var(--warning-text);`                |
| 812  | `background: var(--success-bg, #d1fae5);`             | `background: var(--success-bg);`             |
| 813  | `color: var(--success-text, #065f46);`                | `color: var(--success-text);`                |
| 817  | `background: var(--warning-bg, #fef3c7);`             | `background: var(--warning-bg);`             |
| 818  | `color: var(--warning-text, #92400e);`                | `color: var(--warning-text);`                |
| 837  | `background: var(--success-bg, #d1fae5);`             | `background: var(--success-bg);`             |
| 838  | `color: var(--success-text, #065f46);`                | `color: var(--success-text);`                |
| 842  | `background: var(--warning-bg, #fef3c7);`             | `background: var(--warning-bg);`             |
| 843  | `color: var(--warning-text, #92400e);`                | `color: var(--warning-text);`                |
| 848  | `color: var(--info-text, #1e40af);`                   | `color: var(--info-text);`                   |
| 936  | `background-color: var(--text-muted-hover, #4b5563);` | `background-color: var(--text-muted-hover);` |
| 990  | `color: var(--text-primary, #374151);`                | `color: var(--text-primary);`                |
| 1006 | `color: var(--text-primary, #374151);`                | `color: var(--text-primary);`                |
| 1046 | `color: var(--text-primary, #111827);`                | `color: var(--text-primary);`                |
| 1051 | `color: var(--text-muted, #9ca3af);`                  | `color: var(--text-muted);`                  |

**Count**: 25 fallback patterns

---

## Standalone Hex Colors (Requires Mapping)

### Priority 1: High-Use Colors

#### Purple Theme Colors (Switch Button)

| Line | Current                      | Recommended                            | Rationale      |
| ---- | ---------------------------- | -------------------------------------- | -------------- |
| 908  | `background-color: #8b5cf6;` | `background-color: var(--purple-500);` | Primary purple |
| 912  | `background-color: #7c3aed;` | `background-color: var(--purple-600);` | Hover state    |

**Context**: `.switch-btn` and `.switch-btn:hover`

---

#### Info/Success Backgrounds

| Line | Current                  | Recommended                      | Rationale                   |
| ---- | ------------------------ | -------------------------------- | --------------------------- |
| 679  | `color: #1f2937;`        | `color: var(--text-primary);`    | Dark gray text              |
| 747  | `background: #ecfdf5;`   | `background: var(--green-50);`   | Success/active state        |
| 752  | `background: #fffbeb;`   | `background: var(--yellow-50);`  | Warning/held state          |
| 768  | `border-color: #60a5fa;` | `border-color: var(--blue-400);` | Focus border                |
| 802  | `background: #dbeafe;`   | `background: var(--blue-100);`   | Info background             |
| 847  | `background: #dbeafe;`   | `background: var(--blue-100);`   | Info background (duplicate) |

**Count**: 8 standalone hex colors

---

## Unique Color Breakdown

| Hex Color | Count | Current Usage              | Recommended Variable      | Category |
| --------- | ----- | -------------------------- | ------------------------- | -------- |
| `#fef3c7` | 4     | Warning bg (fallback)      | `var(--warning-bg)`       | Status   |
| `#92400e` | 4     | Warning text (fallback)    | `var(--warning-text)`     | Status   |
| `#111827` | 3     | Primary text (fallback)    | `var(--text-primary)`     | Text     |
| `#dbeafe` | 2     | Info bg (standalone)       | `var(--blue-100)`         | Status   |
| `#d1fae5` | 2     | Success bg (fallback)      | `var(--success-bg)`       | Status   |
| `#9ca3af` | 2     | Muted text (fallback)      | `var(--text-muted)`       | Text     |
| `#374151` | 2     | Primary text (fallback)    | `var(--text-primary)`     | Text     |
| `#1e40af` | 2     | Info text (fallback)       | `var(--info-text)`        | Status   |
| `#065f46` | 2     | Success text (fallback)    | `var(--success-text)`     | Status   |
| `#fffbeb` | 1     | Warning bg (standalone)    | `var(--yellow-50)`        | Status   |
| `#fcd34d` | 1     | Warning border (fallback)  | `var(--warning-border)`   | Status   |
| `#ecfdf5` | 1     | Success bg (standalone)    | `var(--green-50)`         | Status   |
| `#d1d5db` | 1     | Border (fallback)          | `var(--border-color)`     | Border   |
| `#8b5cf6` | 1     | Purple button (standalone) | `var(--purple-500)`       | Button   |
| `#7c3aed` | 1     | Purple hover (standalone)  | `var(--purple-600)`       | Button   |
| `#666`    | 1     | Secondary text (fallback)  | `var(--text-secondary)`   | Text     |
| `#60a5fa` | 1     | Blue border (standalone)   | `var(--blue-400)`         | Border   |
| `#4b5563` | 1     | Muted hover (fallback)     | `var(--text-muted-hover)` | Text     |
| `#1f2937` | 1     | Dark text (standalone)     | `var(--text-primary)`     | Text     |

---

## Migration Strategy

### Phase 1: Remove Fallbacks (Low Priority)

**Action**: Simple find-replace to remove hex fallbacks
**Impact**: 25 changes, minimal risk
**Example**: `var(--text-primary, #111827)` → `var(--text-primary)`

### Phase 2: Replace Standalone Colors (High Priority)

**Action**: Map 8 standalone hex colors to semantic CSS variables
**Impact**: 8 targeted replacements
**Focus**:

1. Purple switch buttons (#8b5cf6, #7c3aed)
2. State backgrounds (#ecfdf5, #fffbeb, #dbeafe)
3. Text and borders (#1f2937, #60a5fa)

---

## Semantic Mapping Reference

### Text Colors

- `#111827`, `#374151`, `#1f2937` → `var(--text-primary)`
- `#666` → `var(--text-secondary)`
- `#9ca3af` → `var(--text-muted)`
- `#4b5563` → `var(--text-muted-hover)`

### Status Colors

- **Success**: `#ecfdf5` → `var(--green-50)`, `#d1fae5` → `var(--success-bg)`, `#065f46` → `var(--success-text)`
- **Warning**: `#fffbeb` → `var(--yellow-50)`, `#fef3c7` → `var(--warning-bg)`, `#92400e` → `var(--warning-text)`, `#fcd34d` → `var(--warning-border)`
- **Info**: `#dbeafe` → `var(--blue-100)`, `#1e40af` → `var(--info-text)`

### Component Colors

- **Borders**: `#d1d5db` → `var(--border-color)`, `#60a5fa` → `var(--blue-400)`
- **Buttons**: `#8b5cf6` → `var(--purple-500)`, `#7c3aed` → `var(--purple-600)`

---

## Complexity Assessment

**Original Estimate**: 32 hex colors requiring semantic mapping

**Actual Breakdown**:

- **25 fallback patterns** (low effort - simple removal)
- **8 standalone colors** (medium effort - semantic mapping)
- **19 unique colors** to understand

**Revised Effort**:

- Fallback removal: ~15 minutes (batch find-replace)
- Standalone mapping: ~30 minutes (careful semantic selection)
- **Total: 45 minutes** (vs 60+ estimated)

---

## Quality Checks

### Validation Checklist

- [ ] All 33 hex color usages replaced
- [ ] Semantic variables match theme intent
- [ ] Light/dark theme compatibility verified
- [ ] No hardcoded hex colors remain
- [ ] Focus states use appropriate blue variants
- [ ] Status colors consistent (success/warning/info)

### Testing Focus

- Light theme appearance
- Dark theme appearance
- Call state indicators (active, held, ringing)
- Switch button hover states
- Focus border visibility

---

**Document Version**: 1.0
**Status**: Color mapping complete
**Next Action**: Pre-map 70 hex colors in ToolbarLayoutsDemo.vue
**Estimated Migration Time**: 45 minutes (reduced from 60+ min)
