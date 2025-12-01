import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  // CRITICAL: This endpoint should not be available in production
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 })
  }

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
