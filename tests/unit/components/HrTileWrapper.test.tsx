/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import HrTileWrapper from '@/components/HrTileWrapper'
import { ClientHrmData } from '@/types/websocket'

jest.mock('@/components/HrTile', () => {
  // eslint-disable-next-line react/display-name
  return (props: { name: string; bpm: number; isDataStale: boolean }) => (
    <div data-testid="mock-hr-tile">
      <span data-testid="tile-name">{props.name}</span>
      <span data-testid="tile-bpm">{props.bpm}</span>
      <span data-testid="tile-stale">{String(props.isDataStale)}</span>
    </div>
  )
})

describe('HrTileWrapper', () => {
  const mockUser: ClientHrmData = {
    clientId: '123',
    name: 'Test User',
    value: 120,
    maxHr: 190,
    calories: 50,
    isConnected: true,
    isAlerting: false,
    updatedAt: Date.now(),
    isDataStale: false, // Default
    age: 30, // Required for calculation
  }

  it('passes isDataStale=true to HrTile', () => {
    render(<HrTileWrapper {...mockUser} isDataStale={true} />)

    expect(screen.getByTestId('mock-hr-tile')).toBeInTheDocument()
    expect(screen.getByTestId('tile-stale')).toHaveTextContent('true')
  })

  it('passes isDataStale=false to HrTile', () => {
    render(<HrTileWrapper {...mockUser} isDataStale={false} />)

    expect(screen.getByTestId('mock-hr-tile')).toBeInTheDocument()
    expect(screen.getByTestId('tile-stale')).toHaveTextContent('false')
  })

  it('passes user data to HrTile', () => {
    render(<HrTileWrapper {...mockUser} />)

    expect(screen.getByTestId('tile-name')).toHaveTextContent('Test User')
    expect(screen.getByTestId('tile-bpm')).toHaveTextContent('120')
  })
})
