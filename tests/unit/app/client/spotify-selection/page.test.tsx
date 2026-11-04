/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import SpotifySelectionPage from '@/app/client/spotify-selection/page'
import { useSpotifyData } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock the dependencies
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyCommand')
jest.mock('@/hooks/useAppSnackbar', () => ({
  useAppSnackbar: jest.fn(() => ({
    showWarning: jest.fn(),
  })),
}))
jest.mock('next/dynamic', () => () => {
  const MockComponent = ({
    onPlaylistSelected,
    onPlaylistPlay,
  }: {
    onPlaylistSelected: (uri: string) => void
    onPlaylistPlay: (uri: string) => void
  }) => (
    <div data-testid="mock-playlist-selector">
      <button onClick={() => onPlaylistSelected('spotify:playlist:mock1')}>
        Select
      </button>
      <button onClick={() => onPlaylistPlay('spotify:playlist:mock1')}>
        Play
      </button>
    </div>
  )
  MockComponent.displayName = 'MockPlaylistSelector'
  return MockComponent
})

const mockedUseSpotifyData = useSpotifyData as jest.Mock
const mockedUseSpotifyCommand = useSpotifyCommand as jest.MockedFunction<
  typeof useSpotifyCommand
>

describe('SpotifySelectionPage', () => {
  const executeMock = jest.fn()

  const mockHookValue = {
    execute: executeMock,
    activeDevice: null,
    hrmPlayer: null,
    playback: {
      track: { id: null, name: '', artist: '', albumName: '', albumArtUrl: '' },
      is_playing: false,
      volume_percent: 0,
      isMuted: false,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  }

  const mockSpotifyDataValue = {
    devices: [],
    playback: {
      track: {
        id: null,
        name: 'Awaiting Login...',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      volume_percent: 70,
      progress_ms: 0,
      isMuted: false,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSpotifyData.mockReturnValue(mockSpotifyDataValue)
    mockedUseSpotifyCommand.mockReturnValue(mockHookValue)
  })

  it('renders login prompt when not logged in', () => {
    render(<SpotifySelectionPage />)
    expect(
      screen.getByText(/Login to Spotify on the main dashboard/i)
    ).toBeInTheDocument()
  })

  it('renders now playing when logged in', () => {
    mockedUseSpotifyData.mockReturnValue({
      ...mockSpotifyDataValue,
      playback: {
        ...mockSpotifyDataValue.playback,
        track: {
          id: 't1',
          name: 'Song 1',
          artist: 'Artist 1',
          albumName: '',
          albumArtUrl: '',
        },
      },
    })
    render(<SpotifySelectionPage />)
    expect(screen.getByText('Song 1 - Artist 1')).toBeInTheDocument()
  })

  it('dispatches PLAY command with target device when a playlist is played', async () => {
    mockedUseSpotifyCommand.mockReturnValue({
      ...mockHookValue,
      hrmPlayer: { id: 'hrm-device-1' },
    })
    render(<SpotifySelectionPage />)
    const playButton = screen.getByText('Play')
    fireEvent.click(playButton)

    expect(executeMock).toHaveBeenCalledWith('PLAY', {
      contextUri: 'spotify:playlist:mock1',
      deviceId: 'hrm-device-1',
    })
  })

  it('warns instead of dispatching when no device is available', async () => {
    const { useAppSnackbar } = jest.requireMock('@/hooks/useAppSnackbar') as {
      useAppSnackbar: jest.Mock
    }
    const showWarning = jest.fn()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({ showWarning })
    mockedUseSpotifyCommand.mockReturnValue({
      ...mockHookValue,
      activeDevice: null,
      hrmPlayer: null,
    })
    render(<SpotifySelectionPage />)
    fireEvent.click(screen.getByText('Play'))

    expect(executeMock).not.toHaveBeenCalled()
    expect(showWarning).toHaveBeenCalledWith(
      expect.stringContaining('No Spotify device available')
    )
  })
})
