// tests/unit/services/googleDocParser.test.ts
import { parseGoogleDocTable } from '@/services/googleDocParser'
import { WorkoutTableDto } from '@/lib/dto/workout.dto'

describe('parseGoogleDocTable', () => {
  it('should parse a simple HTML table into a WorkoutTableDto', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <th>Exercise</th>
              <th>Sets</th>
              <th>Reps</th>
            </tr>
            <tr>
              <td>Squats</td>
              <td>3</td>
              <td>10</td>
            </tr>
            <tr>
              <td>Push-ups</td>
              <td>3</td>
              <td>15</td>
            </tr>
          </table>
        </body>
      </html>
    `

    const expectedDto: WorkoutTableDto = {
      headers: ['Exercise', 'Sets', 'Reps'],
      rows: [
        ['Squats', '3', '10'],
        ['Push-ups', '3', '15'],
      ],
    }

    const result = parseGoogleDocTable(html)
    expect(result).toEqual(expectedDto)
  })

  it('should throw an error if no table is found', () => {
    const html = '<html><body><p>No table here</p></body></html>'
    expect(() => parseGoogleDocTable(html)).toThrow('No table found in the Google Doc')
  })
})
