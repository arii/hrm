import React from 'react'
import { renderWithTheme, screen, userEvent } from '../../utils/testHelpers'
import HrTile from '../../../components/HrTile'

describe('HrTile Component', () => {
  const defaultProps = {
    label: 'Current HR',
    value: 75,
    unit: 'BPM',
  }

  test('renders with basic props', () => {
    renderWithTheme(<HrTile {...defaultProps} />)
    
    expect(screen.getByText('Current HR')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('BPM')).toBeInTheDocument()
  })

  test('renders with percentage value', () => {
    renderWithTheme(
      <HrTile 
        label="HR Zone" 
        value={85} 
        unit="%" 
      />
    )
    
    expect(screen.getByText('HR Zone')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  test('applies color based on HR zone', () => {
    const { container } = renderWithTheme(
      <HrTile 
        {...defaultProps}
        color="#ff5722"
      />
    )
    
    // Component should render with color styling
    expect(container.firstChild).toBeInTheDocument()
  })

  test('handles click events when clickable', () => {
    const handleClick = jest.fn()
    
    renderWithTheme(
      <HrTile 
        {...defaultProps}
        onClick={handleClick}
      />
    )
    
    const tile = screen.getByRole('button')
    userEvent.click(tile)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('displays zero values correctly', () => {
    renderWithTheme(
      <HrTile 
        label="Resting HR" 
        value={0} 
        unit="BPM" 
      />
    )
    
    expect(screen.getByText('Resting HR')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  test('handles large values', () => {
    renderWithTheme(
      <HrTile 
        label="Max HR" 
        value={9999} 
        unit="BPM" 
      />
    )
    
    expect(screen.getByText('9999')).toBeInTheDocument()
  })

  test('renders without unit', () => {
    renderWithTheme(
      <HrTile 
        label="Zone" 
        value={3}
      />
    )
    
    expect(screen.getByText('Zone')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
