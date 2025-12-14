// @ts-nocheck
import { render, screen } from '@testing-library/react'
import TimerControls from '../../../../components/TimerControls'

describe('TimerControls', () => {
  it('renders without crashing', () => {
    render(<TimerControls />)
    expect(screen.getByRole('button', { name: 'START' })).toBeInTheDocument()
  })
})
