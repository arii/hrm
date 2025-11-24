import React from 'react'
import { renderWithTheme, screen, userEvent } from '../../utils/testHelpers'
import SpotifyDisplay from '../../../components/SpotifyDisplay'

// Mock the WebSocket context
jest.mock('../../../context/WebSocketContext', () => ({
  useWebSocket: () => ({
    spotifyData: {
      isPlaying: false,
      trackName: 'No track playing',
      artistName: '',
      deviceId: null,
      volume: 50,
    },
    sendMessage: jest.fn(),
  }),
}))

describe('SpotifyDisplay Component', () => {
  test('renders with no track playing', () => {
    renderWithTheme(<SpotifyDisplay />)
    
    expect(screen.getByText('No track playing')).toBeInTheDocument()
  })

  test('renders with track playing', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      spotifyData: {
        isPlaying: true,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        deviceId: 'device123',
        volume: 75,
      },
      sendMessage: jest.fn(),
    })

    renderWithTheme(<SpotifyDisplay />)
    
    expect(screen.getByText('Test Song')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
  })

  test('shows play/pause controls', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      spotifyData: {
        isPlaying: false,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        deviceId: 'device123',
        volume: 50,
      },
      sendMessage: jest.fn(),
    })

    renderWithTheme(<SpotifyDisplay />)
    
    // Should show play button when not playing
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument()
  })

  test('handles play/pause button clicks', async () => {
    const mockSendMessage = jest.fn()
    
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      spotifyData: {
        isPlaying: false,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        deviceId: 'device123',
        volume: 50,
      },
      sendMessage: mockSendMessage,
    })

    renderWithTheme(<SpotifyDisplay />)
    
    const playButton = screen.getByLabelText(/play/i)
    await userEvent.click(playButton)
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY'
      })
    )
  })

  test('displays volume control', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      spotifyData: {
        isPlaying: true,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        deviceId: 'device123',
        volume: 75,
      },
      sendMessage: jest.fn(),
    })

    renderWithTheme(<SpotifyDisplay />)
    
    // Volume control should be present
    const volumeSlider = screen.getByRole('slider')
    expect(volumeSlider).toBeInTheDocument()
  })

  test('handles volume changes', async () => {
    const mockSendMessage = jest.fn()
    
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      spotifyData: {
        isPlaying: true,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        deviceId: 'device123',
        volume: 50,
      },
      sendMessage: mockSendMessage,
    })

    renderWithTheme(<SpotifyDisplay />)
    
    const volumeSlider = screen.getByRole('slider')
    await userEvent.click(volumeSlider)
    
    // Volume change should trigger a message
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND'
      })
    )
  })

  test('shows skip controls when track is available', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      spotifyData: {
        isPlaying: true,
        trackName: 'Test Song',
        artistName: 'Test Artist',
        deviceId: 'device123',
        volume: 50,
      },
      sendMessage: jest.fn(),
    })

    renderWithTheme(<SpotifyDisplay />)
    
    expect(screen.getByLabelText(/next/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/previous/i)).toBeInTheDocument()
  })
})
