import type { Request, Response } from 'express'
import crypto from 'crypto'
import type { AppServices } from './services'
import logger from '../utils/logger'
import type { SpotifyTokenDeliveryPayload } from '../types/spotify'

export const createTokenDeliveryHandler = (services: AppServices) => {
  return async (req: Request, res: Response) => {
    try {
      const tokenData = req.body as Partial<SpotifyTokenDeliveryPayload>
      if (!tokenData.refresh_token) {
        return res.status(400).json({ error: 'Missing refresh_token.' })
      }

      const rawHeader = req.headers['x-internal-token-secret']
      const secretHeader = Array.isArray(rawHeader)
        ? rawHeader[0]
        : rawHeader || ''

      const expected = process.env.NEXTAUTH_SECRET
      if (!expected) {
        logger.error('NEXTAUTH_SECRET is not set. Refusing token delivery.')
        return res.status(500).json({ error: 'Server misconfiguration.' })
      }

      const expectedBuf = Buffer.from(expected)
      const inputBuf = Buffer.from(secretHeader)

      const isValid =
        expectedBuf.length === inputBuf.length &&
        crypto.timingSafeEqual(expectedBuf, inputBuf)

      if (!isValid) {
        return res.status(401).json({ error: 'Unauthorized.' })
      }

      if (!services.spotifyService || !services.spotifyService.isReady()) {
        logger.warn(
          'Internal token delivery failed: Spotify service not available.'
        )
        return res
          .status(503)
          .json({ error: 'Spotify service is not available.' })
      }

      await services.spotifyService.handleTokenUpdate({
        access_token: tokenData.access_token || '',
        expires_in: tokenData.expires_in || 0,
        refresh_token: tokenData.refresh_token || '',
        scope: tokenData.scope || '',
        obtainedAt: Date.now(),
        provider: 'spotify',
        sub: '',
      })

      logger.info(
        'Spotify token delivered and processed successfully via server intercept.'
      )
      return res
        .status(200)
        .json({ ok: true, message: 'Token delivered successfully.' })
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('An unknown error occurred')
      logger.error(
        { err: error, message: error.message },
        'Unhandled error in server-side token-delivery'
      )
      return res
        .status(500)
        .json({ error: 'server_error', message: error.message })
    }
  }
}
