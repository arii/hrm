/**
 * @jest-environment jsdom
 */
import {
  DASHBOARD_TOP_ROW_HEIGHT_MD,
  getHrGridConfig,
  getTopRowGridColumns,
} from '@/constants/layout'

describe('dashboard top-row layout', () => {
  it('locks the top-row height on desktop', () => {
    expect(DASHBOARD_TOP_ROW_HEIGHT_MD).toBe('340px')
  })

  it('gives the timer full width when no HR clients are connected', () => {
    expect(getTopRowGridColumns(0)).toEqual({ xs: '1fr', md: '1fr' })
  })

  it('shrinks the timer to ~38% for exactly 3 HR clients', () => {
    expect(getTopRowGridColumns(3)).toEqual({ xs: '1fr', md: '38fr 62fr' })
  })

  it.each([1, 2, 4, 5])('uses a 50/50 split for %i HR clients', (count) => {
    expect(getTopRowGridColumns(count)).toEqual({
      xs: '1fr',
      md: '50fr 50fr',
    })
  })

  it('renders 1 HR client in a single full-width cell', () => {
    expect(getHrGridConfig(1)).toEqual({
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
    })
  })

  it('renders 2 HR clients side by side in a single row', () => {
    expect(getHrGridConfig(2)).toEqual({
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: '1fr',
    })
  })

  it('renders 3 HR clients in a single 3-column row', () => {
    expect(getHrGridConfig(3)).toEqual({
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: '1fr',
    })
  })

  it('renders 4 HR clients in a compact 2-row grid', () => {
    expect(getHrGridConfig(4)).toEqual({
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
    })
  })

  it('renders 5 HR clients in a compact 2-row grid', () => {
    expect(getHrGridConfig(5)).toEqual({
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
    })
  })
})
