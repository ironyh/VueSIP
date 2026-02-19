import { describe, bench } from 'vitest'
import { validateDtmfTone } from '../../../src/utils/validators'

describe('validateDtmfTone Performance', () => {
  bench('validate valid numeric tone', () => {
    validateDtmfTone('1')
  })

  bench('validate valid special tone', () => {
    validateDtmfTone('#')
  })

  bench('validate valid letter tone', () => {
    validateDtmfTone('A')
  })

  bench('validate invalid tone', () => {
    validateDtmfTone('X')
  })

  bench('validate empty tone', () => {
    validateDtmfTone('')
  })
})
