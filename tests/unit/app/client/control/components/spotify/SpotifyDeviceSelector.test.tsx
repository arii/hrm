/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import SpotifyDeviceSelector from '@/app/client/control/components/spotify/SpotifyDeviceSelector'
import { createMockSpotifyDevice } from '@/tests/test-utils'
import '@testing-library/jest-dom'

describe('components/spotify/SpotifyDeviceSelector', () => {
  const mockOnDeviceChange = jest.fn()
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
      />
    )

    // The selected device should be visible in the closed select
    expect(screen.getByText(/Device 2 \(Active\)/)).toBeInTheDocument()

    // Open the select to see other devices
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByText(/Device 1/)).toBeInTheDocument()
    expect(within(listbox).getByText(/Device 2 \(Active\)/)).toBeInTheDocument()
  })

  it('calls onDeviceChange when a new device is selected', async () => {
    render(
      <SpotifyDeviceSelector
        devices={devices}
        selectedDeviceId="2"
        onDeviceChange={mockOnDeviceChange}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    const listbox = await screen.findByRole('listbox')
    fireEvent.click(within(listbox).getByText(/Device 1/))

    expect(mockOnDeviceChange).toHaveBeenCalledWith('1')
  })
})
