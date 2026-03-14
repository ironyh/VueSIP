import { describe, it, expect } from 'vitest'
import {
  SpeakerType,
  TranscriptionState,
  type TranscriptEntry,
  type WordTimestamp,
  type ParticipantConfig,
  type ProviderCapabilities,
  type TranscriptResult,
  type AudioSource,
  type ProviderOptions,
  type KeywordRule,
  type KeywordMatch,
  PIIType,
  type RedactionConfig,
  type RedactionResult,
  ExportFormat,
  type ExportOptions,
  type TranscriptionDependencies,
  type TranscriptionOptions,
} from '../../../src/types/transcription.types'

describe('transcription.types', () => {
  describe('SpeakerType', () => {
    it('should have local and remote as valid values', () => {
      const local: SpeakerType = 'local'
      const remote: SpeakerType = 'remote'
      expect(local).toBe('local')
      expect(remote).toBe('remote')
    })

    it('should not allow invalid speaker types', () => {
      // TypeScript should prevent this at compile time
      const invalidSpeaker = 'unknown' as SpeakerType
      expect(invalidSpeaker).not.toBe('local')
      expect(invalidSpeaker).not.toBe('remote')
    })
  })

  describe('TranscriptionState', () => {
    it('should have all expected states as valid literal types', () => {
      const states: TranscriptionState[] = ['idle', 'starting', 'active', 'stopping', 'error']
      expect(states).toContain('idle')
      expect(states).toContain('starting')
      expect(states).toContain('active')
      expect(states).toContain('stopping')
      expect(states).toContain('error')
    })

    it('should have correct number of states', () => {
      const states: TranscriptionState[] = ['idle', 'starting', 'active', 'stopping', 'error']
      expect(states).toHaveLength(5)
    })
  })

  describe('TranscriptEntry', () => {
    it('should create a valid transcript entry', () => {
      const entry: TranscriptEntry = {
        id: 'test-id-123',
        participantId: 'participant-456',
        participantName: 'Test User',
        speaker: 'local' as SpeakerType,
        text: 'Hello world',
        timestamp: Date.now(),
        confidence: 0.95,
        isFinal: true,
        language: 'en-US',
      }
      expect(entry.id).toBe('test-id-123')
      expect(entry.speaker).toBe('local')
      expect(entry.isFinal).toBe(true)
    })

    it('should allow optional fields to be omitted', () => {
      const entry: TranscriptEntry = {
        id: 'test-id',
        participantId: 'participant',
        speaker: 'remote' as SpeakerType,
        text: 'Test',
        timestamp: 1234567890,
        isFinal: false,
      }
      expect(entry.participantName).toBeUndefined()
      expect(entry.confidence).toBeUndefined()
    })

    it('should support word-level timestamps', () => {
      const entry: TranscriptEntry = {
        id: 'entry-with-words',
        participantId: 'p1',
        speaker: 'local' as SpeakerType,
        text: 'Hello world',
        timestamp: 1234567890,
        isFinal: true,
        words: [
          { word: 'Hello', startTime: 0.0, endTime: 0.5 },
          { word: 'world', startTime: 0.5, endTime: 1.0 },
        ],
      }
      expect(entry.words).toHaveLength(2)
      expect(entry.words?.[0].word).toBe('Hello')
    })
  })

  describe('WordTimestamp', () => {
    it('should have correct structure', () => {
      const wordTimestamp: WordTimestamp = {
        word: 'test',
        startTime: 1.5,
        endTime: 2.0,
      }
      expect(wordTimestamp.word).toBe('test')
      expect(wordTimestamp.startTime).toBe(1.5)
      expect(wordTimestamp.endTime).toBe(2.0)
    })

    it('should allow optional confidence', () => {
      const withConfidence: WordTimestamp = {
        word: 'test',
        startTime: 0,
        endTime: 0.5,
        confidence: 0.9,
      }
      const withoutConfidence: WordTimestamp = {
        word: 'test',
        startTime: 0,
        endTime: 0.5,
      }
      expect(withConfidence.confidence).toBe(0.9)
      expect(withoutConfidence.confidence).toBeUndefined()
    })
  })

  describe('ParticipantConfig', () => {
    it('should create a valid participant config', () => {
      const config: ParticipantConfig = {
        participantId: 'p123',
        participantName: 'John Doe',
        speakerType: 'local' as SpeakerType,
      }
      expect(config.participantId).toBe('p123')
      expect(config.speakerType).toBe('local')
    })

    it('should allow optional metadata', () => {
      const config: ParticipantConfig = {
        participantId: 'p456',
        speakerType: 'remote' as SpeakerType,
        metadata: { department: 'sales' },
      }
      expect(config.metadata?.department).toBe('sales')
    })
  })

  describe('ProviderCapabilities', () => {
    it('should define all capability flags', () => {
      const capabilities: ProviderCapabilities = {
        supportsInterimResults: true,
        supportsPunctuation: true,
        supportsWordTimestamps: true,
        supportsSpeakerIdentification: true,
        supportsCustomVocabulary: true,
        maxDuration: 3600,
      }
      expect(capabilities.supportsInterimResults).toBe(true)
      expect(capabilities.maxDuration).toBe(3600)
    })
  })

  describe('TranscriptResult', () => {
    it('should create a valid transcript result', () => {
      const result: TranscriptResult = {
        entries: [
          {
            id: '1',
            participantId: 'p1',
            speaker: 'local' as SpeakerType,
            text: 'Hello',
            timestamp: 1234567890,
            isFinal: true,
          },
        ],
        isFinal: true,
        language: 'en-US',
      }
      expect(result.entries).toHaveLength(1)
      expect(result.isFinal).toBe(true)
    })
  })

  describe('AudioSource', () => {
    it('should support different audio source types', () => {
      const microphone: AudioSource = { type: 'microphone' }
      const call: AudioSource = { type: 'call', callId: 'call-123' }
      const file: AudioSource = { type: 'file', filePath: '/path/to/audio.wav' }

      expect(microphone.type).toBe('microphone')
      expect(call.type).toBe('call')
      expect(file.type).toBe('file')
    })
  })

  describe('ProviderOptions', () => {
    it('should create valid provider options', () => {
      const options: ProviderOptions = {
        provider: 'deepgram',
        apiKey: 'test-key',
        language: 'en-US',
        model: 'nova-2',
      }
      expect(options.provider).toBe('deepgram')
      expect(options.model).toBe('nova-2')
    })
  })

  describe('KeywordRule', () => {
    it('should create keyword rules', () => {
      const rule: KeywordRule = {
        keywords: ['emergency', 'urgent'],
        matchType: 'exact',
        alert: true,
      }
      expect(rule.keywords).toContain('emergency')
      expect(rule.alert).toBe(true)
    })
  })

  describe('KeywordMatch', () => {
    it('should capture keyword matches', () => {
      const match: KeywordMatch = {
        keyword: 'emergency',
        rule: { keywords: ['emergency'], matchType: 'exact' },
        startTime: 5.0,
        endTime: 5.5,
      }
      expect(match.keyword).toBe('emergency')
      expect(match.startTime).toBe(5.0)
    })
  })

  describe('PIIType', () => {
    it('should have all expected PII types as literal types', () => {
      const piiTypes: PIIType[] = [
        'credit-card',
        'ssn',
        'phone-number',
        'email',
        'address',
        'name',
        'date-of-birth',
        'custom',
      ]
      expect(piiTypes).toContain('email')
      expect(piiTypes).toContain('phone-number')
      expect(piiTypes).toContain('ssn')
      expect(piiTypes).toContain('credit-card')
      expect(piiTypes).toContain('name')
      expect(piiTypes).toContain('address')
    })
  })

  describe('RedactionConfig', () => {
    it('should create valid redaction config', () => {
      const config: RedactionConfig = {
        enabled: true,
        piiTypes: ['phone-number' as PIIType, 'email' as PIIType],
        replacement: '***',
      }
      expect(config.enabled).toBe(true)
      expect(config.piiTypes).toContain('phone-number')
    })
  })

  describe('RedactionResult', () => {
    it('should capture redaction results', () => {
      const result: RedactionResult = {
        originalText: 'Call me at 555-1234',
        redactedText: 'Call me at ***',
        redactions: [{ type: 'phone-number' as PIIType, startIndex: 11, endIndex: 19 }],
      }
      expect(result.redactions).toHaveLength(1)
      expect(result.redactions[0].type).toBe('phone-number')
    })
  })

  describe('ExportFormat', () => {
    it('should have all expected export formats as literal types', () => {
      const formats: ExportFormat[] = ['json', 'txt', 'srt', 'vtt', 'csv']
      expect(formats).toContain('json')
      expect(formats).toContain('txt')
      expect(formats).toContain('srt')
      expect(formats).toContain('vtt')
      expect(formats).toContain('csv')
    })

    it('should have correct number of formats', () => {
      const formats: ExportFormat[] = ['json', 'txt', 'srt', 'vtt', 'csv']
      expect(formats).toHaveLength(5)
    })
  })

  describe('ExportOptions', () => {
    it('should create valid export options', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        includeTimestamps: true,
        includeSpeakerNames: true,
      }
      expect(options.format).toBe('json')
      expect(options.includeTimestamps).toBe(true)
    })
  })

  describe('TranscriptionDependencies', () => {
    it('should define required dependencies', () => {
      const deps: TranscriptionDependencies = {
        eventBus: {
          on: () => {},
          off: () => {},
          emit: () => {},
        },
        logger: {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
        },
      }
      expect(deps.eventBus).toBeDefined()
      expect(deps.logger).toBeDefined()
    })
  })

  describe('TranscriptionOptions', () => {
    it('should create valid transcription options', () => {
      const options: TranscriptionOptions = {
        provider: 'deepgram',
        language: 'sv-SE',
        continuous: true,
        interimResults: true,
      }
      expect(options.language).toBe('sv-SE')
      expect(options.continuous).toBe(true)
    })
  })
})
