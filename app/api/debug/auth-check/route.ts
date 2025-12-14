// @ts-nocheck
import { NextResponse } from 'next/server'
import config from '@/utils/config'

export async function GET() {
  return NextResponse.json({
    nextAuthUrl: config.baseURL,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
  })
}
