// lib/repositories/HrmDataRepository.ts
import { HrmData } from '../../types/core'
export type { HrmData } from '../../types/core'

/**
 * Repository for managing HRM client data.
 * Encapsulates the storage and retrieval of HrmData.
 */
export class HrmDataRepository {
  private clientData = new Map<string, HrmData>()

  /**
   * Finds a client's data by their ID.
   * @param id The client's unique identifier.
   * @returns The client's data or undefined if not found.
   */
  findById(id: string): HrmData | undefined {
    return this.clientData.get(id)
  }

  /**
   * Retrieves all client data entries.
   * @returns An array of all client data.
   */
  findAll(): HrmData[] {
    return Array.from(this.clientData.values())
  }

  /**
   * Saves or updates a client's data.
   * @param data The client data to save.
   */
  save(data: HrmData): void {
    this.clientData.set(data.clientId, data)
  }

  /**
   * Deletes a client's data by their ID.
   * @param id The client's unique identifier.
   */
  deleteById(id: string): void {
    this.clientData.delete(id)
  }

  /**
   * Clears all client data from the repository.
   */
  clear(): void {
    this.clientData.clear()
  }
}
