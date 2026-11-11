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
    // jsdom reports 0 widths: the width-settled guard needs an explicit
    // mock or every pass skips.
    Object.defineProperty(grid, 'clientWidth', {
      value: 1600,
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
    // jsdom reports 0 widths: the width-settled guard needs an explicit
    // mock or every pass skips.
    Object.defineProperty(grid, 'clientWidth', {
      value: 1600,
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

  it('requests fresh data on explicit refresh clicks, cached on initial load', async () => {
    const payload = { headers: ['h'], columns: [['a']] }
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => payload,
    })

    const { rerender, unmount } = render(
      <WorkoutPhaseGrid docId="test-doc-id" refreshKey={0} />
    )
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/workout?docId=test-doc-id')
      )
    })
    expect((fetch as jest.Mock).mock.calls[0][0]).not.toContain('fresh=1')
    ;(fetch as jest.Mock).mockClear()
    rerender(<WorkoutPhaseGrid docId="test-doc-id" refreshKey={1} />)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('fresh=1'))
    })

    unmount()
  })

  it('skips measuring while the grid width is unsettled', async () => {
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

    // Card overflows, but the grid width is still resolving: the pass
    // must not measure (narrow cards read tall and would ratchet to the
    // floor), so no probe trace is written and the base size holds.
    delete (window as unknown as { __fitTrace?: string }).__fitTrace
    await waitFor(() => {
      expect(resizeCallback).not.toBeNull()
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
    const grid = screen.getByTestId('workout-phase-grid')
    Object.defineProperty(grid, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(grid, 'scrollHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(grid, 'clientWidth', {
      value: 0,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 1600, height: 400 } }])
    })
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(
      (window as unknown as { __fitTrace?: string }).__fitTrace
    ).toBeUndefined()
    expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
      fontSize: '1.9rem',
    })

    // Once the width settles, the same overflow steps down as usual.
    Object.defineProperty(grid, 'clientWidth', {
      value: 1600,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 1600, height: 400 } }])
    })
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.4rem',
      })
    })

    unmount()
  })

  it('stages post-reveal shrinks and commits only on confirmation', async () => {
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

    // Settle clean so passes agree and the grid reveals.
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
      value: 400,
      configurable: true,
    })
    Object.defineProperty(grid, 'clientWidth', {
      value: 1600,
      configurable: true,
    })
    Object.defineProperty(grid, 'scrollWidth', {
      value: 1600,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 1600, height: 400 } }])
    })
    await waitFor(
      () => {
        expect(
          screen.queryByTestId('workout-grid-settle-spinner')
        ).not.toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Let the blind data-settle timers (500/1500/3000ms) exhaust while
    // clean so the only later signals are the ones this test fires.
    await new Promise((resolve) => setTimeout(resolve, 3500))

    // Overflow appears after reveal: the shrink stages but does NOT
    // commit on the lone pass — the size holds through the staging
    // window, then the scheduled confirmation pass agrees and commits.
    Object.defineProperty(card, 'scrollHeight', {
      value: 600,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 1600, height: 400 } }])
    })
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
      fontSize: '1.9rem',
    })
    await waitFor(
      () => {
        expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
          fontSize: '1.4rem',
        })
      },
      { timeout: 4000 }
    )

    unmount()
  })

  it('steps down on grid horizontal overflow and records W verdicts', async () => {
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

    // Horizontal-only overflow: vertical metrics are clean, but the grid
    // scrolls sideways (wide tracks/content). The fit must still step
    // down, and the verdict trace must record W (not V/C) so remote
    // triage can tell horizontal from vertical overflow.
    delete (window as unknown as { __fitTrace?: string }).__fitTrace
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
      value: 400,
      configurable: true,
    })
    Object.defineProperty(grid, 'clientWidth', {
      value: 1600,
      configurable: true,
    })
    Object.defineProperty(grid, 'scrollWidth', {
      value: 1700,
      configurable: true,
    })
    act(() => {
      resizeCallback?.([{ contentRect: { width: 1600, height: 400 } }])
    })
    // Horizontal overflow never clears in the mock, so the fit converges
    // to the 1.4 floor.
    await waitFor(() => {
      expect(screen.getAllByTestId('workout-exercise-text')[0]).toHaveStyle({
        fontSize: '1.4rem',
      })
    })
    expect((window as unknown as { __fitTrace?: string }).__fitTrace).toMatch(
      /1\.9W/
    )
    expect(
      (window as unknown as { __fitTrace?: string }).__fitTrace
    ).not.toMatch(/V|C/)

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
    // jsdom reports 0 widths: the width-settled guard needs explicit
    // mocks (vertical-only overflow here, so sw == cw).
    Object.defineProperty(grid, 'clientWidth', {
      value: 1600,
      configurable: true,
    })
    Object.defineProperty(grid, 'scrollWidth', {
      value: 1600,
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
