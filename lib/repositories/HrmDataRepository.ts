// lib/repositories/HrmDataRepository.ts
import { HrmData } from '../../types/core'

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
   * Saves or creates a client's data object.
   * Note: This overwrites the entire object. For partial updates, use `update`.
   * @param data The client data to save.
   */
  save(data: HrmData): void {
    this.clientData.set(data.clientId, data)
  }

  /**
   * Partially updates a client's data.
   * This merges the provided data with the existing data.
   * @param clientId The ID of the client to update.
   * @param partialData The partial data to merge.
   */
  update(clientId: string, partialData: Partial<HrmData>): void {
    const existing = this.clientData.get(clientId)
    if (existing) {
      this.clientData.set(clientId, { ...existing, ...partialData })
    }
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
