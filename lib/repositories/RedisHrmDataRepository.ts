// lib/repositories/RedisHrmDataRepository.ts
import { HrmStreamData } from '../../types/core';
import redisClient from '../redis';

const HRM_DATA_KEY_PREFIX = 'hrm-data:';

export class RedisHrmDataRepository {
  private getKey(id: string): string {
    return `${HRM_DATA_KEY_PREFIX}${id}`;
  }

  async findById(id: string): Promise<HrmStreamData | undefined> {
    const data = await redisClient.hGetAll(this.getKey(id));
    if (!Object.keys(data).length) {
      return undefined;
    }
    return {
      ...data,
      value: Number(data.value),
      maxHr: Number(data.maxHr),
      age: Number(data.age),
      calories: Number(data.calories),
    } as HrmStreamData;
  }

  async findAll(): Promise<HrmStreamData[]> {
    const keys = await this.scanKeys(0);
    const data = await Promise.all(
      keys.map(async (key) => {
        const hrmData = await redisClient.hGetAll(key);
        return {
          ...hrmData,
          value: Number(hrmData.value),
          maxHr: Number(hrmData.maxHr),
          age: Number(hrmData.age),
          calories: Number(hrmData.calories),
        } as HrmStreamData;
      })
    );
    return data;
  }

  private async scanKeys(cursor: number, keys: string[] = []): Promise<string[]> {
    const result = await redisClient.scan(cursor, { MATCH: `${HRM_DATA_KEY_PREFIX}*`, COUNT: 100 });
    keys.push(...result.keys);
    if (result.cursor === 0) {
      return keys;
    }
    return this.scanKeys(result.cursor, keys);
  }

  async save(data: HrmStreamData): Promise<void> {
    await redisClient.hSet(this.getKey(data.clientId), {
      clientId: data.clientId,
      value: data.value.toString(),
      maxHr: data.maxHr.toString(),
      age: data.age.toString(),
      calories: data.calories.toString(),
      name: data.name || '',
    });
  }

  async deleteById(id: string): Promise<void> {
    await redisClient.del(this.getKey(id));
  }

  async clear(): Promise<void> {
    const keys = await this.scanKeys(0);
    if (keys.length) {
      await redisClient.del(keys);
    }
  }
}
