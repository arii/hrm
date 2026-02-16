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

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSpotifyCommand.mockReturnValue({
      activeDevice: null,
      hrmPlayer: { id: 'hrm-1', name: 'HRM Web Player' },
      execute: executeMock,
      playback: {},
      isHrmPlayerActive: false,
    } as unknown as ReturnType<typeof useSpotifyCommand>)
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
      activeDevice: { id: 'd1', name: 'Other Device' },
      hrmPlayer: { id: 'hrm-1', name: 'HRM Web Player' },
      execute: executeMock,
      playback: {},
      isHrmPlayerActive: false,
    } as unknown as ReturnType<typeof useSpotifyCommand>)

    const { container } = render(<DeviceRecommendation />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when HRM player does not exist', () => {
    mockedUseSpotifyCommand.mockReturnValue({
      activeDevice: null,
      hrmPlayer: null,
      execute: executeMock,
      playback: {},
      isHrmPlayerActive: false,
    } as unknown as ReturnType<typeof useSpotifyCommand>)

    const { container } = render(<DeviceRecommendation />)
    expect(container.firstChild).toBeNull()
  })
})
