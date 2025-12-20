/**
 * @jest-environment jsdom
 */
// File: tests/unit/components/Spotify/SpotifySearchInput.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SpotifySearchInput } from '@/components/Spotify/SpotifySearchInput'
import { useSpotifySearch } from '@/hooks/useSpotifySearch'

// Mock the hook
jest.mock('@/hooks/useSpotifySearch')
const mockUseSpotifySearch = useSpotifySearch as jest.Mock

describe('SpotifySearchInput', () => {
  const mockSearchTracks = jest.fn()
  const mockClearSearch = jest.fn()
  const onTrackSelected = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSpotifySearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      searchTracks: mockSearchTracks,
      clearSearch: mockClearSearch,
    })
  })

  it('should render input and debounce search call', async () => {
    render(<SpotifySearchInput onTrackSelected={onTrackSelected} />)
    const input = screen.getByPlaceholderText('Search for a track...')
    fireEvent.change(input, { target: { value: 'test' } })

    // Should not call immediately
    await waitFor(() => expect(mockSearchTracks).toHaveBeenCalledWith(''))

    // Should call after debounce
    await waitFor(() => expect(mockSearchTracks).toHaveBeenCalledWith('test'), {
      timeout: 600,
    })
  })

  it('should show loading indicator', () => {
    mockUseSpotifySearch.mockReturnValue({
      results: [],
      loading: true,
      error: null,
      searchTracks: mockSearchTracks,
      clearSearch: mockClearSearch,
    })
    render(<SpotifySearchInput onTrackSelected={onTrackSelected} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show clear button and handle clear', async () => {
    render(<SpotifySearchInput onTrackSelected={onTrackSelected} />)
    const input = screen.getByPlaceholderText('Search for a track...')
    fireEvent.change(input, { target: { value: 'test' } })

    const clearButton = await screen.findByRole('button')
    fireEvent.click(clearButton)

    expect(mockClearSearch).toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('should display search results and handle selection', () => {
    const mockResults = [
      {
        id: '1',
        name: 'Track 1',
        uri: 'uri:1',
        artists: [{ name: 'Artist 1' }],
      },
    ]
    mockUseSpotifySearch.mockReturnValue({
      results: mockResults,
      loading: false,
      error: null,
      searchTracks: mockSearchTracks,
      clearSearch: mockClearSearch,
    })
    render(<SpotifySearchInput onTrackSelected={onTrackSelected} />)

    const listItem = screen.getByText('Track 1')
    fireEvent.click(listItem)

    expect(onTrackSelected).toHaveBeenCalledWith('uri:1')
  })

  it('should display error message', () => {
    mockUseSpotifySearch.mockReturnValue({
      results: [],
      loading: false,
      error: 'Test Error',
      searchTracks: mockSearchTracks,
      clearSearch: mockClearSearch,
    })
    render(<SpotifySearchInput onTrackSelected={onTrackSelected} />)
    expect(screen.getByText('Test Error')).toBeInTheDocument()
  })
})
