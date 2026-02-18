/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import WorkoutTableViewer from '@/components/WorkoutTableViewer'

global.fetch = jest.fn()

describe('WorkoutTableViewer', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('re-fetches data when refreshKey changes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headers: ['Workout'], rows: [['Initial Data']] }),
    })

    const { rerender } = render(
      <WorkoutTableViewer docId="test-doc-id" refreshKey={0} />
    )

    await waitFor(() => {
      expect(screen.getByText('Initial Data')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ headers: ['Workout'], rows: [['Refreshed Data']] }),
    })

    rerender(<WorkoutTableViewer docId="test-doc-id" refreshKey={1} />)

    await waitFor(() => {
      expect(screen.getByText('Refreshed Data')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
