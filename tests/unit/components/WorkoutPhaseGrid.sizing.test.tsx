/**
 * @jest-environment jsdom
 *
 * Regression test for the initial-load sizing race: workout phase text
 * must rescale when the card containers settle, without requiring a
 * manual refresh click.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import WorkoutPhaseGrid from '@/components/WorkoutPhaseGrid'

global.fetch = jest.fn()

jest.mock('@/components/ScaledStage', () => ({
  useIsScaledLayout: () => true,
}))

// jsdom has no ResizeObserver: capture the callback so tests can fire
// layout-settle events deterministically.
let resizeCallback:
  | ((entries: { contentRect: { width: number; height: number } }[]) => void)
  | null = null
const observe = jest.fn()
const disconnect = jest.fn()
beforeAll(() => {
  ;(global as unknown as Record<string, unknown>).ResizeObserver = jest
    .fn()
    .mockImplementation((cb) => {
      resizeCallback = cb
      return { observe, disconnect, unobserve: jest.fn() }
    })
})

afterAll(() => {
  delete (global as unknown as Record<string, unknown>).ResizeObserver
})

describe('WorkoutPhaseGrid initial-load sizing', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
    observe.mockClear()
    disconnect.mockClear()
    resizeCallback = null
  })

  it('recalculates font size when the container settles after mounting at 0 height', async () => {
    // 8 single-char exercises: tallest card holds 8 effective rows,
    // so the data-driven base size is 1.9rem.
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headers: ['tall'],
        columns: [['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']],
      }),
    })

    const { unmount } = render(<WorkoutPhaseGrid docId="test-doc-id" />)
    await waitFor(() => {
      expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
    })

    // jsdom lays out at 0px: the guard must skip, never locking in a size
    // from unsettled dimensions. Firing a zero rect changes nothing.
    expect(resizeCallback).not.toBeNull()
    expect(observe).toHaveBeenCalledWith(
      screen.getByTestId('workout-phase-grid')
    )
    act(() => {
      resizeCallback?.([{ contentRect: { width: 0, height: 0 } }])
    })
    // Data-driven base size lands after the fetch commit flushes.
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.9rem',
      })
    })

    // Container settles with overflowing content: no refresh click, the
    // ResizeObserver pass steps the font down on its own.
    const card = document.querySelector('.MuiCard-root') as HTMLElement
    Object.defineProperty(card, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(card, 'scrollHeight', {
      value: 500,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 300, height: 400 } }])
    })
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.8rem',
      })
    })

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
