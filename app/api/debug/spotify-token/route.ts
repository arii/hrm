import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { withQueryValidation } from '@/lib/middleware/validation'
import { debugSpotifyTokenSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

const TOKEN_FILE = path.resolve(process.cwd(), 'logs', 'spotify_tokens.json')

const handler = async (
  req: NextRequest,
  { query }: { query: z.infer<typeof debugSpotifyTokenSchema> }
) => {
  try {
    let token = null
    if (fs.existsSync(TOKEN_FILE)) {
      if (query.action === 'clear') {
        fs.unlinkSync(TOKEN_FILE)
      } else {
        const data = fs.readFileSync(TOKEN_FILE, 'utf8')
        token = JSON.parse(data)
      }
    }
    return NextResponse.json({ ok: true, token, action: query.action })
  } catch (err) {
    console.error('debug/spotify-token error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export const GET = withQueryValidation(debugSpotifyTokenSchema, handler)
