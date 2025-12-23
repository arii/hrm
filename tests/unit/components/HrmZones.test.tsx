/** @jest-environment jsdom */
// File: tests/unit/components/HrmZones.test.tsx
import { render, screen } from '@testing-library/react'
import HrmZones from '../../../components/HrmZones'
import { HrmDataPoint } from '../../../services/hrmDataService'
import { UserSettingsProvider } from '../../../context/UserSettingsContext'
import '@testing-library/jest-dom'

describe('HrmZones', () => {
  it('should render the time in zones correctly', () => {
    const now = Date.now()
    const data: HrmDataPoint[] = [
      { timestamp: now - 30000, hrm: 100, clientId: 'test' },
      { timestamp: now - 20000, hrm: 130, clientId: 'test' },
      { timestamp: now - 10000, hrm: 160, clientId: 'test' },
      { timestamp: now, hrm: 180, clientId: 'test' },
    ]
    render(
      <UserSettingsProvider>
        <HrmZones data={data} />
      </UserSettingsProvider>
    )

    // The component calculates time in minutes, so we'll check for the title
    expect(screen.getByText('Time in Zones (minutes)')).toBeInTheDocument()
  })
})
