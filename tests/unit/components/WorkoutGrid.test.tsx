/** @jest-environment jsdom */
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkoutGrid from '../../../components/WorkoutGrid'

// Mock the fetch API
global.fetch = jest.fn()

// Mock the helper to avoid issues with JSX in a .ts file during tests
jest.mock('../../../utils/workout-helpers', () => ({
  getIconForExercise: () => <div data-testid="mock-icon" />,
}))

describe('WorkoutGrid', () => {
  const docId = 'test-doc-id'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a loading spinner initially', () => {
    ;(fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )
    render(<WorkoutGrid docId={docId} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows an error message if the fetch fails', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Failure'))

    await act(async () => {
      render(<WorkoutGrid docId={docId} />)
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/API Failure/i)
    })
  })

  it('shows an info message if no data is returned', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headers: [], rows: [] }),
    })

    await act(async () => {
      render(<WorkoutGrid docId={docId} />)
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /No workout data found/i
      )
    })
  })

  it('renders workout cards with fetched data', async () => {
    const mockData = {
      headers: ['Exercise', 'Notes'],
      rows: [
        ['Squats', '3x10'],
        ['Push-ups', '3x15'],
      ],
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    await act(async () => {
      render(<WorkoutGrid docId={docId} />)
    })

    await waitFor(() => {
      expect(screen.getByText("Today's Workout")).toBeInTheDocument()
    })

    expect(screen.getByText('Squats')).toBeInTheDocument()
    expect(screen.getByText('3x10')).toBeInTheDocument()
    expect(screen.getByText('Push-ups')).toBeInTheDocument()
    expect(screen.getByText('3x15')).toBeInTheDocument()

    // Check that our mock icon is rendered
    const icons = screen.getAllByTestId('mock-icon')
    expect(icons).toHaveLength(2)
  })
})
