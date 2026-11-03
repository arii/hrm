/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
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

  it('shows pending state and disables while transferring', () => {
    render(<DeviceRecommendation />)
    fireEvent.click(screen.getByText(/Connect to HRM Web Player/i))
    expect(executeMock).toHaveBeenCalledWith('TRANSFER_PLAYBACK', {
      deviceId: 'hrm-1',
    })
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
  })

  it('re-enables after the safety timeout when the server never confirms', () => {
    jest.useFakeTimers()
    try {
      render(<DeviceRecommendation />)
      fireEvent.click(screen.getByText(/Connect to HRM Web Player/i))
      expect(screen.getByRole('button')).toBeDisabled()
      act(() => {
        jest.advanceTimersByTime(10000)
      })
      const button = screen.getByRole('button')
      expect(button).toBeEnabled()
      expect(screen.getByText(/Connect to HRM Web Player/i)).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('clears pending state when the transfer lands', () => {
    const { container, rerender } = render(<DeviceRecommendation />)
    fireEvent.click(screen.getByText(/Connect to HRM Web Player/i))
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
    mockedUseSpotifyCommand.mockReturnValue({
      ...mockHookValue,
      activeDevice: {
        id: 'hrm-1',
        name: 'HRM Web Player',
        is_active: true,
        is_private_session: false,
        is_restricted: false,
        type: 'Computer',
        volume_percent: 50,
      },
    })
    rerender(<DeviceRecommendation />)
    expect(container.firstChild).toBeNull()
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

  it('renders nothing while anything is playing', () => {
    mockedUseSpotifyCommand.mockReturnValue({
      ...mockHookValue,
      playback: { ...mockHookValue.playback, is_playing: true },
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

  it('shows a pending state after click until a device activates', () => {
    jest.useFakeTimers()
    try {
      const { rerender } = render(<DeviceRecommendation />)
      fireEvent.click(screen.getByText(/Connect to HRM Web Player/i))

      const pending = screen.getByText(/Connecting…/i)
      expect(pending).toBeInTheDocument()
      expect(pending.closest('button')).toBeDisabled()

      // Transfer landing hides the button entirely.
      mockedUseSpotifyCommand.mockReturnValue({
        ...mockHookValue,
        activeDevice: { ...mockHookValue.hrmPlayer, is_active: true },
      })
      rerender(<DeviceRecommendation />)
      expect(screen.queryByText(/Connecting…/i)).not.toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('re-enables after a timeout when the server never confirms', () => {
    jest.useFakeTimers()
    try {
      render(<DeviceRecommendation />)
      fireEvent.click(screen.getByText(/Connect to HRM Web Player/i))
      expect(screen.getByText(/Connecting…/i)).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(10000)
      })
      expect(screen.getByText(/Connect to HRM Web Player/i)).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })
})
