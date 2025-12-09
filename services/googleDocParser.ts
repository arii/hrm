// services/googleDocParser.ts
import * as cheerio from 'cheerio'

export interface WorkoutItem {
  category: string
  exercises: string[]
}

export const parseGoogleDoc = async (url: string): Promise<WorkoutItem[]> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Doc: ${response.statusText}`)
    }
    const html = await response.text()
    const $ = cheerio.load(html)

    const workoutItems: WorkoutItem[] = []
    const headers: string[] = []

    $('table.c13 tr')
      .first()
      .find('td')
      .each((index, element) => {
        const headerText = $(element).text().trim()
        headers[index] = headerText
        workoutItems.push({ category: headerText, exercises: [] })
      })

    $('table.c13 tr')
      .slice(1)
      .each((_rowIndex, row) => {
        $(row)
          .find('td')
          .each((colIndex, col) => {
            const exerciseText = $(col).text().trim()
            if (exerciseText && workoutItems[colIndex]) {
              workoutItems[colIndex].exercises.push(exerciseText)
            }
          })
      })

    return workoutItems
  } catch (error) {
    console.error('Error parsing Google Doc:', error)
    return []
  }
}
