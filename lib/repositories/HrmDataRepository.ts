// lib/repositories/HrmDataRepository.ts
import { HrmStreamData } from '../../types/core'

/**
 * Repository for managing HRM client data, keyed by user name.
 * Encapsulates the storage and retrieval of HrmStreamData.
 */
export class HrmDataRepository {
  // Keyed by user name, which is assumed to be unique for active sessions.
  private clientData = new Map<string, HrmStreamData>()

  /**
   * Finds a client's data by their user name.
   * @param name The client's user name.
   * @returns The client's data or undefined if not found.
   */
  findByName(name: string): HrmStreamData | undefined {
    return this.clientData.get(name)
  }

  /**
   * Retrieves all client data entries.
   * @returns An array of all client data.
   */
  findAll(): HrmStreamData[] {
    return Array.from(this.clientData.values())
  }

  /**
   * Saves or updates a client's data. The user's name from the data is used as the key.
   * @param data The client data to save. It must contain a 'name' property.
   */
  save(data: HrmStreamData): void {
    if (!data.name) {
      throw new Error('HrmStreamData must have a name to be saved.')
    }
    this.clientData.set(data.name, data)
  }

  /**
   * Deletes a client's data by their user name.
   * @param name The client's user name.
   */
  deleteByName(name: string): void {
    this.clientData.delete(name)
  }

  /**
   * Clears all client data from the repository.
   */
  clear(): void {
    this.clientData.clear()
  }
}
