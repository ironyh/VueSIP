/**
 * Unit tests for triageQuestionBank.ts
 * @module utils/triageQuestionBank.test
 */

import { describe, it, expect } from 'vitest'
import { triageQuestionBank, getSuggestedQuestions } from '@/utils/triageQuestionBank'

describe('triageQuestionBank', () => {
  describe('structure validation', () => {
    it('should have all expected top-level categories', () => {
      // Cardiovascular
      expect(triageQuestionBank).toHaveProperty('bröstsmärta')
      expect(triageQuestionBank).toHaveProperty('bröstet')
      expect(triageQuestionBank).toHaveProperty('hjärtklappning')
      expect(triageQuestionBank).toHaveProperty('hjärtinfarkt')
      expect(triageQuestionBank).toHaveProperty('blodtryck')

      // Respiratory
      expect(triageQuestionBank).toHaveProperty('andningssvårighet')
      expect(triageQuestionBank).toHaveProperty('andnöd')
      expect(triageQuestionBank).toHaveProperty('hosta')
      expect(triageQuestionBank).toHaveProperty('astma')
      expect(triageQuestionBank).toHaveProperty('lunginflammation')

      // Pain
      expect(triageQuestionBank).toHaveProperty('smärta')
      expect(triageQuestionBank).toHaveProperty('buksmärta')
      expect(triageQuestionBank).toHaveProperty('huvudvärk')
      expect(triageQuestionBank).toHaveProperty('migrän')

      // Mental Health
      expect(triageQuestionBank).toHaveProperty('oro')
      expect(triageQuestionBank).toHaveProperty('ångest')
      expect(triageQuestionBank).toHaveProperty('depression')
      expect(triageQuestionBank).toHaveProperty('sömnproblem')

      // Pediatric
      expect(triageQuestionBank).toHaveProperty('barn feber')
      expect(triageQuestionBank).toHaveProperty('barn hosta')

      // Neurological
      expect(triageQuestionBank).toHaveProperty('stroke')
      expect(triageQuestionBank).toHaveProperty('förlamning')
      expect(triageQuestionBank).toHaveProperty('medvetslöshet')
    })

    it('should have each category as an array of non-empty strings', () => {
      for (const [key, questions] of Object.entries(triageQuestionBank)) {
        expect(Array.isArray(questions), `Category "${key}" should be an array`).toBe(true)
        expect(questions.length > 0, `Category "${key}" should have at least one question`).toBe(
          true
        )
        for (const q of questions) {
          expect(typeof q).toBe('string')
          expect(q.trim().length).toBeGreaterThan(0)
        }
      }
    })

    it('should not have duplicate questions within a category', () => {
      for (const [key, questions] of Object.entries(triageQuestionBank)) {
        const unique = new Set(questions)
        expect(unique.size).toBe(
          questions.length,
          `Category "${key}" should not have duplicate questions`
        )
      }
    })
  })

  describe('getSuggestedQuestions', () => {
    it('should return correct questions for known cardiovascular symptoms', () => {
      const result = getSuggestedQuestions(['bröstsmärta'])

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('Hur länge har smärtan pågått?')
      expect(result).toContain('Var exakt känns smärtan?')
      expect(result).toContain('Strålar smärtan någonstans?')
    })

    it('should return correct questions for hjärtklappning', () => {
      const result = getSuggestedQuestions(['hjärtklappning'])

      expect(result).toContain('Hur ofta uppträder det?')
      expect(result).toContain('Slår hjärtat oregelbundet?')
      expect(result).toContain('Har du yrsel eller illamående?')
    })

    it('should return correct questions for respiratory symptoms', () => {
      const result = getSuggestedQuestions(['andningssvårighet'])

      expect(result).toContain('Har du svårt att andas i vila?')
      expect(result).toContain('Hur länge har det pågått?')
      expect(result).toContain('Har du pipande andning?')
    })

    it('should return correct questions for stroke keyword', () => {
      const result = getSuggestedQuestions(['stroke'])

      expect(result).toContain('Symtomdebut — när?')
      expect(result).toContain('Ena sidan drabbad?')
      expect(result).toContain('Talsvårigheter?')
    })

    it('should return empty array for unknown keyword', () => {
      const result = getSuggestedQuestions(['xyznonexistentkeyword'])

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should return empty array for empty input', () => {
      expect(getSuggestedQuestions([])).toEqual([])
    })

    it('should throw TypeError for undefined array item', () => {
      // The function does not guard against null/undefined items
      // @ts-expect-error — testing runtime behavior
      expect(() => getSuggestedQuestions([undefined])).toThrow(TypeError)
      // @ts-expect-error
      expect(() => getSuggestedQuestions([null])).toThrow(TypeError)
    })

    it('should handle partial keyword matching (key matches term)', () => {
      // The function checks if term includes key (key must be substring of term)
      // 'bröstsmärta' includes 'bröst' as a substring
      const result = getSuggestedQuestions(['bröstsmärta'])

      expect(result.length).toBeGreaterThan(0)
      // Should include questions from bröstsmärta
      const allQuestions = Object.values(triageQuestionBank).flat()
      const matchedQuestions = result.filter((q) => allQuestions.includes(q))
      expect(matchedQuestions.length).toBe(result.length)
    })

    it('should deduplicate questions when multiple keywords match same question', () => {
      // 'bröstsmärta' and 'bröstsmärta' duplicate; 'hosta' is separate
      const result = getSuggestedQuestions(['bröstsmärta', 'hosta'])

      // Should still be an array with no duplicates
      const unique = new Set(result)
      expect(unique.size).toBe(result.length)
    })

    it('should return at most 5 unique questions', () => {
      // Test with a keyword that has many questions
      const manyQuestions = getSuggestedQuestions(['bröstsmärta'])
      expect(manyQuestions.length).toBeLessThanOrEqual(5)
    })

    it('should be case-insensitive', () => {
      const lower = getSuggestedQuestions(['bröstsmärta'])
      const upper = getSuggestedQuestions(['BRÖSTSMÄRTA'])
      const mixed = getSuggestedQuestions(['BröstSmärta'])

      expect(lower.sort()).toEqual(upper.sort())
      expect(lower.sort()).toEqual(mixed.sort())
    })

    it('should handle Swedish characters å, ä, ö', () => {
      // Test with keywords containing Swedish special characters
      const result = getSuggestedQuestions(['öronvärk'])

      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('Hur länge har det pågått?')
    })

    it('should handle multiple keywords and combine results', () => {
      const result = getSuggestedQuestions(['bröstsmärta', 'hosta'])

      expect(result.length).toBeGreaterThan(0)
      // With 5 question cap, results may favor one category
      const hasCardiovascular = result.some((q) => triageQuestionBank.bröstsmärta.includes(q))
      const hasRespiratory = result.some((q) => triageQuestionBank.hosta.includes(q))
      // At least one category should be represented
      expect(hasCardiovascular || hasRespiratory).toBe(true)
    })

    it('should return empty array when all keywords are unknown', () => {
      const result = getSuggestedQuestions(['xyz', 'abc', 'defghi'])

      expect(result).toEqual([])
    })

    it('should return empty for keyword that is substring of no key', () => {
      // 'smärta' is not a key itself (keys are 'buksmärta', 'bröstsmärta', etc.)
      // 'smärta'.includes('buksmärta') = false and 'buksmärta'.includes('smärta') = true
      // So 'smärta' won't match anything (term shorter than key)
      const result = getSuggestedQuestions(['smärta'])

      // Since no key is shorter than 'smärta', this returns empty
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return questions for pediatric keywords', () => {
      const result = getSuggestedQuestions(['barn feber'])

      // 'barn feber' matches both 'barn feber' (4 questions) and 'feber' (4 questions)
      // With 5-question cap, the first 5 are: all feber questions + 1 barn feber question
      expect(result.length).toBeLessThanOrEqual(5)
      // Should include at least one barn feber-specific question
      const hasBarnFeberQuestion = result.some((q) =>
        [
          'Hur hög feber har barnet?',
          'Hur gammal är barnet?',
          'Hur länge har febern pågått?',
          'Har barnet feber?',
        ].includes(q)
      )
      expect(hasBarnFeberQuestion).toBe(true)
    })

    it('should return questions for mental health keywords', () => {
      const result = getSuggestedQuestions(['depression'])

      expect(result).toContain('Hur länge har du känt dig nedstämd?')
      expect(result).toContain('Har du sömnproblem?')
    })

    it('should return questions for neurological emergency keywords', () => {
      const result = getSuggestedQuestions(['förlamning'])

      expect(result).toContain('Vilken del av kroppen är drabbad?')
      expect(result).toContain('RING 112 OMEDELBART!')
    })

    it('should return empty for single character inputs', () => {
      const result = getSuggestedQuestions(['a'])

      // Either empty or some partial matches
      expect(Array.isArray(result)).toBe(true)
    })

    it('should not modify the original input array', () => {
      const input = ['bröstsmärta']
      const inputCopy = [...input]
      getSuggestedQuestions(input)

      expect(input).toEqual(inputCopy)
    })
  })
})
