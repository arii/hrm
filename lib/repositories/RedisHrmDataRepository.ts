// lib/repositories/RedisHrmDataRepository.ts
import { HrmStreamData } from '../../types/core'
import redisClient from '../redis'
import logger from '@/utils/logger'

const HRM_DATA_KEY_PREFIX = 'hrm-data:'

export class RedisHrmDataRepository {
  private getKey(id: string): string {
    return `${HRM_DATA_KEY_PREFIX}${id}`
  }

  async findById(id: string): Promise<HrmStreamData | undefined> {
    const data = await redisClient.hGetAll(this.getKey(id))
    if (!Object.keys(data).length) {
      return undefined
    }
    return {
      clientId: data.clientId,
      value: Number(data.value),
      maxHr: Number(data.maxHr),
      age: Number(data.age),
      calories: Number(data.calories),
      name: data.name ?? '',
    }
  }

  async findAll(): Promise<HrmStreamData[]> {
    try {
      const keys: string[] = []
      for await (const key of redisClient.scanIterator({
        MATCH: `${HRM_DATA_KEY_PREFIX}*`,
        COUNT: 100, // Adjust count as needed for performance
      })) {
        keys.push(key)
      }

      if (keys.length === 0) {
        return []
      }

      const pipeline = redisClient.pipeline()
      keys.forEach((key) => pipeline.hGetAll(key))
      const results = await pipeline.exec()

      return results
        .map((result) => {
          const hrmData = result as Record<string, string>
          if (hrmData && hrmData.clientId) {
            return {
              clientId: hrmData.clientId,
              value: Number(hrmData.value),
              maxHr: Number(hrmData.maxHr),
              age: Number(hrmData.age),
              calories: Number(hrmData.calories),
              name: hrmData.name ?? '',
            }
          }
          return null
        })
        .filter((item): item is HrmStreamData => item !== null)
    } catch (error) {
      logger.error('Error finding all HRM data from Redis:', error)
      return []
    }
  }

  async save(data: HrmStreamData): Promise<void> {
    const dataToSave: Record<string, string> = {
      clientId: data.clientId,
      value: data.value.toString(),
      maxHr: data.maxHr.toString(),
      age: (data.age || 0).toString(),
      calories: data.calories.toString(),
    }
    if (data.name) {
      dataToSave.name = data.name
    }
    await redisClient.hSet(this.getKey(data.clientId), dataToSave)
  }

  async deleteById(id: string): Promise<void> {
    await redisClient.del(this.getKey(id))
  }

  async clear(): Promise<void> {
    try {
      const keys: string[] = []
      for await (const key of redisClient.scanIterator({
        MATCH: `${HRM_DATA_KEY_PREFIX}*`,
        COUNT: 100,
      })) {
        keys.push(key)
      }

      if (keys.length > 0) {
        await redisClient.del(keys)
      }
    } catch (error) {
      logger.error('Error clearing HRM data keys from Redis:', error)
    }
  }
}
