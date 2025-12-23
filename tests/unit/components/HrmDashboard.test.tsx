/** @jest-environment jsdom */
// File: tests/unit/components/HrmDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import HrmDashboard from '../../../components/HrmDashboard'
import { WebSocketProvider } from '../../../context/WebSocketContext'
import '@testing-library/jest-dom'

jest.mock('../../../components/HrmHistoryChart', () => () => (
  <div data-testid="hrm-history-chart" />
))
jest.mock('../../../components/HrmSummary', () => () => (
  <div data-testid="hrm-summary" />
))
jest.mock('../../../components/HrmZones', () => () => (
  <div data-testid="hrm-zones" />
))

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
