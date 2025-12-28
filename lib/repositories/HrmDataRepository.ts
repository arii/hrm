// lib/repositories/HrmDataRepository.ts
import { HrmStreamData } from '../../types/core'

/**
 * Repository for managing HRM client data.
 * Encapsulates the storage and retrieval of HrmStreamData.
 */
export class HrmDataRepository {
  private clientData = new Map<string, HrmStreamData>()
  private deviceIdIndex = new Map<string, string>() // deviceId -> clientId

  /**
   * Finds a client's data by their ID.
   * @param id The client's unique identifier.
   * @returns The client's data or undefined if not found.
   */
  findById(id: string): HrmStreamData | undefined {
    return this.clientData.get(id)
  }

  /**
   * Finds a client's data by their device ID.
   * @param deviceId The client's device identifier.
   * @returns The client's data or undefined if not found.
   */
  findByDeviceId(deviceId: string): HrmStreamData | undefined {
    const clientId = this.deviceIdIndex.get(deviceId)
    return clientId ? this.clientData.get(clientId) : undefined
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
   * @returns The saved data.
   */
  save(data: HrmStreamData): HrmStreamData {
    // If the old data had a deviceId, we should remove it from the index
    const oldData = this.clientData.get(data.clientId)
    if (oldData?.deviceId) {
      this.deviceIdIndex.delete(oldData.deviceId)
    }

    this.clientData.set(data.clientId, data)
    if (data.deviceId) {
      this.deviceIdIndex.set(data.deviceId, data.clientId)
    }
    return data
  }

  /**
   * Deletes a client's data by their ID.
   * @param id The client's unique identifier.
   */
  deleteById(id: string): void {
    const data = this.clientData.get(id)
    if (data?.deviceId) {
      this.deviceIdIndex.delete(data.deviceId)
    }
    this.clientData.delete(id)
  }

  /**
   * Clears all client data from the repository.
   */
  clear(): void {
    this.clientData.clear()
    this.deviceIdIndex.clear()
  }
}
