/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import RefreshIconButton from '../../../components/RefreshIconButton'

describe('RefreshIconButton', () => {
  it('renders correctly', () => {
    render(<RefreshIconButton onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<RefreshIconButton onClick={handleClick} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('passes other props to IconButton', () => {
    render(<RefreshIconButton onClick={() => {}} aria-label="custom label" />)
    const button = screen.getByRole('button', { name: 'custom label' })
    expect(button).toBeInTheDocument()
  })

  it('renders the refresh icon', () => {
    render(<RefreshIconButton onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')).toBeInTheDocument()
  })
})
