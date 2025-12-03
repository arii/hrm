import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import logger from '@/utils/logger'

/**
 * @openapi
 * /api/debug/reset:
 *   post:
 *     summary: Reset Server State (Development Only)
 *     description: >
 *       Deletes the persisted Spotify token file to reset the server's authentication state.
 *       This endpoint is only available in development environments.
 *     tags:
 *       - Debug
 *     responses:
 *       200:
 *         description: The server state was successfully reset.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server reset successful"
 *       403:
 *         description: Forbidden. This endpoint is not available in production.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: An error occurred during the reset process.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'This feature is only available in development mode.' }, { status: 403 });
  }

  const tokenFile = path.resolve(process.cwd(), 'logs/spotify_tokens.json')

  try {
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile)
      logger.info('Spotify token file deleted.')
    } else {
      logger.info('Spotify token file not found, nothing to delete.')
    }
    return NextResponse.json({ message: 'Server reset successful' })
  } catch (error) {
    logger.error('Error resetting server:', error)
    return NextResponse.json({ message: 'Error resetting server' }, { status: 500 })
  }
}
