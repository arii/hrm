/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import DeviceRecommendation from '@/components/Spotify/DeviceRecommendation'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

jest.mock('@/hooks/useSpotifyCommand')

const mockedUseSpotifyCommand = useSpotifyCommand as jest.MockedFunction<
  typeof useSpotifyCommand
>

describe('DeviceRecommendation', () => {
  const executeMock = jest.fn()

  const mockHookValue = {
    activeDevice: null,
    hrmPlayer: {
      id: 'hrm-1',
      name: 'HRM Web Player',
      is_active: false,
      is_private_session: false,
      is_restricted: false,
      type: 'Computer',
      volume_percent: 50,
    },
    execute: executeMock,
    playback: {
      track: {
        id: null,
        name: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      volume_percent: 0,
      isMuted: false,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSpotifyCommand.mockReturnValue(mockHookValue)
  })

  it('renders recommendation when no active device and HRM player exists', () => {
    render(<DeviceRecommendation />)
    expect(screen.getByText(/Connect to HRM Web Player/i)).toBeInTheDocument()
  })

  it('calls execute on click', () => {
    render(<DeviceRecommendation />)
    fireEvent.click(screen.getByText(/Connect to HRM Web Player/i))
    expect(executeMock).toHaveBeenCalledWith('TRANSFER_PLAYBACK', {
      deviceId: 'hrm-1',
    })
  })

  it('renders nothing when active device exists', () => {
    mockedUseSpotifyCommand.mockReturnValue({
      ...mockHookValue,
      activeDevice: {
        id: 'd1',
        name: 'Other Device',
        is_active: true,
        is_private_session: false,
        is_restricted: false,
        type: 'Speaker',
        volume_percent: 50,
      },
    })

    const { container } = render(<DeviceRecommendation />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when HRM player does not exist', () => {
    mockedUseSpotifyCommand.mockReturnValue({
      ...mockHookValue,
      hrmPlayer: null,
    })

    const { container } = render(<DeviceRecommendation />)
    expect(container.firstChild).toBeNull()
  })
})
