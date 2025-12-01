import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

if (process.env.NODE_ENV !== 'development') {
  throw new Error('This endpoint is not available in production')
}

export async function POST() {
  const tokenFile = path.resolve(process.cwd(), 'logs/spotify_tokens.json')

  try {
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile)
      console.log('Spotify token file deleted.')
    } else {
      console.log('Spotify token file not found, nothing to delete.')
    }
    return NextResponse.json({ message: 'Server reset successful' })
  } catch (error) {
    console.error('Error resetting server:', error)
    return NextResponse.json({ message: 'Error resetting server' }, { status: 500 })
  }
}
