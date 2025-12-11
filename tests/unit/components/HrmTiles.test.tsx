import { render, screen } from '@testing-library/react'
import React from 'react'

import HrmTiles from '@/components/HrmTiles'
import { useWebSocket } from '@/context/WebSocketContext'

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

describe('HrmTiles', () => {
  it('renders "Waiting for HR data..." when no data is available', () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({ hrmData: [] })
    render(<HrmTiles />)
    expect(screen.getByText('Waiting for HR data...')).toBeInTheDocument()
  })

  it('renders a tile for each user with HR data', () => {
    const mockHrmData = [
      { name: 'Alice', value: 120, maxHr: 180 },
      { name: 'Bob', value: 130, maxHr: 190 },
    ]
    ;(useWebSocket as jest.Mock).mockReturnValue({ hrmData: mockHrmData })
    render(<HrmTiles />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('130')).toBeInTheDocument()
  })
})
