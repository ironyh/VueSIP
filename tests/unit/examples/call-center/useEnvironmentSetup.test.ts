import { describe, expect, it } from 'vitest'

import { useEnvironmentSetup } from '../../../../examples/call-center/src/features/setup/useEnvironmentSetup'

describe('useEnvironmentSetup', () => {
  it('defaults to demo mode and validates a minimal custom config', () => {
    const setup = useEnvironmentSetup()

    expect(setup.selectedPreset.value).toBe('demo')

    setup.form.server = 'pbx.example.com'
    setup.form.username = '1001'
    setup.form.password = 'secret'
    setup.form.displayName = 'Agent Example'

    const validation = setup.validateCurrentConfig()

    expect(validation.valid).toBe(true)
    expect(setup.toSipConfig()).toMatchObject({
      uri: 'wss://pbx.example.com',
      sipUri: 'sip:1001@pbx.example.com',
      displayName: 'Agent Example',
    })
  })
})
