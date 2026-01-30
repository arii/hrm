/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import ControlCard from '@/components/shared/ControlCard'
import '@testing-library/jest-dom'

describe('components/shared/ControlCard', () => {
  it('renders children correctly', () => {
    render(
      <ControlCard data-testid="control-card">
        <div>Test Content</div>
      </ControlCard>
    )

    expect(screen.getByTestId('control-card')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies custom styles', () => {
    render(<ControlCard data-testid="control-card" />)

    // We can check if the element has the class that MUI generates
    const card = screen.getByTestId('control-card')
    expect(card).toHaveClass('MuiCard-root')
  })
})
