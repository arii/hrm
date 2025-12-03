import { ApiError } from '@/lib/errors'
import * as fs from 'fs'
import { NextResponse } from 'next/server'
import * as path from 'path'
import logger from '@/utils/logger'

/**
 * @openapi
 * /api/internal/clear-token:
 *   post:
 *     summary: Clear Persisted Spotify Token
 *     description: >
 *       Deletes the persisted Spotify token file (`spotify_tokens.json`) from the server's filesystem.
 *       This is typically called during a logout flow to ensure a clean re-authentication next time.
 *     tags:
 *       - Internal
 *     responses:
 *       200:
 *         description: The token file was successfully cleared or did not exist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token file cleared"
 *       500:
 *         description: An error occurred while trying to delete the file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(_req: Request) {
  try {
    const tokenFilePath = path.join(
      process.cwd(),
      'logs',
      'spotify_tokens.json'
    )

    // Check if file exists before attempting to delete
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath)
      logger.info('[API /clear-token] Deleted spotify_tokens.json')
      return NextResponse.json({
        success: true,
        message: 'Token file cleared',
      })
    } else {
      logger.info('[API /clear-token] Token file does not exist')
      return NextResponse.json({
        success: true,
        message: 'Token file already cleared',
      })
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error('[API /clear-token] Error clearing token file:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear token file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
