/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)
    expect(input).toHaveValue('')
  })

  it('shows the loading indicator while fetching', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tracks: { items: [] } }),
    })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument(), { timeout: 5000 })
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(), { timeout: 5000 })
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
              },
            ],
          },
        }),
    })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })
    await waitFor(() =>
      expect(screen.getByText('Test Track by Test Artist')).toBeInTheDocument(), { timeout: 5000 }
    )
  })

  it('shows "No results found" when the search is successful but returns no items', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tracks: { items: [] } }),
    })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })
    await waitFor(() =>
      expect(screen.getByText('No results found.')).toBeInTheDocument(), { timeout: 5000 }
    )
  })

  it('shows an error message when the search fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    render(<SpotifySearchInput />)
    const input = screen.getByPlaceholderText('Search Spotify...')
    fireEvent.change(input, { target: { value: 'test' } })
    await waitFor(() =>
      expect(screen.getByText('Failed to fetch results.')).toBeInTheDocument(), { timeout: 5000 }
    )
  })
})
