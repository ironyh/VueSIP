/**
 * AI Service for Transcription Demo
 * Provides mock responses for demos and optional real API integration
 */

import type { TranscriptEntry } from '@/types/transcription.types'
import type { Scenario } from './scenarios'

export interface AISuggestion {
  id: string
  type: 'tip' | 'warning' | 'success' | 'sentiment'
  message: string
  timestamp: number
  source: 'mock' | 'api'
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative'
  confidence: number
  indicators: string[]
}

export interface AIServiceConfig {
  apiKey?: string
  provider: 'mock' | 'openai' | 'anthropic'
  model?: string
}

const API_KEY_STORAGE_KEY = 'vuesip-demo-ai-api-key'
const API_PROVIDER_STORAGE_KEY = 'vuesip-demo-ai-provider'

/**
 * Load saved API configuration from localStorage
 */
export function loadSavedConfig(): AIServiceConfig {
  const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || undefined
  const provider =
    (localStorage.getItem(API_PROVIDER_STORAGE_KEY) as AIServiceConfig['provider']) || 'mock'
  return { apiKey, provider }
}

/**
 * Save API configuration to localStorage
 * WARNING: API keys are stored in localStorage for demo purposes.
 * In production, use secure backend storage.
 */
export function saveConfig(config: AIServiceConfig): void {
  if (config.apiKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, config.apiKey)
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY)
  }
  localStorage.setItem(API_PROVIDER_STORAGE_KEY, config.provider)
}

/**
 * Clear saved API configuration
 */
export function clearConfig(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
  localStorage.removeItem(API_PROVIDER_STORAGE_KEY)
}

/**
 * Get mock coaching suggestions based on scenario
 */
export function getMockSuggestions(scenario: Scenario, currentLineIndex: number): AISuggestion[] {
  return scenario.aiCoaching
    .filter((coach) => coach.triggerAfterLine <= currentLineIndex)
    .map((coach, index) => ({
      id: `mock-${scenario.id}-${index}`,
      type: coach.type,
      message: coach.message,
      timestamp: Date.now(),
      source: 'mock' as const,
    }))
}

/**
 * Analyze sentiment from transcript (mock implementation)
 */
export function getMockSentiment(entries: TranscriptEntry[]): SentimentAnalysis {
  const text = entries.map((e) => e.text.toLowerCase()).join(' ')

  const negativeWords = [
    'frustrated',
    'cancel',
    'angry',
    'disappointed',
    'expensive',
    'problem',
    'issue',
  ]
  const positiveWords = ['thank', 'great', 'perfect', 'appreciate', 'excellent', 'helpful', 'good']

  const negativeCount = negativeWords.filter((w) => text.includes(w)).length
  const positiveCount = positiveWords.filter((w) => text.includes(w)).length

  const indicators: string[] = []
  if (text.includes('frustrated')) indicators.push('Customer expressed frustration')
  if (text.includes('cancel')) indicators.push('Cancellation intent detected')
  if (text.includes('thank')) indicators.push('Customer showed appreciation')
  if (text.includes('perfect') || text.includes('great'))
    indicators.push('Positive feedback received')

  let overall: SentimentAnalysis['overall'] = 'neutral'
  let confidence = 0.7

  if (positiveCount > negativeCount + 1) {
    overall = 'positive'
    confidence = 0.8 + positiveCount * 0.02
  } else if (negativeCount > positiveCount) {
    overall = 'negative'
    confidence = 0.75 + negativeCount * 0.03
  }

  return {
    overall,
    confidence: Math.min(confidence, 0.95),
    indicators,
  }
}

/**
 * Call real AI API for analysis
 */
export async function getAISuggestions(
  config: AIServiceConfig,
  transcript: TranscriptEntry[],
  context: { scenario?: string; localRole?: string }
): Promise<AISuggestion[]> {
  if (config.provider === 'mock' || !config.apiKey) {
    return []
  }

  const transcriptText = transcript
    .map((e) => `${e.speaker === 'local' ? context.localRole || 'Agent' : 'Customer'}: ${e.text}`)
    .join('\n')

  const systemPrompt = `You are a real-time call coaching assistant. Analyze this call transcript and provide 1-2 brief, actionable coaching suggestions. Be concise (max 15 words per suggestion). Focus on: empathy, problem-solving, and next steps.${context.scenario ? ` Context: ${context.scenario} industry call.` : ''}`

  try {
    if (config.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcriptText },
          ],
          max_tokens: 150,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''

      return content
        .split('\n')
        .filter(Boolean)
        .map((msg: string, i: number) => ({
          id: `api-${Date.now()}-${i}`,
          type: 'tip' as const,
          message: msg.replace(/^[-•*]\s*/, '').trim(),
          timestamp: Date.now(),
          source: 'api' as const,
        }))
    }

    if (config.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-haiku-20240307',
          max_tokens: 150,
          system: systemPrompt,
          messages: [{ role: 'user', content: transcriptText }],
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.content[0]?.text || ''

      return content
        .split('\n')
        .filter(Boolean)
        .map((msg: string, i: number) => ({
          id: `api-${Date.now()}-${i}`,
          type: 'tip' as const,
          message: msg.replace(/^[-•*]\s*/, '').trim(),
          timestamp: Date.now(),
          source: 'api' as const,
        }))
    }
  } catch (error) {
    console.error('AI API error:', error)
    return [
      {
        id: `error-${Date.now()}`,
        type: 'warning',
        message: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        source: 'api',
      },
    ]
  }

  return []
}
