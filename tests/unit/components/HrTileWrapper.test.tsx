/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import HrTileWrapper from '@/components/HrTileWrapper'
import { ClientHrmData } from '@/context/webSocketReducer'
import { useHrZone } from '@/hooks/useHrZone'

jest.mock('@/hooks/useHrZone')
const mockUseHrZone = useHrZone as jest.Mock

jest.mock('@/components/HrTile', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jest.fn((props: any) => (
    <div data-testid="mock-hr-tile">
      <span data-testid="tile-name">{props.name}</span>
      <span data-testid="tile-bpm">{props.bpm}</span>
      <span data-testid="tile-stale">{String(props.isDataStale)}</span>
    </div>
  ))
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
  }

  beforeEach(() => {
    mockUseHrZone.mockReturnValue({
      percentage: 63,
      zone: 2,
      color: '#blue',
    })
  })

  it('passes isDataStale=true to HrTile', () => {
    render(<HrTileWrapper user={mockUser} isDataStale={true} />)

    expect(screen.getByTestId('mock-hr-tile')).toBeInTheDocument()
    expect(screen.getByTestId('tile-stale')).toHaveTextContent('true')
  })

  it('passes isDataStale=false to HrTile', () => {
    render(<HrTileWrapper user={mockUser} isDataStale={false} />)

    expect(screen.getByTestId('mock-hr-tile')).toBeInTheDocument()
    expect(screen.getByTestId('tile-stale')).toHaveTextContent('false')
  })

  it('passes user data to HrTile', () => {
    render(<HrTileWrapper user={mockUser} isDataStale={false} />)

    expect(screen.getByTestId('tile-name')).toHaveTextContent('Test User')
    expect(screen.getByTestId('tile-bpm')).toHaveTextContent('120')
  })
})
