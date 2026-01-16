# Active Speaker Detection

Detect the current speaker in a call or conference.

## Overview

Use `useActiveSpeaker` to compute the active speaker and recent speaker history based on audio levels.

## Quick Start

```ts
import { useActiveSpeaker } from 'vuesip'

const { activeSpeaker, activeSpeakers, speakerHistory } = useActiveSpeaker(participants, {
  threshold: 0.15,
  debounceMs: 300,
  historySize: 10,
})
```

## Related

- [Conference Calls](/examples/conference)
- [API: useActiveSpeaker](/api/composables#useactivespeaker)
