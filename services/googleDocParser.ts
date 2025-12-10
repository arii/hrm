// File: services/googleDocParser.ts
/**
 * Fetches and parses a publicly published Google Doc HTML page into a structured format
 * using Cheerio for robust DOM parsing.
 */
import * as cheerio from 'cheerio'
import type { CheerioAPI, Element } from 'cheerio'

interface WorkoutItem {
  name: string
  sets: string
}

const parseGoogleDocTable = async (
  url: string
): Promise<WorkoutItem[] | null> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to fetch Google Doc: ${response.statusText}`)
      return null
    }

    const html = await response.text()
    const $: CheerioAPI = cheerio.load(html)
    const workoutItems: WorkoutItem[] = []

    // Find the first table on the page. This is a fragile assumption but is the
    // simplest approach without more complex selectors.
    const table = $('table').first()

    if (table.length === 0) {
      console.warn('No table found in the Google Doc HTML.')
      return [] // Return empty array if no table is found
    }

    // Iterate over each row in the table body
    table.find('tbody > tr').each((_rowIndex: number, row: Element): void => {
      const cells = $(row).find('td')
      if (cells.length >= 2) {
        const sets = $(cells[0]).text().trim()
        const name = $(cells[1]).text().trim()

        // Ensure both cells have content to avoid adding empty/header rows
        if (name && sets) {
          workoutItems.push({ name, sets })
        }
      }
    })

    return workoutItems
  } catch (error) {
    console.error('Error fetching or parsing Google Doc with Cheerio:', error)
    return null
  }
}

export { parseGoogleDocTable }
export type { WorkoutItem }
