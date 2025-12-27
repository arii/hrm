// lib/repositories/HrmDataRepository.ts
import { HrmStreamData } from '../../types/core'

/**
 * Repository for managing HRM client data.
 * Encapsulates the storage and retrieval of HrmStreamData.
 */
export class HrmDataRepository {
  private clientData = new Map<string, HrmStreamData>()

  /**
   * Finds a client's data by their ID.
   * @param id The client's unique identifier.
   * @returns The client's data or undefined if not found.
   */
  findById(id: string): HrmStreamData | undefined {
    return this.clientData.get(id)
  }

  /**
   * Retrieves all client data entries.
   * @returns An array of all client data.
   */
  findAll(): HrmStreamData[] {
    return Array.from(this.clientData.values())
  }

  /**
   * Saves or updates a client's data.
   * @param data The client data to save.
   */
  save(data: HrmStreamData): void {
    this.clientData.set(data.clientId, data)
  }

  /**
   * Updates the connection status of a client.
   * @param id The client's unique identifier.
   * @param isConnected The new connection status.
   */
  updateConnectionStatus(id: string, isConnected: boolean): void {
    const client = this.findById(id)
    if (client) {
      this.save({ ...client, isConnected })
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
