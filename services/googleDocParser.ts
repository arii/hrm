import { parse, HTMLElement } from 'node-html-parser'
import { decode } from 'he'
import { WorkoutTableDto } from '@/types/workout'

const BLOCK_SELECTOR = 'div,p,h1,h2,h3,h4,h5,h6,li,ul,ol,blockquote'

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

  const rawText = cell.text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()

  return decode(rawText)
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
