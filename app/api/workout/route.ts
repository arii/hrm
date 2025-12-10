// app/api/workout/route.ts
import { NextResponse } from 'next/server'
import { parseGoogleDocTable } from '@/services/googleDocParser'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docId = searchParams.get('docId')

  if (!docId) {
    return NextResponse.json(
      { error: 'Missing docId parameter' },
      { status: 400 }
    )
  }

  try {
    // We use the export endpoint to get raw HTML.
    // NOTE: The Google Doc must be shared as "Anyone with the link can view"
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`

    const response = await fetch(exportUrl, {
      next: { revalidate: 60 }, // Cache for 60 seconds to avoid hitting Google limits
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch doc from Google (Status: ${response.status})`
      )
    }

    const html = await response.text()
    const data = parseGoogleDocTable(html)

    return NextResponse.json(data)
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Workout API Error:', error)
    return NextResponse.json(
      { error: errorMessage },
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
