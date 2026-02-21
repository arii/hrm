// services/googleDocParser.ts
import * as cheerio from 'cheerio'
import { WorkoutTableDto } from '@/types/workout'

/**
 * Extracts headers from the first row of the table.
 */
export const parseGoogleDocTable = (html: string): WorkoutTableDto => {
  const $ = cheerio.load(html)
  const table = $('table').first()

  if (!table.length) {
    throw new Error('No table found in the Google Doc')
  }

  const headers: string[] = []
  const firstRow = table.find('tr').first()

  firstRow.find('td, th').each((_colIndex, cellElement) => {
    // Extract text and clean artifacts
    // Replacing internal newlines with spaces and trimming whitespace
    const text = $(cellElement)
      .text()
      .replace(/\u00A0/g, ' ')
      .replace(/\n/g, ' ')
      .trim()
    headers.push(text)
  })

  return { headers, rows: [] }
}
