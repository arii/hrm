import { render, screen } from '@testing-library/react'
import ZoneDistributionTable from '@/app/client/connect/components/ZoneDistributionTable'

describe('ZoneDistributionTable', () => {
  it('should render the table with the correct title', () => {
    render(<ZoneDistributionTable zoneDistribution={[]} />)
    expect(screen.getByText('Zone Distribution')).toBeInTheDocument()
  })
})
