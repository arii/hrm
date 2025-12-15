// app/api/health/simple/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Minimal health check for load balancer
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
