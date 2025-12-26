
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SnackbarProvider } from 'notistack'
import SpotifySearchInput from '@/components/Spotify/SpotifySearchInput'

// Mock useDebounce hook
jest.mock('@/hooks/useDebounce', () => (value: any) => value)

// Mock fetch
global.fetch = jest.fn()

describe('SpotifySearchInput', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render the search input', () => {
    render(
      <SnackbarProvider>
        <SpotifySearchInput />
      </SnackbarProvider>
    )
    expect(screen.getByPlaceholderText('Search for a song...')).toBeInTheDocument()
  })

  it('should show "Start typing to search" message initially', () => {
    render(
      <SnackbarProvider>
        <SpotifySearchInput />
      </SnackbarProvider>
    )
    expect(screen.getByText('Start typing to search Spotify...')).toBeInTheDocument()
  })

  it('should call fetch with the correct query when user types', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: { items: [] } }),
    })

    render(
      <SnackbarProvider>
        <SpotifySearchInput />
      </SnackbarProvider>
    )

    const searchInput = screen.getByPlaceholderText('Search for a song...')
    await userEvent.type(searchInput, 'test query')

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/spotify/search?q=test%20query&type=track')
    })
  })

  it('should display "No results found" when search returns no tracks', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: { items: [] } }),
    })

    render(
      <SnackbarProvider>
        <SpotifySearchInput />
      </SnackbarProvider>
    )

    const searchInput = screen.getByPlaceholderText('Search for a song...')
    await userEvent.type(searchInput, 'no results')

    await waitFor(() => {
      expect(screen.getByText('No results found for "no results"')).toBeInTheDocument()
    })
  })

  it('should display search results', async () => {
    const mockTracks = {
      tracks: {
        items: [
          {
            id: '1',
            name: 'Test Track',
            artists: [{ name: 'Test Artist' }],
            album: { name: 'Test Album', images: [] },
            uri: 'test-uri',
          },
        ],
      },
    }
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTracks),
    })

    render(
      <SnackbarProvider>
        <SpotifySearchInput />
      </SnackbarProvider>
    )

    const searchInput = screen.getByPlaceholderText('Search for a song...')
    await userEvent.type(searchInput, 'test')

    await waitFor(() => {
      expect(screen.getByText('Test Track')).toBeInTheDocument()
    })
  })

  it('should call onTrackSelect when a track is clicked', async () => {
    const onTrackSelect = jest.fn()
    const mockTracks = {
      tracks: {
        items: [
          {
            id: '1',
            name: 'Test Track',
            artists: [{ name: 'Test Artist' }],
            album: { name: 'Test Album', images: [] },
            uri: 'test-uri',
          },
        ],
      },
    }
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTracks),
    })

    render(
      <SnackbarProvider>
        <SpotifySearchInput onTrackSelect={onTrackSelect} />
      </SnackbarProvider>
    )

    const searchInput = screen.getByPlaceholderText('Search for a song...')
    await userEvent.type(searchInput, 'test')

    await waitFor(() => {
      fireEvent.click(screen.getByText('Test Track'))
      expect(onTrackSelect).toHaveBeenCalledWith('test-uri')
    })
  })
})
