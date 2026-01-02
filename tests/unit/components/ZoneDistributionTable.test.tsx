import { render, screen } from '@testing-library/react'
import ZoneDistributionTable from '@/app/client/connect/components/ZoneDistributionTable'

describe('ZoneDistributionTable', () => {
  it('should render the table with the correct title', () => {
    render(<ZoneDistributionTable zoneDistribution={[]} />)
    expect(screen.getByText('Zone Distribution')).toBeInTheDocument()
  })

  it('should render the table with data', () => {
    const data = [
      {
        zone: 'WarmUp',
        range: '95 - 114',
        duration: 60,
        percentage: 20,
      },
      {
        zone: 'FatBurn',
        range: '114 - 133',
        duration: 120,
        percentage: 40,
      },
    ]
    render(<ZoneDistributionTable zoneDistribution={data} />)
    expect(screen.getByText('WarmUp')).toBeInTheDocument()
    expect(screen.getByText('95 - 114')).toBeInTheDocument()
    expect(screen.getByText('01:00')).toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
    expect(screen.getByText('FatBurn')).toBeInTheDocument()
    expect(screen.getByText('114 - 133')).toBeInTheDocument()
    expect(screen.getByText('02:00')).toBeInTheDocument()
    expect(screen.getByText('40.0%')).toBeInTheDocument()
  })
})
