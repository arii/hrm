// app/api/profile/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Simulate a network delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return NextResponse.json({
    name: 'Jules',
    email: 'jules@example.com',
  })
}
