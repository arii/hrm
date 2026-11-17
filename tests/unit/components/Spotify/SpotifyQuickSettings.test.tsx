/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SpotifyQuickSettings from '@/components/Spotify/SpotifyQuickSettings'
import { setOptimisticPlaying } from '@/lib/spotify/optimisticPlayback'
import { useSpotifyData } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'

jest.mock('@/context/WebSocketContext', () => ({
  useSpotifyData: jest.fn(),
  useWebSocketConnection: () => ({ connectionStatus: 'Connected' }),
}))
jest.mock('@/hooks/useSpotifyCommand', () => ({ useSpotifyCommand: jest.fn() }))
jest.mock('@/hooks/useSpotifyVolumeSync', () => ({
  useSpotifyVolumeSync: () => ({
    displayVolume: 40,
    isMuted: false,
    handleVolumeChange: jest.fn(),
    handleVolumeChangeCommitted: jest.fn(),
    handleToggleMute: jest.fn(),
  }),
}))

const execute = jest.fn()
const setup = (isPlaying: boolean, activeDevice: unknown) => {
  ;(useSpotifyData as jest.Mock).mockReturnValue({
    devices: [],
    playback: { is_playing: isPlaying, volume_percent: 40, isMuted: false },
  })
  ;(useSpotifyCommand as jest.Mock).mockReturnValue({ execute, activeDevice })
  render(<SpotifyQuickSettings />)
}

describe('SpotifyQuickSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setOptimisticPlaying(null)
  })

  it('pauses in one tap and shows Play right away', () => {
    setup(true, { id: 'dev-1', is_active: true })
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(execute).toHaveBeenCalledWith('PAUSE')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('skips tracks without opening any menu', () => {
    setup(true, { id: 'dev-1', is_active: true })
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }))
    expect(execute).toHaveBeenCalledWith('NEXT')
    expect(execute).toHaveBeenCalledWith('PREVIOUS')
  })

  it('explains the disabled volume when no device is active', () => {
    setup(false, null)
    expect(screen.getByLabelText('Volume control')).toBeDisabled()
    expect(
      screen.getByText(
        'No active Spotify device yet. Tap a playlist to start one.'
      )
    ).toBeInTheDocument()
  })
})
