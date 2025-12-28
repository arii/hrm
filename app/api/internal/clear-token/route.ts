import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import logger from '@/utils/logger'
import { withCsrfProtection } from '@/lib/middleware/csrf'

/**
 * @swagger
 * /api/internal/clear-token:
 *   post:
 *     summary: Clears the Spotify token file
 *     description: Deletes the spotify_tokens.json file from the server. This is an internal endpoint.
 *     tags:
 *       - Internal
 *     responses:
 *       200:
 *         description: Token file cleared successfully or was already cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to clear the token file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
async function handler() {
  const tokenFile = path.join(process.cwd(), 'logs', 'spotify_tokens.json')
  logger.info(`Attempting to clear token file at: ${tokenFile}`)

  try {
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile)
      logger.info('Token file successfully deleted.')
      return NextResponse.json({ message: 'Token file cleared' })
    } else {
      logger.info('Token file not found, already cleared.')
      return NextResponse.json({ message: 'Token file already cleared' })
    }
  } catch (error) {
    logger.error('Failed to clear token file:', error)
    return NextResponse.json(
      { error: 'Failed to clear token file' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfProtection(handler)
