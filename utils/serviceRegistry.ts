// utils/serviceRegistry.ts
import SpotifyPolling from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'

interface ServiceRegistry {
  spotifyService: SpotifyPolling
  tabataService: TabataTimer
}

const registry: Partial<ServiceRegistry> = {}

export function registerService<K extends keyof ServiceRegistry>(
  name: K,
  service: ServiceRegistry[K]
): void {
  console.log(`Registering service: ${name}`)
  registry[name] = service
}

export function getService<K extends keyof ServiceRegistry>(
  name: K
): ServiceRegistry[K] {
  console.log(`Requesting service: ${name}`)
  const service = registry[name]
  if (!service) {
    throw new Error(`Service ${name} not found.`)
  }
  return service
}
