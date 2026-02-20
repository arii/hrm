// tests/unit/services/googleDocParser.test.ts
import { parseGoogleDocTable } from '@/services/googleDocParser'
import { WorkoutTableDto } from '@/types/workout'

describe('parseGoogleDocTable', () => {
  it('should parse only the first row of an HTML table into headers', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <td>Exercise</td>
              <td>Sets</td>
              <td>Reps</td>
              <td>Notes</td>
            </tr>
            <tr>
              <td>Squats</td>
              <td>3</td>
              <td>10</td>
              <td>Form check</td>
            </tr>
          </table>
        </body>
      </html>
    `

    const expectedDto: WorkoutTableDto = {
      headers: ['Exercise', 'Sets', 'Reps', 'Notes'],
      rows: [],
    }

    const result = parseGoogleDocTable(html)
    expect(result).toEqual(expectedDto)
  })

  it('should clean whitespace from cell contents', () => {
    const html = `
      <table>
        <tr>
          <td>  Exercise  </td>
          <td>Sets\n</td>
          <td>\tReps</td>
          <td>Notes</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['Exercise', 'Sets', 'Reps', 'Notes'])
  })

  it('should handle tables with 4+ columns', () => {
    const html = `
      <table>
        <tr>
          <td>Col 1</td>
          <td>Col 2</td>
          <td>Col 3</td>
          <td>Col 4</td>
          <td>Col 5</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers.length).toBe(5)
    expect(result.headers).toEqual([
      'Col 1',
      'Col 2',
      'Col 3',
      'Col 4',
      'Col 5',
    ])
  })

  it('should throw an error if no table is found', () => {
    const html = '<html><body><p>No table here</p></body></html>'
    expect(() => parseGoogleDocTable(html)).toThrow(
      'No table found in the Google Doc'
    )
  })
})
