// app/api/analytics/sessions/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { HrmDataLogEntry } from '@/types/analytics'

const SESSIONS_DIR = path.join(process.cwd(), 'logs', 'hrm_sessions')

import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = context.params
  const logFilePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`)

  if (!fs.existsSync(logFilePath)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const fileContent = fs.readFileSync(logFilePath, 'utf-8')
  const lines = fileContent.split(/\\r?\\n/).filter(Boolean)
  const data: HrmDataLogEntry[] = lines.map((line) => JSON.parse(line))

  return NextResponse.json({ data })
}
