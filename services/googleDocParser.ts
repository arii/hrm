// services/googleDocParser.ts
import * as cheerio from 'cheerio'
import { ValidationError } from '../lib/errors.js'

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
    throw new ValidationError('No table found in the Google Doc')
  }

  const parsedRows: string[][] = []

  table.find('tr').each((_rowIndex, rowElement) => {
    const cells: string[] = []

    $(rowElement)
      .find('td, th')
      .each((_colIndex, cellElement) => {
        // 1. Get text and normalize whitespace (but keep newlines)
        // Google docs often uses <p> tags inside cells, so we map over them
        let text = ''
        const paragraphs = $(cellElement).find('p')

        // Helper to clean invisible Google Docs artifacts like non-breaking spaces
        const cleanText = (str: string) => str.replace(/\u00A0/g, ' ').trim()

        if (paragraphs.length > 0) {
          text = paragraphs
            .map((_, p) => cleanText($(p).text()))
            .get()
            .join('\n')
        } else {
          text = cleanText($(cellElement).text())
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

  // The first row is the header, the rest are data rows.
  // .shift() removes the first element and returns it. If the array is empty, it returns undefined.
  const headers = parsedRows.shift() || []
  const rows = parsedRows // The rest of the array is the data rows.

  return { headers, rows }
}
