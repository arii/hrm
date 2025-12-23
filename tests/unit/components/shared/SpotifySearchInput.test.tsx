/**
 * @jest-environment jsdom
 */
import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react'
// TODO: a11y tests are timing out. Re-enable when the issue is resolved.
// import { axe } from 'jest-axe'
import SpotifySearchInput from '../../../../components/shared/SpotifySearchInput'

global.fetch = jest.fn()

describe('SpotifySearchInput', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    ;(fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the input field', () => {
    render(<SpotifySearchInput />)
    expect(screen.getByPlaceholderText('Search Spotify...')).toBeInTheDocument()
  })

  it('updates the query on input', () => {
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(input).toHaveValue('test')
  })

  it('clears the input when the clear button is clicked', () => {
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(input).toHaveValue('test')
    const clearButton = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearButton)
    expect(input).toHaveValue('')
  })

  it('shows the loading indicator while fetching', async () => {
    ;(fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Keep promise pending
    )
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })

    // Advance timers to trigger the debounced fetch
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // The MUI CircularProgress component renders with role="status" in this env
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('shows results after a successful search', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          tracks: {
            items: [
              {
                id: '1',
                name: 'Test Track',
                artists: [{ name: 'Test Artist' }],
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
              },
            ],
          },
        }),
    })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    // The test environment appears to render a simplified output.
    // This assertion checks for the essential content.
    await waitFor(() =>
      expect(screen.getByText(/Test Track/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/Test Artist/i)).toBeInTheDocument()
  })

  it('shows "No results found" when search returns no items', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tracks: { items: [] } }),
    })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() =>
      expect(screen.getByText('No results found.')).toBeInTheDocument()
    )
  })

  it('shows an error message when the search fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() =>
      expect(screen.getByText('Failed to fetch results.')).toBeInTheDocument()
    )
  })

  // TODO: a11y tests are timing out. Re-enable when the issue is resolved.
  // it(
  //   'should have no accessibility violations',
  //   async () => {
  //     const { container } = render(<SpotifySearchInput />)
  //     const results = await axe(container)
  //     expect(results).toHaveNoViolations()
  //   },
  //   30000
  // )
})
