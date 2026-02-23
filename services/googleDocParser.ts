import { parse, HTMLElement } from 'node-html-parser'
import { decode } from 'he'
import { WorkoutTableDto } from '@/types/workout'

/**
 * Combined selector for block-level elements that should have spaces inserted
 * around them to prevent text merging during parsing.
 * Elements like `ul`/`ol` are omitted as their children (`li`) are included in this selector
 * and provide the necessary spacing.
 */
const BLOCK_SELECTOR = 'div,p,h1,h2,h3,h4,h5,h6,li,blockquote'

/**
 * Extracts text from an HTML cell, ensuring proper spacing for block elements and <br> tags.
 */
const extractCellText = (cell: HTMLElement): string => {
  cell.querySelectorAll('br').forEach((br) => {
    br.replaceWith(' ')
  })

  cell.querySelectorAll(BLOCK_SELECTOR).forEach((block) => {
    block.insertAdjacentHTML('beforebegin', ' ')
    block.insertAdjacentHTML('afterend', ' ')
  })

  // Decode FIRST to handle &nbsp; correctly, then normalize all whitespace.
  return decode(cell.text).replace(/\s+/g, ' ').trim()
}

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

  const cells = firstRow.querySelectorAll('td, th')
  const headers = cells.map(extractCellText)

  return { headers }
}
