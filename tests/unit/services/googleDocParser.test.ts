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
      rows: [['Squats', '3', '10', 'Form check']],
    }

    const result = parseGoogleDocTable(html)
    expect(result).toEqual(expectedDto)
  })

  it('should parse multiple rows correctly', () => {
    const html = `
      <table>
        <tr><td>H1</td><td>H2</td></tr>
        <tr><td>R1C1</td><td>R1C2</td></tr>
        <tr><td>R2C1</td><td>R2C2</td></tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['H1', 'H2'])
    expect(result.rows).toEqual([
      ['R1C1', 'R1C2'],
      ['R2C1', 'R2C2'],
    ])
  })

  it('should clean whitespace from cell contents', () => {
    const html = `
      <table>
        <tr>
          <td>  Exercise  </td>
          <td>Sets</td>
          <td>\tReps</td>
          <td>Notes</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['Exercise', 'Sets', 'Reps', 'Notes'])
  })

  it('should replace newlines with spaces in cell contents', () => {
    const html = `
      <table>
        <tr>
          <td>Line 1\nLine 2</td>
          <td>Part A\r\nPart B</td>
          <td>Space\rCase</td>
          <td>Notes</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual([
      'Line 1 Line 2',
      'Part A Part B',
      'Space Case',
      'Notes',
    ])
  })

  it('should preserve empty cells to maintain column alignment', () => {
    const html = `
      <table>
        <tr>
          <td>Exercise</td>
          <td></td>
          <td>Reps</td>
          <td>Notes</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['Exercise', '', 'Reps', 'Notes'])
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

  it('should handle complex nested block elements and prevent text merging', () => {
    const html = `
      <table>
        <tr>
          <td>
            <div>Block 1</div>
            <p>Block 2</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </td>
          <td>
            <h1>Header</h1>
            <blockquote>Quote</blockquote>
          </td>
          <td>
            Mixed <span>inline</span> and <div>block</div> text
          </td>
          <td>
            Cell with <br> break
          </td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual([
      'Block 1 Block 2 Item 1 Item 2',
      'Header Quote',
      'Mixed inline and block text',
      'Cell with break',
    ])
  })

  it('should decode HTML entities in cell contents', () => {
    const html = `
      <table>
        <tr>
          <td>&lt;Exercise&gt;</td>
          <td>Sets &amp; Reps</td>
          <td>Price: &pound;10</td>
          <td>Note&nbsp;with&nbsp;nbsp</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual([
      '<Exercise>',
      'Sets & Reps',
      'Price: £10',
      'Note with nbsp',
    ])
  })
})
