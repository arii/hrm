// app/api/analytics/sessions/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { HrmDataLogEntry } from '@/types/analytics'

const SESSIONS_DIR = path.join(process.cwd(), 'logs', 'hrm_sessions')

import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params

  // Security: Validate format (alphanumeric, underscores, hyphens only)
  if (!/^[a-zA-Z0-9_.-]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
  }

  const logFilePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`)

  try {
    // Performance: Async read
    const fileContent = await fs.readFile(logFilePath, 'utf-8')
    const lines = fileContent.split(/\\r?\\n/).filter(Boolean)
    const data: HrmDataLogEntry[] = lines.map((line) => JSON.parse(line))

    return NextResponse.json({ data })
  } catch (error) {
    // @ts-ignore
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    console.error('Error reading session file:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session data' },
      { status: 500 }
    )
  }
}
