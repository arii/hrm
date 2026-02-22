/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import RefreshIconButton from '../../../components/RefreshIconButton'

describe('RefreshIconButton', () => {
<<<<<<< HEAD
  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<RefreshIconButton onClick={onClick} aria-label="refresh" />)

    const button = screen.getByRole('button', { name: /refresh/i })
=======
  it('renders correctly', () => {
    render(<RefreshIconButton onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<RefreshIconButton onClick={handleClick} />)
    const button = screen.getByRole('button')
>>>>>>> origin/leader
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

<<<<<<< HEAD
  it('renders with the correct aria-label', () => {
    render(<RefreshIconButton onClick={() => {}} aria-label="custom refresh" />)
    expect(screen.getByLabelText('custom refresh')).toBeInTheDocument()
=======
  it('passes other props to IconButton', () => {
    render(<RefreshIconButton onClick={() => {}} aria-label="custom label" />)
    const button = screen.getByRole('button', { name: 'custom label' })
    expect(button).toBeInTheDocument()
  })

  it('renders the refresh icon', () => {
    render(<RefreshIconButton onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')).toBeInTheDocument()
>>>>>>> origin/leader
  })
})
