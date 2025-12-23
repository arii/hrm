/** @jest-environment jsdom */
import { render, fireEvent, screen } from '@testing-library/react'
import SpotifyConnectDevicePicker from '@/components/Spotify/SpotifyConnectDevicePicker'
import { SpotifyDevice } from '@/types/core'
import '@testing-library/jest-dom'

const mockDevices: SpotifyDevice[] = [
  {
    id: '1',
    is_active: true,
    is_private_session: false,
    is_restricted: false,
    name: 'Device 1',
    type: 'computer',
    volume_percent: 50,
  },
]

describe('SpotifyConnectDevicePicker', () => {
  it('should render the button and open the menu', () => {
    render(
      <SpotifyConnectDevicePicker
        devices={[]}
        loading={false}
        error={null}
        refreshDevices={jest.fn()}
        onDeviceSelect={jest.fn()}
      />
    )
    const button = screen.getByRole('button', { name: /select playback device/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(
      <SpotifyConnectDevicePicker
        devices={[]}
        loading={true}
        error={null}
        refreshDevices={jest.fn()}
        onDeviceSelect={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should display error state', () => {
    render(
      <SpotifyConnectDevicePicker
        devices={[]}
        loading={false}
        error="Error loading devices"
        refreshDevices={jest.fn()}
        onDeviceSelect={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Error loading devices')).toBeInTheDocument()
  })

  it('should display devices and handle selection', () => {
    const onDeviceSelect = jest.fn()
    render(
      <SpotifyConnectDevicePicker
        devices={mockDevices}
        loading={false}
        error={null}
        refreshDevices={jest.fn()}
        onDeviceSelect={onDeviceSelect}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    const deviceMenuItem = screen.getByText('Device 1')
    fireEvent.click(deviceMenuItem)
    expect(onDeviceSelect).toHaveBeenCalledWith('1')
  })
})
