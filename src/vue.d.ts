/**
 * Vue Type Augmentation
 *
 * This file augments Vue's ComponentCustomProperties to include the $vuesip plugin.
 * This augmentation will be available to consumers of the library who have Vue installed.
 */

import type { VueSipOptions } from './types/config.types'
import type { createLogger } from './utils/logger'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    /**
     * VueSip plugin instance
     */
    $vuesip: {
      version: string
      options: VueSipOptions
      logger: ReturnType<typeof createLogger>
    }
  }
}

export {}
