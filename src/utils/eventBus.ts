import type { BaseEvent, EventMap } from '@/types/events.types'

export interface TypedEventBus<EM extends Record<string, BaseEvent> = EventMap> {
  on<K extends Extract<keyof EM, string>>(
    event: K,
    cb: (event: EM[K]) => void
  ): string | number | void
  off(event: string, idOrCb: unknown): void
  emit<K extends Extract<keyof EM, string>>(event: K, payload: EM[K]): void
}

export function toEventBus<EM extends Record<string, BaseEvent> = EventMap>(
  obj: unknown
): TypedEventBus<EM> | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const on = o.on
  const off = o.off
  const emit = o.emit
  if (typeof on === 'function' && typeof off === 'function' && typeof emit === 'function') {
    return o as unknown as TypedEventBus<EM>
  }
  return null
}
