/**
 * Unit tests for useE911Locations (internal E911 location CRUD composable).
 * Direct coverage for location state and CRUD; useSipE911 tests cover integration.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useE911Locations } from '@/composables/useE911Locations'

describe('useE911Locations', () => {
  let locations: ReturnType<typeof useE911Locations>

  beforeEach(() => {
    locations = useE911Locations()
  })

  describe('initial state', () => {
    it('should start with empty locations', () => {
      expect(locations.locationList.value).toHaveLength(0)
      expect(locations.defaultLocation.value).toBeNull()
    })
  })

  describe('addLocation', () => {
    it('should add a location with generated id and lastUpdated', () => {
      const loc = locations.addLocation({
        name: 'Main Office',
        type: 'civic',
        extensions: ['1001', '1002'],
        isDefault: true,
        isVerified: false,
      })
      expect(loc.id).toBeDefined()
      expect(loc.name).toBe('Main Office')
      expect(loc.lastUpdated).toBeInstanceOf(Date)
      expect(locations.locationList.value).toHaveLength(1)
      expect(locations.defaultLocation.value?.id).toBe(loc.id)
    })

    it('should sanitize location name', () => {
      const loc = locations.addLocation({
        name: '  Script <script>  ',
        type: 'civic',
        extensions: [],
        isDefault: false,
        isVerified: false,
      })
      expect(loc.name).not.toContain('<')
      expect(loc.name).toBeTruthy()
    })

    it('should clear isDefault on others when adding default', () => {
      const a = locations.addLocation({
        name: 'A',
        type: 'civic',
        extensions: [],
        isDefault: true,
        isVerified: false,
      })
      const b = locations.addLocation({
        name: 'B',
        type: 'civic',
        extensions: [],
        isDefault: true,
        isVerified: false,
      })
      expect(locations.getLocation(a.id)?.isDefault).toBe(false)
      expect(locations.getLocation(b.id)?.isDefault).toBe(true)
    })
  })

  describe('updateLocation', () => {
    it('should update and return true', () => {
      const loc = locations.addLocation({
        name: 'Office',
        type: 'civic',
        extensions: ['1001'],
        isDefault: false,
        isVerified: false,
      })
      const ok = locations.updateLocation(loc.id, { name: 'Updated Office', isVerified: true })
      expect(ok).toBe(true)
      expect(locations.getLocation(loc.id)?.name).toBe('Updated Office')
      expect(locations.getLocation(loc.id)?.isVerified).toBe(true)
    })

    it('should return false for unknown id', () => {
      expect(locations.updateLocation('unknown-id', { name: 'X' })).toBe(false)
    })

    it('should set new default and clear others', () => {
      const a = locations.addLocation({
        name: 'A',
        type: 'civic',
        extensions: [],
        isDefault: true,
        isVerified: false,
      })
      const b = locations.addLocation({
        name: 'B',
        type: 'civic',
        extensions: [],
        isDefault: false,
        isVerified: false,
      })
      locations.updateLocation(b.id, { isDefault: true })
      expect(locations.getLocation(a.id)?.isDefault).toBe(false)
      expect(locations.getLocation(b.id)?.isDefault).toBe(true)
    })
  })

  describe('removeLocation', () => {
    it('should remove and return true', () => {
      const loc = locations.addLocation({
        name: 'To Remove',
        type: 'civic',
        extensions: [],
        isDefault: false,
        isVerified: false,
      })
      expect(locations.removeLocation(loc.id)).toBe(true)
      expect(locations.getLocation(loc.id)).toBeNull()
      expect(locations.locationList.value).toHaveLength(0)
    })

    it('should return false for unknown id', () => {
      expect(locations.removeLocation('unknown-id')).toBe(false)
    })
  })

  describe('setDefaultLocation', () => {
    it('should set default and return true', () => {
      const loc = locations.addLocation({
        name: 'Loc',
        type: 'civic',
        extensions: [],
        isDefault: false,
        isVerified: false,
      })
      expect(locations.setDefaultLocation(loc.id)).toBe(true)
      expect(locations.defaultLocation.value?.id).toBe(loc.id)
    })

    it('should return false for unknown id', () => {
      expect(locations.setDefaultLocation('unknown-id')).toBe(false)
    })
  })

  describe('getLocation', () => {
    it('should return location by id', () => {
      const loc = locations.addLocation({
        name: 'X',
        type: 'civic',
        extensions: [],
        isDefault: false,
        isVerified: false,
      })
      expect(locations.getLocation(loc.id)).toEqual(loc)
    })

    it('should return null for unknown id', () => {
      expect(locations.getLocation('unknown-id')).toBeNull()
    })
  })

  describe('getLocationForExtension', () => {
    it('should return location that has the extension', () => {
      const loc = locations.addLocation({
        name: 'With Ext',
        type: 'civic',
        extensions: ['2001', '2002'],
        isDefault: false,
        isVerified: false,
      })
      expect(locations.getLocationForExtension('2001')?.id).toBe(loc.id)
      expect(locations.getLocationForExtension('2002')?.id).toBe(loc.id)
    })

    it('should return default when extension not in any location', () => {
      const def = locations.addLocation({
        name: 'Default',
        type: 'civic',
        extensions: [],
        isDefault: true,
        isVerified: false,
      })
      expect(locations.getLocationForExtension('9999')?.id).toBe(def.id)
    })

    it('should return null for invalid extension', () => {
      locations.addLocation({
        name: 'A',
        type: 'civic',
        extensions: ['1001'],
        isDefault: true,
        isVerified: false,
      })
      expect(locations.getLocationForExtension('')).toBeNull()
      expect(locations.getLocationForExtension('ab!')).toBeNull()
    })
  })
})
