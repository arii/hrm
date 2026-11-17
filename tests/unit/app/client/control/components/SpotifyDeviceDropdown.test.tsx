/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import SpotifyDeviceDropdown from '@/app/client/control/components/SpotifyDeviceDropdown'
import type { SpotifyDevice } from '@/types/core'

const device = (id: string, name: string) =>
  ({ id, name, is_active: false }) as SpotifyDevice

describe('SpotifyDeviceDropdown', () => {
  it('shows the selected player when duplicates are collapsed', () => {
    render(
      <SpotifyDeviceDropdown
        devices={[
          device('first', 'HRM Web Player'),
          device('last', 'HRM Web Player'),
        ]}
        selectedDeviceId="first"
        disabled={false}
        onSelect={jest.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('HRM Web Player')
  })
})
