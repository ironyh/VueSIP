/**
 * qualityReport utilities tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateMOS,
  calculateQualityScore,
  determineQualityLevel,
  determineQualityTrend,
  createQualityMetrics,
  QualityHistoryBuffer,
  generateCallQualityReport,
  MAX_HISTORY_SIZE,
  QUALITY_THRESHOLDS,
  type QualityMetrics,
  type QualityAlertRecord,
} from '../qualityReport'

describe('qualityReport', () => {
  describe('calculateMOS', () => {
    it('should return null when all metrics are null', () => {
      const result = calculateMOS(null, null, null)
      expect(result).toBeNull()
    })

    it('should calculate MOS with packet loss only', () => {
      const result = calculateMOS(5, null, null)
      expect(result).toBeGreaterThan(1.0)
      expect(result).toBeLessThanOrEqual(4.5)
    })

    it('should calculate MOS with jitter only', () => {
      const result = calculateMOS(null, 30, null)
      expect(result).toBeGreaterThan(1.0)
      expect(result).toBeLessThanOrEqual(4.5)
    })

    it('should calculate MOS with RTT only', () => {
      const result = calculateMOS(null, null, 100)
      expect(result).toBeGreaterThan(1.0)
      expect(result).toBeLessThanOrEqual(4.5)
    })

    it('should return lower MOS with high packet loss', () => {
      const mosLow = calculateMOS(20, null, null)
      const mosNone = calculateMOS(0, null, null)
      expect(mosLow).toBeLessThan(mosNone)
    })

    it('should return lower MOS with high RTT', () => {
      const mosLow = calculateMOS(null, null, 800)
      const mosHigh = calculateMOS(null, null, 50)
      expect(mosLow).toBeLessThan(mosHigh)
    })

    it('should handle jitter in MOS calculation', () => {
      // Jitter impacts MOS in combination with other factors
      const mosWithJitter = calculateMOS(null, 100, 100)
      expect(mosWithJitter).toBeGreaterThan(1.0)
    })

    it('should use defaults for missing metrics', () => {
      const result = calculateMOS(10, null, null)
      expect(result).toBeGreaterThan(1.0)
    })

    it('should return MOS between 1.0 and 4.5', () => {
      const result = calculateMOS(1, 20, 100)
      expect(result).toBeGreaterThanOrEqual(1.0)
      expect(result).toBeLessThanOrEqual(4.5)
    })
  })

  describe('calculateQualityScore', () => {
    it('should return null when no metrics available', () => {
      const result = calculateQualityScore(null, null, null, null)
      expect(result).toBeNull()
    })

    it('should convert MOS to quality score', () => {
      const result = calculateQualityScore(4.5, null, null, null)
      expect(result).toBe(100)
    })

    it('should return 0 for MOS of 1.0', () => {
      const result = calculateQualityScore(1.0, null, null, null)
      expect(result).toBe(0)
    })

    it('should apply penalty for high packet loss', () => {
      const withPenalty = calculateQualityScore(3.5, 10, null, null)
      const withoutPenalty = calculateQualityScore(3.5, 0, null, null)
      expect(withPenalty).toBeLessThan(withoutPenalty)
    })

    it('should apply penalty for high jitter', () => {
      const withPenalty = calculateQualityScore(3.5, null, 100, null)
      const withoutPenalty = calculateQualityScore(3.5, null, 0, null)
      expect(withPenalty).toBeLessThan(withoutPenalty)
    })

    it('should apply penalty for high RTT', () => {
      const withPenalty = calculateQualityScore(3.5, null, null, 800)
      const withoutPenalty = calculateQualityScore(3.5, null, null, 100)
      expect(withPenalty).toBeLessThan(withoutPenalty)
    })

    it('should calculate MOS from raw metrics if not provided', () => {
      const result = calculateQualityScore(null, 5, 20, 100)
      expect(result).not.toBeNull()
    })

    it('should cap score at 100', () => {
      const result = calculateQualityScore(4.5, 0, 0, 0)
      expect(result).toBeLessThanOrEqual(100)
    })

    it('should floor at 0', () => {
      const result = calculateQualityScore(1.0, 50, 200, 1000)
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('determineQualityLevel', () => {
    it('should return poor for null score', () => {
      expect(determineQualityLevel(null)).toBe('poor')
    })

    it('should return excellent for score >= 80', () => {
      expect(determineQualityLevel(80)).toBe('excellent')
      expect(determineQualityLevel(100)).toBe('excellent')
    })

    it('should return good for score >= 60 and < 80', () => {
      expect(determineQualityLevel(60)).toBe('good')
      expect(determineQualityLevel(79)).toBe('good')
    })

    it('should return fair for score >= 40 and < 60', () => {
      expect(determineQualityLevel(40)).toBe('fair')
      expect(determineQualityLevel(59)).toBe('fair')
    })

    it('should return poor for score >= 20 and < 40', () => {
      expect(determineQualityLevel(20)).toBe('poor')
      expect(determineQualityLevel(39)).toBe('poor')
    })

    it('should return critical for score < 20', () => {
      expect(determineQualityLevel(0)).toBe('critical')
      expect(determineQualityLevel(19)).toBe('critical')
    })
  })

  describe('determineQualityTrend', () => {
    it('should return stable for less than 2 samples', () => {
      const single: QualityMetrics[] = [
        {
          timestamp: new Date(),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
      ]
      expect(determineQualityTrend(single)).toBe('stable')
    })

    it('should return improving when second half average is higher', () => {
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(Date.now() - 15000),
          rtt: 200,
          jitter: 30,
          packetLossPercent: 5,
          bitrateKbps: 300,
          mosScore: 3.0,
          qualityScore: 50,
          qualityLevel: 'fair',
        },
        {
          timestamp: new Date(Date.now() - 10000),
          rtt: 150,
          jitter: 20,
          packetLossPercent: 3,
          bitrateKbps: 400,
          mosScore: 3.5,
          qualityScore: 65,
          qualityLevel: 'good',
        },
        {
          timestamp: new Date(Date.now() - 5000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(),
          rtt: 80,
          jitter: 5,
          packetLossPercent: 0,
          bitrateKbps: 600,
          mosScore: 4.2,
          qualityScore: 90,
          qualityLevel: 'excellent',
        },
      ]
      expect(determineQualityTrend(history)).toBe('improving')
    })

    it('should return degrading when second half average is lower', () => {
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(Date.now() - 15000),
          rtt: 80,
          jitter: 5,
          packetLossPercent: 0,
          bitrateKbps: 600,
          mosScore: 4.2,
          qualityScore: 90,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(Date.now() - 10000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(Date.now() - 5000),
          rtt: 150,
          jitter: 20,
          packetLossPercent: 3,
          bitrateKbps: 400,
          mosScore: 3.5,
          qualityScore: 65,
          qualityLevel: 'good',
        },
        {
          timestamp: new Date(),
          rtt: 200,
          jitter: 30,
          packetLossPercent: 5,
          bitrateKbps: 300,
          mosScore: 3.0,
          qualityScore: 50,
          qualityLevel: 'fair',
        },
      ]
      expect(determineQualityTrend(history)).toBe('degrading')
    })

    it('should return stable when change is within threshold', () => {
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(Date.now() - 15000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(Date.now() - 10000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(Date.now() - 5000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 500,
          mosScore: 4.0,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
      ]
      expect(determineQualityTrend(history)).toBe('stable')
    })
  })

  describe('createQualityMetrics', () => {
    it('should create metrics with all null values', () => {
      const result = createQualityMetrics(null, null, null, null)
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.rtt).toBeNull()
      expect(result.jitter).toBeNull()
      expect(result.packetLossPercent).toBeNull()
      expect(result.bitrateKbps).toBeNull()
      expect(result.mosScore).toBeNull()
      expect(result.qualityScore).toBeNull()
      expect(result.qualityLevel).toBe('poor')
    })

    it('should create metrics with valid values', () => {
      const result = createQualityMetrics(100, 20, 2, 500)
      expect(result.rtt).toBe(100)
      expect(result.jitter).toBe(20)
      expect(result.packetLossPercent).toBe(2)
      expect(result.bitrateKbps).toBe(500)
      expect(result.mosScore).not.toBeNull()
      expect(result.qualityScore).not.toBeNull()
      expect(result.qualityLevel).not.toBe('poor')
    })

    it('should calculate MOS and quality score automatically', () => {
      const result = createQualityMetrics(50, 10, 0, 256)
      expect(result.mosScore).toBeGreaterThan(1.0)
      expect(result.qualityScore).toBeGreaterThan(50)
    })
  })

  describe('QualityHistoryBuffer', () => {
    let buffer: QualityHistoryBuffer

    beforeEach(() => {
      buffer = new QualityHistoryBuffer(10)
    })

    it('should initialize with default max size', () => {
      const defaultBuffer = new QualityHistoryBuffer()
      expect(defaultBuffer.size).toBe(0)
    })

    it('should add metrics to buffer', () => {
      const metrics = createQualityMetrics(100, 10, 1, 500)
      buffer.add(metrics)
      expect(buffer.size).toBe(1)
    })

    it('should limit buffer size', () => {
      for (let i = 0; i < 15; i++) {
        buffer.add(createQualityMetrics(100, 10, 1, 500))
      }
      expect(buffer.size).toBe(10)
    })

    it('should get all metrics', () => {
      const m1 = createQualityMetrics(100, 10, 1, 500)
      const m2 = createQualityMetrics(200, 20, 2, 400)
      buffer.add(m1)
      buffer.add(m2)
      const all = buffer.getAll()
      expect(all.length).toBe(2)
    })

    it('should get recent metrics', () => {
      for (let i = 0; i < 5; i++) {
        buffer.add(createQualityMetrics(100 + i, 10, 1, 500))
      }
      const recent = buffer.getRecent(2)
      expect(recent.length).toBe(2)
    })

    it('should get metrics from last N seconds', () => {
      const now = new Date()
      const old: QualityMetrics = {
        timestamp: new Date(now.getTime() - 15000),
        rtt: 100,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 500,
        mosScore: 4.0,
        qualityScore: 80,
        qualityLevel: 'excellent',
      }
      const recent: QualityMetrics = {
        timestamp: now,
        rtt: 100,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 500,
        mosScore: 4.0,
        qualityScore: 80,
        qualityLevel: 'excellent',
      }
      buffer.add(old)
      buffer.add(recent)
      const last5 = buffer.getLastSeconds(5)
      expect(last5.length).toBe(1)
    })

    it('should clear buffer', () => {
      buffer.add(createQualityMetrics(100, 10, 1, 500))
      buffer.clear()
      expect(buffer.size).toBe(0)
    })

    it('should calculate average MOS', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500)) // ~4.5 MOS
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      const avg = buffer.getAverageMOS()
      expect(avg).not.toBeNull()
      expect(avg).toBeGreaterThan(4.0)
    })

    it('should return null for average MOS with no valid data', () => {
      const emptyBuffer = new QualityHistoryBuffer()
      expect(emptyBuffer.getAverageMOS()).toBeNull()
    })

    it('should get MOS range', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500)) // high MOS
      buffer.add(createQualityMetrics(500, 100, 30, 100)) // low MOS
      const range = buffer.getMOSRange()
      expect(range.min).not.toBeNull()
      expect(range.max).not.toBeNull()
      expect(range.min).toBeLessThan(range.max)
    })

    it('should calculate average packet loss', () => {
      buffer.add(createQualityMetrics(100, 10, 10, 500))
      buffer.add(createQualityMetrics(100, 10, 20, 500))
      const avg = buffer.getAveragePacketLoss()
      expect(avg).toBe(15)
    })

    it('should calculate max packet loss', () => {
      buffer.add(createQualityMetrics(100, 10, 5, 500))
      buffer.add(createQualityMetrics(100, 10, 20, 500))
      const max = buffer.getMaxPacketLoss()
      expect(max).toBe(20)
    })

    it('should calculate average jitter', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(100, 20, 0, 500))
      const avg = buffer.getAverageJitter()
      expect(avg).toBe(15)
    })

    it('should calculate max jitter', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(100, 50, 0, 500))
      const max = buffer.getMaxJitter()
      expect(max).toBe(50)
    })

    it('should calculate average RTT', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(200, 10, 0, 500))
      const avg = buffer.getAverageRtt()
      expect(avg).toBe(150)
    })

    it('should calculate max RTT', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(300, 10, 0, 500))
      const max = buffer.getMaxRtt()
      expect(max).toBe(300)
    })
  })

  describe('generateCallQualityReport', () => {
    it('should generate report with empty buffer', () => {
      const buffer = new QualityHistoryBuffer()
      const alerts: QualityAlertRecord[] = []
      const report = generateCallQualityReport('call-123', 60, buffer, alerts)

      expect(report.id).toMatch(/^qr-/)
      expect(report.callId).toBe('call-123')
      expect(report.duration).toBe(60)
      expect(report.averageMos).toBeNull()
      expect(report.overallQuality).toBe('poor')
      expect(report.alertCount).toBe(0)
    })

    it('should generate report with history and alerts', () => {
      const buffer = new QualityHistoryBuffer()
      for (let i = 0; i < 5; i++) {
        buffer.add(createQualityMetrics(100, 10, 1, 500))
      }

      const alerts: QualityAlertRecord[] = [
        {
          id: 'alert-1',
          timestamp: new Date(),
          type: 'degradation',
          metric: 'packetLoss',
          value: 10,
          threshold: 5,
          message: 'High packet loss detected',
        },
      ]

      const report = generateCallQualityReport('call-456', 120, buffer, alerts)

      expect(report.averageMos).not.toBeNull()
      expect(report.minMos).not.toBeNull()
      expect(report.maxMos).not.toBeNull()
      expect(report.averagePacketLoss).toBe(1)
      expect(report.maxPacketLoss).toBe(1)
      expect(report.alertCount).toBe(1)
      expect(report.trend).toBe('stable')
    })

    it('should include all metrics in report', () => {
      const buffer = new QualityHistoryBuffer()
      buffer.add(createQualityMetrics(100, 20, 5, 300))
      buffer.add(createQualityMetrics(150, 30, 10, 250))

      const report = generateCallQualityReport('call-789', 30, buffer, [])

      expect(report.averageJitter).toBe(25)
      expect(report.maxJitter).toBe(30)
      expect(report.averageRtt).toBe(125)
      expect(report.maxRtt).toBe(150)
    })
  })

  describe('constants', () => {
    it('should have correct MAX_HISTORY_SIZE', () => {
      expect(MAX_HISTORY_SIZE).toBe(60)
    })

    it('should have correct quality thresholds', () => {
      expect(QUALITY_THRESHOLDS.excellent).toBe(80)
      expect(QUALITY_THRESHOLDS.good).toBe(60)
      expect(QUALITY_THRESHOLDS.fair).toBe(40)
      expect(QUALITY_THRESHOLDS.poor).toBe(20)
    })
  })
})
