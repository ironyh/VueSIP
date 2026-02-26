/**
 * Internal E911 location state and CRUD composable.
 * Used by useSipE911; not part of the public API.
 *
 * @internal
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { E911Location } from '@/types/e911.types'
import { sanitizeInput, generateE911Id, isValidExtension } from '@/utils/e911'

export interface UseE911LocationsReturn {
  locations: Ref<Map<string, E911Location>>
  locationList: ComputedRef<E911Location[]>
  defaultLocation: ComputedRef<E911Location | null>
  addLocation: (locationData: Omit<E911Location, 'id' | 'lastUpdated'>) => E911Location
  updateLocation: (locationId: string, updates: Partial<E911Location>) => boolean
  removeLocation: (locationId: string) => boolean
  setDefaultLocation: (locationId: string) => boolean
  getLocation: (locationId: string) => E911Location | null
  getLocationForExtension: (extension: string) => E911Location | null
}

/**
 * Location state and CRUD. No logging; caller (useSipE911) is responsible for compliance logs.
 */
export function useE911Locations(): UseE911LocationsReturn {
  const locations = ref<Map<string, E911Location>>(new Map())

  const locationList = computed(() => Array.from(locations.value.values()))

  const defaultLocation = computed(() => locationList.value.find((loc) => loc.isDefault) || null)

  function addLocation(locationData: Omit<E911Location, 'id' | 'lastUpdated'>): E911Location {
    const location: E911Location = {
      ...locationData,
      id: generateE911Id(),
      name: sanitizeInput(locationData.name),
      lastUpdated: new Date(),
    }

    if (location.isDefault) {
      for (const loc of locations.value.values()) {
        loc.isDefault = false
      }
    }

    locations.value.set(location.id, location)
    return location
  }

  function updateLocation(locationId: string, updates: Partial<E911Location>): boolean {
    const location = locations.value.get(locationId)
    if (!location) return false

    if (updates.isDefault) {
      for (const loc of locations.value.values()) {
        if (loc.id !== locationId) {
          loc.isDefault = false
        }
      }
    }

    const sanitizedUpdates = updates.name
      ? { ...updates, name: sanitizeInput(updates.name) }
      : updates

    Object.assign(location, sanitizedUpdates, { lastUpdated: new Date() })
    return true
  }

  function removeLocation(locationId: string): boolean {
    const location = locations.value.get(locationId)
    if (!location) return false

    locations.value.delete(locationId)
    return true
  }

  function setDefaultLocation(locationId: string): boolean {
    const location = locations.value.get(locationId)
    if (!location) return false

    for (const loc of locations.value.values()) {
      loc.isDefault = loc.id === locationId
    }
    return true
  }

  function getLocation(locationId: string): E911Location | null {
    return locations.value.get(locationId) || null
  }

  function getLocationForExtension(extension: string): E911Location | null {
    if (!isValidExtension(extension)) return null

    for (const location of locations.value.values()) {
      if (location.extensions.includes(extension)) {
        return location
      }
    }

    return defaultLocation.value
  }

  return {
    locations,
    locationList,
    defaultLocation,
    addLocation,
    updateLocation,
    removeLocation,
    setDefaultLocation,
    getLocation,
    getLocationForExtension,
  }
}
