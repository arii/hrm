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
    }

    const result = parseGoogleDocTable(html)
    expect(result).toEqual(expectedDto)
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

  it('should return empty headers if no rows are found', () => {
    const html = '<table></table>'
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual([])
  })

  it('should handle <br> and <p> tags for spacing', () => {
    const html = `
      <table>
        <tr>
          <td>Line 1<br>Line 2</td>
          <td><p>Para 1</p><p>Para 2</p></td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['Line 1 Line 2', 'Para 1 Para 2'])
  })

  it('should only parse the first table in the document', () => {
    const html = `
      <table><tr><td>Table 1</td></tr></table>
      <table><tr><td>Table 2</td></tr></table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['Table 1'])
  })

  it('should handle cells with multiple nested elements', () => {
    const html = `
      <table>
        <tr>
          <td>
            <div>First</div>
            <span>Second</span>
            <p>Third</p>
            Last
          </td>
        </tr>
      </table>
    `
    // Whitespace between tags is collapsed to a single space.
    const result = parseGoogleDocTable(html)
    expect(result.headers[0]).toBe('First Second Third Last')
  })

  it('should handle compact HTML with nested block elements', () => {
    const html =
      '<table><tr><td><div>A</div><div>B</div><p>C</p>D</td></tr></table>'
    const result = parseGoogleDocTable(html)
    // Should be "A B C D"
    expect(result.headers[0]).toBe('A B C D')
  })

  it('should handle text directly before and after block elements', () => {
    const html = '<table><tr><td>TextBefore<div>Block</div>TextAfter</td></tr></table>'
    const result = parseGoogleDocTable(html)
    expect(result.headers[0]).toBe('TextBefore Block TextAfter')
  })

  it('should handle non-breaking spaces and other whitespace characters', () => {
    const html = `
      <table>
        <tr>
          <td>Item&nbsp;1</td>
          <td>Item\u00A02</td>
          <td>Item\t3</td>
        </tr>
      </table>
    `
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual(['Item 1', 'Item 2', 'Item 3'])
  })

  it('should return empty headers for a row with no cells', () => {
    const html = '<table><tr></tr></table>'
    const result = parseGoogleDocTable(html)
    expect(result.headers).toEqual([])
  })
})
