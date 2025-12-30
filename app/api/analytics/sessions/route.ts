// app/api/analytics/sessions/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'logs', 'hrm_sessions')

export async function GET() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      // If the directory doesn't exist, return an empty array
      return NextResponse.json({ sessions: [] })
    }

    const sessionFiles = fs.readdirSync(SESSIONS_DIR)
    const sessionIds = sessionFiles
      .filter((file) => file.endsWith('.jsonl'))
      .map((file) => file.replace('.jsonl', ''))

    return NextResponse.json({ sessions: sessionIds })
  } catch (error) {
    console.error('Error reading session directory:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve sessions' },
      { status: 500 }
    )
  }
}
