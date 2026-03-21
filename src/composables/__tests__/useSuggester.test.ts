import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSuggester } from '../useSuggester'
import type { TriageQuestionBank } from '../useSuggester'

const mockQuestionBank: TriageQuestionBank = {
  bröstsmärta: [
    'Hur länge har smärtan pågått?',
    'Var exakt känns smärtan?',
    'Strålar smärtan någonstans?',
  ],
  hosta: ['Hur länge har du hostat?', 'Är hostan torr eller med slem?', 'Har du feber?'],
  andnöd: ['När uppstod andnöden?', 'Har du haft detta förut?'],
  buksmärta: ['Var i magen känns det?', 'Har du illamående eller kräkningar?'],
}

describe('useSuggester', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty suggestions', () => {
      const { suggestions, focusedIndex, selectedSuggestion } = useSuggester(mockQuestionBank)
      expect(suggestions.value).toEqual([])
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })
  })

  describe('updateText', () => {
    it('should return no suggestions for empty text', () => {
      const { suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('')
      expect(suggestions.value).toEqual([])
    })

    it('should match keyword and return questions', () => {
      const { suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('Jag har bröstsmärta sedan igår')
      expect(suggestions.value.length).toBeGreaterThan(0)
      expect(suggestions.value.some((s) => s.matchedKeyword === 'bröstsmärta')).toBe(true)
    })

    it('should return up to maxSuggestions limit', () => {
      const { suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta hosta andnöd buksmärta')
      expect(suggestions.value.length).toBeLessThanOrEqual(8)
    })

    it('should deduplicate questions with same text', () => {
      const bank: TriageQuestionBank = {
        smärta: ['Hur länge?', 'Var?', 'Hur länge?'], // duplicate
      }
      const { suggestions, updateText } = useSuggester(bank)
      updateText('smärta')
      const texts = suggestions.value.map((s) => s.text)
      const unique = new Set(texts)
      expect(texts.length).toBe(unique.size)
    })

    it('should score word-boundary matches higher', () => {
      const { suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta') // full word match
      const chestSuggestions = suggestions.value.filter((s) => s.matchedKeyword === 'bröstsmärta')
      expect(chestSuggestions.length).toBeGreaterThan(0)
      // Word boundary match should score >= 0.6
      chestSuggestions.forEach((s) => {
        expect(s.score).toBeGreaterThanOrEqual(0.6)
      })
    })

    it('should return empty for non-matching text', () => {
      const bank: TriageQuestionBank = {
        bröstsmärta: ['Fråga?'],
      }
      const { suggestions, updateText } = useSuggester(bank)
      updateText('helelt om intet') // no match
      expect(suggestions.value.length).toBe(0)
    })
  })

  describe('keyboard navigation', () => {
    it('should focus down from -1 to 0', () => {
      const { focusDown, suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      expect(suggestions.value.length).toBeGreaterThan(0)
      focusDown()
      expect(suggestions.value[0]).toBeDefined()
    })

    it('should focus up from 0 to last', () => {
      const { focusUp, suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      const len = suggestions.value.length
      expect(len).toBeGreaterThan(0)
      focusUp()
      expect(suggestions.value[len - 1]).toBeDefined()
    })

    it('should not crash on focus with empty suggestions', () => {
      const { focusUp, focusDown, updateText } = useSuggester(mockQuestionBank)
      updateText('')
      expect(() => focusUp()).not.toThrow()
      expect(() => focusDown()).not.toThrow()
    })

    it('should wrap around when focusing down past end', () => {
      const { focusDown, focusedIndex, suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      const len = suggestions.value.length
      expect(len).toBeGreaterThan(0)
      // Navigate to last item
      focusedIndex.value = len - 1
      focusDown()
      // Should wrap to 0
      expect(focusedIndex.value).toBe(0)
    })

    it('should wrap around when focusing up past start', () => {
      const { focusUp, focusedIndex, suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      expect(suggestions.value.length).toBeGreaterThan(0)
      focusedIndex.value = 0
      focusUp()
      // Should wrap to last index
      expect(focusedIndex.value).toBe(suggestions.value.length - 1)
    })
  })

  describe('pickFocused', () => {
    it('should return null when nothing is focused', () => {
      const { pickFocused, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      expect(pickFocused()).toBeNull()
    })

    it('should return focused suggestion when focused', () => {
      const { pickFocused, focusDown, suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      focusDown()
      const result = pickFocused()
      expect(result).toEqual(suggestions.value[0])
    })
  })

  describe('clear', () => {
    it('should reset all state', () => {
      const { clear, updateText, focusDown, suggestions } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      focusDown()
      clear()
      expect(suggestions.value).toEqual([])
      expect(suggestions.value.length).toBe(0)
    })
  })

  describe('dismiss', () => {
    it('should clear focused index and selected', () => {
      const { dismiss, focusedIndex, selectedSuggestion, updateText, focusDown } =
        useSuggester(mockQuestionBank)
      updateText('bröstsmärta')
      focusDown()
      expect(focusedIndex.value).toBe(0)
      dismiss()
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })
  })

  describe('alwaysInclude', () => {
    it('should include always-include questions regardless of text', () => {
      const { suggestions, updateText } = useSuggester(mockQuestionBank, {
        alwaysInclude: ['hosta'],
      })
      updateText('') // empty text
      expect(suggestions.value.length).toBeGreaterThan(0)
      expect(suggestions.value.some((s) => s.matchedKeyword === 'hosta')).toBe(true)
    })
  })

  describe('score ordering', () => {
    it('should sort suggestions by score descending', () => {
      const { suggestions, updateText } = useSuggester(mockQuestionBank)
      updateText('bröstsmärta och hosta och buksmärta')
      const scores = suggestions.value.map((s) => s.score)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i])
      }
    })
  })
})
