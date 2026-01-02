/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import ZoneDistributionTable from '../../../app/client/connect/components/ZoneDistributionTable'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../lib/theme'
import { HrZoneName } from '../../../lib/shared/hr-zones'

const mockData = [
  {
    zone: HrZoneName.WarmUp,
    duration: 1,
    percentage: 20,
    color: '#2196F3',
    bpmRange: '95-114',
  },
  {
    zone: HrZoneName.FatBurn,
    duration: 2,
    percentage: 40,
    color: '#4CAF50',
    bpmRange: '114-133',
  },
  {
    zone: HrZoneName.Cardio,
    duration: 1,
    percentage: 20,
    color: '#FFEB3B',
    bpmRange: '133-152',
  },
  {
    zone: HrZoneName.Peak,
    duration: 1,
    percentage: 20,
    color: '#F44336',
    bpmRange: '152-180',
  },
]

describe('ZoneDistributionTable', () => {
  it('should render the table with the correct data', () => {
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistributionTable data={mockData} />
      </ThemeProvider>
    )

    // Check that the table is rendered
    expect(screen.getByRole('table')).toBeInTheDocument()

    // Check that the table has the correct number of rows
    expect(screen.getAllByRole('row')).toHaveLength(mockData.length + 1) // +1 for the header

    // Check that the table has the correct data
    expect(screen.getByText('Warm-up')).toBeInTheDocument()
    expect(screen.getByText('Fat Burn')).toBeInTheDocument()
    expect(screen.getByText('Cardio')).toBeInTheDocument()
    expect(screen.getByText('Peak')).toBeInTheDocument()
  })
})
