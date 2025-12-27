import { ApiError } from '@/lib/errors'
import * as fs from 'fs'
import { NextResponse } from 'next/server'
import * as path from 'path'

/**
 * API route to clear the persisted Spotify token file.
 * This is called during logout to ensure a fresh authentication flow.
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
      console.info('[API /clear-token] Deleted spotify_tokens.json')
      return NextResponse.json({
        success: true,
        message: 'Token file cleared',
      })
    } else {
      console.info('[API /clear-token] Token file does not exist')
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
    console.error('[API /clear-token] Error clearing token file:', error)
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
