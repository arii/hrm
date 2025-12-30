// lib/repositories/HrmDataRepository.ts
import { ClientId } from '../../types/branded'
import { HrmStreamData } from '../../types/core'

/**
 * Repository for managing HRM client data.
 * Encapsulates the storage and retrieval of HrmStreamData.
 */
export class HrmDataRepository {
  private clientData = new Map<ClientId, HrmStreamData>()

  /**
   * Finds a client's data by their ID.
   * @param {ClientId} id The client's unique identifier.
   * @returns {HrmStreamData | undefined} The client's data or undefined if not found.
   */
  findById(id: ClientId): HrmStreamData | undefined {
    return this.clientData.get(id)
  }

  /**
   * Retrieves all client data entries.
   * @returns {HrmStreamData[]} An array of all client data.
   */
  findAll(): HrmStreamData[] {
    return Array.from(this.clientData.values())
  }

  /**
   * Saves or updates a client's data.
   * @param {HrmStreamData} data The client data to save.
   * @returns {void}
   */
  save(data: HrmStreamData): void {
    this.clientData.set(data.clientId, data)
  }

  /**
   * Deletes a client's data by their ID.
   * @param {ClientId} id The client's unique identifier.
   * @returns {void}
   */
  deleteById(id: ClientId): void {
    this.clientData.delete(id)
  }

  /**
   * Clears all client data from the repository.
   * @returns {void}
   */
  clear(): void {
    this.clientData.clear()
  }
}
