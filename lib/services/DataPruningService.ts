// lib/services/DataPruningService.ts
import { HrmDataRepository } from '../repositories/HrmDataRepository'
import logger from '../../utils/logger'

export class DataPruningService {
  private readonly hrmDataRepository: HrmDataRepository
  private readonly retentionPeriodMs: number
  private intervalId: NodeJS.Timeout | null = null

  constructor(
    hrmDataRepository: HrmDataRepository,
    retentionPeriodDays: number
  ) {
    this.hrmDataRepository = hrmDataRepository
    this.retentionPeriodMs = retentionPeriodDays * 24 * 60 * 60 * 1000
  }

  public start(pruningIntervalMs: number = 60 * 60 * 1000): void {
    if (this.intervalId) {
      logger.warn('Data pruning service is already running.')
      return
    }

    logger.info(
      `Starting data pruning service with retention period of ${
        this.retentionPeriodMs / (1000 * 60 * 60 * 24)
      } days.`
    )

    this.intervalId = setInterval(() => {
      this.pruneOldData()
    }, pruningIntervalMs)
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Stopped data pruning service.')
    }
  }

  private pruneOldData(): void {
    try {
      const threshold = Date.now() - this.retentionPeriodMs
      const itemsPruned = this.hrmDataRepository.prune(threshold)
      if (itemsPruned > 0) {
        logger.info(`Pruned ${itemsPruned} old HRM data entries.`)
      }
    } catch (error) {
      logger.error({ err: error }, 'Error pruning old HRM data.')
    }
  }
}
