// services/googleDocParser.ts
import * as cheerio from 'cheerio'

export interface WorkoutTableData {
  headers: string[]
  rows: string[][]
}

/**
 * Parses raw HTML from a Google Doc export and extracts the first table.
 * Enforces a 10-line limit per cell.
 */
export const parseGoogleDocTable = (html: string): WorkoutTableData => {
  const $ = cheerio.load(html)
  const table = $('table').first()

  if (!table.length) {
    throw new Error('No table found in the Google Doc')
  }

  const parsedRows: string[][] = []

  table.find('tr').each((rowIndex, rowElement) => {
    const cells: string[] = []

    $(rowElement)
      .find('td, th')
      .each((colIndex, cellElement) => {
        // 1. Get text and normalize whitespace (but keep newlines)
        // Google docs often uses <p> tags inside cells, so we map over them
        let text = ''
        const paragraphs = $(cellElement).find('p')

        if (paragraphs.length > 0) {
          text = paragraphs
            .map((_, p) => $(p).text().trim())
            .get()
            .join('\n')
        } else {
          text = $(cellElement).text().trim()
        }

        // 2. Enforce the 10-line limit
        const lines = text.split('\n')
        if (lines.length > 10) {
          text = lines.slice(0, 10).join('\n') + '...'
        }

        cells.push(text)
      })

    // Only include rows that have actual content
    if (cells.some((cell) => cell.length > 0)) {
      parsedRows.push(cells)
    }
  })

  // Assume first row is header if we have multiple rows, otherwise just data
  const headers = parsedRows.length > 0 ? parsedRows[0] : []
  const rows = parsedRows.length > 1 ? parsedRows.slice(1) : []

  return { headers, rows }
}
