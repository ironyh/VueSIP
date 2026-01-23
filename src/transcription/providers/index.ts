/**
 * Transcription Providers Module
 * @packageDocumentation
 */

import { providerRegistry } from './registry'
import { WebSpeechProvider } from './web-speech'

/**
 * Auto-register the default web-speech provider.
 *
 * This ensures the default provider is available without requiring manual
 * registration in templates/components. The provider is registered with a
 * factory function, so no instances are created until actually needed.
 *
 * @remarks
 * The guard check prevents double registration if this module is imported
 * multiple times or if someone manually registers the provider.
 */
if (!providerRegistry.has('web-speech')) {
  providerRegistry.register('web-speech', () => new WebSpeechProvider())
}

export { ProviderRegistry, providerRegistry } from './registry'
export { WebSpeechProvider } from './web-speech'
export { WhisperProvider, type WhisperProviderOptions } from './whisper'
