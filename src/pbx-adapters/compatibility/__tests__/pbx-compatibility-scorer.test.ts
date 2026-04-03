import { describe, it, expect } from 'vitest'
import { scorePlatform, scoreCustomPlatform, listPlatforms, getSchema, gapReport } from '../index'

describe('PBX Compatibility Scoring Framework', () => {
  it('lists all built-in platforms', () => {
    const platforms = listPlatforms()
    expect(platforms).toContain('asterisk')
    expect(platforms).toContain('freepbx')
    expect(platforms).toContain('kamailio')
    expect(platforms).toContain('yeastar')
    expect(platforms).toContain('grandstream')
    expect(platforms).toContain('3cx')
    expect(platforms).toContain('fusionpbx')
    expect(platforms.length).toBeGreaterThanOrEqual(7)
  })

  it('exposes the category schema', () => {
    const schema = getSchema()
    expect(Object.keys(schema)).toContain('sipProtocol')
    expect(Object.keys(schema)).toContain('websocket')
    expect(Object.keys(schema)).toContain('webrtc')
    expect(Object.keys(schema)).toContain('authentication')
    expect(Object.keys(schema)).toContain('codecs')
    expect(Object.keys(schema)).toContain('managementApi')
  })

  describe('scorePlatform', () => {
    it('scores Asterisk with known range', () => {
      const result = scorePlatform('asterisk')
      expect(result.overallScore).toBeGreaterThan(70)
      expect(result.overallScore).toBeLessThanOrEqual(95)
      expect(result.compatibilityLevel).toBeTruthy()
      expect(result.knownLimitations.length).toBeGreaterThan(0)
    })

    it('scores Kamailio highest among built-in platforms', () => {
      const kamScore = scorePlatform('kamailio').overallScore
      for (const p of listPlatforms()) {
        if (p === 'kamailio') continue
        expect(kamScore).toBeGreaterThanOrEqual(scorePlatform(p).overallScore)
      }
    })

    it('scores 3CX lowest among built-in platforms', () => {
      const threeCxScore = scorePlatform('3cx').overallScore
      for (const p of listPlatforms()) {
        if (p === '3cx') continue
        expect(scorePlatform(p).overallScore).toBeGreaterThanOrEqual(threeCxScore)
      }
    })

    it('throws for unknown platform', () => {
      expect(() => scorePlatform('nonexistent')).toThrow(/Unknown platform/)
    })

    it('produces valid category results with correct weights', () => {
      const result = scorePlatform('asterisk')
      const totalWeight = result.categories.reduce((sum, c) => sum + c.weight, 0)
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01)
    })

    it('identifies gaps in platforms with known limitations', () => {
      const result = scorePlatform('3cx')
      expect(result.criticalGaps.length).toBeGreaterThan(0)
    })

    it('every feature has a score between 0 and 5', () => {
      for (const p of listPlatforms()) {
        const result = scorePlatform(p)
        for (const cat of result.categories) {
          for (const feat of cat.features) {
            expect(feat.score).toBeGreaterThanOrEqual(0)
            expect(feat.score).toBeLessThanOrEqual(5)
          }
        }
      }
    })
  })

  describe('scoreCustomPlatform', () => {
    it('scores a custom platform', () => {
      const result = scoreCustomPlatform(
        'testpbx',
        {
          sipProtocol: {
            rfc3261Compliance: 5,
            sipReferSupport: 5,
            sipUpdateSupport: 4,
            sipPrackSupport: 3,
            advancedRouting: 5,
            multipleTransports: 5,
          },
          websocket: {
            wsTransport: 5,
            wssSupport: 5,
            sipOverWs: 5,
            connectionStability: 5,
            concurrentConnections: 5,
          },
          webrtc: {
            iceStunTurn: 5,
            dtlsSrtp: 5,
            trickleIce: 5,
            opusCodec: 5,
            mediaQuality: 5,
            renegotiation: 5,
          },
          authentication: {
            digestAuth: 5,
            ipAuth: 5,
            tokenAuth: 5,
            tlsClientCerts: 5,
            ldapIntegration: 5,
            customAuthModules: 5,
          },
          codecs: { g711: 5, opus: 5, g729: 5, hdCodecs: 5, codecNegotiation: 5 },
          managementApi: {
            amiSupport: 5,
            ariSupport: 5,
            restApi: 5,
            eventStreaming: 5,
            cdrAccess: 5,
            configApi: 5,
          },
        },
        ['Perfect test platform']
      )
      expect(result.overallScore).toBeGreaterThanOrEqual(98)
      expect(result.compatibilityLevel).toBe('Excellent Compatibility')
    })

    it('handles zero scores gracefully', () => {
      const result = scoreCustomPlatform('empty', {
        sipProtocol: {
          rfc3261Compliance: 0,
          sipReferSupport: 0,
          sipUpdateSupport: 0,
          sipPrackSupport: 0,
          advancedRouting: 0,
          multipleTransports: 0,
        },
        websocket: {
          wsTransport: 0,
          wssSupport: 0,
          sipOverWs: 0,
          connectionStability: 0,
          concurrentConnections: 0,
        },
        webrtc: {
          iceStunTurn: 0,
          dtlsSrtp: 0,
          trickleIce: 0,
          opusCodec: 0,
          mediaQuality: 0,
          renegotiation: 0,
        },
        authentication: {
          digestAuth: 0,
          ipAuth: 0,
          tokenAuth: 0,
          tlsClientCerts: 0,
          ldapIntegration: 0,
          customAuthModules: 0,
        },
        codecs: { g711: 0, opus: 0, g729: 0, hdCodecs: 0, codecNegotiation: 0 },
        managementApi: {
          amiSupport: 0,
          ariSupport: 0,
          restApi: 0,
          eventStreaming: 0,
          cdrAccess: 0,
          configApi: 0,
        },
      })
      expect(result.overallScore).toBe(0)
      expect(result.compatibilityLevel).toBe('Poor Compatibility')
    })
  })

  describe('gapReport', () => {
    it('returns only critical/high gaps', () => {
      const gaps = gapReport('3cx')
      for (const g of gaps) {
        expect(['critical', 'high']).toContain(g.criticality)
        expect(g.score).toBeLessThan(3)
      }
    })
  })
})
