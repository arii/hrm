// app/api/workout/route.ts
import { NextResponse } from 'next/server'
import { parseGoogleDocTable } from '@/services/googleDocParser'
import logger from '@/utils/logger'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docParam = searchParams.get('docId')

  if (!docParam) {
    return NextResponse.json(
      { error: 'Missing docId parameter' },
      { status: 400 }
    )
  }

  try {
    let exportUrl: string
    let docIdToUse: string

    // If a full URL was passed, check if it's a published doc and construct the export URL accordingly
    const isUrl = docParam.includes('docs.google.com')
    if (isUrl) {
      const isPublished = docParam.includes('/d/e/')
      const match = docParam.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/)
      docIdToUse = match?.[1] || docParam

      if (isPublished) {
        // For published docs: try /d/e/{ID}/export first
        exportUrl = `https://docs.google.com/document/d/e/${docIdToUse}/export?format=html`
      } else {
        // For regular docs: /d/{ID}/export
        exportUrl = `https://docs.google.com/document/d/${docIdToUse}/export?format=html`
      }
    } else {
      // Assume it's just an ID (legacy behavior)
      docIdToUse = docParam
      exportUrl = `https://docs.google.com/document/d/${docParam}/export?format=html`
    }

    let response = await fetch(exportUrl, {
      next: { revalidate: 60 }, // Cache for 60 seconds to avoid hitting Google limits
    })

    // If published doc fails with 404, try without /e/
    if (
      !response.ok &&
      response.status === 404 &&
      exportUrl.includes('/d/e/')
    ) {
      exportUrl = `https://docs.google.com/document/d/${docIdToUse}/export?format=html`
      response = await fetch(exportUrl, {
        next: { revalidate: 60 },
      })
    }

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(
          { docParam, exportUrl, status: response.status },
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
          { docParam, exportUrl, status: response.status },
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
    if (error instanceof Error && error.message.includes('No table found')) {
      logger.warn({ docParam }, 'No table found in Google Doc')
      return NextResponse.json(
        { error: 'No table found in the provided document.' },
        { status: 404 }
      )
    }

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
