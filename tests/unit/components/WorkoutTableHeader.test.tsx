/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import WorkoutTableHeader from '../../../components/WorkoutTableHeader'

global.fetch = jest.fn()

describe('WorkoutTableHeader', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('re-fetches data when refreshKey changes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headers: ['Initial Header'],
        rows: [{ cells: ['Initial Row Data'] }],
      }),
    })

    const { rerender } = render(
      <WorkoutTableHeader docId="test-doc-id" refreshKey={0} />
    )

    await waitFor(() => {
      expect(screen.getByText('Initial Header')).toBeInTheDocument()
      expect(screen.getByText('Initial Row Data')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        headers: ['Refreshed Header'],
        rows: [{ cells: ['Refreshed Row Data'] }],
      }),
    })

    rerender(<WorkoutTableHeader docId="test-doc-id" refreshKey={1} />)

    await waitFor(() => {
      expect(screen.getByText('Refreshed Header')).toBeInTheDocument()
      expect(screen.getByText('Refreshed Row Data')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
