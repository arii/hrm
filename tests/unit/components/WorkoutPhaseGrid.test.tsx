/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import WorkoutPhaseGrid from '../../../components/WorkoutPhaseGrid'

global.fetch = jest.fn()

describe('WorkoutPhaseGrid', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('re-fetches data when refreshKey changes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headers: ['Initial Header'], columns: [[]] }),
    })

    const { rerender } = render(
      <WorkoutPhaseGrid docId="test-doc-id" refreshKey={0} />
    )

    await waitFor(() => {
      expect(screen.getByText('Initial Header')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headers: ['Refreshed Header'], columns: [[]] }),
    })

    rerender(<WorkoutPhaseGrid docId="test-doc-id" refreshKey={1} />)

    await waitFor(() => {
      expect(screen.getByText('Refreshed Header')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('renders one card per phase with its exercises', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headers: ['20/10', '3 x 10'],
        columns: [['Jumping Jacks', 'High Knees'], ['Squats (10 reps)']],
      }),
    })

    render(<WorkoutPhaseGrid docId="test-doc-id" />)

    await waitFor(() => {
      expect(screen.getByText('Squats (10 reps)')).toBeInTheDocument()
    })
    expect(screen.getByText('20/10')).toBeInTheDocument()
    expect(screen.getByText('Jumping Jacks')).toBeInTheDocument()
    expect(screen.getByText('High Knees')).toBeInTheDocument()
    expect(screen.getByTestId('workout-phase-grid')).toBeInTheDocument()
  })

  it('renders header-only phases as plain cards alongside the rest', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headers: ['20/10', '60 sec.'],
        columns: [['Jumping Jacks'], []],
      }),
    })

    render(<WorkoutPhaseGrid docId="test-doc-id" />)

    await waitFor(() => {
      expect(screen.getByText('60 sec.')).toBeInTheDocument()
    })
    expect(screen.getByText('Jumping Jacks')).toBeInTheDocument()
    // Uneven cards are fine: both phases share the one grid.
    expect(screen.getByTestId('workout-phase-grid').children).toHaveLength(2)
  })

  it('renders headers only when columns are absent', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headers: ['Only Header'] }),
    })

    render(<WorkoutPhaseGrid docId="test-doc-id" />)

    await waitFor(() => {
      expect(screen.getByText('Only Header')).toBeInTheDocument()
    })
  })
})
