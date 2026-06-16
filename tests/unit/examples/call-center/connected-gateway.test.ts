import { describe, expect, it } from 'vitest'
import type { QueueEntry, QueueInfo } from '../../../../src/types/ami.types'
import type { QueuedCallView } from '../../../../examples/call-center/src/features/shared/mvp-types'
import {
  flattenQueueEntries,
  mapQueueEntryToQueuedCall,
} from '../../../../examples/call-center/src/features/shared/connected-gateway'

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    queue: 'support',
    position: 1,
    channel: 'PJSIP/1001-abc',
    uniqueId: '12345.6',
    callerIdNum: '46701234567',
    callerIdName: 'Erik Eriksson',
    connectedLineNum: '',
    connectedLineName: '',
    wait: 42,
    priority: 1,
    ...overrides,
  }
}

function makeQueue(overrides: Partial<QueueInfo> = {}): QueueInfo {
  return {
    name: 'support',
    strategy: 'ringall',
    calls: 0,
    holdtime: 0,
    talktime: 0,
    completed: 0,
    abandoned: 0,
    serviceLevelPerf: 0,
    serviceLevelPerf2: 0,
    weight: 0,
    members: [],
    entries: [],
    lastUpdated: new Date(),
    ...overrides,
  }
}

describe('connected-gateway mappers', () => {
  describe('mapQueueEntryToQueuedCall', () => {
    it('maps an AMI QueueEntry to a QueuedCallView', () => {
      const entry = makeEntry()
      const view: QueuedCallView = mapQueueEntryToQueuedCall(entry)

      expect(view.id).toBe('12345.6')
      expect(view.from).toBe('46701234567')
      expect(view.displayName).toBe('Erik Eriksson')
      expect(view.waitTime).toBe(42)
      expect(view.priority).toBe(1)
      expect(view.queue).toBe('support')
    })

    it('rounds fractional wait times to whole seconds', () => {
      const entry = makeEntry({ wait: 12.7 })
      expect(mapQueueEntryToQueuedCall(entry).waitTime).toBe(13)
    })

    it('falls back to channel when uniqueId is empty', () => {
      const entry = makeEntry({ uniqueId: '', channel: 'PJSIP/2002-xyz' })
      expect(mapQueueEntryToQueuedCall(entry).id).toBe('PJSIP/2002-xyz')
    })

    it('falls back to channel when callerIdNum is empty', () => {
      const entry = makeEntry({ callerIdNum: '', channel: 'PJSIP/2002-xyz' })
      expect(mapQueueEntryToQueuedCall(entry).from).toBe('PJSIP/2002-xyz')
    })

    it('omits displayName when callerIdName is empty', () => {
      const entry = makeEntry({ callerIdName: '' })
      expect(mapQueueEntryToQueuedCall(entry).displayName).toBeUndefined()
    })
  })

  describe('flattenQueueEntries', () => {
    it('returns an empty array for an empty queue map', () => {
      expect(flattenQueueEntries(new Map())).toEqual([])
    })

    it('flattens entries across multiple queues', () => {
      const queues = new Map<string, QueueInfo>([
        [
          'support',
          makeQueue({
            name: 'support',
            entries: [makeEntry({ uniqueId: '1', queue: 'support', wait: 10 })],
          }),
        ],
        [
          'billing',
          makeQueue({
            name: 'billing',
            entries: [makeEntry({ uniqueId: '2', queue: 'billing', wait: 30 })],
          }),
        ],
      ])

      const flat = flattenQueueEntries(queues)
      expect(flat).toHaveLength(2)
      expect(flat.map((c) => c.id).sort()).toEqual(['1', '2'])
    })

    it('sorts by wait time descending (longest-waiting first)', () => {
      const queues = new Map<string, QueueInfo>([
        [
          'support',
          makeQueue({
            name: 'support',
            entries: [
              makeEntry({ uniqueId: 'short', wait: 5 }),
              makeEntry({ uniqueId: 'long', wait: 120 }),
              makeEntry({ uniqueId: 'mid', wait: 45 }),
            ],
          }),
        ],
      ])

      const flat = flattenQueueEntries(queues)
      expect(flat.map((c) => c.id)).toEqual(['long', 'mid', 'short'])
    })
  })
})
