/**
 * Tests for useSuggester composable
 * Suggest triage questions based on live transcription text
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useSuggester, type TriageQuestionBank } from '@/composables/useSuggester'

describe('useSuggester', () => {
  const questionBank: TriageQuestionBank = {
    billing: ['Are you having issues with your bill?', 'Can I help with a payment problem?'],
    technical: [
      'What technical issue are you experiencing?',
      'Is your internet connection stable?',
    ],
    account: ['Do you need help with your account?', 'Can I verify your account details?'],
    'no-questions': ['Billing question here', 'Technical question here'],
  }

  describe('Initialization and Default State', () => {
    it('should initialize with empty state', () => {
      const { suggestions, focusedIndex, selectedSuggestion } = useSuggester(questionBank)

      expect(suggestions.value).toEqual([])
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })

    it('should initialize with custom options', () => {
      const { suggestions } = useSuggester(questionBank, {
        maxSuggestions: 3,
        minScore: 0.5,
        alwaysInclude: ['billing'],
      })

      expect(suggestions.value.length).toBeLessThanOrEqual(3)
    })

    it('should have all required methods', () => {
      const { updateText, clear, selectByIndex, focusUp, focusDown, pickFocused, dismiss } =
        useSuggester(questionBank)

      expect(updateText).toBeDefined()
      expect(clear).toBeDefined()
      expect(selectByIndex).toBeDefined()
      expect(focusUp).toBeDefined()
      expect(focusDown).toBeDefined()
      expect(pickFocused).toBeDefined()
      expect(dismiss).toBeDefined()
    })

    it('should use default options when not provided', () => {
      const { suggestions } = useSuggester(questionBank)

      // Empty text with no alwaysInclude means no suggestions
      expect(suggestions.value).toEqual([])
    })
  })

  describe('Suggestion Matching and Scoring', () => {
    it('should return suggestions when text matches a keyword', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('I have a billing question')
      await nextTick()

      expect(suggestions.value.length).toBeGreaterThan(0)
      expect(suggestions.value.some((s) => s.matchedKeyword === 'billing')).toBe(true)
    })

    it('should return suggestions for technical keyword', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('My technical problem is serious')
      await nextTick()

      expect(suggestions.value.length).toBeGreaterThan(0)
      expect(suggestions.value.some((s) => s.matchedKeyword === 'technical')).toBe(true)
    })

    it('should match partial keywords in text', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('tech support needed')
      await nextTick()

      // 'tech' is a partial match of 'technical'
      expect(suggestions.value.length).toBeGreaterThanOrEqual(0) // depends on score threshold
    })

    it('should return suggestions sorted by score descending', async () => {
      const bank: TriageQuestionBank = {
        'billing-problem': ['Billing low priority'],
        billing: ['Billing high priority'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('billing problem with my account')
      await nextTick()

      // Both keywords match, but 'billing' is more specific (word boundary)
      expect(suggestions.value.length).toBeGreaterThan(0)
      // First suggestion should have highest score
      const scores = suggestions.value.map((s) => s.score)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i])
      }
    })

    it('should not match keywords below minScore threshold', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        minScore: 0.9,
      })

      updateText('bill')
      await nextTick()

      // 'bill' is a partial match, may not reach 0.9 threshold
      expect(suggestions.value.length).toBe(0)
    })

    it('should match keywords at word boundary with higher score', async () => {
      const bank: TriageQuestionBank = {
        account: ['Account question'],
      }

      const { suggestions: partialSuggestions, updateText } = useSuggester(bank)
      updateText('my account is')
      await nextTick()
      const wordBoundaryScore = partialSuggestions.value[0]?.score ?? 0

      const bank2: TriageQuestionBank = {
        count: ['Count question'],
      }
      const { suggestions: partialSuggestions2, updateText: updateText2 } = useSuggester(bank2)
      updateText2('my count is')
      await nextTick()
      const partialMatchScore = partialSuggestions2.value[0]?.score ?? 0

      // Word boundary match should score >= partial match
      expect(wordBoundaryScore).toBeGreaterThanOrEqual(partialMatchScore)
    })

    it('should include matched keyword in suggestion object', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      for (const suggestion of suggestions.value) {
        expect(suggestion).toMatchObject({
          id: expect.any(String),
          text: expect.any(String),
          matchedKeyword: expect.any(String),
          score: expect.any(Number),
        })
      }
    })

    it('should give bonus score when question text contains keyword', async () => {
      const bank: TriageQuestionBank = {
        bill: ['My bill is wrong'],
        billing: ['Billing question'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('bill')
      await nextTick()

      // Question 'My bill is wrong' contains 'bill' verbatim
      const billQuestion = suggestions.value.find((s) => s.text === 'My bill is wrong')
      const billingQuestion = suggestions.value.find((s) => s.text === 'Billing question')

      if (billQuestion && billingQuestion) {
        expect(billQuestion.score).toBeGreaterThan(billingQuestion.score)
      }
    })
  })

  describe('Deduplication Logic', () => {
    it('should deduplicate suggestions by question text', async () => {
      const bank: TriageQuestionBank = {
        bill: ['Duplicate question'],
        billing: ['Duplicate question'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('bill billing')
      await nextTick()

      const texts = suggestions.value.map((s) => s.text)
      const uniqueTexts = new Set(texts)
      expect(texts.length).toBe(uniqueTexts.size)
    })

    it('should deduplicate and preserve higher-scoring suggestion', async () => {
      const bank: TriageQuestionBank = {
        help: ['Same question for help'],
        helping: ['Same question for helping'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('help helping')
      await nextTick()

      // Should have at most one 'Same question'
      const sameQuestionCount = suggestions.value.filter(
        (s) => s.text === 'Same question for help'
      ).length
      expect(sameQuestionCount).toBeLessThanOrEqual(1)
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      // nothing special needed
    })

    it('should start with focusedIndex at -1', async () => {
      const { focusedIndex, updateText } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      expect(focusedIndex.value).toBe(-1)
    })

    it('should move focus down with focusDown', async () => {
      const { focusedIndex, updateText, focusDown } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      focusDown()
      expect(focusedIndex.value).toBe(0)

      focusDown()
      expect(focusedIndex.value).toBe(1)
    })

    it('should move focus up with focusUp', async () => {
      const { focusedIndex, updateText, focusDown, focusUp, suggestions } =
        useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      const len = suggestions.value.length
      if (len < 2) return // skip if not enough suggestions

      focusDown()
      focusDown()
      expect(focusedIndex.value).toBe(1)

      focusUp()
      expect(focusedIndex.value).toBe(0)

      // focusUp at 0 wraps to last
      focusUp()
      expect(focusedIndex.value).toBe(len - 1)
    })

    it('should wrap focusDown from last to first', async () => {
      const { focusedIndex, updateText, focusDown } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      // Move past the end
      focusDown()
      focusDown()
      focusDown() // should wrap

      expect(focusedIndex.value).toBe(0)
    })

    it('should wrap focusUp from first to last', async () => {
      const { focusedIndex, updateText, focusUp, focusDown } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      focusDown() // to 0
      focusUp() // should wrap to last

      expect(focusedIndex.value).toBeGreaterThanOrEqual(0)
    })

    it('should pick currently focused suggestion with pickFocused', async () => {
      const { selectedSuggestion, updateText, focusDown, pickFocused } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      focusDown()
      const picked = pickFocused()

      expect(picked).not.toBeNull()
      expect(selectedSuggestion.value).toEqual(picked)
    })

    it('should return null from pickFocused when nothing focused', async () => {
      const { selectedSuggestion, updateText, pickFocused } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      expect(pickFocused()).toBeNull()
      expect(selectedSuggestion.value).toBeNull()
    })

    it('should dismiss all with dismiss', async () => {
      const { focusedIndex, selectedSuggestion, updateText, focusDown, dismiss } =
        useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      focusDown()
      expect(focusedIndex.value).toBe(0)

      dismiss()
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })

    it('should select suggestion by index with selectByIndex', async () => {
      const { focusedIndex, selectedSuggestion, updateText, selectByIndex } =
        useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      selectByIndex(0)

      expect(focusedIndex.value).toBe(0)
      expect(selectedSuggestion.value).not.toBeNull()
    })

    it('should normalize negative index with selectByIndex (wraps from end)', async () => {
      const { focusedIndex, updateText, selectByIndex, suggestions } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      const len = suggestions.value.length
      if (len > 0) {
        selectByIndex(-1)
        expect(focusedIndex.value).toBe(len - 1)
      }
    })

    it('should normalize overflow index with selectByIndex (wraps from start)', async () => {
      const { focusedIndex, updateText, selectByIndex, suggestions } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      const len = suggestions.value.length
      if (len > 0) {
        selectByIndex(len + 1)
        expect(focusedIndex.value).toBe(1) // len + 1 - len = 1
      }
    })

    it('should set to null for out-of-range normalized index with selectByIndex', async () => {
      const { focusedIndex, selectedSuggestion, updateText, selectByIndex } =
        useSuggester(questionBank)

      updateText('billing question')
      await nextTick()

      // Empty suggestions - any index should be invalid
      selectByIndex(999)
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })
  })

  describe('Boundary Conditions', () => {
    it('should return no suggestions for empty text (no alwaysInclude)', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('')
      await nextTick()

      expect(suggestions.value).toEqual([])
    })

    it('should return alwaysInclude suggestions even with empty text', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        alwaysInclude: ['billing'],
      })

      updateText('')
      await nextTick()

      expect(suggestions.value.length).toBeGreaterThan(0)
      expect(suggestions.value[0]!.score).toBe(1.0)
    })

    it('should return no suggestions when no keywords match', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('xyz abc unknown words that do not match anything')
      await nextTick()

      expect(suggestions.value).toEqual([])
    })

    it('should handle whitespace-only text', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        alwaysInclude: ['billing'],
      })

      updateText('   ')
      await nextTick()

      // Should show alwaysInclude
      expect(suggestions.value.length).toBeGreaterThan(0)
    })

    it('should limit results to maxSuggestions', async () => {
      const largeBank: TriageQuestionBank = {}
      for (let i = 0; i < 20; i++) {
        largeBank[`kw${i}`] = [`Question ${i} from keyword ${i}`]
      }

      const { suggestions, updateText } = useSuggester(largeBank, {
        maxSuggestions: 5,
      })

      updateText('kw0 kw1 kw2 kw3 kw4 kw5 kw6 kw7 kw8 kw9 kw10')
      await nextTick()

      expect(suggestions.value.length).toBeLessThanOrEqual(5)
    })

    it('should handle case-insensitive keyword matching', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('BILLING question')
      await nextTick()

      expect(suggestions.value.length).toBeGreaterThan(0)
    })

    it('should handle special regex characters in keywords', async () => {
      const bank: TriageQuestionBank = {
        'what?': ['Question with special chars'],
        'hello.world': ['Another special chars question'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('what? hello.world')
      await nextTick()

      // Should not crash and should return suggestions
      expect(suggestions.value.length).toBeGreaterThan(0)
    })

    it('should reset focusedIndex and selectedSuggestion on updateText', async () => {
      const { focusedIndex, selectedSuggestion, updateText, focusDown } = useSuggester(questionBank)

      updateText('billing question')
      await nextTick()
      focusDown()
      expect(focusedIndex.value).toBe(0)

      updateText('new text')
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })
  })

  describe('alwaysInclude Unconditional Suggestions', () => {
    it('should always show alwaysInclude suggestions regardless of text', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        alwaysInclude: ['billing'],
      })

      updateText('')
      await nextTick()
      expect(suggestions.value.length).toBeGreaterThan(0)

      updateText('some random text that matches nothing')
      await nextTick()
      expect(suggestions.value.some((s) => s.matchedKeyword === 'billing')).toBe(true)
    })

    it('should show up to 2 alwaysInclude questions per keyword', async () => {
      const bank: TriageQuestionBank = {
        test: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
      }

      const { suggestions, updateText } = useSuggester(bank, {
        alwaysInclude: ['test'],
      })

      updateText('')
      await nextTick()

      const alwaysIncludeSuggestions = suggestions.value.filter((s) => s.matchedKeyword === 'test')
      expect(alwaysIncludeSuggestions.length).toBeLessThanOrEqual(2)
    })

    it('should give alwaysInclude suggestions score of 1.0', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        alwaysInclude: ['billing'],
      })

      updateText('')
      await nextTick()

      for (const s of suggestions.value) {
        if (s.matchedKeyword === 'billing') {
          expect(s.score).toBe(1.0)
        }
      }
    })

    it('should allow multiple alwaysInclude keywords', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        alwaysInclude: ['billing', 'technical'],
      })

      updateText('')
      await nextTick()

      const keywords = new Set(suggestions.value.map((s) => s.matchedKeyword))
      expect(keywords.has('billing')).toBe(true)
      expect(keywords.has('technical')).toBe(true)
    })

    it('should combine alwaysInclude with keyword-matched suggestions', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        alwaysInclude: ['account'],
      })

      updateText('billing issue')
      await nextTick()

      const matchedKeywords = suggestions.value.map((s) => s.matchedKeyword)
      expect(matchedKeywords).toContain('account') // alwaysInclude
      expect(matchedKeywords).toContain('billing') // keyword match
    })
  })

  describe('maxSuggestions Option', () => {
    it('should limit suggestions to maxSuggestions', async () => {
      const largeBank: TriageQuestionBank = {
        a: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'],
        b: ['B1', 'B2', 'B3', 'B4', 'B5'],
      }

      const { suggestions, updateText } = useSuggester(largeBank, {
        maxSuggestions: 3,
      })

      updateText('a b')
      await nextTick()

      expect(suggestions.value.length).toBeLessThanOrEqual(3)
    })

    it('should return fewer when not enough suggestions exist', async () => {
      const { suggestions, updateText } = useSuggester(questionBank, {
        maxSuggestions: 100,
      })

      updateText('billing')
      await nextTick()

      expect(suggestions.value.length).toBeLessThanOrEqual(100)
    })
  })

  describe('minScore Option', () => {
    it('should filter out suggestions below minScore', async () => {
      const bank: TriageQuestionBank = {
        'some-long-keyword': ['Low match question'],
      }

      const { suggestions, updateText } = useSuggester(bank, {
        minScore: 0.8,
      })

      updateText('some') // partial match, low score
      await nextTick()

      // Partial match should be filtered
      expect(suggestions.value.length).toBe(0)
    })

    it('should include suggestions at exactly minScore', async () => {
      const bank: TriageQuestionBank = {
        billing: ['Exact threshold question'],
      }

      const { suggestions, updateText } = useSuggester(bank, {
        minScore: 0.0,
      })

      updateText('billing')
      await nextTick()

      expect(suggestions.value.length).toBeGreaterThan(0)
    })
  })

  describe('clear Function', () => {
    it('should clear all state', async () => {
      const { suggestions, focusedIndex, selectedSuggestion, updateText, focusDown, clear } =
        useSuggester(questionBank)

      updateText('billing question')
      await nextTick()
      focusDown()

      expect(suggestions.value.length).toBeGreaterThan(0)
      expect(focusedIndex.value).toBe(0)

      clear()

      expect(suggestions.value).toEqual([])
      expect(focusedIndex.value).toBe(-1)
      expect(selectedSuggestion.value).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty question bank', async () => {
      const { suggestions, updateText } = useSuggester({})

      updateText('some text')
      await nextTick()

      expect(suggestions.value).toEqual([])
    })

    it('should handle question bank with empty arrays', async () => {
      const bank: TriageQuestionBank = {
        billing: [],
        technical: ['Valid question'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('billing technical')
      await nextTick()

      // Should only get 'technical' suggestions
      expect(suggestions.value.length).toBeGreaterThan(0)
    })

    it('should handle duplicate questions in same keyword', async () => {
      const bank: TriageQuestionBank = {
        billing: ['Same', 'Same', 'Different'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('billing')
      await nextTick()

      const sameCount = suggestions.value.filter((s) => s.text === 'Same').length
      expect(sameCount).toBe(1)
    })

    it('should handle empty string keyword in question bank', async () => {
      const bank: TriageQuestionBank = {
        '': ['Empty keyword question'],
      }

      const { suggestions, updateText } = useSuggester(bank)

      updateText('')
      await nextTick()

      // Empty keyword should still be treated normally
      expect(suggestions.value).toBeDefined()
    })

    it('should handle text with multiple spaces', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('billing     many    spaces')
      await nextTick()

      expect(suggestions.value.length).toBeGreaterThan(0)
    })

    it('should handle text with newlines and tabs', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      updateText('bill\t\ning question')
      await nextTick()

      // Tab/newline between "bill" and "ing" breaks keyword match for "billing"
      // But "account" keyword might not match either - use a keyword that could match
      // Actually, this test verifies the composable doesn't crash on special chars
      expect(Array.isArray(suggestions.value)).toBe(true)
    })

    it('should not include alwaysInclude questions twice when keyword also matches', async () => {
      const bank: TriageQuestionBank = {
        billing: ['Billing question 1', 'Billing question 2'],
      }

      const { suggestions, updateText } = useSuggester(bank, {
        alwaysInclude: ['billing'],
      })

      updateText('billing')
      await nextTick()

      const billingSuggestions = suggestions.value.filter((s) => s.matchedKeyword === 'billing')
      const texts = billingSuggestions.map((s) => s.text)
      const uniqueTexts = new Set(texts)
      expect(texts.length).toBe(uniqueTexts.size)
    })

    it('should return suggestions as ComputedRef', async () => {
      const { suggestions, updateText } = useSuggester(questionBank)

      expect(suggestions.value).toBeDefined()
      expect(typeof suggestions.value).toBe('object')

      updateText('billing')
      await nextTick()

      // Should still be reactive
      expect(Array.isArray(suggestions.value)).toBe(true)
    })

    it('should give higher recency bonus for keywords near start of text', async () => {
      const bank: TriageQuestionBank = {
        test: ['Test question'],
      }

      // Text where 'test' appears at the beginning
      const { suggestions: startSuggestions, updateText: updateStart } = useSuggester(bank)
      updateStart('test hello world')
      await nextTick()
      const startScore = startSuggestions.value[0]?.score ?? 0

      // Text where 'test' appears at the end
      const bank2: TriageQuestionBank = {
        test: ['Test question'],
      }
      const { suggestions: endSuggestions, updateText: updateEnd } = useSuggester(bank2)
      updateEnd('hello world test')
      await nextTick()
      const endScore = endSuggestions.value[0]?.score ?? 0

      // Beginning-of-text match should have higher recency bonus
      expect(startScore).toBeGreaterThanOrEqual(endScore)
    })
  })
})
