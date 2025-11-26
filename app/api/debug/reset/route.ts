import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { message: 'This feature is only available in development mode.' },
      { status: 403 }
    )
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
    return NextResponse.json(
      { message: 'Error resetting server' },
      { status: 500 }
    )
  }
}
