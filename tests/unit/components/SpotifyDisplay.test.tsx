/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import SpotifyDisplay from '@/components/SpotifyDisplay'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { useWebSocket } from '@/context/WebSocketContext'

// Mock dependencies
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyAuth')
jest.mock('@/hooks/useSpotifyCommand')
jest.mock('@/hooks/useSpotifyWebPlayback')
jest.mock('next-auth/react')
jest.mock('@/components/Spotify/DeviceRecommendation', () => ({
  DeviceRecommendation: () => <div data-testid="device-recommendation" />,
}))
jest.mock('@/components/AuthButton', () => ({
  __esModule: true,
  default: ({ providerName }: { providerName: string }) => (
    <button>Login with {providerName}</button>
  ),
}))
jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: ({
    volume,
    onVolumeChange,
    onVolumeChangeCommitted,
  }: {
    volume: number
    onVolumeChange: (v: number) => void
    onVolumeChangeCommitted: (v: number) => void
  }) => (
    <input
      type="range"
      aria-label="Volume"
      value={volume}
      onChange={(e) => onVolumeChange(Number(e.target.value))}
      onMouseUp={(e) =>
        onVolumeChangeCommitted &&
        onVolumeChangeCommitted(Number((e.target as HTMLInputElement).value))
      }
    />
  ),
}))
jest.mock('@/components/SpotifyDeviceSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="device-selector" />,
}))

const mockedUseSpotifyAuth = useSpotifyAuth as jest.Mock
const mockedUseSpotifyCommand = useSpotifyCommand as jest.Mock
const mockedUseSpotifyWebPlayback = useSpotifyWebPlayback as jest.Mock
const mockedSignOut = signOut as jest.Mock
const mockedUseWebSocket = useWebSocket as jest.Mock

const renderComponent = () => render(<SpotifyDisplay />)

describe('SpotifyDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockedUseWebSocket.mockReturnValue({
      sendData: jest.fn(),
    })

    // Default mocks for authenticated state
    mockedUseSpotifyAuth.mockReturnValue({ isLoggedIn: true })
    mockedUseSpotifyWebPlayback.mockReturnValue({ player: {}, isReady: true })
    mockedUseSpotifyCommand.mockReturnValue({
      execute: jest.fn(),
      playback: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        isPlaying: true,
        volumePercent: 50,
        isMuted: false,
        devices: [],
      },
      hrmPlayer: null,
      activeDevice: { id: '1', name: 'Test Device', is_active: true },
    })
  })

  it('renders AuthButton when not logged in', () => {
    mockedUseSpotifyAuth.mockReturnValue({ isLoggedIn: false })
    renderComponent()
    expect(screen.getByText('Login with Spotify')).toBeInTheDocument()
  })

  it('renders playback controls when logged in', () => {
    renderComponent()
    expect(screen.getByText(/Test Track/)).toBeInTheDocument()
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('calls execute with PAUSE when pause button is clicked', () => {
    const execute = jest.fn()
    mockedUseSpotifyCommand.mockReturnValueOnce({
      ...mockedUseSpotifyCommand(),
      execute,
      playback: { ...mockedUseSpotifyCommand().playback, isPlaying: true },
    })
    renderComponent()

    fireEvent.click(screen.getByLabelText('Pause'))
    expect(execute).toHaveBeenCalledWith('PAUSE')
  })

  it('calls execute with PLAY when play button is clicked', () => {
    const execute = jest.fn()
    mockedUseSpotifyCommand.mockReturnValueOnce({
      ...mockedUseSpotifyCommand(),
      execute,
      playback: { ...mockedUseSpotifyCommand().playback, isPlaying: false },
    })
    renderComponent()

    fireEvent.click(screen.getByLabelText('Play'))
    expect(execute).toHaveBeenCalledWith('PLAY')
  })

  it('calls execute with NEXT when next button is clicked', () => {
    const { execute } = mockedUseSpotifyCommand()
    renderComponent()
    fireEvent.click(screen.getByLabelText('Next track'))
    expect(execute).toHaveBeenCalledWith('NEXT')
  })

  it('calls execute with PREVIOUS when previous button is clicked', () => {
    const { execute } = mockedUseSpotifyCommand()
    renderComponent()
    fireEvent.click(screen.getByLabelText('Previous track'))
    expect(execute).toHaveBeenCalledWith('PREVIOUS')
  })

  it('calls execute with SET_VOLUME when volume slider is changed', () => {
    const { execute } = mockedUseSpotifyCommand()
    renderComponent()
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    expect(execute).not.toHaveBeenCalled()
    fireEvent.mouseUp(slider, { target: { value: '75' } })
    expect(execute).toHaveBeenCalledWith('SET_VOLUME', { volume: 75 })
  })

  it('renders DeviceRecommendation when no device is active but HRM player exists', () => {
    mockedUseSpotifyCommand.mockReturnValueOnce({
      ...mockedUseSpotifyCommand(),
      activeDevice: null,
      hrmPlayer: { id: 'hrm-player', name: 'HRM Web Player' },
    })
    renderComponent()
    expect(screen.getByTestId('device-recommendation')).toBeInTheDocument()
  })

  it('calls signOut when logout button is clicked', () => {
    renderComponent()
    fireEvent.click(screen.getByText('Logout'))
    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false })
  })
})
