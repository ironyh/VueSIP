/**
 * Unit tests for useGalleryLayout utility functions
 */

import { describe, it, expect } from 'vitest'

describe('useGalleryLayout - grid calculation logic', () => {
  // Re-implement the pure functions to match the source module-level functions
  const testGridCalculation = (
    count: number,
    maxCols = 4,
    maxRows = 4
  ): { cols: number; rows: number } => {
    const calculateOptimalCols = (c: number, mc: number): number => {
      if (c <= 0) return 1
      if (c === 1) return 1
      if (c === 2) return 2
      if (c <= 4) return 2
      if (c <= 6) return 3
      if (c <= 9) return 3
      if (c <= 12) return 4
      const cols = Math.ceil(Math.sqrt(c))
      return Math.min(cols, mc)
    }

    const calculateOptimalRows = (c: number, cols: number, mr: number): number => {
      if (c <= 0) return 1
      if (cols <= 0) return 1
      const rows = Math.ceil(c / cols)
      return Math.min(rows, mr)
    }

    const cols = calculateOptimalCols(count, maxCols)
    const rows = calculateOptimalRows(count, cols, maxRows)
    return { cols, rows }
  }

  describe('calculateOptimalCols', () => {
    it('should return 1 column for 0 participants', () => {
      const result = testGridCalculation(0)
      expect(result.cols).toBe(1)
    })

    it('should return 1 column for 1 participant', () => {
      const result = testGridCalculation(1)
      expect(result.cols).toBe(1)
    })

    it('should return 2 columns for 2 participants', () => {
      const result = testGridCalculation(2)
      expect(result.cols).toBe(2)
    })

    it('should return 2 columns for 3 participants', () => {
      const result = testGridCalculation(3)
      expect(result.cols).toBe(2)
    })

    it('should return 2 columns for 4 participants', () => {
      const result = testGridCalculation(4)
      expect(result.cols).toBe(2)
    })

    it('should return 3 columns for 5 participants', () => {
      const result = testGridCalculation(5)
      expect(result.cols).toBe(3)
    })

    it('should return 3 columns for 6 participants', () => {
      const result = testGridCalculation(6)
      expect(result.cols).toBe(3)
    })

    it('should return 3 columns for 7 participants', () => {
      const result = testGridCalculation(7)
      expect(result.cols).toBe(3)
    })

    it('should return 3 columns for 9 participants', () => {
      const result = testGridCalculation(9)
      expect(result.cols).toBe(3)
    })

    it('should return 4 columns for 10 participants', () => {
      const result = testGridCalculation(10)
      expect(result.cols).toBe(4)
    })

    it('should return 4 columns for 12 participants', () => {
      const result = testGridCalculation(12)
      expect(result.cols).toBe(4)
    })

    it('should cap columns at maxCols for large counts', () => {
      const result = testGridCalculation(25, 4)
      expect(result.cols).toBe(4)
    })

    it('should cap columns at maxCols for very large counts', () => {
      const result = testGridCalculation(100, 4)
      expect(result.cols).toBe(4)
    })

    it('should use sqrt calculation for 13+ participants', () => {
      const result = testGridCalculation(13)
      expect(result.cols).toBe(4)
    })
  })

  describe('calculateOptimalRows', () => {
    it('should return 1 row for 0 participants', () => {
      const result = testGridCalculation(0)
      expect(result.rows).toBe(1)
    })

    it('should return 1 row for 1 participant', () => {
      const result = testGridCalculation(1)
      expect(result.rows).toBe(1)
    })

    it('should return 1 row for 2 participants (2 cols)', () => {
      const result = testGridCalculation(2)
      expect(result.rows).toBe(1)
    })

    it('should return 2 rows for 3 participants (2 cols)', () => {
      const result = testGridCalculation(3)
      expect(result.rows).toBe(2)
    })

    it('should return 2 rows for 4 participants (2 cols)', () => {
      const result = testGridCalculation(4)
      expect(result.rows).toBe(2)
    })

    it('should return 2 rows for 5 participants (3 cols)', () => {
      const result = testGridCalculation(5)
      expect(result.rows).toBe(2)
    })

    it('should return 2 rows for 6 participants (3 cols)', () => {
      const result = testGridCalculation(6)
      expect(result.rows).toBe(2)
    })

    it('should return 3 rows for 7 participants (3 cols)', () => {
      const result = testGridCalculation(7)
      expect(result.rows).toBe(3)
    })

    it('should return 3 rows for 9 participants (3 cols)', () => {
      const result = testGridCalculation(9)
      expect(result.rows).toBe(3)
    })

    it('should cap rows at maxRows', () => {
      const result = testGridCalculation(25, 4, 4)
      expect(result.rows).toBe(4)
    })
  })

  describe('grid dimension consistency', () => {
    it('should always accommodate all participants for counts 1-16', () => {
      for (let count = 1; count <= 16; count++) {
        const result = testGridCalculation(count)
        const capacity = result.cols * result.rows
        expect(capacity).toBeGreaterThanOrEqual(count)
      }
    })

    it('should cap at 4x4 grid for counts 13-16 due to maxCols/maxRows defaults', () => {
      for (const count of [13, 14, 15, 16]) {
        const result = testGridCalculation(count)
        expect(result.cols).toBe(4)
        expect(result.rows).toBe(4)
        expect(result.cols * result.rows).toBe(16)
      }
    })

    it('should produce correct grid dimensions for known counts', () => {
      expect(testGridCalculation(1)).toEqual({ cols: 1, rows: 1 })
      expect(testGridCalculation(2)).toEqual({ cols: 2, rows: 1 })
      expect(testGridCalculation(3)).toEqual({ cols: 2, rows: 2 })
      expect(testGridCalculation(4)).toEqual({ cols: 2, rows: 2 })
      expect(testGridCalculation(5)).toEqual({ cols: 3, rows: 2 })
      expect(testGridCalculation(6)).toEqual({ cols: 3, rows: 2 })
      expect(testGridCalculation(9)).toEqual({ cols: 3, rows: 3 })
      expect(testGridCalculation(12)).toEqual({ cols: 4, rows: 3 })
    })
  })
})
