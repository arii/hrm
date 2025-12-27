// lib/repositories/HrmDataRepository.ts
import { HrmStreamData } from '../../types/core'
import { BaseRepository } from './BaseRepository.js'

/**
 * Repository for managing HRM client data.
 * Encapsulates the storage and retrieval of HrmStreamData.
 */
export class HrmDataRepository extends BaseRepository<HrmStreamData, string> {
  constructor() {
    super((entity) => entity.clientId)
  }
}
