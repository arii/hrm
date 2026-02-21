// tests/unit/services/googleDocParser.test.ts
import { parseGoogleDocTable } from '@/services/googleDocParser'
import { WorkoutTableDto } from '@/types/workout'

describe('parseGoogleDocTable', () => {
  it('should parse only headers from the first row of the table', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <th>Exercise\nName</th>
              <th>Sets</th>
              <th>Reps</th>
            </tr>
            <tr>
              <td>Squats</td>
              <td>3</td>
              <td>10</td>
            </tr>
          </table>
        </body>
      </html>
    `

    const expectedDto: WorkoutTableDto = {
      headers: ['Exercise Name', 'Sets', 'Reps'],
      rows: [],
    }

    const result = parseGoogleDocTable(html)
    expect(result).toEqual(expectedDto)
  })

  it('should throw an error if no table is found', () => {
    const html = '<html><body><p>No table here</p></body></html>'
    expect(() => parseGoogleDocTable(html)).toThrow(
      'No table found in the Google Doc'
    )
  })
})
