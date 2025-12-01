import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

const TOKEN_FILE = path.resolve(process.cwd(), 'logs', 'spotify_tokens.json')

export async function GET() {
  // CRITICAL: This endpoint should not be available in production
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 })
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
