/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PlaylistTracksDisplay from '@/components/Spotify/PlaylistTracksDisplay'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn()

// Mock WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  __esModule: true,
  useWebSocket: () => ({
    spotifyData: {
      isPlaying: false,
      trackName: '',
    },
  }),
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

const mockTrack = {
  name: 'Test Track',
  uri: 'spotify:track:123',
  artists: 'Artist1',
  albumImageUrl: 'http://image.url',
  albumName: 'Test Album',
  durationMs: 200000,
}

describe('PlaylistTracksDisplay Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockReset()
  })

  it('should display a loading spinner initially', async () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves
    render(<PlaylistTracksDisplay playlistId="12345" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    // No need to await anything, the test finishes while the promise is pending
  })

  it('should display an error message if fetching fails', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
    render(<PlaylistTracksDisplay playlistId="12345" />)
    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument()
    })
  })

  it('should display "playlist is empty" message if no tracks are returned', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [], total: 0 }),
    })
    render(<PlaylistTracksDisplay playlistId="12345" />)
    await waitFor(() => {
      expect(screen.getByText(/This playlist is empty/i)).toBeInTheDocument()
    })
  })

  it('should render tracks and pagination when fetch is successful', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [mockTrack], total: 1 }),
    })
    render(<PlaylistTracksDisplay playlistId="12345" />)
    await waitFor(() => {
      expect(screen.getByText('Test Track')).toBeInTheDocument()
      expect(screen.getByText('Artist1')).toBeInTheDocument()
      expect(screen.getByText('Test Album')).toBeInTheDocument()
      expect(screen.getByText('Showing 1-1 of 1')).toBeInTheDocument()
    })
  })

  it('should call the play endpoint when play button is clicked', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [mockTrack], total: 1 }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    render(<PlaylistTracksDisplay playlistId="12345" />)

    const playButton = await screen.findByRole('button', { name: /play/i })
    fireEvent.click(playButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/spotify/control',
        expect.any(Object)
      )
      const fetchOptions = (fetch as jest.Mock).mock.calls[1][1]
      const body = JSON.parse(fetchOptions.body)
      expect(body.command).toBe('PLAY')
      expect(body.offset.uri).toBe(mockTrack.uri)
    })
  })
})
