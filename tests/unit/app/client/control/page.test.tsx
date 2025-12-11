import { render, screen } from '@testing-library/react'
import React from 'react'

import ControlPanel from '@/app/client/control/ControlPanel'

jest.mock('@/app/client/control/components/SpotifyControls', () => () => (
  <div>SpotifyControls</div>
))
jest.mock('@/app/client/control/components/TimerControls', () => () => (
  <div>TimerControls</div>
))
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    connectionStatus: 'Connected',
    connect: jest.fn(),
    sendData: jest.fn(),
  }),
}))

describe('ControlPanel', () => {
  it('renders without crashing', () => {
    render(<ControlPanel />)
    expect(screen.getByText('Server: Connected')).toBeInTheDocument()
    expect(screen.getByText('TimerControls')).toBeInTheDocument()
    expect(screen.getByText('SpotifyControls')).toBeInTheDocument()
  })
})
