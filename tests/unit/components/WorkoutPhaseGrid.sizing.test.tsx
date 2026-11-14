/**
 * @jest-environment jsdom
 *
 * OD-5: the grid's sizing behavior contract. The old step-down loop
 * converged from observed overflow across timing-sensitive signals;
 * the replacement runs exactly one pure, idempotent computation per
 * trigger and applies the result through CSS custom properties. These
 * tests pin: one computation per content change, idempotent recompute
 * on resize (no ratchet), zero-area boxes ignored, and cleanup.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import WorkoutPhaseGrid from '@/components/WorkoutPhaseGrid'
import { computeWorkoutFit } from '@/lib/workoutSizing'

jest.mock('@/lib/workoutSizing', () => {
  const actual = jest.requireActual<typeof import('@/lib/workoutSizing')>(
    '@/lib/workoutSizing'
  )
  return {
    ...actual,
    computeWorkoutFit: jest.fn(actual.computeWorkoutFit),
  }
})

const computeFitMock = computeWorkoutFit as unknown as jest.Mock

global.fetch = jest.fn()

jest.mock('@/components/ScaledStage', () => ({
  useInScaledStage: () => true,
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

// jsdom lays out at 0px: give the grid a settled box so the fit guard
// passes, the way a real browser reports it.
const settleGridBox = () => {
  const grid = screen.getByTestId('workout-phase-grid')
  Object.defineProperty(grid, 'clientWidth', {
    value: 300,
    configurable: true,
  })
  Object.defineProperty(grid, 'clientHeight', {
    value: 400,
    configurable: true,
  })
  return grid
}

const fireResize = (width = 300, height = 400) => {
  act(() => {
    resizeCallback?.([{ contentRect: { width, height } }])
  })
}

const latestFit = () =>
  computeFitMock.mock.results[computeFitMock.mock.results.length - 1].value as {
    exerciseRem: number
    headerRem: number
  }

describe('WorkoutPhaseGrid deterministic fit', () => {
  const payload = {
    headers: ['tall'],
    columns: [['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']],
  }

  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
    computeFitMock.mockClear()
    observe.mockClear()
    disconnect.mockClear()
    resizeCallback = null
  })

  it('runs the fit exactly once per content change and applies it through CSS custom properties', async () => {
    const { unmount } = render(<WorkoutPhaseGrid docId="test-doc-id" />)
    await waitFor(() => {
      expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
    })
    settleGridBox()
    fireResize()

    await waitFor(() => {
      expect(computeFitMock).toHaveBeenCalledTimes(1)
    })
    const fit = latestFit()
    const grid = screen.getByTestId('workout-phase-grid')
    expect(grid.style.getPropertyValue('--workout-exercise-font-rem')).toBe(
      `${fit.exerciseRem}rem`
    )
    expect(grid.style.getPropertyValue('--workout-header-font-rem')).toBe(
      `${fit.headerRem}rem`
    )

    unmount()
  })

  it('recomputes from scratch on every resize trigger and never ratchets', async () => {
    const { unmount } = render(<WorkoutPhaseGrid docId="test-doc-id" />)
    await waitFor(() => {
      expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
    })
    settleGridBox()
    fireResize()
    await waitFor(() => {
      expect(computeFitMock).toHaveBeenCalledTimes(1)
    })
    const first = latestFit()
    const grid = screen.getByTestId('workout-phase-grid')
    const firstVar = grid.style.getPropertyValue('--workout-exercise-font-rem')

    // Repeated settle signals re-run the full computation; the result
    // is identical, so the painted size can never step down.
    fireResize()
    fireResize()
    await waitFor(() => {
      expect(computeFitMock).toHaveBeenCalledTimes(3)
    })
    expect(latestFit()).toEqual(first)
    expect(grid.style.getPropertyValue('--workout-exercise-font-rem')).toBe(
      firstVar
    )

    unmount()
  })

  it('ignores zero-area resize events instead of fitting into nothing', async () => {
    const { unmount } = render(<WorkoutPhaseGrid docId="test-doc-id" />)
    await waitFor(() => {
      expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
    })
    fireResize(0, 0)
    // Let the rAF pass flush; no computation may run for a 0x0 box.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(computeFitMock).not.toHaveBeenCalled()
    const grid = screen.getByTestId('workout-phase-grid')
    expect(grid.style.getPropertyValue('--workout-exercise-font-rem')).toBe('')

    unmount()
  })

  it('disconnects the observer on unmount', async () => {
    const { unmount } = render(<WorkoutPhaseGrid docId="test-doc-id" />)
    await waitFor(() => {
      expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
    })
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
