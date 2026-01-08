/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import WorkoutTableViewer from '@/components/WorkoutTableViewer'

// Mock global fetch
global.fetch = jest.fn()

const mockedFetch = global.fetch as jest.Mock

describe('WorkoutTableViewer', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should display an error message when the API returns an error', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: 'This is a test error message' }),
    } as Response)

    render(<WorkoutTableViewer docId="test-doc-id" />)

    // Wait for the error message to appear
    const errorMessage = await screen.findByText(
      'This is a test error message'
    )
    expect(errorMessage).toBeInTheDocument()
  })
})
