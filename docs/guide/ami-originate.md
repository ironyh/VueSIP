# AMI Originate

Originates calls via Asterisk AMI for click-to-call and outbound flows.

## Usage

```ts
import { ref, computed } from 'vue'
import { useAmi, useAmiOriginate } from 'vuesip'

const ami = useAmi()
const { originate, progress, cancel } = useAmiOriginate(computed(() => ami.getClient()), {
  defaultContext: 'from-internal',
  defaultTimeout: 30,
})

await originate({
  channel: 'PJSIP/1001',
  exten: '5551234',
  context: 'from-internal',
  callerIdName: 'Sales',
  callerIdNum: '1001',
  variables: { X_CUST_ID: 'abc123' },
})

// progress.value.state: 'initiating' | 'ringing' | 'answered' | 'busy' | 'failed' | 'completed'
```

## Options
- `defaultContext`: default dialplan context.
- `defaultTimeout`: seconds.
- `onOriginateStart`, `onOriginateComplete`, `onProgressChange`: lifecycle hooks.
- `formatCallerId(name, num)`: custom caller ID string builder.

## Tips
- Either set `application`/`data` or `exten`+`context`.
- `variables` are joined as `k=v` and sent via AMI `Variable`.
- `async` true (default) returns immediately; use events for progress.

