/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import SpotifyDeviceDropdown from '@/app/client/control/components/SpotifyDeviceDropdown'
import type { SpotifyDevice } from '@/types/core'

const device = (id: string, name: string) =>
  ({ id, name, is_active: false }) as SpotifyDevice

describe('SpotifyDeviceDropdown', () => {
  it('lists one player per name and shows the newest when selected', () => {
    render(
      <SpotifyDeviceDropdown
        devices={[
          device('first', 'HRM Web Player'),
          device('last', 'HRM Web Player'),
        ]}
        selectedDeviceId="last"
        disabled={false}
        onSelect={jest.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('HRM Web Player')
  })

  it('keeps unnamed devices as separate options', () => {
    render(
      <SpotifyDeviceDropdown
        devices={[
          { ...device('a', ''), name: null },
          { ...device('b', ''), name: null },
        ]}
        selectedDeviceId="a"
        disabled={false}
        onSelect={jest.fn()}
      />
    )
    fireEvent.mouseDown(screen.getByRole('combobox'))
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })
})
