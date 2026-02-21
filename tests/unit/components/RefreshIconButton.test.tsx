/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import RefreshIconButton from '../../../components/RefreshIconButton'

describe('RefreshIconButton', () => {
  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<RefreshIconButton onClick={onClick} aria-label="refresh" />)

    const button = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders with the correct aria-label', () => {
    render(<RefreshIconButton onClick={() => {}} aria-label="custom refresh" />)
    expect(screen.getByLabelText('custom refresh')).toBeInTheDocument()
  })
})
