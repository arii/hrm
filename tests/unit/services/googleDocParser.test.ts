// tests/unit/services/googleDocParser.test.ts
import { parseGoogleDocTable } from '@/services/googleDocParser'
import { WorkoutTableDto } from '@/types/workout'

describe('parseGoogleDocTable', () => {
  it('parses timing headers plus exercise columns from the stable doc format', () => {
    const html = `
      <table>
        <tr>
          <td><p>25/10/x3</p><p>Mod v up</p><p>Bikes</p></td>
          <td><p>Tabata</p><p>Single bridge L</p><p>Single b. R</p></td>
        </tr>
      </table>
    `

    const expectedDto: WorkoutTableDto = {
      headers: ['25/10/x3', 'Tabata'],
      columns: [
        ['Mod v up', 'Bikes'],
        ['Single bridge L', 'Single b. R'],
      ],
    }

    expect(parseGoogleDocTable(html)).toEqual(expectedDto)
  })

  it('preserves exercise text when splitting <br>-separated lines', () => {
    const html = `
      <table>
        <tr>
          <td>Emom<br>  Pull thru 25  <br>B. squat row 20 Floor press 15<br>Swings 20<br>Alt curl press 60 seconds</td>
        </tr>
      </table>
    `

    expect(parseGoogleDocTable(html)).toEqual({
      headers: ['Emom'],
      columns: [
        [
          'Pull thru 25',
          'B. squat row 20 Floor press 15',
          'Swings 20',
          'Alt curl press 60 seconds',
        ],
      ],
    })
  })

  it('drops empty columns and keeps ragged ones as-is', () => {
    const html = `
      <table>
        <tr>
          <td><p>20/10</p><p>Jumping Jacks</p><p>High Knees</p></td>
          <td><p>3 x 10</p><p>Squats</p></td>
          <td>   </td>
        </tr>
      </table>
    `

    expect(parseGoogleDocTable(html)).toEqual({
      headers: ['20/10', '3 x 10'],
      columns: [['Jumping Jacks', 'High Knees'], ['Squats']],
    })
  })

  it('keeps header-only phases (the UI renders them as note strips)', () => {
    const html = `
      <table>
        <tr>
          <td><p>20/10</p><p>Jumping Jacks</p></td>
          <td><p>60 sec.</p></td>
        </tr>
      </table>
    `

    expect(parseGoogleDocTable(html)).toEqual({
      headers: ['20/10', '60 sec.'],
      columns: [['Jumping Jacks'], []],
    })
  })

  it('returns empty dto when the table has no rows or only empty cells', () => {
    expect(parseGoogleDocTable('<table></table>')).toEqual({
      headers: [],
      columns: [],
    })
    expect(
      parseGoogleDocTable('<table><tr><td>  </td><td></td></tr></table>')
    ).toEqual({ headers: [], columns: [] })
  })

  it('decodes HTML entities and collapses whitespace within each line', () => {
    const html = `
      <table>
        <tr>
          <td><p>Sets &amp; Reps</p><p>  Note&nbsp;with&nbsp;nbsp  </p><p>  Pull  thru 25  </p><p>Squats (10 reps)</p></td>
        </tr>
      </table>
    `

    expect(parseGoogleDocTable(html)).toEqual({
      headers: ['Sets & Reps'],
      columns: [
        ['Note with nbsp', 'Pull thru 25', 'Squats (10 reps)'],
      ],
    })
  })

  it('throws an error if no table is found', () => {
    const html = '<html><body><p>No table here</p></body></html>'
    expect(() => parseGoogleDocTable(html)).toThrow(
      'No table found in the Google Doc'
    )
  })
})
