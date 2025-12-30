// app/api/analytics/sessions/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { HrmDataLogEntry } from '../../../../services/HrmDataLogger'

const LOG_FILE_PATH = path.join(process.cwd(), 'logs', 'hrm_data.jsonl')

export async function GET() {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    return NextResponse.json({ sessions: [] })
  }

  const fileStream = fs.createReadStream(LOG_FILE_PATH)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  const sessions: HrmDataLogEntry[] = []
  for await (const line of rl) {
    try {
      sessions.push(JSON.parse(line))
    } catch (error) {
      console.error('Error parsing log entry:', error)
    }
  }

  return NextResponse.json({ sessions })
}
