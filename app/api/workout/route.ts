// app/api/workout/route.ts
import { NextResponse } from 'next/server'
import { parseGoogleDocTable } from '@/services/googleDocParser'
import { withValidation } from '@/lib/middleware/validation'
import { WorkoutQuerySchema } from '@/lib/validation/schemas'

async function getWorkout(
  _req: Request,
  { query }: { query: { docId: string } }
) {
  try {
    const { docId } = query
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
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export const GET = withValidation({ query: WorkoutQuerySchema })(getWorkout)
