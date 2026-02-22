import { parse } from 'node-html-parser'
import { WorkoutTableDto } from '@/types/workout'

/**
 * Parses raw HTML from a Google Doc export and extracts the first table.
 * Extracts headers from the first row of the table.
 * Removes whitespace and formatting from each cell.
 * Replaces newlines within cells with spaces for UI consistency.
 */
export const parseGoogleDocTable = (html: string): WorkoutTableDto => {
  const root = parse(html)
  const table = root.querySelector('table')

  if (!table) {
    throw new Error('No table found in the Google Doc')
  }

  const firstRow = table.querySelector('tr')

  if (!firstRow) {
    return { headers: [] }
  }

  const headers: string[] = []
  const cells = firstRow.querySelectorAll('td, th')

  cells.forEach((cell) => {
    // Ensure block elements have spacing to prevent text merging
    cell.querySelectorAll('br').forEach((br) => {
      br.replaceWith(' ')
    })

    cell.querySelectorAll('p').forEach((p) => {
      p.insertAdjacentHTML('afterend', ' ')
    })

    const text = cell.textContent
      .replace(/\u00A0/g, ' ')
      .replace(/\r?\n|\r/g, ' ')
      .trim()
    headers.push(text)
  })

  return { headers }
}
