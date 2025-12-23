/** @jest-environment jsdom */
// File: tests/unit/components/HrmDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import HrmDashboard from '../../../components/HrmDashboard'
import { WebSocketProvider } from '../../../context/WebSocketContext'
import '@testing-library/jest-dom'

const MockHrmHistoryChart = () => <div data-testid="hrm-history-chart" />
MockHrmHistoryChart.displayName = 'MockHrmHistoryChart'
jest.mock('../../../components/HrmHistoryChart', () => MockHrmHistoryChart)

const MockHrmSummary = () => <div data-testid="hrm-summary" />
MockHrmSummary.displayName = 'MockHrmSummary'
jest.mock('../../../components/HrmSummary', () => MockHrmSummary)

const MockHrmZones = () => <div data-testid="hrm-zones" />
MockHrmZones.displayName = 'MockHrmZones'
jest.mock('../../../components/HrmZones', () => MockHrmZones)

describe('HrmDashboard', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock
  })

  it('should render the dashboard with all child components', async () => {
    render(
      <WebSocketProvider>
        <HrmDashboard />
      </WebSocketProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Heart Rate Analytics')).toBeInTheDocument()
    })

    expect(screen.getByTestId('hrm-history-chart')).toBeInTheDocument()
    expect(screen.getByTestId('hrm-summary')).toBeInTheDocument()
    expect(screen.getByTestId('hrm-zones')).toBeInTheDocument()
  })
})
