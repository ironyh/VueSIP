# Keyboard Shortcuts

VueSip Settings Manager provides powerful keyboard shortcuts for efficient navigation and control.

## Global Shortcuts

### Settings Management

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl/Cmd + ,` | Open Settings | Open the settings panel |
| `Ctrl/Cmd + S` | Save Settings | Save current settings (when panel is open) |
| `Ctrl/Cmd + E` | Export Settings | Export settings to JSON file |
| `Ctrl/Cmd + I` | Import Settings | Import settings from JSON file |
| `Ctrl/Cmd + R` | Reset Settings | Reset all settings to defaults (with confirmation) |
| `Esc` | Close Settings | Close settings panel |

### Navigation

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Tab` | Next Tab | Navigate to next settings tab |
| `Shift + Tab` | Previous Tab | Navigate to previous settings tab |
| `1-5` | Direct Tab Access | Jump directly to tab (when settings open) |
| `Ctrl/Cmd + F` | Search Settings | Focus search box to find settings |

### Audio Controls (When in Audio Tab)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `M` | Toggle Mic Mute | Mute/unmute microphone |
| `S` | Toggle Speaker | Mute/unmute speaker |
| `↑` | Volume Up | Increase selected device volume by 10% |
| `↓` | Volume Down | Decrease selected device volume by 10% |
| `0` | Reset Volume | Reset volume to 100% |

## Tab-Specific Shortcuts

### Audio Settings Tab (Tab 1)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt + I` | Select Input | Focus input device selector |
| `Alt + O` | Select Output | Focus output device selector |
| `Alt + R` | Select Ringtone | Focus ringtone device selector |
| `E` | Toggle Echo Cancellation | Enable/disable echo cancellation |
| `N` | Toggle Noise Suppression | Enable/disable noise suppression |
| `G` | Toggle Auto Gain | Enable/disable automatic gain control |

### Notifications Tab (Tab 2)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt + N` | Toggle Notifications | Enable/disable all notifications |
| `Alt + S` | Toggle Sound | Toggle notification sound |
| `Alt + D` | Toggle Desktop | Toggle desktop notifications |
| `Q` | Toggle Quiet Hours | Enable/disable quiet hours |

### Call Settings Tab (Tab 3)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt + A` | Toggle Auto-Answer | Enable/disable auto-answer |
| `Alt + W` | Toggle Call Waiting | Enable/disable call waiting |
| `Alt + D` | Toggle DND | Enable/disable Do Not Disturb |
| `F` | Toggle Forwarding | Enable/disable call forwarding |

### Display Settings Tab (Tab 4)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt + L` | Cycle Theme | Cycle through light/dark/system themes |
| `Alt + C` | Toggle Compact Mode | Toggle compact display mode |
| `Alt + A` | Toggle Animations | Enable/disable animations |

## Custom Shortcuts

You can register custom keyboard shortcuts in your application:

```typescript
import { useSettings } from 'vuesip'

const settings = useSettings()

// Register custom shortcut
settings.registerShortcut({
  key: 'Ctrl+Shift+D',
  action: () => {
    settings.set('display.theme', 'dark')
  },
  description: 'Switch to dark theme'
})

// Register shortcut with condition
settings.registerShortcut({
  key: 'Alt+M',
  action: () => {
    const currentVolume = settings.get('audio.inputVolume')
    settings.set('audio.inputVolume', currentVolume === 0 ? 0.8 : 0)
  },
  condition: () => settings.isOpen && settings.activeTab === 'audio',
  description: 'Toggle microphone mute'
})
```

## Shortcut Configuration

### Enable/Disable Shortcuts

```typescript
const settings = useSettings({
  shortcuts: {
    enabled: true, // Enable keyboard shortcuts
    preventDefault: true, // Prevent default browser actions
    allowInInputs: false, // Don't trigger in input fields
  }
})
```

### Customize Shortcuts

```typescript
const settings = useSettings({
  shortcuts: {
    custom: {
      saveSettings: 'Ctrl+S', // Default
      exportSettings: 'Ctrl+Shift+E', // Custom
      openSettings: 'Alt+,', // Custom
    }
  }
})
```

## Accessibility

### Screen Reader Support

All keyboard shortcuts are announced to screen readers:

```typescript
// Shortcuts are announced with ARIA live regions
// Example: "Settings saved successfully"
```

### Keyboard-Only Navigation

Complete settings management is possible using only keyboard:

1. **Open Settings**: `Ctrl/Cmd + ,`
2. **Navigate Tabs**: `Tab` or `1-5` keys
3. **Navigate Fields**: `Tab` / `Shift+Tab`
4. **Activate Toggles**: `Space`
5. **Select from Dropdown**: `↑` / `↓` + `Enter`
6. **Save**: `Ctrl/Cmd + S`
7. **Close**: `Esc`

## Shortcut Conflicts

### Preventing Browser Shortcuts

Some shortcuts may conflict with browser defaults:

```typescript
const settings = useSettings({
  shortcuts: {
    // Prevent specific browser shortcuts
    preventDefaults: [
      'Ctrl+S', // Prevent browser save
      'Ctrl+P', // Prevent browser print
      'Ctrl+F', // Prevent browser find
    ]
  }
})
```

### Context-Aware Shortcuts

Shortcuts only work when appropriate:

```typescript
// Example: Volume shortcuts only work when audio tab is active
if (activeTab === 'audio') {
  registerShortcut('↑', () => increaseVolume())
}
```

## Mobile Shortcuts

### Touch Gestures

On mobile devices, keyboard shortcuts are replaced with gestures:

| Gesture | Action | Description |
|---------|--------|-------------|
| **Swipe Left** | Next Tab | Navigate to next tab |
| **Swipe Right** | Previous Tab | Navigate to previous tab |
| **Long Press** | Context Menu | Show additional options |
| **Pull Down** | Refresh Devices | Refresh audio device list |

### External Keyboards

When using external keyboards on mobile:

- All desktop shortcuts are available
- Shortcuts are automatically adapted for mobile browsers
- No modifier keys required for single-key shortcuts

## Developer Tools

### Debug Mode

Enable shortcut debugging:

```typescript
const settings = useSettings({
  shortcuts: {
    debug: true // Log all shortcut activations
  }
})

// Console output:
// [Shortcuts] Triggered: Ctrl+S (Save Settings)
// [Shortcuts] Prevented default for: Ctrl+S
```

### List All Shortcuts

Get all registered shortcuts programmatically:

```typescript
const shortcuts = settings.getShortcuts()

shortcuts.forEach(shortcut => {
  console.log(`${shortcut.key}: ${shortcut.description}`)
})
```

## Best Practices

### 1. **Use Standard Conventions**

Follow platform conventions:
- `Ctrl` on Windows/Linux
- `Cmd` on macOS
- Use `Ctrl/Cmd` for cross-platform

### 2. **Provide Visual Hints**

Show shortcuts in UI tooltips:

```vue
<template>
  <button title="Save (Ctrl+S)" @click="save">
    Save
  </button>
</template>
```

### 3. **Document Custom Shortcuts**

Always document custom shortcuts:

```typescript
// Good: Documented custom shortcut
settings.registerShortcut({
  key: 'Alt+X',
  action: () => doSomething(),
  description: 'Execute custom action'
})
```

### 4. **Test Across Platforms**

Shortcuts may behave differently across:
- Operating systems (Windows, macOS, Linux)
- Browsers (Chrome, Firefox, Safari)
- Keyboard layouts (QWERTY, AZERTY, etc.)

### 5. **Avoid Conflicts**

Check for conflicts with:
- Browser shortcuts
- Operating system shortcuts
- Other application shortcuts

## Examples

### Complete Shortcut Integration

```vue
<template>
  <div class="settings-panel">
    <div class="shortcuts-help">
      <button @click="showShortcuts = !showShortcuts">
        ⌨️ Keyboard Shortcuts
      </button>

      <div v-if="showShortcuts" class="shortcuts-modal">
        <h3>Available Shortcuts</h3>
        <table>
          <tr v-for="shortcut in shortcuts" :key="shortcut.key">
            <td class="key">{{ shortcut.key }}</td>
            <td>{{ shortcut.description }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettings } from 'vuesip'

const settings = useSettings({
  shortcuts: {
    enabled: true,
    custom: {
      save: 'Ctrl+S',
      export: 'Ctrl+E',
      import: 'Ctrl+I',
    }
  }
})

const showShortcuts = ref(false)
const shortcuts = ref([])

onMounted(() => {
  shortcuts.value = settings.getShortcuts()

  // Listen for shortcut help request
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && e.shiftKey) {
      showShortcuts.value = true
    }
  })
})
</script>
```

## Platform-Specific Notes

### Windows/Linux

- Use `Ctrl` as primary modifier
- `Alt` for secondary actions
- Function keys (F1-F12) work well

### macOS

- Use `Cmd` instead of `Ctrl`
- `Option` instead of `Alt`
- Avoid `Cmd+Q` (quit app)

### Web Browsers

- Avoid browser-reserved shortcuts
- Test in incognito/private mode
- Consider PWA constraints

## Future Enhancements

Planned features for future releases:

- [ ] Shortcut customization UI
- [ ] Chord shortcuts (multi-key sequences)
- [ ] Global app-level shortcuts
- [ ] Shortcut profiles/presets
- [ ] Import/export shortcut configurations
- [ ] Voice commands integration

## See Also

- [Settings Manager Guide](./guide/settings-manager.md)
- [Migration Guide](./settings-migration-guide.md)
- [API Documentation](./api/settings-manager.md)
- [Accessibility Guide](./guide/accessibility.md)
