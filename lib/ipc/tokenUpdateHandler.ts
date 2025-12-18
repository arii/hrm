import { Request, Response } from 'express'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenPayloadSchema } from '../validation/schemas'
import logger from '../../utils/logger'

export const createTokenUpdateHandler =
  (spotifyService: SpotifyPolling) =>
  async (req: Request, res: Response) => {
    const secret = req.headers['x-internal-token-secret']
    const expectedSecret = process.env.INTERNAL_TOKEN_DELIVERY_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      logger.warn('Unauthorized attempt to access internal IPC endpoint')
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid secret token.',
      })
    }

    const { timestamp, payload } = req.body

    const REPLAY_THRESHOLD_MS = 30000 // 30 seconds
    if (
      !timestamp ||
      typeof timestamp !== 'number' ||
      Date.now() - timestamp > REPLAY_THRESHOLD_MS
    ) {
      logger.warn('Stale or invalid timestamp in IPC request')
      return res.status(400).json({
        error: 'Invalid timestamp',
        message: `Timestamp is older than ${REPLAY_THRESHOLD_MS}ms.`,
      })
    }

    const validationResult = SpotifyTokenPayloadSchema.safeParse(payload)

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid token payload',
        details: validationResult.error.issues,
      })
    }

    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 1000
    let retries = 0

    while (retries < MAX_RETRIES) {
      try {
        await spotifyService.handleTokenUpdate(validationResult.data)
        logger.info(
          { source: 'ipc', attempt: retries + 1 },
          'Successfully processed token update via IPC'
        )
        return res.status(200).json({ success: true })
      } catch (error) {
        retries++
        logger.warn(
          { err: error, attempt: retries },
          `IPC token update attempt ${retries} failed`
        )
        if (retries >= MAX_RETRIES) {
          logger.error(
            { err: error },
            'IPC token update failed after multiple retries'
          )
          return res
            .status(500)
            .json({ error: 'Failed to process token update' })
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }
