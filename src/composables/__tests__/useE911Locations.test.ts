/**
 * useE911Locations composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useE911Locations } from '../useE911Locations'
import type { E911Location } from '@/types/e911.types'

describe('useE911Locations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createLocationData = (
    overrides?: Partial<E911Location>
  ): Omit<E911Location, 'id' | 'lastUpdated'> => ({
    name: 'Test Location',
    type: 'business',
    isDefault: false,
    isVerified: true,
    extensions: ['1001'],
    civic: {
      country: 'US',
      state: 'CA',
      city: 'Los Angeles',
      street: '123 Main St',
      unit: 'Suite 100',
      postalCode: '90001',
    },
    ...overrides,
  })

  describe('initial state', () => {
    it('should return empty locations map', () => {
      const { locations } = useE911Locations()
      expect(locations.value.size).toBe(0)
    })

    it('should return empty location list', () => {
      const { locationList } = useE911Locations()
      expect(locationList.value).toEqual([])
    })

    it('should return null for default location when empty', () => {
      const { defaultLocation } = useE911Locations()
      expect(defaultLocation.value).toBeNull()
    })
  })

  describe('addLocation', () => {
    it('should add a new location', () => {
      const { addLocation, locationList, locations } = useE911Locations()
      const locationData = createLocationData({ name: 'Office HQ' })

      const added = addLocation(locationData)

      expect(added).toBeDefined()
      expect(added.name).toBe('Office HQ')
      expect(added.id).toBeDefined()
      expect(added.lastUpdated).toEqual(new Date('2026-01-01T00:00:00Z'))
      expect(locations.value.size).toBe(1)
      expect(locationList.value.length).toBe(1)
    })

    it('should sanitize location name', () => {
      const { addLocation, locationList } = useE911Locations()
      const locationData = createLocationData({ name: '  Test <script>  ' })

      addLocation(locationData)

      expect(locationList.value[0].name).toBe('Test script')
    })

    it('should set location as default when isDefault is true', () => {
      const { addLocation, defaultLocation } = useE911Locations()
      const locationData = createLocationData({ isDefault: true })

      addLocation(locationData)

      expect(defaultLocation.value).not.toBeNull()
      expect(defaultLocation.value?.name).toBe('Test Location')
    })

    it('should clear other defaults when adding a new default', () => {
      const { addLocation, locationList } = useE911Locations()

      addLocation(createLocationData({ name: 'Location 1', isDefault: true }))
      addLocation(createLocationData({ name: 'Location 2', isDefault: true }))

      const locations = locationList.value
      expect(locations.find((l) => l.isDefault)?.name).toBe('Location 2')
      expect(locations.filter((l) => l.isDefault).length).toBe(1)
    })
  })

  describe('updateLocation', () => {
    it('should update existing location', () => {
      const { addLocation, updateLocation, getLocation } = useE911Locations()
      const location = addLocation(createLocationData({ name: 'Original Name' }))

      const updated = updateLocation(location.id, { name: 'Updated Name' })

      expect(updated).toBe(true)
      expect(getLocation(location.id)?.name).toBe('Updated Name')
    })

    it('should return false for non-existent location', () => {
      const { updateLocation } = useE911Locations()

      const result = updateLocation('non-existent-id', { name: 'New Name' })

      expect(result).toBe(false)
    })

    it('should clear other defaults when setting a new default', () => {
      const { addLocation, updateLocation, locationList } = useE911Locations()
      const loc1 = addLocation(createLocationData({ name: 'Loc 1', isDefault: true }))
      const loc2 = addLocation(createLocationData({ name: 'Loc 2' }))

      updateLocation(loc2.id, { isDefault: true })

      const locations = locationList.value
      expect(locations.find((l) => l.id === loc2.id)?.isDefault).toBe(true)
      expect(locations.find((l) => l.id === loc1.id)?.isDefault).toBe(false)
    })

    it('should sanitize name when updating', () => {
      const { addLocation, updateLocation, getLocation } = useE911Locations()
      const location = addLocation(createLocationData())

      updateLocation(location.id, { name: '  Updated <bad>  ' })

      expect(getLocation(location.id)?.name).toBe('Updated bad')
    })
  })

  describe('removeLocation', () => {
    it('should remove location by id', () => {
      const { addLocation, removeLocation, locations, locationList } = useE911Locations()
      const location = addLocation(createLocationData())

      const removed = removeLocation(location.id)

      expect(removed).toBe(true)
      expect(locations.value.size).toBe(0)
      expect(locationList.value.length).toBe(0)
    })

    it('should return false for non-existent location', () => {
      const { removeLocation } = useE911Locations()

      const result = removeLocation('non-existent-id')

      expect(result).toBe(false)
    })
  })

  describe('setDefaultLocation', () => {
    it('should set location as default', () => {
      const { addLocation, setDefaultLocation, defaultLocation } = useE911Locations()
      const location = addLocation(createLocationData())

      const result = setDefaultLocation(location.id)

      expect(result).toBe(true)
      expect(defaultLocation.value?.id).toBe(location.id)
    })

    it('should return false for non-existent location', () => {
      const { setDefaultLocation } = useE911Locations()

      const result = setDefaultLocation('non-existent-id')

      expect(result).toBe(false)
    })

    it('should clear other defaults', () => {
      const { addLocation, setDefaultLocation, locationList } = useE911Locations()
      const loc1 = addLocation(createLocationData({ name: 'Loc 1', isDefault: true }))
      const loc2 = addLocation(createLocationData({ name: 'Loc 2' }))

      setDefaultLocation(loc2.id)

      const locations = locationList.value
      expect(locations.find((l) => l.id === loc1.id)?.isDefault).toBe(false)
      expect(locations.find((l) => l.id === loc2.id)?.isDefault).toBe(true)
    })
  })

  describe('getLocation', () => {
    it('should return location by id', () => {
      const { addLocation, getLocation } = useE911Locations()
      const location = addLocation(createLocationData({ name: 'Find Me' }))

      const found = getLocation(location.id)

      expect(found).not.toBeNull()
      expect(found?.name).toBe('Find Me')
    })

    it('should return null for non-existent id', () => {
      const { getLocation } = useE911Locations()

      const found = getLocation('non-existent')

      expect(found).toBeNull()
    })
  })

  describe('getLocationForExtension', () => {
    it('should find location by extension', () => {
      const { addLocation, getLocationForExtension } = useE911Locations()
      addLocation(createLocationData({ extensions: ['1001', '1002'] }))

      const found = getLocationForExtension('1002')

      expect(found).not.toBeNull()
      expect(found?.name).toBe('Test Location')
    })

    it('should return null for invalid extension', () => {
      const { addLocation, getLocationForExtension } = useE911Locations()
      addLocation(createLocationData({ extensions: ['1001'] }))

      const found = getLocationForExtension('invalid!')

      expect(found).toBeNull()
    })

    it('should return default location when extension not found', () => {
      const { addLocation, getLocationForExtension } = useE911Locations()
      addLocation(createLocationData({ name: 'Default Loc', isDefault: true, extensions: [] }))
      addLocation(createLocationData({ name: 'Other Loc', extensions: ['2001'] }))

      const found = getLocationForExtension('9999')

      expect(found?.name).toBe('Default Loc')
    })

    it('should return null when no default and extension not found', () => {
      const { addLocation, getLocationForExtension } = useE911Locations()
      addLocation(
        createLocationData({ name: 'Non-default', extensions: ['1001'], isDefault: false })
      )

      const found = getLocationForExtension('9999')

      expect(found).toBeNull()
    })
  })
})
