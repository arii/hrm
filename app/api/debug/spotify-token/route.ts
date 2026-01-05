import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

const TOKEN_FILE = path.resolve(process.cwd(), 'logs', 'spotify_tokens.json')

export async function GET() {
  // SECURITY: Prevent exposure of secrets in production unless in a test environment
  if (process.env.NODE_ENV === 'production' && process.env.TESTING !== 'true') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    let token = null
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, 'utf8')
      token = JSON.parse(data)
    }
    return NextResponse.json({ ok: true, token })
  } catch (err) {
    console.error('debug/spotify-token error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
