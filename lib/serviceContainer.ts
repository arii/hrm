// File: lib/serviceContainer.ts
/**
 * A simple dependency injection container for managing service instances.
 * This allows services to be decoupled from their instantiation and from each other,
 * making them easier to test in isolation.
 */
import { SpotifyService } from '../types/interfaces'
import TabataTimer from '../services/tabataTimer'

// Define a type for the service registry
export interface ServiceRegistry {
  spotifyService: SpotifyService
  tabataService: TabataTimer
}

class ServiceContainer {
  private services: Partial<ServiceRegistry> = {}

  public register<K extends keyof ServiceRegistry>(
    key: K,
    instance: ServiceRegistry[K]
  ): void {
    this.services[key] = instance
  }

  public get<K extends keyof ServiceRegistry>(key: K): ServiceRegistry[K] {
    const service = this.services[key]
    if (!service) {
      throw new Error(`Service with key "${key}" has not been registered.`)
    }
    return service
  }
}

// Export a singleton instance of the container
export const serviceContainer = new ServiceContainer()
