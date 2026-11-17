import { parseIntervalHeader } from '@/lib/intervalHeader'

describe('parseIntervalHeader', () => {
  it.each([
    ['20/10', 20, 10],
    ['30/15x2', 30, 15],
    ['25/10 x3', 25, 10],
    [' 40 / 10 ', 40, 10],
  ])('reads %s as %i work / %i rest', (header, work, rest) => {
    expect(parseIntervalHeader(header)).toEqual({
      workDuration: work,
      restDuration: rest,
    })
  })

  it.each(['Tabata', '3 x 10', 'Chipper 20/15/10', 'EMOM x 3', '0/10', ''])(
    'does not treat %p as a startable interval',
    (header) => {
      expect(parseIntervalHeader(header)).toBeNull()
    }
  )
})
