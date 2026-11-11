import { NextResponse } from 'next/server'
import { parseGoogleDocTable } from '@/services/googleDocParser'
import logger from '@/utils/logger'
import { env } from '@/lib/env'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docId = searchParams.get('docId')

  if (!docId) {
    return NextResponse.json(
      { error: 'Missing docId parameter' },
      { status: 400 }
    )
  }

  // Prevent hitting real Google Docs in tests
  if (env.TESTING === 'true' || env.NEXT_PUBLIC_TESTING === 'true') {
    return NextResponse.json({
      headers: ['20/10', '3 x 10'],
      columns: [
        ['Jumping Jacks', 'High Knees'],
        ['Squats (10 reps)', 'Plank'],
      ],
    })
  }

  try {
    // NOTE: The Google Doc must be shared as "Anyone with the link can view"
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`

    // Explicit user refreshes (?fresh=1) bypass the cache so the latest
    // Google Doc edit always lands on demand. Plain loads keep the 60s
    // cache to avoid hitting Google rate limits.
    const fresh = searchParams.get('fresh') === '1'
    const response = await fetch(
      exportUrl,
      fresh ? { cache: 'no-store' } : { next: { revalidate: 60 } }
    )

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(
          { docId, status: response.status },
          'Google Doc not found. Ensure the document is publicly accessible.'
        )
        return NextResponse.json(
          {
            error:
              'Document not found. Verify the document ID and sharing settings.',
          },
          { status: 404 }
        )
      }

      if (response.status >= 500) {
        logger.warn(
          { docId, status: response.status },
          'Google Docs service temporarily unavailable.'
        )
        return NextResponse.json(
          {
            error:
              'Google Docs service is temporarily unavailable. Please try again later.',
          },
          { status: 503 }
        )
      }

      throw new Error(
        `Failed to fetch document from Google (Status: ${response.status})`
      )
    }

    const html = await response.text()
    const data = parseGoogleDocTable(html)

    return NextResponse.json(data)
  } catch (error: unknown) {
    logger.error(
      { error, docId: searchParams.get('docId') },
      'Workout API error'
    )
    return NextResponse.json(
      { error: 'Failed to retrieve workout data. Please try again later.' },
      { status: 500 }
    )
  }
}
