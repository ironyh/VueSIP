/**
 * Tests for useCallSummary composable
 * Call summarization and action item extraction
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCallSummary, type CallSummaryOptions } from '@/composables/useCallSummary'

describe('useCallSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Sample transcription for testing
  const sampleTranscription = `
    Agent: Hello, this is John from support. How can I help you today?
    Caller: Hi, I'm having trouble with my billing. I was charged twice.
    Agent: I'm sorry to hear that. Let me look into your account. I can see the duplicate charge.
    Agent: I will process a refund for the extra charge. You should see it within 3-5 business days.
    Caller: Thank you so much! Can you also send me a confirmation email?
    Agent: Absolutely, I'll send that right away. Is there anything else I can help with?
    Caller: No, that's all. Thanks again!
    Agent: You're welcome. Have a great day!
  `

  const complaintTranscription = `
    Caller: This is unacceptable! I've been waiting for two weeks and still no response.
    Agent: I'm very sorry about the delay. Let me look into this immediately.
    Caller: This is terrible service. I'm extremely frustrated with how this has been handled.
    Agent: I completely understand your frustration. I will personally follow up on this today.
    Agent: I'll make sure you get a callback within the next 2 hours.
    Caller: Fine, but this better be resolved. I'm considering canceling my account.
  `

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { isGenerating, lastSummary, error } = useCallSummary()

      expect(isGenerating.value).toBe(false)
      expect(lastSummary.value).toBeNull()
      expect(error.value).toBeNull()
    })

    it('should accept custom options', () => {
      const customOptions: CallSummaryOptions = {
        maxLength: 50,
        format: 'bullet-points',
        includeSentiment: false,
      }

      const { generateSummary } = useCallSummary(customOptions)
      expect(generateSummary).toBeDefined()
    })
  })

  describe('Summary Generation', () => {
    it('should generate a summary from transcription', async () => {
      const { generateSummary, isGenerating, lastSummary } = useCallSummary()

      expect(isGenerating.value).toBe(false)

      const result = await generateSummary(sampleTranscription)

      expect(isGenerating.value).toBe(false)
      expect(result).toBeDefined()
      expect(result.summary).toBeTruthy()
      expect(lastSummary.value).toEqual(result)
    })

    it('should generate summary with all required fields', async () => {
      const { generateSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('actionItems')
      expect(result).toHaveProperty('topics')
      expect(result).toHaveProperty('sentiment')
      expect(result).toHaveProperty('duration')
      expect(result).toHaveProperty('keyPhrases')
      expect(result).toHaveProperty('callType')
    })

    it('should respect maxLength option', async () => {
      const { generateSummary } = useCallSummary({ maxLength: 20 })

      const result = await generateSummary(sampleTranscription)

      // Summary should be roughly within the word limit
      const wordCount = result.summary.split(/\s+/).length
      expect(wordCount).toBeLessThanOrEqual(30) // Allow some flexibility
    })

    it('should handle empty transcription', async () => {
      const { generateSummary } = useCallSummary()

      const result = await generateSummary('')

      expect(result.summary).toBe('')
      expect(result.actionItems).toEqual([])
      expect(result.topics).toEqual([])
    })

    it('should use custom summarizer when provided', async () => {
      const customSummarizer = vi.fn(
        async (): Promise<CallSummaryResult> => ({
          summary: 'Custom summary',
          actionItems: [],
          topics: [],
          sentiment: { overall: 0.5, start: 0.5, end: 0.5, trend: 'stable' },
          duration: 60,
          keyPhrases: ['custom'],
          callType: 'general',
        })
      )

      const { generateSummary } = useCallSummary({
        summarizer: customSummarizer,
      })

      const result = await generateSummary('test transcription')

      expect(customSummarizer).toHaveBeenCalled()
      expect(result.summary).toBe('Custom summary')
    })
  })

  describe('Action Item Extraction', () => {
    it('should extract action items with commitments', () => {
      const { extractActionItems } = useCallSummary()

      const items = extractActionItems(sampleTranscription)

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((item) => item.description.toLowerCase().includes('refund'))).toBe(true)
    })

    it('should extract action items from "I will" statements', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = 'Agent: I will process the refund today.'
      const items = extractActionItems(transcription)

      expect(items.length).toBeGreaterThan(0)
      expect(items[0]!.assignee).toBe('agent')
    })

    it('should extract action items from "I\'ll" statements', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = "Agent: I'll send you the confirmation email right away."
      const items = extractActionItems(transcription)

      expect(items.length).toBeGreaterThan(0)
    })

    it('should extract action items from requests', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = 'Caller: Please send me the invoice. Could you also update my address?'
      const items = extractActionItems(transcription)

      expect(items.length).toBeGreaterThan(0)
    })

    it('should detect follow-up actions', () => {
      const { extractActionItems } = useCallSummary()

      const transcription =
        "Agent: I'll follow up with you by tomorrow. Let me get back to you soon."
      const items = extractActionItems(transcription)

      expect(items.length).toBeGreaterThan(0)
    })

    it('should assign correct priority to action items', () => {
      const { extractActionItems } = useCallSummary()

      const urgentTranscription =
        'Agent: I will resolve this urgent issue immediately. This is critical.'
      const urgentItems = extractActionItems(urgentTranscription)
      expect(urgentItems.some((item) => item.priority === 'high')).toBe(true)

      const mediumTranscription = 'Agent: I will send you the report by tomorrow.'
      const mediumItems = extractActionItems(mediumTranscription)
      // May be low or medium depending on context
      expect(mediumItems.length).toBeGreaterThan(0)
    })

    it('should detect deadline in action items', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = 'Agent: I will complete this within 24 hours.'
      const items = extractActionItems(transcription)

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((item) => item.dueDate?.includes('24 hours'))).toBe(true)
    })

    it('should include extractedFrom quote', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = 'Agent: I will process the refund for you.'
      const items = extractActionItems(transcription)

      expect(items.length).toBeGreaterThan(0)
      expect(items[0]!.extractedFrom).toBeTruthy()
    })

    it('should deduplicate similar action items', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = `
        Agent: I will send you an email.
        Agent: I'll send you the email confirmation.
      `
      const items = extractActionItems(transcription)

      // Should not have many duplicates
      expect(items.length).toBeLessThanOrEqual(2)
    })

    it('should have pending status by default', () => {
      const { extractActionItems } = useCallSummary()

      const transcription = 'Agent: I will process this request.'
      const items = extractActionItems(transcription)

      expect(items.every((item) => item.status === 'pending')).toBe(true)
    })
  })

  describe('Topic Extraction', () => {
    it('should extract billing topic', () => {
      const { extractTopics } = useCallSummary()

      const topics = extractTopics(sampleTranscription)

      expect(topics.some((t) => t.topic === 'billing')).toBe(true)
    })

    it('should extract multiple topics', () => {
      const { extractTopics } = useCallSummary()

      const transcription = `
        Caller: I have a billing issue and also need help with my account settings.
        Agent: I can help with both. Let me check your account and the billing charge.
        Agent: I see the billing problem. I'll also update your account settings.
      `
      const topics = extractTopics(transcription)

      expect(topics.some((t) => t.topic === 'billing')).toBe(true)
      expect(topics.some((t) => t.topic === 'account')).toBe(true)
    })

    it('should count topic mentions correctly', () => {
      const { extractTopics } = useCallSummary()

      const transcription = `
        Billing billing billing. Invoice payment charge.
      `
      const topics = extractTopics(transcription)
      const billingTopic = topics.find((t) => t.topic === 'billing')

      expect(billingTopic).toBeDefined()
      expect(billingTopic!.count).toBeGreaterThan(3)
    })

    it('should include excerpts for topics', () => {
      const { extractTopics } = useCallSummary()

      const topics = extractTopics(sampleTranscription)
      const billingTopic = topics.find((t) => t.topic === 'billing')

      expect(billingTopic).toBeDefined()
      expect(billingTopic!.excerpts.length).toBeGreaterThan(0)
    })

    it('should calculate sentiment for topics', () => {
      const { extractTopics } = useCallSummary()

      const negativeTranscription = `
        The billing is terrible. Horrible billing experience. Awful charge.
      `
      const topics = extractTopics(negativeTranscription)
      const billingTopic = topics.find((t) => t.topic === 'billing')

      expect(billingTopic).toBeDefined()
      expect(billingTopic!.sentiment).toBeLessThan(0)
    })

    it('should sort topics by count', () => {
      const { extractTopics } = useCallSummary()

      const transcription = `
        Billing billing billing billing billing.
        Account account.
        Shipping.
      `
      const topics = extractTopics(transcription)

      expect(topics.length).toBeGreaterThan(1)
      expect(topics[0]!.count).toBeGreaterThanOrEqual(topics[1]!.count)
    })
  })

  describe('Call Type Detection', () => {
    it('should detect support call type', () => {
      const { detectCallType } = useCallSummary()

      const callType = detectCallType(sampleTranscription)
      expect(callType).toBe('support')
    })

    it('should detect complaint call type', () => {
      const { detectCallType } = useCallSummary()

      const callType = detectCallType(complaintTranscription)
      expect(callType).toBe('complaint')
    })

    it('should detect sales call type', () => {
      const { detectCallType } = useCallSummary()

      const salesTranscription = `
        Agent: I wanted to tell you about our new pricing plans.
        Caller: What's the cost for the premium package?
        Agent: We have a great discount offer for you. Would you like to purchase today?
      `
      const callType = detectCallType(salesTranscription)
      expect(callType).toBe('sales')
    })

    it('should detect inquiry call type', () => {
      const { detectCallType } = useCallSummary()

      const inquiryTranscription = `
        Caller: I have a question about your services.
        Caller: Can you tell me how does the system work?
        Agent: Let me explain the details for you.
      `
      const callType = detectCallType(inquiryTranscription)
      expect(callType).toBe('inquiry')
    })

    it('should default to general for neutral calls', () => {
      const { detectCallType } = useCallSummary()

      const generalTranscription = 'Hello, how are you today? Great weather we are having.'
      const callType = detectCallType(generalTranscription)
      expect(callType).toBe('general')
    })
  })

  describe('Key Phrase Extraction', () => {
    it('should extract key phrases', () => {
      const { extractKeyPhrases } = useCallSummary()

      const phrases = extractKeyPhrases(sampleTranscription)

      expect(phrases.length).toBeGreaterThan(0)
      expect(Array.isArray(phrases)).toBe(true)
    })

    it('should respect limit parameter', () => {
      const { extractKeyPhrases } = useCallSummary()

      const phrases = extractKeyPhrases(sampleTranscription, 5)

      expect(phrases.length).toBeLessThanOrEqual(5)
    })

    it('should filter out stopwords', () => {
      const { extractKeyPhrases } = useCallSummary()

      const phrases = extractKeyPhrases(sampleTranscription)

      expect(phrases.includes('the')).toBe(false)
      expect(phrases.includes('and')).toBe(false)
      expect(phrases.includes('is')).toBe(false)
    })

    it('should prioritize domain-specific keywords', () => {
      const { extractKeyPhrases } = useCallSummary()

      const transcription = 'Billing issue with refund. Need billing help. Refund processing.'
      const phrases = extractKeyPhrases(transcription)

      // Billing and refund should be prominent
      expect(phrases.some((p) => p === 'billing' || p === 'refund')).toBe(true)
    })
  })

  describe('Sentiment Estimation', () => {
    it('should estimate positive sentiment', () => {
      const { estimateSentiment } = useCallSummary()

      const positiveTranscription =
        'Thank you so much! This is excellent. I am very happy and satisfied with the service.'
      const sentiment = estimateSentiment(positiveTranscription)

      expect(sentiment.overall).toBeGreaterThan(0)
    })

    it('should estimate negative sentiment', () => {
      const { estimateSentiment } = useCallSummary()

      const sentiment = estimateSentiment(complaintTranscription)

      expect(sentiment.overall).toBeLessThan(0)
    })

    it('should detect improving sentiment trend', () => {
      const { estimateSentiment } = useCallSummary()

      const improvingTranscription = `
        Caller: I am very frustrated and angry about this terrible problem.
        Agent: I understand, let me help you.
        Agent: I've fixed the issue for you.
        Caller: Thank you! That's excellent. I'm very happy now!
      `
      const sentiment = estimateSentiment(improvingTranscription)

      expect(sentiment.start).toBeLessThan(sentiment.end)
      expect(sentiment.trend).toBe('improved')
    })

    it('should detect declining sentiment trend', () => {
      const { estimateSentiment } = useCallSummary()

      const decliningTranscription = `
        Caller: Hello, I have a question. Thank you for your help.
        Agent: Sure, let me check.
        Caller: This is taking too long. I'm getting frustrated.
        Caller: This is unacceptable! I'm very disappointed and angry.
      `
      const sentiment = estimateSentiment(decliningTranscription)

      expect(sentiment.end).toBeLessThan(sentiment.start)
      expect(sentiment.trend).toBe('declined')
    })

    it('should detect stable sentiment trend', () => {
      const { estimateSentiment } = useCallSummary()

      // Use neutral text throughout to ensure stable trend
      const stableTranscription = `
        Caller: Hello, I have a question about shipping.
        Agent: Sure, I can look that up for you.
        Caller: I was wondering when my order will arrive.
        Agent: Let me check the tracking. It should arrive soon.
      `
      const sentiment = estimateSentiment(stableTranscription)

      expect(sentiment.trend).toBe('stable')
    })

    it('should handle empty transcription', () => {
      const { estimateSentiment } = useCallSummary()

      const sentiment = estimateSentiment('')

      expect(sentiment.overall).toBe(0)
      expect(sentiment.trend).toBe('stable')
    })
  })

  describe('Format Summary', () => {
    it('should format as paragraph', async () => {
      const { generateSummary, formatSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)
      const formatted = formatSummary(result, 'paragraph')

      expect(typeof formatted).toBe('string')
      expect(formatted).toBe(result.summary)
    })

    it('should format as bullet-points', async () => {
      const { generateSummary, formatSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)
      const formatted = formatSummary(result, 'bullet-points')

      expect(formatted).toContain('-')
      expect(formatted).toContain('Summary')
    })

    it('should format as structured', async () => {
      const { generateSummary, formatSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)
      const formatted = formatSummary(result, 'structured')

      expect(formatted).toContain('CALL SUMMARY')
      expect(formatted).toContain('SENTIMENT')
    })

    it('should include action items in structured format', async () => {
      const { generateSummary, formatSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)
      const formatted = formatSummary(result, 'structured')

      if (result.actionItems.length > 0) {
        expect(formatted).toContain('ACTION ITEMS')
      }
    })
  })

  describe('Export Functions', () => {
    describe('exportAsText', () => {
      it('should export summary as plain text', async () => {
        const { generateSummary, exportAsText } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const text = exportAsText(result)

        expect(text).toContain('CALL SUMMARY REPORT')
        expect(text).toContain('SUMMARY')
        expect(text).toContain('SENTIMENT')
      })

      it('should include all sections in text export', async () => {
        const { generateSummary, exportAsText } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const text = exportAsText(result)

        expect(text).toContain('CALL DETAILS')
        expect(text).toContain('Type:')
        expect(text).toContain('Duration:')
      })

      it('should include action items in text export', async () => {
        const { generateSummary, exportAsText } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const text = exportAsText(result)

        if (result.actionItems.length > 0) {
          expect(text).toContain('ACTION ITEMS')
        }
      })
    })

    describe('exportAsJSON', () => {
      it('should export summary as valid JSON', async () => {
        const { generateSummary, exportAsJSON } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const json = exportAsJSON(result)

        const parsed = JSON.parse(json)
        expect(parsed).toEqual(result)
      })

      it('should be prettified JSON', async () => {
        const { generateSummary, exportAsJSON } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const json = exportAsJSON(result)

        expect(json).toContain('\n')
        expect(json).toContain('  ')
      })
    })

    describe('exportAsHTML', () => {
      it('should export summary as valid HTML', async () => {
        const { generateSummary, exportAsHTML } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const html = exportAsHTML(result)

        expect(html).toContain('<!DOCTYPE html>')
        expect(html).toContain('<html')
        expect(html).toContain('</html>')
      })

      it('should include title', async () => {
        const { generateSummary, exportAsHTML } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const html = exportAsHTML(result)

        expect(html).toContain('<title>Call Summary Report</title>')
      })

      it('should include sentiment with styling', async () => {
        const { generateSummary, exportAsHTML } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const html = exportAsHTML(result)

        expect(html).toContain('sentiment')
      })

      it('should include action items with priority styling', async () => {
        const { generateSummary, exportAsHTML } = useCallSummary()

        const result = await generateSummary(sampleTranscription)
        const html = exportAsHTML(result)

        if (result.actionItems.length > 0) {
          expect(html).toContain('action-item')
        }
      })

      it('should escape HTML in content', async () => {
        const { generateSummary, exportAsHTML } = useCallSummary()

        const xssTranscription = 'Agent: Please check <script>alert("xss")</script>'
        const result = await generateSummary(xssTranscription)
        const html = exportAsHTML(result)

        expect(html).not.toContain('<script>alert')
        expect(html).toContain('&lt;script&gt;')
      })
    })
  })

  describe('Speaker Breakdown', () => {
    it('should calculate speaker breakdown', async () => {
      const { generateSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)

      if (result.speakerBreakdown) {
        expect(result.speakerBreakdown.agent).toBeDefined()
        expect(result.speakerBreakdown.caller).toBeDefined()
        expect(result.speakerBreakdown.agent + result.speakerBreakdown.caller).toBe(100)
      }
    })

    it('should return undefined for unparseable transcription', async () => {
      const { generateSummary } = useCallSummary()

      const noSpeakerTranscription = 'Hello world. This is a test.'
      const result = await generateSummary(noSpeakerTranscription)

      expect(result.speakerBreakdown).toBeUndefined()
    })
  })

  describe('Duration Estimation', () => {
    it('should estimate duration based on word count', async () => {
      const { generateSummary } = useCallSummary()

      const result = await generateSummary(sampleTranscription)

      expect(result.duration).toBeGreaterThan(0)
    })

    it('should estimate longer duration for longer transcription', async () => {
      const { generateSummary } = useCallSummary()

      const shortResult = await generateSummary('Hello. Goodbye.')
      const longResult = await generateSummary(sampleTranscription)

      expect(longResult.duration).toBeGreaterThan(shortResult.duration)
    })
  })

  describe('Error Handling', () => {
    it('should set error state on failure', async () => {
      const failingSummarizer = vi.fn(async () => {
        throw new Error('Summarization failed')
      })

      const { generateSummary, error } = useCallSummary({
        summarizer: failingSummarizer,
      })

      await expect(generateSummary('test')).rejects.toThrow('Summarization failed')
      expect(error.value).toBe('Summarization failed')
    })

    it('should reset isGenerating on error', async () => {
      const failingSummarizer = vi.fn(async () => {
        throw new Error('Summarization failed')
      })

      const { generateSummary, isGenerating } = useCallSummary({
        summarizer: failingSummarizer,
      })

      try {
        await generateSummary('test')
      } catch {
        // Expected
      }

      expect(isGenerating.value).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should handle real-world support call', async () => {
      const { generateSummary } = useCallSummary()

      const realWorldTranscription = `
        Agent: Thank you for calling ABC Support. My name is Sarah. How can I assist you today?
        Caller: Hi Sarah. I've been having problems with my internet connection for the past two days.
        Agent: I'm sorry to hear that. Let me pull up your account. Can you describe what's happening?
        Caller: It keeps disconnecting every few hours. It's very frustrating because I work from home.
        Agent: I understand how frustrating that must be. Let me run some diagnostics on your connection.
        Agent: I can see there's been some instability on your line. I'll schedule a technician visit.
        Agent: I will have someone come out tomorrow between 9 AM and 12 PM. Does that work for you?
        Caller: Yes, that works. Please make sure they call before coming.
        Agent: Absolutely. I'll add a note for the technician to call you 30 minutes before arrival.
        Agent: Is there anything else I can help you with today?
        Caller: No, that's all. Thank you for your help, Sarah.
        Agent: You're welcome! Have a great day, and we'll get your connection fixed tomorrow.
      `

      const result = await generateSummary(realWorldTranscription)

      expect(result.callType).toBe('support')
      expect(result.actionItems.length).toBeGreaterThan(0)
      expect(result.topics.some((t) => t.topic === 'technical')).toBe(true)
      expect(result.sentiment.trend).toBe('stable')
    })

    it('should handle escalated complaint call', async () => {
      const { generateSummary } = useCallSummary()

      const result = await generateSummary(complaintTranscription)

      expect(result.callType).toBe('complaint')
      expect(result.sentiment.overall).toBeLessThan(0)
      expect(result.actionItems.length).toBeGreaterThan(0)
    })
  })
})
