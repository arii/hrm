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
    // The observer attaches in a later flush than the grid paint (the
    // grid waits on the font gate), so wait for it.
    await waitFor(() => {
      expect(resizeCallback).not.toBeNull()
    })
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
    // settle pass steps the font down on its own. The mocks report
    // overflow permanently, so repeated passes converge to the 1.4 floor.
    // (The grid box itself is settled at 400px; only the card overflows.)
    const grid = screen.getByTestId('workout-phase-grid')
    Object.defineProperty(grid, 'clientHeight', {
      value: 400,
      configurable: true,
    })
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
        fontSize: '1.4rem',
      })
    })

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it('recovers the data-driven size on settle after transient overflow (no refresh click)', async () => {
    // Same 8-row payload: base size is 1.9rem.
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
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.9rem',
      })
    })

    // Transient overflow while layout/fonts settle steps the font down
    // (any amount — the exact depth is timing, the drop itself is not).
    // (The grid box itself is settled at 400px; only the card overflows.)
    await waitFor(() => {
      expect(resizeCallback).not.toBeNull()
    })
    const grid = screen.getByTestId('workout-phase-grid')
    Object.defineProperty(grid, 'clientHeight', {
      value: 400,
      configurable: true,
    })
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
      expect(screen.getAllByTestId('workout-exercise-text')[0]).not.toHaveStyle(
        {
          fontSize: '1.9rem',
        }
      )
    })

    // Layout settles and the content fits at base size: the next settle
    // event must restore 1.9rem on its own — a manual refresh click must
    // never be required.
    Object.defineProperty(card, 'scrollHeight', {
      value: 400,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 300, height: 400 } }])
    })
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.9rem',
      })
    })

    unmount()
  })

  it('keeps the grid hidden until revealed, then shows settled content', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headers: ['tall'],
        columns: [['a', 'b']],
      }),
    })

    const { unmount } = render(<WorkoutPhaseGrid docId="test-doc-id" />)
    await waitFor(() => {
      expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
    })

    // Convergence commits stay invisible behind the settle spinner…
    expect(screen.getByTestId('workout-phase-grid')).not.toBeVisible()
    expect(
      screen.getByTestId('workout-grid-settle-spinner')
    ).toBeInTheDocument()

    // …until the reveal lands (bounded by the settle timeout in jsdom,
    // where zero layout never lets passes agree).
    await waitFor(
      () => {
        expect(screen.getByTestId('workout-phase-grid')).toBeVisible()
      },
      { timeout: 5000 }
    )
    expect(
      screen.queryByTestId('workout-grid-settle-spinner')
    ).not.toBeInTheDocument()

    unmount()
  })

  it('steps down when the grid overflows even if cards report no overflow', async () => {
    // Same 8-row payload: base size is 1.9rem.
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
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.9rem',
      })
    })

    // Scroll-parent absorption: cards size to content (no card-level
    // overflow) but the fixed-height grid itself overflows.
    await waitFor(() => {
      expect(resizeCallback).not.toBeNull()
    })
    const card = document.querySelector('.MuiCard-root') as HTMLElement
    Object.defineProperty(card, 'clientHeight', {
      value: 500,
      configurable: true,
    })
    Object.defineProperty(card, 'scrollHeight', {
      value: 500,
      configurable: true,
    })
    const grid = screen.getByTestId('workout-phase-grid')
    Object.defineProperty(grid, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(grid, 'scrollHeight', {
      value: 600,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 300, height: 400 } }])
    })
    // Grid overflow never clears in the mock, so the fit converges to the
    // 1.4 floor.
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.4rem',
      })
    })

    unmount()
  })
})
