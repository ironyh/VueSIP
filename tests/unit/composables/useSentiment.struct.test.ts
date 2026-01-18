import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSentiment } from '@/composables/useSentiment'

describe('useSentiment', () => {
  it('detects positive keywords and labels', async () => {
    const t = ref('this is excellent and wonderful')
    const s = useSentiment(t)
    await s.analyzeSentiment(t.value)
    expect(s.currentSentiment.value).toBeGreaterThan(0)
  })

  it('handles negation and intensifiers', async () => {
    const t = ref('not really good')
    const s = useSentiment(t)
    await s.analyzeSentiment(t.value)
    // Negation + intensifier should bring score near neutral or negative
    expect(s.currentSentiment.value).toBeLessThanOrEqual(0.1)
  })

  it('emits escalation when below threshold', async () => {
    const t = ref('this is terrible and the worst, absolutely awful')
    const s = useSentiment(t, { escalationThreshold: -0.2 })
    let alerted = false
    s.onEscalation(() => {
      alerted = true
    })
    await s.analyzeSentiment(t.value)
    expect(alerted).toBe(true)
  })
})
