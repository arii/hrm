// File: app/api/workout-data/route.ts
import { NextResponse } from 'next/server';
import { parseGoogleDocTable } from '@/utils/googleDocParser';

export const dynamic = 'force-dynamic'; // Ensure the route is always dynamic

export async function GET() {
  try {
    const data = await parseGoogleDocTable();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error fetching workout data:', error);
    return NextResponse.json({ error: 'Failed to fetch workout data' }, { status: 500 });
  }
}
