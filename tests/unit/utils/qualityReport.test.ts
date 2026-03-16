/**
 * Quality Report Utilities - Unit Tests
 *
 * @group utils
 */

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
} from '@/utils/qualityReport'

describe('qualityReport', () => {
  describe('calculateMOS', () => {
    it('should return null when all metrics are null', () => {
      expect(calculateMOS(null, null, null)).toBeNull()
    })

    it('should calculate MOS from packet loss only', () => {
      const mos = calculateMOS(5, null, null)
      expect(mos).toBeGreaterThan(1)
      expect(mos).toBeLessThanOrEqual(4.5)
    })

    it('should calculate MOS from jitter only', () => {
      const mos = calculateMOS(null, 30, null)
      expect(mos).toBeGreaterThan(1)
      expect(mos).toBeLessThanOrEqual(4.5)
    })

    it('should calculate MOS from RTT only', () => {
      const mos = calculateMOS(null, null, 100)
      expect(mos).toBeGreaterThan(1)
      expect(mos).toBeLessThanOrEqual(4.5)
    })

    it('should calculate MOS from all metrics', () => {
      const mos = calculateMOS(2, 20, 150)
      expect(mos).toBeGreaterThan(1)
      expect(mos).toBeLessThanOrEqual(4.5)
    })

    it('should return 1.0 for extreme packet loss', () => {
      const mos = calculateMOS(50, 0, 0)
      expect(mos).toBe(1.0)
    })

    it('should return 4.5 for ideal conditions', () => {
      const mos = calculateMOS(0, 0, 0)
      expect(mos).toBe(4.5)
    })

    it('should apply exponential penalty for high packet loss', () => {
      const mosLow = calculateMOS(1, 0, 0)
      const mosHigh = calculateMOS(10, 0, 0)
      expect(mosHigh!).toBeLessThan(mosLow!)
    })
  })

  describe('calculateQualityScore', () => {
    it('should return null when no metrics available', () => {
      expect(calculateQualityScore(null, null, null, null)).toBeNull()
    })

    it('should convert MOS to quality score', () => {
      const score = calculateQualityScore(4.5, null, null, null)
      expect(score).toBe(100)
    })

    it('should apply packet loss penalty', () => {
      const scoreNoLoss = calculateQualityScore(3.5, 0, 0, 0)
      const scoreHighLoss = calculateQualityScore(3.5, 10, 0, 0)
      expect(scoreHighLoss!).toBeLessThan(scoreNoLoss!)
    })

    it('should apply jitter penalty', () => {
      const scoreNoJitter = calculateQualityScore(3.5, 0, 0, 0)
      const scoreHighJitter = calculateQualityScore(3.5, 0, 100, 0)
      expect(scoreHighJitter!).toBeLessThan(scoreNoJitter!)
    })

    it('should apply RTT penalty', () => {
      const scoreNoRtt = calculateQualityScore(3.5, 0, 0, 0)
      const scoreHighRtt = calculateQualityScore(3.5, 0, 0, 1000)
      expect(scoreHighRtt!).toBeLessThan(scoreNoRtt!)
    })

    it('should calculate from raw metrics when MOS not provided', () => {
      const score = calculateQualityScore(null, 2, 20, 100)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should clamp score to 0-100 range', () => {
      const score = calculateQualityScore(5, 100, 500, 2000)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
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

    it('should return good for score >= 60', () => {
      expect(determineQualityLevel(60)).toBe('good')
      expect(determineQualityLevel(79)).toBe('good')
    })

    it('should return fair for score >= 40', () => {
      expect(determineQualityLevel(40)).toBe('fair')
      expect(determineQualityLevel(59)).toBe('fair')
    })

    it('should return poor for score >= 20', () => {
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
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0,
          bitrateKbps: 500,
          mosScore: 4,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
      ]
      expect(determineQualityTrend(history)).toBe('stable')
    })

    it('should return improving when quality increases', () => {
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(Date.now() - 20000),
          rtt: 200,
          jitter: 30,
          packetLossPercent: 5,
          bitrateKbps: 300,
          mosScore: 3,
          qualityScore: 50,
          qualityLevel: 'fair',
        },
        {
          timestamp: new Date(Date.now() - 10000),
          rtt: 150,
          jitter: 20,
          packetLossPercent: 2,
          bitrateKbps: 400,
          mosScore: 3.5,
          qualityScore: 65,
          qualityLevel: 'good',
        },
        {
          timestamp: new Date(),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0,
          bitrateKbps: 500,
          mosScore: 4,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
      ]
      expect(determineQualityTrend(history)).toBe('improving')
    })

    it('should return degrading when quality decreases', () => {
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(Date.now() - 20000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0,
          bitrateKbps: 500,
          mosScore: 4,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(Date.now() - 10000),
          rtt: 150,
          jitter: 20,
          packetLossPercent: 2,
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
          mosScore: 3,
          qualityScore: 50,
          qualityLevel: 'fair',
        },
      ]
      expect(determineQualityTrend(history)).toBe('degrading')
    })

    it('should return stable when quality is stable', () => {
      const baseTime = Date.now()
      const history: QualityMetrics[] = [
        {
          timestamp: new Date(baseTime - 20000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0,
          bitrateKbps: 500,
          mosScore: 4,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(baseTime - 10000),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0,
          bitrateKbps: 500,
          mosScore: 4,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
        {
          timestamp: new Date(baseTime),
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0,
          bitrateKbps: 500,
          mosScore: 4,
          qualityScore: 80,
          qualityLevel: 'excellent',
        },
      ]
      expect(determineQualityTrend(history)).toBe('stable')
    })
  })

  describe('createQualityMetrics', () => {
    it('should create metrics with all values', () => {
      const metrics = createQualityMetrics(100, 20, 2, 500)

      expect(metrics.rtt).toBe(100)
      expect(metrics.jitter).toBe(20)
      expect(metrics.packetLossPercent).toBe(2)
      expect(metrics.bitrateKbps).toBe(500)
      expect(metrics.mosScore).toBeTruthy()
      expect(metrics.qualityScore).toBeTruthy()
      expect(metrics.qualityLevel).toBeTruthy()
      expect(metrics.timestamp).toBeInstanceOf(Date)
    })

    it('should create metrics with null values', () => {
      const metrics = createQualityMetrics(null, null, null, null)

      expect(metrics.rtt).toBeNull()
      expect(metrics.jitter).toBeNull()
      expect(metrics.packetLossPercent).toBeNull()
      expect(metrics.bitrateKbps).toBeNull()
    })
  })

  describe('QualityHistoryBuffer', () => {
    let buffer: QualityHistoryBuffer

    beforeEach(() => {
      buffer = new QualityHistoryBuffer(5) // Small buffer for testing
    })

    it('should initialize with default max size', () => {
      const defaultBuffer = new QualityHistoryBuffer()
      expect(defaultBuffer.size).toBe(0)
    })

    it('should add metrics to buffer', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      expect(buffer.size).toBe(1)
    })

    it('should enforce max size limit', () => {
      for (let i = 0; i < 7; i++) {
        buffer.add(createQualityMetrics(100 + i, 10, 0, 500))
      }
      expect(buffer.size).toBe(5)
    })

    it('should get all metrics', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(200, 20, 1, 400))
      const all = buffer.getAll()
      expect(all.length).toBe(2)
    })

    it('should get recent metrics', () => {
      for (let i = 0; i < 5; i++) {
        buffer.add(createQualityMetrics(100 + i, 10, 0, 500))
      }
      const recent = buffer.getRecent(2)
      expect(recent.length).toBe(2)
    })

    it('should get metrics from last seconds', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))

      // Add old metric
      const oldMetrics = createQualityMetrics(100, 10, 0, 500)
      oldMetrics.timestamp = new Date(Date.now() - 10000)
      buffer.add(oldMetrics)

      const lastSecond = buffer.getLastSeconds(1)
      expect(lastSecond.length).toBe(1)
    })

    it('should clear buffer', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.clear()
      expect(buffer.size).toBe(0)
    })

    it('should calculate average MOS', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      const avg = buffer.getAverageMOS()
      expect(avg).toBeTruthy()
      expect(typeof avg).toBe('number')
    })

    it('should return null for average MOS when empty', () => {
      const avg = buffer.getAverageMOS()
      expect(avg).toBeNull()
    })

    it('should calculate MOS range', () => {
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      const range = buffer.getMOSRange()
      expect(range.min).toBeTruthy()
      expect(range.max).toBeTruthy()
    })

    it('should calculate average packet loss', () => {
      buffer.add(createQualityMetrics(100, 10, 2, 500))
      buffer.add(createQualityMetrics(100, 10, 4, 500))
      const avg = buffer.getAveragePacketLoss()
      expect(avg).toBe(3)
    })

    it('should calculate max packet loss', () => {
      buffer.add(createQualityMetrics(100, 10, 2, 500))
      buffer.add(createQualityMetrics(100, 10, 10, 500))
      const max = buffer.getMaxPacketLoss()
      expect(max).toBe(10)
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
    it('should generate report from buffer and alerts', () => {
      const buffer = new QualityHistoryBuffer(10)
      buffer.add(createQualityMetrics(100, 10, 0, 500))
      buffer.add(createQualityMetrics(150, 15, 1, 450))

      const alerts: QualityAlertRecord[] = [
        {
          id: 'alert-1',
          timestamp: new Date(),
          type: 'degradation',
          metric: 'packetLoss',
          value: 5,
          threshold: 3,
          message: 'Packet loss exceeded threshold',
        },
      ]

      const report = generateCallQualityReport('call-123', 60, buffer, alerts)

      expect(report.id).toMatch(/^qr-/)
      expect(report.callId).toBe('call-123')
      expect(report.duration).toBe(60)
      expect(report.averageMos).toBeTruthy()
      expect(report.trend).toBeTruthy()
      expect(report.alertCount).toBe(1)
      expect(report.alerts.length).toBe(1)
      expect(report.generatedAt).toBeInstanceOf(Date)
    })

    it('should handle empty buffer', () => {
      const buffer = new QualityHistoryBuffer()
      const report = generateCallQualityReport('call-123', 60, buffer, [])

      expect(report.averageMos).toBeNull()
      expect(report.minMos).toBeNull()
      expect(report.maxMos).toBeNull()
      expect(report.overallQuality).toBe('poor')
    })
  })

  describe('constants', () => {
    it('should have correct MAX_HISTORY_SIZE', () => {
      expect(MAX_HISTORY_SIZE).toBe(60)
    })

    it('should have correct QUALITY_THRESHOLDS', () => {
      expect(QUALITY_THRESHOLDS.excellent).toBe(80)
      expect(QUALITY_THRESHOLDS.good).toBe(60)
      expect(QUALITY_THRESHOLDS.fair).toBe(40)
      expect(QUALITY_THRESHOLDS.poor).toBe(20)
    })
  })
})
