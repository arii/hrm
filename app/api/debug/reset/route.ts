import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import logger from '@/utils/logger'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 })
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
