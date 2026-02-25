/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import SpotifyDeviceSelector from '@/app/client/control/components/spotify/SpotifyDeviceSelector'
import { createMockSpotifyDevice } from '@/tests/test-utils'
import '@testing-library/jest-dom'

describe('components/spotify/SpotifyDeviceSelector', () => {
  const mockOnDeviceChange = jest.fn()
  const mockOnDeviceSync = jest.fn()
  const devices = [
    createMockSpotifyDevice({ id: '1', name: 'Device 1', is_active: false }),
    createMockSpotifyDevice({ id: '2', name: 'Device 2', is_active: true }),
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders available devices when opened', async () => {
    render(
      <SpotifyDeviceSelector
        devices={devices}
        selectedDeviceId="2"
        onDeviceChange={mockOnDeviceChange}
        onDeviceSync={mockOnDeviceSync}
      />
    )

    // The selected device should be visible in the closed select
    expect(screen.getByText(/Device 2 \(Active\)/)).toBeInTheDocument()

    // Open the select to see other devices
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    // MUI renders the listbox in a portal, so we search globally
    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByText(/Device 1/)).toBeInTheDocument()
    expect(within(listbox).getByText(/Device 2 \(Active\)/)).toBeInTheDocument()
  })

  it('calls onDeviceSync when active device changes', () => {
    const { rerender } = render(
      <SpotifyDeviceSelector
        devices={devices}
        selectedDeviceId="2"
        onDeviceChange={mockOnDeviceChange}
        onDeviceSync={mockOnDeviceSync}
      />
    )

    const newDevices = [
      createMockSpotifyDevice({ id: '1', name: 'Device 1', is_active: true }),
      createMockSpotifyDevice({ id: '2', name: 'Device 2', is_active: false }),
    ]

    rerender(
      <SpotifyDeviceSelector
        devices={newDevices}
        selectedDeviceId="2"
        onDeviceChange={mockOnDeviceChange}
        onDeviceSync={mockOnDeviceSync}
      />
    )

    expect(mockOnDeviceSync).toHaveBeenCalledWith('1')
  })

  it('auto-selects HRM Web Player when no device is active', () => {
    const hrmDevice = createMockSpotifyDevice({
      id: 'hrm',
      name: 'HRM Web Player',
    })
    const inactiveDevices = [
      createMockSpotifyDevice({ id: '1', name: 'Device 1', is_active: false }),
    ]

    render(
      <SpotifyDeviceSelector
        devices={[...inactiveDevices, hrmDevice]}
        selectedDeviceId=""
        onDeviceChange={mockOnDeviceChange}
        onDeviceSync={mockOnDeviceSync}
        hrmDevice={hrmDevice}
      />
    )

    expect(mockOnDeviceSync).toHaveBeenCalledWith('hrm')
  })
})
