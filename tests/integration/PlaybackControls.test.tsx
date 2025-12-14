import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackControls } from '@/components/Spotify'
import { WebSocketContext } from '@/context/WebSocketContext'
import { mockSpotifyData, mockWebSocketContext } from '../unit/mocks/context'

describe('PlaybackControls Integration', () => {
  it('renders all child components and displays track information', () => {
    render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <PlaybackControls />
      </WebSocketContext.Provider>
    )

    expect(
      screen.getByText(mockSpotifyData.trackName)
    ).toBeInTheDocument()
    expect(screen.getByText(mockSpotifyData.artist)).toBeInTheDocument()
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument()
    expect(screen.getByLabelText('Play')).toBeInTheDocument()
    expect(screen.getByLabelText('Next track')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('sends a "PLAY" command when the play button is clicked', () => {
    render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <PlaybackControls />
      </WebSocketContext.Provider>
    )

    fireEvent.click(screen.getByLabelText('Play'))
    expect(mockWebSocketContext.sendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
    })
  })

  it('sends a "PAUSE" command when the pause button is clicked', () => {
    const customMockContext = {
      ...mockWebSocketContext,
      spotifyData: {
        ...mockSpotifyData,
        isPlaying: true,
      },
    }

    render(
      <WebSocketContext.Provider value={customMockContext}>
        <PlaybackControls />
      </WebSocketContext.Provider>
    )

    fireEvent.click(screen.getByLabelText('Pause'))
    expect(customMockContext.sendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PAUSE',
    })
  })
})