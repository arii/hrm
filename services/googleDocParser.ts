import * as cheerio from 'cheerio'
import { WorkoutTableDto } from '@/types/workout'

/**
 * Parses raw HTML from a Google Doc export and extracts the first table.
 * Simplified logic: extracts the first row as headers.
 * Removes whitespace and formatting from each cell.
 * Replaces newlines within cells with spaces for UI consistency.
 */
export const parseGoogleDocTable = (html: string): WorkoutTableDto => {
  const $ = cheerio.load(html)
  const table = $('table').first()

  if (!table.length) {
    throw new Error('No table found in the Google Doc')
  }

  const firstRow = table.find('tr').first()
  const headers: string[] = []

  firstRow.find('td, th').each((_colIndex, cellElement) => {
    const text = $(cellElement)
      .text()
      .replace(/\r?\n|\r/g, ' ')
      .trim()
    headers.push(text)
  })

  return { headers }
}
